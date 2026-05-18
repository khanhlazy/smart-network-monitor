const crypto = require('crypto');

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const randomBase32 = (length = 32) => {
  const bytes = crypto.randomBytes(length);
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    output += base32Alphabet[bytes[i] % base32Alphabet.length];
  }
  return output;
};

const base32ToBuffer = (base32) => {
  const clean = String(base32).replace(/=+$/g, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of clean) {
    const value = base32Alphabet.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const generateTotp = (secret, timestamp = Date.now(), stepSeconds = 30, digits = 6) => {
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32ToBuffer(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % (10 ** digits)).padStart(digits, '0');
};

const verifyTotp = (secret, token, window = 1) => {
  const normalized = String(token || '').replace(/\s/g, '');
  for (let offset = -window; offset <= window; offset++) {
    const timestamp = Date.now() + offset * 30000;
    if (generateTotp(secret, timestamp) === normalized) return true;
  }
  return false;
};

const buildOtpAuthUrl = ({ issuer = 'SmartNMS', accountName, secret }) => {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
};

const buildQrSvgDataUrl = (text) => {
  const escaped = String(text).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
    <rect width="320" height="320" fill="#fff"/>
    <text x="16" y="32" fill="#111" font-family="Arial" font-size="12">SmartNMS MFA</text>
    <text x="16" y="58" fill="#111" font-family="monospace" font-size="8">${escaped}</text>
    <rect x="16" y="84" width="288" height="220" fill="none" stroke="#111" stroke-width="2"/>
    <text x="28" y="188" fill="#111" font-family="Arial" font-size="13">Use setup key if QR scanning is unavailable.</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

module.exports = {
  randomBase32,
  generateTotp,
  verifyTotp,
  buildOtpAuthUrl,
  buildQrSvgDataUrl,
};
