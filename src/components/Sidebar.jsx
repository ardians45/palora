import React, { useState } from 'react';
import { 
  Store, 
  FileText, 
  Boxes, 
  Truck, 
  CreditCard, 
  FolderArchive, 
  FileSpreadsheet, 
  Users, 
  BarChart3,
  ArrowLeft,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
  UserCog,
  LogOut
} from 'lucide-react';
import { APP_MODULES } from '../data/mockData';

const ICON_COMPONENTS = {
  Store,
  FileText,
  Boxes,
  Truck,
  CreditCard,
  FolderArchive,
  FileSpreadsheet,
  Users,
  BarChart3,
  Activity,
  UserCog
};

export default function Sidebar({
  activeModule,
  setActiveModule,
  currentRole,
  onLogout,
  modules = APP_MODULES
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand & Logo at Sidebar Top with Collapse Toggle */}
      <div className="sidebar-header">
        <div 
          className="sidebar-brand-box" 
          onClick={() => setActiveModule(null)}
          title="Kembali ke Menu Utama"
        >
          <img src="/logo.jpeg" alt="Palora Logo" className="brand-logo-img" />
          <div className="sidebar-brand-info">
            <div className="sidebar-brand-name">PALORA</div>
            <div className="sidebar-brand-desc">
              PT Paletindo Prakarsa
            </div>
          </div>
        </div>

        <button 
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar (Tabel Lebih Lebar)"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Quick Action: Back to Home Launcher */}
      <button 
        className="sidebar-return-btn"
        onClick={() => setActiveModule(null)}
        title="Kembali ke Menu Utama (Esc)"
      >
        <ArrowLeft size={16} style={{ flexShrink: 0 }} />
        <span>Menu Utama</span>
      </button>

      {/* Navigation Group Header */}
      <div className="sidebar-section-label">MODUL ERP</div>

      {/* List of 9 ERP Modules */}
      <nav className="sidebar-menu-list">
        {modules.map((mod) => {
          const IconComp = ICON_COMPONENTS[mod.icon] || Boxes;
          const isActive = activeModule?.id === mod.id;

          return (
            <button
              key={mod.id}
              className={`sidebar-menu-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveModule(mod)}
              title={mod.subtitle}
            >
              <div className="sidebar-menu-btn-left">
                <IconComp 
                  size={18} 
                  className="sidebar-menu-icon" 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{mod.title}</span>
              </div>
              
              {mod.badge && (
                <span className="sidebar-menu-badge">
                  {mod.badge.split(' ')[0]}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer with Role Selector */}
      <div className="sidebar-footer">
        <div className="sidebar-user-pill">
          <div className="user-avatar-circle" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
            <User size={16} />
          </div>
          <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>
              Pengguna Aktif:
            </div>
            <div
              className="role-select"
              title={currentRole}
              style={{ fontSize: '0.78rem', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {currentRole}
            </div>
          </div>
          {onLogout && (
            <button className="sidebar-collapse-btn" onClick={onLogout} title="Keluar">
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
