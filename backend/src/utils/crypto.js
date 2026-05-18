const crypto = require('crypto');
const config = require('../config');

const algorithm = 'aes-256-gcm';

const getKey = () => crypto
  .createHash('sha256')
  .update(String(config.security.encryptionKey))
  .digest();

const encryptJson = (payload) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const plaintext = JSON.stringify(payload || {});
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
};

const decryptJson = (encryptedPayload) => {
  if (!encryptedPayload) return {};
  const [ivB64, tagB64, encryptedB64] = encryptedPayload.split('.');
  if (!ivB64 || !tagB64 || !encryptedB64) return {};

  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
};

const maskSecret = (value) => {
  if (!value) return undefined;
  const str = String(value);
  if (str.length <= 4) return '****';
  return `${str.slice(0, 2)}****${str.slice(-2)}`;
};

module.exports = { encryptJson, decryptJson, maskSecret };
