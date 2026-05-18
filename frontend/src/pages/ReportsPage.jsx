import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FileBarChart, Download, Plus, RefreshCw } from 'lucide-react';

const reportTypes = ['uptime', 'device_offline', 'alert', 'incident', 'sla', 'traffic', 'collector_health'];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ type: 'uptime', format: 'pdf' });

  const fetchReports = async () => {
    const res = await api.get('/api/v1/reports');
    setReports(res.data.data);
  };

  useEffect(() => { fetchReports(); }, []);

  const generate = async (e) => {
    e.preventDefault();
    await api.post('/api/v1/reports/generate', form);
    fetchReports();
  };

  const download = (report) => {
    api.get(`/api/v1/reports/${report._id}/download`, { responseType: 'blob' }).then((res) => {
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smartnms-${report.type}.${report.format === 'excel' ? 'xls' : report.format}`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-nms-text">{t('reports.title')}</h1>
        <button onClick={fetchReports} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary">
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>
      <form onSubmit={generate} className="flex flex-wrap gap-3 bg-nms-surface border border-nms-border rounded-lg p-4">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text">
          {reportTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text">
          <option value="pdf">PDF</option>
          <option value="excel">Excel</option>
          <option value="csv">CSV</option>
        </select>
        <button className="flex items-center gap-2 px-4 h-10 rounded-lg bg-nms-brand text-white text-sm">
          <Plus size={14} /> {t('reports.generate')}
        </button>
      </form>
      <div className="bg-nms-surface border border-nms-border rounded-lg overflow-hidden">
        <table className="w-full nms-table">
          <thead>
            <tr className="border-b border-nms-border">
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('reports.type')}</th>
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('reports.format')}</th>
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('common.status')}</th>
              <th className="text-right text-xs text-nms-text-muted uppercase px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report._id} className="border-b border-nms-border/30">
                <td className="px-4 py-3 text-sm text-nms-text"><FileBarChart size={14} className="inline mr-2 text-nms-brand" />{report.type}</td>
                <td className="px-4 py-3 text-sm text-nms-text-secondary">{report.format}</td>
                <td className="px-4 py-3 text-sm text-nms-text-secondary">{t(`reports.${report.status}`, report.status)}</td>
                <td className="px-4 py-3 text-right">
                  {report.status === 'completed' && <button onClick={() => download(report)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-nms-brand/10 text-nms-brand text-xs"><Download size={12} />{t('common.download')}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
