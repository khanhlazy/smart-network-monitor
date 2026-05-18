import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getSocket } from '../sockets';
import { Play, Pause, Copy, Server, Activity, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

const severityColors = {
  info: 'bg-nms-brand',
  warning: 'bg-nms-amber',
  high: 'bg-nms-red',
  critical: 'bg-nms-critical',
};

const statusConfig = {
  online: { color: 'bg-nms-green', icon: Wifi },
  offline: { color: 'bg-nms-red', icon: WifiOff },
  warning: { color: 'bg-nms-amber', icon: AlertTriangle },
  critical: { color: 'bg-nms-critical', icon: AlertTriangle },
  maintenance: { color: 'bg-nms-brand', icon: Server },
  unknown: { color: 'bg-nms-text-muted', icon: Server },
};

export default function MonitoringPage() {
  const { t, i18n } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [events, setEvents] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  
  const eventsRef = useRef(events);
  const pausedRef = useRef(isPaused);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const devRes = await api.get('/api/v1/devices');
        setDevices(devRes.data.data.items || devRes.data.data || []);
      } catch (err) {
        console.error('Failed to load devices', err);
      }
    };
    loadInitialData();

    const socket = getSocket();
    if (socket) {
      socket.emit('dashboard:subscribe', {}); 
      socket.emit('alerts:subscribe', {});

      const handleDeviceUpdate = (payload) => {
        if (!payload?.data) return;
        const updated = payload.data;
        
        // Add fake event for device update to see the feed active
        if (!pausedRef.current) {
          const newEvent = {
            id: 'dev-' + updated.deviceId + '-' + Date.now(),
            timestamp: new Date(),
            type: 'device_state',
            severity: updated.status === 'online' ? 'info' : (updated.status === 'offline' ? 'critical' : 'warning'),
            message: i18n.language === 'vi' ? `Trạng thái thay đổi thành ${updated.status}` : `Status changed to ${updated.status}`,
            device: updated.name || 'Unknown',
          };
          setEvents(prev => [newEvent, ...prev].slice(0, 100));
        }

        setDevices(prev => prev.map(d => {
          if (d._id === updated.deviceId) {
            return {
              ...d,
              state: {
                ...d.state,
                status: updated.status,
                latencyMs: updated.latencyMs,
                packetLossPct: updated.packetLossPct,
              }
            };
          }
          return d;
        }));
      };

      const handleAlertEvent = (payload) => {
        if (pausedRef.current || !payload?.data) return;
        const alert = payload.data;
        const newEvent = {
          id: alert._id + '-' + Date.now(),
          timestamp: new Date(),
          type: 'alert',
          severity: alert.severity,
          message: i18n.language === 'vi' ? (alert.titleVi || alert.title) : alert.title,
          device: alert.deviceId?.name || 'Unknown',
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 100));
      };

      socket.on('device:state.updated', handleDeviceUpdate);
      socket.on('alert:created', handleAlertEvent);
      socket.on('alert:updated', handleAlertEvent);

      return () => {
        socket.off('device:state.updated', handleDeviceUpdate);
        socket.off('alert:created', handleAlertEvent);
        socket.off('alert:updated', handleAlertEvent);
      };
    }
  }, [i18n.language]);

  const filteredEvents = events.filter(e => filterSeverity === 'all' || e.severity === filterSeverity);

  const copyEvent = (event) => {
    navigator.clipboard.writeText(`[${event.timestamp.toLocaleTimeString()}] ${event.severity.toUpperCase()} - ${event.device}: ${event.message}`);
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-nms-text">{t('nav.monitoring')}</h1>
          <p className="text-xs text-nms-text-muted mt-1 flex items-center gap-1.5">
            <Activity size={12} /> {i18n.language === 'vi' ? 'Giám sát lưới thiết bị và luồng sự kiện' : 'Live Device Grid & Event Feed'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Live Device Grid */}
        <div className="lg:col-span-2 bg-nms-surface border border-nms-border rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-nms-border bg-nms-surface-raised">
            <h3 className="text-sm font-semibold text-nms-text">{i18n.language === 'vi' ? 'Lưới trạng thái thiết bị' : 'Device Status Grid'}</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {devices.map(device => {
                const status = device.state?.status || 'unknown';
                const conf = statusConfig[status] || statusConfig.unknown;
                const Icon = conf.icon;
                return (
                  <div key={device._id} className="p-3 rounded-lg border border-nms-border bg-nms-bg flex flex-col gap-2 hover:border-nms-brand/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${conf.color}/15`}>
                        <Icon size={16} className={`text-${conf.color.replace('bg-', '')}`} />
                      </div>
                      <div className={`w-2 h-2 rounded-full ${conf.color} ${status === 'online' ? 'animate-pulse-dot' : ''}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-nms-text truncate" title={device.name}>{device.name}</p>
                      <p className="text-[10px] text-nms-text-muted mt-0.5">
                        {device.state?.latencyMs !== null && device.state?.latencyMs !== undefined ? `${device.state.latencyMs}ms` : '--'} | {device.state?.packetLossPct !== null && device.state?.packetLossPct !== undefined ? `${device.state.packetLossPct}% loss` : '--'}
                      </p>
                    </div>
                  </div>
                );
              })}
              {devices.length === 0 && (
                <div className="col-span-full py-10 text-center text-nms-text-muted text-sm">
                  {i18n.language === 'vi' ? 'Đang tải danh sách thiết bị...' : 'Loading devices...'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Event Feed */}
        <div className="bg-nms-surface border border-nms-border rounded-xl flex flex-col overflow-hidden h-[500px] lg:h-auto">
          <div className="p-4 border-b border-nms-border flex items-center justify-between bg-nms-surface-raised">
            <h3 className="text-sm font-semibold text-nms-text flex items-center gap-2">
              <Activity size={16} className="text-nms-cyan" />
              {i18n.language === 'vi' ? 'Luồng sự kiện trực tiếp' : 'Live Event Feed'}
            </h3>
            <div className="flex items-center gap-2">
              <select 
                value={filterSeverity} 
                onChange={e => setFilterSeverity(e.target.value)}
                className="bg-nms-bg border border-nms-border text-xs rounded-md px-2 py-1 outline-none focus:border-nms-brand text-nms-text-secondary"
              >
                <option value="all">{i18n.language === 'vi' ? 'Tất cả' : 'All'}</option>
                <option value="critical">{i18n.language === 'vi' ? 'Nghiêm trọng' : 'Critical'}</option>
                <option value="warning">{i18n.language === 'vi' ? 'Cảnh báo' : 'Warning'}</option>
                <option value="info">{i18n.language === 'vi' ? 'Thông tin' : 'Info'}</option>
              </select>
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`p-1.5 rounded-md transition-colors ${isPaused ? 'bg-nms-amber/20 text-nms-amber' : 'bg-nms-bg border border-nms-border text-nms-text-secondary hover:text-nms-text'}`}
                title={isPaused ? (i18n.language === 'vi' ? 'Tiếp tục nhận sự kiện' : 'Resume Feed') : (i18n.language === 'vi' ? 'Tạm dừng sự kiện' : 'Pause Feed')}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-nms-text-muted text-sm text-center px-4">
                <div className="w-10 h-10 rounded-full bg-nms-bg border border-nms-border flex items-center justify-center mb-3">
                  <div className="w-2 h-2 rounded-full bg-nms-cyan animate-pulse-dot" />
                </div>
                {i18n.language === 'vi' ? 'Đang chờ sự kiện realtime...' : 'Waiting for real-time events...'}
              </div>
            ) : (
              filteredEvents.map(event => (
                <div key={event.id} className="p-3 bg-nms-bg rounded-lg border border-nms-border group animate-fade-in">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${severityColors[event.severity] || severityColors.info}`} />
                      <span className="text-[10px] font-mono text-nms-text-muted">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => copyEvent(event)}
                      className="text-nms-text-muted hover:text-nms-text opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-nms-text mb-0.5">{event.device}</p>
                  <p className="text-xs text-nms-text-secondary line-clamp-2">{event.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
