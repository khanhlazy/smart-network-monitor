import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getSocket } from '../sockets';
import {
  Bell, CheckCircle2, Eye, AlertTriangle, AlertOctagon, Info, Clock, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

const severityConfig = {
  info: { icon: Info, color: 'text-nms-brand', bg: 'bg-nms-brand/15', border: 'border-nms-brand/30' },
  warning: { icon: AlertTriangle, color: 'text-nms-amber', bg: 'bg-nms-amber/15', border: 'border-nms-amber/30' },
  high: { icon: AlertTriangle, color: 'text-nms-red', bg: 'bg-nms-red/15', border: 'border-nms-red/30' },
  critical: { icon: AlertOctagon, color: 'text-nms-critical', bg: 'bg-nms-critical/15', border: 'border-nms-critical/30' },
};

export default function AlertsPage() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveNote, setResolveNote] = useState('');

  const fetchAlerts = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, pageSize: 20, sort: '-lastOccurredAt' };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      const res = await api.get('/api/v1/alerts', { params });
      setAlerts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAlerts();
    const socket = getSocket();
    if (socket) {
      socket.emit('alerts:subscribe', {});
      socket.on('alert:created', () => fetchAlerts());
      socket.on('alert:updated', () => fetchAlerts());
    }
    return () => {
      if (socket) {
        socket.off('alert:created');
        socket.off('alert:updated');
      }
    };
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.post(`/api/v1/alerts/${alertId}/acknowledge`);
      fetchAlerts(pagination.page);
    } catch (err) { console.error(err); }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await api.post(`/api/v1/alerts/${resolveModal._id}/resolve`, { resolutionNote: resolveNote });
      setResolveModal(null);
      setResolveNote('');
      fetchAlerts(pagination.page);
    } catch (err) { console.error(err); }
  };

  const handleSuppress = async (alertId) => {
    try {
      await api.post(`/api/v1/alerts/${alertId}/suppress`);
      fetchAlerts(pagination.page);
    } catch (err) { console.error(err); }
  };

  const getRelativeTime = (date) => {
    if (!date) return '--';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return isVi ? '< 1 phút trước' : '< 1 min ago';
    if (minutes < 60) return isVi ? `${minutes} phút trước` : `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return isVi ? `${hours} giờ trước` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return isVi ? `${days} ngày trước` : `${days}d ago`;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-nms-text">{t('alerts.title')}</h1>
        <button onClick={() => fetchAlerts(1)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border hover:border-nms-brand text-sm text-nms-text-secondary hover:text-nms-text transition-all">
          <RefreshCw size={14} />
          {t('common.refresh')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'open', 'acknowledged', 'resolved', 'suppressed'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              statusFilter === s ? 'bg-nms-brand/15 text-nms-brand border-nms-brand/30' : 'bg-nms-surface text-nms-text-secondary border-nms-border hover:border-nms-brand/30'
            }`}
          >
            {s ? t(`alerts.statuses.${s}`) : t('common.all')}
          </button>
        ))}
        <div className="w-px h-7 bg-nms-border self-center mx-1" />
        {['', 'critical', 'high', 'warning', 'info'].map((s) => (
          <button key={s} onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              severityFilter === s ? 'bg-nms-brand/15 text-nms-brand border-nms-brand/30' : 'bg-nms-surface text-nms-text-secondary border-nms-border hover:border-nms-brand/30'
            }`}
          >
            {s ? t(`alerts.severities.${s}`) : t('common.all')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-nms-surface border border-nms-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full nms-table">
            <thead>
              <tr className="border-b border-nms-border">
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('alerts.severity')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('alerts.alertName')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('alerts.device')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('alerts.status')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('alerts.lastSeen')}</th>
                <th className="text-right text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-nms-border/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-nms-hover rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Bell size={40} className="mx-auto text-nms-text-muted mb-3" />
                    <p className="text-sm text-nms-text-muted">{t('alerts.noAlerts')}</p>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const sevConfig = severityConfig[alert.severity] || severityConfig.info;
                  const SevIcon = sevConfig.icon;
                  return (
                    <tr key={alert._id} className="border-b border-nms-border/30 hover:bg-nms-hover/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-status ${sevConfig.color} ${sevConfig.bg} border ${sevConfig.border}`}>
                          <SevIcon size={12} />
                          {t(`alerts.severities.${alert.severity}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-nms-text">{isVi ? alert.titleVi || alert.title : alert.title}</p>
                        <p className="text-xs text-nms-text-muted mt-0.5">{alert.metric}: {alert.currentValue}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-nms-text-secondary">
                        {alert.deviceId?.name || '--'}
                        <p className="text-xs text-nms-text-muted">{alert.deviceId?.managementIp}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-status px-2 py-0.5 rounded ${
                          alert.status === 'open' ? 'text-nms-amber bg-nms-amber/10' :
                          alert.status === 'acknowledged' ? 'text-nms-brand bg-nms-brand/10' :
                          alert.status === 'resolved' ? 'text-nms-green bg-nms-green/10' :
                          'text-nms-text-muted bg-nms-text-muted/10'
                        }`}>
                          {t(`alerts.statuses.${alert.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-table text-nms-text-muted">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {getRelativeTime(alert.lastOccurredAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {alert.status === 'open' && (
                            <button onClick={() => handleAcknowledge(alert._id)} className="px-2.5 py-1 rounded text-xs font-medium text-nms-brand bg-nms-brand/10 hover:bg-nms-brand/20 transition-colors">
                              {t('alerts.acknowledge')}
                            </button>
                          )}
                          {['open', 'acknowledged'].includes(alert.status) && (
                            <button onClick={() => setResolveModal(alert)} className="px-2.5 py-1 rounded text-xs font-medium text-nms-green bg-nms-green/10 hover:bg-nms-green/20 transition-colors">
                              {t('alerts.resolve')}
                            </button>
                          )}
                          {alert.status === 'open' && (
                            <button onClick={() => handleSuppress(alert._id)} className="px-2.5 py-1 rounded text-xs font-medium text-nms-text-muted bg-nms-text-muted/10 hover:bg-nms-text-muted/20 transition-colors">
                              {t('alerts.suppress')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-nms-border">
            <span className="text-xs text-nms-text-muted">{pagination.total} {t('alerts.title').toLowerCase()}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchAlerts(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-nms-text-secondary">{pagination.page} / {pagination.totalPages}</span>
              <button onClick={() => fetchAlerts(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-nms-surface-raised border border-nms-border rounded-xl p-6 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-nms-text mb-2">{t('alerts.resolve')}</h3>
            <p className="text-sm text-nms-text-secondary mb-4">{isVi ? resolveModal.titleVi || resolveModal.title : resolveModal.title}</p>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder={t('alerts.resolveNote')}
              className="w-full h-24 px-3 py-2 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text placeholder:text-nms-text-muted focus:outline-none focus:border-nms-brand resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setResolveModal(null); setResolveNote(''); }} className="px-4 py-2 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary">
                {t('common.cancel')}
              </button>
              <button onClick={handleResolve} className="px-4 py-2 rounded-lg bg-nms-green hover:bg-green-600 text-sm text-white font-medium">
                {t('alerts.resolve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
