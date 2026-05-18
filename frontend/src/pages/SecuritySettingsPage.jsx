import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import useAuthStore from '../stores/authStore';
import { ShieldCheck, QrCode, Check, X } from 'lucide-react';

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  const { user, fetchMe } = useAuthStore();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const startSetup = async () => {
    const res = await api.post('/api/v1/mfa/setup');
    setSetup(res.data.data);
    setMessage('');
  };

  const verifySetup = async () => {
    await api.post('/api/v1/mfa/verify', { setupToken: setup.setupToken, code });
    setSetup(null);
    setCode('');
    setMessage(t('settings.saved'));
    fetchMe();
  };

  const disable = async () => {
    await api.post('/api/v1/mfa/disable', { code });
    setCode('');
    setMessage(t('settings.saved'));
    fetchMe();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-page-title text-nms-text">{t('settings.security')}</h1>
      <div className="bg-nms-surface border border-nms-border rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <ShieldCheck className="text-nms-brand" size={22} />
            <div>
              <h2 className="text-section-title text-nms-text">{t('mfa.title')}</h2>
              <p className="text-sm text-nms-text-muted mt-1">{user?.mfaEnabled ? t('common.enabled') : t('common.disabled')}</p>
            </div>
          </div>
          {!user?.mfaEnabled ? (
            <button onClick={startSetup} className="px-4 py-2 rounded-lg bg-nms-brand text-white text-sm">{t('mfa.enable')}</button>
          ) : (
            <button onClick={disable} className="px-4 py-2 rounded-lg bg-nms-red text-white text-sm">{t('mfa.disable')}</button>
          )}
        </div>

        {setup && (
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 p-4 rounded-lg bg-nms-bg border border-nms-border">
            <div className="bg-white rounded-lg p-3">
              <img src={setup.qrCodeDataUrl} alt="MFA QR" className="w-full" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-nms-text"><QrCode size={16} /> {t('mfa.scanQr')}</div>
              <code className="block p-2 rounded bg-nms-surface text-xs text-nms-cyan break-all">{setup.secret}</code>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('mfa.enterCode')} className="w-full h-10 px-3 bg-nms-surface border border-nms-border rounded-lg text-sm text-nms-text" />
              <button onClick={verifySetup} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-nms-green text-white text-sm"><Check size={14} />{t('common.confirm')}</button>
            </div>
          </div>
        )}

        {user?.mfaEnabled && (
          <div className="flex gap-3">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('mfa.enterCode')} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text" />
            <button onClick={disable} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-nms-red text-white text-sm"><X size={14} />{t('mfa.disable')}</button>
          </div>
        )}

        {message && <p className="text-sm text-nms-green">{message}</p>}
      </div>
    </div>
  );
}
