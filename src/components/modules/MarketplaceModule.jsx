import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle,
  Store,
  Video,
  ShoppingBag,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function MarketplaceModule({ 
  products, 
  setProducts, 
  stockMovements, 
  setStockMovements, 
  currentUser,
  addSystemLog 
}) {
  const [selectedChannel, setSelectedChannel] = useState('shopee');
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  
  const fileInputRef = useRef(null);

  // Authentic marketplace orders matching real Paletindo catalog
  const channelDataMock = {
    shopee: [
      { orderId: '260927SHP9101A', product: 'Palet FP 0303 - Hijau', code: 'PLT-0002', qty: 10, buyer: 'Mitra Usaha Jaya - Jakbar', status: 'Selesai' },
      { orderId: '260927SHP9102B', product: 'Palet FP 0303 - Coklat', code: 'PLT-0004', qty: 5, buyer: 'Dinda Plastik - Depok', status: 'Selesai' },
      { orderId: '260927SHP9103C', product: 'Part Case Small - Merah', code: 'PLT-0008', qty: 1000, buyer: 'Bengkel Berkah - Cikarang', status: 'Dibatalkan Pembeli' },
      { orderId: '260927SHP9999Z', product: 'Barang Aneh Tidak Dikenal', code: 'UNKNOWN-01', qty: 2, buyer: 'Testing Error - Jaktim', status: 'Selesai' }
    ],
    tokopedia: [
      { orderId: 'INV/20260927/MPL/39101', product: 'Palet FP 0303 - Hijau', code: 'PLT-0002', qty: 15, buyer: 'Logistik Nusantara - Bekasi', status: 'Selesai' },
      { orderId: 'INV/20260927/MPL/39102', product: 'Palet FP 0303 - Coklat', code: 'PLT-0004', qty: 8, buyer: 'Toko Plastik Sentosa - Tangerang', status: 'Selesai' }
    ],
    tiktok: [
      { orderId: '5789210928172901', product: 'Part Case Small - Merah', code: 'PLT-0008', qty: 10, buyer: 'Rizky Hendra - Tangerang', status: 'Selesai' }
    ]
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSimulatingUpload(true);
    setUploadedFile(file);
    setSyncSuccess(false);

    // Simulate parsing the Excel/CSV file based on selected channel
    setTimeout(() => {
      let rawData = channelDataMock[selectedChannel] || channelDataMock.shopee;
      
      // Map data with internal logic
      const mapped = rawData.map(r => {
        // Check if duplicate import (by checking stock movements refNo)
        const isDuplicate = stockMovements.some(m => m.refNo === r.orderId);
        // Check if SKU exists
        const skuExists = products.some(p => p.code === r.code);
        // Check if status is valid (Selesai/Terkirim)
        const isValidStatus = r.status === 'Selesai' || r.status === 'Terkirim';

        return {
          ...r,
          selected: isValidStatus && !isDuplicate && skuExists,
          isDuplicate,
          skuExists,
          isValidStatus,
          errorReason: isDuplicate ? 'Sudah Diimpor' : (!isValidStatus ? 'Bukan Selesai' : (!skuExists ? 'SKU Tidak Dikenal' : ''))
        };
      });

      setParsedRows(mapped);
      setIsSimulatingUpload(false);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 1200);
  };

  const clearFile = () => {
    setUploadedFile(null);
    setParsedRows([]);
    setSyncSuccess(false);
  };

  const toggleRowSelect = (index) => {
    if (syncSuccess) return;
    setParsedRows(prev => {
      const next = [...prev];
      next[index].selected = !next[index].selected;
      return next;
    });
  };

  const handleSimulateSync = () => {
    const selectedRows = parsedRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      return alert('Tidak ada pesanan valid yang dicentang untuk diproses!');
    }

    setIsSimulatingUpload(true);
    setTimeout(() => {
      const nowTimeStr = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const newMovements = [];
      let deductedSummary = [];

      // Deduct stock for matched real products
      setProducts(prevProducts => prevProducts.map(p => {
        let totalDeductionForP = 0;
        const relevantRows = [];

        selectedRows.forEach(row => {
          if (row.code === p.code) {
            totalDeductionForP += Number(row.qty);
            relevantRows.push(row);
          }
        });

        if (totalDeductionForP > 0) {
          const afterStock = Math.max(0, p.stock - totalDeductionForP);
          deductedSummary.push(`${p.name}: -${totalDeductionForP} ${p.unit || 'pcs'}`);
          
          if (setStockMovements) {
            relevantRows.forEach(row => {
              newMovements.push({
                id: `MV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                date: nowTimeStr,
                type: 'OUT',
                productId: p.id,
                productCode: p.code,
                productName: p.name,
                qty: -Number(row.qty),
                refNo: row.orderId,
                reason: `Sinkronisasi Penjualan Online (${selectedChannel.toUpperCase()}) - Pembeli: ${row.buyer}`,
                beforeStock: p.stock, // Not perfectly serializing but close enough for UI
                afterStock: afterStock, // Not perfectly serializing but close enough for UI
                operator: currentUser || 'Mas Heri'
              });
            });
          }

          return { ...p, stock: afterStock };
        }
        return p;
      }));

      if (newMovements.length > 0 && setStockMovements) {
        setStockMovements(prev => [...newMovements, ...(prev || [])]);
      }

      if (addSystemLog) {
        addSystemLog('SYNC_MARKETPLACE', currentUser || 'Mas Heri', `Memotong stok massal untuk ${selectedRows.length} pesanan dari ${selectedChannel.toUpperCase()} (Total item: ${selectedRows.reduce((a, b) => a + b.qty, 0)})`);
      }

      setIsSimulatingUpload(false);
      setSyncSuccess(true);
      alert(`Berhasil sinkronisasi ${selectedRows.length} pesanan dari ${selectedChannel.toUpperCase()}!\n\n✓ Stok Gudang Telah Terpotong & Tercatat di Riwayat Mutasi:\n${deductedSummary.join('\n')}`);
    }, 1000);
  };

  return (
    <div className="module-workspace">
      {/* Header Banner */}
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-icon" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h2 className="module-title-main">Import Penjualan Marketplace (Excel)</h2>
            <p className="module-desc">Sinkronisasi pesanan dari Shopee, Tokopedia, dll via upload file Excel untuk potong stok gudang otomatis.</p>
          </div>
        </div>
      </div>

      {/* Channel Switcher */}
      <div className="table-filter-bar">
        <div className="filter-tabs">
          <button 
            className={`filter-tab-btn ${selectedChannel === 'shopee' ? 'active' : ''}`}
            onClick={() => { setSelectedChannel('shopee'); clearFile(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ShoppingBag size={15} color="#ea580c" />
            <span>Shopee Seller Center</span>
          </button>
          <button 
            className={`filter-tab-btn ${selectedChannel === 'tokopedia' ? 'active' : ''}`}
            onClick={() => { setSelectedChannel('tokopedia'); clearFile(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Store size={15} color="#16a34a" />
            <span>Tokopedia Seller</span>
          </button>
          <button 
            className={`filter-tab-btn ${selectedChannel === 'tiktok' ? 'active' : ''}`}
            onClick={() => { setSelectedChannel('tiktok'); clearFile(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Video size={15} color="#475569" />
            <span>TikTok Shop</span>
          </button>
        </div>
      </div>

      {/* Upload Box Area */}
      {!uploadedFile ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px dashed #cbd5e1',
            padding: '40px 20px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '20px'
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            {isSimulatingUpload ? <RefreshCw size={32} className="spin-icon" /> : <Upload size={32} />}
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
            {isSimulatingUpload ? 'Membaca Isi File...' : `Drag & Drop File Rekap ${selectedChannel.toUpperCase()} (.xlsx / .csv)`}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '500px', margin: '8px auto 0' }}>
            {isSimulatingUpload ? 'Mohon tunggu sebentar...' : 'Atau klik di area ini untuk mencari file dari komputer. Pastikan mengunduh format default dari Seller Center.'}
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileUpload}
          />
        </div>
      ) : (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ background: '#16a34a', color: 'white', padding: '12px', borderRadius: '8px' }}>
            <FileSpreadsheet size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a' }}>{uploadedFile.name}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Berhasil diurai • {parsedRows.length} Baris transaksi ditemukan
            </div>
          </div>
          <button className="btn btn-secondary" onClick={clearFile} disabled={isSimulatingUpload || syncSuccess}>
            <Trash2 size={16} /> Batal / Ganti File
          </button>
          {!syncSuccess && (
            <button className="btn btn-primary" onClick={handleSimulateSync} disabled={isSimulatingUpload}>
              {isSimulatingUpload ? <RefreshCw size={16} className="spin-icon" /> : <CheckCircle2 size={16} />}
              Proses & Potong Stok Gudang
            </button>
          )}
        </div>
      )}

      {/* Preview Sync Table */}
      {parsedRows.length > 0 && (
        <div className="data-table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.92rem' }}>Pratinjau Pesanan Terdeteksi</strong>
            {syncSuccess && (
              <span className="status-pill badge-success">
                <CheckCircle2 size={13} /> Stok Berhasil Dipotong
              </span>
            )}
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  Pilih
                </th>
                <th>ID Pesanan Marketplace</th>
                <th>Nama Produk di Toko</th>
                <th>Kode SKU Mapping</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th>Status Marketplace</th>
                <th>Status Sinkronisasi</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.map((r, i) => (
                <tr key={i} style={!r.selected && !syncSuccess ? { background: '#f1f5f9', opacity: 0.7 } : {}}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={r.selected} 
                      onChange={() => toggleRowSelect(i)} 
                      disabled={syncSuccess}
                      style={{ cursor: syncSuccess ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                  <td><strong>{r.orderId}</strong></td>
                  <td>
                    {r.product}
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pembeli: {r.buyer}</div>
                  </td>
                  <td>
                    {r.skuExists ? (
                      <span className="status-pill badge-slate">{r.code}</span>
                    ) : (
                      <span className="status-pill badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> {r.code} (Tidak Dikenal)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: '700' }}>{r.qty} pcs</td>
                  <td>{r.status}</td>
                  <td>
                    {syncSuccess && r.selected ? (
                      <span className="status-pill badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> Terpotong
                      </span>
                    ) : syncSuccess && !r.selected ? (
                      <span className="status-pill badge-slate">Dilewati</span>
                    ) : r.errorReason ? (
                      <span className="status-pill badge-warning" style={{ color: '#b45309' }}>
                        {r.errorReason}
                      </span>
                    ) : (
                      <span className="status-pill badge-green" style={{ color: '#16a34a' }}>
                        Siap Proses
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
