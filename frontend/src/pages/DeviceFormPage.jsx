import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const deviceTypes = ['router', 'switch', 'access_point', 'firewall', 'server', 'ip_camera', 'controller', 'other'];

export default function DeviceFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '', hostname: '', type: 'switch', vendor: '', model: '',
    serialNumber: '', managementIp: '', macAddress: '', siteId: '', collectorId: '',
    location: { building: '', floor: '', room: '' },
    tags: '',
    protocols: { icmp: true, snmpV2c: false, snmpV3: false, ssh: false },
    protocolSettings: {
      snmp: { port: 161, timeoutMs: 5000, retries: 1 },
      ssh: { port: 22, timeoutMs: 10000, profile: 'network_device', allowedCommands: [] },
    },
    protocolCredentials: {
      snmpV2c: { community: '' },
      snmpV3: { username: '', authProtocol: 'sha', authKey: '', privProtocol: 'aes', privKey: '', securityLevel: 'authPriv' },
      ssh: { username: '', password: '', privateKey: '' },
    },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [collectors, setCollectors] = useState([]);

  useEffect(() => {
    api.get('/api/v1/collectors').then(res => setCollectors(res.data.data || [])).catch(console.error);
    if (isEdit) {
      setLoading(true);
      api.get(`/api/v1/devices/${id}`).then((res) => {
        const d = res.data.data;
        setForm({
          name: d.name || '', hostname: d.hostname || '', type: d.type || 'switch',
          vendor: d.vendor || '', model: d.model || '', serialNumber: d.serialNumber || '',
          managementIp: d.managementIp || '', macAddress: d.macAddress || '', siteId: d.siteId || '', collectorId: d.collectorId || '',
          location: d.location || { building: '', floor: '', room: '' },
          tags: (d.tags || []).join(', '),
          protocols: d.protocols || { icmp: true, snmpV2c: false, snmpV3: false, ssh: false },
          protocolSettings: d.protocolSettings || {
            snmp: { port: 161, timeoutMs: 5000, retries: 1 },
            ssh: { port: 22, timeoutMs: 10000, profile: 'network_device', allowedCommands: [] },
          },
          protocolCredentials: {
            snmpV2c: { community: '' },
            snmpV3: { username: '', authProtocol: 'sha', authKey: '', privProtocol: 'aes', privKey: '', securityLevel: 'authPriv' },
            ssh: { username: '', password: '', privateKey: '' },
          },
        });
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        protocolCredentials: {
          snmpV2c: { ...(form.protocolCredentials?.snmpV2c || {}) },
          snmpV3: { ...(form.protocolCredentials?.snmpV3 || {}) },
          ssh: { ...(form.protocolCredentials?.ssh || {}) },
        },
      };
      if (!payload.protocolCredentials.snmpV2c.community) delete payload.protocolCredentials.snmpV2c;
      if (!payload.protocolCredentials.snmpV3.username) delete payload.protocolCredentials.snmpV3;
      if (!payload.protocolCredentials.ssh.username) delete payload.protocolCredentials.ssh;
      if (!payload.collectorId) delete payload.collectorId;

      if (isEdit) {
        await api.patch(`/api/v1/devices/${id}`, payload);
      } else {
        await api.post('/api/v1/devices', payload);
      }
      navigate('/devices');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Lỗi hệ thống.');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateLocation = (field, value) => {
    setForm(prev => ({ ...prev, location: { ...prev.location, [field]: value } }));
  };

  const updateProtocol = (field, value) => {
    setForm(prev => ({ ...prev, protocols: { ...prev.protocols, [field]: value } }));
  };

  const updateProtocolSetting = (group, field, value) => {
    setForm(prev => ({
      ...prev,
      protocolSettings: {
        ...prev.protocolSettings,
        [group]: { ...(prev.protocolSettings?.[group] || {}), [field]: value },
      },
    }));
  };

  const updateCredential = (group, field, value) => {
    setForm(prev => ({
      ...prev,
      protocolCredentials: {
        ...prev.protocolCredentials,
        [group]: { ...(prev.protocolCredentials?.[group] || {}), [field]: value },
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-nms-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/devices')} className="p-2 rounded-lg hover:bg-nms-hover text-nms-text-muted">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-page-title text-nms-text">
          {isEdit ? t('devices.editDevice') : t('devices.addDevice')}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-nms-surface border border-nms-border rounded-xl p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-nms-red/10 border border-nms-red/30 text-sm text-nms-red">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField label={t('devices.deviceName') + ' *'} value={form.name} onChange={(v) => updateForm('name', v)} placeholder="Core-SW-HN-01" required />
          <InputField label={t('devices.hostname')} value={form.hostname} onChange={(v) => updateForm('hostname', v)} placeholder="core-sw-hn-01" />

          <div>
            <label className="block text-sm font-medium text-nms-text-secondary mb-1.5">{t('devices.type')} *</label>
            <select
              value={form.type}
              onChange={(e) => updateForm('type', e.target.value)}
              className="w-full h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text focus:outline-none focus:border-nms-brand"
            >
              {deviceTypes.map(type => (
                <option key={type} value={type}>{t(`devices.types.${type}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-nms-text-secondary mb-1.5">{t('nav.collectors')} (Tùy chọn)</label>
            <select
              value={form.collectorId}
              onChange={(e) => updateForm('collectorId', e.target.value)}
              className="w-full h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text focus:outline-none focus:border-nms-brand"
            >
              <option value="">{t('common.none', 'Không chọn')}</option>
              {collectors.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <InputField label={t('devices.vendor')} value={form.vendor} onChange={(v) => updateForm('vendor', v)} placeholder="Cisco" />
          <InputField label={t('devices.model')} value={form.model} onChange={(v) => updateForm('model', v)} placeholder="Catalyst 9300" />
          <InputField label={t('devices.serialNumber')} value={form.serialNumber} onChange={(v) => updateForm('serialNumber', v)} />
          <InputField label={t('devices.ipAddress') + ' *'} value={form.managementIp} onChange={(v) => updateForm('managementIp', v)} placeholder="10.10.1.2" required />
          <InputField label={t('devices.macAddress')} value={form.macAddress} onChange={(v) => updateForm('macAddress', v)} placeholder="00:1A:2B:3C:4D:5E" />
        </div>

        <div className="border-t border-nms-border pt-5">
          <h3 className="text-sm font-semibold text-nms-text mb-3">{t('devices.location')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Building" value={form.location.building} onChange={(v) => updateLocation('building', v)} placeholder="Tòa A" />
            <InputField label="Floor" value={form.location.floor} onChange={(v) => updateLocation('floor', v)} placeholder="Tầng 1" />
            <InputField label="Room" value={form.location.room} onChange={(v) => updateLocation('room', v)} placeholder="MDF" />
          </div>
        </div>

        <InputField label={t('devices.tags')} value={form.tags} onChange={(v) => updateForm('tags', v)} placeholder="core, production, hanoi" />

        <div className="border-t border-nms-border pt-5 space-y-4">
          <h3 className="text-sm font-semibold text-nms-text">{t('devices.monitoringProtocol')}</h3>
          <div className="flex flex-wrap gap-3">
            {[
              ['icmp', t('devices.icmp')],
              ['snmpV2c', t('devices.snmpV2c')],
              ['snmpV3', t('devices.snmpV3')],
              ['ssh', t('devices.ssh')],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-bg border border-nms-border text-sm text-nms-text-secondary">
                <input
                  type="checkbox"
                  checked={!!form.protocols[key]}
                  onChange={(e) => updateProtocol(key, e.target.checked)}
                  className="accent-nms-brand"
                />
                {label}
              </label>
            ))}
          </div>

          {(form.protocols.snmpV2c || form.protocols.snmpV3) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-nms-bg border border-nms-border">
              <InputField label={t('devices.port')} type="number" value={form.protocolSettings.snmp?.port || 161} onChange={(v) => updateProtocolSetting('snmp', 'port', Number(v))} />
              <InputField label={t('devices.timeout')} type="number" value={form.protocolSettings.snmp?.timeoutMs || 5000} onChange={(v) => updateProtocolSetting('snmp', 'timeoutMs', Number(v))} />
              <InputField label={t('devices.retry')} type="number" value={form.protocolSettings.snmp?.retries || 1} onChange={(v) => updateProtocolSetting('snmp', 'retries', Number(v))} />
              {form.protocols.snmpV2c && (
                <InputField label={t('devices.community')} value={form.protocolCredentials.snmpV2c?.community || ''} onChange={(v) => updateCredential('snmpV2c', 'community', v)} placeholder="public" />
              )}
              {form.protocols.snmpV3 && (
                <>
                  <InputField label={t('devices.username')} value={form.protocolCredentials.snmpV3?.username || ''} onChange={(v) => updateCredential('snmpV3', 'username', v)} />
                  <InputField label={t('devices.authProtocol')} value={form.protocolCredentials.snmpV3?.authProtocol || 'sha'} onChange={(v) => updateCredential('snmpV3', 'authProtocol', v)} />
                  <InputField label={t('devices.authKey')} type="password" value={form.protocolCredentials.snmpV3?.authKey || ''} onChange={(v) => updateCredential('snmpV3', 'authKey', v)} />
                  <InputField label={t('devices.privacyProtocol')} value={form.protocolCredentials.snmpV3?.privProtocol || 'aes'} onChange={(v) => updateCredential('snmpV3', 'privProtocol', v)} />
                  <InputField label={t('devices.privacyKey')} type="password" value={form.protocolCredentials.snmpV3?.privKey || ''} onChange={(v) => updateCredential('snmpV3', 'privKey', v)} />
                </>
              )}
            </div>
          )}

          {form.protocols.ssh && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-nms-bg border border-nms-border">
              <InputField label={t('devices.sshPort')} type="number" value={form.protocolSettings.ssh?.port || 22} onChange={(v) => updateProtocolSetting('ssh', 'port', Number(v))} />
              <InputField label={t('devices.username')} value={form.protocolCredentials.ssh?.username || ''} onChange={(v) => updateCredential('ssh', 'username', v)} />
              <InputField label={t('auth.password')} type="password" value={form.protocolCredentials.ssh?.password || ''} onChange={(v) => updateCredential('ssh', 'password', v)} />
              <InputField label={t('devices.privateKey')} value={form.protocolCredentials.ssh?.privateKey || ''} onChange={(v) => updateCredential('ssh', 'privateKey', v)} />
              <InputField label={t('devices.timeout')} type="number" value={form.protocolSettings.ssh?.timeoutMs || 10000} onChange={(v) => updateProtocolSetting('ssh', 'timeoutMs', Number(v))} />
              <InputField label={t('devices.allowedCommands')} value={(form.protocolSettings.ssh?.allowedCommands || []).join(', ')} onChange={(v) => updateProtocolSetting('ssh', 'allowedCommands', v.split(',').map(item => item.trim()).filter(Boolean))} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-nms-border">
          <button type="button" onClick={() => navigate('/devices')} className="px-4 py-2.5 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary hover:text-nms-text">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-nms-brand hover:bg-blue-600 text-sm font-medium text-white disabled:opacity-50 shadow-lg shadow-nms-brand/20">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? t('common.update') : t('common.create')}
          </button>
        </div>
      </form>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-nms-text-secondary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-10 px-3 bg-nms-bg border border-nms-border rounded-lg text-sm text-nms-text placeholder:text-nms-text-muted focus:outline-none focus:border-nms-brand focus:ring-1 focus:ring-nms-brand/30"
      />
    </div>
  );
}
