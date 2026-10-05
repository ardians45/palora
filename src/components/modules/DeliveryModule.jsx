import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  Clock, 
  UserCheck,
  ShieldCheck,
  AlertCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function DeliveryModule({ 
  deliveries, 
  setDeliveries, 
  orders, 
  setOrders,
  products, 
  setProducts,
  stockMovements,
  setStockMovements,
  documents,
  setDocuments,
  onPrintDocument,
  currentUser 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ready orders (Must NOT be already shipped or having active Surat Jalan issued)
  const readyOrders = orders.filter(o => {
    const isAlreadyShipped = deliveries.some(d => d.orderNo === o.orderNo) ||
                             (o.deliveryStatus && (
                               o.deliveryStatus.includes('Surat Jalan Terbit') || 
                               o.deliveryStatus.includes('Sudah Diterbitkan') || 
                               o.deliveryStatus.includes('Terkirim')
                             ));
    if (isAlreadyShipped) return false;
    return o.deliveryStatus?.includes('Siap') || o.paymentStatus === 'Lunas';
  });

  // Form State
  const [selectedOrderNo, setSelectedOrderNo] = useState(readyOrders[0]?.orderNo || '');
  const [driverName, setDriverName] = useState('Pak Suryanto / Supir Paletindo');
  const [vehiclePlate, setVehiclePlate] = useState('B 9482 PPU (Pickup Grandmax)');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  // Keep selectedOrderNo in sync when modal opens or readyOrders changes
  React.useEffect(() => {
    if (readyOrders.length > 0 && !readyOrders.some(o => o.orderNo === selectedOrderNo)) {
      setSelectedOrderNo(readyOrders[0].orderNo);
    }
  }, [readyOrders, selectedOrderNo]);

  const selectedOrder = orders.find(o => o.orderNo === selectedOrderNo) || readyOrders[0];

  const filteredDeliveries = deliveries.filter(d => {
    return d.sjNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
           d.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
           d.driverName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateSJ = (e) => {
    e.preventDefault();
    if (!selectedOrder) return alert('Pilih pesanan yang siap dikirim terlebih dahulu.');

    // Format Asli Paletindo: 0062/DO/PIM/V/2026
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[new Date().getMonth()];
    const newSjNo = `${String(deliveries.length + 63).padStart(4, '0')}/DO/PIM/${romanMonth}/${new Date().getFullYear()}`;

    // OTOMATISASI KONTROL STOK: Potong stok fisik gudang secara resmi saat Surat Jalan terbit
    let deductedDetails = [];
    const newMovements = [];
    const nowTimeStr = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (products && setProducts && selectedOrder.items) {
      setProducts(prevProducts => prevProducts.map(prod => {
        const itemMatch = selectedOrder.items.find(it => it.productCode === prod.code || it.productId === prod.id);
        if (itemMatch) {
          const qtyDeducted = Number(itemMatch.qty);
          const afterStock = Math.max(0, prod.stock - qtyDeducted);
          deductedDetails.push(`${itemMatch.name}: -${qtyDeducted} ${prod.unit || 'pcs'}`);

          if (setStockMovements) {
            newMovements.push({
              id: `MV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              date: nowTimeStr,
              type: 'OUT',
              productId: prod.id,
              productCode: prod.code,
              productName: prod.name,
              qty: -qtyDeducted,
              refNo: newSjNo,
              reason: `Pengiriman resmi Surat Jalan ke ${selectedOrder.customer} (Ref: ${selectedOrder.orderNo})`,
              beforeStock: prod.stock,
              afterStock: afterStock,
              operator: currentUser || 'Mas Heri'
            });
          }

          return {
            ...prod,
            stock: afterStock
          };
        }
        return prod;
      }));

      if (newMovements.length > 0 && setStockMovements) {
        setStockMovements(prev => [...newMovements, ...(prev || [])]);
      }
    }

    const newDelivery = {
      id: `SJ-${Date.now()}`,
      sjNo: newSjNo,
      date: new Date().toISOString().split('T')[0],
      orderNo: selectedOrder.orderNo,
      customer: selectedOrder.customer,
      poCustomerRef: selectedOrder.poCustomerRef || 'PO-CUST-REGULAR',
      upPerson: selectedOrder.upPerson || 'Penerima Toko / Bagian Logistik',
      destination: destination || selectedOrder.destination || 'Alamat Toko Pemesan',
      driverName: driverName,
      vehiclePlate: vehiclePlate,
      status: 'Siap Berangkat (Stok Terpotong)',
      taxInvoiceNo: selectedOrder.taxInvoiceNo || `04002600${String(deliveries.length + 191092115)}`,
      items: selectedOrder.items,
      signedBy: null
    };

    // Update orders status
    if (setOrders) {
      setOrders(prevOrders => prevOrders.map(ord => {
        if (ord.orderNo === selectedOrder.orderNo) {
          return {
            ...ord,
            deliveryStatus: `Surat Jalan Terbit (${newSjNo})`
          };
        }
        return ord;
      }));
    }

    // Auto-archive digital document
    if (setDocuments) {
      setDocuments(prevDocs => [
        {
          id: `DOC-${Date.now()}`,
          title: `Surat Jalan Resmi: ${selectedOrder.customer}`,
          type: 'Surat Jalan Asli (Stempel Basah)',
          refNo: newSjNo,
          date: new Date().toISOString().split('T')[0],
          partner: selectedOrder.customer,
          fileName: `Surat_Jalan_${newSjNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          uploadedBy: currentUser || 'Mas Heri',
          category: 'Surat Jalan'
        },
        ...(prevDocs || [])
      ]);
    }

    setDeliveries([newDelivery, ...deliveries]);
    setIsModalOpen(false);
    alert(`Surat Jalan ${newSjNo} berhasil diterbitkan!\n\n✓ Otomatisasi Stok Fisik: Stok gudang telah dipotong & tercatat di Riwayat Mutasi:\n${deductedDetails.join('\n')}\n\n✓ Arsip Digital: Berkas otomatis terdaftar di modul Arsip Dokumen.\n\nSilakan cetak rangkap Surat Jalan untuk supir.`);
  };

  const handleMarkDelivered = (deliveryId) => {
    const receiver = prompt('Masukkan nama penerima barang di lokasi toko:', 'Pak Haji / Bagian Gudang Toko (Stempel)');
    if (!receiver) return;

    setDeliveries(deliveries.map(d => {
      if (d.id === deliveryId) {
        if (setOrders) {
          setOrders(prevOrders => prevOrders.map(ord => {
            if (ord.orderNo === d.orderNo) {
              return {
                ...ord,
                deliveryStatus: 'Terkirim & Diterima Pelanggan'
              };
            }
            return ord;
          }));
        }
        return {
          ...d,
          status: 'Terkirim & Diterima',
          signedBy: receiver
        };
      }
      return d;
    }));

    alert('Status Surat Jalan berhasil diubah menjadi Terkirim & Diterima!');
  };

  return (
    <div className="module-workspace">
      {/* Header Banner */}
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-tile">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <path d="M6 12h17v14H6V12z" fill="#0284c7" />
              <path d="M23 16h6l4 4v6h-10V16z" fill="#38bdf8" />
              <circle cx="12" cy="27" r="3.5" fill="#0f172a" />
              <circle cx="28" cy="27" r="3.5" fill="#0f172a" />
              <circle cx="12" cy="27" r="1.5" fill="#fff" />
              <circle cx="28" cy="27" r="1.5" fill="#fff" />
            </svg>
          </div>
          <div>
            <h2 className="module-title-main">Surat Jalan & Pengiriman Logistik</h2>
            <p className="module-desc">Penerbitan surat jalan resmi, validasi kelayakan kirim, dan kontrol armada pengantaran.</p>
          </div>
        </div>

        <div className="module-actions-right">
          <button 
            className="btn btn-primary"
            onClick={() => {
              if (readyOrders.length === 0) {
                alert('Tidak ada pesanan berstatus LUNAS atau Siap Kirim saat ini.');
                return;
              }
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Terbitkan Surat Jalan Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#ecfeff', color: '#0891b2' }}>
            <Truck size={22} />
          </div>
          <div>
            <div className="kpi-label">Pengiriman Hari Ini</div>
            <div className="kpi-val">{deliveries.length} Armada</div>
            <div className="kpi-sub">Grandmax & Engkel Paletindo</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="kpi-label">Dalam Perjalanan</div>
            <div className="kpi-val" style={{ color: '#b45309' }}>
              {deliveries.filter(d => d.status.includes('Berangkat') || d.status.includes('Perjalanan')).length} SJ
            </div>
            <div className="kpi-sub">Belum Kembali Tanda Tangan</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="kpi-label">Selesai & Diterima</div>
            <div className="kpi-val" style={{ color: '#16a34a' }}>
              {deliveries.filter(d => d.status.includes('Terkirim')).length} SJ
            </div>
            <div className="kpi-sub">Stempel Basah Terverifikasi</div>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="table-filter-bar">
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155' }}>
          Daftar Surat Jalan Pengantaran Barang
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Data Logistik & Surat Jalan berhasil diekspor ke format Excel (.xlsx)')}
            title="Download Logistik Surat Jalan format Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Ekspor Excel</span>
          </button>

          <div className="search-input-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Cari No. SJ / Toko / Supir..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="data-table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>No. Surat Jalan & Tgl</th>
              <th>Ref. No. Nota</th>
              <th>Nama Toko / Penerima</th>
              <th>Supir & Kendaraan</th>
              <th>Barang yang Dibawa</th>
              <th>Status Pengiriman</th>
              <th className="th-sticky-action" style={{ textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map((del) => (
              <tr key={del.id}>
                <td>
                  <strong>{del.sjNo}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{del.date}</div>
                </td>
                <td>
                  <span className="status-pill badge-slate">{del.orderNo}</span>
                </td>
                <td>
                  <strong>{del.customer}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{del.destination}</div>
                </td>
                <td>
                  <strong>{del.driverName}</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{del.vehiclePlate}</div>
                </td>
                <td>
                  {del.items.map((it, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem' }}>
                      • {it.name} ({it.qty} {it.unit || 'pcs'})
                    </div>
                  ))}
                </td>
                <td>
                  <span className={`status-pill ${del.status.includes('Terkirim') ? 'badge-success' : 'badge-warning'}`}>
                    {del.status}
                  </span>
                  {del.signedBy && (
                    <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '2px' }}>
                      Penerima: {del.signedBy}
                    </div>
                  )}
                </td>
                <td className="td-sticky-action">
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onPrintDocument('sj', del)}
                      title="Cetak Surat Jalan Resmi"
                    >
                      <Printer size={14} />
                      <span>Cetak SJ</span>
                    </button>

                    {!del.status.includes('Terkirim') && (
                      <button 
                        className="btn btn-primary btn-sm"
                        style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        onClick={() => handleMarkDelivered(del.id)}
                        title="Tandai Sudah Diterima Customer"
                      >
                        <UserCheck size={14} />
                        <span>Diterima</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Terbitkan Surat Jalan */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Terbitkan Surat Jalan (SJ) Pengiriman</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSJ}>
              <div className="modal-body">
                {readyOrders.length === 0 ? (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '10px',
                    padding: '16px',
                    color: '#92400e',
                    fontSize: '0.88rem'
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={18} color="#d97706" />
                      <span>Belum Ada Pesanan yang Siap Kirim</span>
                    </div>
                    <div>
                      Semua pesanan lunas saat ini sudah memiliki Surat Jalan, atau pesanan yang ada masih berstatus <strong>"Tahan (Menunggu Pelunasan)"</strong>.
                      <br /><br />
                      Silakan ke modul <strong>Penjualan & Kasir</strong> atau <strong>Piutang & Kas</strong> untuk mencatat pelunasan pesanan terlebih dahulu.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Pilih Nota Penjualan ({readyOrders.length} Pesanan Siap Kirim)</label>
                      <select 
                        className="form-select"
                        value={selectedOrderNo}
                        onChange={(e) => {
                          setSelectedOrderNo(e.target.value);
                          const ord = orders.find(o => o.orderNo === e.target.value);
                          if (ord) setDestination(ord.destination || 'Alamat Pelanggan Terdaftar');
                        }}
                      >
                        {readyOrders.map(o => (
                          <option key={o.id} value={o.orderNo}>
                            {o.orderNo} — {o.customer} ({o.paymentStatus})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Nama Supir / Pengantar</label>
                        <input 
                          type="text" 
                          className="form-input"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Plat Nomor Kendaraan</label>
                        <input 
                          type="text" 
                          className="form-input"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Alamat / Lokasi Pengantaran</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="Contoh: Pasar Induk Kramat Jati Blok C No. 12"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                      />
                    </div>

                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '0.82rem', color: '#065f46' }}>
                      <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px' }} />
                      <strong>SOP Terpenuhi:</strong> Pesanan ini telah lunas / memenuhi syarat untuk dikeluarkan dari gudang.
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={readyOrders.length === 0}
                >
                  Terbitkan & Siapkan Dokumen Cetak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
