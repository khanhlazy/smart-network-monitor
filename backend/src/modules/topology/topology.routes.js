const express = require('express');
const router = express.Router();
const Device = require('../devices/device.model');
const DeviceState = require('../monitoring/deviceState.model');
const TopologyLink = require('../devices/topologyLink.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { createAuditLog } = require('../../utils/auditLogger');

router.use(authenticate);

const emitTopologyUpdated = (req, link) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('topology:updated', {
      event: 'topology:updated',
      data: link ? { linkId: link._id, updatedAt: new Date() } : { updatedAt: new Date() },
    });
  }
};

router.get('/', authorize('topology:read', 'topology.manage', 'device:read', '*'), async (req, res) => {
  try {
    const { siteId, type, collectorId } = req.query;
    const deviceFilter = { deletedAt: null };
    if (siteId) deviceFilter.siteId = siteId;
    if (type) deviceFilter.type = type;
    if (collectorId) deviceFilter.collectorId = collectorId;

    const devices = await Device.find(deviceFilter).lean();
    const deviceIds = devices.map(device => device._id);
    const states = await DeviceState.find({ deviceId: { $in: deviceIds } }).lean();
    const stateMap = new Map(states.map(state => [state.deviceId.toString(), state]));

    const links = await TopologyLink.find({
      deletedAt: null,
      $or: [
        { sourceDeviceId: { $in: deviceIds } },
        { targetDeviceId: { $in: deviceIds } },
        { sourceId: { $in: deviceIds } },
        { targetId: { $in: deviceIds } },
      ],
    }).lean();

    const nodes = devices.map((device, index) => {
      // Use saved coordinates if they exist and are not 0,0, otherwise default to 0,0 for auto-layout on frontend
      const x = device.coordinates?.x || 0;
      const y = device.coordinates?.y || 0;
      return {
        id: device._id.toString(),
        type: 'device',
        data: {
          label: device.name,
          type: device.type,
          ip: device.managementIp,
          siteId: device.siteId,
          status: stateMap.get(device._id.toString())?.status || 'unknown',
        },
        position: { x, y },
      };
    });

    const edges = links.map(link => ({
      id: link._id.toString(),
      source: (link.sourceDeviceId || link.sourceId).toString(),
      target: (link.targetDeviceId || link.targetId).toString(),
      label: link.label || link.sourceInterface || link.targetInterface || '',
      type: link.linkType || link.type || 'default',
      status: link.status,
      bandwidthMbps: link.bandwidthMbps,
      animated: link.status !== 'down',
    }));

    res.json({ data: { nodes, edges } });
  } catch (error) {
    console.error('Topology get error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/positions', authorize('topology:manage', 'topology.manage', '*'), async (req, res) => {
  try {
    const { nodes } = req.body; // Array of { id, position: { x, y } }
    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Yêu cầu danh sách nodes.' } });
    }

    const bulkOps = nodes.map(node => ({
      updateOne: {
        filter: { _id: node.id },
        update: { $set: { 'coordinates.x': node.position.x, 'coordinates.y': node.position.y } }
      }
    }));

    if (bulkOps.length > 0) {
      await Device.bulkWrite(bulkOps);
    }

    emitTopologyUpdated(req);
    res.json({ data: { message: 'Đã lưu tọa độ sơ đồ.' } });
  } catch (error) {
    console.error('Save positions error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/links', authorize('topology:manage', 'topology.manage', '*'), async (req, res) => {
  try {
    const {
      sourceDeviceId,
      targetDeviceId,
      sourceInterface,
      targetInterface,
      linkType = 'default',
      bandwidthMbps,
      status = 'unknown',
      siteId,
    } = req.body;

    if (!sourceDeviceId || !targetDeviceId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Vui lòng chọn thiết bị nguồn và đích.' } });
    }

    const link = await TopologyLink.create({
      sourceId: sourceDeviceId,
      targetId: targetDeviceId,
      sourceDeviceId,
      targetDeviceId,
      sourceInterface,
      targetInterface,
      linkType,
      type: linkType,
      bandwidthMbps,
      status,
      siteId,
      label: sourceInterface && targetInterface ? `${sourceInterface} ↔ ${targetInterface}` : undefined,
      deletedAt: null,
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'topology.link.create',
      resourceType: 'topology_link',
      resourceId: link._id.toString(),
      changes: { sourceDeviceId, targetDeviceId, linkType },
      req,
    });

    emitTopologyUpdated(req, link);
    res.status(201).json({ data: link });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: { code: 'DUPLICATE_LINK', message: 'Liên kết topology đã tồn tại.' } });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/links/:id', authorize('topology:manage', 'topology.manage', '*'), async (req, res) => {
  try {
    const link = await TopologyLink.findOne({ _id: req.params.id, deletedAt: null });
    if (!link) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy liên kết topology.' } });

    const allowed = ['sourceInterface', 'targetInterface', 'linkType', 'bandwidthMbps', 'status', 'siteId', 'label'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) link[field] = req.body[field];
    });
    if (req.body.linkType) link.type = req.body.linkType;
    await link.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'topology.link.update',
      resourceType: 'topology_link',
      resourceId: link._id.toString(),
      changes: req.body,
      req,
    });

    emitTopologyUpdated(req, link);
    res.json({ data: link });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.delete('/links/:id', authorize('topology:manage', 'topology.manage', '*'), async (req, res) => {
  try {
    const link = await TopologyLink.findOne({ _id: req.params.id, deletedAt: null });
    if (!link) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy liên kết topology.' } });

    link.deletedAt = new Date();
    await link.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'topology.link.delete',
      resourceType: 'topology_link',
      resourceId: link._id.toString(),
      changes: { sourceDeviceId: link.sourceDeviceId, targetDeviceId: link.targetDeviceId },
      req,
    });

    emitTopologyUpdated(req, link);
    res.json({ data: { message: 'Đã xóa liên kết topology.' } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
