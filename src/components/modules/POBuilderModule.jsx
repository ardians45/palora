import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Trash2, 
  Building2, 
  Package, 
  Plus, 
  Calculator,
  Calendar,
  Save
} from 'lucide-react';

export default function POBuilderModule({ 
  suppliers, 
  products, 
  currentUser, 
  onClose, 
  onSavePO 
}) {
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [cart, setCart] = useState([]);
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Default to 7 days from now
    return d.toISOString().split('T')[0];
  });
  const [poNotes, setPoNotes] = useState('');
  const [isDirectShip, setIsDirectShip] = useState(false);
  
  // Products filtered by selected supplier's factory name
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    // Basic heuristics: if supplier is "PT FUTARI", show products where factory/name includes "FUTARI"
    // For simplicity if we can't map perfectly, we just show all products and let the user search.
    // In a real DB, product.supplierId would be used.
    if (selectedSupplier) {
      const keywords = selectedSupplier.name.split(' ').map(k => k.toLowerCase());
      const filtered = products.filter(p => {
        // Find if any keyword matches product factory or category
        const factory = (p.factory || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return keywords.some(k => k.length > 3 && (factory.includes(k) || cat.includes(k)));
      });
      // If no match found via heuristics, show all products to be safe
      setFilteredProducts(filtered.length > 0 ? filtered : products);
    }
  }, [selectedSupplierId, products, selectedSupplier]);

  const [productSearch, setProductSearch] = useState('');
  
  const displayProducts = filteredProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 100 } : item);
      }
      return [...prev, { product, qty: 100, buyPrice: product.buyPrice }]; // Default bulk qty 100
    });
  };

  const updateCartItem = (productId, field, value) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, [field]: Number(value) >= 0 ? Number(value) : 0 };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.buyPrice * item.qty), 0);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handlePublishPO = () => {
    if (cart.length === 0) {
      return alert('Pilih minimal 1 barang untuk dipesan!');
    }
    
    // Construct PO Items
    const poItems = cart.map(item => ({
      productId: item.product.id,
      productCode: item.product.code,
      name: item.product.name,
      qty: item.qty,
      buyPrice: item.buyPrice,
      total: item.buyPrice * item.qty
    }));

    onSavePO(selectedSupplier, poItems, subtotal, expectedDate, poNotes, isDirectShip);
  };

  return (
    <div className="pos-fullscreen-overlay">
      <div className="pos-header">
        <div className="pos-header-title">
          <Building2 size={24} color="#4f46e5" />
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#0f172a' }}>Buat Surat Pesanan (PO) ke Pabrik</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Operator: {currentUser}</div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <X size={18} /> Tutup
        </button>
      </div>

      <div className="pos-layout">
        {/* Left Panel: Supplier & Product Selection */}
        <div className="pos-catalog-panel">
          {/* Supplier Selection */}
          <div className="po-supplier-section">
            <h3 className="section-title">1. Pilih Pabrik / Supplier</h3>
            <select 
              className="premium-select"
              value={selectedSupplierId}
              onChange={(e) => {
                setSelectedSupplierId(e.target.value);
                setCart([]); // Reset cart on supplier change to prevent mixing products
              }}
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — Syarat: {s.terms}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '20px', marginBottom: '12px' }}>
            <h3 className="section-title">2. Pilih Barang Pesanan</h3>
          </div>
          
          <div className="pos-search-bar">
            <Search size={18} color="#94a3b8" />
            <input 
              type="text"
              placeholder={`Cari barang dari ${selectedSupplier?.name || 'Pabrik'}...`}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          <div className="pos-catalog-grid">
            {displayProducts.map(p => (
              <div key={p.id} className="pos-product-card" onClick={() => addToCart(p)}>
                <div className="pos-product-name">{p.name}</div>
                <div className="pos-product-stock">Stok Gudang: {p.stock} {p.unit}</div>
                <div className="pos-product-price">HPP: {formatRupiah(p.buyPrice)}</div>
                <div className="add-overlay"><Plus size={24} /></div>
              </div>
            ))}
            {displayProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Barang tidak ditemukan. Coba kata kunci lain.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: PO Cart */}
        <div className="pos-cart-panel">
          <div className="cart-header">
            <h3>Daftar Pesanan (PO)</h3>
            <span className="cart-badge">{cart.length} Item</span>
          </div>

          <div className="cart-items-container">
            {cart.length === 0 ? (
              <div className="empty-cart-state">
                <Package size={48} color="#cbd5e1" />
                <p>Belum ada barang dipilih.</p>
                <span>Klik barang di sebelah kiri untuk menambah pesanan.</span>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="po-cart-item">
                  <div className="po-item-header">
                    <span className="po-item-name">{item.product.name}</span>
                    <button className="po-item-remove" onClick={() => removeFromCart(item.product.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="po-item-controls">
                    <div className="control-group">
                      <label>Qty (Pcs)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={item.qty} 
                        onChange={(e) => updateCartItem(item.product.id, 'qty', e.target.value)}
                        className="po-input-qty"
                      />
                    </div>
                    <div className="control-group">
                      <label>Harga Satuan (Rp)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={item.buyPrice} 
                        onChange={(e) => updateCartItem(item.product.id, 'buyPrice', e.target.value)}
                        className="po-input-price"
                      />
                    </div>
                    <div className="item-total">
                      {formatRupiah(item.qty * item.buyPrice)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="po-details-section">
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                Estimasi Tiba di Gudang
              </label>
              <input 
                type="date" 
                className="premium-input"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Catatan / Instruksi</label>
              <textarea 
                className="premium-textarea"
                rows="2"
                placeholder="Misal: Kirim menggunakan armada engkel..."
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
              ></textarea>
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#334155', fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={isDirectShip} 
                  onChange={(e) => setIsDirectShip(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <strong>Direct Ship (Kirim Langsung ke Customer)</strong> 
                — <em>Pilih ini jika pesanan partai besar dikirim pabrik langsung ke klien tanpa singgah di gudang fisik Paletindo.</em>
              </label>
            </div>
          </div>

          <div className="cart-summary">
            <div className="summary-row total-row">
              <span>Total Estimasi PO</span>
              <span style={{ color: '#4f46e5' }}>{formatRupiah(subtotal)}</span>
            </div>
            
            <button className="btn-pay-now" onClick={handlePublishPO} disabled={cart.length === 0}>
              <Save size={20} /> TERBITKAN PO PABRIK
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* Reuse POS Fullscreen Overlay Layout */
        .pos-fullscreen-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #f8fafc; z-index: 9999;
          display: flex; flex-direction: column;
          font-family: 'Inter', sans-serif;
        }
        .pos-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 24px; background: white;
          border-bottom: 1px solid #e2e8f0;
        }
        .pos-header-title { display: flex; align-items: center; gap: 12px; }
        .pos-layout { display: flex; flex: 1; overflow: hidden; }
        
        /* Left Panel */
        .pos-catalog-panel {
          flex: 1; padding: 24px; display: flex; flex-direction: column;
          background: #f1f5f9; overflow-y: auto;
        }
        .section-title { font-size: 1rem; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; }
        .premium-select {
          width: 100%; padding: 12px 16px; border-radius: 12px;
          border: 1px solid #cbd5e1; font-size: 0.95rem; font-weight: 600;
          color: #0f172a; outline: none; background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .pos-search-bar {
          display: flex; align-items: center; gap: 12px;
          background: white; padding: 12px 16px; border-radius: 12px;
          border: 1px solid #cbd5e1; margin-bottom: 20px;
        }
        .pos-search-bar input { flex: 1; border: none; outline: none; font-size: 0.95rem; }
        
        .pos-catalog-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px; overflow-y: auto; align-content: flex-start;
        }
        .pos-product-card {
          background: white; padding: 16px; border-radius: 12px;
          border: 1px solid #e2e8f0; cursor: pointer; position: relative;
          transition: all 0.2s; overflow: hidden; display: flex; flex-direction: column; gap: 8px;
        }
        .pos-product-card:hover { border-color: #4f46e5; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15); }
        .pos-product-name { font-weight: 700; color: #1e293b; font-size: 0.9rem; line-height: 1.3; }
        .pos-product-stock { font-size: 0.75rem; color: #16a34a; font-weight: 600; }
        .pos-product-price { font-size: 0.8rem; font-weight: 700; color: #64748b; margin-top: auto; }
        
        .add-overlay {
          position: absolute; inset: 0; background: rgba(79, 70, 229, 0.9);
          color: white; display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .pos-product-card:hover .add-overlay { opacity: 1; }

        /* Right Panel */
        .pos-cart-panel {
          width: 440px; background: white; border-left: 1px solid #e2e8f0;
          display: flex; flex-direction: column; box-shadow: -4px 0 15px rgba(0,0,0,0.03);
        }
        .cart-header {
          padding: 20px 24px; border-bottom: 1px solid #e2e8f0;
          display: flex; justify-content: space-between; align-items: center;
        }
        .cart-header h3 { margin: 0; font-size: 1.1rem; font-weight: 800; }
        .cart-badge { background: #4f46e5; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
        
        .cart-items-container { flex: 1; overflow-y: auto; padding: 16px 24px; background: #f8fafc; }
        .empty-cart-state {
          height: 100%; display: flex; flex-direction: column; align-items: center;
          justify-content: center; color: #94a3b8; text-align: center;
        }
        .empty-cart-state p { margin: 16px 0 8px; font-weight: 700; color: #64748b; }
        .empty-cart-state span { font-size: 0.85rem; }
        
        .po-cart-item {
          background: white; border: 1px solid #e2e8f0; border-radius: 10px;
          padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .po-item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .po-item-name { font-weight: 700; font-size: 0.85rem; color: #1e293b; line-height: 1.3; padding-right: 12px; }
        .po-item-remove { background: #fee2e2; color: #ef4444; border: none; border-radius: 6px; padding: 6px; cursor: pointer; transition: 0.2s; }
        .po-item-remove:hover { background: #fecaca; }
        
        .po-item-controls { display: flex; align-items: flex-end; gap: 12px; }
        .control-group { display: flex; flex-direction: column; gap: 4px; }
        .control-group label { font-size: 0.7rem; font-weight: 600; color: #64748b; }
        .po-input-qty { width: 70px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; text-align: center; outline: none; }
        .po-input-price { width: 110px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; outline: none; }
        .po-input-qty:focus, .po-input-price:focus { border-color: #4f46e5; }
        .item-total { flex: 1; text-align: right; font-weight: 800; color: #0f172a; font-size: 0.95rem; padding-bottom: 8px; }

        .po-details-section { padding: 16px 24px; background: white; border-top: 1px solid #e2e8f0; }
        .premium-input, .premium-textarea {
          width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1;
          border-radius: 8px; font-family: inherit; font-size: 0.85rem;
          outline: none; transition: 0.2s; margin-top: 4px;
        }
        .premium-input:focus, .premium-textarea:focus { border-color: #4f46e5; }
        
        .cart-summary { padding: 20px 24px; background: white; border-top: 1px solid #e2e8f0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; color: #64748b; }
        .total-row { font-size: 1.15rem; font-weight: 900; color: #0f172a; margin-bottom: 20px; }
        
        .btn-pay-now {
          width: 100%; padding: 16px; background: #4f46e5; color: white;
          border: none; border-radius: 12px; font-size: 1.05rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        .btn-pay-now:hover:not(:disabled) { background: #4338ca; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4); }
        .btn-pay-now:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; transform: none; }
      `}</style>
    </div>
  );
}
