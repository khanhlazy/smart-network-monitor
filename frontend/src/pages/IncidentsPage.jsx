import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getSocket } from '../sockets';
import { Flame, Plus, RefreshCw, CheckCircle2, MessageSquare } from 'lucide-react';

export default function IncidentsPage() {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', severity: 'warning' });
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/incidents');
      setIncidents(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const socket = getSocket();
    if (socket) {
      socket.on('incident:created', fetchIncidents);
      socket.on('incident:updated', fetchIncidents);
    }
    return () => {
      if (socket) {
        socket.off('incident:created', fetchIncidents);
        socket.off('incident:updated', fetchIncidents);
      }
    };
  }, []);

  const createIncident = async (e) => {
    e.preventDefault();
    await api.post('/api/v1/incidents', form);
    setForm({ title: '', description: '', severity: 'warning' });
    fetchIncidents();
  };

  const assignIncident = async (incident) => {
    await api.post(`/api/v1/incidents/${incident._id}/assign`, {});
    fetchIncidents();
  };

  const resolveIncident = async (incident) => {
    await api.post(`/api/v1/incidents/${incident._id}/resolve`, { resolution: selected?.resolution || 'Đã xử lý sự cố.' });
    fetchIncidents();
  };

  const addComment = async () => {
    if (!selected || !comment) return;
    await api.post(`/api/v1/incidents/${selected._id}/comment`, { body: comment });
    setComment('');
    const res = await api.get(`/api/v1/incidents/${selected._id}`);
    setSelected(res.data.data);
    fetchIncidents();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-nms-text">{t('incidents.title')}</h1>
        <button onClick={fetchIncidents} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary">
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>

      <form onSubmit={createIncident} className="grid grid-cols-1 lg:grid-cols-4 gap-3 bg-nms-surface border border-nms-border rounded-lg p-4">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('common.name')} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text" required />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('common.description')} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text lg:col-span-2" />
        <button className="flex items-center justify-center gap-2 h-10 rounded-lg bg-nms-brand text-white text-sm font-medium">
          <Plus size={14} /> {t('incidents.create')}
        </button>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-nms-surface border border-nms-border rounded-lg overflow-hidden">
          <table className="w-full nms-table">
            <thead>
              <tr className="border-b border-nms-border">
                <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('common.name')}</th>
                <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('alerts.severity')}</th>
                <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('common.status')}</th>
                <th className="text-right text-xs text-nms-text-muted uppercase px-4 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 bg-nms-hover rounded animate-pulse" /></td></tr>
              )) : incidents.map((incident) => (
                <tr key={incident._id} onClick={() => setSelected(incident)} className="border-b border-nms-border/30 hover:bg-nms-hover/50 cursor-pointer">
                  <td className="px-4 py-3 text-sm text-nms-text">{incident.title}</td>
                  <td className="px-4 py-3 text-sm text-nms-text-secondary">{t(`alerts.severities.${incident.severity}`)}</td>
                  <td className="px-4 py-3 text-sm text-nms-text-secondary">{t(`incidents.statuses.${incident.status}`)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={(e) => { e.stopPropagation(); assignIncident(incident); }} className="px-2 py-1 rounded bg-nms-brand/10 text-nms-brand text-xs">{t('incidents.assign')}</button>
                      {incident.status !== 'resolved' && <button onClick={(e) => { e.stopPropagation(); resolveIncident(incident); }} className="px-2 py-1 rounded bg-nms-green/10 text-nms-green text-xs">{t('alerts.resolve')}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-nms-surface border border-nms-border rounded-lg p-4 min-h-[320px]">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Flame className="text-nms-amber" size={20} />
                <div>
                  <h2 className="text-card-title text-nms-text">{selected.title}</h2>
                  <p className="text-xs text-nms-text-muted">{selected.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                {(selected.timeline || []).map((item) => (
                  <div key={item._id || item.createdAt} className="text-xs text-nms-text-secondary border-l border-nms-border pl-3 py-1">
                    {item.message} • {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </div>
                ))}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('incidents.comment')} className="w-full h-20 px-3 py-2 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text" />
              <button onClick={addComment} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary">
                <MessageSquare size={14} /> {t('incidents.comment')}
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-nms-text-muted">
              <CheckCircle2 size={32} />
              <p className="text-sm mt-2">{t('common.noData')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
