import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import api from '../services/api';
import {
  Plus, Search, Filter, RefreshCw, Server, Wifi, WifiOff,
  AlertTriangle, HelpCircle, Wrench, Eye, Edit, Trash2, Zap, ChevronLeft, ChevronRight,
  Upload, Download
} from 'lucide-react';

const statusConfig = {
  online: { icon: Wifi, color: 'text-nms-green', bg: 'bg-nms-green/15', border: 'border-nms-green/30' },
  offline: { icon: WifiOff, color: 'text-nms-red', bg: 'bg-nms-red/15', border: 'border-nms-red/30' },
  warning: { icon: AlertTriangle, color: 'text-nms-amber', bg: 'bg-nms-amber/15', border: 'border-nms-amber/30' },
  critical: { icon: AlertTriangle, color: 'text-nms-critical', bg: 'bg-nms-critical/15', border: 'border-nms-critical/30' },
  unknown: { icon: HelpCircle, color: 'text-nms-text-muted', bg: 'bg-nms-text-muted/15', border: 'border-nms-text-muted/30' },
  maintenance: { icon: Wrench, color: 'text-nms-brand', bg: 'bg-nms-brand/15', border: 'border-nms-brand/30' },
};

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-status ${config.color} ${config.bg} border ${config.border}`}>
      <Icon size={12} />
      {t(`status.${status}`)}
    </span>
  );
}

export default function DevicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [deleteModal, setDeleteModal] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    api.get('/api/v1/devices/export.csv', { responseType: 'blob' }).then((res) => {
      saveAs(res.data, 'smartnms_devices.csv');
    }).catch(console.error);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await api.post('/api/v1/devices/import', { rows: results.data });
          alert(`${t('devices.importSuccess')}: ${res.data.data.successCount}. ${t('devices.rowErrors')}: ${res.data.data.errorCount}`);
          fetchDevices(1);
        } catch (error) {
          alert(`${t('common.error')}: ` + (error.response?.data?.error?.message || error.message));
        } finally {
          setImporting(false);
          e.target.value = null;
        }
      }
    });
  };

  const fetchDevices = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, pageSize: 20, sort: '-updatedAt' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/api/v1/devices', { params });
      setDevices(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Fetch devices error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDevices(1);
  };

  const handleDelete = async (device) => {
    try {
      await api.delete(`/api/v1/devices/${device._id}`);
      setDeleteModal(null);
      fetchDevices(pagination.page);
    } catch (error) {
      console.error('Delete device error:', error);
    }
  };

  const handlePollDevice = async (deviceId) => {
    try {
      await api.post(`/api/v1/devices/${deviceId}/poll`);
      fetchDevices(pagination.page);
    } catch (error) {
      console.error('Poll device error:', error);
    }
  };

  const getRelativeTime = (date) => {
    if (!date) return '--';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '< 1 phút trước';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-page-title text-nms-text">{t('devices.title')}</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2.5 bg-nms-surface hover:bg-nms-hover border border-nms-border rounded-lg text-sm font-medium text-nms-text-secondary cursor-pointer transition-colors">
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="hidden sm:inline">{t('devices.importCsv')}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2.5 bg-nms-surface hover:bg-nms-hover border border-nms-border rounded-lg text-sm font-medium text-nms-text-secondary transition-colors">
            <Download size={16} />
            <span className="hidden sm:inline">{t('devices.exportCsv')}</span>
          </button>
          <button
            onClick={() => navigate('/devices/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-nms-brand hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors shadow-lg shadow-nms-brand/20"
          >
            <Plus size={16} />
            {t('devices.addDevice')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-nms-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search') + '...'}
            className="w-full h-9 pl-9 pr-4 bg-nms-surface border border-nms-border rounded-lg text-sm text-nms-text placeholder:text-nms-text-muted focus:outline-none focus:border-nms-brand"
          />
        </form>

        <div className="flex gap-2 flex-wrap">
          {['', 'online', 'offline', 'warning', 'unknown'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                statusFilter === status
                  ? 'bg-nms-brand/15 text-nms-brand border-nms-brand/30'
                  : 'bg-nms-surface text-nms-text-secondary border-nms-border hover:border-nms-brand/30'
              }`}
            >
              {status ? t(`status.${status}`) : t('common.all')}
            </button>
          ))}
          <button onClick={() => fetchDevices(pagination.page)} className="p-2 rounded-lg bg-nms-surface border border-nms-border hover:border-nms-brand text-nms-text-muted hover:text-nms-text">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-nms-surface border border-nms-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full nms-table">
            <thead>
              <tr className="border-b border-nms-border">
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase tracking-wider px-4 py-3">{t('devices.deviceName')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase tracking-wider px-4 py-3">{t('devices.type')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase tracking-wider px-4 py-3">{t('devices.ipAddress')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase tracking-wider px-4 py-3">{t('devices.status')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase tracking-wider px-4 py-3">{t('devices.latency')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase tracking-wider px-4 py-3">{t('devices.packetLoss')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase tracking-wider px-4 py-3">{t('devices.lastSeen')}</th>
                <th className="text-right text-xs font-semibold text-nms-text-muted uppercase tracking-wider px-4 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-nms-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-nms-hover rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Server size={40} className="mx-auto text-nms-text-muted mb-3" />
                    <p className="text-sm text-nms-text-muted">{t('devices.noDevices')}</p>
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr
                    key={device._id}
                    className="border-b border-nms-border/30 hover:bg-nms-hover/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/devices/${device._id}`)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-nms-text">{device.name}</p>
                        <p className="text-xs text-nms-text-muted">{device.vendor} {device.model}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-table text-nms-text-secondary">
                      {t(`devices.types.${device.type}`)}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-table text-nms-cyan font-mono">{device.managementIp}</code>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={device.state?.status || 'unknown'} />
                    </td>
                    <td className="px-4 py-3 text-table text-nms-text-secondary">
                      {device.state?.latencyMs !== null ? `${device.state.latencyMs} ms` : '--'}
                    </td>
                    <td className="px-4 py-3 text-table text-nms-text-secondary">
                      {device.state?.packetLossPct !== undefined ? `${device.state.packetLossPct}%` : '--'}
                    </td>
                    <td className="px-4 py-3 text-table text-nms-text-muted">
                      {getRelativeTime(device.state?.lastSeenAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/devices/${device._id}`)} className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted hover:text-nms-brand" title={t('common.view')}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => navigate(`/devices/${device._id}/edit`)} className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted hover:text-nms-amber" title={t('common.edit')}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handlePollDevice(device._id)} className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted hover:text-nms-cyan" title={t('devices.testConnection')}>
                          <Zap size={14} />
                        </button>
                        <button onClick={() => setDeleteModal(device)} className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted hover:text-nms-red" title={t('common.delete')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-nms-border">
            <span className="text-xs text-nms-text-muted">
              {pagination.total} {t('devices.title').toLowerCase()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchDevices(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-nms-text-secondary">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchDevices(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-nms-surface-raised border border-nms-border rounded-xl p-6 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-nms-text mb-2">{t('common.confirm')}</h3>
            <p className="text-sm text-nms-text-secondary mb-6">
              {t('devices.deleteConfirm', { name: deleteModal.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal(null)} className="px-4 py-2 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary hover:text-nms-text">
                {t('common.cancel')}
              </button>
              <button onClick={() => handleDelete(deleteModal)} className="px-4 py-2 rounded-lg bg-nms-red hover:bg-red-600 text-sm text-white">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
