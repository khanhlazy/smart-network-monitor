# SmartNMS - Smart Network Device Monitoring & Management System

> Hệ thống Quản lý và Giám sát Thiết bị Mạng Thông minh

A production-grade Network Operations Center (NOC) platform for monitoring, managing, and diagnosing enterprise network infrastructure in near real-time.

![SmartNMS](https://img.shields.io/badge/SmartNMS-v1.0.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![React](https://img.shields.io/badge/React-18-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-7-green)

## Architecture Overview

```
┌─────────────────┐     HTTPS/WSS     ┌──────────────────┐
│  React Frontend │ ◄───────────────► │  Node.js Backend  │
│  (Vite + i18n)  │                   │  (Express + JWT)  │
└─────────────────┘                   └────────┬─────────┘
                                               │
                               ┌───────────────┼───────────────┐
                               │               │               │
                        ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
                        │  Socket.IO  │ │  MongoDB    │ │ Ping Worker │
                        │  Gateway    │ │  Database   │ │  (ICMP)     │
                        └─────────────┘ └─────────────┘ └─────────────┘
```

## Tech Stack

### Frontend
- **React 18** + Vite
- **TailwindCSS** with custom design tokens
- **React Router** for SPA routing
- **Zustand** for state management
- **Recharts** for data visualization
- **Socket.IO Client** for realtime updates
- **i18next** for Vietnamese/English localization
- **Lucide React** for icons
- **Be Vietnam Pro** font

### Backend
- **Node.js** + Express.js
- **MongoDB** + Mongoose ODM
- **Socket.IO** for realtime communication
- **JWT** authentication with refresh token rotation
- **bcryptjs** for password hashing
- **Helmet** + CORS + Rate Limiting
- **node-cron** for scheduled tasks
- **ping** for ICMP monitoring

## Installation

### Prerequisites
- **Node.js** >= 18
- **MongoDB** >= 6 (running locally or via Docker)
- **npm** >= 9

### 1. Clone & Install

```bash
# Clone the repository
git clone <repo-url> smart-network-monitor
cd smart-network-monitor

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and JWT secrets
```

### 3. Start MongoDB

```bash
# Using Docker
docker run -d --name smartnms-mongo -p 27017:27017 mongo:7

# Or using local MongoDB
mongod --dbpath /data/db
```

### 4. Seed Database

```bash
cd backend
npm run seed
```

### 5. Start Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 6. Open Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api/v1
- **Health Check:** http://localhost:5000/health

## Default Accounts

| Role | Username | Password | Permissions |
|------|----------|----------|-------------|
| Quản trị hệ thống | `admin` | `Admin@123` | Full access |
| Nhân viên vận hành | `operator` | `Operator@123` | Monitor + alerts |
| Người xem | `viewer` | `Viewer@123` | Read-only |

## API Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/me` | Current user profile |
| PATCH | `/api/v1/me/preferences` | Update preferences |

### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/devices` | List devices |
| POST | `/api/v1/devices` | Create device |
| GET | `/api/v1/devices/:id` | Device detail |
| PATCH | `/api/v1/devices/:id` | Update device |
| DELETE | `/api/v1/devices/:id` | Soft delete |
| POST | `/api/v1/devices/:id/poll` | Test connection |
| GET | `/api/v1/devices/:id/telemetry` | Device telemetry |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/summary` | KPI summary |
| GET | `/api/v1/dashboard/health` | Health score |
| GET | `/api/v1/dashboard/traffic` | Traffic data |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/alerts` | List alerts |
| GET | `/api/v1/alerts/:id` | Alert detail |
| POST | `/api/v1/alerts/:id/acknowledge` | Acknowledge |
| POST | `/api/v1/alerts/:id/resolve` | Resolve |
| POST | `/api/v1/alerts/:id/suppress` | Suppress |

### Alert Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/alert-rules` | List rules |
| POST | `/api/v1/alert-rules` | Create rule |
| PATCH | `/api/v1/alert-rules/:id` | Update rule |
| DELETE | `/api/v1/alert-rules/:id` | Delete rule |

### Audit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/audit-logs` | Search logs |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users |
| POST | `/api/v1/users` | Create user |

## Socket.IO Events

### Server → Client
| Event | Description |
|-------|-------------|
| `device:state.updated` | Device status change |
| `alert:created` | New alert generated |
| `alert:updated` | Alert lifecycle change |
| `dashboard:summary.updated` | Dashboard data refresh |

### Client → Server
| Event | Description |
|-------|-------------|
| `dashboard:subscribe` | Subscribe to dashboard updates |
| `device:subscribe` | Subscribe to device detail updates |
| `alerts:subscribe` | Subscribe to alert updates |

## Folder Structure

```
smart-network-monitor/
├── master.md                    # Product specification
├── README.md                    # This file
├── docker-compose.yml           # Docker setup
├── .env.example                 # Environment template
│
├── backend/
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── app.js               # Express setup
│       ├── server.js             # HTTP + Socket.IO server
│       ├── config/               # Configuration
│       ├── database/             # DB connection + seed
│       ├── middlewares/          # Auth, RBAC
│       ├── sockets/             # Socket.IO setup
│       ├── workers/             # Ping monitoring worker
│       └── modules/
│           ├── auth/            # Auth routes + controller
│           ├── users/           # User model + routes
│           ├── roles/           # Role model
│           ├── devices/         # Device CRUD
│           ├── monitoring/      # Device state model
│           ├── telemetry/       # Telemetry samples
│           ├── alerts/          # Alerts + rules
│           ├── collectors/      # Collector model
│           ├── dashboard/       # Dashboard API
│           └── audit/           # Audit logs
│
└── frontend/
    ├── package.json
    ├── Dockerfile
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx             # Entry point
        ├── app/                 # App + Router + i18n
        ├── layouts/             # AppLayout
        ├── pages/               # All pages
        ├── stores/              # Zustand stores
        ├── services/            # API client
        ├── sockets/             # Socket.IO client
        ├── locales/             # vi.json + en.json
        └── styles/              # Global CSS
```

## Localization

- **Default language:** Vietnamese (��)
- **Secondary language:** English (��)
- **Storage:** `localStorage.app_language` + user profile
- **Switching:** Instant UI update via language switcher in topbar

## Security

- JWT access tokens (15 min expiry)
- Refresh token rotation
- bcrypt password hashing (12 rounds)
- Account lockout after 5 failed attempts
- Helmet security headers
- CORS whitelist
- Rate limiting (500 req/15min general, 20 req/15min auth)
- Audit logging for all sensitive actions
- RBAC middleware on all protected routes
- Soft delete (no data permanently lost)

## Development Roadmap

### Phase 1: Foundation (Current)
- [x] Project structure
- [x] MongoDB + Mongoose models
- [x] JWT authentication
- [x] Device CRUD
- [x] ICMP monitoring
- [x] Socket.IO realtime
- [x] Alert engine
- [x] Dashboard
- [x] Vietnamese UI
- [x] Language switcher
- [x] Audit logs
- [x] Seed data
- [x] Docker support

### Phase 2: Advanced
- [x] SNMPv2c/v3 support scaffolding with encrypted credentials and safe worker failure handling
- [x] SSH collector scaffolding with command allowlists
- [x] Topology map APIs and realtime `topology:updated`
- [x] Incident management
- [x] Maintenance windows
- [x] PDF/Excel/CSV report generation
- [x] CSV import/export

### Phase 3: Enterprise
- [x] MFA (TOTP)
- [x] Advanced RBAC UI
- [x] Kubernetes deployment manifests
- [x] Prometheus-compatible `/metrics`
- [x] Optional OpenTelemetry bootstrap
- [x] Notification channels
- [x] Statistical anomaly detection

## License

Private - All rights reserved.
