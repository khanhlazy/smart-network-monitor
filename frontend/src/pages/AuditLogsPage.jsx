import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ScrollText, Clock, User, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const actionLabels = {
  'auth.login.success': { vi: 'Đăng nhập thành công', en: 'Login success' },
  'auth.login.failure': { vi: 'Đăng nhập thất bại', en: 'Login failure' },
  'auth.logout': { vi: 'Đăng xuất', en: 'Logout' },
  'device.create': { vi: 'Thêm thiết bị', en: 'Create device' },
  'device.update': { vi: 'Cập nhật thiết bị', en: 'Update device' },
  'device.delete': { vi: 'Xóa thiết bị', en: 'Delete device' },
  'alert.acknowledge': { vi: 'Xác nhận cảnh báo', en: 'Acknowledge alert' },
  'alert.resolve': { vi: 'Đánh dấu đã xử lý', en: 'Resolve alert' },
  'alert.suppress': { vi: 'Tạm ẩn cảnh báo', en: 'Suppress alert' },
  'user.create': { vi: 'Thêm người dùng', en: 'Create user' },
};

export default function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 30, total: 0, totalPages: 0 });

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/audit-logs', { params: { page, pageSize: 30 } });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const getActionLabel = (action) => {
    const label = actionLabels[action];
    if (label) return isVi ? label.vi : label.en;
    return action;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-page-title text-nms-text">{t('audit.title')}</h1>

      <div className="bg-nms-surface border border-nms-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full nms-table">
            <thead>
              <tr className="border-b border-nms-border">
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('audit.time')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('audit.actor')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('audit.action')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('audit.resource')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('audit.result')}</th>
                <th className="text-left text-xs font-semibold text-nms-text-muted uppercase px-4 py-3">{t('audit.ipAddress')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-nms-border/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-nms-hover rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <ScrollText size={40} className="mx-auto text-nms-text-muted mb-3" />
                    <p className="text-sm text-nms-text-muted">{t('common.noData')}</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="border-b border-nms-border/30 hover:bg-nms-hover/50 transition-colors">
                    <td className="px-4 py-3 text-table text-nms-text-muted whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {new Date(log.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-table text-nms-text">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-nms-text-muted" />
                        {log.actorName || '--'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-table text-nms-text-secondary">{getActionLabel(log.action)}</td>
                    <td className="px-4 py-3 text-table text-nms-text-muted">{log.resourceType} {log.resourceId ? `(${log.resourceId.slice(-6)})` : ''}</td>
                    <td className="px-4 py-3">
                      {log.result === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-status text-nms-green"><CheckCircle size={12} /> OK</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-status text-nms-red"><XCircle size={12} /> Fail</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-table text-nms-text-muted font-mono">{log.ipAddress || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-nms-border">
            <span className="text-xs text-nms-text-muted">{pagination.total} records</span>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span className="text-xs text-nms-text-secondary">{pagination.page} / {pagination.totalPages}</span>
              <button onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded hover:bg-nms-hover text-nms-text-muted disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
