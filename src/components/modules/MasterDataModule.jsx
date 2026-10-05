import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  CreditCard,
  CheckCircle2,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function MasterDataModule({ 
  customers, 
  setCustomers, 
  suppliers, 
  setSuppliers, 
  orders = [],
  currentUser,
  initialTab = 'customers'
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'customers'); // 'customers' | 'suppliers'
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Form New Customer
  const [custName, setCustName] = useState('');
  const [custContact, setCustContact] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custType, setCustType] = useState('Grosir');
  const [custLimit, setCustLimit] = useState(15000000);

  // Form New Supplier
  const [supName, setSupName] = useState('');
  const [supSales, setSupSales] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTerms, setSupTerms] = useState('Tempo 30 Hari');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const filteredCustomers = customers.filter(c => {
    return c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           c.phone.includes(searchTerm);
  });

  const filteredSuppliers = suppliers.filter(s => {
    return s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.salesPerson.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!custName || !custPhone) return alert('Nama toko dan nomor telepon wajib diisi');

    const newCust = {
      id: `CUST-${Date.now()}`,
      name: custName,
      contactPerson: custContact || custName,
      phone: custPhone,
      address: custAddress || 'Jakarta',
      type: custType,
      creditLimit: Number(custLimit),
      currentDebt: 0
    };

    setCustomers([newCust, ...customers]);
    setIsCustomerModalOpen(false);
    alert(`Data pelanggan ${custName} berhasil disimpan!`);
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
    if (!supName) return alert('Nama pabrik wajib diisi');

    const newSup = {
      id: `SUP-${Date.now()}`,
      name: supName,
      salesPerson: supSales || 'Sales Representative',
      phone: supPhone || '-',
      address: supAddress || 'Indonesia',
      terms: supTerms,
      categories: ['Peralatan Plastik']
    };

    setSuppliers([newSup, ...suppliers]);
    setIsSupplierModalOpen(false);
    alert(`Pabrik supplier ${supName} berhasil didaftarkan!`);
  };

  return (
    <div className="module-workspace">
      {/* Header Banner */}
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>
            <Users size={28} />
          </div>
          <div>
            <h2 className="module-title-main">Master Data Mitra Bisnis</h2>
            <p className="module-desc">Pusat data mitra: toko langganan grosir, limit tempo hutang, serta kontak pabrik supplier.</p>
          </div>
        </div>

        <div className="module-actions-right">
          {activeTab === 'customers' ? (
            <button 
              className="btn btn-primary"
              onClick={() => setIsCustomerModalOpen(true)}
            >
              <Plus size={16} />
              <span>Tambah Pelanggan Baru</span>
            </button>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={() => setIsSupplierModalOpen(true)}
            >
              <Plus size={16} />
              <span>Tambah Pabrik Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Switcher & Search */}
      <div className="table-filter-bar">
        <div className="filter-tabs">
          <button 
            className={`filter-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Users size={15} color="#5c59f7" />
            <span>Pelanggan & Toko ({customers.length})</span>
          </button>
          <button 
            className={`filter-tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Building2 size={15} color="#0284c7" />
            <span>Pabrik & Supplier ({suppliers.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert(`Data Master ${activeTab === 'customers' ? 'Pelanggan' : 'Pabrik Supplier'} berhasil diekspor ke format Excel (.xlsx)`)}
            title="Download Master Mitra format Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Ekspor Excel</span>
          </button>

          <div className="search-input-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Cari Mitra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tables */}
      {activeTab === 'customers' ? (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Toko / Pelanggan</th>
                <th>Kontak & No. WhatsApp</th>
                <th>Alamat Pengiriman</th>
                <th>Tipe Pelanggan</th>
                <th>Plafon Limit Piutang</th>
                <th>Piutang Berjalan</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => {
                const liveDebt = orders && orders.length > 0
                  ? orders.filter(o => o.customer === c.name).reduce((sum, o) => sum + (o.remainingAmount || 0), 0)
                  : (c.currentDebt || 0);
                const isOverLimit = liveDebt > c.creditLimit;

                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>PIC: {c.contactPerson}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
                        <Phone size={13} color="#5c59f7" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#475569' }}>
                        <MapPin size={13} color="#94a3b8" />
                        <span>{c.address}</span>
                      </div>
                    </td>
                    <td>
                      <span className="status-pill badge-slate">{c.type}</span>
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {formatRupiah(c.creditLimit)}
                    </td>
                    <td>
                      <strong style={{ color: liveDebt > 0 ? '#dc2626' : '#16a34a' }}>
                        {formatRupiah(liveDebt)}
                      </strong>
                      {isOverLimit && (
                        <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: '700', marginTop: '2px' }}>
                          ⚠️ Melebihi Plafon Limit!
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Pabrik / Supplier</th>
                <th>Sales Representative</th>
                <th>Nomor Telepon Kantor</th>
                <th>Alamat Pabrik</th>
                <th>Syarat Pembayaran PO</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.salesPerson}</td>
                  <td>{s.phone}</td>
                  <td>{s.address}</td>
                  <td>
                    <span className="status-pill badge-info">{s.terms}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah Pelanggan */}
      {isCustomerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCustomerModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tambah Pelanggan Baru</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsCustomerModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Toko / Perusahaan</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="Contoh: Toko Plastik Sentosa"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nama Pemilik / PIC</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: Pak Haji Bambang"
                      value={custContact}
                      onChange={(e) => setCustContact(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor WhatsApp / HP</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: 08123456789"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Tipe Pelanggan</label>
                    <select 
                      className="form-select"
                      value={custType}
                      onChange={(e) => setCustType(e.target.value)}
                    >
                      <option value="Grosir">Grosir</option>
                      <option value="Eceran">Eceran</option>
                      <option value="Korporat">Korporat / Pabrik</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plafon Limit Piutang Tempo (Rp)</label>
                    <input 
                      type="number" 
                      min="0"
                      className="form-input"
                      value={custLimit}
                      onChange={(e) => setCustLimit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Alamat Lengkap Pengiriman</label>
                  <textarea 
                    className="form-textarea"
                    rows="2"
                    placeholder="Alamat toko atau gudang penerima..."
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Pelanggan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Supplier */}
      {isSupplierModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSupplierModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Daftarkan Pabrik Supplier Baru</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsSupplierModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Pabrik / Perusahaan</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="Contoh: PT Maspion Kencana"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nama Sales Representative</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: Pak Budi"
                      value={supSales}
                      onChange={(e) => setSupSales(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor Telepon / Sales</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: 021-8899123"
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Syarat Pembayaran (Terms)</label>
                  <select 
                    className="form-select"
                    value={supTerms}
                    onChange={(e) => setSupTerms(e.target.value)}
                  >
                    <option value="CBD (Cash Before Delivery)">CBD (Cash Before Delivery)</option>
                    <option value="Tempo 14 Hari">Tempo 14 Hari</option>
                    <option value="Tempo 30 Hari">Tempo 30 Hari</option>
                    <option value="Tempo 45 Hari">Tempo 45 Hari</option>
                    <option value="DP 50% Pelunasan H-1 Kirim">DP 50% Pelunasan H-1 Kirim</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Alamat Pabrik / Lokasi Pengambilan</label>
                  <textarea 
                    className="form-textarea"
                    rows="2"
                    placeholder="Alamat pabrik atau gudang supplier..."
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSupplierModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Pabrik</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
