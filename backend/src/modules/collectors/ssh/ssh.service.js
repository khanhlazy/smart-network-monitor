const optionalRequire = (name) => {
  try {
    return require(name);
  } catch (error) {
    return null;
  }
};

const COMMAND_PROFILES = {
  linux_server: ['uptime', 'free -m', 'df -h', 'top -bn1'],
  network_device: ['show version', 'show interfaces', 'show ip interface brief'],
};

const parseLinuxOutput = (outputs) => {
  const metrics = [];
  const free = outputs['free -m'];
  if (free) {
    const line = free.split(/\r?\n/).find(row => row.toLowerCase().startsWith('mem:'));
    if (line) {
      const parts = line.trim().split(/\s+/);
      const total = Number(parts[1]);
      const used = Number(parts[2]);
      if (Number.isFinite(total) && total > 0 && Number.isFinite(used)) {
        metrics.push({ metric: 'memory_pct', value: Math.round((used / total) * 10000) / 100, unit: '%' });
      }
    }
  }
  return metrics;
};

const runSshCommands = async (device, credentialPayload = {}) => {
  const ssh2 = optionalRequire('ssh2');
  if (!ssh2) {
    return { ok: false, error: 'SSH runtime package ssh2 is not installed.', metrics: [] };
  }

  const { Client } = ssh2;
  const allowed = COMMAND_PROFILES[device.protocolSettings?.ssh?.profile || 'network_device'] || COMMAND_PROFILES.network_device;
  const requested = device.protocolSettings?.ssh?.allowedCommands?.length
    ? device.protocolSettings.ssh.allowedCommands.filter(command => allowed.includes(command))
    : allowed;

  const conn = new Client();
  const outputs = {};

  const execCommand = (command) => new Promise((resolve, reject) => {
    conn.exec(command, (error, stream) => {
      if (error) return reject(error);
      let stdout = '';
      let stderr = '';
      stream.on('close', () => {
        if (stderr && !stdout) return reject(new Error(stderr));
        outputs[command] = stdout;
        resolve();
      });
      stream.on('data', data => { stdout += data.toString(); });
      stream.stderr.on('data', data => { stderr += data.toString(); });
    });
  });

  try {
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve).on('error', reject).connect({
        host: device.managementIp,
        port: Number(device.protocolSettings?.ssh?.port || 22),
        username: credentialPayload.username,
        password: credentialPayload.password,
        privateKey: credentialPayload.privateKey,
        readyTimeout: Number(device.protocolSettings?.ssh?.timeoutMs || 10000),
      });
    });

    for (const command of requested) {
      await execCommand(command);
    }

    const metrics = device.protocolSettings?.ssh?.profile === 'linux_server'
      ? parseLinuxOutput(outputs)
      : [];
    return { ok: true, outputs, metrics };
  } catch (error) {
    return { ok: false, error: error.message, metrics: [] };
  } finally {
    conn.end();
  }
};

module.exports = { runSshCommands, COMMAND_PROFILES };
