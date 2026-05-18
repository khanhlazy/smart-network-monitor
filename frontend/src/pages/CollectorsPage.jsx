import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Plus, Edit2, Trash2, Radio, Cpu, HardDrive, Clock, Activity, ShieldAlert } from 'lucide-react';

const statusColors = {
  online: 'bg-nms-green text-nms-green',
  offline: 'bg-nms-red text-nms-red',
  degraded: 'bg-nms-amber text-nms-amber',
};

export default function CollectorsPage() {
  const { t, i18n } = useTranslation();
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollector, setEditingCollector] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    siteId: '',
    version: '1.0.0',
    status: 'online'
  });
  const [saving, setSaving] = useState(false);

  const fetchCollectors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/collectors');
      setCollectors(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCollectors();
  }, []);

  const deleteCollector = async (id) => {
    if (!window.confirm(i18n.language === 'vi' ? 'Bạn có chắc chắn muốn xóa collector này?' : 'Delete this collector?')) return;
    try {
      await api.delete(`/api/v1/collectors/${id}`);
      setCollectors(collectors.filter(c => c._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (collector = null) => {
    if (collector) {
      setEditingCollector(collector);
      setFormData({
        name: collector.name,
        siteId: collector.siteId || '',
        version: collector.version || '1.0.0',
        status: collector.status || 'online',
      });
    } else {
      setEditingCollector(null);
      setFormData({
        name: '',
        siteId: '',
        version: '1.0.0',
        status: 'online',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCollector(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCollector) {
        const res = await api.patch(`/api/v1/collectors/${editingCollector._id}`, formData);
        setCollectors(collectors.map(c => c._id === editingCollector._id ? { ...c, ...res.data.data } : c));
      } else {
        const res = await api.post('/api/v1/collectors', formData);
        setCollectors([res.data.data, ...collectors]);
      }
      closeModal();
    } catch (err) {
      console.error('Save error', err);
      alert(i18n.language === 'vi' ? 'Lỗi khi lưu collector.' : 'Error saving collector.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-nms-text">{t('nav.collectors')}</h1>
          <p className="text-xs text-nms-text-muted mt-1 flex items-center gap-1.5">
            <Radio size={12} /> {i18n.language === 'vi' ? 'Quản lý các node thu thập dữ liệu phân tán' : 'Manage distributed data collectors'}
          </p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nms-brand hover:bg-nms-brand/90 text-sm font-semibold text-white shadow-lg shadow-nms-brand/20 transition-all">
          <Plus size={16} />
          {i18n.language === 'vi' ? 'Thêm Collector' : 'Add Collector'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-nms-text-muted text-sm">
            {i18n.language === 'vi' ? 'Đang tải dữ liệu...' : 'Loading...'}
          </div>
        ) : collectors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-nms-text-muted text-sm bg-nms-surface border border-nms-border rounded-xl">
            <Radio size={24} className="mx-auto mb-2 opacity-50 text-nms-text-muted" />
            {i18n.language === 'vi' ? 'Chưa có Collector nào' : 'No collectors configured'}
          </div>
        ) : (
          collectors.map(collector => (
            <div key={collector._id} className="bg-nms-surface border border-nms-border rounded-xl p-5 hover:border-nms-brand/50 transition-colors group flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-nms-bg border border-nms-border`}>
                    <Radio size={20} className="text-nms-cyan" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-nms-text">{collector.name}</h3>
                    <p className="text-[10px] text-nms-text-muted">ID: {collector._id.substring(0, 8)}... | v{collector.version}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(collector)} className="p-1.5 rounded-md hover:bg-nms-bg text-nms-text-secondary hover:text-nms-brand transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => deleteCollector(collector._id)} className="p-1.5 rounded-md hover:bg-nms-red/10 text-nms-text-secondary hover:text-nms-red transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 px-3 py-2 bg-nms-bg rounded-lg border border-nms-border/50">
                <span className="text-xs font-medium text-nms-text-secondary">{i18n.language === 'vi' ? 'Trạng thái:' : 'Status:'}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${statusColors[collector.status] || statusColors.offline} ${collector.status === 'online' ? 'animate-pulse-dot' : ''}`} />
                  <span className="text-xs font-semibold capitalize text-nms-text">{collector.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
                <div className="bg-nms-bg rounded-lg p-2.5 border border-nms-border/50">
                  <p className="text-[10px] text-nms-text-muted flex items-center gap-1 mb-1"><Cpu size={10} /> CPU</p>
                  <p className="text-sm font-semibold text-nms-text">{collector.health?.cpuPct ?? '--'}%</p>
                </div>
                <div className="bg-nms-bg rounded-lg p-2.5 border border-nms-border/50">
                  <p className="text-[10px] text-nms-text-muted flex items-center gap-1 mb-1"><HardDrive size={10} /> Memory</p>
                  <p className="text-sm font-semibold text-nms-text">{collector.health?.memoryPct ?? '--'}%</p>
                </div>
                <div className="bg-nms-bg rounded-lg p-2.5 border border-nms-border/50">
                  <p className="text-[10px] text-nms-text-muted flex items-center gap-1 mb-1"><Clock size={10} /> Queue Lag</p>
                  <p className="text-sm font-semibold text-nms-text">{collector.health?.queueLagMs ?? '--'}ms</p>
                </div>
                <div className="bg-nms-bg rounded-lg p-2.5 border border-nms-border/50">
                  <p className="text-[10px] text-nms-text-muted flex items-center gap-1 mb-1"><Activity size={10} /> Success Rate</p>
                  <p className="text-sm font-semibold text-nms-text">{collector.health?.pollSuccessRate ?? '--'}%</p>
                </div>
              </div>

              <div className="pt-3 border-t border-nms-border flex items-center justify-between text-[10px] text-nms-text-muted">
                <span>{i18n.language === 'vi' ? 'Site ID:' : 'Site ID:'} {collector.siteId || 'N/A'}</span>
                <span>{i18n.language === 'vi' ? 'Thiết bị phụ trách:' : 'Assigned Devices:'} {collector.assignedDeviceCount || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-nms-surface border border-nms-border rounded-xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-nms-border bg-nms-surface-raised flex items-center justify-between">
              <h2 className="text-lg font-semibold text-nms-text">
                {editingCollector 
                  ? (i18n.language === 'vi' ? 'Chỉnh sửa Collector' : 'Edit Collector') 
                  : (i18n.language === 'vi' ? 'Thêm Collector mới' : 'Add New Collector')}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Tên Collector' : 'Collector Name'}</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
              </div>
              
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Site ID (Không bắt buộc)' : 'Site ID (Optional)'}</label>
                <input name="siteId" value={formData.siteId} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Trạng thái' : 'Status'}</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors">
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="degraded">Degraded</option>
                </select>
              </div>

              <div className="pt-4 mt-2 border-t border-nms-border flex items-center justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg bg-nms-bg border border-nms-border text-sm text-nms-text-secondary hover:text-nms-text transition-colors">
                  {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-nms-brand hover:bg-nms-brand/90 text-sm font-semibold text-white shadow-lg shadow-nms-brand/20 transition-all disabled:opacity-50">
                  {saving ? (i18n.language === 'vi' ? 'Đang lưu...' : 'Saving...') : (i18n.language === 'vi' ? 'Lưu' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
