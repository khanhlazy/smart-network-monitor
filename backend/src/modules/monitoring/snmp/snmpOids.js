// Standard SNMP OIDs for network device monitoring
// References: RFC 1213, RFC 2790 (Host Resources MIB)

const OIDS = {
  // ===== System Info =====
  sysName: '1.3.6.1.2.1.1.5.0',
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',    // sysUpTimeInstance (in centiseconds)
  sysContact: '1.3.6.1.2.1.1.4.0',
  sysLocation: '1.3.6.1.2.1.1.6.0',

  // ===== CPU (Host Resources MIB – hrProcessorTable) =====
  // Walk table: each entry = 1 core, value = % load over last minute
  hrProcessorLoad: '1.3.6.1.2.1.25.3.3.1.2',

  // ===== Memory (Host Resources MIB – hrStorageTable) =====
  hrStorageDescr: '1.3.6.1.2.1.25.2.3.1.3',     // Description per entry
  hrStorageAllocationUnits: '1.3.6.1.2.1.25.2.3.1.4',
  hrStorageSize: '1.3.6.1.2.1.25.2.3.1.5',       // Total size (in AllocationUnits)
  hrStorageUsed: '1.3.6.1.2.1.25.2.3.1.6',       // Used size (in AllocationUnits)
  // Well-known storage types
  hrStorageRam: '1.3.6.1.2.1.25.2.1.2',          // Physical RAM type OID
  hrStorageType: '1.3.6.1.2.1.25.2.3.1.2',

  // ===== Memory (UCD-SNMP-MIB – for Linux/net-snmp devices) =====
  memTotalReal: '1.3.6.1.4.1.2021.4.5.0',        // Total RAM (kB)
  memAvailReal: '1.3.6.1.4.1.2021.4.6.0',        // Available RAM (kB)
  memTotalSwap: '1.3.6.1.4.1.2021.4.3.0',
  memAvailSwap: '1.3.6.1.4.1.2021.4.4.0',

  // ===== Interface Table (IF-MIB) =====
  ifNumber: '1.3.6.1.2.1.2.1.0',                 // Number of interfaces
  ifDescr: '1.3.6.1.2.1.2.2.1.2',                // Interface description
  ifType: '1.3.6.1.2.1.2.2.1.3',                 // Interface type
  ifSpeed: '1.3.6.1.2.1.2.2.1.5',                // Interface speed (bits/sec)
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',           // 1=up, 2=down, 3=testing
  ifInOctets: '1.3.6.1.2.1.2.2.1.10',            // Inbound traffic (bytes, 32-bit)
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16',           // Outbound traffic (bytes, 32-bit)
  ifInErrors: '1.3.6.1.2.1.2.2.1.14',            // Inbound errors
  ifOutErrors: '1.3.6.1.2.1.2.2.1.20',           // Outbound errors

  // ===== High-Capacity Interface Counters (64-bit, IF-MIB) =====
  ifHCInOctets: '1.3.6.1.2.1.31.1.1.1.6',        // 64-bit inbound
  ifHCOutOctets: '1.3.6.1.2.1.31.1.1.1.10',       // 64-bit outbound
  ifName: '1.3.6.1.2.1.31.1.1.1.1',               // Interface name (e.g. eth0)

  // ===== Cisco-specific (optional) =====
  cpmCPUTotal5minRev: '1.3.6.1.4.1.9.9.109.1.1.1.1.8',  // Cisco CPU 5-min avg
  ciscoMemoryPoolUsed: '1.3.6.1.4.1.9.9.48.1.1.1.5',     // Cisco memory used
  ciscoMemoryPoolFree: '1.3.6.1.4.1.9.9.48.1.1.1.6',     // Cisco memory free
};

module.exports = { OIDS };
