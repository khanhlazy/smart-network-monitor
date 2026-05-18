const NotificationChannel = require('./notificationChannel.model');
const { decryptJson } = require('../../utils/crypto');

const postJson = async (url, payload, headers = {}) => {
  if (typeof fetch !== 'function') {
    return { ok: false, reason: 'fetch_unavailable' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return { ok: response.ok, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
};

const buildAlertPayload = (alert) => ({
  title: alert.titleVi || alert.title,
  titleEn: alert.title,
  severity: alert.severity,
  status: alert.status,
  deviceId: alert.deviceId,
  siteId: alert.siteId,
  metric: alert.metric,
  currentValue: alert.currentValue,
  occurredAt: alert.lastOccurredAt || alert.createdAt || new Date(),
});

const deliverNotification = async (channel, alert) => {
  const channelConfig = decryptJson(channel.configEncrypted);
  const payload = buildAlertPayload(alert);

  if (channel.type === 'webhook') {
    return postJson(channelConfig.url, payload, channelConfig.headers || {});
  }

  if (channel.type === 'telegram') {
    const url = `https://api.telegram.org/bot${channelConfig.botToken}/sendMessage`;
    return postJson(url, {
      chat_id: channelConfig.chatId,
      text: `[${payload.severity?.toUpperCase()}] ${payload.title}\nMetric: ${payload.metric || '-'}\nValue: ${payload.currentValue ?? '-'}`,
      disable_web_page_preview: true,
    });
  }

  if (channel.type === 'slack') {
    return postJson(channelConfig.webhookUrl || channelConfig.url, {
      text: `*${payload.severity?.toUpperCase()}* ${payload.title}`,
      attachments: [{
        color: payload.severity === 'critical' ? '#ef4444' : '#f59e0b',
        fields: [
          { title: 'Metric', value: payload.metric || '-', short: true },
          { title: 'Value', value: String(payload.currentValue ?? '-'), short: true },
        ],
      }],
    });
  }

  console.log('Email notification queued for provider adapter', {
    channel: channel.name,
    to: channelConfig.to,
    alert: payload.title,
  });
  return { ok: true, provider: 'email_adapter_pending' };
};

const dispatchAlertNotifications = async (alert) => {
  try {
    const channels = await NotificationChannel.find({ enabled: true, deletedAt: null }).lean();
    const matched = channels.filter(channel => {
      const severityOk = !channel.severityFilter?.length || channel.severityFilter.includes(alert.severity);
      const siteOk = !channel.siteFilter?.length || channel.siteFilter.includes(alert.siteId);
      return severityOk && siteOk;
    });

    const results = await Promise.allSettled(matched.map(channel => deliverNotification(channel, alert)));
    results
      .filter(result => result.status === 'rejected' || result.value?.ok === false)
      .forEach(result => console.warn('Notification delivery warning:', result.reason || result.value));
  } catch (error) {
    console.error('Notification dispatch failed:', error.message);
  }
};

module.exports = { dispatchAlertNotifications, deliverNotification };
