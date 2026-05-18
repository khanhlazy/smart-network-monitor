const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('../roles/role.model');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  status: { type: String, enum: ['active', 'disabled', 'locked'], default: 'active' },
  preferences: {
    language: { type: String, enum: ['vi', 'en'], default: 'vi' },
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
  },
  mfa: {
    enabled: { type: Boolean, default: false },
    secretEncrypted: { type: String },
    enabledAt: { type: Date },
    lastVerifiedAt: { type: Date },
  },
  lastLoginAt: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.failedLoginAttempts;
  delete obj.lockedUntil;
  if (obj.mfa) delete obj.mfa.secretEncrypted;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
