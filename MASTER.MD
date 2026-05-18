# MASTER.MD
# Smart Network Device Monitoring & Management System
## Enterprise Product Specification & Technical Blueprint

| Field | Value |
| --- | --- |
| Product | Smart Network Device Monitoring & Management System |
| Product shorthand | SmartNMS |
| Vietnamese UI name | Hệ thống Quản lý và Giám sát Thiết bị Mạng Thông minh |
| Document purpose | Product, UX, architecture, API, data, security, and deployment blueprint |
| Primary audience | Product managers, UI/UX designers, frontend engineers, backend engineers, DevOps/SRE, QA, security reviewers |
| Product language | Vietnamese-first UI, English secondary UI |
| Document language | English |
| Default UI language | �� Tiếng Việt |
| Secondary UI language | �� English |
| Core stack | React, TypeScript, Node.js, MongoDB, Redis, Socket.IO, Kubernetes |
| Product style reference | Cisco dashboard discipline, Ubiquiti clarity, Datadog density, Grafana observability, enterprise NOC operations |

---

## 1. Executive Product Vision

SmartNMS is a production-grade Network Operations Center platform for monitoring, managing, and diagnosing enterprise network infrastructure in near real time. It provides device inventory, telemetry collection, incident alerting, topology awareness, operator workflows, auditability, reporting, and future AI-assisted anomaly detection.

The product must feel like a serious operational system from the first screen:

- Fast status visibility for real network environments.
- Dense but readable NOC-style dashboards.
- Vietnamese-first interface with polished business language.
- Realtime confidence: live connection state, last update time, recovery behavior, and explainable stale data.
- Enterprise readiness: RBAC, audit logs, MFA, secure collector registration, scalable telemetry storage, Kubernetes deployment, and observability.

### 1.1 Product Promise

Operators should be able to answer these questions within seconds:

| Question | Product answer |
| --- | --- |
| Is the network healthy right now? | Dashboard health score, active alerts, realtime status distribution |
| Which device or site is causing impact? | Site health, topology map, device heatmap, alert grouping |
| Is this a single device issue or a wider incident? | Alert correlation, impacted devices, timeline, topology context |
| Has anyone acknowledged the issue? | Alert lifecycle, assignment, incident timeline, audit trail |
| Can I trust the data? | Collector health, telemetry freshness, data quality indicators |
| What changed recently? | Audit logs, configuration history, alert timeline, collector events |

### 1.2 System Philosophy

SmartNMS is not a passive reporting page. It is an operator console.

- **State is live by default.** Dashboards update through Socket.IO and visibly degrade when disconnected.
- **Every number needs context.** KPI cards show trend, freshness, scope, and severity.
- **Vietnamese is first-class.** Labels, validation, empty states, and operational wording must sound natural in Vietnamese, not translated mechanically.
- **Alerts become incidents.** Alert handling must support acknowledgement, ownership, suppression, escalation, resolution, and post-incident review.
- **Collectors are treated as production agents.** Collector status, version, heartbeat, workload, and data lag are observable.
- **Telemetry is cost-aware.** Raw samples, rollups, TTL, indexes, and aggregation strategy are designed before scale arrives.
- **Security is built into workflows.** Credentials, SNMPv3, JWT lifecycle, audit logs, and RBAC are not optional add-ons.

### 1.3 Product Quality Bar

The implementation should be demo-ready for investors and credible for enterprise pilots:

- No broken Vietnamese accents.
- No placeholder-only dashboards.
- No static realtime claims without actual event behavior.
- No unbounded telemetry collection.
- No role bypass in frontend routes or backend handlers.
- No secrets in logs, database documents, browser storage, or Socket.IO payloads.
- No tables without search, filtering, sorting, pagination, loading, empty, and error states.

---

## 2. Product Scope

### 2.1 Core Modules

| Module | Vietnamese label | Purpose |
| --- | --- | --- |
| Authentication | Đăng nhập | Secure user access, MFA, session lifecycle |
| Dashboard | Tổng quan | Executive and operator overview of network health |
| NOC Wallboard | Bảng giám sát NOC | Fullscreen realtime operations view |
| Device Management | Thiết bị | Inventory, lifecycle, credentials, grouping, tagging |
| Device Detail | Chi tiết thiết bị | Metrics, interfaces, alerts, logs, configuration |
| Realtime Monitoring | Giám sát realtime | Live grid, table, topology, event stream |
| Topology | Sơ đồ mạng | Sites, device relationships, health overlays |
| Alerts | Cảnh báo | Alert triage, acknowledgement, escalation, resolution |
| Alert Rules | Quy tắc cảnh báo | Thresholds, scopes, severity, suppression rules |
| Incidents | Sự cố | Grouped operational events and resolution timeline |
| Collectors | Collector | Agent registration, heartbeat, workload, health |
| Reports | Báo cáo | Uptime, SLA, alert, device, collector reports |
| Users | Người dùng | Account administration |
| Roles & Permissions | Phân quyền | RBAC policy management |
| Audit Logs | Nhật ký hệ thống | Security and operational traceability |
| Settings | Cài đặt | Language, theme, monitoring, security, retention |

### 2.2 MVP Scope

The MVP must include:

- Login, refresh token rotation, logout.
- Vietnamese-first UI with English switch.
- Dark mode enterprise layout.
- Device CRUD with tags, site, type, credentials reference, monitoring profile.
- ICMP monitoring for latency, packet loss, online/offline state.
- Collector registration and heartbeat.
- Realtime dashboard updates with Socket.IO.
- Alert rules for offline, latency, packet loss, collector down.
- Alert lifecycle: open, acknowledged, resolved, suppressed.
- Dashboard summary, NOC wallboard, device list, device detail.
- Audit logs for authentication, device changes, alert actions, role changes.
- MongoDB time-series telemetry with TTL and rollups.
- Docker Compose for local development.
- Kubernetes deployment templates for staging/production.

### 2.3 Post-MVP Scope

- SNMPv2c/SNMPv3 metrics: CPU, memory, interface traffic, errors, uptime.
- SSH and REST API collectors for vendor-specific telemetry.
- Topology discovery through LLDP/CDP where supported.
- Incident correlation and alert grouping.
- Maintenance windows and notification channels.
- Scheduled reports with PDF/Excel export.
- AI anomaly detection and capacity forecasting.
- Multi-tenant organization model if the product becomes SaaS.

---

## 3. Target Users and Operational Roles

### 3.1 Personas

| Persona | Vietnamese label | Primary goals | Product needs |
| --- | --- | --- | --- |
| System Administrator | Quản trị hệ thống | Configure users, roles, security, system settings | Secure admin screens, audit logs, RBAC, retention controls |
| Network Administrator | Quản trị mạng | Manage inventory, monitoring profiles, alert rules | Device CRUD, credential handling, topology, protocol support |
| NOC Operator | Nhân viên vận hành mạng | Monitor realtime health and respond to alerts | NOC wallboard, alert queue, incident timeline, fast actions |
| Security Administrator | Quản trị bảo mật | Review access, sensitive actions, suspicious behavior | Audit logs, MFA, permission changes, session visibility |
| Viewer / Executive | Người xem | Understand status, SLA, and business impact | Read-only dashboards, reports, health summaries |

### 3.2 Operator Workflow

1. Operator opens **Tổng quan**.
2. KPI card shows **Cảnh báo nghiêm trọng: 3** and health score drop.
3. Operator enters **Trung tâm cảnh báo**.
4. Alerts are grouped by site and probable root cause.
5. Operator opens an alert detail page.
6. Operator clicks **Xác nhận** and assigns themselves.
7. Incident timeline records acknowledgement.
8. Operator reviews related device telemetry and topology.
9. Operator adds a resolution note.
10. Operator clicks **Đánh dấu đã xử lý**.
11. SLA and audit logs are updated automatically.

### 3.3 Permission Model Summary

| Role | View dashboard | Manage devices | Manage alerts | Manage users | Manage roles | View audit logs | System settings |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Người xem | Yes | No | No | No | No | No | No |
| Nhân viên vận hành | Yes | Limited | Yes | No | No | No | No |
| Quản trị mạng | Yes | Yes | Yes | No | No | Limited | Monitoring only |
| Quản trị bảo mật | Yes | No | Limited | Limited | Yes | Yes | Security only |
| Quản trị hệ thống | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

---

## 4. Product Information Architecture

### 4.1 Main Navigation

Sidebar labels must be Vietnamese by default and English after language switch.

| Route | Vietnamese | English | Icon intent |
| --- | --- | --- | --- |
| `/dashboard` | Tổng quan | Dashboard | Activity / gauge |
| `/noc` | Bảng giám sát NOC | NOC Wallboard | Monitor |
| `/devices` | Thiết bị | Devices | Server / router |
| `/topology` | Sơ đồ mạng | Topology | Network |
| `/monitoring` | Giám sát realtime | Realtime Monitoring | Pulse |
| `/alerts` | Cảnh báo | Alerts | Bell / siren |
| `/incidents` | Sự cố | Incidents | Flame / timeline |
| `/alert-rules` | Quy tắc cảnh báo | Alert Rules | Sliders |
| `/collectors` | Collector | Collectors | Radio receiver |
| `/reports` | Báo cáo | Reports | File chart |
| `/users` | Người dùng | Users | Users |
| `/roles` | Phân quyền | Roles & Permissions | Shield |
| `/audit-logs` | Nhật ký hệ thống | Audit Logs | Scroll text |
| `/settings` | Cài đặt | Settings | Settings |

### 4.2 Route Map

```txt
/login
/mfa
/dashboard
/noc
/devices
/devices/new
/devices/import
/devices/:deviceId
/devices/:deviceId/edit
/devices/:deviceId/interfaces
/topology
/monitoring
/alerts
/alerts/:alertId
/incidents
/incidents/:incidentId
/alert-rules
/alert-rules/new
/alert-rules/:ruleId/edit
/collectors
/collectors/:collectorId
/reports
/reports/:reportId
/users
/users/:userId
/roles
/audit-logs
/settings
```

### 4.3 Page Shell

```txt
+--------------------------------------------------------------------------------+
| Topbar: global search | realtime state | notifications | �� VI | profile      |
+----------------------+---------------------------------------------------------+
| Sidebar              | Main content                                            |
| - Product logo       | Page header: title, scope selector, primary actions     |
| - Navigation         | Filters / tabs / dashboard grid / data tables           |
| - Collapse control   | Sticky contextual action bar when needed                |
+----------------------+---------------------------------------------------------+
```

The layout must prioritize repeat operational use:

- Sidebar width: `264px` expanded, `72px` collapsed.
- Topbar height: `56px`.
- Page content max width: no hard max for dashboards; use responsive grid.
- Tables use full available width with sticky headers.
- Critical alert banner may pin below topbar when active.

---

## 5. Enterprise UX Principles

### 5.1 UX Rules

- Every realtime screen shows **last updated time** and **connection status**.
- Every chart has an empty state, loading skeleton, and data freshness indicator.
- Every destructive action uses confirmation with the exact object name.
- Every table has search, filters, sorting, pagination, density control, and export if permission allows.
- Every operator action that affects incident state requires a note when resolving or suppressing.
- Every admin setting explains operational impact in Vietnamese.
- Every status color is paired with text and icon; never rely on color alone.
- Every page supports keyboard navigation for search, table row open, and modal escape.

### 5.2 Vietnamese UX Tone

Vietnamese UI must be concise, natural, and operational. Prefer these patterns:

| Concept | Preferred Vietnamese | Avoid |
| --- | --- | --- |
| Dashboard | Tổng quan | Bảng điều khiển when space is tight |
| Realtime monitoring | Giám sát realtime | Giám sát thời gian thực if label becomes too long |
| Acknowledge alert | Xác nhận cảnh báo | Thừa nhận cảnh báo |
| Resolve alert | Đánh dấu đã xử lý | Giải quyết if context is unclear |
| Suppress alert | Tạm ẩn cảnh báo | Đàn áp cảnh báo |
| Health score | Điểm sức khỏe | Điểm khỏe |
| Last seen | Lần cuối online | Nhìn thấy lần cuối |
| Maintenance | Bảo trì | Duy trì |

### 5.3 Core UI Copy Examples

| UI location | Vietnamese first | English secondary |
| --- | --- | --- |
| Global search placeholder | Tìm thiết bị, IP, cảnh báo, site... | Search devices, IPs, alerts, sites... |
| Empty device list | Chưa có thiết bị nào | No devices yet |
| Alert empty state | Không có cảnh báo đang mở | No open alerts |
| Connection lost toast | Mất kết nối realtime. Đang thử kết nối lại... | Realtime connection lost. Reconnecting... |
| Data stale label | Dữ liệu đã cũ | Stale data |
| Save success | Đã lưu thay đổi | Changes saved |
| Permission denied | Bạn không có quyền thực hiện thao tác này | You do not have permission to perform this action |

---

## 6. Design System

SmartNMS must use a dark, data-dense, enterprise visual system. It should feel operational, not decorative. The interface must support long Vietnamese labels without clipping.

### 6.1 Typography

Primary font:

```css
@import url("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap");

:root {
  font-family: "Be Vietnam Pro", Inter, Roboto, Arial, sans-serif;
}
```

Typography tokens:

| Token | Size | Line height | Weight | Usage |
| --- | ---: | ---: | ---: | --- |
| `text-display` | 32px | 40px | 700 | NOC wallboard primary metric |
| `text-page-title` | 24px | 32px | 700 | Page title |
| `text-section-title` | 18px | 28px | 600 | Panel title |
| `text-card-title` | 14px | 20px | 600 | Card header |
| `text-body` | 14px | 22px | 400 | Normal UI text |
| `text-table` | 13px | 20px | 400 | Table cells |
| `text-status` | 12px | 18px | 600 | Badges, chips, metadata |
| `text-metric` | 28px | 36px | 700 | KPI numbers |

Rules:

- Do not use negative letter spacing.
- Do not scale font size with viewport width.
- Vietnamese accents must render correctly at all sizes.
- Use `font-weight: 600` for Vietnamese labels that need emphasis; avoid excessive `800`.
- Table text must remain at least `13px`.

### 6.2 Color Tokens

Dark mode is the default. The palette should be neutral graphite with restrained status colors, avoiding a one-note blue interface.

| Token | Value | Usage |
| --- | --- | --- |
| `color-bg-app` | `#0B0F14` | App background |
| `color-bg-sidebar` | `#070A0F` | Sidebar |
| `color-bg-surface` | `#111821` | Cards, panels |
| `color-bg-surface-raised` | `#17202B` | Dropdowns, modals |
| `color-bg-hover` | `#1D2835` | Hover state |
| `color-border-subtle` | `#243244` | Card and table border |
| `color-border-strong` | `#34465C` | Focused/active border |
| `color-text-primary` | `#F4F7FB` | Main text |
| `color-text-secondary` | `#AAB6C5` | Supporting text |
| `color-text-muted` | `#768497` | Metadata |
| `color-brand` | `#2F80ED` | Primary action |
| `color-cyan` | `#22D3EE` | Realtime / telemetry |
| `color-green` | `#22C55E` | Online / success |
| `color-amber` | `#F59E0B` | Warning |
| `color-red` | `#EF4444` | Error / offline |
| `color-critical` | `#B91C1C` | Critical severity |
| `color-violet` | `#8B5CF6` | AI / anomaly / special |

Status mapping:

| Status | Vietnamese | English | Color | Icon |
| --- | --- | --- | --- | --- |
| `online` | Đang hoạt động | Online | Green | Check circle |
| `offline` | Mất kết nối | Offline | Red | X circle |
| `warning` | Cảnh báo | Warning | Amber | Triangle |
| `critical` | Nghiêm trọng | Critical | Critical red | Octagon alert |
| `unknown` | Không xác định | Unknown | Muted gray | Circle help |
| `maintenance` | Bảo trì | Maintenance | Brand blue | Wrench |
| `stale` | Dữ liệu cũ | Stale | Amber | Clock |

### 6.3 Spacing and Layout

Use a 4px base grid.

| Token | Value | Usage |
| --- | ---: | --- |
| `space-1` | 4px | Icon gap, badge padding |
| `space-2` | 8px | Compact gaps |
| `space-3` | 12px | Form field gaps |
| `space-4` | 16px | Card padding compact |
| `space-5` | 20px | Panel spacing |
| `space-6` | 24px | Page sections |
| `space-8` | 32px | Dashboard rows |

Layout rules:

- Card radius: `8px` maximum.
- Button radius: `6px`.
- Input height: `36px` compact, `40px` default.
- Icon button size: `32px` compact, `36px` default.
- Dashboard grid: 12 columns desktop, 6 columns tablet, 1 column mobile.
- NOC wallboard: fixed aspect panels to prevent layout shift.
- Avoid cards inside cards. Use panels, dividers, and table sections instead.

### 6.4 Motion System

Motion must support operational clarity, not decoration.

| Motion | Duration | Easing | Usage |
| --- | ---: | --- | --- |
| Hover / active | 120ms | ease-out | Buttons, rows, tabs |
| Dropdown open | 150ms | cubic-bezier(0.2, 0, 0, 1) | Menus |
| Modal entrance | 180ms | cubic-bezier(0.2, 0, 0, 1) | Dialogs |
| Realtime pulse | 900ms | ease-in-out | Fresh update indicator |
| Alert critical flash | 1200ms max | ease-in-out | Critical wallboard only |

Rules:

- Do not animate table layout when realtime rows update.
- Critical flashing must be subtle and disableable.
- Respect `prefers-reduced-motion`.
- Use toast transitions that do not cover operational controls.

### 6.5 Accessibility

- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large metrics.
- All icon-only buttons require tooltip and `aria-label`.
- Status badges must include text and icon.
- Tables must support keyboard row focus.
- Modals trap focus and close with Escape.
- Language switcher must be keyboard accessible.
- Realtime updates should use polite live regions only for critical state changes.

### 6.6 Responsive Behavior

| Breakpoint | Width | Behavior |
| --- | ---: | --- |
| Mobile | `< 640px` | Sidebar becomes drawer, KPI cards single column, tables become scrollable with sticky first column |
| Tablet | `640-1023px` | Sidebar collapsed by default, dashboard 6-column grid |
| Desktop | `1024-1439px` | Full sidebar, dashboard 12-column grid |
| NOC display | `>= 1440px` | Dense dashboard, wallboard mode, larger metrics |

Vietnamese labels must wrap cleanly. Do not truncate primary action labels unless the button also has a tooltip.

### 6.7 Component Specifications

| Component | Required states | Notes |
| --- | --- | --- |
| `Sidebar` | expanded, collapsed, active, permission-hidden | Uses icons and Vietnamese labels |
| `Topbar` | connected, reconnecting, disconnected | Shows realtime state and language switch |
| `PageHeader` | default, with tabs, with actions | Contains title, subtitle, scope selector |
| `StatCard` | normal, warning, critical, loading, stale | Shows trend, scope, freshness |
| `StatusBadge` | all device statuses | Text + icon + color |
| `SeverityBadge` | info, warning, high, critical | Consistent across alerts, tables, cards |
| `DataTable` | loading, empty, error, filtered-empty, selected rows | Sticky header, pagination, bulk actions |
| `FilterBar` | collapsed mobile, expanded desktop | Search, status, site, type, time range |
| `ConfirmModal` | destructive, warning, info | Requires object name for destructive actions |
| `LanguageSwitcher` | compact, expanded, login variant | �� VI / �� EN |
| `RealtimeIndicator` | live, reconnecting, offline, degraded | Shows last event time |
| `NetworkTopologyMap` | loading, empty, degraded, focused device | Pan, zoom, health overlays |
| `AlertTimeline` | active, resolved, suppressed | Shows lifecycle events |
| `LiveEventFeed` | streaming, paused, disconnected | Allows pause, copy event, filter severity |

---

## 7. Localization and Language System

### 7.1 Language Rules

- Default language: `vi`.
- Secondary language: `en`.
- Language switch display:
  - Compact: `�� VI`, `�� EN`
  - Expanded: `�� Tiếng Việt`, `�� English`
- Store anonymous preference in `localStorage.app_language`.
- Store authenticated preference in `users.preferences.language`.
- Server APIs may accept `Accept-Language: vi` or `Accept-Language: en`.
- Dates, numbers, and percentages must format by locale.

### 7.2 Language Switcher Behavior

Locations:

- Login page top-right.
- App topbar.
- Settings > Ngôn ngữ.

Behavior:

1. User opens menu.
2. User selects `�� Tiếng Việt` or `�� English`.
3. UI updates instantly without full page reload.
4. Selection is persisted locally.
5. If authenticated, preference is saved to user profile.
6. API error messages use selected language when possible.

### 7.3 Vietnamese Formatting

| Data type | Vietnamese example | English example |
| --- | --- | --- |
| Date time | 17/05/2026 22:30 | May 17, 2026, 10:30 PM |
| Relative time | 5 phút trước | 5 minutes ago |
| Percent | 2,5% | 2.5% |
| Latency | 28 ms | 28 ms |
| Traffic | 1,2 Gbps | 1.2 Gbps |
| Duration | 3 ngày 4 giờ | 3 days 4 hours |

### 7.4 Base Dictionary

```json
{
  "vi": {
    "nav.dashboard": "Tổng quan",
    "nav.noc": "Bảng giám sát NOC",
    "nav.devices": "Thiết bị",
    "nav.topology": "Sơ đồ mạng",
    "nav.monitoring": "Giám sát realtime",
    "nav.alerts": "Cảnh báo",
    "nav.incidents": "Sự cố",
    "nav.alertRules": "Quy tắc cảnh báo",
    "nav.collectors": "Collector",
    "nav.reports": "Báo cáo",
    "nav.users": "Người dùng",
    "nav.roles": "Phân quyền",
    "nav.auditLogs": "Nhật ký hệ thống",
    "nav.settings": "Cài đặt",
    "common.search": "Tìm kiếm",
    "common.save": "Lưu",
    "common.cancel": "Hủy",
    "common.edit": "Sửa",
    "common.delete": "Xóa",
    "common.view": "Xem",
    "common.create": "Thêm mới",
    "common.update": "Cập nhật",
    "common.export": "Xuất dữ liệu",
    "common.refresh": "Làm mới",
    "common.apply": "Áp dụng",
    "common.reset": "Đặt lại",
    "common.filter": "Bộ lọc",
    "common.actions": "Hành động",
    "status.online": "Đang hoạt động",
    "status.offline": "Mất kết nối",
    "status.warning": "Cảnh báo",
    "status.critical": "Nghiêm trọng",
    "status.unknown": "Không xác định",
    "status.maintenance": "Bảo trì",
    "alert.acknowledge": "Xác nhận",
    "alert.resolve": "Đánh dấu đã xử lý",
    "alert.suppress": "Tạm ẩn",
    "alert.addNote": "Thêm ghi chú"
  },
  "en": {
    "nav.dashboard": "Dashboard",
    "nav.noc": "NOC Wallboard",
    "nav.devices": "Devices",
    "nav.topology": "Topology",
    "nav.monitoring": "Realtime Monitoring",
    "nav.alerts": "Alerts",
    "nav.incidents": "Incidents",
    "nav.alertRules": "Alert Rules",
    "nav.collectors": "Collectors",
    "nav.reports": "Reports",
    "nav.users": "Users",
    "nav.roles": "Roles & Permissions",
    "nav.auditLogs": "Audit Logs",
    "nav.settings": "Settings",
    "common.search": "Search",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.view": "View",
    "common.create": "Create",
    "common.update": "Update",
    "common.export": "Export",
    "common.refresh": "Refresh",
    "common.apply": "Apply",
    "common.reset": "Reset",
    "common.filter": "Filters",
    "common.actions": "Actions",
    "status.online": "Online",
    "status.offline": "Offline",
    "status.warning": "Warning",
    "status.critical": "Critical",
    "status.unknown": "Unknown",
    "status.maintenance": "Maintenance",
    "alert.acknowledge": "Acknowledge",
    "alert.resolve": "Mark as resolved",
    "alert.suppress": "Suppress",
    "alert.addNote": "Add note"
  }
}
```

---

## 8. Dashboard System

The dashboard is the operational cockpit. It must be realtime, scope-aware, and optimized for scanning.

### 8.1 Dashboard Page

Vietnamese title: **Tổng quan hệ thống**  
English title: **System Dashboard**

Primary controls:

- Scope selector: `Tất cả site`, `Miền Bắc`, `Miền Trung`, `Miền Nam`, custom site.
- Time range: `15 phút`, `1 giờ`, `24 giờ`, `7 ngày`, `Tùy chỉnh`.
- Refresh indicator: `Đang live`, `Đang kết nối lại`, `Dữ liệu đã cũ`.
- Dashboard density: `Tiêu chuẩn`, `Dày`, `Tường NOC`.

### 8.2 KPI Cards

| KPI | Vietnamese label | Calculation | Drilldown |
| --- | --- | --- | --- |
| Total devices | Tổng thiết bị | Count active inventory devices | Device list |
| Online devices | Đang hoạt động | `device_state.status = online` | Filtered device list |
| Offline devices | Mất kết nối | `device_state.status = offline` | Offline devices |
| Warning devices | Có cảnh báo | Devices with active warning/high/critical alerts | Alert list |
| Active alerts | Cảnh báo đang mở | Alerts in `open` or `acknowledged` | Alert center |
| Average latency | Độ trễ trung bình | Avg latest latency by scope | Latency chart |
| Packet loss | Tỉ lệ mất gói | Avg latest packet loss by scope | Packet loss chart |
| Network health | Điểm sức khỏe mạng | Weighted score | Health details |
| Active collectors | Collector đang chạy | Collectors with heartbeat within threshold | Collector list |
| Telemetry freshness | Độ mới dữ liệu | Percent devices updated within expected interval | Collector diagnostics |

KPI card example:

```txt
Tổng thiết bị
128
+12 thiết bị trong 30 ngày
Cập nhật 10 giây trước
```

### 8.3 Health Score

Network health score is a 0-100 score used for executive visibility and NOC prioritization.

```txt
healthScore =
  onlineRatio * 35
+ latencyScore * 20
+ packetLossScore * 20
+ alertScore * 15
+ collectorFreshnessScore * 10
```

Score bands:

| Score | Vietnamese | English | Visual |
| ---: | --- | --- | --- |
| 90-100 | Tốt | Healthy | Green |
| 75-89 | Ổn định | Stable | Cyan/green |
| 60-74 | Cần chú ý | Needs attention | Amber |
| 40-59 | Suy giảm | Degraded | Orange/red |
| 0-39 | Nghiêm trọng | Critical | Critical red |

### 8.4 Required Dashboard Widgets

| Widget | Vietnamese title | Behavior |
| --- | --- | --- |
| Device status donut | Trạng thái thiết bị | Click segment to filter devices |
| Latency trend | Độ trễ theo thời gian | Show p50, p95, max |
| Packet loss trend | Tỉ lệ mất gói | Show threshold overlays |
| Alert severity bar | Cảnh báo theo mức độ | Group by severity and status |
| Traffic area chart | Lưu lượng mạng | Inbound/outbound stacked area |
| Site health map | Sức khỏe theo site | Grid or geographic view |
| Collector health | Sức khỏe Collector | Heartbeat, queue lag, assigned devices |
| Top impacted devices | Thiết bị ảnh hưởng nhiều nhất | Sort by active alerts and downtime |
| Recent incidents | Sự cố gần đây | Timeline with status |
| Live event feed | Luồng sự kiện realtime | Pause, filter, copy event |

### 8.5 NOC Wallboard

Vietnamese title: **Bảng giám sát NOC**  
English title: **NOC Wallboard**

Wallboard mode is designed for large screens and must support fullscreen display.

Required layout:

```txt
+--------------------------------------------------------------------------------+
| Health Score | Critical Alerts | Offline Devices | Collector Lag | Clock       |
+--------------------------------------------------------------------------------+
| Site Health Grid                         | Live Topology / Heatmap             |
+------------------------------------------+-------------------------------------+
| Latency & Packet Loss Trends             | Active Critical Incidents            |
+------------------------------------------+-------------------------------------+
| Live Event Feed                                                                |
+--------------------------------------------------------------------------------+
```

Rules:

- No modals in wallboard mode.
- Critical incidents can pulse subtly.
- Data freshness is always visible.
- Provide `Thoát toàn màn hình` control.
- Use larger metrics but keep labels compact.
- If realtime disconnects, show a persistent banner: `Mất kết nối realtime. Dữ liệu có thể đã cũ.`

### 8.6 Site Monitoring

Site cards show:

- Site name: `Hà Nội - Trụ sở chính`.
- Device count.
- Online/offline ratio.
- Active critical alerts.
- Average latency.
- Packet loss.
- Collector assigned.
- SLA for selected period.

Vietnamese card labels:

- `Tổng thiết bị`
- `Đang hoạt động`
- `Mất kết nối`
- `Cảnh báo nghiêm trọng`
- `Độ trễ TB`
- `Mất gói`
- `SLA`

### 8.7 Device Heatmaps

Heatmaps visualize device health by site, type, or group.

| Cell color | Meaning | Interaction |
| --- | --- | --- |
| Green | Healthy | Hover shows latest metrics |
| Amber | Warning | Click filters warning devices |
| Red | Offline/critical | Click opens impacted list |
| Gray | Unknown/stale | Click opens collector diagnostics |
| Blue | Maintenance | Click opens maintenance window |

---

## 9. Device Management

### 9.1 Device Management Page

Vietnamese title: **Quản lý thiết bị**  
English title: **Device Management**

Primary actions:

- `Thêm thiết bị`
- `Nhập từ CSV`
- `Xuất CSV`
- `Thao tác hàng loạt`
- `Kiểm tra kết nối`

Filters:

- Search by name, hostname, IP, serial number, tag.
- Status: online, offline, warning, critical, unknown, maintenance.
- Device type.
- Vendor.
- Site.
- Collector.
- Monitoring profile.
- Tags.

### 9.2 Device Table Columns

| Vietnamese | English | Notes |
| --- | --- | --- |
| Tên thiết bị | Device Name | Primary row label |
| Loại | Type | Router, Switch, AP, Firewall, Server |
| Hãng | Vendor | Cisco, MikroTik, Ubiquiti, Aruba, Fortinet |
| Địa chỉ IP | IP Address | Management IP |
| Site | Site | Logical location |
| Trạng thái | Status | Badge |
| Độ trễ | Latency | Latest ms and trend |
| Mất gói | Packet Loss | Latest percent |
| Collector | Collector | Assigned collector |
| Lần cuối online | Last Seen | Relative + tooltip absolute |
| Tag | Tags | Up to 3 visible, rest count |
| Hành động | Actions | View, edit, test, disable |

### 9.3 Device Profile

Each device has a profile:

```json
{
  "name": "Core-SW-HN-01",
  "hostname": "core-sw-hn-01.local",
  "type": "switch",
  "vendor": "Cisco",
  "model": "Catalyst 9300",
  "serialNumber": "FOC1234XYZ",
  "managementIp": "10.10.1.2",
  "macAddress": "00:1A:2B:3C:4D:5E",
  "siteId": "site_hanoi_hq",
  "location": {
    "building": "Tòa A",
    "floor": "Tầng 5",
    "room": "MDF"
  },
  "tags": ["core", "production", "hanoi"],
  "monitoringProfileId": "profile_network_standard",
  "collectorId": "collector_hanoi_01",
  "status": "online",
  "lifecycle": "active"
}
```

### 9.4 Device Lifecycle

| Lifecycle | Vietnamese | Meaning |
| --- | --- | --- |
| `draft` | Bản nháp | Created but not monitored |
| `active` | Đang sử dụng | Monitored and visible |
| `maintenance` | Bảo trì | Monitoring behavior adjusted |
| `disabled` | Tạm dừng | Inventory kept, monitoring stopped |
| `retired` | Ngừng sử dụng | Historical only |
| `deleted` | Đã xóa | Soft deleted for audit retention |

### 9.5 Device Types

| Type | Vietnamese | Metrics |
| --- | --- | --- |
| `router` | Router | ICMP, CPU, memory, traffic, routes |
| `switch` | Switch | ICMP, CPU, memory, interfaces, errors |
| `access_point` | Access Point | ICMP, clients, channel, uptime |
| `firewall` | Tường lửa | ICMP, CPU, sessions, throughput |
| `server` | Máy chủ | ICMP, CPU, memory, disk, uptime |
| `ip_camera` | Camera IP | ICMP, stream status |
| `controller` | Controller | ICMP, API status, managed devices |
| `other` | Thiết bị khác | ICMP baseline |

### 9.6 Capability Matrix

| Capability | ICMP | SNMPv2c | SNMPv3 | SSH | REST API |
| --- | --- | --- | --- | --- | --- |
| Online/offline | Yes | Yes | Yes | Yes | Yes |
| Latency | Yes | Partial | Partial | Partial | Partial |
| Packet loss | Yes | No | No | No | No |
| CPU/memory | No | Yes | Yes | Yes | Yes |
| Interface traffic | No | Yes | Yes | Partial | Yes |
| Vendor inventory | No | Yes | Yes | Yes | Yes |
| Secure auth | N/A | Weak | Strong | Strong | Strong |
| Recommended production use | Baseline | Legacy only | Preferred | Controlled | Preferred when available |

### 9.7 Vendor Support

Initial vendor profiles:

| Vendor | Device examples | Protocol priority |
| --- | --- | --- |
| Cisco | Catalyst, ISR, ASA | SNMPv3, SSH, REST where available |
| Ubiquiti | UniFi switches/APs | Controller API, ICMP |
| MikroTik | RouterOS | SNMPv3, API/SSH |
| Aruba | AP, switches | SNMPv3, controller API |
| Fortinet | FortiGate | SNMPv3, REST API |
| Juniper | EX/SRX | SNMPv3, NETCONF future |
| Generic | Any IP device | ICMP, SNMP |

### 9.8 Bulk Operations

Bulk operations require permission and audit logs.

| Action | Vietnamese | Safety rule |
| --- | --- | --- |
| Assign collector | Gán Collector | Show affected count |
| Assign site | Gán site | Validate site access |
| Apply tags | Gán tag | Merge or replace option |
| Change monitoring profile | Đổi cấu hình giám sát | Preview interval impact |
| Enable monitoring | Bật giám sát | Start next scheduler cycle |
| Disable monitoring | Tắt giám sát | Require reason |
| Delete devices | Xóa thiết bị | Soft delete; require confirmation |

### 9.9 Import / Export

CSV import columns:

```csv
name,hostname,type,vendor,model,managementIp,site,tags,monitoringProfile,collector
Core-SW-HN-01,core-sw-hn-01,switch,Cisco,Catalyst 9300,10.10.1.2,Hà Nội,"core;production",Standard,collector_hanoi_01
```

Import UX:

1. Upload CSV.
2. Preview rows.
3. Validate duplicates and IP format.
4. Show errors by row.
5. Allow download of error report.
6. Confirm import.
7. Create audit log and import job record.

Vietnamese labels:

- `Tải file CSV`
- `Xem trước dữ liệu`
- `Dòng lỗi`
- `Tải báo cáo lỗi`
- `Xác nhận nhập dữ liệu`

---

## 10. Device Detail Experience

Vietnamese title example: **Chi tiết thiết bị: Core-SW-HN-01**  
English title example: **Device Detail: Core-SW-HN-01**

### 10.1 Header

The header must show:

- Device name.
- Type icon.
- Status badge.
- Management IP.
- Site.
- Collector.
- Last seen.
- Quick actions: `Sửa`, `Kiểm tra kết nối`, `Tạo bảo trì`, `Xem topology`.

### 10.2 Metric Cards

| Vietnamese | English | Notes |
| --- | --- | --- |
| Độ trễ | Latency | Latest, p95, trend |
| Mất gói | Packet Loss | Latest and threshold |
| CPU | CPU | SNMP/API only |
| RAM | Memory | SNMP/API only |
| Uptime | Uptime | SNMP/API only |
| Lưu lượng | Traffic | Interface aggregation |
| Điểm sức khỏe | Health Score | Per-device score |

### 10.3 Tabs

| Tab | Vietnamese | Content |
| --- | --- | --- |
| Overview | Tổng quan | Metrics, state, recent timeline |
| Interfaces | Interface | Ports, traffic, errors, status |
| Telemetry | Telemetry | Raw and rollup charts |
| Alerts | Cảnh báo | Active and historical alerts |
| Logs | Nhật ký | Device events and audit changes |
| Configuration | Cấu hình | Monitoring profile, credentials reference |
| Topology | Topology | Connected devices and site context |

### 10.4 Device Timeline

Timeline events:

- Device created.
- Monitoring profile changed.
- Status changed.
- Alert opened/acknowledged/resolved.
- Maintenance window started/ended.
- Collector reassigned.
- Credentials updated.

Vietnamese examples:

```txt
22:14 - Thiết bị chuyển sang trạng thái Mất kết nối
22:15 - Tạo cảnh báo: Thiết bị mất kết nối
22:17 - Nguyễn Văn An đã xác nhận cảnh báo
22:42 - Đã khôi phục kết nối
22:43 - Cảnh báo được đánh dấu đã xử lý
```

---

## 11. Monitoring and Collector Architecture

Collectors are distributed worker agents responsible for polling devices and publishing telemetry. The backend controls configuration, storage, alert evaluation, and realtime fanout.

### 11.1 High-Level Architecture

```txt
+-------------------+        HTTPS/WSS        +----------------------+
| React Web App     | <---------------------> | Node.js API Gateway  |
+-------------------+                         +----------+-----------+
                                                         |
                                                         v
                         +----------------------+  +------+--------+
                         | Socket.IO Gateway    |  | Auth/RBAC     |
                         +----------+-----------+  +------+--------+
                                    |                     |
                                    v                     v
 +-------------+    Redis Streams   +----------------------+    MongoDB
 | Collectors  | -----------------> | Ingestion Workers    | -> Time-series
 | ICMP/SNMP   | <----------------- | Config/Job Service   | -> State/Alerts
 +-------------+    Job commands    +----------------------+
                                    |
                                    v
                         +----------------------+
                         | Alert Engine         |
                         +----------------------+
```

### 11.2 Collector Responsibilities

- Register securely with backend.
- Fetch assigned device configuration.
- Execute polling jobs by protocol.
- Normalize results into telemetry envelopes.
- Send heartbeat and health metrics.
- Buffer temporarily during network interruption.
- Never store raw credentials in logs.
- Support version reporting and controlled upgrades.

### 11.3 Collector Health Metrics

| Metric | Vietnamese label | Purpose |
| --- | --- | --- |
| `heartbeatAgeSeconds` | Tuổi heartbeat | Detect collector down |
| `assignedDeviceCount` | Số thiết bị quản lý | Capacity planning |
| `pollSuccessRate` | Tỉ lệ poll thành công | Collector quality |
| `queueLagMs` | Độ trễ hàng đợi | Backpressure detection |
| `avgPollDurationMs` | Thời gian poll trung bình | Performance |
| `cpuPct` | CPU Collector | Agent host health |
| `memoryPct` | RAM Collector | Agent host health |
| `version` | Phiên bản | Upgrade tracking |

### 11.4 Polling Strategy

| Profile | Interval | Use case |
| --- | ---: | --- |
| Critical | 15s | Core network devices |
| Standard | 60s | Normal switches/APs |
| Low frequency | 300s | Printers, cameras, low priority |
| Maintenance | 300-900s | Reduced noise during maintenance |

Rules:

- Polling interval must never be lower than collector capacity.
- Scheduler must apply jitter to avoid synchronized spikes.
- Missed polls are marked as missing samples, not zero values.
- Device status changes require consecutive failures to avoid flapping.

### 11.5 State Determination

Device state is derived from latest telemetry and alert context.

```txt
online:
  last successful ICMP/SNMP/API poll within expected interval

offline:
  consecutive failure count >= monitoringProfile.offlineFailureThreshold

warning:
  online but one or more warning thresholds breached

critical:
  offline or critical threshold breached

unknown:
  no usable telemetry yet or collector unavailable

maintenance:
  device is inside active maintenance window
```

### 11.6 Telemetry Envelope

```json
{
  "eventId": "evt_01HZY9K5DF7R1B8Z3Q9M8T7N2A",
  "tenantId": "tenant_default",
  "collectorId": "collector_hanoi_01",
  "deviceId": "dev_core_sw_hn_01",
  "protocol": "icmp",
  "metric": "latency_ms",
  "value": 28.4,
  "unit": "ms",
  "status": "ok",
  "quality": "fresh",
  "sampledAt": "2026-05-17T15:30:12.000Z",
  "receivedAt": "2026-05-17T15:30:12.380Z",
  "meta": {
    "siteId": "site_hanoi_hq",
    "deviceType": "switch",
    "vendor": "Cisco"
  }
}
```

### 11.7 Redis Streams

Recommended streams:

| Stream | Producer | Consumer | Purpose |
| --- | --- | --- | --- |
| `telemetry.raw` | Collectors | Ingestion workers | Raw normalized telemetry |
| `device.state` | State engine | API/socket workers | Device state updates |
| `alerts.events` | Alert engine | Notification/socket workers | Alert lifecycle events |
| `collector.heartbeat` | Collectors | Collector service | Collector health |
| `jobs.collector.commands` | Backend | Collectors | Config reload, test poll |
| `audit.events` | API/services | Audit writer | Immutable audit trail |

Backpressure rules:

- Track pending entries per consumer group.
- Alert when queue lag exceeds profile threshold.
- Ingestion workers must be horizontally scalable.
- Dead-letter invalid telemetry to `telemetry.dead_letter`.

---

## 12. Realtime System

Realtime behavior is a core product feature. It must be reliable, observable, and recoverable.

### 12.1 Socket.IO Architecture

```txt
React Client
  |
  | WSS + JWT access token
  v
Socket.IO Gateway Pods
  |
  | Redis adapter for room fanout
  v
Redis Pub/Sub / Streams
  |
  v
API services, ingestion workers, alert engine
```

Requirements:

- Use WSS in production.
- Authenticate socket connection with short-lived JWT.
- Revalidate user permissions on room subscription.
- Use Redis adapter for multi-pod Socket.IO scaling.
- Use sequence numbers for recovery.
- Send heartbeat/ping state to client.

### 12.2 Room Strategy

| Room | Example | Subscribers |
| --- | --- | --- |
| Tenant | `tenant:tenant_default` | Global admins |
| Site | `site:site_hanoi_hq` | Operators scoped to site |
| Dashboard | `dashboard:tenant_default` | Dashboard pages |
| NOC | `noc:tenant_default` | Wallboard screens |
| Device | `device:dev_core_sw_hn_01` | Device detail page |
| Alerts | `alerts:tenant_default` | Alert center |
| Collector | `collector:collector_hanoi_01` | Collector detail page |
| User | `user:user_123` | Personal notifications |

### 12.3 Event Naming Standard

Use lowercase domains and dot-qualified actions:

```txt
domain:entity.action
```

Examples:

- `device:state.updated`
- `telemetry:sample.created`
- `alert:created`
- `alert:updated`
- `incident:updated`
- `collector:heartbeat.received`
- `dashboard:summary.updated`
- `socket:sync.required`

Do not use inconsistent variants like `deviceState`, `device-state`, `DeviceStateUpdated`.

### 12.4 Event Envelope

All Socket.IO server events use this envelope:

```json
{
  "eventId": "evt_01HZY9NGG20FM2A9S8B4WFPSPX",
  "event": "device:state.updated",
  "version": 1,
  "tenantId": "tenant_default",
  "sequence": 184422,
  "occurredAt": "2026-05-17T15:35:04.120Z",
  "data": {
    "deviceId": "dev_core_sw_hn_01",
    "name": "Core-SW-HN-01",
    "status": "online",
    "latencyMs": 24,
    "packetLossPct": 0,
    "healthScore": 96,
    "lastSeenAt": "2026-05-17T15:35:03.980Z"
  }
}
```

### 12.5 Client Emits

| Event | Payload | Purpose |
| --- | --- | --- |
| `dashboard:subscribe` | `{ "scope": { "siteIds": [] } }` | Subscribe dashboard |
| `noc:subscribe` | `{ "scope": "tenant_default" }` | Subscribe wallboard |
| `device:subscribe` | `{ "deviceId": "..." }` | Subscribe device detail |
| `alerts:subscribe` | `{ "status": ["open", "acknowledged"] }` | Subscribe alert center |
| `socket:resume` | `{ "lastSequence": 184000 }` | Recover missed events |
| `language:changed` | `{ "language": "vi" }` | Optional user preference sync |

### 12.6 Recovery and Retry

Client behavior:

1. Show `Đang live` when connected.
2. If disconnected, show `Mất kết nối realtime. Đang thử kết nối lại...`.
3. Keep visible data, but mark freshness as stale after threshold.
4. Retry with exponential backoff and jitter.
5. On reconnect, emit `socket:resume` with last sequence.
6. If server cannot replay, receive `socket:sync.required`.
7. Client refetches REST snapshot and resumes realtime.

Server behavior:

- Store recent event sequence per tenant in Redis for short replay window.
- Do not replay unauthorized rooms.
- Emit `socket:sync.required` when gap cannot be recovered.
- Rate-limit subscriptions per socket.

### 12.7 Realtime UX States

| State | Vietnamese label | UI behavior |
| --- | --- | --- |
| Connected | Đang live | Green dot, last update time |
| Reconnecting | Đang kết nối lại | Amber dot, data remains visible |
| Disconnected | Mất kết nối realtime | Persistent banner, stale labels |
| Degraded | Realtime không ổn định | Warning tooltip with reason |
| Sync required | Cần đồng bộ lại dữ liệu | Auto refetch snapshot |

---

## 13. Alerting and Incident Management

### 13.1 Alert Center

Vietnamese title: **Trung tâm cảnh báo**  
English title: **Alert Center**

The alert center is an operator queue, not just a table.

Required sections:

- Severity tabs: `Tất cả`, `Nghiêm trọng`, `Cao`, `Cảnh báo`, `Thông tin`.
- Status filters: `Đang mở`, `Đã xác nhận`, `Đã xử lý`, `Đã tạm ẩn`.
- Scope filters: site, device type, collector, tag.
- Grouping: by site, device, rule, incident, severity.
- Bulk actions: acknowledge, assign, suppress, export.

### 13.2 Alert Severity

| Severity | Vietnamese | Use case | SLA target |
| --- | --- | --- | --- |
| `info` | Thông tin | Non-impacting event | No SLA |
| `warning` | Cảnh báo | Degradation or early threshold | Review within 4h |
| `high` | Cao | Impact likely or important device affected | Acknowledge within 30m |
| `critical` | Nghiêm trọng | Outage or major business impact | Acknowledge within 5m |

### 13.3 Alert Lifecycle

```txt
open
  -> acknowledged
  -> resolved

open
  -> suppressed
  -> open

open / acknowledged
  -> escalated
  -> resolved
```

Vietnamese labels:

| State | Label |
| --- | --- |
| `open` | Đang mở |
| `acknowledged` | Đã xác nhận |
| `resolved` | Đã xử lý |
| `suppressed` | Đã tạm ẩn |
| `escalated` | Đã leo thang |

### 13.4 Alert Deduplication

Deduplication key:

```txt
tenantId + ruleId + deviceId + metric + severity
```

Rules:

- If an identical alert is already open, increment `occurrenceCount`.
- Update `lastOccurredAt` and append timeline event.
- Do not create duplicate open alerts for flapping checks.
- Flapping devices can be grouped into an incident.

### 13.5 Alert Grouping

Alert grouping creates incidents when multiple alerts likely share a cause.

Grouping signals:

- Same site.
- Same upstream device.
- Same collector.
- Same time window.
- Same rule type.
- Topology dependency.

Incident example:

```json
{
  "title": "Mất kết nối tại site Hà Nội",
  "severity": "critical",
  "status": "open",
  "siteId": "site_hanoi_hq",
  "alertIds": ["alert_001", "alert_002", "alert_003"],
  "impactedDeviceCount": 18,
  "probableRootCauseDeviceId": "dev_core_router_hn_01"
}
```

### 13.6 Escalation Flow

Escalation policy:

| Condition | Action |
| --- | --- |
| Critical alert unacknowledged for 5 minutes | Notify on-call operator |
| Critical alert unacknowledged for 15 minutes | Escalate to network administrator |
| High alert open for 60 minutes | Escalate to site owner |
| Collector down for 10 minutes | Alert system administrator |
| Repeated flapping within 30 minutes | Create incident and mark device unstable |

Vietnamese UI:

- `Leo thang cảnh báo`
- `Gán người xử lý`
- `Người trực ca`
- `Thời hạn xác nhận`

### 13.7 Maintenance Windows

Maintenance suppresses expected alerts while retaining telemetry.

Fields:

- `Tên lịch bảo trì`
- `Phạm vi áp dụng`
- `Thiết bị / Site / Tag`
- `Thời gian bắt đầu`
- `Thời gian kết thúc`
- `Lặp lại`
- `Lý do`
- `Người phê duyệt`

Rules:

- Critical collector failures should still be visible during broad maintenance.
- Maintenance actions are audited.
- Suppressed alerts are shown in a separate timeline section.
- Device badge changes to `Bảo trì`.

### 13.8 Alert Detail

Vietnamese title: **Chi tiết cảnh báo**

Required information:

- `Tên cảnh báo`
- `Mức độ`
- `Thiết bị liên quan`
- `Site`
- `Metric lỗi`
- `Giá trị hiện tại`
- `Ngưỡng cảnh báo`
- `Thời gian phát hiện`
- `Cập nhật gần nhất`
- `Trạng thái xử lý`
- `Người xác nhận`
- `Người xử lý`
- `Ghi chú xử lý`
- `Timeline sự kiện`

Example:

```txt
Tên cảnh báo: Độ trễ cao
Thiết bị: Aruba AP-315
Mức độ: Cảnh báo
Giá trị hiện tại: 180 ms
Ngưỡng: > 100 ms trong 5 phút
Trạng thái: Đang mở
```

---

## 14. Reports and Analytics

### 14.1 Reports Page

Vietnamese title: **Báo cáo**  
English title: **Reports**

Report types:

| Vietnamese | English | Output |
| --- | --- | --- |
| Báo cáo uptime | Uptime Report | PDF, Excel |
| Báo cáo SLA | SLA Report | PDF, Excel |
| Báo cáo thiết bị mất kết nối | Offline Device Report | Excel, CSV |
| Báo cáo cảnh báo | Alert Report | PDF, Excel |
| Báo cáo độ trễ | Latency Report | PDF, Excel |
| Báo cáo mất gói | Packet Loss Report | PDF, Excel |
| Báo cáo lưu lượng | Traffic Report | PDF, Excel |
| Báo cáo sức khỏe thiết bị | Device Health Report | PDF |
| Báo cáo Collector | Collector Report | PDF, Excel |

### 14.2 Report Builder UX

Fields:

- `Loại báo cáo`
- `Khoảng thời gian`
- `Site`
- `Nhóm thiết bị`
- `Tag`
- `Định dạng`
- `Lên lịch gửi`
- `Người nhận`

Actions:

- `Tạo báo cáo`
- `Xem trước`
- `Tải xuống PDF`
- `Xuất Excel`
- `Xuất CSV`
- `Lên lịch`

### 14.3 Report Generation

Reports should be asynchronous for large datasets:

1. User submits report request.
2. API creates `report_runs` document.
3. Worker aggregates data from rollup collections.
4. Worker writes artifact to object storage or filesystem volume.
5. Socket.IO emits `report:ready`.
6. UI shows notification and download action.

Socket event:

```json
{
  "event": "report:ready",
  "data": {
    "reportRunId": "rr_001",
    "title": "Báo cáo uptime - Tháng 05/2026",
    "format": "pdf",
    "downloadUrl": "/api/v1/reports/runs/rr_001/download"
  }
}
```

---

## 15. Frontend Architecture

### 15.1 Recommended Stack

| Layer | Recommendation |
| --- | --- |
| Framework | React + TypeScript |
| Build | Vite |
| Routing | React Router |
| Server state | TanStack Query |
| Local UI state | Zustand or Redux Toolkit |
| Forms | React Hook Form + Zod |
| Charts | Apache ECharts or Recharts for standard charts; Cytoscape/React Flow for topology |
| Tables | TanStack Table |
| i18n | i18next + react-i18next |
| Realtime | socket.io-client |
| Styling | Tailwind CSS with design tokens or CSS modules |
| Icons | lucide-react |
| Testing | Vitest, Testing Library, Playwright |

### 15.2 Folder Structure

```txt
frontend/
  src/
    app/
      App.tsx
      router.tsx
      providers.tsx
      config.ts
    assets/
    components/
      core/
      layout/
      charts/
      tables/
      feedback/
    features/
      auth/
      dashboard/
      devices/
      monitoring/
      topology/
      alerts/
      incidents/
      collectors/
      reports/
      users/
      roles/
      audit-logs/
      settings/
    hooks/
    i18n/
      locales/
        vi.json
        en.json
      index.ts
    lib/
      api/
      realtime/
      auth/
      permissions/
      theme/
      validation/
    styles/
      tokens.css
      global.css
    types/
```

### 15.3 Frontend Data Flow

```txt
Page component
  -> route loader / TanStack Query
  -> API client with auth interceptor
  -> REST snapshot
  -> Socket.IO subscription
  -> query cache updates
  -> UI render
```

Rules:

- REST provides initial truth snapshot.
- Socket.IO applies incremental updates.
- If socket gap occurs, invalidate query and refetch.
- Components must not call raw `fetch`; use centralized API client.
- Permission checks must happen in route guards and component action rendering.

### 15.4 API Client

Required behavior:

- Attach access token.
- Attach `X-Request-ID`.
- Attach `Accept-Language`.
- Retry idempotent GET requests on transient network errors.
- Refresh access token once when receiving 401 due to expiration.
- Do not retry unsafe mutations automatically unless idempotency key is provided.

### 15.5 Realtime Client Layer

```ts
type RealtimeStatus = "connected" | "reconnecting" | "disconnected" | "degraded";

interface RealtimeEvent<T> {
  eventId: string;
  event: string;
  version: number;
  tenantId: string;
  sequence: number;
  occurredAt: string;
  data: T;
}
```

The realtime client should expose:

- `connect()`
- `disconnect()`
- `subscribeToDashboard(scope)`
- `subscribeToDevice(deviceId)`
- `subscribeToAlerts(filters)`
- `resume(lastSequence)`
- `onStatusChange(callback)`

### 15.6 Theme System

Theme modes:

- `dark`: default enterprise NOC mode.
- `light`: optional business/reporting mode.
- `system`: follows OS preference.

Vietnamese labels:

- `Giao diện tối`
- `Giao diện sáng`
- `Theo hệ thống`

Theme must be token-based. Components must not hardcode raw colors except for chart palettes defined in token files.

### 15.7 Role-Based UI Rendering

Rules:

- Hide navigation items when user lacks permission.
- Disable actions with tooltip when view is allowed but action is not.
- Never rely on frontend RBAC alone; backend enforces all permissions.
- Use permission constants, not string literals scattered in components.

Example:

```ts
const Permission = {
  DeviceRead: "device:read",
  DeviceCreate: "device:create",
  DeviceUpdate: "device:update",
  DeviceDelete: "device:delete",
  AlertAcknowledge: "alert:acknowledge",
  AlertResolve: "alert:resolve"
} as const;
```

---

## 16. Backend Architecture

### 16.1 Recommended Stack

| Layer | Recommendation |
| --- | --- |
| Runtime | Node.js LTS |
| Language | TypeScript |
| Framework | NestJS preferred for enterprise modularity; Express adapter acceptable |
| Database | MongoDB replica set |
| Cache/queue | Redis |
| Realtime | Socket.IO |
| Validation | Zod or class-validator |
| Auth | JWT access tokens, refresh token rotation, MFA |
| Logging | Pino structured logs |
| Metrics | Prometheus |
| Tracing | OpenTelemetry |
| API docs | OpenAPI 3.1 |

### 16.2 Service Modules

```txt
backend/
  src/
    main.ts
    config/
    common/
      guards/
      filters/
      interceptors/
      validators/
      pagination/
    modules/
      auth/
      users/
      roles/
      devices/
      sites/
      topology/
      monitoring-profiles/
      collectors/
      telemetry/
      dashboard/
      alerts/
      incidents/
      reports/
      audit-logs/
      settings/
      realtime/
      notifications/
    workers/
      telemetry-ingestion.worker.ts
      alert-evaluation.worker.ts
      rollup.worker.ts
      report.worker.ts
      audit-log.worker.ts
```

### 16.3 Service Responsibilities

| Service | Responsibility |
| --- | --- |
| Auth Service | Login, MFA, sessions, token rotation |
| User Service | User CRUD, preferences, account state |
| RBAC Service | Roles, permissions, policy checks |
| Device Service | Inventory, lifecycle, credentials reference |
| Collector Service | Registration, heartbeat, assignment, config |
| Telemetry Service | Ingestion, normalization, latest state, rollups |
| Alert Engine | Rule evaluation, deduplication, lifecycle |
| Incident Service | Group alerts, timeline, ownership |
| Dashboard Service | Aggregated summaries and health scores |
| Report Service | Async report generation |
| Audit Service | Immutable audit records |
| Realtime Gateway | Socket auth, rooms, event fanout |

### 16.4 API Versioning

- Public API prefix: `/api/v1`.
- Internal collector API prefix: `/internal/v1`.
- Breaking changes require `/api/v2`.
- Include API version in OpenAPI spec and client SDK.
- Internal APIs require collector authentication and must not be exposed publicly.

### 16.5 Validation and Error Handling

Response error envelope:

```json
{
  "error": {
    "code": "DEVICE_IP_DUPLICATE",
    "message": "Địa chỉ IP đã tồn tại.",
    "details": {
      "field": "managementIp"
    },
    "requestId": "req_01HZY9R7XT6V7"
  }
}
```

Rules:

- Validate all request bodies.
- Validate query parameters and pagination limits.
- Sanitize user-controlled strings in logs.
- Return localized messages when possible.
- Keep machine-readable error codes stable.

### 16.6 Background Workers

| Worker | Trigger | Output |
| --- | --- | --- |
| Telemetry ingestion | Redis stream `telemetry.raw` | `telemetry_samples`, `device_states` |
| Alert evaluation | Telemetry/state updates | `alerts`, `alert_events` |
| Rollup | Schedule every minute | `telemetry_rollups_5m`, `telemetry_rollups_1h` |
| Report generation | Report request | Report artifact and `report_runs` |
| Audit writer | `audit.events` | `audit_logs` |
| Collector health | Schedule every 30s | Collector state and collector-down alerts |

---

## 17. API Design

### 17.1 API Conventions

Base URL:

```txt
/api/v1
```

Headers:

| Header | Required | Purpose |
| --- | --- | --- |
| `Authorization: Bearer <token>` | Yes except login | Auth |
| `Accept-Language: vi` | Optional | Localized messages |
| `X-Request-ID` | Recommended | Traceability |
| `Idempotency-Key` | Mutations when safe retry is needed | Duplicate prevention |

Pagination:

```txt
?page=1&pageSize=50&sort=-createdAt
```

List response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 128,
    "totalPages": 3
  },
  "requestId": "req_001"
}
```

### 17.2 Authentication API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/mfa/verify` | Verify MFA |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/logout` | Revoke current session |
| `POST` | `/auth/logout-all` | Revoke all sessions |
| `GET` | `/me` | Current user profile |
| `PATCH` | `/me/preferences` | Language/theme preferences |

Login request:

```json
{
  "username": "admin@example.com",
  "password": "••••••••",
  "rememberMe": true
}
```

Login response:

```json
{
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "opaque_refresh_token",
    "expiresIn": 900,
    "requiresMfa": false,
    "user": {
      "id": "user_001",
      "fullName": "Nguyễn Văn An",
      "language": "vi",
      "permissions": ["device:read", "alert:acknowledge"]
    }
  }
}
```

### 17.3 Device API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/devices` | List devices |
| `POST` | `/devices` | Create device |
| `GET` | `/devices/:deviceId` | Device detail |
| `PATCH` | `/devices/:deviceId` | Update device |
| `DELETE` | `/devices/:deviceId` | Soft delete device |
| `POST` | `/devices/:deviceId/test-connection` | Run test poll |
| `GET` | `/devices/:deviceId/telemetry` | Device telemetry |
| `GET` | `/devices/:deviceId/alerts` | Device alerts |
| `GET` | `/devices/:deviceId/timeline` | Device timeline |
| `POST` | `/devices/import` | Import CSV |
| `GET` | `/devices/export` | Export CSV |

Create device request:

```json
{
  "name": "Core-SW-HN-01",
  "hostname": "core-sw-hn-01",
  "type": "switch",
  "vendor": "Cisco",
  "model": "Catalyst 9300",
  "managementIp": "10.10.1.2",
  "siteId": "site_hanoi_hq",
  "collectorId": "collector_hanoi_01",
  "monitoringProfileId": "profile_standard",
  "tags": ["core", "hanoi", "production"],
  "credentialProfileId": "cred_snmpv3_core"
}
```

### 17.4 Dashboard API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/dashboard/summary` | KPI summary |
| `GET` | `/dashboard/health` | Health score details |
| `GET` | `/dashboard/sites` | Site health summary |
| `GET` | `/dashboard/traffic` | Traffic chart |
| `GET` | `/dashboard/latency` | Latency chart |
| `GET` | `/dashboard/packet-loss` | Packet loss chart |
| `GET` | `/dashboard/top-impacted-devices` | Top impacted devices |
| `GET` | `/dashboard/recent-incidents` | Recent incidents |

### 17.5 Alert API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/alerts` | List alerts |
| `GET` | `/alerts/:alertId` | Alert detail |
| `POST` | `/alerts/:alertId/acknowledge` | Acknowledge |
| `POST` | `/alerts/:alertId/resolve` | Resolve |
| `POST` | `/alerts/:alertId/suppress` | Suppress |
| `POST` | `/alerts/:alertId/assign` | Assign |
| `POST` | `/alerts/:alertId/notes` | Add note |
| `GET` | `/alert-rules` | List rules |
| `POST` | `/alert-rules` | Create rule |
| `PATCH` | `/alert-rules/:ruleId` | Update rule |
| `DELETE` | `/alert-rules/:ruleId` | Disable/delete rule |

Resolve request:

```json
{
  "resolutionNote": "Đã khôi phục kết nối uplink tại Core-SW-HN-01.",
  "rootCause": "uplink_failure"
}
```

### 17.6 Collector API

Public admin endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/collectors` | List collectors |
| `GET` | `/collectors/:collectorId` | Collector detail |
| `POST` | `/collectors/:collectorId/rotate-token` | Rotate collector token |
| `POST` | `/collectors/:collectorId/restart-request` | Request restart command |
| `GET` | `/collectors/:collectorId/assigned-devices` | Collector devices |

Internal collector endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/internal/v1/collectors/register` | Initial registration |
| `POST` | `/internal/v1/collectors/heartbeat` | Heartbeat |
| `GET` | `/internal/v1/collectors/config` | Fetch assigned config |
| `POST` | `/internal/v1/telemetry/batch` | Submit telemetry batch |
| `GET` | `/internal/v1/collectors/commands` | Fetch commands |

### 17.7 Audit API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/audit-logs` | Search audit logs |
| `GET` | `/audit-logs/:auditId` | Audit detail |
| `GET` | `/audit-logs/export` | Export audit data |

---

## 18. Database Design

MongoDB must be designed for high-write telemetry, fast latest-state reads, and auditable operational changes.

### 18.1 Collection Overview

| Collection | Purpose | Retention |
| --- | --- | --- |
| `users` | User accounts and preferences | Permanent |
| `roles` | RBAC roles | Permanent |
| `sessions` | Active refresh token sessions | TTL |
| `sites` | Physical/logical locations | Permanent |
| `device_groups` | Static/dynamic groups | Permanent |
| `devices` | Device inventory | Permanent with soft delete |
| `device_credentials` | Encrypted credential references | Permanent, rotated |
| `monitoring_profiles` | Poll intervals and thresholds | Permanent |
| `device_states` | Latest state per device | Permanent latest state |
| `device_interfaces` | Interface inventory and latest state | Permanent/latest |
| `telemetry_samples` | Raw time-series telemetry | TTL 30-90 days |
| `telemetry_rollups_5m` | 5-minute aggregates | 180 days |
| `telemetry_rollups_1h` | Hourly aggregates | 2 years |
| `alerts` | Current and historical alerts | 2+ years |
| `alert_events` | Alert timeline events | 2+ years |
| `alert_rules` | Alert rule definitions | Permanent |
| `incidents` | Grouped alerts/incidents | 2+ years |
| `maintenance_windows` | Maintenance schedules | 2+ years |
| `collectors` | Collector registry and health | Permanent |
| `collector_jobs` | Collector commands/jobs | 30 days |
| `reports` | Report templates | Permanent |
| `report_runs` | Generated report jobs | 1 year |
| `audit_logs` | Security and admin audit | 3-7 years |
| `settings` | System settings | Permanent |
| `localization_overrides` | Custom UI labels if needed | Permanent |
| `notification_channels` | Email/webhook integrations | Permanent |
| `topology_links` | Device relationships | Permanent/latest |

### 18.2 `devices`

```json
{
  "_id": "dev_core_sw_hn_01",
  "tenantId": "tenant_default",
  "name": "Core-SW-HN-01",
  "hostname": "core-sw-hn-01",
  "type": "switch",
  "vendor": "Cisco",
  "model": "Catalyst 9300",
  "serialNumber": "FOC1234XYZ",
  "managementIp": "10.10.1.2",
  "macAddress": "00:1A:2B:3C:4D:5E",
  "siteId": "site_hanoi_hq",
  "collectorId": "collector_hanoi_01",
  "monitoringProfileId": "profile_standard",
  "credentialProfileIds": ["cred_snmpv3_core"],
  "tags": ["core", "production", "hanoi"],
  "lifecycle": "active",
  "createdAt": "2026-05-17T15:00:00.000Z",
  "updatedAt": "2026-05-17T15:00:00.000Z",
  "deletedAt": null
}
```

Indexes:

```js
db.devices.createIndex({ tenantId: 1, managementIp: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
db.devices.createIndex({ tenantId: 1, siteId: 1, type: 1 });
db.devices.createIndex({ tenantId: 1, collectorId: 1 });
db.devices.createIndex({ tenantId: 1, tags: 1 });
db.devices.createIndex({ tenantId: 1, name: "text", hostname: "text", managementIp: "text" });
```

### 18.3 `device_states`

```json
{
  "_id": "state_dev_core_sw_hn_01",
  "tenantId": "tenant_default",
  "deviceId": "dev_core_sw_hn_01",
  "status": "online",
  "healthScore": 96,
  "latencyMs": 24,
  "packetLossPct": 0,
  "cpuPct": 18,
  "memoryPct": 42,
  "lastSeenAt": "2026-05-17T15:35:03.980Z",
  "lastTelemetryAt": "2026-05-17T15:35:03.980Z",
  "consecutiveFailures": 0,
  "activeAlertCount": 0,
  "updatedAt": "2026-05-17T15:35:04.120Z"
}
```

Indexes:

```js
db.device_states.createIndex({ tenantId: 1, deviceId: 1 }, { unique: true });
db.device_states.createIndex({ tenantId: 1, status: 1, updatedAt: -1 });
db.device_states.createIndex({ tenantId: 1, healthScore: 1 });
```

### 18.4 `telemetry_samples`

Use MongoDB time-series collection:

```js
db.createCollection("telemetry_samples", {
  timeseries: {
    timeField: "ts",
    metaField: "meta",
    granularity: "seconds"
  },
  expireAfterSeconds: 7776000
});
```

Sample document:

```json
{
  "ts": "2026-05-17T15:35:03.980Z",
  "meta": {
    "tenantId": "tenant_default",
    "deviceId": "dev_core_sw_hn_01",
    "siteId": "site_hanoi_hq",
    "metric": "latency_ms",
    "protocol": "icmp"
  },
  "value": 24,
  "unit": "ms",
  "quality": "fresh",
  "collectorId": "collector_hanoi_01",
  "receivedAt": "2026-05-17T15:35:04.120Z"
}
```

Indexes:

```js
db.telemetry_samples.createIndex({ "meta.tenantId": 1, "meta.deviceId": 1, "meta.metric": 1, ts: -1 });
db.telemetry_samples.createIndex({ "meta.tenantId": 1, "meta.siteId": 1, "meta.metric": 1, ts: -1 });
```

### 18.5 `alerts`

```json
{
  "_id": "alert_001",
  "tenantId": "tenant_default",
  "ruleId": "rule_latency_high",
  "incidentId": "incident_001",
  "deviceId": "dev_ap_hn_315",
  "siteId": "site_hanoi_hq",
  "title": "Độ trễ cao",
  "severity": "warning",
  "status": "open",
  "metric": "latency_ms",
  "currentValue": 180,
  "threshold": {
    "operator": "gt",
    "value": 100,
    "durationSeconds": 300
  },
  "dedupKey": "tenant_default:rule_latency_high:dev_ap_hn_315:latency_ms:warning",
  "occurrenceCount": 4,
  "firstOccurredAt": "2026-05-17T15:20:00.000Z",
  "lastOccurredAt": "2026-05-17T15:35:00.000Z",
  "acknowledgedBy": null,
  "acknowledgedAt": null,
  "resolvedBy": null,
  "resolvedAt": null,
  "createdAt": "2026-05-17T15:20:00.000Z",
  "updatedAt": "2026-05-17T15:35:00.000Z"
}
```

Indexes:

```js
db.alerts.createIndex({ tenantId: 1, status: 1, severity: 1, lastOccurredAt: -1 });
db.alerts.createIndex({ tenantId: 1, deviceId: 1, status: 1 });
db.alerts.createIndex({ tenantId: 1, dedupKey: 1, status: 1 });
db.alerts.createIndex({ tenantId: 1, incidentId: 1 });
```

### 18.6 `collectors`

```json
{
  "_id": "collector_hanoi_01",
  "tenantId": "tenant_default",
  "name": "Collector Hà Nội 01",
  "siteId": "site_hanoi_hq",
  "version": "1.0.0",
  "status": "online",
  "lastHeartbeatAt": "2026-05-17T15:35:00.000Z",
  "assignedDeviceCount": 240,
  "health": {
    "cpuPct": 22,
    "memoryPct": 48,
    "queueLagMs": 120,
    "pollSuccessRate": 99.2
  },
  "registeredAt": "2026-05-01T08:00:00.000Z",
  "updatedAt": "2026-05-17T15:35:00.000Z"
}
```

Indexes:

```js
db.collectors.createIndex({ tenantId: 1, status: 1 });
db.collectors.createIndex({ tenantId: 1, siteId: 1 });
db.collectors.createIndex({ tenantId: 1, lastHeartbeatAt: 1 });
```

### 18.7 `audit_logs`

Audit logs are append-only.

```json
{
  "_id": "audit_001",
  "tenantId": "tenant_default",
  "actorUserId": "user_001",
  "actorName": "Nguyễn Văn An",
  "action": "device.update",
  "resourceType": "device",
  "resourceId": "dev_core_sw_hn_01",
  "result": "success",
  "ipAddress": "203.0.113.10",
  "userAgent": "Mozilla/5.0",
  "requestId": "req_001",
  "changes": {
    "collectorId": {
      "from": "collector_old",
      "to": "collector_hanoi_01"
    }
  },
  "createdAt": "2026-05-17T15:45:00.000Z"
}
```

Indexes:

```js
db.audit_logs.createIndex({ tenantId: 1, createdAt: -1 });
db.audit_logs.createIndex({ tenantId: 1, actorUserId: 1, createdAt: -1 });
db.audit_logs.createIndex({ tenantId: 1, action: 1, createdAt: -1 });
db.audit_logs.createIndex({ tenantId: 1, resourceType: 1, resourceId: 1, createdAt: -1 });
```

### 18.8 Retention Strategy

| Data | Retention | Notes |
| --- | ---: | --- |
| Raw ICMP telemetry | 30-90 days | Configurable by deployment size |
| Raw SNMP interface telemetry | 30 days | High cardinality |
| 5-minute rollups | 180 days | Dashboards and reports |
| 1-hour rollups | 2 years | SLA and capacity reports |
| Alerts/incidents | 2+ years | Compliance/business review |
| Audit logs | 3-7 years | Depends on enterprise policy |
| Sessions | 30 days max | TTL by refresh expiration |
| Collector jobs | 30 days | Debugging only |

---

## 19. Security Architecture

### 19.1 Authentication

Requirements:

- Password login with strong hashing: Argon2id or bcrypt with strong cost.
- MFA support using TOTP for administrators.
- Access token lifetime: 10-15 minutes.
- Refresh token rotation on every refresh.
- Refresh tokens stored as hashed opaque tokens.
- Session revocation per device.
- Account lockout after repeated failed login attempts.
- Audit every login success/failure.

Vietnamese login UI:

| Field | Label |
| --- | --- |
| Title | Đăng nhập hệ thống |
| Username | Email hoặc tên đăng nhập |
| Password | Mật khẩu |
| Remember | Ghi nhớ đăng nhập |
| Submit | Đăng nhập |
| Forgot | Quên mật khẩu? |
| MFA code | Mã xác thực |

Validation:

- `Vui lòng nhập tài khoản.`
- `Vui lòng nhập mật khẩu.`
- `Tài khoản hoặc mật khẩu không đúng.`
- `Tài khoản đã bị khóa.`
- `Phiên đăng nhập đã hết hạn.`
- `Mã xác thực không hợp lệ.`

### 19.2 Authorization and RBAC

Permission naming:

```txt
resource:action
```

Examples:

- `device:read`
- `device:create`
- `device:update`
- `device:delete`
- `alert:acknowledge`
- `alert:resolve`
- `collector:manage`
- `audit:read`
- `role:manage`
- `settings:update`

Rules:

- Backend guards check permissions for every protected route.
- Scope checks limit site/device access.
- All role changes are audited.
- System administrator role cannot be deleted if it is the last admin path.

### 19.3 Credential Security

Device credentials must never be stored in device documents.

Rules:

- Store credentials in `device_credentials` with envelope encryption.
- Use KMS or external secret manager in production.
- Never return credential secrets to frontend after creation.
- Allow credential rotation.
- Mask credential fields in audit logs.
- Prefer SNMPv3 over SNMPv2c for production.

SNMPv3 recommendations:

- Use `authPriv` mode.
- Authentication protocol: SHA-256 where supported.
- Privacy protocol: AES-128 or stronger.
- Unique credentials per site or device group.
- Rotate credentials on operator departure.

### 19.4 Transport Security

- Enforce HTTPS and WSS in production.
- Use HSTS.
- Secure cookies if refresh tokens are cookie-based.
- Configure CORS allowlist.
- Rate-limit authentication and mutation endpoints.
- Protect internal collector endpoints with mTLS or signed collector tokens.

### 19.5 Audit Logging

Audit these actions:

- `auth.login.success`
- `auth.login.failure`
- `auth.logout`
- `auth.mfa.enabled`
- `device.create`
- `device.update`
- `device.delete`
- `device.import`
- `collector.register`
- `collector.token.rotate`
- `alert.acknowledge`
- `alert.resolve`
- `alert.suppress`
- `alert_rule.create`
- `alert_rule.update`
- `maintenance_window.create`
- `user.create`
- `user.disable`
- `role.update`
- `settings.update`
- `report.generate`

Vietnamese audit labels:

- `Đăng nhập thành công`
- `Đăng nhập thất bại`
- `Thêm thiết bị`
- `Cập nhật thiết bị`
- `Xóa thiết bị`
- `Xác nhận cảnh báo`
- `Đánh dấu cảnh báo đã xử lý`
- `Thay đổi phân quyền`
- `Thay đổi cài đặt hệ thống`

---

## 20. Deployment and Operations

### 20.1 Environment Strategy

| Environment | Purpose | Data |
| --- | --- | --- |
| Local | Developer work | Seed/fake devices |
| Dev | Shared integration | Non-production |
| Staging | Production rehearsal | Sanitized realistic data |
| Production | Customer operations | Real data |

### 20.2 Docker Services

Local Docker Compose should include:

- `frontend`
- `api`
- `worker-telemetry`
- `worker-alerts`
- `worker-rollups`
- `collector`
- `mongodb`
- `redis`
- `prometheus`
- `grafana`

### 20.3 Kubernetes Architecture

```txt
Namespace: smartnms

Deployments:
  frontend
  api
  socket-gateway
  telemetry-worker
  alert-worker
  report-worker
  rollup-worker

Stateful/managed services:
  mongodb replica set or managed MongoDB
  redis cluster or managed Redis

Daemon/edge:
  collector deployments per site/network zone
```

Kubernetes requirements:

- Separate API and worker deployments.
- Horizontal Pod Autoscaler for API, socket gateway, ingestion workers.
- PodDisruptionBudgets for API and socket gateway.
- Resource requests/limits for every pod.
- Readiness/liveness probes.
- ConfigMaps for non-secret config.
- Secrets for credentials and signing keys.
- NetworkPolicies to restrict internal traffic.
- Ingress with TLS.

### 20.4 Scaling Strategy

| Component | Scale trigger | Strategy |
| --- | --- | --- |
| API | CPU, request latency | Horizontal scale |
| Socket gateway | Active sockets, event latency | Horizontal with Redis adapter |
| Ingestion workers | Redis stream lag | Horizontal consumers |
| Alert workers | Evaluation lag | Horizontal by partition |
| Rollup workers | Rollup duration | Partition by tenant/time |
| MongoDB | write IOPS, storage, query latency | Index tuning, sharding future |
| Redis | memory, stream lag | Cluster/managed Redis |
| Collectors | assigned device count, poll duration | Add collectors per site |

### 20.5 CI/CD

GitHub Actions pipeline:

```txt
on pull request:
  install dependencies
  lint
  typecheck
  unit tests
  build frontend
  build backend
  API contract tests
  Docker image build

on merge to main:
  build versioned images
  scan images
  push registry
  deploy staging
  run smoke tests
  require approval
  deploy production
```

Quality gates:

- No TypeScript errors.
- No failing tests.
- No high/critical dependency vulnerabilities without waiver.
- OpenAPI spec generated and validated.
- Database migration/index changes reviewed.

### 20.6 Observability Stack

| Tool | Purpose |
| --- | --- |
| Prometheus | Metrics scraping |
| Grafana | Infrastructure dashboards |
| OpenTelemetry | Distributed tracing |
| Loki or ELK | Centralized logs |
| Alertmanager | Platform alerts |
| Sentry or equivalent | Frontend/backend exceptions |

Application metrics:

- API request duration by route.
- API error rate by code.
- Socket connected clients.
- Socket event fanout latency.
- Redis stream lag.
- Telemetry samples per second.
- Alert evaluation duration.
- Collector heartbeat age.
- MongoDB query latency.
- Report generation duration.

### 20.7 Backup and Disaster Recovery

Requirements:

- Daily MongoDB backups.
- Point-in-time recovery if managed MongoDB supports it.
- Redis is not source of truth; streams should be recoverable or acceptable loss window documented.
- Report artifacts backed up if required by customer policy.
- Restore procedure tested quarterly.
- Target RPO/RTO:
  - MVP: RPO 24h, RTO 4h.
  - Enterprise: RPO 15m, RTO 1h.

---

## 21. Monitoring Profiles and Alert Rules

### 21.1 Monitoring Profile Fields

Vietnamese labels:

- `Tên cấu hình`
- `Khoảng thời gian poll`
- `Số lần lỗi liên tiếp để đánh dấu offline`
- `Ngưỡng độ trễ`
- `Ngưỡng mất gói`
- `Bật SNMP`
- `Bật kiểm tra interface`
- `Thời gian timeout`
- `Số lần retry`

Example:

```json
{
  "name": "Thiết bị quan trọng",
  "pollIntervalSeconds": 15,
  "timeoutMs": 3000,
  "retryCount": 2,
  "offlineFailureThreshold": 3,
  "metrics": ["icmp.latency", "icmp.packet_loss", "snmp.cpu", "snmp.memory"],
  "thresholds": {
    "latencyMsWarning": 100,
    "latencyMsCritical": 250,
    "packetLossWarningPct": 2,
    "packetLossCriticalPct": 10
  }
}
```

### 21.2 Alert Rule Fields

Vietnamese title: **Quy tắc cảnh báo**

Fields:

- `Tên quy tắc`
- `Metric`
- `Điều kiện`
- `Ngưỡng`
- `Khoảng thời gian`
- `Số lần vi phạm liên tiếp`
- `Mức độ cảnh báo`
- `Trạng thái bật/tắt`
- `Phạm vi áp dụng`
- `Ngoại lệ`
- `Tự động tạo sự cố`

Example:

```json
{
  "name": "Độ trễ cao",
  "metric": "latency_ms",
  "operator": "gt",
  "threshold": 100,
  "durationSeconds": 300,
  "consecutiveViolations": 3,
  "severity": "warning",
  "scope": {
    "siteIds": ["site_hanoi_hq"],
    "deviceTypes": ["router", "switch", "access_point"],
    "tags": ["production"]
  },
  "enabled": true
}
```

---

## 22. Settings

Vietnamese title: **Cài đặt hệ thống**

Settings sections:

| Vietnamese | English | Contents |
| --- | --- | --- |
| Cài đặt chung | General | Product name, timezone, default site |
| Ngôn ngữ | Language | Default language, user preference |
| Giao diện | Appearance | Dark/light/system mode |
| Giám sát | Monitoring | Default intervals, retention |
| Cảnh báo | Alerts | Severity thresholds, escalation |
| Bảo mật | Security | MFA, password policy, sessions |
| Realtime | Realtime | Socket settings, stale thresholds |
| Dữ liệu | Data | Retention, rollups, exports |
| Backup | Backup | Backup schedule, restore checks |
| Tích hợp | Integrations | Webhooks, email, chat future |

Language settings:

- `Ngôn ngữ mặc định`
- `�� Tiếng Việt`
- `�� English`
- `Tự động nhận diện ngôn ngữ trình duyệt`

Theme settings:

- `Giao diện tối`
- `Giao diện sáng`
- `Theo hệ thống`

---

## 23. Developer Experience

### 23.1 Engineering Standards

- TypeScript strict mode.
- Shared domain types between frontend and backend where practical.
- OpenAPI spec generated from backend.
- API client generated or typed manually from OpenAPI.
- Zod schemas for frontend form validation and backend request validation where possible.
- Structured logging with `requestId`, `userId`, `tenantId`, `resourceId`.
- Feature modules own their routes, services, tests, and UI components.
- No hardcoded Vietnamese text outside i18n files, except tests or documentation examples.

### 23.2 Local Development

Required commands should support:

- Install dependencies.
- Start frontend.
- Start backend.
- Start workers.
- Start local MongoDB/Redis.
- Seed demo data.
- Run tests.
- Generate OpenAPI docs.

Seed data must include:

- Vietnamese admin user.
- Sites: Hà Nội, Đà Nẵng, Hồ Chí Minh.
- Device types across router/switch/AP/firewall/server.
- Online/offline/warning states.
- Active alerts.
- Collector health scenarios.
- Telemetry samples for charts.

### 23.3 Definition of Done

For each feature:

- UI implemented in Vietnamese and English.
- Loading, empty, error, and permission states implemented.
- Backend validation and RBAC enforced.
- Audit logs added for sensitive mutations.
- API documented.
- Tests added for critical logic.
- Realtime events integrated if feature changes live state.
- Responsive layout checked at mobile, tablet, desktop.

---

## 24. Future AI and Anomaly Expansion

AI capabilities must be added after reliable telemetry, retention, and alert quality exist.

### 24.1 Future AI Modules

| Module | Purpose |
| --- | --- |
| Anomaly Detection | Detect unusual latency, packet loss, traffic, CPU/memory patterns |
| Capacity Forecasting | Predict bandwidth or resource saturation |
| Alert Correlation | Suggest probable root cause across related alerts |
| Incident Summary | Generate operator-readable timeline summary |
| Change Impact Analysis | Correlate device/admin changes with new incidents |
| Smart Thresholds | Recommend thresholds based on historical baselines |

### 24.2 AI Data Requirements

- Clean time-series telemetry.
- Stable device identity.
- Site and topology context.
- Alert lifecycle outcomes.
- Maintenance windows to avoid training on expected downtime.
- Operator resolution notes.

### 24.3 AI UX Principles

Vietnamese-first AI labels:

- `Phát hiện bất thường`
- `Nguyên nhân có thể`
- `Dự báo tải`
- `Gợi ý ngưỡng`
- `Tóm tắt sự cố`

Rules:

- AI recommendations must be explainable.
- AI must not auto-resolve alerts in MVP.
- Operators must confirm actions.
- Confidence score must be visible.
- AI output must cite supporting telemetry and timeline events.

Example:

```txt
Nguyên nhân có thể: Core-Router-HN-01 có độ trễ tăng trước khi 12 thiết bị tại site Hà Nội mất kết nối.
Độ tin cậy: 82%
Bằng chứng: packet loss tăng từ 0,2% lên 18% trong 4 phút.
```

---

## 25. Production Acceptance Checklist

### 25.1 Product and UX

- Vietnamese default UI works across all major pages.
- �� / �� language switch updates UI instantly.
- Be Vietnam Pro loads and accents render correctly.
- Dashboard has real data states, not only placeholders.
- NOC wallboard supports fullscreen and stale data warning.
- Tables support search, filters, sorting, pagination, loading, empty, error.
- Alert workflow supports acknowledge, assign, suppress, resolve, notes.
- Mobile/tablet layouts do not clip Vietnamese text.

### 25.2 Architecture

- API, workers, socket gateway, collectors are separable services.
- Redis Streams handle telemetry and alert event pipelines.
- Socket.IO uses Redis adapter for horizontal scaling.
- MongoDB time-series collection uses TTL.
- Rollups exist for reporting and long-range dashboards.
- Collector health is monitored and alertable.

### 25.3 Security

- MFA available for admins.
- JWT access token and refresh rotation implemented.
- RBAC enforced on backend.
- Device credentials encrypted and never returned to frontend.
- SNMPv3 recommended and documented.
- Audit logs exist for all sensitive actions.
- HTTPS/WSS required in production.

### 25.4 Operations

- Docker Compose works locally.
- Kubernetes manifests or Helm chart exist.
- Prometheus metrics exposed.
- Grafana dashboard provided for platform health.
- OpenTelemetry tracing configured.
- CI/CD runs lint, typecheck, tests, builds, scans.
- Backup and restore procedure documented.

---

## 26. Implementation Roadmap

### Phase 1: Product Foundation

1. App shell, dark theme tokens, Be Vietnam Pro.
2. i18n system with Vietnamese default and English secondary.
3. Authentication, sessions, RBAC guard.
4. Core layout: sidebar, topbar, language switcher, profile menu.
5. Seed data and basic backend module structure.

### Phase 2: Inventory and Monitoring MVP

1. Device CRUD.
2. Sites, tags, monitoring profiles.
3. Collector registration and heartbeat.
4. ICMP polling.
5. Device state calculation.
6. Telemetry time-series storage.
7. Device detail metrics.

### Phase 3: Realtime Operations

1. Socket.IO gateway.
2. Dashboard summary API.
3. Realtime device state updates.
4. NOC wallboard.
5. Live event feed.
6. Connection recovery UX.

### Phase 4: Alerts and Incidents

1. Alert rules.
2. Alert engine.
3. Alert center.
4. Alert lifecycle and timeline.
5. Deduplication.
6. Maintenance windows.
7. Incident grouping.

### Phase 5: Enterprise Readiness

1. Audit logs.
2. Reports.
3. Advanced RBAC.
4. MFA.
5. Kubernetes deployment.
6. Observability stack.
7. Backup and restore procedure.

### Phase 6: Advanced Telemetry and AI

1. SNMPv3 support.
2. Interface metrics.
3. Topology discovery.
4. Traffic analytics.
5. Anomaly baselines.
6. Root cause suggestions.

---

## 27. Final Product Feeling

SmartNMS should feel like a real enterprise network operations platform:

- Serious enough for a NOC wall display.
- Clear enough for daily Vietnamese operators.
- Structured enough for enterprise administrators.
- Fast enough for realtime incident response.
- Secure enough for production device credentials.
- Scalable enough for thousands of devices and high-frequency telemetry.
- Polished enough to demonstrate as a startup SaaS product.

When a user opens the product, they should immediately understand:

```txt
This system monitors and manages real network infrastructure.
It is live.
It is secure.
It is built for Vietnamese operators and enterprise operations.
```
