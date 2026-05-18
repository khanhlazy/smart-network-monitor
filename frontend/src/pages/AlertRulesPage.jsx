import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Plus, Edit2, Trash2, Power, AlertTriangle, ShieldAlert } from 'lucide-react';

const severityColors = {
  info: 'bg-nms-brand/20 text-nms-brand',
  warning: 'bg-nms-amber/20 text-nms-amber',
  high: 'bg-nms-red/20 text-nms-red',
  critical: 'bg-nms-critical/20 text-nms-critical',
};

const opMap = {
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  eq: '=',
  neq: '!=',
};

export default function AlertRulesPage() {
  const { t, i18n } = useTranslation();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nameVi: '',
    metric: 'latency_ms',
    operator: 'gt',
    threshold: 0,
    durationSeconds: 0,
    consecutiveViolations: 1,
    severity: 'warning',
    enabled: true
  });
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/alert-rules');
      setRules(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleStatus = async (rule) => {
    try {
      await api.patch(`/api/v1/alert-rules/${rule._id}`, { enabled: !rule.enabled });
      setRules(rules.map(r => r._id === rule._id ? { ...r, enabled: !r.enabled } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRule = async (id) => {
    if (!window.confirm(i18n.language === 'vi' ? 'Bạn có chắc chắn muốn xóa quy tắc này không?' : 'Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/api/v1/alert-rules/${id}`);
      setRules(rules.filter(r => r._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        nameVi: rule.nameVi || '',
        metric: rule.metric,
        operator: rule.operator,
        threshold: rule.threshold,
        durationSeconds: rule.durationSeconds || 0,
        consecutiveViolations: rule.consecutiveViolations || 1,
        severity: rule.severity,
        enabled: rule.enabled
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        nameVi: '',
        metric: 'latency_ms',
        operator: 'gt',
        threshold: 0,
        durationSeconds: 0,
        consecutiveViolations: 1,
        severity: 'warning',
        enabled: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    if (['threshold', 'durationSeconds', 'consecutiveViolations'].includes(name)) {
      finalValue = Number(value);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRule) {
        const res = await api.patch(`/api/v1/alert-rules/${editingRule._id}`, formData);
        setRules(rules.map(r => r._id === editingRule._id ? res.data.data : r));
      } else {
        const res = await api.post('/api/v1/alert-rules', formData);
        setRules([res.data.data, ...rules]);
      }
      closeModal();
    } catch (err) {
      console.error('Save error', err);
      alert(i18n.language === 'vi' ? 'Lỗi khi lưu quy tắc.' : 'Error saving rule.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-nms-text">{t('nav.alertRules')}</h1>
          <p className="text-xs text-nms-text-muted mt-1 flex items-center gap-1.5">
            <ShieldAlert size={12} /> {i18n.language === 'vi' ? 'Quản lý các ngưỡng cảnh báo của hệ thống' : 'Manage system alert thresholds'}
          </p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nms-brand hover:bg-nms-brand/90 text-sm font-semibold text-white shadow-lg shadow-nms-brand/20 transition-all">
          <Plus size={16} />
          {i18n.language === 'vi' ? 'Thêm quy tắc' : 'Create Rule'}
        </button>
      </div>

      <div className="bg-nms-surface border border-nms-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-nms-border bg-nms-surface-raised">
                <th className="px-5 py-3 text-xs font-semibold text-nms-text-muted uppercase tracking-wider">{i18n.language === 'vi' ? 'Tên quy tắc' : 'Rule Name'}</th>
                <th className="px-5 py-3 text-xs font-semibold text-nms-text-muted uppercase tracking-wider">{i18n.language === 'vi' ? 'Điều kiện' : 'Condition'}</th>
                <th className="px-5 py-3 text-xs font-semibold text-nms-text-muted uppercase tracking-wider">{i18n.language === 'vi' ? 'Mức độ' : 'Severity'}</th>
                <th className="px-5 py-3 text-xs font-semibold text-nms-text-muted uppercase tracking-wider">{i18n.language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th className="px-5 py-3 text-xs font-semibold text-nms-text-muted uppercase tracking-wider text-right">{i18n.language === 'vi' ? 'Hành động' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nms-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-nms-text-muted text-sm">
                    {i18n.language === 'vi' ? 'Đang tải dữ liệu...' : 'Loading...'}
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-nms-text-muted text-sm">
                    <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
                    {i18n.language === 'vi' ? 'Chưa có quy tắc cảnh báo nào' : 'No alert rules configured'}
                  </td>
                </tr>
              ) : (
                rules.map(rule => (
                  <tr key={rule._id} className="hover:bg-nms-hover/50 transition-colors group">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-nms-text">{i18n.language === 'vi' && rule.nameVi ? rule.nameVi : rule.name}</p>
                      <p className="text-[10px] text-nms-text-muted mt-0.5">{i18n.language === 'vi' ? 'Vi phạm liên tiếp: ' : 'Consecutive violations: '}{rule.consecutiveViolations}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-nms-bg border border-nms-border/50 text-xs text-nms-text font-mono">
                        <span className="text-nms-cyan">{rule.metric}</span>
                        <span className="text-nms-text-muted">{opMap[rule.operator] || rule.operator}</span>
                        <span className="text-nms-amber">{rule.threshold}</span>
                      </div>
                      {rule.durationSeconds > 0 && (
                        <p className="text-[10px] text-nms-text-muted mt-1">
                          {i18n.language === 'vi' ? `Kéo dài trong ${rule.durationSeconds}s` : `Lasting for ${rule.durationSeconds}s`}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${severityColors[rule.severity] || severityColors.info}`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button 
                        onClick={() => toggleStatus(rule)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${rule.enabled ? 'bg-nms-green/10 text-nms-green border border-nms-green/20' : 'bg-nms-surface-raised text-nms-text-muted border border-nms-border'}`}
                      >
                        <Power size={12} />
                        {rule.enabled ? (i18n.language === 'vi' ? 'Bật' : 'Enabled') : (i18n.language === 'vi' ? 'Tắt' : 'Disabled')}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(rule)} className="p-1.5 rounded-md hover:bg-nms-bg border border-transparent hover:border-nms-border text-nms-text-secondary hover:text-nms-brand transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteRule(rule._id)} className="p-1.5 rounded-md hover:bg-nms-red/10 border border-transparent hover:border-nms-red/20 text-nms-text-secondary hover:text-nms-red transition-all">
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-nms-surface border border-nms-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-nms-border bg-nms-surface-raised flex items-center justify-between">
              <h2 className="text-lg font-semibold text-nms-text">
                {editingRule 
                  ? (i18n.language === 'vi' ? 'Chỉnh sửa quy tắc' : 'Edit Rule') 
                  : (i18n.language === 'vi' ? 'Thêm quy tắc mới' : 'Create New Rule')}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Tên quy tắc (EN)' : 'Rule Name (EN)'}</label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Tên quy tắc (VI)' : 'Rule Name (VI)'}</label>
                  <input name="nameVi" value={formData.nameVi} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Chỉ số (Metric)' : 'Metric'}</label>
                  <select name="metric" value={formData.metric} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors">
                    <option value="latency_ms">Latency (ms)</option>
                    <option value="packet_loss_pct">Packet Loss (%)</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Toán tử' : 'Operator'}</label>
                  <select name="operator" value={formData.operator} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors">
                    <option value="gt">&gt; (Lớn hơn)</option>
                    <option value="lt">&lt; (Nhỏ hơn)</option>
                    <option value="gte">&gt;= (Lớn hơn hoặc bằng)</option>
                    <option value="lte">&lt;= (Nhỏ hơn hoặc bằng)</option>
                    <option value="eq">= (Bằng)</option>
                    <option value="neq">!= (Khác)</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Ngưỡng' : 'Threshold'}</label>
                  <input type="number" name="threshold" value={formData.threshold} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Mức độ' : 'Severity'}</label>
                  <select name="severity" value={formData.severity} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors">
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Kéo dài trong (giây)' : 'Duration (seconds)'}</label>
                  <input type="number" min="0" name="durationSeconds" value={formData.durationSeconds} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Vi phạm liên tiếp (lần)' : 'Consecutive Violations'}</label>
                  <input type="number" min="1" name="consecutiveViolations" value={formData.consecutiveViolations} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
                </div>
                
                <div className="col-span-2 flex items-center gap-2 mt-2">
                  <input type="checkbox" id="enabled" name="enabled" checked={formData.enabled} onChange={handleChange} className="w-4 h-4 accent-nms-brand" />
                  <label htmlFor="enabled" className="text-sm text-nms-text">{i18n.language === 'vi' ? 'Kích hoạt ngay' : 'Enable immediately'}</label>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-nms-border flex items-center justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg bg-nms-bg border border-nms-border text-sm text-nms-text-secondary hover:text-nms-text transition-colors">
                  {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-nms-brand hover:bg-nms-brand/90 text-sm font-semibold text-white shadow-lg shadow-nms-brand/20 transition-all disabled:opacity-50">
                  {saving ? (i18n.language === 'vi' ? 'Đang lưu...' : 'Saving...') : (i18n.language === 'vi' ? 'Lưu quy tắc' : 'Save Rule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
