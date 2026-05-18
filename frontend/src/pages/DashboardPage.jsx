import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../sockets';
import {
  Server, Wifi, WifiOff, AlertTriangle, Bell, Clock, Activity, Radio,
  TrendingUp, TrendingDown, Minus, Heart, ArrowRight, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const statusColors = {
  online: '#22C55E',
  offline: '#EF4444',
  warning: '#F59E0B',
  critical: '#B91C1C',
  unknown: '#768497',
  maintenance: '#2F80ED',
};

const severityColors = {
  info: '#2F80ED',
  warning: '#F59E0B',
  high: '#EF4444',
  critical: '#B91C1C',
};

function KPICard({ icon: Icon, label, value, suffix, trend, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="nms-card bg-nms-surface border border-nms-border rounded-lg p-4 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color || 'bg-nms-brand/15'}`}>
          <Icon size={18} className={color ? 'text-white' : 'text-nms-brand'} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs ${trend > 0 ? 'text-nms-green' : trend < 0 ? 'text-nms-red' : 'text-nms-text-muted'}`}>
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          </div>
        )}
      </div>
      <p className="text-metric text-nms-text font-bold leading-none mb-1">
        {value !== null && value !== undefined ? value : '--'}
        {suffix && <span className="text-sm text-nms-text-muted font-normal ml-1">{suffix}</span>}
      </p>
      <p className="text-xs text-nms-text-secondary">{label}</p>
    </div>
  );
}

function HealthScoreGauge({ score }) {
  const { t } = useTranslation();
  let color = '#22C55E';
  let label = t('health.good');

  if (score < 40) { color = '#B91C1C'; label = t('health.critical'); }
  else if (score < 60) { color = '#EF4444'; label = t('health.degraded'); }
  else if (score < 75) { color = '#F59E0B'; label = t('health.attention'); }
  else if (score < 90) { color = '#22D3EE'; label = t('health.stable'); }

  const circumference = 2 * Math.PI * 52;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#243244" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-nms-text">{score > 0 || label !== 'Tốt' ? score : '--'}</span>
          <span className="text-[10px] text-nms-text-muted">/100</span>
        </div>
      </div>
      <span className="text-xs font-semibold mt-2" style={{ color }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const [latencyData, setLatencyData] = useState([]);

  const fetchSummary = useCallback(async () => {
    try {
      const [summaryRes, latencyRes] = await Promise.all([
        api.get('/api/v1/dashboard/summary'),
        api.get('/api/v1/dashboard/latency')
      ]);
      setSummary(summaryRes.data.data);
      setLatencyData(latencyRes.data.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    const socket = getSocket();
    if (socket) {
      socket.emit('dashboard:subscribe', {});
      socket.on('dashboard:summary.updated', () => {
        fetchSummary();
      });
      socket.on('device:state.updated', () => {
        fetchSummary();
      });
    }

    return () => {
      if (socket) {
        socket.off('dashboard:summary.updated');
        socket.off('device:state.updated');
      }
    };
  }, [fetchSummary]);

  const donutData = summary ? [
    { name: t('status.online'), value: summary.onlineDevices, color: statusColors.online },
    { name: t('status.offline'), value: summary.offlineDevices, color: statusColors.offline },
    { name: t('status.warning'), value: summary.warningDevices, color: statusColors.warning },
    { name: t('status.unknown'), value: Math.max(0, summary.totalDevices - summary.onlineDevices - summary.offlineDevices - summary.warningDevices), color: statusColors.unknown },
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-nms-surface rounded w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 bg-nms-surface rounded-lg border border-nms-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-nms-text">{t('dashboard.title')}</h1>
          <p className="text-xs text-nms-text-muted mt-1 flex items-center gap-1.5">
            <Clock size={12} />
            {t('dashboard.updatedAgo', { time: getTimeAgo(lastUpdate) })}
          </p>
        </div>
        <button
          onClick={fetchSummary}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border hover:border-nms-brand text-sm text-nms-text-secondary hover:text-nms-text transition-all"
        >
          <RefreshCw size={14} />
          {t('common.refresh')}
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KPICard
          icon={Server}
          label={t('dashboard.totalDevices')}
          value={summary?.totalDevices}
          onClick={() => navigate('/devices')}
        />
        <KPICard
          icon={Wifi}
          label={t('dashboard.onlineDevices')}
          value={summary?.onlineDevices}
          color="bg-nms-green/15"
          onClick={() => navigate('/devices?status=online')}
        />
        <KPICard
          icon={WifiOff}
          label={t('dashboard.offlineDevices')}
          value={summary?.offlineDevices}
          color="bg-nms-red/15"
          onClick={() => navigate('/devices?status=offline')}
        />
        <KPICard
          icon={Bell}
          label={t('dashboard.openAlerts')}
          value={summary?.openAlerts}
          color={summary?.criticalAlerts > 0 ? 'bg-nms-red/15' : 'bg-nms-amber/15'}
          onClick={() => navigate('/alerts')}
        />
        <KPICard
          icon={Activity}
          label={t('dashboard.avgLatency')}
          value={summary?.avgLatency}
          suffix="ms"
        />
        <KPICard
          icon={AlertTriangle}
          label={t('dashboard.packetLoss')}
          value={summary?.avgPacketLoss}
          suffix="%"
        />
        <KPICard
          icon={Radio}
          label={t('dashboard.activeCollectors')}
          value={summary?.activeCollectors}
          color="bg-nms-cyan/15"
        />
        <KPICard
          icon={AlertTriangle}
          label={t('dashboard.criticalAlerts')}
          value={summary?.criticalAlerts}
          color="bg-nms-critical/15"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="bg-nms-surface border border-nms-border rounded-lg p-5">
          <h3 className="text-card-title text-nms-text mb-4">{t('dashboard.healthScore')}</h3>
          <div className="flex justify-center">
            <HealthScoreGauge score={summary?.healthScore || 0} />
          </div>
        </div>

        {/* Device Status Donut */}
        <div className="bg-nms-surface border border-nms-border rounded-lg p-5">
          <h3 className="text-card-title text-nms-text mb-4">{t('dashboard.deviceStatus')}</h3>
          <div className="flex items-center justify-center">
            <PieChart width={200} height={160}>
              <Pie
                data={donutData}
                cx={100} cy={80}
                innerRadius={40} outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {donutData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#17202B', border: '1px solid #243244', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#F4F7FB' }}
              />
            </PieChart>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {donutData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-nms-text-secondary">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}: {item.value}
              </div>
            ))}
          </div>
        </div>

        {/* Alert Severity */}
        <div className="bg-nms-surface border border-nms-border rounded-lg p-5">
          <h3 className="text-card-title text-nms-text mb-4">{t('dashboard.alertsBySeverity')}</h3>
          <div className="space-y-3">
            {['critical', 'high', 'warning', 'info'].map((sev) => {
              const count = sev === 'critical' ? (summary?.criticalAlerts || 0) :
                sev === 'warning' ? Math.max(0, (summary?.openAlerts || 0) - (summary?.criticalAlerts || 0)) : 0;
              return (
                <div key={sev} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: severityColors[sev] }} />
                  <span className="text-xs text-nms-text-secondary flex-1 capitalize">
                    {t(`alerts.severities.${sev}`)}
                  </span>
                  <span className="text-sm font-semibold text-nms-text">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Traffic Chart */}
      <div className="bg-nms-surface border border-nms-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-card-title text-nms-text">{t('dashboard.latencyTrend')}</h3>
          <div className="flex items-center gap-4 text-xs text-nms-text-muted">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-nms-cyan rounded" /> Latency (ms)
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          {summary?.totalDevices === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-nms-text-muted">
              <Activity className="opacity-50 mb-2" size={32} />
              <p className="text-sm">Chưa có thiết bị nào để hiển thị dữ liệu</p>
            </div>
          ) : (
            <AreaChart data={latencyData}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: '#768497', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#243244' }}
              />
              <YAxis
                tick={{ fill: '#768497', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#243244' }}
                width={40}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#17202B', border: '1px solid #243244', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#F4F7FB' }}
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="#22D3EE"
                strokeWidth={2}
                fill="url(#latencyGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 10) return '< 10s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

