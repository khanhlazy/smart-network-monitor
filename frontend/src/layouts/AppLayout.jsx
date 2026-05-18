import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/authStore';
import { useRealtimeStore } from '../sockets';
import {
  LayoutDashboard, Monitor, Server, Network, Activity,
  Bell, Flame, SlidersHorizontal, Radio, FileBarChart,
  Users, Shield, ScrollText, Settings, ChevronLeft, ChevronRight,
  LogOut, User, Globe, Search, Menu, Share2, Wrench, HeartPulse, BrainCircuit
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
  { key: 'devices', path: '/devices', icon: Server, label: 'nav.devices' },
  { key: 'topology', path: '/topology', icon: Share2, label: 'nav.topology' },
  { key: 'monitoring', path: '/monitoring', icon: Activity, label: 'nav.monitoring' },
  { key: 'alerts', path: '/alerts', icon: Bell, label: 'nav.alerts' },
  { key: 'incidents', path: '/incidents', icon: Flame, label: 'nav.incidents' },
  { key: 'maintenance', path: '/maintenance', icon: Wrench, label: 'nav.maintenance' },
  { key: 'alertRules', path: '/alert-rules', icon: SlidersHorizontal, label: 'nav.alertRules' },
  { key: 'collectors', path: '/collectors', icon: Radio, label: 'nav.collectors' },
  { key: 'reports', path: '/reports', icon: FileBarChart, label: 'nav.reports' },
  { key: 'users', path: '/users', icon: Users, label: 'nav.users' },
  { key: 'roles', path: '/roles', icon: Shield, label: 'nav.roles' },
  { key: 'auditLogs', path: '/audit-logs', icon: ScrollText, label: 'nav.auditLogs' },
  { key: 'systemHealth', path: '/system-health', icon: HeartPulse, label: 'nav.systemHealth' },
  { key: 'anomaly', path: '/anomaly', icon: BrainCircuit, label: 'nav.anomaly' },
  { key: 'settings', path: '/settings', icon: Settings, label: 'nav.settings' },
];

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { status: realtimeStatus } = useRealtimeStore();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const realtimeStatusConfig = {
    connected: { color: 'bg-nms-green', text: t('realtime.live'), dotClass: 'animate-pulse-dot' },
    reconnecting: { color: 'bg-nms-amber', text: t('realtime.reconnecting'), dotClass: 'animate-pulse-dot' },
    disconnected: { color: 'bg-nms-red', text: t('realtime.disconnected'), dotClass: '' },
  };

  const rtConfig = realtimeStatusConfig[realtimeStatus] || realtimeStatusConfig.disconnected;

  return (
    <div className="flex h-screen overflow-hidden bg-nms-bg font-vietnam">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[72px]' : 'w-[264px]'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:relative z-50 h-full bg-nms-sidebar border-r border-nms-border flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-nms-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nms-brand to-nms-cyan flex items-center justify-center">
              <Network size={18} className="text-white" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="text-sm font-bold text-nms-text tracking-wide">SmartNMS</h1>
                <p className="text-[10px] text-nms-text-muted">Network Operations</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 mb-0.5 rounded-md text-sm transition-all duration-120 ${
                  isActive
                    ? 'bg-nms-brand/15 text-nms-brand border-l-2 border-nms-brand'
                    : 'text-nms-text-secondary hover:bg-nms-hover hover:text-nms-text'
                }`
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{t(item.label)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center h-10 border-t border-nms-border text-nms-text-muted hover:text-nms-text transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-nms-sidebar border-b border-nms-border flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-nms-text-secondary" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-nms-text-muted" />
              <input
                type="text"
                placeholder={currentLang === 'vi' ? 'Tìm thiết bị, IP, cảnh báo, site...' : 'Search devices, IPs, alerts, sites...'}
                className="w-80 h-9 pl-9 pr-4 bg-nms-surface rounded-md border border-nms-border text-sm text-nms-text placeholder:text-nms-text-muted focus:outline-none focus:border-nms-brand transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Realtime Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-nms-surface border border-nms-border">
              <div className={`w-2 h-2 rounded-full ${rtConfig.color} ${rtConfig.dotClass}`} />
              <span className="text-xs text-nms-text-secondary hidden sm:inline">{rtConfig.text}</span>
            </div>

            {/* Notifications */}
            <button onClick={() => navigate('/alerts')} className="relative p-2 rounded-md hover:bg-nms-hover text-nms-text-secondary hover:text-nms-text transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-nms-red rounded-full animate-pulse-dot" />
            </button>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-nms-surface border border-nms-border hover:border-nms-brand text-xs font-medium text-nms-text-secondary hover:text-nms-text transition-all"
            >
              <Globe size={14} />
              {currentLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-nms-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nms-brand to-nms-violet flex items-center justify-center">
                  <User size={14} className="text-white" />
                </div>
                {user && <span className="text-sm text-nms-text hidden lg:inline">{user.fullName}</span>}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-56 bg-nms-surface-raised border border-nms-border rounded-lg shadow-xl py-2 z-50 animate-fade-in">
                  {user && (
                    <div className="px-4 py-2 border-b border-nms-border">
                      <p className="text-sm font-medium text-nms-text">{user.fullName}</p>
                      <p className="text-xs text-nms-text-muted">{user.email || user.username}</p>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-nms-red hover:bg-nms-hover transition-colors"
                  >
                    <LogOut size={14} />
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Realtime disconnection banner */}
        {realtimeStatus === 'disconnected' && (
          <div className="bg-nms-red/10 border-b border-nms-red/30 px-4 py-2 flex items-center gap-2 text-sm text-nms-red animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-nms-red animate-pulse-dot" />
            {t('realtime.disconnectedMessage')}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
