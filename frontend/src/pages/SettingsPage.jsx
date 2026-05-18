import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Globe, Moon, Sun, Monitor, Check, Save, Loader2, ShieldCheck, Bell } from 'lucide-react';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language;
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const switchLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('app_language', lang);
    // Save to backend
    api.patch('/api/v1/me/preferences', { language: lang }).catch(() => {});
  };

  const switchTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    api.patch('/api/v1/me/preferences', { theme: newTheme }).catch(() => {});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/v1/me/preferences', { language: currentLang, theme });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const themes = [
    { key: 'dark', icon: Moon, label: t('settings.darkMode') },
    { key: 'light', icon: Sun, label: t('settings.lightMode'), disabled: true },
    { key: 'system', icon: Monitor, label: t('settings.systemMode'), disabled: true },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-page-title text-nms-text">{t('settings.title')}</h1>

      {/* Language Settings */}
      <div className="bg-nms-surface border border-nms-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe size={18} className="text-nms-brand" />
          <h2 className="text-section-title text-nms-text">{t('settings.language')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => switchLanguage('vi')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              currentLang === 'vi' ? 'border-nms-brand bg-nms-brand/5' : 'border-nms-border hover:border-nms-brand/50'
            }`}
          >
            <span className="text-2xl">🇻🇳</span>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-nms-text">Tiếng Việt</p>
              <p className="text-xs text-nms-text-muted">Vietnamese</p>
            </div>
            {currentLang === 'vi' && <Check size={18} className="text-nms-brand" />}
          </button>

          <button
            onClick={() => switchLanguage('en')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              currentLang === 'en' ? 'border-nms-brand bg-nms-brand/5' : 'border-nms-border hover:border-nms-brand/50'
            }`}
          >
            <span className="text-2xl">🇬🇧</span>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-nms-text">English</p>
              <p className="text-xs text-nms-text-muted">Tiếng Anh</p>
            </div>
            {currentLang === 'en' && <Check size={18} className="text-nms-brand" />}
          </button>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-nms-surface border border-nms-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Moon size={18} className="text-nms-violet" />
          <h2 className="text-section-title text-nms-text">{t('settings.appearance')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map(({ key, icon: Icon, label, disabled }) => (
            <button
              key={key}
              disabled={disabled}
              onClick={() => switchTheme(key)}
              className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                theme === key ? 'border-nms-brand bg-nms-brand/5' : 'border-nms-border hover:border-nms-brand/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed hover:border-nms-border' : ''}`}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon size={20} className={theme === key ? 'text-nms-brand' : 'text-nms-text-muted'} />
                <span className="text-sm font-medium text-nms-text">{label}</span>
                {theme === key && <Check size={16} className="text-nms-brand ml-auto" />}
              </div>
              {disabled && (
                <span className="absolute top-1 right-1 text-[8px] px-1.5 py-0.5 bg-nms-amber/20 text-nms-amber rounded uppercase font-bold tracking-wider">
                  {i18n.language === 'vi' ? 'Sắp ra mắt' : 'Soon'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-nms-surface border border-nms-border rounded-xl p-6">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-nms-border/30">
            <span className="text-nms-text-muted">Version</span>
            <span className="text-nms-text font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-nms-border/30">
            <span className="text-nms-text-muted">Environment</span>
            <span className="text-nms-text font-mono">Development</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-nms-text-muted">API Endpoint</span>
            <span className="text-nms-cyan font-mono text-xs">http://localhost:5000</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => navigate('/settings/security')} className="flex items-center gap-3 p-4 rounded-xl bg-nms-surface border border-nms-border hover:border-nms-brand text-left">
          <ShieldCheck size={20} className="text-nms-brand" />
          <div>
            <p className="text-sm font-semibold text-nms-text">{t('settings.security')}</p>
            <p className="text-xs text-nms-text-muted">{t('mfa.title')}</p>
          </div>
        </button>
        <button onClick={() => navigate('/settings/notifications')} className="flex items-center gap-3 p-4 rounded-xl bg-nms-surface border border-nms-border hover:border-nms-brand text-left">
          <Bell size={20} className="text-nms-brand" />
          <div>
            <p className="text-sm font-semibold text-nms-text">{t('settings.notifications')}</p>
            <p className="text-xs text-nms-text-muted">Email, Telegram, Webhook</p>
          </div>
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-nms-brand hover:bg-blue-600 text-sm font-medium text-white disabled:opacity-50 shadow-lg shadow-nms-brand/20 transition-all"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? t('settings.saved') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
