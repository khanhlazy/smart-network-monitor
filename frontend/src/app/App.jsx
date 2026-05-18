import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { connectSocket, disconnectSocket } from '../sockets';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import DevicesPage from '../pages/DevicesPage';
import DeviceFormPage from '../pages/DeviceFormPage';
import DeviceDetailPage from '../pages/DeviceDetailPage';
import TopologyPage from '../pages/TopologyPage';
import AlertsPage from '../pages/AlertsPage';
import IncidentsPage from '../pages/IncidentsPage';
import MaintenancePage from '../pages/MaintenancePage';
import ReportsPage from '../pages/ReportsPage';
import RolesPage from '../pages/RolesPage';
import SecuritySettingsPage from '../pages/SecuritySettingsPage';
import NotificationSettingsPage from '../pages/NotificationSettingsPage';
import SystemHealthPage from '../pages/SystemHealthPage';
import AnomalyPage from '../pages/AnomalyPage';
import SettingsPage from '../pages/SettingsPage';
import AuditLogsPage from '../pages/AuditLogsPage';
import MonitoringPage from '../pages/MonitoringPage';
import AlertRulesPage from '../pages/AlertRulesPage';
import CollectorsPage from '../pages/CollectorsPage';
import UsersPage from '../pages/UsersPage';
import PlaceholderPage from '../pages/PlaceholderPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { isAuthenticated, accessToken, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchMe();
      const socket = connectSocket(accessToken);
      return () => disconnectSocket();
    }
  }, [isAuthenticated, accessToken]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="devices/new" element={<DeviceFormPage />} />
          <Route path="devices/:id" element={<DeviceDetailPage />} />
          <Route path="devices/:id/edit" element={<DeviceFormPage />} />
          <Route path="topology" element={<TopologyPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="incidents/:id" element={<IncidentsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="alert-rules" element={<AlertRulesPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="collectors" element={<CollectorsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/security" element={<SecuritySettingsPage />} />
          <Route path="settings/notifications" element={<NotificationSettingsPage />} />
          <Route path="system-health" element={<SystemHealthPage />} />
          <Route path="anomaly" element={<AnomalyPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
