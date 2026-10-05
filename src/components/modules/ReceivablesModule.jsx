import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  DollarSign,
  TrendingDown,
  Upload,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function ReceivablesModule({ 
  orders, 
  setOrders, 
  customers, 
  setCustomers,
  currentUser,
  addSystemLog
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderForPay, setSelectedOrderForPay] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Orders with remaining amount
  const unpaidOrders = orders.filter(o => o.remainingAmount > 0);

  const filteredUnpaid = unpaidOrders.filter(o => {
    return o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
           o.orderNo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPiutang = unpaidOrders.reduce((acc, curr) => acc + curr.remainingAmount, 0);

  const today = new Date();
  today.setHours(0,0,0,0);

  let overdueCount = 0;
  let dueThisWeekCount = 0;
  let overdueAmount = 0;

  unpaidOrders.forEach(o => {
    if (o.dueDate) {
      const due = new Date(o.dueDate);
      due.setHours(0,0,0,0);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays < 0) {
        overdueCount++;
        overdueAmount += o.remainingAmount;
      } else if (diffDays <= 7) {
        dueThisWeekCount++;
      }
    }
  });

  const handleRecordPayment = (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return alert('Masukkan nominal pembayaran');
    if (amount > selectedOrderForPay.remainingAmount) {
      return alert(`Nominal melebihi sisa piutang (${formatRupiah(selectedOrderForPay.remainingAmount)})`);
    }

    const newRemaining = selectedOrderForPay.remainingAmount - amount;
    const newDp = selectedOrderForPay.dpAmount + amount;
    const isNowLunas = newRemaining === 0;

    // Update customer's currentDebt
    if (setCustomers && amount > 0) {
      setCustomers(prev => prev.map(c => {
        if (c.name === selectedOrderForPay.customer) {
          return {
            ...c,
            currentDebt: Math.max(0, (c.currentDebt || 0) - amount)
          };
        }
        return c;
      }));
    }

    setOrders(orders.map(o => {
      if (o.id === selectedOrderForPay.id) {
        return {
          ...o,
          dpAmount: newDp,
          remainingAmount: newRemaining,
          paymentStatus: isNowLunas ? 'Lunas' : 'DP Bertambah',
          deliveryStatus: isNowLunas ? 'Siap Dibuatkan Surat Jalan' : o.deliveryStatus,
          notes: `${o.notes} | Diterima pembayaran ${formatRupiah(amount)} oleh ${currentUser}.`
        };
      }
      return o;
    }));

    if (addSystemLog) {
      addSystemLog('PAYMENT_RECEIVED', currentUser || 'Bude', `Menerima cicilan ${formatRupiah(amount)} untuk SO ${selectedOrderForPay.orderNo}`);
    }

    setSelectedOrderForPay(null);
    setPayAmount('');
  };

  const handleSendReminderWA = (ord) => {
    const cust = customers.find(c => c.name === ord.customer);
    const phone = cust?.phone || '08123456789';
    const text = `Halo Yth. ${ord.customer},\n\nKami dari *PT Paletindo Prakarsa Unggul* menginformasikan bahwa sisa tagihan pesanan No. *${ord.orderNo}* sebesar *${formatRupiah(ord.remainingAmount)}* telah mendekati/melewati batas waktu.\n\nMohon kesediaannya untuk melakukan pembayaran ke rekening berikut:\n🏦 *BCA: 123-456-7890*\n🏢 *A/N: PT Paletindo Prakarsa Unggul*\n\nTerima kasih atas kerja samanya.`;
    
    // Open WA web simulation
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="module-workspace">
      {/* Header Banner */}
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-tile">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <circle cx="13" cy="14" r="4.5" fill="#722ed1" />
              <path d="M10 29l20-18" stroke="#13c2c2" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="27" cy="26" r="4.5" fill="#722ed1" />
            </svg>
          </div>
          <div>
            <h2 className="module-title-main">Monitoring Piutang & Kas Masuk</h2>
            <p className="module-desc">Mengontrol tagihan tempo customer agar tidak ada lagi pesanan berbulan-bulan lupa ditagih.</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="kpi-label">Total Piutang Belum Tertagih</div>
            <div className="kpi-val" style={{ color: '#7c3aed' }}>{formatRupiah(totalPiutang)}</div>
            <div className="kpi-sub">{unpaidOrders.length} Nota Belum Lunas</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="kpi-label">Piutang Jatuh Tempo Minggu Ini</div>
            <div className="kpi-val" style={{ color: '#d97706' }}>
              {dueThisWeekCount} Nota
            </div>
            <div className="kpi-sub">Perlu Segera Ditagih via WA</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="kpi-label">Total Piutang Macet (Overdue)</div>
            <div className="kpi-val" style={{ color: '#dc2626' }}>{formatRupiah(overdueAmount)}</div>
            <div className="kpi-sub">{overdueCount} Nota Melewati Batas</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#16a34a' }}>
            <TrendingDown size={22} />
          </div>
          <div>
            <div className="kpi-label">Tingkat Kolektibilitas</div>
            <div className="kpi-val" style={{ color: '#16a34a' }}>88.4%</div>
            <div className="kpi-sub">Arus Kas Masuk Lancar</div>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="table-filter-bar">
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155' }}>
          Daftar Piutang Customer Berjalan ({filteredUnpaid.length})
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Data Rekap Piutang Toko berhasil diekspor ke format Excel (.xlsx)')}
            title="Download Rekap Piutang format Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Ekspor Excel</span>
          </button>

          <div className="search-input-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Cari Toko / No. Nota..."
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
              <th>No. Nota & Tgl</th>
              <th>Nama Toko / Pelanggan</th>
              <th>Total Pesanan</th>
              <th>Sudah Dibayar</th>
              <th>Sisa Piutang</th>
              <th>Jatuh Tempo</th>
              <th>Status Barang</th>
              <th className="th-sticky-action" style={{ textAlign: 'center' }}>Aksi Penagihan</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnpaid.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#10b981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} />
                    <span>Luar biasa! Semua piutang customer sudah lunas tertagih.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUnpaid.map((ord) => {
                let isOverdue = false;
                let isWarning = false;
                let isSafe = true;

                if (ord.dueDate) {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const due = new Date(ord.dueDate);
                  due.setHours(0,0,0,0);
                  
                  const diffTime = due - today;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                  
                  if (diffDays < 0) {
                    isOverdue = true;
                    isSafe = false;
                  } else if (diffDays <= 7) {
                    isWarning = true;
                    isSafe = false;
                  }
                }

                let rowStyle = {};
                if (isOverdue) rowStyle = { backgroundColor: '#fef2f2' };
                else if (isWarning) rowStyle = { backgroundColor: '#fffbeb' };
                else if (isSafe) rowStyle = { backgroundColor: '#f0fdf4' };

                return (
                  <tr key={ord.id} style={rowStyle}>
                    <td>
                      <strong>{ord.orderNo}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ord.date}</div>
                    </td>
                    <td>
                      <strong>{ord.customer}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Syarat: {ord.paymentType}</div>
                    </td>
                    <td>{formatRupiah(ord.totalAmount)}</td>
                    <td style={{ color: '#16a34a' }}>{formatRupiah(ord.dpAmount)}</td>
                    <td>
                      <strong style={{ color: '#dc2626', fontSize: '0.95rem' }}>
                        {formatRupiah(ord.remainingAmount)}
                      </strong>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: '600' }}>
                        {ord.dueDate || 'Belum Ditentukan'}
                      </div>
                      {isOverdue && (
                        <span className="status-pill badge-danger" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                          Terlambat
                        </span>
                      )}
                      {isWarning && (
                        <span className="status-pill badge-warning" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                          H-7 Jatuh Tempo
                        </span>
                      )}
                      {isSafe && ord.dueDate && (
                        <span className="status-pill badge-green" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                          Aman
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="status-pill badge-warning" style={{ fontSize: '0.72rem' }}>
                        {ord.deliveryStatus}
                      </span>
                    </td>
                    <td className="td-sticky-action">
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedOrderForPay(ord);
                            setPayAmount(ord.remainingAmount);
                          }}
                          title="Input Bukti Transfer / Pembayaran"
                        >
                          <span>Bayar</span>
                        </button>

                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#15803d', borderColor: '#86efac' }}
                          onClick={() => handleSendReminderWA(ord)}
                          title="Kirim Pesan Tagihan WhatsApp"
                        >
                          <MessageSquare size={13} />
                          <span>WA</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Input Pembayaran Pelunasan */}
      {selectedOrderForPay && (
        <div className="modal-overlay" onClick={() => setSelectedOrderForPay(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Catat Pembayaran: {selectedOrderForPay.orderNo}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedOrderForPay(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>Toko: <strong>{selectedOrderForPay.customer}</strong></div>
                  <div>Sisa Piutang: <strong style={{ color: '#dc2626' }}>{formatRupiah(selectedOrderForPay.remainingAmount)}</strong></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nominal Uang Masuk (Rp)</label>
                  <input 
                    type="number" 
                    min="1"
                    max={selectedOrderForPay.remainingAmount}
                    className="form-input"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      onClick={() => setPayAmount(selectedOrderForPay.remainingAmount)}
                    >
                      Bayar Penuh / Lunas (100%)
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      onClick={() => setPayAmount(Math.round(selectedOrderForPay.remainingAmount / 2))}
                    >
                      Bayar 50%
                    </button>
                  </div>
                  <span className="form-help" style={{ marginTop: '4px', display: 'block' }}>
                    Jika dibayar penuh ({formatRupiah(selectedOrderForPay.remainingAmount)}), pesanan langsung berstatus <strong>LUNAS</strong> dan barang siap dikirim.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Bukti Transfer / Struk (Opsional)</label>
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#f8fafc'
                  }}>
                    <Upload size={24} color="#64748b" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.82rem', color: '#475569' }}>Klik untuk lampirkan foto bukti transfer BCA / Mandiri</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedOrderForPay(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Pembayaran Kas Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
