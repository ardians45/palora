import React, { useState } from 'react';
import { 
  Store, 
  Plus, 
  Search, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  ArrowRight,
  Truck,
  CreditCard,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Camera,
  FileText,
  Calendar,
  User,
  Package,
  Building2
} from 'lucide-react';
import POSModule from './POSModule';

export default function SalesModule({ 
  orders, 
  setOrders, 
  products, 
  setProducts,
  customers,
  setCustomers,
  stockMovements,
  setStockMovements,
  onPrintDocument,
  currentUser,
  addSystemLog
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [posMode, setPosMode] = useState('so'); // 'so' = Sales Order (B2B), 'pos' = Walk-in
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, order: null, amount: 0, date: new Date().toISOString().split('T')[0], method: 'Transfer Bank' });

  // Form State for New Order
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [qty, setQty] = useState(50);
  const [paymentType, setPaymentType] = useState('Tempo 14 Hari');
  const [dpInput, setDpInput] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  const subtotal = (selectedProduct?.sellPrice || 0) * (qty || 0);
  const minDpRequired = Math.round(subtotal * 0.25);
  const isDpValid = Number(dpInput) >= minDpRequired;
  const remaining = Math.max(0, subtotal - Number(dpInput));

  // Initialize or re-evaluate sensible DP default when modal opens or product changes
  React.useEffect(() => {
    if (isModalOpen && subtotal > 0 && dpInput === 0) {
      setDpInput(minDpRequired);
    }
  }, [isModalOpen, selectedProductId]);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Filter orders
  const filteredOrders = orders.filter(ord => {
    const matchesSearch = ord.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ord.customer.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === 'dp') return ord.paymentStatus.includes('DP Terbayar');
    if (activeTab === 'lunas') return ord.paymentStatus.includes('Lunas');
    if (activeTab === 'tahan') return ord.deliveryStatus.includes('Tahan');
    return true;
  });

  // Calculate KPIs
  const totalOmzet = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalOutstanding = orders.reduce((acc, curr) => acc + curr.remainingAmount, 0);
  const totalSiapKirim = orders.filter(o => o.deliveryStatus.includes('Siap')).length;

  const handleCreateOrder = (e) => {
    e.preventDefault();
    if (!qty || qty <= 0) return alert('Jumlah barang harus lebih dari 0');

    if (qty > (selectedProduct?.stock || 0)) {
      const proceed = confirm(`Perhatian: Stok fisik ${selectedProduct.name} di gudang saat ini hanya ${selectedProduct.stock} ${selectedProduct.unit || 'pcs'}. Pesanan ini membutuhkan ${qty} ${selectedProduct.unit || 'pcs'}.\n\nApakah tetap ingin melanjutkan sebagai Pesanan Inden (Backorder ke Pabrik)?`);
      if (!proceed) return;
    }

    const newOrderNo = `INV-${String(orders.length + 91).padStart(4, '0')}/PIM/${new Date().getFullYear()}`;
    
    let paymentStatus = 'Lunas';
    let deliveryStatus = 'Siap Dibuatkan Surat Jalan';

    if (remaining > 0) {
      paymentStatus = Number(dpInput) > 0 ? 'DP Terbayar (Tahan Pengiriman)' : 'Belum Bayar';
      deliveryStatus = 'Tahan (Menunggu Pelunasan)';
    }

    const newOrder = {
      id: `ORD-${Date.now()}`,
      orderNo: newOrderNo,
      date: new Date().toISOString().split('T')[0],
      customer: selectedCustomer.name,
      items: [
        {
          productCode: selectedProduct.code,
          name: selectedProduct.name,
          qty: Number(qty),
          price: selectedProduct.sellPrice,
          total: subtotal
        }
      ],
      totalAmount: subtotal,
      dpAmount: Number(dpInput),
      remainingAmount: remaining,
      paymentType,
      paymentStatus,
      deliveryStatus,
      dueDate: remaining > 0 ? '2026-10-15' : null,
      notes: orderNotes || (remaining > 0 ? 'Tahan pengiriman sampai sisa dilunasi!' : 'Lunas. Siap kirim.'),
      createdBy: currentUser || 'Mas Heri'
    };

    // Update customer debt if remaining balance exists
    if (remaining > 0 && setCustomers) {
      setCustomers(prev => prev.map(c => {
        if (c.name === selectedCustomer.name) {
          return {
            ...c,
            currentDebt: (c.currentDebt || 0) + remaining
          };
        }
        return c;
      }));
    }

    setOrders([newOrder, ...orders]);
    setIsModalOpen(false);
    alert(`Pesanan ${newOrderNo} berhasil dibuat!\n\n✓ Status Alur: ${deliveryStatus}\n✓ Kontrol Stok: Barang dicatat sebagai "Dipesan (Reserved)". Stok fisik gudang baru akan dipotong saat Surat Jalan (DO) resmi terbit.`);
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    const { order, amount, date, method } = paymentModal;
    const payAmount = Number(amount);
    
    if (payAmount <= 0) return alert('Jumlah pembayaran tidak valid');
    if (payAmount > order.remainingAmount) return alert('Jumlah pembayaran melebihi sisa tagihan');

    // Update Customer Debt
    if (setCustomers && payAmount > 0) {
      setCustomers(prev => prev.map(c => {
        if (c.name === order.customer) {
          return { ...c, currentDebt: Math.max(0, (c.currentDebt || 0) - payAmount) };
        }
        return c;
      }));
    }

    // Update Order
    setOrders(orders.map(o => {
      if (o.id === order.id) {
        const newRemaining = o.remainingAmount - payAmount;
        const newDp = (o.dpAmount || 0) + payAmount;
        const payments = o.payments || [];
        payments.push({
          id: `PAY-${Date.now()}`,
          date,
          amount: payAmount,
          method,
          recordedBy: currentUser || 'Finance'
        });

        return {
          ...o,
          dpAmount: newDp,
          remainingAmount: newRemaining,
          paymentStatus: newRemaining === 0 ? 'Lunas' : 'DP Terbayar (Tahan Pengiriman)',
          deliveryStatus: newRemaining === 0 ? 'Siap Dibuatkan Surat Jalan' : o.deliveryStatus,
          payments,
          notes: newRemaining === 0 ? `${o.notes} | Pelunasan dikonfirmasi oleh ${currentUser}.` : o.notes
        };
      }
      return o;
    }));
    
    if (addSystemLog) {
      addSystemLog('Penjualan', 'Pembayaran Piutang', `Pembayaran Rp ${Number(payAmount).toLocaleString('id-ID')} untuk nota ${order.orderNo}`);
    }

    setPaymentModal({ isOpen: false, order: null, amount: 0, date: '', method: 'Transfer Bank' });
    alert(`Pembayaran berhasil dicatat. Sisa tagihan: ${formatRupiah(order.remainingAmount - payAmount)}`);
  };

  return (
    <div className="module-workspace">
      {/* Header Banner */}
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-tile">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <rect x="9" y="20" width="6" height="13" rx="3" fill="#b37feb" />
              <rect x="17" y="14" width="6" height="19" rx="3" fill="#fa8c16" />
              <rect x="25" y="8" width="6" height="25" rx="3" fill="#ff4d4f" />
            </svg>
          </div>
          <div>
            <h2 className="module-title-main">Penjualan & Kasir (Point of Sale)</h2>
            <p className="module-desc">Pencatatan nota penjualan, validasi DP minimal 25%, dan kontrol status tahan barang.</p>
          </div>
        </div>

        <div className="module-actions-right" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => { setPosMode('pos'); setIsModalOpen(true); }}
          >
            <Store size={16} />
            <span>Buka Kasir (Walk-in)</span>
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { setPosMode('so'); setIsModalOpen(true); }}
          >
            <Plus size={16} />
            <span>Buat Sales Order (B2B)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Store size={22} />
          </div>
          <div>
            <div className="kpi-label">Total Omzet Pesanan</div>
            <div className="kpi-val">{formatRupiah(totalOmzet)}</div>
            <div className="kpi-sub">{orders.length} Transaksi Tercatat</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div className="kpi-label">Sisa Pelunasan Ditahan</div>
            <div className="kpi-val" style={{ color: '#dc2626' }}>{formatRupiah(totalOutstanding)}</div>
            <div className="kpi-sub">Barang Belum Boleh Keluar</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Truck size={22} />
          </div>
          <div>
            <div className="kpi-label">Pesanan Siap Kirim</div>
            <div className="kpi-val" style={{ color: '#16a34a' }}>{totalSiapKirim} Nota</div>
            <div className="kpi-sub">Sudah Lunas / Siap SJ</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-filter-bar">
        <div className="filter-tabs">
          <button 
            className={`filter-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Semua Pesanan ({orders.length})
          </button>
          <button 
            className={`filter-tab-btn ${activeTab === 'tahan' ? 'active' : ''}`}
            onClick={() => setActiveTab('tahan')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <AlertTriangle size={14} color="#f59e0b" />
            <span>Barang Ditahan (Belum Lunas)</span>
          </button>
          <button 
            className={`filter-tab-btn ${activeTab === 'lunas' ? 'active' : ''}`}
            onClick={() => setActiveTab('lunas')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle2 size={14} color="#10b981" />
            <span>Lunas & Siap Kirim</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Data seluruh pesanan berhasil diekspor ke format Excel (.xlsx)')}
            title="Download Rekap Pesanan format Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Ekspor Excel</span>
          </button>

        <div className="search-input-box">
          <Search size={16} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Cari No. Nota / Toko..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </div>

      {/* Orders Table */}
      <div className="data-table-card premium-table-wrapper">
        <table className="premium-table">
          <colgroup>
            <col style={{ width: '15%', minWidth: '140px' }} />
            <col style={{ width: '18%', minWidth: '170px' }} />
            <col style={{ width: '24%', minWidth: '220px' }} />
            <col style={{ width: '13%', minWidth: '125px' }} />
            <col style={{ width: '16%', minWidth: '160px' }} />
            <col style={{ width: '14%', minWidth: '140px' }} />
            <col style={{ width: '10%', minWidth: '95px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Detail Nota</th>
              <th>Pelanggan</th>
              <th>Ringkasan Barang</th>
              <th>Total Tagihan</th>
              <th>Status Pembayaran</th>
              <th>Status Pengiriman</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state-cell">
                  <Package size={42} color="#cbd5e1" />
                  <p>Tidak ada data pesanan ditemukan.</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                const total = ord.totalAmount || 1;
                const paid = ord.dpAmount || 0;
                const pct = Math.min(100, Math.round((paid / total) * 100));

                return (
                  <tr key={ord.id} className="order-row">
                    {/* Detail Nota */}
                    <td>
                      <div className="nota-cell-content">
                        <div className="nota-number-wrap">
                          <span className="nota-number-badge">
                            <FileText size={12} className="nota-icon" />
                            <span>{ord.orderNo}</span>
                          </span>
                          {ord.isDirectShip && (
                            <span className="direct-ship-chip">DIRECT SHIP</span>
                          )}
                        </div>
                        <div className="nota-date-sub">
                          <Calendar size={12} />
                          <span>{ord.date}</span>
                        </div>
                      </div>
                    </td>

                    {/* Pelanggan */}
                    <td>
                      <div className="customer-cell-modern">
                        <div className="customer-avatar-box">
                          <Store size={15} />
                        </div>
                        <div className="customer-meta-wrap">
                          <div className="customer-name-modern" title={ord.customer}>
                            {ord.customer}
                          </div>
                          <div className="customer-pic-sub">
                            <User size={11} />
                            <span>PIC: {ord.createdBy || 'Staff'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Ringkasan Barang */}
                    <td>
                      <div className="items-list-modern">
                        {ord.items.slice(0, 2).map((it, idx) => (
                          <div key={idx} className="item-chip-row" title={`${it.qty}x ${it.name}`}>
                            <span className="item-qty-tag">{it.qty}x</span>
                            <span className="item-name-tag">{it.name}</span>
                          </div>
                        ))}
                        {ord.items.length > 2 && (
                          <div className="item-more-badge">+{ord.items.length - 2} barang lainnya</div>
                        )}
                      </div>
                    </td>

                    {/* Total Tagihan */}
                    <td>
                      <div className="amount-cell-modern">
                        <div className="amount-primary">{formatRupiah(ord.totalAmount)}</div>
                        <div className="amount-sub-badge">
                          <span>{ord.items.reduce((s, it) => s + (it.qty || 0), 0)} unit</span>
                          <span className="dot-sep">•</span>
                          <span>{ord.paymentType || 'Tempo'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Pembayaran */}
                    <td>
                      <div className="payment-cell-modern">
                        {ord.remainingAmount === 0 ? (
                          <div className="payment-status-block">
                            <span className="status-pill-modern pill-lunas">
                              <CheckCircle2 size={13} />
                              <span>LUNAS 100%</span>
                            </span>
                            <span className="payment-sub-text">Terbayar Penuh</span>
                          </div>
                        ) : ord.dpAmount > 0 ? (
                          <div className="payment-status-block">
                            <div className="payment-progress-container">
                              <div className="payment-progress-label">
                                <span className="progress-tag-dp">DP {pct}% Masuk</span>
                                <span className="progress-val-dp">{formatRupiah(ord.dpAmount)}</span>
                              </div>
                              <div className="payment-progress-track">
                                <div className="payment-progress-bar-fill" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                            <div className="sisa-payment-row">
                              <span className="sisa-title">Sisa:</span>
                              <span className="sisa-amount-highlight">{formatRupiah(ord.remainingAmount)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="payment-status-block">
                            <span className="status-pill-modern pill-unpaid">
                              <Clock size={12} />
                              <span>BELUM ADA DP</span>
                            </span>
                            <div className="sisa-payment-row" style={{ marginTop: '5px' }}>
                              <span className="sisa-title">Tagihan:</span>
                              <span className="sisa-amount-highlight">{formatRupiah(ord.remainingAmount)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Pengiriman */}
                    <td>
                      <div className="delivery-status-modern">
                        {ord.deliveryStatus.includes('Tahan') ? (
                          <div className="delivery-status-block">
                            <div className="status-pill-modern pill-tahan" title="Pengiriman dikunci sistem sampai pelunasan">
                              <span className="pill-dot dot-amber"></span>
                              <ShieldAlert size={13} />
                              <span>DITAHAN</span>
                            </div>
                            <span className="delivery-sub-warn">Tunggu Lunas</span>
                          </div>
                        ) : (
                          <div className="delivery-status-block">
                            <div className="status-pill-modern pill-siap" title="Pesanan siap dibuatkan Surat Jalan">
                              <span className="pill-dot dot-green"></span>
                              <Truck size={13} />
                              <span>SIAP KIRIM</span>
                            </div>
                            <span className="delivery-sub-ok">Sudah Siap SJ</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td>
                      <div className="actions-modern-cell">
                        {ord.remainingAmount > 0 && (
                          <button 
                            className="btn-action-pay-modern" 
                            onClick={() => setPaymentModal({ isOpen: true, order: ord, amount: ord.remainingAmount, date: new Date().toISOString().split('T')[0], method: 'Transfer Bank' })} 
                            title="Catat Pembayaran Pelunasan"
                          >
                            <CreditCard size={13} />
                            <span>Bayar</span>
                          </button>
                        )}
                        <button 
                          className="btn-action-print-modern" 
                          onClick={() => onPrintDocument('sales', ord)} 
                          title="Cetak Nota Pesanan"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table Footer Summary Strip */}
        <div className="table-footer-bar">
          <div className="table-footer-left">
            <span>Menampilkan <strong>{filteredOrders.length}</strong> dari <strong>{orders.length}</strong> pesanan tercatat</span>
          </div>
          <div className="table-footer-right">
            <span className="footer-stat-chip">
              <span className="dot-green"></span> {orders.filter(o => o.remainingAmount === 0).length} Lunas
            </span>
            <span className="footer-stat-chip">
              <span className="dot-amber"></span> {orders.filter(o => o.remainingAmount > 0).length} Belum Lunas
            </span>
            <span className="footer-stat-chip">
              <span className="dot-blue"></span> {totalSiapKirim} Siap Kirim
            </span>
          </div>
        </div>
      </div>

      <style>{`
        /* Enhanced Premium Table Styling */
        .premium-table-wrapper {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
          overflow-x: auto;
          overflow-y: hidden;
        }
        .premium-table {
          width: 100%;
          min-width: 1040px;
          border-collapse: separate;
          border-spacing: 0;
          font-family: inherit;
        }
        .premium-table th {
          background: #f8fafc;
          padding: 14px 16px;
          text-align: left;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }
        .premium-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          background: #ffffff;
        }
        .order-row {
          transition: background-color 0.15s ease;
        }
        .order-row:hover td {
          background-color: #f8faff;
        }
        
        /* 1. Detail Nota */
        .nota-cell-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nota-number-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .nota-number-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: #4338ca;
          font-size: 0.84rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          background: #eef2ff;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #e0e7ff;
          letter-spacing: -0.01em;
        }
        .nota-icon {
          color: #6366f1;
        }
        .direct-ship-chip {
          display: inline-block;
          padding: 2px 6px;
          font-size: 0.65rem;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          border-radius: 4px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }
        .nota-date-sub {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.73rem;
          color: #64748b;
          font-weight: 500;
        }

        /* 2. Pelanggan */
        .customer-cell-modern {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .customer-avatar-box {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .customer-meta-wrap {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .customer-name-modern {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.86rem;
          line-height: 1.3;
          white-space: normal;
          word-break: break-word;
        }
        .customer-pic-sub {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 500;
        }

        /* 3. Ringkasan Barang (Fixed & Polished) */
        .items-list-modern {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .item-chip-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 3px 8px 3px 4px;
          max-width: 100%;
          transition: all 0.15s ease;
        }
        .item-chip-row:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .item-qty-tag {
          background: #4f46e5;
          color: #ffffff;
          font-weight: 800;
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: 4px;
          flex-shrink: 0;
          white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .item-name-tag {
          font-size: 0.8rem;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .item-more-badge {
          font-size: 0.72rem;
          color: #6366f1;
          font-weight: 700;
          padding: 2px 4px;
        }

        /* 4. Total Tagihan */
        .amount-cell-modern {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .amount-primary {
          font-weight: 800;
          color: #0f172a;
          font-size: 0.95rem;
          letter-spacing: -0.01em;
          font-variant-numeric: tabular-nums;
        }
        .amount-sub-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 500;
        }
        .dot-sep {
          color: #cbd5e1;
        }

        /* 5. Status Pembayaran */
        .payment-cell-modern {
          min-width: 150px;
        }
        .payment-status-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .payment-sub-text {
          font-size: 0.7rem;
          color: #16a34a;
          font-weight: 600;
        }
        .payment-progress-container {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .payment-progress-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.7rem;
        }
        .progress-tag-dp {
          font-weight: 700;
          color: #2563eb;
        }
        .progress-val-dp {
          font-weight: 600;
          color: #475569;
        }
        .payment-progress-track {
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .payment-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #10b981 100%);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .sisa-payment-row {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.74rem;
        }
        .sisa-title {
          color: #64748b;
          font-weight: 500;
        }
        .sisa-amount-highlight {
          color: #dc2626;
          font-weight: 800;
        }

        /* 6. Status Pengiriman */
        .delivery-status-modern {
          min-width: 130px;
        }
        .delivery-status-block {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .delivery-sub-warn {
          font-size: 0.7rem;
          color: #b45309;
          font-weight: 600;
        }
        .delivery-sub-ok {
          font-size: 0.7rem;
          color: #16a34a;
          font-weight: 600;
        }

        /* Status Pills (General) */
        .status-pill-modern {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.73rem;
          font-weight: 700;
          width: fit-content;
        }
        .pill-lunas {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .pill-tahan {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }
        .pill-siap {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .pill-unpaid {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot-green { background: #10b981; }
        .dot-amber { background: #f59e0b; }
        .dot-blue { background: #3b82f6; }
        .dot-red { background: #ef4444; }

        /* 7. Action Buttons */
        .actions-modern-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-action-pay-modern {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          background: #10b981;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 3px rgba(16, 185, 129, 0.25);
        }
        .btn-action-pay-modern:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 3px 6px rgba(16, 185, 129, 0.35);
        }
        .btn-action-print-modern {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #f8fafc;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-action-print-modern:hover {
          background: #f1f5f9;
          color: #0f172a;
          border-color: #94a3b8;
          transform: translateY(-1px);
        }

        /* Table Footer Bar */
        .table-footer-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 18px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          font-size: 0.78rem;
          color: #64748b;
        }
        .table-footer-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .footer-stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #334155;
        }

        .empty-state-cell {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }
        .empty-state-cell p {
          margin-top: 12px;
          font-weight: 600;
          color: #64748b;
        }
        .text-center { text-align: center !important; }
      `}</style>

      {/* POS Fullscreen Module */}
      {isModalOpen && (
        <POSModule 
          products={products}
          customers={customers}
          orders={orders}
          currentUser={currentUser}
          mode={posMode}
          onClose={() => setIsModalOpen(false)}
          onSaveOrder={(orderData, remainingAmount, customerName) => {
            // Update customer debt if remaining balance exists
            if (remainingAmount > 0 && setCustomers) {
              setCustomers(prev => prev.map(c => {
                if (c.name === customerName) {
                  return { ...c, currentDebt: (c.currentDebt || 0) + remainingAmount };
                }
                return c;
              }));
            }
            setOrders([orderData, ...orders]);
            
            // If Walk-In POS Mode, cut stock immediately
            if (posMode === 'pos' && setProducts) {
               const newMovements = [];
               setProducts(prev => {
                 let updated = [...prev];
                 orderData.items.forEach(it => {
                    const idx = updated.findIndex(p => p.code === it.productCode);
                    if (idx !== -1) {
                      updated[idx] = { ...updated[idx], stock: Math.max(0, updated[idx].stock - it.qty) };
                      newMovements.push({
                        id: `MOV-${Date.now()}-${it.productCode}`,
                        date: new Date().toISOString().split('T')[0],
                        productCode: it.productCode,
                        productName: it.name,
                        type: 'OUT',
                        qty: it.qty,
                        reference: orderData.orderNo,
                        notes: 'Penjualan POS Kasir Langsung',
                        balance: updated[idx].stock
                      });
                    }
                 });
                 return updated;
               });
               
               if (setStockMovements && newMovements.length > 0) {
                 setStockMovements(prev => [...newMovements, ...prev]);
               }
               
               if (addSystemLog) {
                 addSystemLog('SALES_POS_CHECKOUT', currentUser || 'POS Kasir', `Menyelesaikan nota POS ${orderData.orderNo} senilai ${orderData.totalAmount}`);
                 orderData.items.forEach(it => {
                   if (it.price !== it.originalPrice && it.originalPrice !== undefined) {
                     addSystemLog('PRICE_OVERRIDE', currentUser || 'POS Kasir', `Harga diubah manual untuk ${it.productCode}: Asli ${it.originalPrice} menjadi ${it.price} di POS ${orderData.orderNo}`);
                   }
                 });
               }
            } else if (posMode === 'so' && addSystemLog) {
               addSystemLog('SALES_SO_CREATED', currentUser || 'Admin', `Membuat Sales Order ${orderData.orderNo} B2B senilai ${orderData.totalAmount}`);
            }
            
            if (addSystemLog) {
              addSystemLog('Penjualan', posMode === 'pos' ? 'Transaksi Kasir POS' : 'Pembuatan Sales Order', `Membuat pesanan ${orderData.orderNo} untuk ${customerName} senilai Rp ${orderData.totalAmount.toLocaleString('id-ID')}`);
            }

            setIsModalOpen(false);
            if (posMode === 'pos') {
              alert(`Transaksi Kasir ${orderData.orderNo} berhasil diselesaikan!\n\n✓ Stok fisik barang langsung DIPOTONG.`);
              if (onPrintDocument) onPrintDocument('sales', orderData);
            } else {
              alert(`Pesanan SO ${orderData.orderNo} berhasil dibuat!\n\n✓ Status Alur: ${orderData.deliveryStatus}\n✓ Kontrol Stok: Barang dicatat sebagai "Dipesan (Reserved)". Stok fisik gudang baru akan dipotong saat Surat Jalan (DO) resmi terbit.`);
            }
          }}
        />
      )}
      {/* Payment Modal */}
      {paymentModal.isOpen && paymentModal.order && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', width: '500px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Catat Pembayaran SO</h3>
              <button onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            <form onSubmit={handleRecordPayment} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px', background: '#eff6ff', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>{paymentModal.order.orderNo}</div>
                <div style={{ fontSize: '1.1rem', color: '#1e3a8a', fontWeight: 800, marginTop: '4px' }}>Customer: {paymentModal.order.customer}</div>
                <div style={{ fontSize: '0.9rem', color: '#1e3a8a', marginTop: '4px' }}>Sisa Tagihan: <span style={{ color: '#ef4444', fontWeight: 700 }}>{formatRupiah(paymentModal.order.remainingAmount)}</span></div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Jumlah Pembayaran (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    max={paymentModal.order.remainingAmount}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 700 }}
                    value={paymentModal.amount}
                    onChange={e => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Tanggal</label>
                    <input 
                      type="date" 
                      required 
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={paymentModal.date}
                      onChange={e => setPaymentModal({ ...paymentModal, date: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Metode</label>
                    <select 
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={paymentModal.method}
                      onChange={e => setPaymentModal({ ...paymentModal, method: e.target.value })}
                    >
                      <option value="Transfer Bank">Transfer Bank</option>
                      <option value="Tunai">Tunai / Cash</option>
                      <option value="Giro">Giro</option>
                    </select>
                  </div>
                </div>

                {/* Upload Bukti Transfer DP / Pelunasan */}
                <div style={{ marginTop: '4px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Foto Bukti Transfer (Opsional tapi disarankan)</label>
                  <div style={{ 
                    border: '2px dashed #cbd5e1', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }} onClick={() => document.getElementById('dp-camera-upload').click()}>
                    <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '50%', color: '#4f46e5' }}>
                      <Camera size={18} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.85rem' }}>Upload Bukti Bayar</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Maks 5 MB (JPG/PNG)</div>
                    </div>
                    <input type="file" id="dp-camera-upload" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => {
                      if (e.target.files.length > 0) alert('Bukti bayar terpilih: ' + e.target.files[0].name);
                    }} />
                  </div>
                </div>
              </div>

              {paymentModal.order.payments && paymentModal.order.payments.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: '#334155' }}>Riwayat Pembayaran Sebelumnya:</label>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                    {paymentModal.order.payments.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: idx < paymentModal.order.payments.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: idx < paymentModal.order.payments.length - 1 ? '8px' : '0' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.date}</div>
                          <div style={{ color: '#64748b' }}>{p.method} ({p.recordedBy})</div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#16a34a' }}>+ {formatRupiah(p.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Simpan Pembayaran</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
