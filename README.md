<div align="center">
  <h1>🌐 SmartNMS</h1>
  <p><strong>Hệ thống Quản lý & Giám sát Thiết bị Mạng Thông minh</strong></p>
  <p><em>Smart Network Device Monitoring & Management System</em></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-20.x-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/MongoDB-7.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
    <img src="https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
    <img src="https://img.shields.io/badge/K8s-Enterprise-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" />
  </p>

  <p>
    <a href="#-vấn-đề--giải-pháp">Giới thiệu</a> •
    <a href="#-tính-năng-cốt-lõi">Tính năng</a> •
    <a href="#%EF%B8%8F-kiến-trúc-hệ-thống">Kiến trúc</a> •
    <a href="#-cài-đặt--chạy-local">Cài đặt</a> •
    <a href="#-api-reference">API</a> •
    <a href="#-triển-khai-production">Triển khai</a>
  </p>
</div>

---

## 🎯 Vấn đề & Giải pháp

### Nỗi đau doanh nghiệp
Quản trị hạ tầng mạng (Router, Switch, Server, Firewall) tại các doanh nghiệp SME hiện nay vẫn mang tính **thủ công và bị động** — chỉ biết sự cố khi có người dùng phàn nàn. Thời gian phát hiện sự cố (MTTD) kéo dài, gây thiệt hại kinh doanh nghiêm trọng. Các công cụ giám sát có sẵn (SolarWinds, PRTG, Zabbix) thường cồng kềnh, giao diện lỗi thời hoặc có chi phí bản quyền khổng lồ.

### Giải pháp SmartNMS
Một nền tảng NOC (Network Operations Center) hiện đại, nhẹ nhàng nhưng đầy đủ tính năng:
- **Giám sát thời gian thực** — Phát hiện sự cố ngay lập tức qua WebSockets, không cần F5.
- **Cảnh báo thông minh** — Tự động phân loại mức độ nghiêm trọng (Info → Critical), gửi alert qua Telegram/Slack/Email.
- **Đa giao thức** — ICMP (Ping), SNMP v2c/v3 (CPU/RAM/Bandwidth), SSH.
- **Kiến trúc phân tán** — Hỗ trợ Collector Agent đặt tại chi nhánh, giải quyết bài toán IP LAN vs IP Public.
- **Giao diện Vietnamese-first** — UI tiếng Việt tự nhiên, có thể chuyển sang tiếng Anh tức thì.

---

## ✨ Tính năng cốt lõi

| Module | Mô tả |
|--------|-------|
| **Dashboard** | Bảng điều khiển NOC với KPI realtime: Health Score, thiết bị Online/Offline, biểu đồ latency/traffic |
| **Device Management** | Quản lý thiết bị mạng (CRUD), hỗ trợ 8 loại: Router, Switch, AP, Firewall, Server, Camera IP, Controller, Other |
| **ICMP Monitoring** | Background Worker gửi Ping liên tục 24/7, đo Latency, Packet Loss, tự động phát hiện thiết bị Offline |
| **SNMP v2c/v3** | Thu thập CPU%, RAM%, Bandwidth (In/Out Octets), Interface status, System Uptime từ thiết bị qua giao thức SNMP |
| **SSH Collector** | Kết nối SSH vào Linux Server để đọc `free -m`, `top`, `df -h` → parse ra Memory%, Disk% |
| **Alert Engine** | Động cơ cảnh báo Rule-based: Device Down, High CPU, High Memory, High Latency, Packet Loss, Interface Down |
| **Incident Management** | Quản lý sự cố với lifecycle: Open → Investigating → Resolved → Closed, gán người xử lý, timeline |
| **Topology Map** | Bản đồ kết nối mạng tương tác (React Flow), hiển thị trạng thái thiết bị trên sơ đồ |
| **Distributed Collectors** | Cài Collector Agent ở remote LAN, tự động gửi dữ liệu về Server trung tâm qua API Key |
| **Notifications** | Gửi cảnh báo tự động qua **Telegram Bot**, **Slack Webhook**, **Email SMTP**, **Generic Webhook** |
| **Maintenance Windows** | Lên lịch bảo trì, tự động tạm ẩn cảnh báo trong khung giờ bảo trì |
| **Reports** | Xuất báo cáo PDF/Excel/CSV: Uptime, SLA, Alert history |
| **RBAC** | Phân quyền chi tiết theo vai trò: Admin, Operator, Viewer. Mỗi quyền gắn với resource cụ thể |
| **MFA (TOTP)** | Xác thực 2 lớp qua Google Authenticator hoặc Authy |
| **Audit Logs** | Ghi lại mọi thao tác nhạy cảm: đăng nhập, thay đổi thiết bị, xử lý cảnh báo, phân quyền |
| **Anomaly Detection** | Phát hiện bất thường dựa trên thuật toán Z-Score thống kê |
| **Localization** | Đa ngôn ngữ Tiếng Việt / Tiếng Anh, chuyển đổi tức thì không tải lại trang |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────┐      HTTPS/WSS       ┌────────────────────────┐
│   React Frontend    │ ◄──────────────────► │   Node.js Backend       │
│   (Vite + Tailwind  │                      │   (Express + Socket.IO) │
│    + Zustand + i18n) │                      └───────────┬────────────┘
└─────────────────────┘                                   │
                                          ┌───────────────┼───────────────┐
                                          │               │               │
                                   ┌──────┴──────┐ ┌──────┴──────┐ ┌─────┴───────┐
                                   │   MongoDB   │ │ Background  │ │  Socket.IO  │
                                   │  (Mongoose) │ │  Workers    │ │  Gateway    │
                                   └─────────────┘ │ Ping/SNMP/  │ └─────────────┘
                                                   │ SSH/Anomaly │
                                                   └─────────────┘

          ┌─────────────────────────────────────────────────┐
          │          Distributed Collector Agent             │
          │  (Đặt tại chi nhánh LAN, gửi data về qua API)  │
          │  POST /api/v1/collectors/agent/heartbeat         │
          │  POST /api/v1/collectors/agent/telemetry          │
          │  POST /api/v1/collectors/agent/status             │
          └─────────────────────────────────────────────────┘
```

### Tech Stack chi tiết

| Layer | Công nghệ | Vai trò |
|-------|-----------|---------|
| **Frontend** | React 18, Vite, TailwindCSS | Giao diện SPA, Dark Mode NOC-style |
| **State** | Zustand | Quản lý state nhẹ, hiệu năng cao |
| **Charts** | Recharts | Biểu đồ latency, traffic, health |
| **Topology** | @xyflow/react | Vẽ sơ đồ mạng tương tác |
| **i18n** | i18next + react-i18next | Đa ngôn ngữ VI/EN |
| **Backend** | Node.js 20, Express.js | REST API + middleware |
| **Database** | MongoDB 7 + Mongoose | Lưu trữ device, alert, telemetry |
| **Realtime** | Socket.IO | Đẩy dữ liệu xuống UI tức thì |
| **Auth** | JWT + bcryptjs | Access Token (15 phút) + Refresh Token Rotation |
| **Encryption** | AES-256-GCM | Mã hóa credential SNMP/SSH/Notification |
| **Monitoring** | node-cron + ping | Chạy worker giám sát định kỳ |
| **SNMP** | net-snmp (optional) | Thu thập CPU/RAM/Interface qua SNMP |
| **SSH** | ssh2 (optional) | Kết nối SSH đọc thông số server |
| **Metrics** | Prometheus-compatible `/metrics` | Xuất metrics cho Grafana |
| **Tracing** | OpenTelemetry (optional) | Distributed tracing |
| **Container** | Docker + docker-compose | Đóng gói và triển khai |
| **Orchestration** | Kubernetes (Helm-ready) | Triển khai production enterprise |

---

## 🔐 Bảo mật (Security)

| Cơ chế | Chi tiết |
|--------|---------|
| **JWT Rotation** | Access Token hết hạn sau 15 phút, Refresh Token tự động xoay vòng sau 7 ngày |
| **Bcrypt** | Mã hóa mật khẩu 12 rounds |
| **Account Lockout** | Khóa tài khoản sau 5 lần đăng nhập sai |
| **MFA (TOTP)** | Hỗ trợ Google Authenticator, Authy |
| **AES-256-GCM** | Mã hóa credentials SNMP community/SSH password/Notification tokens |
| **RBAC** | Phân quyền chi tiết theo vai trò trên từng resource |
| **Helmet** | Thiết lập HTTP security headers |
| **CORS Whitelist** | Chỉ cho phép Frontend origin được cấu hình |
| **Rate Limiting** | 500 req/15 phút (general), 20 req/15 phút (auth) |
| **Audit Logs** | Ghi nhận mọi thao tác: login, CRUD, alert action, role change |
| **Soft Delete** | Dữ liệu không bao giờ bị xóa vĩnh viễn (đánh dấu `deletedAt`) |

---

## 🚀 Cài đặt & Chạy Local

### Yêu cầu
- **Node.js** v18+
- **MongoDB** v6+ (local hoặc Docker)

### Bước 1: Clone & Cài đặt

```bash
git clone https://github.com/khanhlazy/smart-network-monitor.git
cd smart-network-monitor
```

### Bước 2: Khởi tạo Backend

```bash
cd backend
npm install
cp .env.example .env    # Cấu hình MongoDB URI, JWT Secret

npm run seed            # Tạo tài khoản Admin + dữ liệu mẫu (BẮT BUỘC)
npm run dev             # Khởi động Backend → http://localhost:5000
```

### Bước 3: Khởi tạo Frontend (Mở tab Terminal mới)

```bash
cd frontend
npm install
npm run dev             # Khởi động Frontend → http://localhost:5173
```

👉 Truy cập: **http://localhost:5173**

---

## 🔑 Tài khoản mặc định

| Vai trò | Username | Password | Quyền hạn |
|---------|----------|----------|-----------|
| 👑 **Quản trị hệ thống** | `admin` | `Admin@123` | Toàn quyền: quản lý user, role, thiết bị, cài đặt |
| 🛠️ **Nhân viên vận hành** | `operator` | `Operator@123` | Quản lý thiết bị, xử lý cảnh báo, xem dashboard |
| 👁️ **Người xem** | `viewer` | `Viewer@123` | Chỉ xem dashboard và báo cáo (Read-only) |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/auth/login` | Đăng nhập, trả về accessToken + refreshToken |
| `POST` | `/api/v1/auth/refresh` | Làm mới accessToken bằng refreshToken |
| `POST` | `/api/v1/auth/logout` | Đăng xuất, thu hồi refreshToken |
| `GET` | `/api/v1/me` | Lấy thông tin user đang đăng nhập |

### Devices
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/devices` | Danh sách thiết bị (có search, filter, pagination) |
| `POST` | `/api/v1/devices` | Thêm thiết bị mới |
| `GET` | `/api/v1/devices/:id` | Chi tiết thiết bị + trạng thái + telemetry |
| `PATCH` | `/api/v1/devices/:id` | Cập nhật thiết bị |
| `DELETE` | `/api/v1/devices/:id` | Soft-delete thiết bị |
| `POST` | `/api/v1/devices/:id/poll` | Test kết nối (Ping/SNMP/SSH) |

### Alerts & Rules
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/alerts` | Danh sách cảnh báo |
| `POST` | `/api/v1/alerts/:id/acknowledge` | Xác nhận cảnh báo |
| `POST` | `/api/v1/alerts/:id/resolve` | Đánh dấu đã xử lý |
| `GET` | `/api/v1/alert-rules` | Danh sách quy tắc cảnh báo |
| `POST` | `/api/v1/alert-rules` | Tạo quy tắc mới |

### Dashboard & Monitoring
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/dashboard/summary` | KPI tổng quan (thiết bị, cảnh báo, health score) |
| `GET` | `/api/v1/dashboard/health` | Điểm sức khỏe mạng |
| `GET` | `/api/v1/dashboard/traffic` | Dữ liệu lưu lượng mạng |

### Distributed Collectors (Agent API)
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/collectors/agent/heartbeat` | API Key | Collector gửi nhịp tim + nhận danh sách thiết bị |
| `POST` | `/api/v1/collectors/agent/telemetry` | API Key | Collector đẩy dữ liệu telemetry (CPU/RAM/Latency) |
| `POST` | `/api/v1/collectors/agent/status` | API Key | Collector báo trạng thái Online/Offline |

### Notifications, Users, Roles, Audit Logs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET/POST` | `/api/v1/notification-channels` | CRUD kênh thông báo (Telegram/Slack/Email/Webhook) |
| `POST` | `/api/v1/notification-channels/:id/test` | Gửi thử cảnh báo test |
| `GET/POST` | `/api/v1/users` | Quản lý tài khoản |
| `GET/POST/PATCH` | `/api/v1/roles` | Quản lý vai trò & phân quyền |
| `GET` | `/api/v1/audit-logs` | Truy vấn nhật ký hệ thống |

---

## 🔌 Socket.IO Events (Realtime)

### Server → Client
| Event | Mô tả |
|-------|-------|
| `device:state.updated` | Trạng thái thiết bị thay đổi (Online↔Offline, CPU, Latency) |
| `alert:created` | Cảnh báo mới được tạo |
| `alert:updated` | Cảnh báo được cập nhật (acknowledge, resolve) |
| `dashboard:summary.updated` | Dashboard cần refresh |
| `topology:updated` | Sơ đồ mạng thay đổi |

### Client → Server
| Event | Mô tả |
|-------|-------|
| `dashboard:subscribe` | Đăng ký nhận cập nhật dashboard |
| `device:subscribe` | Đăng ký nhận cập nhật chi tiết thiết bị |
| `alerts:subscribe` | Đăng ký nhận cập nhật cảnh báo |

---

## 📂 Cấu trúc thư mục

```
smart-network-monitor/
├── backend/                          # Node.js API Server
│   └── src/
│       ├── app.js                    # Express setup + middleware
│       ├── server.js                 # HTTP + Socket.IO + Worker bootstrap
│       ├── config/                   # Biến môi trường
│       ├── database/                 # Kết nối MongoDB + seed data
│       ├── middlewares/              # JWT Auth + RBAC middleware
│       ├── sockets/                  # Socket.IO event handlers
│       ├── workers/                  # Background: Ping, SNMP, SSH, Anomaly
│       ├── utils/                    # Crypto (AES-256), Audit Logger, Metrics
│       └── modules/
│           ├── auth/                 # Login, JWT, Refresh Token
│           ├── users/                # User CRUD
│           ├── roles/                # RBAC roles & permissions
│           ├── devices/              # Device CRUD + TopologyLink
│           ├── monitoring/           # DeviceState model + SNMP OIDs
│           ├── telemetry/            # Time-series samples (TTL 90 ngày)
│           ├── alerts/               # Alert + AlertRule engine
│           ├── collectors/           # Collector model + Agent API + SNMP/SSH services
│           ├── incidents/            # Incident management
│           ├── maintenance/          # Maintenance windows
│           ├── notifications/        # Telegram/Slack/Email/Webhook service
│           ├── reports/              # PDF/Excel/CSV report
│           ├── audit/                # Audit log model
│           ├── mfa/                  # TOTP (Google Authenticator)
│           ├── anomaly/              # Z-Score anomaly detection
│           ├── credentials/          # Encrypted credential store
│           ├── dashboard/            # Dashboard aggregation API
│           └── topology/             # Network topology API
│
├── frontend/                         # React SPA
│   └── src/
│       ├── app/                      # App.jsx (Router) + i18n config
│       ├── layouts/                  # AppLayout (Sidebar + Topbar)
│       ├── pages/                    # 20+ trang chức năng
│       ├── stores/                   # Zustand auth store
│       ├── services/                 # Axios API client
│       ├── sockets/                  # Socket.IO client
│       ├── locales/                  # vi.json + en.json (328 keys)
│       └── styles/                   # TailwindCSS + custom design tokens
│
├── deploy/k8s/                       # Kubernetes manifests (10 files)
├── docker-compose.yml                # Docker Compose cho dev/staging
├── MASTER.MD                         # Product specification (2800+ dòng)
└── README.md                         # Tài liệu này
```

---

## 🐳 Triển khai Production

### Docker Compose (Staging)
```bash
docker-compose up -d --build
```

### Kubernetes (Production)
```bash
cd deploy/k8s
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.example.yaml   # Thay giá trị trước khi apply
kubectl apply -f mongo-statefulset.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml              # Auto-scaling
```

---

## ⚙️ Biến môi trường (.env)

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `PORT` | `5000` | Port backend |
| `MONGODB_URI` | `mongodb://localhost:27017/smartnms` | MongoDB connection string |
| `JWT_SECRET` | — | Secret key cho JWT (BẮT BUỘC thay đổi) |
| `JWT_REFRESH_SECRET` | — | Secret key cho Refresh Token |
| `CORS_ORIGIN` | `http://localhost:5173` | URL frontend được phép truy cập |
| `PING_INTERVAL_MS` | `30000` | Chu kỳ ping (30 giây) |
| `SNMP_ENABLED` | `true` | Bật/tắt SNMP worker |
| `SNMP_INTERVAL_MS` | `60000` | Chu kỳ SNMP (60 giây) |
| `SSH_ENABLED` | `true` | Bật/tắt SSH worker |
| `ENCRYPTION_KEY` | — | Key mã hóa credentials (AES-256) |
| `ANOMALY_ENABLED` | `true` | Bật/tắt anomaly detection |

---

## 🗺️ Lộ trình phát triển (Roadmap)

- [x] **Phase 1 — Foundation:** ICMP Monitoring, Alert Engine, Dashboard, JWT Auth, RBAC, Audit Logs, Docker
- [x] **Phase 2 — Operations:** Topology Map, Incident Management, Maintenance Windows, Reports (PDF/Excel/CSV)
- [x] **Phase 3 — Deep Telemetry:** SNMP v2c/v3 (CPU, RAM, Bandwidth, Interface status), SSH Collector
- [x] **Phase 4 — Scale:** Distributed Collector Agent API (Heartbeat, Telemetry Ingest, Status Report)
- [x] **Phase 5 — Notifications:** Telegram Bot, Slack Webhook, Email SMTP, Generic Webhook
- [x] **Phase 6 — Enterprise:** MFA (TOTP), Prometheus Metrics, OpenTelemetry, Kubernetes Manifests, Anomaly Detection

---

## 📝 License & Copyright

© 2026 **[Nguyễn Huỳnh Khánh](https://github.com/khanhlazy)** — All rights reserved.

Dự án được phát triển phục vụ mục đích nghiên cứu và ứng dụng thực tiễn trong lĩnh vực Quản trị Hạ tầng Mạng Doanh nghiệp.

<div align="center">
  <sub>Built with ❤️ and ☕ for the Network Engineering Community</sub>
</div>
