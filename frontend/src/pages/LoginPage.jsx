import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/authStore';
import { Network, Globe, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, verifyMfaLogin, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const currentLang = i18n.language;

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (mfaToken) {
      const result = await verifyMfaLogin(mfaToken, mfaCode);
      if (result.success) navigate('/dashboard');
      return;
    }

    const result = await login(username, password);
    if (result?.mfaRequired) {
      setMfaToken(result.mfaToken);
      return;
    }
    if (result?.success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-nms-bg flex items-center justify-center p-4 relative font-vietnam">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(47,128,237,0.08),transparent_70%)]" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(36,50,68,0.3) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <button
        onClick={toggleLanguage}
        className="absolute top-6 right-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border hover:border-nms-brand text-sm text-nms-text-secondary hover:text-nms-text transition-all z-10"
      >
        <Globe size={16} />
        {currentLang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
      </button>

      <div className="relative w-full max-w-md z-10">
        <div className="bg-nms-surface border border-nms-border rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nms-brand to-nms-cyan flex items-center justify-center mb-4 shadow-lg shadow-nms-brand/20">
              <Network size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-nms-text">SmartNMS</h1>
            <p className="text-sm text-nms-text-secondary mt-1 text-center">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-lg font-semibold text-nms-text text-center">
              {mfaToken ? t('auth.mfaTitle') : t('auth.loginTitle')}
            </h2>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-nms-red/10 border border-nms-red/30 text-sm text-nms-red animate-fade-in">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {!mfaToken ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-nms-text-secondary mb-1.5">
                    {t('auth.username')}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full h-10 px-4 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text placeholder:text-nms-text-muted focus:outline-none focus:border-nms-brand focus:ring-1 focus:ring-nms-brand/30 transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nms-text-secondary mb-1.5">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-4 pr-10 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text placeholder:text-nms-text-muted focus:outline-none focus:border-nms-brand focus:ring-1 focus:ring-nms-brand/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-nms-text-muted hover:text-nms-text"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-nms-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-nms-border bg-nms-bg accent-nms-brand"
                    />
                    {t('auth.rememberMe')}
                  </label>
                  <button type="button" className="text-sm text-nms-brand hover:text-nms-brand/80 transition-colors">
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-nms-text-secondary mb-1.5">
                  {t('auth.mfaCode')}
                </label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  className="w-full h-10 px-4 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text placeholder:text-nms-text-muted focus:outline-none focus:border-nms-brand focus:ring-1 focus:ring-nms-brand/30 transition-all"
                  autoFocus
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!mfaToken && (!username || !password)) || (mfaToken && !mfaCode)}
              className="w-full h-10 bg-nms-brand hover:bg-nms-brand/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-nms-brand/20"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('auth.loggingIn')}
                </>
              ) : (
                mfaToken ? t('auth.verifyMfa') : t('auth.login')
              )}
            </button>
          </form>

          {!mfaToken && (
            <div className="mt-6 pt-5 border-t border-nms-border">
              <p className="text-xs text-nms-text-muted text-center mb-3">
                {currentLang === 'vi' ? 'Tài khoản demo:' : 'Demo accounts:'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { user: 'admin', pass: 'Admin@123', role: 'Admin' },
                  { user: 'operator', pass: 'Operator@123', role: 'Operator' },
                  { user: 'viewer', pass: 'Viewer@123', role: 'Viewer' },
                ].map((account) => (
                  <button
                    key={account.user}
                    type="button"
                    onClick={() => { setUsername(account.user); setPassword(account.pass); }}
                    className="p-2 rounded-lg bg-nms-bg border border-nms-border hover:border-nms-brand/50 text-center transition-all group"
                  >
                    <p className="text-xs font-semibold text-nms-text group-hover:text-nms-brand">{account.role}</p>
                    <p className="text-[10px] text-nms-text-muted mt-0.5">{account.user}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-nms-text-muted mt-4">
          SmartNMS v1.0.0 • © 2026
        </p>
      </div>
    </div>
  );
}
