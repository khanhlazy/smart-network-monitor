const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const config = require('../../config');
const User = require('../users/user.model');
const { authenticate } = require('../../middlewares/auth');
const { createAuditLog } = require('../../utils/auditLogger');
const { encryptJson, decryptJson } = require('../../utils/crypto');
const { randomBase32, verifyTotp, buildOtpAuthUrl, buildQrSvgDataUrl } = require('./totp');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  return { accessToken, refreshToken, expiresIn: 900 };
};

router.post('/setup', authenticate, async (req, res) => {
  try {
    const secret = randomBase32();
    const accountName = req.user.email || req.user.username;
    const otpauthUrl = buildOtpAuthUrl({ accountName, secret });
    const setupToken = jwt.sign({ userId: req.user._id, secret, type: 'mfa_setup' }, config.jwt.secret, { expiresIn: '10m' });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'mfa.setup.start',
      resourceType: 'user',
      resourceId: req.user._id.toString(),
      req,
    });

    res.json({
      data: {
        secret,
        otpauthUrl,
        qrCodeDataUrl: buildQrSvgDataUrl(otpauthUrl),
        setupToken,
      },
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi thiết lập MFA.' } });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { code, mfaToken, setupToken } = req.body;

    if (mfaToken) {
      const decoded = jwt.verify(mfaToken, config.jwt.secret);
      if (decoded.type !== 'mfa_pending') throw new Error('Invalid MFA token');

      const user = await User.findById(decoded.userId).populate('roleIds');
      if (!user || !user.mfa?.enabled) {
        return res.status(401).json({ error: { code: 'INVALID_MFA', message: 'MFA không hợp lệ.' } });
      }

      const { secret } = decryptJson(user.mfa.secretEncrypted);
      if (!verifyTotp(secret, code)) {
        await createAuditLog({
          actorUserId: user._id,
          actorName: user.fullName,
          action: 'mfa.verify.failure',
          resourceType: 'auth',
          result: 'failure',
          req,
        });
        return res.status(401).json({ error: { code: 'INVALID_MFA_CODE', message: 'Mã xác thực không hợp lệ.' } });
      }

      user.mfa.lastVerifiedAt = new Date();
      user.lastLoginAt = new Date();
      await user.save();

      const permissions = new Set();
      user.roleIds?.forEach(role => role.permissions?.forEach(permission => permissions.add(permission)));

      await createAuditLog({
        actorUserId: user._id,
        actorName: user.fullName,
        action: 'mfa.verify.success',
        resourceType: 'auth',
        req,
      });

      return res.json({
        data: {
          ...generateTokens(user._id),
          user: {
            id: user._id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            language: user.preferences?.language || 'vi',
            theme: user.preferences?.theme || 'dark',
            permissions: Array.from(permissions),
            roles: user.roleIds.map(r => ({ id: r._id, name: r.name, nameVi: r.nameVi })),
            mfaEnabled: true,
          },
        },
      });
    }

    if (setupToken) {
      const decoded = jwt.verify(setupToken, config.jwt.secret);
      if (decoded.type !== 'mfa_setup') throw new Error('Invalid setup token');
      const user = await User.findById(decoded.userId);
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy người dùng.' } });
      if (!verifyTotp(decoded.secret, code)) {
        return res.status(400).json({ error: { code: 'INVALID_MFA_CODE', message: 'Mã xác thực không hợp lệ.' } });
      }

      user.mfa = {
        enabled: true,
        secretEncrypted: encryptJson({ secret: decoded.secret }),
        enabledAt: new Date(),
        lastVerifiedAt: new Date(),
      };
      await user.save();

      await createAuditLog({
        actorUserId: user._id,
        actorName: user.fullName,
        action: 'mfa.setup.enable',
        resourceType: 'user',
        resourceId: user._id.toString(),
        req,
      });

      return res.json({ data: { enabled: true } });
    }

    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Thiếu thông tin xác thực MFA.' } });
  } catch (error) {
    res.status(401).json({ error: { code: 'INVALID_MFA', message: 'MFA không hợp lệ hoặc đã hết hạn.' } });
  }
});

router.post('/disable', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);
    if (user.mfa?.enabled) {
      const { secret } = decryptJson(user.mfa.secretEncrypted);
      if (!verifyTotp(secret, code)) {
        return res.status(400).json({ error: { code: 'INVALID_MFA_CODE', message: 'Mã xác thực không hợp lệ.' } });
      }
    }

    user.mfa = { enabled: false };
    await user.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'mfa.disable',
      resourceType: 'user',
      resourceId: req.user._id.toString(),
      req,
    });

    res.json({ data: { enabled: false } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi tắt MFA.' } });
  }
});

module.exports = router;
