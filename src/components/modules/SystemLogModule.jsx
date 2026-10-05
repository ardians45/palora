import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  Filter,
  User,
  Clock,
  Settings,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function SystemLogModule({ 
  systemLogs = [], 
  currentUser 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  
  const filteredLogs = systemLogs.filter(log => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = log.action.toLowerCase().includes(q) || 
                          log.detail.toLowerCase().includes(q) ||
                          log.user.toLowerCase().includes(q);
    
    if (!matchesSearch) return false;
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    
    return true;
  });

  return (
    <div className="module-workspace">
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-tile" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Activity size={22} color="#3b82f6" />
          </div>
          <div>
            <h2 className="module-title-main">Log Aktivitas Sistem (Audit Trail)</h2>
            <p className="module-desc">Pelacakan riwayat aktivitas pengguna untuk transparansi dan keamanan data.</p>
          </div>
        </div>
        
        <div className="module-actions-right">
          <div className="nav-company-badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
            <ShieldAlert size={16} />
            <span style={{ fontWeight: 600 }}>Keamanan Aktif</span>
          </div>
        </div>
      </div>

      <div className="module-controls">
        <div className="search-box">
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder="Cari aktivitas, user, atau referensi dokumen..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="filter-select-wrapper">
            <Filter size={16} color="#64748b" />
            <select 
              value={moduleFilter} 
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="all">Semua Modul</option>
              <option value="Penjualan">Penjualan / POS</option>
              <option value="Pembelian">Pembelian / PO</option>
              <option value="Gudang">Gudang & Stok</option>
              <option value="Master Data">Master Data</option>
              <option value="Logistik">Surat Jalan</option>
            </select>
          </div>
        </div>
      </div>

      <div className="module-table-container">
        <table className="palora-table">
          <thead>
            <tr>
              <th style={{ width: '160px' }}>Tanggal & Waktu</th>
              <th style={{ width: '200px' }}>Pengguna / Operator</th>
              <th style={{ width: '150px' }}>Modul Terkait</th>
              <th style={{ width: '250px' }}>Aksi (Aktivitas Utama)</th>
              <th>Keterangan / Rincian</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  Belum ada log aktivitas yang tercatat.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.85rem' }}>
                      <Clock size={14} />
                      {log.date}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '50%' }}>
                        <User size={14} color="#64748b" />
                      </div>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{log.user}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', 
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 
                    }}>
                      {log.module}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                    {log.detail}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
