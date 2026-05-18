import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Activity, Database, Radio, Server, Wifi } from 'lucide-react';

export default function SystemHealthPage() {
  const { t } = useTranslation();
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState('');

  useEffect(() => {
    api.get('/api/v1/health').then(res => setHealth(res.data)).catch(() => setHealth(null));
    api.get('/api/v1/metrics', { responseType: 'text' }).then(res => setMetrics(res.data)).catch(() => setMetrics(''));
  }, []);

  const metricValue = (name) => {
    const line = metrics.split('\n').reverse().find(item => item.startsWith(name));
    return line ? line.split(' ').pop() : '--';
  };

  const cards = [
    [Server, 'API', health?.status || '--'],
    [Activity, t('systemHealth.apiLatency'), metricValue('http_request_duration_seconds')],
    [Wifi, t('systemHealth.socket'), metricValue('socket_connected_clients')],
    [Radio, t('systemHealth.worker'), metricValue('worker_ping_duration_ms')],
    [Database, t('systemHealth.database'), metricValue('mongodb_connection_status')],
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-page-title text-nms-text">{t('systemHealth.title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(([Icon, label, value]) => (
          <div key={label} className="bg-nms-surface border border-nms-border rounded-lg p-4">
            <Icon className="text-nms-brand mb-3" size={20} />
            <p className="text-xs text-nms-text-muted">{label}</p>
            <p className="text-lg font-semibold text-nms-text mt-1">{String(value)}</p>
          </div>
        ))}
      </div>
      <pre className="bg-nms-surface border border-nms-border rounded-lg p-4 overflow-auto text-xs text-nms-text-secondary max-h-96">{metrics || t('common.noData')}</pre>
    </div>
  );
}
