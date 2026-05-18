import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Bell, Plus, Send, Trash2, CheckCircle, XCircle, Mail, MessageCircle, Globe, Hash } from 'lucide-react';

const typeIcons = {
  email: Mail,
  telegram: MessageCircle,
  webhook: Globe,
  slack: Hash,
};

const typeLabels = {
  email: 'Email (SMTP)',
  telegram: 'Telegram Bot',
  webhook: 'Webhook',
  slack: 'Slack',
};

const initialFormState = {
  name: '',
  type: 'telegram',
  enabled: true,
  // Telegram
  botToken: '',
  chatId: '',
  // Slack
  webhookUrl: '',
  // Webhook
  url: '',
  // Email
  smtpHost: 'smtp.gmail.com',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  from: '',
  to: '',
};

export default function NotificationSettingsPage() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ ...initialFormState });
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState({});

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/notification-channels');
      setChannels(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchChannels(); }, []);

  const buildConfig = () => {
    switch (form.type) {
      case 'telegram':
        return { botToken: form.botToken, chatId: form.chatId };
      case 'slack':
        return { webhookUrl: form.webhookUrl };
      case 'webhook':
        return { url: form.url };
      case 'email':
        return {
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort,
          smtpUser: form.smtpUser,
          smtpPass: form.smtpPass,
          from: form.from || form.smtpUser,
          to: form.to,
        };
      default:
        return {};
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/v1/notification-channels', {
        name: form.name,
        type: form.type,
        enabled: form.enabled,
        config: buildConfig(),
        severityFilter: ['critical', 'high', 'warning'],
      });
      setForm({ ...initialFormState });
      setIsModalOpen(false);
      fetchChannels();
    } catch (err) {
      alert(isVi ? 'Lỗi khi tạo kênh thông báo.' : 'Error creating channel.');
    }
    setSaving(false);
  };

  const handleTest = async (id) => {
    setTestResults((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      await api.post(`/api/v1/notification-channels/${id}/test`);
      setTestResults((prev) => ({ ...prev, [id]: 'success' }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: 'failed' }));
    }
    setTimeout(() => setTestResults((prev) => ({ ...prev, [id]: null })), 4000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(isVi ? 'Bạn có chắc chắn muốn xóa kênh này?' : 'Delete this channel?')) return;
    await api.delete(`/api/v1/notification-channels/${id}`);
    fetchChannels();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const renderConfigFields = () => {
    switch (form.type) {
      case 'telegram':
        return (
          <>
            <div>
              <label className="block text-xs text-nms-text-muted mb-1">Bot Token</label>
              <input name="botToken" value={form.botToken} onChange={handleChange} required placeholder="123456:ABC-DEF..." className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
              <p className="text-[10px] text-nms-text-muted mt-1">{isVi ? 'Lấy từ @BotFather trên Telegram' : 'Get from @BotFather on Telegram'}</p>
            </div>
            <div>
              <label className="block text-xs text-nms-text-muted mb-1">Chat ID</label>
              <input name="chatId" value={form.chatId} onChange={handleChange} required placeholder="-1001234567890" className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
              <p className="text-[10px] text-nms-text-muted mt-1">{isVi ? 'ID nhóm hoặc cá nhân nhận tin nhắn' : 'Group or user chat ID'}</p>
            </div>
          </>
        );
      case 'slack':
        return (
          <div>
            <label className="block text-xs text-nms-text-muted mb-1">Webhook URL</label>
            <input name="webhookUrl" value={form.webhookUrl} onChange={handleChange} required placeholder="https://hooks.slack.com/services/T.../B.../..." className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
            <p className="text-[10px] text-nms-text-muted mt-1">{isVi ? 'Tạo Incoming Webhook trong Slack App' : 'Create an Incoming Webhook in Slack App'}</p>
          </div>
        );
      case 'webhook':
        return (
          <div>
            <label className="block text-xs text-nms-text-muted mb-1">Webhook URL</label>
            <input name="url" value={form.url} onChange={handleChange} required placeholder="https://example.com/webhook" className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
          </div>
        );
      case 'email':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">SMTP Host</label>
                <input name="smtpHost" value={form.smtpHost} onChange={handleChange} required className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
              </div>
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">SMTP Port</label>
                <input name="smtpPort" value={form.smtpPort} onChange={handleChange} required className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{isVi ? 'Tài khoản SMTP' : 'SMTP User'}</label>
                <input name="smtpUser" value={form.smtpUser} onChange={handleChange} required placeholder="user@gmail.com" className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
              </div>
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{isVi ? 'Mật khẩu ứng dụng' : 'App Password'}</label>
                <input name="smtpPass" value={form.smtpPass} onChange={handleChange} required type="password" className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-nms-text-muted mb-1">{isVi ? 'Email nhận cảnh báo' : 'Recipient Email'}</label>
              <input name="to" value={form.to} onChange={handleChange} required placeholder="admin@company.com" className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-nms-text">{t('notifications.title')}</h1>
          <p className="text-xs text-nms-text-muted mt-1">
            {isVi ? 'Cấu hình kênh nhận cảnh báo tự động khi có sự cố mạng' : 'Configure alert notification channels'}
          </p>
        </div>
        <button
          onClick={() => { setForm({ ...initialFormState }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nms-brand hover:bg-nms-brand/90 text-sm font-semibold text-white shadow-lg shadow-nms-brand/20 transition-all"
        >
          <Plus size={16} />
          {isVi ? 'Thêm kênh' : 'Add Channel'}
        </button>
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-nms-text-muted text-sm">
            {isVi ? 'Đang tải...' : 'Loading...'}
          </div>
        ) : channels.length === 0 ? (
          <div className="col-span-full py-12 text-center text-nms-text-muted text-sm bg-nms-surface border border-nms-border rounded-xl">
            <Bell size={24} className="mx-auto mb-2 opacity-50" />
            {isVi ? 'Chưa có kênh thông báo nào. Thêm Telegram Bot hoặc Email để nhận cảnh báo tự động.' : 'No channels configured. Add Telegram or Email to receive auto-alerts.'}
          </div>
        ) : (
          channels.map((channel) => {
            const Icon = typeIcons[channel.type] || Bell;
            const testState = testResults[channel._id];
            return (
              <div key={channel._id} className="bg-nms-surface border border-nms-border rounded-xl p-5 hover:border-nms-brand/40 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-lg bg-nms-bg border border-nms-border flex items-center justify-center">
                      <Icon size={20} className="text-nms-cyan" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-nms-text">{channel.name}</h2>
                      <p className="text-[10px] text-nms-text-muted mt-0.5">
                        {typeLabels[channel.type] || channel.type} • {channel.enabled
                          ? <span className="text-nms-green">{isVi ? 'Đang bật' : 'Enabled'}</span>
                          : <span className="text-nms-red">{isVi ? 'Đã tắt' : 'Disabled'}</span>}
                      </p>
                      {channel.severityFilter?.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {channel.severityFilter.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-nms-bg border border-nms-border text-nms-text-secondary capitalize">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleTest(channel._id)}
                      disabled={testState === 'loading'}
                      className="p-2 rounded-md hover:bg-nms-bg text-nms-text-muted hover:text-nms-brand transition-colors"
                      title={isVi ? 'Gửi thử' : 'Test'}
                    >
                      {testState === 'loading' ? <div className="w-3.5 h-3.5 border-2 border-nms-brand border-t-transparent rounded-full animate-spin" />
                        : testState === 'success' ? <CheckCircle size={14} className="text-nms-green" />
                        : testState === 'failed' ? <XCircle size={14} className="text-nms-red" />
                        : <Send size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(channel._id)}
                      className="p-2 rounded-md hover:bg-nms-red/10 text-nms-text-muted hover:text-nms-red transition-colors"
                      title={isVi ? 'Xóa' : 'Delete'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Channel Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-nms-surface border border-nms-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-nms-border bg-nms-surface-raised">
              <h2 className="text-lg font-semibold text-nms-text">{isVi ? 'Thêm kênh thông báo' : 'Add Notification Channel'}</h2>
              <p className="text-xs text-nms-text-muted mt-0.5">{isVi ? 'Chọn loại kênh và nhập thông tin cấu hình' : 'Select channel type and enter config'}</p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs text-nms-text-muted mb-1">{isVi ? 'Tên kênh' : 'Channel Name'}</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder={isVi ? 'VD: Nhóm IT Support' : 'e.g. IT Support Group'} className="w-full bg-nms-bg border border-nms-border rounded-lg px-3 py-2 text-sm text-nms-text focus:border-nms-brand outline-none" />
              </div>

              <div>
                <label className="block text-xs text-nms-text-muted mb-2">{isVi ? 'Loại kênh' : 'Channel Type'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['telegram', 'slack', 'email', 'webhook'].map((type) => {
                    const Icon = typeIcons[type];
                    const isSelected = form.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, type }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${isSelected
                          ? 'border-nms-brand bg-nms-brand/10 text-nms-brand'
                          : 'border-nms-border bg-nms-bg text-nms-text-secondary hover:border-nms-text-muted'
                        }`}
                      >
                        <Icon size={16} />
                        {typeLabels[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {renderConfigFields()}

              <div className="pt-4 mt-2 border-t border-nms-border flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-nms-bg border border-nms-border text-sm text-nms-text-secondary hover:text-nms-text transition-colors">
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-nms-brand hover:bg-nms-brand/90 text-sm font-semibold text-white shadow-lg shadow-nms-brand/20 transition-all disabled:opacity-50">
                  {saving ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Tạo kênh' : 'Create Channel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
