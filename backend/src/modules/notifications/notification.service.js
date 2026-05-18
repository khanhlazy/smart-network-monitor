const NotificationChannel = require('./notificationChannel.model');
const { decryptJson } = require('../../utils/crypto');

// ─── HTTP Helper ────────────────────────────────────────────
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
  } catch (error) {
    return { ok: false, reason: error.message };
  } finally {
    clearTimeout(timeout);
  }
};

// ─── Build unified payload from alert ───────────────────────
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

const severityEmoji = (severity) => {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'warning': return '🟡';
    case 'info': return '🔵';
    default: return '⚪';
  }
};

const formatTimestamp = (date) => {
  try {
    return new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  } catch {
    return String(date);
  }
};

// ─── Delivery Drivers ───────────────────────────────────────

// Webhook (Generic JSON POST)
const deliverWebhook = async (channelConfig, payload) => {
  return postJson(channelConfig.url, payload, channelConfig.headers || {});
};

// Telegram Bot
const deliverTelegram = async (channelConfig, payload) => {
  const emoji = severityEmoji(payload.severity);
  const text = [
    `${emoji} *[${(payload.severity || 'ALERT').toUpperCase()}] SmartNMS*`,
    ``,
    `📋 *${payload.title}*`,
    `📊 Metric: \`${payload.metric || 'N/A'}\``,
    `📈 Value: \`${payload.currentValue ?? 'N/A'}\``,
    `🖥 Device: \`${payload.deviceId || 'N/A'}\``,
    `🏢 Site: \`${payload.siteId || 'N/A'}\``,
    `⏰ Time: ${formatTimestamp(payload.occurredAt)}`,
  ].join('\n');

  const url = `https://api.telegram.org/bot${channelConfig.botToken}/sendMessage`;
  return postJson(url, {
    chat_id: channelConfig.chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
};

// Slack Incoming Webhook
const deliverSlack = async (channelConfig, payload) => {
  const color = payload.severity === 'critical' ? '#ef4444'
    : payload.severity === 'high' ? '#f97316'
    : payload.severity === 'warning' ? '#eab308'
    : '#3b82f6';

  const webhookUrl = channelConfig.webhookUrl || channelConfig.url;
  return postJson(webhookUrl, {
    text: `${severityEmoji(payload.severity)} *[${(payload.severity || 'ALERT').toUpperCase()}]* ${payload.title}`,
    attachments: [{
      color,
      fields: [
        { title: 'Metric', value: payload.metric || '-', short: true },
        { title: 'Value', value: String(payload.currentValue ?? '-'), short: true },
        { title: 'Device', value: String(payload.deviceId || '-'), short: true },
        { title: 'Site', value: String(payload.siteId || '-'), short: true },
      ],
      footer: 'SmartNMS Alert Engine',
      ts: Math.floor(new Date(payload.occurredAt).getTime() / 1000),
    }],
  });
};

// Email via SMTP (using nodemailer if available)
const deliverEmail = async (channelConfig, payload) => {
  const nodemailer = (() => { try { return require('nodemailer'); } catch { return null; } })();

  if (!nodemailer) {
    console.log('[Notification] Email delivery: nodemailer not installed. Alert details:', {
      to: channelConfig.to,
      title: payload.title,
      severity: payload.severity,
    });
    return { ok: true, provider: 'log_only', reason: 'nodemailer not installed' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: channelConfig.smtpHost || 'smtp.gmail.com',
      port: Number(channelConfig.smtpPort || 587),
      secure: channelConfig.smtpPort === '465' || channelConfig.smtpPort === 465,
      auth: {
        user: channelConfig.smtpUser,
        pass: channelConfig.smtpPass,
      },
    });

    const emoji = severityEmoji(payload.severity);
    const htmlBody = `
      <div style="font-family: 'Segoe UI', sans-serif; padding: 20px; background: #1a1a2e; color: #e0e0e0; border-radius: 8px;">
        <h2 style="color: ${payload.severity === 'critical' ? '#ef4444' : '#f59e0b'};">
          ${emoji} [${(payload.severity || 'ALERT').toUpperCase()}] SmartNMS Alert
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding: 6px 0; color: #a0a0a0;">Alert</td><td style="padding: 6px 0;"><strong>${payload.title}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #a0a0a0;">Metric</td><td style="padding: 6px 0;"><code>${payload.metric || 'N/A'}</code></td></tr>
          <tr><td style="padding: 6px 0; color: #a0a0a0;">Value</td><td style="padding: 6px 0;"><code>${payload.currentValue ?? 'N/A'}</code></td></tr>
          <tr><td style="padding: 6px 0; color: #a0a0a0;">Device</td><td style="padding: 6px 0;">${payload.deviceId || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0; color: #a0a0a0;">Time</td><td style="padding: 6px 0;">${formatTimestamp(payload.occurredAt)}</td></tr>
        </table>
        <p style="margin-top: 16px; font-size: 12px; color: #666;">Sent by SmartNMS Alert Engine</p>
      </div>
    `;

    await transporter.sendMail({
      from: channelConfig.from || channelConfig.smtpUser,
      to: channelConfig.to,
      subject: `${emoji} [${(payload.severity || 'ALERT').toUpperCase()}] ${payload.title} - SmartNMS`,
      html: htmlBody,
    });

    return { ok: true, provider: 'smtp' };
  } catch (error) {
    console.error('[Notification] Email delivery error:', error.message);
    return { ok: false, reason: error.message };
  }
};

// ─── Router: pick the right driver ──────────────────────────
const deliverNotification = async (channel, alert) => {
  const channelConfig = decryptJson(channel.configEncrypted);
  const payload = buildAlertPayload(alert);

  switch (channel.type) {
    case 'webhook':
      return deliverWebhook(channelConfig, payload);
    case 'telegram':
      return deliverTelegram(channelConfig, payload);
    case 'slack':
      return deliverSlack(channelConfig, payload);
    case 'email':
      return deliverEmail(channelConfig, payload);
    default:
      console.warn(`[Notification] Unknown channel type: ${channel.type}`);
      return { ok: false, reason: `Unknown channel type: ${channel.type}` };
  }
};

// ─── Dispatch to all matching channels ──────────────────────
const dispatchAlertNotifications = async (alert) => {
  try {
    const channels = await NotificationChannel.find({ enabled: true, deletedAt: null }).lean();
    const matched = channels.filter(channel => {
      const severityOk = !channel.severityFilter?.length || channel.severityFilter.includes(alert.severity);
      const siteOk = !channel.siteFilter?.length || channel.siteFilter.includes(alert.siteId);
      return severityOk && siteOk;
    });

    if (matched.length === 0) return;

    const results = await Promise.allSettled(matched.map(channel => deliverNotification(channel, alert)));
    results
      .filter(result => result.status === 'rejected' || result.value?.ok === false)
      .forEach(result => console.warn('[Notification] Delivery warning:', result.reason || result.value));

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.ok !== false).length;
    console.log(`[Notification] Dispatched alert "${alert.title}" to ${successCount}/${matched.length} channels.`);
  } catch (error) {
    console.error('[Notification] Dispatch failed:', error.message);
  }
};

module.exports = { dispatchAlertNotifications, deliverNotification };
