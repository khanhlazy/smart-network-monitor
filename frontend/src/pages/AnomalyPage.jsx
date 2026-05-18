import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Activity, RefreshCw } from 'lucide-react';

export default function AnomalyPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const fetchEvents = async () => {
    const res = await api.get('/api/v1/anomaly');
    setEvents(res.data.data);
  };
  useEffect(() => { fetchEvents(); }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-nms-text">{t('anomaly.title')}</h1>
        <button onClick={fetchEvents} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary"><RefreshCw size={14} />{t('common.refresh')}</button>
      </div>
      <div className="bg-nms-surface border border-nms-border rounded-lg overflow-hidden">
        <table className="w-full nms-table">
          <thead>
            <tr className="border-b border-nms-border">
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('alerts.device')}</th>
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">Metric</th>
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('anomaly.score')}</th>
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('anomaly.explanation')}</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-nms-text-muted"><Activity className="mx-auto mb-2" />{t('common.noData')}</td></tr>
            ) : events.map(event => (
              <tr key={event._id} className="border-b border-nms-border/30">
                <td className="px-4 py-3 text-sm text-nms-text">{event.deviceId?.name || '--'}</td>
                <td className="px-4 py-3 text-sm text-nms-text-secondary">{event.metric}</td>
                <td className="px-4 py-3 text-sm text-nms-brand">{Math.round(event.anomalyScore * 100) / 100}</td>
                <td className="px-4 py-3 text-sm text-nms-text-secondary">{event.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
