import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Package, 
  CreditCard,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function ReportsModule({ 
  orders = [], 
  products = [], 
  purchaseOrders = [], 
  currentUser 
}) {
  const [filterStockOnly, setFilterStockOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const totalOmzet = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalKasDiterima = orders.reduce((acc, curr) => acc + (curr.dpAmount || 0), 0);
  const totalPiutang = orders.reduce((acc, curr) => acc + (curr.remainingAmount || 0), 0);
  const totalNilaiStok = products.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.buyPrice || 0)), 0);

  // Filtered & Sorted Valuation List
  const filteredProducts = products.filter(p => {
    if (filterStockOnly && (p.stock || 0) <= 0) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(q) ||
             p.code.toLowerCase().includes(q) ||
             (p.factory && p.factory.toLowerCase().includes(q));
    }
    return true;
  }).sort((a, b) => ((b.stock || 0) * (b.buyPrice || 0)) - ((a.stock || 0) * (a.buyPrice || 0)));

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    const headers = ['Kode Barang', 'Nama Produk', 'Pabrik', 'Stok Gudang', 'Satuan', 'Harga Beli (Modal)', 'Harga Jual Toko', 'Total Valuasi Modal'];
    const rows = products.map(p => [
      `"${p.code}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.factory || '').replace(/"/g, '""')}"`,
      p.stock || 0,
      `"${p.unit || 'pcs'}"`,
      p.buyPrice || 0,
      p.sellPrice || 0,
      (p.stock || 0) * (p.buyPrice || 0)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Valuasi_Stok_Paletindo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="module-workspace">
      {/* Header Banner */}
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
            <BarChart3 size={28} />
          </div>
          <div>
            <h2 className="module-title-main">Laporan & Analisis Bisnis</h2>
            <p className="module-desc">Ringkasan performa finansial, omzet kas masuk, valuasi aset stok, dan perputaran barang.</p>
          </div>
        </div>

        <div className="module-actions-right">
          <button 
            className="btn btn-primary"
            onClick={handleExportCSV}
            title="Download file CSV lengkap 446 barang"
          >
            <Download size={16} />
            <span>Ekspor Valuasi (Excel / CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fdf2f8', color: '#db2777' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="kpi-label">Total Omzet Penjualan</div>
            <div className="kpi-val" style={{ color: '#db2777' }}>{formatRupiah(totalOmzet)}</div>
            <div className="kpi-sub">{orders.length} Transaksi Tercatat</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#16a34a' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="kpi-label">Uang Kas Diterima (Real)</div>
            <div className="kpi-val" style={{ color: '#16a34a' }}>{formatRupiah(totalKasDiterima)}</div>
            <div className="kpi-sub">Masuk Rekening Mandiri / Tunai</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div className="kpi-label">Piutang Pelanggan Tertahan</div>
            <div className="kpi-val" style={{ color: '#b45309' }}>{formatRupiah(totalPiutang)}</div>
            <div className="kpi-sub">Barang Masih Ditahan di Gudang</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#eef0fe', color: '#5c59f7' }}>
            <Package size={22} />
          </div>
          <div>
            <div className="kpi-label">Nilai Valuasi Stok Gudang</div>
            <div className="kpi-val" style={{ color: '#5c59f7' }}>{formatRupiah(totalNilaiStok)}</div>
            <div className="kpi-sub">Total Aset 446 Master Barang</div>
          </div>
        </div>
      </div>

      {/* Product Stock Valuation Table */}
      <div className="data-table-card">
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <strong style={{ fontSize: '0.95rem' }}>Valuasi Nilai Persediaan per Produk</strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}>
              ({filteredProducts.length} produk ditampilkan, diurutkan nilai tertinggi)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="filter-tabs" style={{ marginBottom: 0 }}>
              <button 
                className={`filter-tab-btn ${filterStockOnly ? 'active' : ''}`}
                onClick={() => { setFilterStockOnly(true); setCurrentPage(1); }}
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              >
                Stok Ada ({products.filter(p => p.stock > 0).length})
              </button>
              <button 
                className={`filter-tab-btn ${!filterStockOnly ? 'active' : ''}`}
                onClick={() => { setFilterStockOnly(false); setCurrentPage(1); }}
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              >
                Semua ({products.length})
              </button>
            </div>

            <div className="search-input-box" style={{ width: '220px' }}>
              <Search size={15} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Cari barang / kode..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '0.82rem' }}
              />
            </div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Kode & Nama Produk</th>
              <th>Pabrik Supplier</th>
              <th style={{ textAlign: 'center' }}>Stok Fisik</th>
              <th>Harga Modal (Beli)</th>
              <th>Harga Jual Toko</th>
              <th style={{ textAlign: 'right' }}>Total Valuasi Modal</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Tidak ada barang yang sesuai filter pencarian.
                </td>
              </tr>
            ) : (
              paginatedProducts.map(p => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.code}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem' }}>{p.factory}</span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: '700' }}>
                    <span style={{ color: p.stock <= (p.minStock || 5) ? '#dc2626' : '#0f172a' }}>
                      {p.stock} {p.unit || 'pcs'}
                    </span>
                  </td>
                  <td>{formatRupiah(p.buyPrice)}</td>
                  <td style={{ color: '#5c59f7', fontWeight: '600' }}>{formatRupiah(p.sellPrice)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>
                    {formatRupiah((p.stock || 0) * (p.buyPrice || 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.82rem',
            color: '#64748b'
          }}>
            <div>
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filteredProducts.length} total produk)
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} />
                <span>Sebelumnya</span>
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span>Berikutnya</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Insights for Owner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#ede9fe',
          color: '#7c3aed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h4 style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>
            Rangkuman Eksekutif untuk Pak Yanto (Owner PT Paletindo):
          </h4>
          <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.6 }}>
            1. Nilai aset stok terbesar didominasi oleh <strong>Palet FP 0303 Hijau</strong> (1.604 pcs = Rp 41,7 Juta modal) dan <strong>Palet FP 0303 Coklat</strong> (696 pcs = Rp 18,1 Juta modal).<br />
            2. Kebijakan <strong>Tahan Pengiriman</strong> berjalan efektif: sisa piutang tertahan sebesar {formatRupiah(totalPiutang)} tidak dikeluarkan dari gudang sebelum pelunasan diterima.<br />
            3. Seluruh pergerakan barang (PO masuk, Surat Jalan keluar, dan sinkronisasi Marketplace) terhubung langsung dengan kartu stok fisik gudang secara otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}
