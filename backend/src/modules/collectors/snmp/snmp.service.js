const { OIDS } = require('../../monitoring/snmp/snmpOids');

const optionalRequire = (name) => {
  try {
    return require(name);
  } catch (error) {
    return null;
  }
};

const parseNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// ─── Low-level SNMP helpers ────────────────────────────────
const getWithSession = (session, oids) => new Promise((resolve, reject) => {
  session.get(oids, (error, varbinds) => {
    if (error) return reject(error);
    resolve(varbinds || []);
  });
});

const subtreeWalk = (session, oid) => new Promise((resolve) => {
  const results = [];
  session.subtree(
    oid,
    (varbinds) => {
      varbinds.forEach((vb) => {
        if (vb && !session.constructor?.isVarbindError?.(vb)) {
          results.push(vb);
        }
      });
    },
    (error) => resolve(results),
  );
});

// ─── CPU collection via hrProcessorLoad walk ───────────────
const collectCpuMetrics = async (session) => {
  const snmp = optionalRequire('net-snmp');
  if (!snmp) return [];

  try {
    const varbinds = await subtreeWalk(session, OIDS.hrProcessorLoad);
    if (!varbinds.length) return [];
    const loads = varbinds.map((vb) => parseNumber(vb.value)).filter((v) => v !== null);
    if (!loads.length) return [];
    const avgCpu = Math.round((loads.reduce((a, b) => a + b, 0) / loads.length) * 100) / 100;
    return [{ metric: 'cpu_pct', value: avgCpu, unit: '%' }];
  } catch {
    return [];
  }
};

// ─── Memory collection via hrStorageTable or UCD-SNMP-MIB ──
const collectMemoryMetrics = async (session) => {
  try {
    // Strategy 1: Try UCD-SNMP-MIB (Linux/net-snmp devices, most common)
    const ucdVarbinds = await getWithSession(session, [OIDS.memTotalReal, OIDS.memAvailReal]);
    let totalKB = null;
    let availKB = null;
    ucdVarbinds.forEach((vb) => {
      if (vb && vb.oid === OIDS.memTotalReal) totalKB = parseNumber(vb.value);
      if (vb && vb.oid === OIDS.memAvailReal) availKB = parseNumber(vb.value);
    });
    if (totalKB > 0 && availKB !== null) {
      const usedKB = totalKB - availKB;
      const memPct = Math.round((usedKB / totalKB) * 10000) / 100;
      return [
        { metric: 'memory_pct', value: memPct, unit: '%' },
        { metric: 'memory_total_mb', value: Math.round(totalKB / 1024), unit: 'MB' },
        { metric: 'memory_used_mb', value: Math.round(usedKB / 1024), unit: 'MB' },
      ];
    }
  } catch { /* fallback below */ }

  try {
    // Strategy 2: hrStorageTable walk – look for Physical RAM entries
    const descrVarbinds = await subtreeWalk(session, OIDS.hrStorageDescr);
    const sizeVarbinds = await subtreeWalk(session, OIDS.hrStorageSize);
    const usedVarbinds = await subtreeWalk(session, OIDS.hrStorageUsed);
    const allocVarbinds = await subtreeWalk(session, OIDS.hrStorageAllocationUnits);

    const entries = {};
    const extractIndex = (oid) => oid.split('.').pop();

    descrVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      const label = String(vb.value).toLowerCase();
      if (label.includes('ram') || label.includes('physical') || label.includes('real')) {
        entries[idx] = { descr: String(vb.value) };
      }
    });
    allocVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      if (entries[idx]) entries[idx].allocUnits = parseNumber(vb.value) || 1;
    });
    sizeVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      if (entries[idx]) entries[idx].size = parseNumber(vb.value);
    });
    usedVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      if (entries[idx]) entries[idx].used = parseNumber(vb.value);
    });

    for (const entry of Object.values(entries)) {
      const alloc = entry.allocUnits || 1;
      const totalBytes = (entry.size || 0) * alloc;
      const usedBytes = (entry.used || 0) * alloc;
      if (totalBytes > 0) {
        const memPct = Math.round((usedBytes / totalBytes) * 10000) / 100;
        return [
          { metric: 'memory_pct', value: memPct, unit: '%' },
          { metric: 'memory_total_mb', value: Math.round(totalBytes / (1024 * 1024)), unit: 'MB' },
          { metric: 'memory_used_mb', value: Math.round(usedBytes / (1024 * 1024)), unit: 'MB' },
        ];
      }
    }
  } catch { /* no memory data */ }

  return [];
};

// ─── Interface / Bandwidth collection ──────────────────────
const collectInterfaceMetrics = async (session) => {
  try {
    const nameVarbinds = await subtreeWalk(session, OIDS.ifDescr);
    const statusVarbinds = await subtreeWalk(session, OIDS.ifOperStatus);
    const inVarbinds = await subtreeWalk(session, OIDS.ifInOctets);
    const outVarbinds = await subtreeWalk(session, OIDS.ifOutOctets);
    const inErrVarbinds = await subtreeWalk(session, OIDS.ifInErrors);
    const outErrVarbinds = await subtreeWalk(session, OIDS.ifOutErrors);
    const speedVarbinds = await subtreeWalk(session, OIDS.ifSpeed);

    const extractIndex = (oid) => oid.split('.').pop();
    const interfaces = [];
    const metrics = [];

    nameVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      interfaces.push({ index: Number(idx), name: String(vb.value), status: 'unknown' });
    });

    statusVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      const iface = interfaces.find((i) => i.index === Number(idx));
      if (iface) iface.status = parseNumber(vb.value) === 1 ? 'up' : 'down';
    });

    let totalInOctets = 0;
    let totalOutOctets = 0;

    inVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      const iface = interfaces.find((i) => i.index === Number(idx));
      const val = parseNumber(vb.value) || 0;
      if (iface) { iface.inOctets = val; iface.updatedAt = new Date(); }
      totalInOctets += val;
    });

    outVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      const iface = interfaces.find((i) => i.index === Number(idx));
      const val = parseNumber(vb.value) || 0;
      if (iface) { iface.outOctets = val; }
      totalOutOctets += val;
    });

    inErrVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      const iface = interfaces.find((i) => i.index === Number(idx));
      if (iface) iface.inErrors = parseNumber(vb.value) || 0;
    });

    outErrVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      const iface = interfaces.find((i) => i.index === Number(idx));
      if (iface) iface.outErrors = parseNumber(vb.value) || 0;
    });

    speedVarbinds.forEach((vb) => {
      const idx = extractIndex(vb.oid);
      const iface = interfaces.find((i) => i.index === Number(idx));
      if (iface) iface.speedBps = parseNumber(vb.value) || 0;
    });

    // Aggregate bandwidth metrics
    metrics.push({ metric: 'if_in_octets_total', value: totalInOctets, unit: 'bytes' });
    metrics.push({ metric: 'if_out_octets_total', value: totalOutOctets, unit: 'bytes' });

    const upCount = interfaces.filter((i) => i.status === 'up').length;
    const downCount = interfaces.filter((i) => i.status === 'down').length;
    metrics.push({ metric: 'if_up_count', value: upCount, unit: '' });
    metrics.push({ metric: 'if_down_count', value: downCount, unit: '' });

    return { metrics, interfaces };
  } catch {
    return { metrics: [], interfaces: [] };
  }
};

// ─── Main entry point ──────────────────────────────────────
const collectSnmpMetrics = async (device, credentialPayload = {}) => {
  const snmp = optionalRequire('net-snmp');
  if (!snmp) {
    return { ok: false, error: 'SNMP runtime package net-snmp is not installed.', metrics: [] };
  }

  const port = Number(credentialPayload.port || device.protocolSettings?.snmp?.port || 161);
  const timeout = Number(credentialPayload.timeout || device.protocolSettings?.snmp?.timeoutMs || 5000);
  const retries = Number(credentialPayload.retries || device.protocolSettings?.snmp?.retries || 1);
  let session;

  try {
    if (device.protocols?.snmpV3) {
      const user = {
        name: credentialPayload.username,
        level: snmp.SecurityLevel?.[credentialPayload.securityLevel] || snmp.SecurityLevel?.authPriv,
        authProtocol: snmp.AuthProtocols?.[credentialPayload.authProtocol] || snmp.AuthProtocols?.sha,
        authKey: credentialPayload.authKey,
        privProtocol: snmp.PrivProtocols?.[credentialPayload.privProtocol] || snmp.PrivProtocols?.aes,
        privKey: credentialPayload.privKey,
      };
      session = snmp.createV3Session(device.managementIp, user, { port, timeout, retries });
    } else {
      session = snmp.createSession(device.managementIp, credentialPayload.community || 'public', { port, timeout, retries, version: snmp.Version2c });
    }

    // ── 1. System info ──
    const varbinds = await getWithSession(session, [OIDS.sysName, OIDS.sysUpTime, OIDS.sysDescr]);
    const metrics = [];
    let sysName;
    let sysDescr;
    let uptimeSec;

    varbinds.forEach((varbind) => {
      if (!varbind || snmp.isVarbindError?.(varbind)) return;
      if (varbind.oid === OIDS.sysName) sysName = String(varbind.value);
      if (varbind.oid === OIDS.sysDescr) sysDescr = String(varbind.value);
      if (varbind.oid === OIDS.sysUpTime) {
        const centiseconds = parseNumber(varbind.value);
        if (centiseconds !== null) uptimeSec = Math.round(centiseconds / 100);
      }
    });

    if (uptimeSec !== null && uptimeSec !== undefined) {
      metrics.push({ metric: 'sys_uptime_sec', value: uptimeSec, unit: 's' });
    }

    // ── 2. CPU ──
    const cpuMetrics = await collectCpuMetrics(session);
    metrics.push(...cpuMetrics);

    // ── 3. Memory ──
    const memMetrics = await collectMemoryMetrics(session);
    metrics.push(...memMetrics);

    // ── 4. Interfaces / Bandwidth ──
    const ifResult = await collectInterfaceMetrics(session);
    metrics.push(...ifResult.metrics);

    return { ok: true, sysName, sysDescr, uptimeSec, metrics, interfaces: ifResult.interfaces };
  } catch (error) {
    return { ok: false, error: error.message, metrics: [] };
  } finally {
    if (session?.close) session.close();
  }
};

module.exports = { collectSnmpMetrics };
