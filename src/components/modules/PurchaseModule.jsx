import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  Truck, 
  AlertTriangle,
  Building2,
  PackageCheck,
  X,
  FileSpreadsheet,
  Clock,
  FolderOpen,
  Receipt,
  CreditCard,
  Send,
  Mail,
  Camera,
  Calendar,
  User
} from 'lucide-react';
import POBuilderModule from './POBuilderModule';
import { nextSequence } from '../../lib/schema';

export default function PurchaseModule({ 
  purchaseOrders, 
  setPurchaseOrders, 
  suppliers, 
  products, 
  setProducts,
  stockMovements,
  setStockMovements,
  documents,
  setDocuments,
  onPrintDocument,
  currentUser,
  addSystemLog
}) {
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePOForReceipt, setActivePOForReceipt] = useState(null);
  const [receiptForm, setReceiptForm] = useState({ sjNo: '', driver: '', date: '', items: {} });
  
  // States for Digital Folder (Bundling Dokumen)
  const [activeArchivePO, setActiveArchivePO] = useState(null);
  const [archiveActiveTab, setArchiveActiveTab] = useState('po');
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNo: '', date: '', dueDate: '', taxInvoiceNo: '' });
  const [paymentForm, setPaymentForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', method: 'Transfer BCA' });

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const filteredPOs = purchaseOrders.filter(po => {
    return po.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
           po.supplier.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Open Receive Goods Modal
  const openReceiveModal = (po) => {
    const initItems = {};
    po.items.forEach(it => {
      const received = it.receivedQty || 0;
      initItems[it.productCode] = { good: Math.max(0, it.qty - received), bad: 0 };
    });
    setReceiptForm({
      sjNo: `SJ-${Date.now().toString().slice(-6)}`,
      driver: '',
      date: new Date().toISOString().split('T')[0],
      items: initItems
    });
    setActivePOForReceipt(po);
  };

  const handleSaveInvoice = () => {
    if (!invoiceForm.invoiceNo) return alert('Nomor Invoice wajib diisi');
    
    setPurchaseOrders(purchaseOrders.map(p => {
      if (p.id === activeArchivePO.id) {
        const updatedPO = {
          ...p,
          invoice: {
            ...p.invoice,
            invoiceNo: invoiceForm.invoiceNo,
            date: invoiceForm.date,
            dueDate: invoiceForm.dueDate,
            taxInvoiceNo: invoiceForm.taxInvoiceNo,
            totalAmount: p.totalAmount,
            status: p.invoice?.status || 'Belum Dibayar',
            payments: p.invoice?.payments || []
          }
        };
        setActiveArchivePO(updatedPO);
        return updatedPO;
      }
      return p;
    }));
    
    if (addSystemLog) {
      addSystemLog('Pembelian', 'Penerimaan Invoice Tagihan', `Input invoice ${invoiceForm.invoiceNo} untuk PO ${activeArchivePO.poNo}`);
    }
    
    alert('Data Invoice Tagihan berhasil disimpan!');
  };

  const handleAddPayment = () => {
    if (!paymentForm.amount || paymentForm.amount <= 0) return alert('Nominal pembayaran tidak valid');
    
    setPurchaseOrders(purchaseOrders.map(p => {
      if (p.id === activeArchivePO.id) {
        const currentPayments = p.invoice?.payments || [];
        const newPayments = [...currentPayments, { ...paymentForm, id: Date.now() }];
        
        const totalPaid = newPayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
        const newStatus = totalPaid >= p.totalAmount ? 'Lunas' : 'Dicicil';
        
        const updatedPO = {
          ...p,
          invoice: {
            ...p.invoice,
            status: newStatus,
            payments: newPayments
          }
        };
        setActiveArchivePO(updatedPO);
        setPaymentForm({ ...paymentForm, amount: '' }); // reset
        return updatedPO;
      }
      return p;
    }));
    
    if (addSystemLog) {
      addSystemLog('Pembelian', 'Pembayaran Hutang', `Pembayaran cicilan Rp ${Number(paymentForm.amount).toLocaleString('id-ID')} untuk PO ${activeArchivePO.poNo}`);
    }
    
    alert('Pembayaran cicilan berhasil ditambahkan!');
  };

  const handleConfirmReceipt = () => {
    const po = activePOForReceipt;
    if (!po) return;
    
    if (!receiptForm.sjNo) {
      return alert('Nomor Surat Jalan wajib diisi!');
    }

    const receiptItemsToLog = [];
    const addedMovements = [];
    let receivedDetails = [];

    // 1. Update Product Stocks
    setProducts(products.map(prod => {
      const receiveQty = Number(receiptForm.items[prod.code]?.good || 0);
      const badQty = Number(receiptForm.items[prod.code]?.bad || 0);
      
      if (receiveQty > 0 || badQty > 0) {
        receiptItemsToLog.push({ productCode: prod.code, name: prod.name, qty: receiveQty, badQty: badQty });
      }

      if (receiveQty > 0) {
        const afterStock = prod.stock + receiveQty;
        receivedDetails.push(`${prod.name} (${prod.code}): +${receiveQty} ${prod.unit || 'pcs'} (Baik)`);
        
        if (setStockMovements) {
          const nowTimeStr = receiptForm.date + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          addedMovements.push({
            id: `MV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: nowTimeStr,
            type: 'IN',
            productId: prod.id,
            productCode: prod.code,
            productName: prod.name,
            qty: receiveQty,
            refNo: `${receiptForm.sjNo} (PO: ${po.poNo})`,
            reason: `Penerimaan parsial Surat Jalan ${receiptForm.sjNo} dari pabrik ${po.supplier}`,
            beforeStock: prod.stock,
            afterStock: afterStock,
            operator: currentUser || 'Mas Heri'
          });
        }
        return { ...prod, stock: afterStock };
      }
      return prod;
    }));

    if (addedMovements.length > 0 && setStockMovements) {
      setStockMovements(prev => [...addedMovements, ...(prev || [])]);
    }
    
    if (receiptItemsToLog.length === 0) {
      return alert('Tidak ada barang yang diterima (qty = 0).');
    }

    // 2. Archive Document for the Surat Jalan
    if (setDocuments) {
      setDocuments(prevDocs => [
        {
          id: `DOC-SJ-${Date.now()}`,
          title: `Surat Jalan Pabrik: ${receiptForm.sjNo}`,
          type: 'Surat Jalan Terima',
          refNo: receiptForm.sjNo,
          date: receiptForm.date,
          partner: po.supplier,
          fileName: receiptForm.file?.name || `Surat_Jalan_Terima_${receiptForm.sjNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          _file: receiptForm.file || undefined, // foto/scan surat jalan asli, diupload ke server
          uploadedBy: currentUser || 'Mas Heri',
          category: 'Delivery Order'
        },
        ...(prevDocs || [])
      ]);
    }

    // 3. Update PO items and status
    let allComplete = true;
    const updatedItems = po.items.map(it => {
      const receivedNow = Number(receiptForm.items[it.productCode]?.good || 0);
      const totalReceived = (it.receivedQty || 0) + receivedNow;
      if (totalReceived < it.qty) allComplete = false;
      return { ...it, receivedQty: totalReceived };
    });

    const receiptRecord = {
      sjNo: receiptForm.sjNo,
      date: receiptForm.date,
      driver: receiptForm.driver,
      items: receiptItemsToLog
    };

    setPurchaseOrders(purchaseOrders.map(p => {
      if (p.id === po.id) {
        return {
          ...p,
          items: updatedItems,
          status: allComplete ? 'Selesai & Masuk Stok' : 'Diterima Sebagian',
          receipts: [...(p.receipts || []), receiptRecord],
          notes: `${p.notes} | Terima SJ ${receiptForm.sjNo} (${receiptForm.date})`
        };
      }
      return p;
    }));

    setActivePOForReceipt(null);    
    if (addSystemLog) {
      addSystemLog('Pembelian', 'Penerimaan Surat Jalan Pabrik', `Menerima SJ ${receiptForm.sjNo} untuk PO ${po.poNo}`);
    }

    alert(`Penerimaan Surat Jalan ${receiptForm.sjNo} berhasil!\n\n✓ Penambahan Stok:\n${receivedDetails.length > 0 ? receivedDetails.join('\n') : 'Hanya ada barang retur'}`);
  };

  return (
    <div className="module-workspace">
      {/* Header Banner */}
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-tile">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <rect x="7" y="11" width="26" height="5" rx="2" fill="#13c2c2" />
              <rect x="7" y="18" width="26" height="5" rx="2" fill="#722ed1" />
              <rect x="7" y="25" width="26" height="5" rx="2" fill="#fa541c" />
            </svg>
          </div>
          <div>
            <h2 className="module-title-main">Pembelian & PO Supplier</h2>
            <p className="module-desc">Pembuatan surat pesanan ke pabrik (1 PO = 1 Pabrik) & penerimaan barang masuk ke gudang.</p>
          </div>
        </div>

        <div className="module-actions-right">
          <button 
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>Buat PO Pabrik Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#eef0fe', color: '#5c59f7' }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="kpi-label">Total Purchase Orders</div>
            <div className="kpi-val">{purchaseOrders.length} PO</div>
            <div className="kpi-sub">Bulan Ini</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Truck size={22} />
          </div>
          <div>
            <div className="kpi-label">Menunggu Pengiriman Pabrik</div>
            <div className="kpi-val" style={{ color: '#b45309' }}>
              {purchaseOrders.filter(p => !p.status.includes('Selesai')).length} PO
            </div>
            <div className="kpi-sub">Dalam Proses Pabrik</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <PackageCheck size={22} />
          </div>
          <div>
            <div className="kpi-label">PO Selesai & Masuk Stok</div>
            <div className="kpi-val" style={{ color: '#16a34a' }}>
              {purchaseOrders.filter(p => p.status.includes('Selesai')).length} PO
            </div>
            <div className="kpi-sub">Stok Gudang Terupdate</div>
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="table-filter-bar">
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155' }}>
          Daftar Surat Pesanan Supplier ({purchaseOrders.length})
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Data Surat Pesanan (PO) berhasil diekspor ke format Excel (.xlsx)')}
            title="Download Rekap PO format Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Ekspor Excel</span>
          </button>

          <div className="search-input-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Cari No. PO / Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="data-table-card premium-table-wrapper">
        <table className="premium-table">
          <colgroup>
            <col style={{ width: '16%', minWidth: '140px' }} />
            <col style={{ width: '20%', minWidth: '170px' }} />
            <col style={{ width: '25%', minWidth: '220px' }} />
            <col style={{ width: '13%', minWidth: '125px' }} />
            <col style={{ width: '14%', minWidth: '135px' }} />
            <col style={{ width: '12%', minWidth: '110px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Detail PO</th>
              <th>Pabrik / Supplier</th>
              <th>Ringkasan Pesanan</th>
              <th>Total Biaya</th>
              <th>Status Barang</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state-cell">
                  <PackageCheck size={42} color="#cbd5e1" />
                  <p>Tidak ada data PO ditemukan.</p>
                </td>
              </tr>
            ) : (
              filteredPOs.map((po) => (
                <tr key={po.id} className="order-row">
                  {/* Detail PO */}
                  <td>
                    <div className="nota-cell-content">
                      <div className="nota-number-wrap">
                        <span className="nota-number-badge">
                          <FileText size={12} className="nota-icon" />
                          <span>{po.poNo}</span>
                        </span>
                        {po.isDirectShip && (
                          <span className="direct-ship-chip">DIRECT SHIP</span>
                        )}
                      </div>
                      <div className="nota-date-sub">
                        <Calendar size={12} />
                        <span>{po.date}</span>
                      </div>
                    </div>
                  </td>

                  {/* Pabrik / Supplier */}
                  <td>
                    <div className="customer-cell-modern">
                      <div className="customer-avatar-box" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ede9fe' }}>
                        <Building2 size={15} />
                      </div>
                      <div className="customer-meta-wrap">
                        <div className="customer-name-modern" title={po.supplier}>
                          {po.supplier}
                        </div>
                        <div className="customer-pic-sub">
                          <User size={11} />
                          <span>Pembuat: {po.createdBy || 'Pak Yanto'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Ringkasan Pesanan */}
                  <td>
                    <div className="items-list-modern">
                      {po.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="item-chip-row" title={`${it.receivedQty || 0}/${it.qty}x ${it.name}`}>
                          <span className="item-qty-tag" style={{ background: '#7c3aed' }}>
                            {it.receivedQty || 0}/{it.qty}x
                          </span>
                          <span className="item-name-tag">{it.name}</span>
                        </div>
                      ))}
                      {po.items.length > 2 && (
                        <div className="item-more-badge" style={{ color: '#7c3aed' }}>
                          +{po.items.length - 2} barang lainnya
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Total Biaya */}
                  <td>
                    <div className="amount-cell-modern">
                      <div className="amount-primary">{formatRupiah(po.totalAmount)}</div>
                      <div className="amount-sub-badge">
                        <span>{po.items.reduce((s, it) => s + (it.qty || 0), 0)} unit</span>
                        <span className="dot-sep">•</span>
                        <span>{po.paymentType || 'Kredit'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status Barang */}
                  <td>
                    <div className="delivery-status-modern">
                      {po.status.includes('Selesai') ? (
                        <div className="delivery-status-block">
                          <div className="status-pill-modern pill-lunas">
                            <span className="pill-dot dot-green"></span>
                            <CheckCircle2 size={13} />
                            <span>SELESAI</span>
                          </div>
                          <span className="delivery-sub-ok">Barang Tiba Full</span>
                        </div>
                      ) : (
                        <div className="delivery-status-block">
                          <div className="status-pill-modern pill-tahan">
                            <span className="pill-dot dot-amber"></span>
                            <Truck size={13} />
                            <span>{po.status}</span>
                          </div>
                          <span className="delivery-sub-warn">Est: {po.expectedDate}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Aksi */}
                  <td>
                    <div className="actions-modern-cell">
                      {!po.status.includes('Selesai') && (
                        <button className="btn-action-pay-modern" style={{ background: '#7c3aed' }} onClick={() => openReceiveModal(po)} title="Terima Barang Masuk Gudang">
                          <PackageCheck size={14} />
                          <span>Terima</span>
                        </button>
                      )}
                      <button className="btn-action-print-modern" style={{ color: '#4f46e5' }} onClick={() => {
                        setActiveArchivePO(po);
                        setArchiveActiveTab('po');
                        if (po.invoice) {
                           setInvoiceForm({ invoiceNo: po.invoice.invoiceNo || '', date: po.invoice.date || '', dueDate: po.invoice.dueDate || '', taxInvoiceNo: po.invoice.taxInvoiceNo || '' });
                        } else {
                           setInvoiceForm({ invoiceNo: '', date: new Date().toISOString().split('T')[0], dueDate: '', taxInvoiceNo: '' });
                        }
                      }} title="Buka Arsip Pembelian">
                        <FolderOpen size={14} />
                      </button>
                      <button className="btn-action-print-modern" onClick={() => onPrintDocument('po', po)} title="Cetak Surat PO">
                        <Printer size={15} />
                      </button>
                      <button className="btn-action-print-modern" style={{ color: '#25D366' }} onClick={() => alert(`Membuka WhatsApp API:\n\nHalo ${po.supplier},\nBerikut terlampir Purchase Order (PO) Nomor ${po.poNo} dari PT Paletindo Prakarsa Unggul.\n\nMohon konfirmasinya. Terima kasih.`)} title="Kirim PO via WhatsApp">
                        <Send size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Table Footer Summary Strip */}
        <div className="table-footer-bar">
          <div className="table-footer-left">
            <span>Menampilkan <strong>{filteredPOs.length}</strong> dari <strong>{purchaseOrders.length}</strong> PO tercatat</span>
          </div>
          <div className="table-footer-right">
            <span className="footer-stat-chip">
              <span className="dot-green"></span> {purchaseOrders.filter(p => p.status.includes('Selesai')).length} Selesai Masuk
            </span>
            <span className="footer-stat-chip">
              <span className="dot-amber"></span> {purchaseOrders.filter(p => !p.status.includes('Selesai')).length} Menunggu Kedatangan
            </span>
          </div>
        </div>
      </div>

      <style>{`
        /* Premium Table Styles (Shared with Sales) */
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
        
        /* 1. Detail Nota / PO */
        .nota-cell-content { display: flex; flex-direction: column; gap: 6px; }
        .nota-number-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
        .nota-number-badge {
          display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: #4338ca;
          font-size: 0.84rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          background: #eef2ff; padding: 3px 8px; border-radius: 6px; border: 1px solid #e0e7ff; letter-spacing: -0.01em;
        }
        .nota-icon { color: #6366f1; }
        .direct-ship-chip {
          display: inline-block; padding: 2px 6px; font-size: 0.65rem; background: #ecfdf5;
          color: #047857; border: 1px solid #a7f3d0; border-radius: 4px; font-weight: 800; letter-spacing: 0.02em;
        }
        .nota-date-sub { display: flex; align-items: center; gap: 5px; font-size: 0.73rem; color: #64748b; font-weight: 500; }

        /* 2. Pelanggan / Supplier */
        .customer-cell-modern { display: flex; align-items: center; gap: 10px; }
        .customer-avatar-box {
          width: 34px; height: 34px; border-radius: 9px; background: #eff6ff; color: #2563eb;
          border: 1px solid #dbeafe; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .customer-meta-wrap { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .customer-name-modern { font-weight: 700; color: #0f172a; font-size: 0.86rem; line-height: 1.3; white-space: normal; word-break: break-word; }
        .customer-pic-sub { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #64748b; font-weight: 500; }

        /* 3. Items List */
        .items-list-modern { display: flex; flex-direction: column; gap: 5px; }
        .item-chip-row {
          display: inline-flex; align-items: center; gap: 8px; background: #f8fafc;
          border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px 8px 3px 4px; max-width: 100%; transition: all 0.15s ease;
        }
        .item-chip-row:hover { background: #f1f5f9; border-color: #cbd5e1; }
        .item-qty-tag {
          background: #4f46e5; color: #ffffff; font-weight: 800; font-size: 0.7rem;
          padding: 1px 6px; border-radius: 4px; flex-shrink: 0; white-space: nowrap; letter-spacing: -0.01em;
        }
        .item-name-tag { font-size: 0.8rem; font-weight: 600; color: #1e293b; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .item-more-badge { font-size: 0.72rem; color: #6366f1; font-weight: 700; padding: 2px 4px; }

        /* 4. Total Amount */
        .amount-cell-modern { display: flex; flex-direction: column; gap: 3px; }
        .amount-primary { font-weight: 800; color: #0f172a; font-size: 0.95rem; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
        .amount-sub-badge { display: flex; align-items: center; gap: 5px; font-size: 0.72rem; color: #64748b; font-weight: 500; }
        .dot-sep { color: #cbd5e1; }

        /* 5. Status */
        .delivery-status-modern { min-width: 130px; }
        .delivery-status-block { display: flex; flex-direction: column; gap: 3px; }
        .delivery-sub-warn { font-size: 0.7rem; color: #b45309; font-weight: 600; }
        .delivery-sub-ok { font-size: 0.7rem; color: #16a34a; font-weight: 600; }

        .status-pill-modern {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
          border-radius: 6px; font-size: 0.73rem; font-weight: 700; width: fit-content;
        }
        .pill-lunas { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .pill-tahan { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .pill-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .dot-green { background: #10b981; }
        .dot-amber { background: #f59e0b; }
        .dot-blue { background: #3b82f6; }

        /* 6. Action Buttons */
        .actions-modern-cell { display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-action-pay-modern {
          display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px;
          background: #10b981; color: #ffffff; border: none; border-radius: 6px;
          font-size: 0.74rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease;
          box-shadow: 0 1px 3px rgba(16, 185, 129, 0.25);
        }
        .btn-action-pay-modern:hover { background: #059669; transform: translateY(-1px); }
        .btn-action-print-modern {
          display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px;
          background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px;
          cursor: pointer; transition: all 0.15s ease;
        }
        .btn-action-print-modern:hover { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; transform: translateY(-1px); }

        .table-footer-bar {
          display: flex; justify-content: space-between; align-items: center; padding: 12px 18px;
          background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.78rem; color: #64748b;
        }
        .table-footer-right { display: flex; align-items: center; gap: 12px; }
        .footer-stat-chip {
          display: inline-flex; align-items: center; gap: 6px; background: #ffffff;
          border: 1px solid #e2e8f0; border-radius: 999px; padding: 3px 10px; font-size: 0.72rem; font-weight: 600; color: #334155;
        }

        .empty-state-cell { text-align: center; padding: 60px 20px; color: #94a3b8; }
        .empty-state-cell p { margin-top: 12px; font-weight: 600; color: #64748b; }
        .text-center { text-align: center !important; }
      `}</style>

      {/* Fullscreen PO Builder */}
      {isModalOpen && (
        <POBuilderModule 
          suppliers={suppliers}
          products={products}
          currentUser={currentUser}
          onClose={() => setIsModalOpen(false)}
          onSavePO={(supplier, items, total, expectedDate, notes, isDirectShip) => {
            const poSeq = nextSequence(purchaseOrders.map(p => p.poNo), /^PO-(\d+)\//, 38);
            const newPoNo = `PO-${String(poSeq).padStart(3, '0')}/PIM/${new Date().getFullYear()}`;
            const newPO = {
              id: `PO-${Date.now()}`,
              poNo: newPoNo,
              date: new Date().toISOString().split('T')[0],
              supplier: supplier.name,
              items: items,
              totalAmount: total,
              status: 'Menunggu Konfirmasi Pabrik',
              expectedDate: expectedDate,
              notes: notes || `Kirim ke gudang PT Paletindo. Syarat: ${supplier.terms}`,
              isDirectShip: isDirectShip || false,
              createdBy: currentUser || 'Pak Yanto'
            };

            // Auto-archive PO digital document
            if (setDocuments) {
              setDocuments(prevDocs => [
                {
                  id: `DOC-${Date.now()}`,
                  title: `Surat Pesanan Pabrik: ${supplier.name}`,
                  type: 'Surat Pesanan (PO Pabrik)',
                  refNo: newPoNo,
                  date: new Date().toISOString().split('T')[0],
                  partner: supplier.name,
                  fileName: `Surat_Pesanan_${newPoNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                  uploadedBy: currentUser || 'Pak Yanto',
                  category: 'Purchase Order'
                },
                ...(prevDocs || [])
              ]);
            }

            setPurchaseOrders([newPO, ...purchaseOrders]);
            setIsModalOpen(false);
            
            if (addSystemLog) {
              addSystemLog('Pembelian', 'Pembuatan Purchase Order', `Menerbitkan PO ${newPoNo} ke ${supplierName} senilai Rp ${newPO.totalAmount.toLocaleString('id-ID')}`);
            }

            alert(`PO ${newPoNo} berhasil diterbitkan dan diarsipkan otomatis ke Arsip Berkas!`);
          }}
        />
      )}
      {/* Receive Goods (Surat Jalan) Modal */}
      {activePOForReceipt && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-box" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={20} color="#10b981" />
                <h3 className="modal-title">Terima Barang (Surat Jalan)</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setActivePOForReceipt(null)}><X size={18} /></button>
            </div>
            
            <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>No. PO Referensi</label>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: '#4f46e5' }}>{activePOForReceipt.poNo}</div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '4px', fontWeight: '600' }}>Supplier: {activePOForReceipt.supplier}</div>
                </div>
                <div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>No. Surat Jalan (Pabrik)</label>
                    <input 
                      type="text" 
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                      value={receiptForm.sjNo}
                      onChange={(e) => setReceiptForm({...receiptForm, sjNo: e.target.value})}
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Tgl. Terima</label>
                      <input 
                        type="date" 
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                        value={receiptForm.date}
                        onChange={(e) => setReceiptForm({...receiptForm, date: e.target.value})}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Supir / Armada</label>
                      <input 
                        type="text" 
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                        placeholder="Opsional..."
                        value={receiptForm.driver}
                        onChange={(e) => setReceiptForm({...receiptForm, driver: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Foto Surat Jalan */}
              <div style={{ marginTop: '16px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Foto Surat Jalan Fisik (Wajib untuk Arsip)</label>
                <div style={{ 
                  border: '2px dashed #cbd5e1', 
                  borderRadius: '8px', 
                  padding: '20px', 
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }} onClick={() => document.getElementById('camera-upload').click()}>
                  <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '50%', color: '#4f46e5' }}>
                    <Camera size={24} />
                  </div>
                  <div style={{ fontWeight: '600', color: '#334155' }}>
                    {receiptForm.file ? `✓ ${receiptForm.file.name}` : 'Ambil Foto via HP atau Upload Dokumen'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {receiptForm.file ? `${(receiptForm.file.size / 1024 / 1024).toFixed(2)} MB • klik untuk ganti` : 'Maks 5 MB (JPG/PNG/PDF)'}
                  </div>
                  <input type="file" id="camera-upload" accept="image/*,.pdf" capture="environment" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      e.target.value = '';
                      return alert(`Ukuran file ${(file.size / 1024 / 1024).toFixed(1)} MB terlalu besar. Maksimal 5 MB.`);
                    }
                    setReceiptForm(prev => ({ ...prev, file }));
                  }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '0 20px', maxHeight: '40vh', overflowY: 'auto' }}>
              <table className="premium-table" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <thead>
                  <tr>
                    <th>Kode / Nama Barang</th>
                    <th style={{ textAlign: 'center' }}>Total Order</th>
                    <th style={{ textAlign: 'center' }}>Sisa PO</th>
                    <th style={{ textAlign: 'center', background: '#dcfce7' }}>Terima Baik</th>
                    <th style={{ textAlign: 'center', background: '#fee2e2' }}>Rusak / Retur</th>
                  </tr>
                </thead>
                <tbody>
                  {activePOForReceipt.items.map(it => {
                    const received = it.receivedQty || 0;
                    const remaining = Math.max(0, it.qty - received);
                    const isComplete = received >= it.qty;
                    return (
                      <tr key={it.productCode}>
                        <td>
                          <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{it.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>{it.productCode}</div>
                          
                          {/* Progress Bar Penerimaan */}
                          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${Math.min(100, (received / it.qty) * 100)}%`, 
                              background: isComplete ? '#10b981' : '#f59e0b' 
                            }}></div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', textAlign: 'right' }}>
                            {received} dari {it.qty} pcs diterima
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.9rem' }}>{it.qty}</td>
                        <td style={{ textAlign: 'center', color: isComplete ? '#16a34a' : '#ef4444', fontWeight: '700', fontSize: '0.9rem' }}>
                          {remaining}
                        </td>
                        <td style={{ width: '100px' }}>
                          <input 
                            type="number" 
                            min="0" 
                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: '800', background: isComplete ? '#f1f5f9' : '#fff' }}
                            value={receiptForm.items[it.productCode]?.good ?? 0}
                            onChange={(e) => setReceiptForm({
                              ...receiptForm, 
                              items: { ...receiptForm.items, [it.productCode]: { ...receiptForm.items[it.productCode], good: Math.max(0, parseInt(e.target.value) || 0) } }
                            })}
                            disabled={isComplete}
                          />
                        </td>
                        <td style={{ width: '100px' }}>
                          <input 
                            type="number" 
                            min="0" 
                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: '800', color: '#ef4444', background: isComplete ? '#f1f5f9' : '#fff' }}
                            value={receiptForm.items[it.productCode]?.bad ?? 0}
                            onChange={(e) => setReceiptForm({
                              ...receiptForm, 
                              items: { ...receiptForm.items, [it.productCode]: { ...receiptForm.items[it.productCode], bad: Math.max(0, parseInt(e.target.value) || 0) } }
                            })}
                            disabled={isComplete}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px' }}>
              <button className="btn btn-secondary" onClick={() => setActivePOForReceipt(null)}>Batal</button>
              <button className="btn btn-primary" style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleConfirmReceipt}>
                <CheckCircle2 size={16} /> Simpan Surat Jalan & Stok
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Arsip Dokumen (Digital Folder) Modal */}
      {activeArchivePO && (
        <div className="modal-overlay" style={{ zIndex: 9998 }}>
          <div className="modal-box" style={{ maxWidth: '900px', width: '90%', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#4f46e5', color: 'white', borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={20} color="white" />
                <h3 className="modal-title" style={{ color: 'white' }}>Arsip Dokumen: {activeArchivePO.poNo}</h3>
              </div>
              <button className="btn-icon" style={{ color: 'white', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', border: 'none', padding: '4px', cursor: 'pointer' }} onClick={() => setActiveArchivePO(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'flex', height: '600px' }}>
              {/* Sidebar Tabs */}
              <div style={{ width: '220px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Isi Map Berkas</div>
                  
                  <button 
                    onClick={() => setArchiveActiveTab('po')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: archiveActiveTab === 'po' ? '#eef2ff' : 'transparent', color: archiveActiveTab === 'po' ? '#4f46e5' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: archiveActiveTab === 'po' ? '700' : '500', marginBottom: '4px', transition: 'all 0.2s' }}
                  >
                    <FileText size={18} />
                    <span>Surat Pesanan (PO)</span>
                  </button>
                  
                  <button 
                    onClick={() => setArchiveActiveTab('sj')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: archiveActiveTab === 'sj' ? '#eef2ff' : 'transparent', color: archiveActiveTab === 'sj' ? '#4f46e5' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: archiveActiveTab === 'sj' ? '700' : '500', marginBottom: '4px', transition: 'all 0.2s' }}
                  >
                    <Truck size={18} />
                    <span>Surat Jalan Terima</span>
                  </button>
                  
                  <button 
                    onClick={() => setArchiveActiveTab('invoice')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: archiveActiveTab === 'invoice' ? '#eef2ff' : 'transparent', color: archiveActiveTab === 'invoice' ? '#4f46e5' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: archiveActiveTab === 'invoice' ? '700' : '500', transition: 'all 0.2s' }}
                  >
                    <Receipt size={18} />
                    <span>Invoice & Tagihan</span>
                  </button>
                </div>
              </div>
              
              {/* Content Area */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'white' }}>
                {archiveActiveTab === 'po' && (
                  <div>
                    <h4 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={20} color="#4f46e5" /> Dokumen Surat Pesanan (PO)
                    </h4>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Nomor PO</div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{activeArchivePO.poNo}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tanggal Terbit</div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{activeArchivePO.date}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Supplier / Pabrik</div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{activeArchivePO.supplier}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Nilai PO</div>
                          <div style={{ fontWeight: '800', color: '#10b981', fontSize: '1.1rem' }}>{formatRupiah(activeArchivePO.totalAmount)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontWeight: '700', marginBottom: '12px', color: '#334155' }}>Daftar Barang Dipesan:</div>
                    <table className="premium-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ background: '#f1f5f9' }}>Produk</th>
                          <th style={{ background: '#f1f5f9', textAlign: 'center' }}>Qty</th>
                          <th style={{ background: '#f1f5f9', textAlign: 'right' }}>Harga Satuan</th>
                          <th style={{ background: '#f1f5f9', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeArchivePO.items.map(it => (
                          <tr key={it.productCode}>
                            <td>
                              <div style={{ fontWeight: '700' }}>{it.name}</div>
                              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{it.productCode}</div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{it.qty}</td>
                            <td style={{ textAlign: 'right' }}>{formatRupiah(it.buyPrice)}</td>
                            <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatRupiah(it.qty * it.buyPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {archiveActiveTab === 'sj' && (
                  <div>
                    <h4 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={20} color="#10b981" /> Dokumen Surat Jalan (Penerimaan)
                    </h4>
                    
                    {(!activeArchivePO.receipts || activeArchivePO.receipts.length === 0) ? (
                      <div className="empty-state-cell" style={{ border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                        <PackageCheck size={30} color="#94a3b8" />
                        <p>Belum ada Surat Jalan yang diterima untuk PO ini.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {activeArchivePO.receipts.map((sj, idx) => (
                          <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: '800', color: '#0f172a' }}>{sj.sjNo}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tgl Terima: {sj.date} {sj.driver ? `| Supir: ${sj.driver}` : ''}</div>
                              </div>
                              <div style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                                TELAH DITERIMA
                              </div>
                            </div>
                            <div style={{ padding: '12px 16px' }}>
                              <table style={{ width: '100%', fontSize: '0.8rem' }}>
                                <tbody>
                                  {sj.items.map(it => (
                                    <tr key={it.productCode}>
                                      <td style={{ padding: '4px 0', color: '#334155' }}>{it.name} ({it.productCode})</td>
                                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                                        {it.qty > 0 ? `+${it.qty} Pcs Baik` : ''}
                                      </td>
                                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: '#ef4444' }}>
                                        {it.badQty > 0 ? `(${it.badQty} Pcs Rusak/Retur)` : ''}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {archiveActiveTab === 'invoice' && (
                  <div>
                    <h4 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Receipt size={20} color="#f59e0b" /> Tagihan Invoice & Faktur
                    </h4>
                    
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                      <h5 style={{ fontSize: '0.9rem', color: '#b45309', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={16} /> Data Tagihan dari Supplier
                      </h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>No. Invoice</label>
                          <input type="text" style={{ width: '100%', padding: '8px', border: '1px solid #fcd34d', borderRadius: '4px', background: 'white' }} value={invoiceForm.invoiceNo} onChange={e => setInvoiceForm({...invoiceForm, invoiceNo: e.target.value})} placeholder="INV/..." />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Tgl. Jatuh Tempo</label>
                          <input type="date" style={{ width: '100%', padding: '8px', border: '1px solid #fcd34d', borderRadius: '4px', background: 'white' }} value={invoiceForm.dueDate} onChange={e => setInvoiceForm({...invoiceForm, dueDate: e.target.value})} />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>No. Faktur Pajak</label>
                          <input type="text" style={{ width: '100%', padding: '8px', border: '1px solid #fcd34d', borderRadius: '4px', background: 'white' }} value={invoiceForm.taxInvoiceNo} onChange={e => setInvoiceForm({...invoiceForm, taxInvoiceNo: e.target.value})} placeholder="010.xxx..." />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Tgl. Tagihan</label>
                          <input type="date" style={{ width: '100%', padding: '8px', border: '1px solid #fcd34d', borderRadius: '4px', background: 'white' }} value={invoiceForm.date} onChange={e => setInvoiceForm({...invoiceForm, date: e.target.value})} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" style={{ background: '#b45309', padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleSaveInvoice}>Simpan Data Tagihan</button>
                      </div>
                    </div>

                    {activeArchivePO.invoice?.invoiceNo && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h5 style={{ fontSize: '1rem', color: '#1e293b', fontWeight: '700' }}>Riwayat Pembayaran (Cicilan)</h5>
                          <div style={{ background: activeArchivePO.invoice.status === 'Lunas' ? '#16a34a' : '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' }}>
                            STATUS: {activeArchivePO.invoice.status.toUpperCase()}
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Tgl Bayar</label>
                              <input type="date" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Nominal (Rp)</label>
                              <input type="number" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} placeholder="2000000" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Metode</label>
                              <select style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}>
                                <option>Transfer BCA</option>
                                <option>Transfer Mandiri</option>
                                <option>Cek / Giro</option>
                                <option>Tunai</option>
                              </select>
                            </div>
                            <button className="btn btn-primary" style={{ background: '#4f46e5', padding: '8px 16px' }} onClick={handleAddPayment}>+ Catat Bayar</button>
                          </div>
                        </div>

                        <table className="premium-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th style={{ background: '#f1f5f9' }}>Tanggal</th>
                              <th style={{ background: '#f1f5f9' }}>Metode</th>
                              <th style={{ background: '#f1f5f9', textAlign: 'right' }}>Nominal Pembayaran</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(!activeArchivePO.invoice.payments || activeArchivePO.invoice.payments.length === 0) ? (
                              <tr>
                                <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Belum ada cicilan terbayar</td>
                              </tr>
                            ) : (
                              activeArchivePO.invoice.payments.map((pay) => (
                                <tr key={pay.id}>
                                  <td>{pay.date}</td>
                                  <td>{pay.method}</td>
                                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{formatRupiah(pay.amount)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="2" style={{ textAlign: 'right', fontWeight: '700', padding: '12px' }}>Total Dibayar:</td>
                              <td style={{ textAlign: 'right', fontWeight: '800', color: '#0f172a', padding: '12px' }}>
                                {formatRupiah((activeArchivePO.invoice.payments || []).reduce((s, p) => s + Number(p.amount), 0))}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan="2" style={{ textAlign: 'right', fontWeight: '700', padding: '12px', color: '#b45309' }}>Sisa Hutang:</td>
                              <td style={{ textAlign: 'right', fontWeight: '800', color: '#b45309', padding: '12px' }}>
                                {formatRupiah(activeArchivePO.totalAmount - (activeArchivePO.invoice.payments || []).reduce((s, p) => s + Number(p.amount), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
