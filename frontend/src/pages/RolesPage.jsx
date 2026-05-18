import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Shield, Save } from 'lucide-react';

const permissionGroups = [
  {
    group: 'Thiết bị & Sơ đồ mạng',
    items: [
      { id: 'devices.read', labelVi: 'Xem thiết bị' },
      { id: 'devices.create', labelVi: 'Thêm thiết bị' },
      { id: 'devices.update', labelVi: 'Chỉnh sửa thiết bị' },
      { id: 'devices.delete', labelVi: 'Xóa thiết bị' },
      { id: 'topology.manage', labelVi: 'Quản lý sơ đồ mạng' }
    ]
  },
  {
    group: 'Cảnh báo & Sự cố',
    items: [
      { id: 'alerts.read', labelVi: 'Xem cảnh báo' },
      { id: 'alerts.ack', labelVi: 'Tiếp nhận cảnh báo' },
      { id: 'alerts.resolve', labelVi: 'Xử lý cảnh báo' },
      { id: 'incidents.read', labelVi: 'Xem sự cố' },
      { id: 'incidents.create', labelVi: 'Mở sự cố mới' },
      { id: 'incidents.update', labelVi: 'Cập nhật sự cố' },
      { id: 'maintenance.manage', labelVi: 'Quản lý bảo trì' }
    ]
  },
  {
    group: 'Báo cáo',
    items: [
      { id: 'reports.read', labelVi: 'Xem báo cáo' },
      { id: 'reports.create', labelVi: 'Tạo & Xuất báo cáo' }
    ]
  },
  {
    group: 'Quản trị hệ thống',
    items: [
      { id: 'users.manage', labelVi: 'Quản lý tài khoản' },
      { id: 'roles.manage', labelVi: 'Quản lý phân quyền' },
      { id: 'settings.manage', labelVi: 'Cài đặt hệ thống' },
      { id: 'audit.read', labelVi: 'Xem nhật ký hệ thống' }
    ]
  }
];

export default function RolesPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const selected = roles.find(role => role._id === selectedId);

  const fetchRoles = async () => {
    const res = await api.get('/api/v1/roles');
    setRoles(res.data.data);
    if (!selectedId && res.data.data[0]) setSelectedId(res.data.data[0]._id);
  };

  useEffect(() => { fetchRoles(); }, []);

  const toggle = (permission) => {
    setRoles(prev => prev.map(role => {
      if (role._id !== selectedId) return role;
      const set = new Set(role.permissions || []);
      if (set.has(permission)) set.delete(permission);
      else set.add(permission);
      return { ...role, permissions: Array.from(set) };
    }));
  };

  const save = async () => {
    await api.patch(`/api/v1/roles/${selectedId}`, { permissions: selected.permissions });
    fetchRoles();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-page-title text-nms-text">{t('nav.roles')}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="bg-nms-surface border border-nms-border rounded-lg p-3 space-y-2">
          {roles.map(role => (
            <button key={role._id} onClick={() => setSelectedId(role._id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${selectedId === role._id ? 'bg-nms-brand/15 text-nms-brand' : 'text-nms-text-secondary hover:bg-nms-hover'}`}>
              <Shield size={14} /> {role.nameVi || role.name}
            </button>
          ))}
        </div>
        <div className="bg-nms-surface border border-nms-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-section-title text-nms-text">{selected?.nameVi || selected?.name || t('rbac.permissions')}</h2>
            <button onClick={save} disabled={!selected} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nms-brand text-white text-sm"><Save size={14} />{t('rbac.save')}</button>
          </div>
          <div className="space-y-6">
            {permissionGroups.map((group, index) => (
              <div key={index}>
                <h3 className="text-xs font-semibold text-nms-text-muted uppercase tracking-wider mb-3 px-1">{group.group}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.items.map(permission => (
                    <label key={permission.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${selected?.permissions?.includes(permission.id) ? 'bg-nms-brand/10 border-nms-brand/50' : 'bg-nms-bg border-nms-border hover:border-nms-border/80'}`}>
                      <input type="checkbox" checked={!!selected?.permissions?.includes(permission.id)} onChange={() => toggle(permission.id)} className="w-4 h-4 accent-nms-brand cursor-pointer" />
                      <div>
                        <p className={`text-sm font-medium ${selected?.permissions?.includes(permission.id) ? 'text-nms-text' : 'text-nms-text-secondary'}`}>{permission.labelVi}</p>
                        <p className="text-[10px] font-mono text-nms-text-muted opacity-60 mt-0.5">{permission.id}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
