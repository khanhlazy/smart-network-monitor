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

const getWithSession = (session, oids) => new Promise((resolve, reject) => {
  session.get(oids, (error, varbinds) => {
    if (error) return reject(error);
    resolve(varbinds || []);
  });
});

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

    const varbinds = await getWithSession(session, [OIDS.sysName, OIDS.sysUpTime]);
    const metrics = [];
    let sysName;
    let uptimeSec;

    varbinds.forEach((varbind) => {
      if (!varbind || snmp.isVarbindError?.(varbind)) return;
      if (varbind.oid === OIDS.sysName) sysName = String(varbind.value);
      if (varbind.oid === OIDS.sysUpTime) {
        const centiseconds = parseNumber(varbind.value);
        if (centiseconds !== null) uptimeSec = Math.round(centiseconds / 100);
      }
    });

    if (uptimeSec !== null && uptimeSec !== undefined) {
      metrics.push({ metric: 'sys_uptime_sec', value: uptimeSec, unit: 's' });
    }

    return { ok: true, sysName, uptimeSec, metrics, interfaces: [] };
  } catch (error) {
    return { ok: false, error: error.message, metrics: [] };
  } finally {
    if (session?.close) session.close();
  }
};

module.exports = { collectSnmpMetrics };
