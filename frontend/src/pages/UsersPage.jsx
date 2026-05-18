import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Users, Plus, Edit2, Trash2, Shield, UserCog, Mail } from 'lucide-react';

const statusColors = {
  active: 'bg-nms-green/10 text-nms-green border-nms-green/20',
  disabled: 'bg-nms-text-muted/10 text-nms-text-muted border-nms-border',
  locked: 'bg-nms-red/10 text-nms-red border-nms-red/20',
};

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    status: 'active',
    roleIds: []
  });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/api/v1/users'),
        api.get('/api/v1/roles')
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async (id) => {
    if (!window.confirm(i18n.language === 'vi' ? 'Bạn có chắc chắn muốn xóa người dùng này?' : 'Delete this user?')) return;
    try {
      await api.delete(`/api/v1/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      console.error(err);
      alert(i18n.language === 'vi' ? 'Lỗi khi xóa người dùng.' : 'Error deleting user.');
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        password: '', // blank password when editing means don't change
        status: user.status || 'active',
        roleIds: user.roleIds?.map(r => r._id) || []
      });
    } else {
      setEditingUser(null);
      setFormData({
        fullName: '',
        username: '',
        email: '',
        password: '',
        status: 'active',
        roleIds: []
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e) => {
    const options = Array.from(e.target.selectedOptions);
    const selectedRoles = options.map(option => option.value);
    setFormData(prev => ({ ...prev, roleIds: selectedRoles }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        // Exclude username and email if they cannot be changed, but backend currently accepts them in patch if implemented. Our backend only uses fullName, status, roleIds, password
        const res = await api.patch(`/api/v1/users/${editingUser._id}`, formData);
        setUsers(users.map(u => u._id === editingUser._id ? { ...u, ...res.data.data, roleIds: roles.filter(r => res.data.data.roleIds.includes(r._id)) } : u));
        fetchUsers(); // Re-fetch to get populated roles correctly
      } else {
        await api.post('/api/v1/users', formData);
        fetchUsers();
      }
      closeModal();
    } catch (err) {
      console.error('Save error', err);
      alert(err.response?.data?.error?.message || (i18n.language === 'vi' ? 'Lỗi khi lưu người dùng.' : 'Error saving user.'));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-nms-text">{t('nav.users')}</h1>
          <p className="text-xs text-nms-text-muted mt-1 flex items-center gap-1.5">
            <UserCog size={12} /> {i18n.language === 'vi' ? 'Quản lý tài khoản hệ thống' : 'System Accounts Management'}
          </p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nms-brand hover:bg-nms-brand/90 text-sm font-semibold text-white shadow-lg shadow-nms-brand/20 transition-all">
          <Plus size={16} />
          {i18n.language === 'vi' ? 'Thêm người dùng' : 'Add User'}
        </button>
      </div>

      <div className="bg-nms-surface border border-nms-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-nms-border bg-nms-surface-raised">
                <th className="px-5 py-3 text-xs font-semibold text-nms-text-muted uppercase tracking-wider">{i18n.language === 'vi' ? 'Họ & Tên' : 'Name'}</th>
                <th className="px-5 py-3 text-xs font-semibold text-nms-text-muted uppercase tracking-wider">{i18n.language === 'vi' ? 'Email / Tên đăng nhập' : 'Email / Username'}</th>
                <th className="px-5 py-3 text-xs font-semibold text-nms-text-muted uppercase tracking-wider">{i18n.language === 'vi' ? 'Vai trò (Roles)' : 'Roles'}</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-nms-text-muted text-sm">
                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                    {i18n.language === 'vi' ? 'Chưa có người dùng nào' : 'No users found'}
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user._id} className="hover:bg-nms-hover/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-nms-brand/20 text-nms-brand flex items-center justify-center font-semibold text-xs border border-nms-brand/30">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-nms-text">{user.fullName}</p>
                          <p className="text-[10px] text-nms-text-muted mt-0.5">
                            {user.lastLoginAt ? (i18n.language === 'vi' ? 'Đăng nhập lần cuối: ' : 'Last login: ') + new Date(user.lastLoginAt).toLocaleString() : 'Chưa đăng nhập'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-nms-text font-mono flex items-center gap-1.5"><Shield size={12} className="text-nms-text-muted" /> {user.username}</span>
                        <span className="text-xs text-nms-text-muted flex items-center gap-1.5"><Mail size={12} className="opacity-70" /> {user.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roleIds && user.roleIds.length > 0 ? user.roleIds.map(role => (
                          <span key={role._id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-nms-bg border border-nms-border text-nms-text-secondary uppercase">
                            {i18n.language === 'vi' ? (role.nameVi || role.name) : role.name}
                          </span>
                        )) : (
                          <span className="text-xs text-nms-text-muted italic">No role</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[user.status] || statusColors.disabled}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(user)} className="p-1.5 rounded-md hover:bg-nms-bg border border-transparent hover:border-nms-border text-nms-text-secondary hover:text-nms-brand transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteUser(user._id)} className="p-1.5 rounded-md hover:bg-nms-red/10 border border-transparent hover:border-nms-red/20 text-nms-text-secondary hover:text-nms-red transition-all">
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
          <div className="bg-nms-surface border border-nms-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-nms-border bg-nms-surface-raised flex items-center justify-between">
              <h2 className="text-lg font-semibold text-nms-text">
                {editingUser 
                  ? (i18n.language === 'vi' ? 'Chỉnh sửa tài khoản' : 'Edit User') 
                  : (i18n.language === 'vi' ? 'Thêm tài khoản mới' : 'Create New User')}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Họ và tên' : 'Full Name'}</label>
                <input required name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
              </div>
              
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Tên đăng nhập (Username)' : 'Username'}</label>
                <input required disabled={!!editingUser} name="username" value={formData.username} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors disabled:opacity-50" />
              </div>

              <div>
                <label className="block text-xs text-nms-text-muted mb-1">Email</label>
                <input required type="email" disabled={!!editingUser} name="email" value={formData.email} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors disabled:opacity-50" />
              </div>

              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Mật khẩu' : 'Password'} {editingUser && <span className="text-[10px] text-nms-text-muted ml-1">(Để trống nếu không muốn đổi)</span>}</label>
                <input type="password" required={!editingUser} name="password" value={formData.password} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Trạng thái' : 'Status'}</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors">
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="locked">Locked</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{i18n.language === 'vi' ? 'Vai trò (Roles)' : 'Roles'}</label>
                <select multiple name="roleIds" value={formData.roleIds} onChange={handleRoleChange} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none transition-colors min-h-[80px]">
                  {roles.map(role => (
                    <option key={role._id} value={role._id}>
                      {i18n.language === 'vi' ? (role.nameVi || role.name) : role.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-nms-text-muted mt-1">{i18n.language === 'vi' ? 'Giữ Ctrl/Cmd để chọn nhiều' : 'Hold Ctrl/Cmd to select multiple'}</p>
              </div>

              <div className="pt-4 mt-2 border-t border-nms-border flex items-center justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg bg-nms-bg border border-nms-border text-sm text-nms-text-secondary hover:text-nms-text transition-colors">
                  {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-nms-brand hover:bg-nms-brand/90 text-sm font-semibold text-white shadow-lg shadow-nms-brand/20 transition-all disabled:opacity-50">
                  {saving ? (i18n.language === 'vi' ? 'Đang lưu...' : 'Saving...') : (i18n.language === 'vi' ? 'Lưu tài khoản' : 'Save User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
