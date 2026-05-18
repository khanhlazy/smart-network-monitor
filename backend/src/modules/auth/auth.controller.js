const jwt = require('jsonwebtoken');
const config = require('../../config');
const User = require('../users/user.model');
const { createAuditLog } = require('../../utils/auditLogger');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  return { accessToken, refreshToken, expiresIn: 900 };
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập tài khoản và mật khẩu.' }
      });
    }

    const user = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }]
    }).populate('roleIds');

    if (!user) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Tài khoản hoặc mật khẩu không đúng.' }
      });
    }

    if (user.status === 'locked') {
      return res.status(403).json({
        error: { code: 'ACCOUNT_LOCKED', message: 'Tài khoản đã bị khóa.' }
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        error: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa.' }
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.status = 'locked';
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();

      await createAuditLog({
        actorUserId: user._id,
        actorName: user.fullName,
        action: 'auth.login.failure',
        resourceType: 'auth',
        result: 'failure',
        req,
      });

      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Tài khoản hoặc mật khẩu không đúng.' }
      });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save();

    if (user.mfa?.enabled) {
      const mfaToken = jwt.sign({ userId: user._id, type: 'mfa_pending' }, config.jwt.secret, { expiresIn: '5m' });
      await createAuditLog({
        actorUserId: user._id,
        actorName: user.fullName,
        action: 'auth.login.mfa_required',
        resourceType: 'auth',
        result: 'success',
        req,
      });
      return res.json({ data: { mfaRequired: true, mfaToken } });
    }

    const tokens = generateTokens(user._id);

    // Collect permissions
    const permissions = new Set();
    if (user.roleIds) {
      user.roleIds.forEach(role => {
        if (role.permissions) {
          role.permissions.forEach(p => permissions.add(p));
        }
      });
    }

    await createAuditLog({
      actorUserId: user._id,
      actorName: user.fullName,
      action: 'auth.login.success',
      resourceType: 'auth',
      result: 'success',
      req,
    });

    res.json({
      data: {
        ...tokens,
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          language: user.preferences?.language || 'vi',
          theme: user.preferences?.theme || 'dark',
          permissions: Array.from(permissions),
          roles: user.roleIds.map(r => ({ id: r._id, name: r.name, nameVi: r.nameVi })),
          mfaEnabled: !!user.mfa?.enabled,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống. Vui lòng thử lại.' }
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        error: { code: 'MISSING_TOKEN', message: 'Thiếu refresh token.' }
      });
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Token không hợp lệ.' }
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: { code: 'INVALID_USER', message: 'Tài khoản không hợp lệ.' }
      });
    }

    const tokens = generateTokens(user._id);
    res.json({ data: tokens });
  } catch (error) {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Phiên đăng nhập đã hết hạn.' }
    });
  }
};

exports.logout = async (req, res) => {
  await createAuditLog({
    actorUserId: req.user._id,
    actorName: req.user.fullName,
    action: 'auth.logout',
    resourceType: 'auth',
    result: 'success',
    req,
  });

  res.json({ data: { message: 'Đã đăng xuất thành công.' } });
};

exports.getMe = async (req, res) => {
  const user = req.user;
  const permissions = new Set();
  if (user.roleIds) {
    user.roleIds.forEach(role => {
      if (role.permissions) {
        role.permissions.forEach(p => permissions.add(p));
      }
    });
  }

  res.json({
    data: {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      language: user.preferences?.language || 'vi',
      theme: user.preferences?.theme || 'dark',
      permissions: Array.from(permissions),
      roles: user.roleIds.map(r => ({ id: r._id, name: r.name, nameVi: r.nameVi })),
      lastLoginAt: user.lastLoginAt,
      mfaEnabled: !!user.mfa?.enabled,
    },
  });
};

exports.updatePreferences = async (req, res) => {
  try {
    const { language, theme } = req.body;
    const update = {};
    if (language && ['vi', 'en'].includes(language)) {
      update['preferences.language'] = language;
    }
    if (theme && ['dark', 'light', 'system'].includes(theme)) {
      update['preferences.theme'] = theme;
    }

    await User.findByIdAndUpdate(req.user._id, { $set: update });
    res.json({ data: { message: 'Đã lưu thay đổi.' } });
  } catch (error) {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' }
    });
  }
};
