import React from 'react';
import { 
  Bell, 
  User, 
  ChevronRight,
  Search,
  Home,
  MessageSquare,
  Clock,
  Wrench,
  Building2,
  ChevronDown
} from 'lucide-react';

export default function Navbar({ 
  activeModule, 
  setActiveModule, 
  currentRole, 
  setCurrentRole,
  searchQuery,
  setSearchQuery
}) {
  return (
    <header className={`premium-navbar ${!activeModule ? 'is-home' : 'is-module'}`}>
      <div className="navbar-container">
        
        {/* Left Section: Branding & Breadcrumbs */}
        <div className="nav-brand-section">
          <div className="brand-logo-wrapper" onClick={() => setActiveModule(null)} title="Kembali ke Beranda">
            <img src="/logo.jpeg" alt="Palora Logo" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-name">PALORA</span>
              <span className="brand-tag">ERP SYSTEM</span>
            </div>
          </div>
          
          {activeModule && (
            <div className="nav-breadcrumbs">
              <ChevronRight size={16} color="#94a3b8" />
              <div className="breadcrumb-current">
                {activeModule.title}
              </div>
            </div>
          )}
        </div>

        {/* Center Section: Search Bar (Only on Home) */}
        <div className="nav-center-section">
          {!activeModule && setSearchQuery && (
            <div className="premium-search-bar">
              <Search size={16} className="search-icon" color="#64748b" />
              <input 
                type="text" 
                placeholder="Cari menu, aplikasi, atau data..." 
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="search-shortcut">⌘K</div>
            </div>
          )}
        </div>

        {/* Right Section: Actions, Badges & Profile */}
        <div className="nav-actions-section">
          
          <div className="nav-icon-group">
            <button className="nav-icon-btn" title="Pesan & Order (6)" onClick={() => setActiveModule({ id: 'sales', title: 'Penjualan & Kasir' })}>
              <MessageSquare size={18} />
              <span className="nav-badge">6</span>
            </button>
            <button className="nav-icon-btn" title="Aktivitas & Notifikasi (25)" onClick={() => setActiveModule({ id: 'receivables', title: 'Piutang & Kas' })}>
              <Bell size={18} />
              <span className="nav-badge alert">25</span>
            </button>
            <button className="nav-icon-btn" title="Pengaturan Sistem" onClick={() => setActiveModule({ id: 'masterdata', title: 'Master Data' })}>
              <Wrench size={18} />
            </button>
          </div>

          <div className="nav-divider"></div>

          <div className="nav-company-badge" title="Perusahaan Aktif">
            <Building2 size={14} />
            <span>PT Paletindo Prakarsa Unggul</span>
          </div>

          <div className="nav-user-wrapper">
            <div className="nav-user-dropdown">
              <User size={14} className="user-icon" />
              <select 
                value={currentRole} 
                onChange={(e) => setCurrentRole(e.target.value)}
              >
                <option value="Mas Heri (Admin Gudang & POS)">Mas Heri (Admin)</option>
                <option value="Pak Yanto (Owner)">Pak Yanto (Owner)</option>
                <option value="Bude (Keuangan)">Bude (Keuangan)</option>
              </select>
              <ChevronDown size={14} className="dropdown-caret" />
            </div>

            <div className="nav-avatar" title={currentRole}>
              {currentRole.includes('Heri') ? 'MH' : currentRole.includes('Yanto') ? 'PY' : 'BK'}
            </div>
          </div>

          {activeModule && (
            <>
              <div className="nav-divider" style={{ margin: '0 4px' }}></div>
              <button className="nav-home-btn" onClick={() => setActiveModule(null)} title="Tutup Modul (Esc)">
                <Home size={16} />
              </button>
            </>
          )}

        </div>
      </div>

      <style>{`
        .premium-navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          height: 68px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }
        .premium-navbar.is-home {
          background: transparent;
          backdrop-filter: none;
          border-bottom: 1px solid transparent;
        }
        .navbar-container {
          width: 100%;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        /* Left Section */
        .nav-brand-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .brand-logo-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 6px 12px 6px 6px;
          border-radius: 12px;
          transition: background 0.2s;
        }
        .brand-logo-wrapper:hover {
          background: rgba(15, 23, 42, 0.04);
        }
        .brand-logo {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          object-fit: cover;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid rgba(226, 232, 240, 0.8);
          background: white;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name {
          font-weight: 900;
          font-size: 1.15rem;
          color: #0f172a;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .brand-tag {
          font-size: 0.65rem;
          font-weight: 800;
          color: #4f46e5;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
        .nav-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-left: 12px;
        }
        .breadcrumb-current {
          font-size: 0.9rem;
          font-weight: 800;
          color: #1e293b;
          background: #f1f5f9;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }

        /* Center Section */
        .nav-center-section {
          flex: 1;
          display: flex;
          justify-content: center;
          max-width: 500px;
          margin: 0 20px;
        }
        .premium-search-bar {
          width: 100%;
          height: 42px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #cbd5e1;
          border-radius: 24px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
        }
        .premium-search-bar:focus-within {
          border-color: #4f46e5;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
          width: 120%;
          background: #ffffff;
        }
        .premium-search-bar input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.85rem;
          color: #1e293b;
          font-weight: 500;
        }
        .premium-search-bar input::placeholder {
          color: #94a3b8;
        }
        .search-shortcut {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }

        /* Right Section */
        .nav-actions-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .nav-icon-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .nav-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .nav-icon-btn:hover {
          background: white;
          color: #0f172a;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .is-module .nav-icon-btn:hover {
          background: #f1f5f9;
        }
        .nav-badge {
          position: absolute;
          top: 0px;
          right: -2px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 10px;
          border: 2px solid white;
          line-height: 1;
        }
        .is-home .nav-badge {
          border-color: #f1f5f9; /* matches rough background context */
        }
        .nav-badge.alert {
          background: #f59e0b;
        }
        .nav-divider {
          width: 1px;
          height: 24px;
          background: #cbd5e1;
        }
        .nav-company-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .nav-company-badge svg { color: #4f46e5; }
        
        .nav-user-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .nav-user-dropdown {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px 6px 14px;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .nav-user-dropdown:hover {
          border-color: #94a3b8;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .nav-user-dropdown select {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.85rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          appearance: none;
          padding-right: 18px; /* space for absolute caret */
          width: 160px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .user-icon { color: #64748b; }
        .dropdown-caret {
          position: absolute;
          right: 12px;
          pointer-events: none;
          color: #94a3b8;
        }
        .nav-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
          border: 2px solid white;
        }
        .nav-home-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #0f172a;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
        }
        .nav-home-btn:hover {
          background: #334155;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
        }
      `}</style>
    </header>
  );
}
