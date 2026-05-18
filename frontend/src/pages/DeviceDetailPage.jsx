import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft, Edit, Zap, Wifi, WifiOff, AlertTriangle, HelpCircle, Wrench,
  Server, Clock, MapPin, Tag, Activity, Heart, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DeviceDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const [deviceRes, telemetryRes] = await Promise.all([
          api.get(`/api/v1/devices/${id}`),
          api.get(`/api/v1/devices/${id}/telemetry?metric=latency_ms&hours=24`),
        ]);
        setDevice(deviceRes.data.data);
        setTelemetry(telemetryRes.data.data.map(s => ({
          time: new Date(s.sampledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          value: s.value,
        })));
      } catch (error) {
        console.error('Fetch device error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDevice();
  }, [id]);

  const handlePoll = async () => {
    setPolling(true);
    try {
      const res = await api.post(`/api/v1/devices/${id}/poll`);
      setDevice(prev => ({ ...prev, state: res.data.data.state }));
    } catch (err) { console.error(err); }
    setPolling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-nms-brand" size={32} />
      </div>
    );
  }

  if (!device) {
    return <p className="text-nms-text-muted text-center py-12">Không tìm thấy thiết bị.</p>;
  }

  const state = device.state || {};
  const statusConfig = {
    online: { color: 'text-nms-green', bg: 'bg-nms-green/15', border: 'border-nms-green/30', icon: Wifi },
    offline: { color: 'text-nms-red', bg: 'bg-nms-red/15', border: 'border-nms-red/30', icon: WifiOff },
    warning: { color: 'text-nms-amber', bg: 'bg-nms-amber/15', border: 'border-nms-amber/30', icon: AlertTriangle },
    critical: { color: 'text-nms-critical', bg: 'bg-nms-critical/15', border: 'border-nms-critical/30', icon: AlertTriangle },
    unknown: { color: 'text-nms-text-muted', bg: 'bg-nms-text-muted/15', border: 'border-nms-text-muted/30', icon: HelpCircle },
    maintenance: { color: 'text-nms-brand', bg: 'bg-nms-brand/15', border: 'border-nms-brand/30', icon: Wrench },
  };
  const sc = statusConfig[state.status] || statusConfig.unknown;
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/devices')} className="p-2 rounded-lg hover:bg-nms-hover text-nms-text-muted">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-page-title text-nms-text">{device.name}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-status ${sc.color} ${sc.bg} border ${sc.border}`}>
              <StatusIcon size={12} />
              {t(`status.${state.status || 'unknown'}`)}
            </span>
          </div>
          <p className="text-sm text-nms-text-muted mt-0.5">
            {device.vendor} {device.model} • <code className="text-nms-cyan">{device.managementIp}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePoll} disabled={polling} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border hover:border-nms-cyan text-sm text-nms-text-secondary hover:text-nms-cyan transition-all">
            {polling ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {t('devices.testConnection')}
          </button>
          <button onClick={() => navigate(`/devices/${id}/edit`)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-brand hover:bg-blue-600 text-sm text-white">
            <Edit size={14} />
            {t('common.edit')}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard label={t('devices.latency')} value={state.latencyMs} unit="ms" icon={Activity} color={state.latencyMs > 100 ? 'text-nms-amber' : 'text-nms-cyan'} />
        <MetricCard label={t('devices.packetLoss')} value={state.packetLossPct} unit="%" icon={AlertTriangle} color={state.packetLossPct > 5 ? 'text-nms-red' : 'text-nms-green'} />
        <MetricCard label={t('devices.cpu')} value={state.cpuPct} unit="%" icon={Activity} color={state.cpuPct > 85 ? 'text-nms-amber' : 'text-nms-cyan'} />
        <MetricCard label={t('devices.memory')} value={state.memoryPct} unit="%" icon={Activity} color={state.memoryPct > 85 ? 'text-nms-amber' : 'text-nms-cyan'} />
        <MetricCard label={t('devices.uptime')} value={state.uptimeSec ? formatUptime(state.uptimeSec) : '--'} icon={Clock} isText />
        <MetricCard label={t('dashboard.healthScore')} value={state.healthScore} unit="/100" icon={Heart} color={state.healthScore >= 75 ? 'text-nms-green' : 'text-nms-amber'} />
        <MetricCard label={t('devices.type')} value={t(`devices.types.${device.type}`)} icon={Server} isText />
        <MetricCard label={t('devices.lastSeen')} value={state.lastSeenAt ? new Date(state.lastSeenAt).toLocaleString('vi-VN') : '--'} icon={Clock} isText />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device Info */}
        <div className="bg-nms-surface border border-nms-border rounded-lg p-5">
          <h3 className="text-card-title text-nms-text mb-4">{t('devices.deviceDetail')}</h3>
          <div className="space-y-3">
            <InfoRow label={t('devices.hostname')} value={device.hostname} />
            <InfoRow label={t('devices.serialNumber')} value={device.serialNumber} />
            <InfoRow label={t('devices.macAddress')} value={device.macAddress} />
            <InfoRow label={t('devices.site')} value={device.siteId} />
            <InfoRow label={t('devices.location')} value={device.location ? `${device.location.building || ''} ${device.location.floor || ''} ${device.location.room || ''}`.trim() : '--'} />
            <InfoRow label={t('devices.tags')} value={device.tags?.length > 0 ? device.tags.join(', ') : '--'} />
          </div>
        </div>

        {/* Latency Chart */}
        <div className="bg-nms-surface border border-nms-border rounded-lg p-5">
          <h3 className="text-card-title text-nms-text mb-4">{t('dashboard.latencyTrend')}</h3>
          {telemetry.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={telemetry}>
                <defs>
                  <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#768497', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#243244' }} />
                <YAxis tick={{ fill: '#768497', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#243244' }} width={35} />
                <Tooltip contentStyle={{ backgroundColor: '#17202B', border: '1px solid #243244', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="value" stroke="#22D3EE" strokeWidth={2} fill="url(#latGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-nms-text-muted text-center py-8">{t('common.noData')}</p>
          )}
        </div>
      </div>

      <div className="bg-nms-surface border border-nms-border rounded-lg p-5">
        <h3 className="text-card-title text-nms-text mb-4">{t('devices.interfaces')}</h3>
        {state.interfaces?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full nms-table">
              <thead>
                <tr className="border-b border-nms-border">
                  <th className="text-left text-xs text-nms-text-muted uppercase px-3 py-2">Interface</th>
                  <th className="text-left text-xs text-nms-text-muted uppercase px-3 py-2">{t('common.status')}</th>
                  <th className="text-left text-xs text-nms-text-muted uppercase px-3 py-2">{t('devices.trafficIn')}</th>
                  <th className="text-left text-xs text-nms-text-muted uppercase px-3 py-2">{t('devices.trafficOut')}</th>
                  <th className="text-left text-xs text-nms-text-muted uppercase px-3 py-2">{t('devices.errors')}</th>
                </tr>
              </thead>
              <tbody>
                {state.interfaces.map((item) => (
                  <tr key={item.index || item.name} className="border-b border-nms-border/30">
                    <td className="px-3 py-2 text-sm text-nms-text">{item.name || `if-${item.index}`}</td>
                    <td className="px-3 py-2 text-sm text-nms-text-secondary">{item.status || '--'}</td>
                    <td className="px-3 py-2 text-sm text-nms-text-secondary">{item.inOctets ?? '--'}</td>
                    <td className="px-3 py-2 text-sm text-nms-text-secondary">{item.outOctets ?? '--'}</td>
                    <td className="px-3 py-2 text-sm text-nms-text-secondary">{(item.inErrors || 0) + (item.outErrors || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-nms-text-muted">{t('common.noData')}</p>
        )}
      </div>
    </div>
  );
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function MetricCard({ label, value, unit, icon: Icon, color, isText }) {
  return (
    <div className="bg-nms-surface border border-nms-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-nms-text-muted" />
        <span className="text-xs text-nms-text-muted">{label}</span>
      </div>
      {isText ? (
        <p className="text-sm font-medium text-nms-text truncate">{value || '--'}</p>
      ) : (
        <p className={`text-metric font-bold ${color || 'text-nms-text'}`}>
          {value !== null && value !== undefined ? value : '--'}
          {unit && <span className="text-sm text-nms-text-muted font-normal ml-1">{unit}</span>}
        </p>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-nms-border/30 last:border-0">
      <span className="text-xs text-nms-text-muted">{label}</span>
      <span className="text-sm text-nms-text text-right ml-4">{value || '--'}</span>
    </div>
  );
}
