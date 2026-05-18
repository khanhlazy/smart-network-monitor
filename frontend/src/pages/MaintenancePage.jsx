import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Wrench, Plus, RefreshCw, Trash2 } from 'lucide-react';

export default function MaintenancePage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', startsAt: '', endsAt: '', scopeType: 'all', suppressAlerts: true });

  const fetchItems = async () => {
    const res = await api.get('/api/v1/maintenance-windows');
    setItems(res.data.data);
  };

  useEffect(() => { fetchItems(); }, []);

  const createWindow = async (e) => {
    e.preventDefault();
    await api.post('/api/v1/maintenance-windows', form);
    setForm({ name: '', startsAt: '', endsAt: '', scopeType: 'all', suppressAlerts: true });
    fetchItems();
  };

  const removeWindow = async (id) => {
    await api.delete(`/api/v1/maintenance-windows/${id}`);
    fetchItems();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-nms-text">{t('maintenance.title')}</h1>
        <button onClick={fetchItems} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary">
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>
      <form onSubmit={createWindow} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-nms-surface border border-nms-border rounded-lg p-4">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('maintenance.create')} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text" required />
        <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text" required />
        <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text" required />
        <label className="flex items-center gap-2 text-sm text-nms-text-secondary">
          <input type="checkbox" checked={form.suppressAlerts} onChange={(e) => setForm({ ...form, suppressAlerts: e.target.checked })} className="accent-nms-brand" />
          {t('maintenance.suppressAlerts')}
        </label>
        <button className="flex items-center justify-center gap-2 h-10 rounded-lg bg-nms-brand text-white text-sm">
          <Plus size={14} /> {t('common.create')}
        </button>
      </form>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item._id} className="bg-nms-surface border border-nms-border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <Wrench className="text-nms-brand" size={18} />
                <div>
                  <h2 className="text-card-title text-nms-text">{item.name}</h2>
                  <p className="text-xs text-nms-text-muted">{new Date(item.startsAt).toLocaleString('vi-VN')} → {new Date(item.endsAt).toLocaleString('vi-VN')}</p>
                  <p className="text-xs text-nms-text-secondary mt-2">{t('common.status')}: {item.status}</p>
                </div>
              </div>
              <button onClick={() => removeWindow(item._id)} className="p-2 rounded hover:bg-nms-hover text-nms-text-muted hover:text-nms-red">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
