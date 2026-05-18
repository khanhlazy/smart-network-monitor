import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Bell, Plus, Send, Trash2 } from 'lucide-react';

export default function NotificationSettingsPage() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'webhook', url: '', enabled: true });

  const fetchChannels = async () => {
    const res = await api.get('/api/v1/notification-channels');
    setChannels(res.data.data);
  };
  useEffect(() => { fetchChannels(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/api/v1/notification-channels', {
      name: form.name,
      type: form.type,
      enabled: form.enabled,
      config: { url: form.url, to: form.url, chatId: form.url },
      severityFilter: ['critical', 'high']
    });
    setForm({ name: '', type: 'webhook', url: '', enabled: true });
    fetchChannels();
  };

  const test = async (id) => api.post(`/api/v1/notification-channels/${id}/test`);
  const remove = async (id) => { await api.delete(`/api/v1/notification-channels/${id}`); fetchChannels(); };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <h1 className="text-page-title text-nms-text">{t('notifications.title')}</h1>
      <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-nms-surface border border-nms-border rounded-lg p-4">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('common.name')} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text" required />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text">
          <option value="email">{t('notifications.email')}</option>
          <option value="telegram">{t('notifications.telegram')}</option>
          <option value="webhook">{t('notifications.webhook')}</option>
        </select>
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL / email / chat id" className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text md:col-span-2" required />
        <button className="flex items-center justify-center gap-2 h-10 rounded-lg bg-nms-brand text-white text-sm"><Plus size={14} />{t('common.create')}</button>
      </form>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {channels.map(channel => (
          <div key={channel._id} className="bg-nms-surface border border-nms-border rounded-lg p-4 flex items-start justify-between">
            <div className="flex gap-3">
              <Bell className="text-nms-brand" size={18} />
              <div>
                <h2 className="text-card-title text-nms-text">{channel.name}</h2>
                <p className="text-xs text-nms-text-muted">{channel.type} • {channel.enabled ? t('common.enabled') : t('common.disabled')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => test(channel._id)} className="p-2 rounded hover:bg-nms-hover text-nms-text-muted hover:text-nms-brand"><Send size={14} /></button>
              <button onClick={() => remove(channel._id)} className="p-2 rounded hover:bg-nms-hover text-nms-text-muted hover:text-nms-red"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
