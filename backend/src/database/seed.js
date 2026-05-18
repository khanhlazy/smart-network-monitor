require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');
const Device = require('../modules/devices/device.model');
const DeviceState = require('../modules/monitoring/deviceState.model');
const Alert = require('../modules/alerts/alert.model');
const AlertRule = require('../modules/alerts/alertRule.model');
const Collector = require('../modules/collectors/collector.model');
const TelemetrySample = require('../modules/telemetry/telemetrySample.model');
const TopologyLink = require('../modules/devices/topologyLink.model');
const Report = require('../modules/reports/report.model');
const Incident = require('../modules/incidents/incident.model');
const AuditLog = require('../modules/audit/auditLog.model');
const NotificationChannel = require('../modules/notifications/notificationChannel.model');
const Credential = require('../modules/credentials/credential.model');
const MaintenanceWindow = require('../modules/maintenance/maintenanceWindow.model');

const seed = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Role.deleteMany({}),
      Device.deleteMany({}),
      DeviceState.deleteMany({}),
      Alert.deleteMany({}),
      AlertRule.deleteMany({}),
      Collector.deleteMany({}),
      TelemetrySample.deleteMany({}),
      TopologyLink.deleteMany({}),
      Report.deleteMany({}),
      Incident.deleteMany({}),
      AuditLog.deleteMany({}),
      NotificationChannel.deleteMany({}),
      Credential.deleteMany({}),
      MaintenanceWindow.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // 1. Create Roles
    const superAdminRole = await Role.create({
      name: 'Super Admin',
      nameVi: 'Quản trị hệ thống',
      description: 'Full system access',
      descriptionVi: 'Quyền truy cập toàn bộ hệ thống',
      permissions: ['*'],
      isSystem: true,
    });

    const operatorRole = await Role.create({
      name: 'Network Operator',
      nameVi: 'Nhân viên vận hành mạng',
      description: 'Monitor and manage alerts',
      descriptionVi: 'Giám sát và quản lý cảnh báo',
      permissions: [
        'device:read', 'alert:read', 'alert:acknowledge', 'alert:resolve',
        'dashboard:read', 'collector:read', 'audit:read', 'topology:read', 'topology:manage'
      ],
      isSystem: true,
    });

    const viewerRole = await Role.create({
      name: 'Viewer',
      nameVi: 'Người xem',
      description: 'Read-only access',
      descriptionVi: 'Quyền xem dữ liệu',
      permissions: ['device:read', 'alert:read', 'dashboard:read', 'topology:read'],
      isSystem: true,
    });
    console.log('[Seed] Roles created');

    // 2. Create Users
    await User.create({
      fullName: 'Nguyễn Văn An',
      username: 'admin',
      email: 'admin@smartnms.local',
      passwordHash: 'Admin@123',
      roleIds: [superAdminRole._id],
      status: 'active',
      preferences: { language: 'vi', theme: 'dark' },
    });

    await User.create({
      fullName: 'Trần Thị Bình',
      username: 'operator',
      email: 'operator@smartnms.local',
      passwordHash: 'Operator@123',
      roleIds: [operatorRole._id],
      status: 'active',
      preferences: { language: 'vi', theme: 'dark' },
    });

    await User.create({
      fullName: 'Lê Minh Cường',
      username: 'viewer',
      email: 'viewer@smartnms.local',
      passwordHash: 'Viewer@123',
      roleIds: [viewerRole._id],
      status: 'active',
      preferences: { language: 'vi', theme: 'dark' },
    });
    console.log('[Seed] Users created');

    console.log('\n[Seed] Completed successfully! 🎉');
    console.log('\n[Seed] Default accounts:');
    console.log('   👑 Admin:    admin / Admin@123');
    console.log('   🛠️ Operator: operator / Operator@123');
    console.log('   👁️ Viewer:   viewer / Viewer@123\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
