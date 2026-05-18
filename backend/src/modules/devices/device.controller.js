const Device = require('./device.model');
const DeviceState = require('../monitoring/deviceState.model');
const TelemetrySample = require('../telemetry/telemetrySample.model');
const TopologyLink = require('./topologyLink.model');
const Credential = require('../credentials/credential.model');
const { createAuditLog } = require('../../utils/auditLogger');
const { encryptJson } = require('../../utils/crypto');

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const parseCsv = (csvText) => {
  const lines = String(csvText || '').split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map((line) => {
    const values = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && quoted && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return headers.reduce((row, header, index) => {
      row[header] = values[index]?.trim() || '';
      return row;
    }, {});
  });
};

const normalizeProtocolPayload = (body) => {
  const protocols = body.protocols || {};
  const protocolSettings = body.protocolSettings || {};
  return {
    protocols: {
      icmp: protocols.icmp !== false,
      snmpV2c: !!protocols.snmpV2c,
      snmpV3: !!protocols.snmpV3,
      ssh: !!protocols.ssh,
      restApi: !!protocols.restApi,
    },
    protocolSettings,
  };
};

const createProtocolCredentials = async ({ body, user }) => {
  const refs = [];
  const settingsPatch = {};
  const protocolCredentials = body.protocolCredentials || {};

  if (protocolCredentials.snmpV2c?.community) {
    const credential = await Credential.create({
      name: `${body.name || 'Device'} SNMPv2c`,
      type: 'snmp_v2c',
      encryptedPayload: encryptJson({
        community: protocolCredentials.snmpV2c.community,
        port: Number(body.protocolSettings?.snmp?.port || 161),
        timeout: Number(body.protocolSettings?.snmp?.timeoutMs || 5000),
        retries: Number(body.protocolSettings?.snmp?.retries || 1),
      }),
      createdBy: user._id,
      updatedBy: user._id,
    });
    refs.push(credential._id.toString());
    settingsPatch.snmp = { ...(body.protocolSettings?.snmp || {}), credentialId: credential._id };
  }

  if (protocolCredentials.snmpV3?.username) {
    const credential = await Credential.create({
      name: `${body.name || 'Device'} SNMPv3`,
      type: 'snmp_v3',
      encryptedPayload: encryptJson(protocolCredentials.snmpV3),
      createdBy: user._id,
      updatedBy: user._id,
    });
    refs.push(credential._id.toString());
    settingsPatch.snmp = { ...(body.protocolSettings?.snmp || {}), credentialId: credential._id };
  }

  if (protocolCredentials.ssh?.username) {
    const credential = await Credential.create({
      name: `${body.name || 'Device'} SSH`,
      type: protocolCredentials.ssh.privateKey ? 'ssh_private_key' : 'ssh_password',
      encryptedPayload: encryptJson(protocolCredentials.ssh),
      createdBy: user._id,
      updatedBy: user._id,
    });
    refs.push(credential._id.toString());
    settingsPatch.ssh = { ...(body.protocolSettings?.ssh || {}), credentialId: credential._id };
  }

  return { refs, settingsPatch };
};

exports.list = async (req, res) => {
  try {
    const { page = 1, pageSize = 50, search, status, type, siteId, sort = '-updatedAt' } = req.query;
    const filter = { deletedAt: null };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { hostname: { $regex: search, $options: 'i' } },
        { managementIp: { $regex: search, $options: 'i' } },
      ];
    }
    if (type) filter.type = type;
    if (siteId) filter.siteId = siteId;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const sortObj = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

    const [devices, total] = await Promise.all([
      Device.find(filter).sort(sortObj).skip(skip).limit(parseInt(pageSize)).lean(),
      Device.countDocuments(filter),
    ]);

    // Attach device states
    const deviceIds = devices.map(d => d._id);
    const states = await DeviceState.find({ deviceId: { $in: deviceIds } }).lean();
    const stateMap = {};
    states.forEach(s => { stateMap[s.deviceId.toString()] = s; });

    // Filter by status if needed (must do post-join)
    let enrichedDevices = devices.map(d => ({
      ...d,
      state: stateMap[d._id.toString()] || { status: 'unknown', latencyMs: null, packetLossPct: 0, healthScore: 0 },
    }));

    if (status) {
      enrichedDevices = enrichedDevices.filter(d => d.state.status === status);
    }

    res.json({
      data: enrichedDevices,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('List devices error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, hostname, type, vendor, model, serialNumber, managementIp, macAddress, siteId, collectorId, location, tags } = req.body;

    if (!name || !type || !managementIp) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' }
      });
    }

    // Check duplicate IP
    const existing = await Device.findOne({ managementIp, deletedAt: null });
    if (existing) {
      return res.status(409).json({
        error: { code: 'DEVICE_IP_DUPLICATE', message: 'Địa chỉ IP đã tồn tại.', details: { field: 'managementIp' } }
      });
    }

    const { protocols, protocolSettings } = normalizeProtocolPayload(req.body);
    const credentialResult = await createProtocolCredentials({ body: req.body, user: req.user });
    const mergedProtocolSettings = {
      ...protocolSettings,
      ...credentialResult.settingsPatch,
    };

    const device = await Device.create({
      name, hostname, type, vendor, model, serialNumber, managementIp, macAddress,
      siteId, collectorId, location, tags: tags || [], protocols, protocolSettings: mergedProtocolSettings,
      credentialProfileIds: [...(req.body.credentialProfileIds || []), ...credentialResult.refs],
    });

    // Create initial device state
    await DeviceState.create({
      deviceId: device._id,
      status: 'unknown',
      healthScore: 0,
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'device.create',
      resourceType: 'device',
      resourceId: device._id.toString(),
      changes: { name, managementIp, type, protocols, credentialRefsCreated: credentialResult.refs.length },
      req,
    });

    res.status(201).json({ data: device });
  } catch (error) {
    console.error('Create device error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        error: { code: 'DEVICE_IP_DUPLICATE', message: 'Địa chỉ IP đã tồn tại.' }
      });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.bulkCreate = async (req, res) => {
  try {
    const devices = req.body.devices;
    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ.' } });
    }

    const createdDevices = [];
    const errors = [];

    for (let i = 0; i < devices.length; i++) {
      const d = devices[i];
      try {
        if (!d.name || !d.type || !d.managementIp) {
          throw new Error('Thiếu trường bắt buộc (name, type, managementIp)');
        }

        const existing = await Device.findOne({ managementIp: d.managementIp, deletedAt: null });
        if (existing) {
          throw new Error(`IP ${d.managementIp} đã tồn tại`);
        }

        const device = await Device.create({
          name: d.name, hostname: d.hostname, type: d.type, vendor: d.vendor, model: d.model,
          serialNumber: d.serialNumber, managementIp: d.managementIp, macAddress: d.macAddress,
          siteId: d.siteId, protocols: { icmp: true }
        });

        await DeviceState.create({ deviceId: device._id, status: 'unknown', healthScore: 0 });
        createdDevices.push(device);
      } catch (err) {
        errors.push(`Dòng ${i + 1} (${d.name || 'Unknown'}): ${err.message}`);
      }
    }

    if (createdDevices.length > 0) {
      await createAuditLog({
        actorUserId: req.user._id,
        actorName: req.user.fullName,
        action: 'device.bulk_create',
        resourceType: 'device',
        changes: { count: createdDevices.length },
        req,
      });
    }

    res.status(201).json({
      data: {
        successCount: createdDevices.length,
        errorCount: errors.length,
        errors,
      }
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.getById = async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!device) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy thiết bị.' } });
    }

    const state = await DeviceState.findOne({ deviceId: device._id }).lean();
    res.json({
      data: {
        ...device,
        state: state || { status: 'unknown', latencyMs: null, packetLossPct: 0, healthScore: 0 },
      },
    });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.update = async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, deletedAt: null });
    if (!device) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy thiết bị.' } });
    }

    const before = device.toObject();
    const allowedFields = ['name', 'hostname', 'type', 'vendor', 'model', 'serialNumber', 'managementIp', 'macAddress', 'siteId', 'collectorId', 'location', 'tags', 'lifecycle', 'protocols', 'protocolSettings', 'credentialProfileIds'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.body.protocolCredentials) {
      const credentialResult = await createProtocolCredentials({ body: { ...before, ...req.body }, user: req.user });
      if (credentialResult.refs.length > 0) {
        updates.credentialProfileIds = [
          ...(device.credentialProfileIds || []).map(id => id.toString()),
          ...credentialResult.refs,
        ];
      }
      if (Object.keys(credentialResult.settingsPatch).length > 0) {
        updates.protocolSettings = {
          ...(device.protocolSettings?.toObject ? device.protocolSettings.toObject() : device.protocolSettings || {}),
          ...(updates.protocolSettings || {}),
          ...credentialResult.settingsPatch,
        };
      }
    }

    const updated = await Device.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'device.update',
      resourceType: 'device',
      resourceId: device._id.toString(),
      changes: updates,
      req,
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.remove = async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, deletedAt: null });
    if (!device) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy thiết bị.' } });
    }

    // Soft delete
    device.deletedAt = new Date();
    device.lifecycle = 'deleted';
    await device.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'device.delete',
      resourceType: 'device',
      resourceId: device._id.toString(),
      changes: { name: device.name },
      req,
    });

    res.json({ data: { message: 'Đã xóa thiết bị.' } });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.pollDevice = async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, deletedAt: null });
    if (!device) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy thiết bị.' } });
    }

    // Trigger immediate poll via worker
    const ping = require('ping');
    const result = await ping.promise.probe(device.managementIp, { timeout: 5 });

    const state = await DeviceState.findOneAndUpdate(
      { deviceId: device._id },
      {
        $set: {
          status: result.alive ? 'online' : 'offline',
          latencyMs: result.alive ? parseFloat(result.time) : null,
          lastSeenAt: result.alive ? new Date() : undefined,
          lastTelemetryAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    res.json({ data: { alive: result.alive, latencyMs: result.time, state } });
  } catch (error) {
    console.error('Poll device error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi kiểm tra kết nối.' } });
  }
};

exports.getTelemetry = async (req, res) => {
  try {
    const { metric = 'latency_ms', hours = 24 } = req.query;
    const since = new Date(Date.now() - parseInt(hours) * 3600000);

    const samples = await TelemetrySample.find({
      deviceId: req.params.id,
      metric,
      sampledAt: { $gte: since },
    }).sort({ sampledAt: 1 }).limit(500).lean();

    res.json({ data: samples });
  } catch (error) {
    console.error('Get telemetry error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.importDevices = async (req, res) => {
  try {
    const dryRun = req.body.dryRun === true || req.query.dryRun === 'true';
    const rows = Array.isArray(req.body.rows)
      ? req.body.rows
      : Array.isArray(req.body.devices)
        ? req.body.devices
        : parseCsv(req.body.csv || '');

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Không có dữ liệu CSV để nhập.' } });
    }

    const errors = [];
    const validRows = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const normalized = {
        name: row.deviceName || row.name,
        hostname: row.hostname,
        type: row.type || 'other',
        vendor: row.vendor,
        model: row.model,
        managementIp: row.mgmtIp || row.managementIp,
        siteId: row.siteId,
        location: row.location ? { room: row.location } : undefined,
        tags: typeof row.tags === 'string' ? row.tags.split(/[;,]/).map(t => t.trim()).filter(Boolean) : (row.tags || []),
        protocols: typeof row.protocols === 'string'
          ? {
              icmp: row.protocols.includes('icmp') || row.protocols.trim() === '',
              snmpV2c: row.protocols.includes('snmpV2c') || row.protocols.includes('snmpv2c'),
              snmpV3: row.protocols.includes('snmpV3') || row.protocols.includes('snmpv3'),
              ssh: row.protocols.includes('ssh'),
            }
          : (row.protocols || { icmp: true }),
      };

      if (!normalized.name || !normalized.managementIp) {
        errors.push({ row: index + 1, message: 'Thiếu tên thiết bị hoặc IP quản trị.' });
        continue;
      }

      const duplicate = await Device.findOne({ managementIp: normalized.managementIp, deletedAt: null });
      if (duplicate) {
        errors.push({ row: index + 1, message: `IP ${normalized.managementIp} đã tồn tại.` });
        continue;
      }

      validRows.push(normalized);
    }

    if (dryRun) {
      return res.json({ data: { dryRun: true, validCount: validRows.length, errorCount: errors.length, errors } });
    }

    const created = [];
    for (const row of validRows) {
      const device = await Device.create(row);
      await DeviceState.create({ deviceId: device._id, status: 'unknown', healthScore: 0 });
      created.push(device);
    }

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'device.import',
      resourceType: 'device',
      changes: { successCount: created.length, errorCount: errors.length },
      req,
    });

    res.status(201).json({ data: { successCount: created.length, errorCount: errors.length, errors } });
  } catch (error) {
    console.error('Import devices error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi nhập CSV.' } });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const devices = await Device.find({ deletedAt: null }).sort({ name: 1 }).lean();
    const headers = ['deviceName', 'hostname', 'type', 'vendor', 'model', 'mgmtIp', 'siteId', 'location', 'tags', 'protocols'];
    const lines = [headers.join(',')];

    devices.forEach((device) => {
      const protocols = Object.entries(device.protocols || {})
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join(';');
      lines.push([
        device.name,
        device.hostname,
        device.type,
        device.vendor,
        device.model,
        device.managementIp,
        device.siteId,
        [device.location?.building, device.location?.floor, device.location?.room].filter(Boolean).join(' '),
        (device.tags || []).join(';'),
        protocols,
      ].map(csvEscape).join(','));
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'device.export',
      resourceType: 'device',
      changes: { count: devices.length, format: 'csv' },
      req,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="smartnms_devices.csv"');
    res.send(`\uFEFF${lines.join('\n')}`);
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi xuất CSV.' } });
  }
};

exports.getTopology = async (req, res) => {
  try {
    const devices = await Device.find({ deletedAt: null }).lean();
    const deviceIds = devices.map(d => d._id);
    
    const states = await DeviceState.find({ deviceId: { $in: deviceIds } }).lean();
    const stateMap = {};
    states.forEach(s => { stateMap[s.deviceId.toString()] = s; });

    const nodes = devices.map(d => ({
      id: d._id.toString(),
      data: {
        label: d.name,
        type: d.type,
        ip: d.managementIp,
        status: stateMap[d._id.toString()]?.status || 'unknown'
      },
      position: { x: Math.random() * 800, y: Math.random() * 600 }
    }));

    const links = await TopologyLink.find({ deletedAt: null }).lean();
    const edges = links.map(l => ({
      id: l._id.toString(),
      source: (l.sourceDeviceId || l.sourceId).toString(),
      target: (l.targetDeviceId || l.targetId).toString(),
      label: l.label,
      type: l.linkType || l.type,
      animated: l.animated
    }));

    res.json({ data: { nodes, edges } });
  } catch (error) {
    console.error('Get topology error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.saveTopology = async (req, res) => {
  try {
    const { edges } = req.body;
    
    await TopologyLink.updateMany({ deletedAt: null }, { $set: { deletedAt: new Date() } });
    
    if (edges && edges.length > 0) {
      const links = edges.map(e => ({
        sourceId: e.source,
        targetId: e.target,
        sourceDeviceId: e.source,
        targetDeviceId: e.target,
        label: e.label,
        linkType: e.type || 'default',
        type: e.type || 'default',
        deletedAt: null,
      }));
      await TopologyLink.insertMany(links);
    }
    
    res.json({ data: { message: 'Đã lưu cấu hình mạng.' } });
  } catch (error) {
    console.error('Save topology error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};
