import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, Plus, Minus, Trash2, 
  CreditCard, CheckCircle2, User, Package, Calculator,
  AlertTriangle, X, ShoppingCart, ShieldAlert
} from 'lucide-react';

const POSModule = ({ products, customers, orders = [], onClose, onSaveOrder, currentUser, mode = 'so' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  
  const isWalkIn = mode === 'pos';
  
  // Calculate if selected customer has overdue receivables
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];
  const isCustomerBlocked = useMemo(() => {
    if (isWalkIn || !selectedCustomer) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return orders.some(o => {
      if (o.customer === selectedCustomer.name && o.remainingAmount > 0 && o.dueDate) {
        const due = new Date(o.dueDate);
        due.setHours(0,0,0,0);
        return due < today;
      }
      return false;
    });
  }, [selectedCustomerId, customers, orders, isWalkIn]);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentType, setPaymentType] = useState('Tunai');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const searchInputRef = useRef(null);
  
  // Keyboard Shortcuts (F2 = Search, F9 = Print/Selesaikan)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (showPayment) {
          handleProcessOrder(); // If in payment modal
        } else {
          setPaymentAmount(subtotal.toString());
          setShowPayment(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPayment, paymentAmount]);

  // Helper formatting
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };
  
  // New SO fields
  const [soWhatsApp, setSoWhatsApp] = useState('');
  const [soAddress, setSoAddress] = useState('');
  const [isDirectShipSO, setIsDirectShipSO] = useState(false);

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Filter products for catalog
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      if (!matchSearch) return false;
      
      if (categoryFilter !== 'all') {
        const isLegacyGroup = ['Palet Plastik', 'Part Case', 'Lure & Tackle Box', 'Krat Industri Rabbit', 'Food Box & Lunch Box', 'Perlengkapan Numan', 'Pabrik Linhui', 'Maspion & GBU', 'Ember & Toples Bioplast', 'Barang Bekas & Rekondisi'].includes(categoryFilter);
        
        if (isLegacyGroup) {
          if (categoryFilter === 'Palet Plastik' && !p.category.includes('Palet')) return false;
          if (categoryFilter === 'Part Case' && !p.category.includes('Part Case')) return false;
          if (categoryFilter === 'Lure & Tackle Box' && !(p.category.includes('Lure') || p.category.includes('Tackle') || p.name.includes('Lure') || p.name.includes('Tackle'))) return false;
          if (categoryFilter === 'Krat Industri Rabbit' && !(p.category.includes('Krat') || p.category.includes('Rabbit'))) return false;
          if (categoryFilter === 'Food Box & Lunch Box' && !(p.category.includes('Food') || p.category.includes('Lunch') || p.name.includes('Victory') || p.name.includes('Melva'))) return false;
          if (categoryFilter === 'Perlengkapan Numan' && !(p.category.includes('Numan') || p.factory?.includes('NUMAN') || p.name.includes('Numan'))) return false;
          if (categoryFilter === 'Pabrik Linhui' && !(p.category.includes('Linhui') || p.factory?.includes('LINHUI'))) return false;
          if (categoryFilter === 'Maspion & GBU' && !(p.category.includes('Maspion') || p.category.includes('GBU'))) return false;
          if (categoryFilter === 'Ember & Toples Bioplast' && !(p.category.includes('Bioplast'))) return false;
          if (categoryFilter === 'Barang Bekas & Rekondisi' && !(p.category.includes('Bekas') || p.category.includes('Rekondisi'))) return false;
        }
      }
      return true;
    }).slice(0, 48); // Limit to 48 items for performance
  }, [products, searchTerm, categoryFilter]);

  // Cart operations
  const playErrorSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    } catch (e) {
      // Ignore if audio not supported/allowed
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      playErrorSound();
      alert(`Stok ${product.name} HABIS (0 pcs)! Tidak bisa ditambahkan.`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          playErrorSound();
          alert(`Maksimal stok yang tersedia hanya ${product.stock} pcs!`);
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1, customPrice: product.sellPrice }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.qty + delta;
        if (delta > 0 && newQty > item.product.stock) {
          playErrorSound();
          alert(`Maksimal stok yang tersedia hanya ${item.product.stock} pcs!`);
          return item;
        }
        return { ...item, qty: newQty > 0 ? newQty : 1 }; // Minimum 1, use Trash to remove
      }
      return item;
    }));
  };

  const updateCartPrice = (productId, newPrice) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, customPrice: newPrice };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + ((item.customPrice ?? item.product.sellPrice) * item.qty), 0);
  const minDpRequired = subtotal * 0.25;

  // Numpad operations
  const handleNumpad = (val) => {
    if (val === 'C') {
      setPaymentAmount('0');
      return;
    }
    
    if (val === 'Exact') {
      setPaymentAmount(subtotal.toString());
      return;
    }

    if (val === 'DP25') {
      setPaymentAmount(minDpRequired.toString());
      return;
    }

    setPaymentAmount(prev => {
      if (prev === '0') return val;
      // If pressing '000', append it
      return prev + val;
    });
  };

  const handleProcessOrder = () => {
    if (cart.length === 0) return alert('Keranjang masih kosong!');
    
    if (isWalkIn && Number(paymentAmount) < subtotal) {
      return alert(`Pembayaran kasir kurang dari total nota! (Kurang: ${formatRupiah(subtotal - Number(paymentAmount))})`);
    }

    const dpAmount = isWalkIn ? subtotal : (Number(paymentAmount) || 0);
    const remaining = subtotal - dpAmount;
    const customerName = isWalkIn ? 'Pelanggan Umum (Walk-in)' : (customers.find(c => c.id === selectedCustomerId)?.name || customers[0]?.name);

    // Build the order items
    const orderItems = cart.map(item => {
      const price = item.customPrice ?? item.product.sellPrice;
      return {
        productCode: item.product.code,
        name: item.product.name,
        qty: item.qty,
        price: price,
        originalPrice: item.product.sellPrice,
        total: price * item.qty
      };
    });

    let paymentStatus = 'Lunas';
    let deliveryStatus = isWalkIn ? 'Ambil di Tempat (Selesai)' : 'Siap Dibuatkan Surat Jalan';
    let notes = isWalkIn ? 'Transaksi POS Kasir (Selesai).' : 'Lunas. Siap kirim.';

    if (remaining > 0 && !isWalkIn) {
      if (dpAmount < minDpRequired && dpAmount > 0) {
        const proceed = confirm(`DP yang dibayarkan (${formatRupiah(dpAmount)}) KURANG dari standar SOP (25% = ${formatRupiah(minDpRequired)}).\n\nLanjutkan dengan persetujuan khusus?`);
        if (!proceed) return;
      }
      paymentStatus = dpAmount > 0 ? 'DP Terbayar (Tahan Pengiriman)' : 'Belum Bayar';
      deliveryStatus = 'Tahan (Menunggu Pelunasan)';
      notes = 'Tahan pengiriman sampai sisa dilunasi!';
    }

    const newOrderNo = isWalkIn ? `POS-${Date.now().toString().slice(-6)}` : `INV-SO-${Date.now().toString().slice(-4)}/PIM/${new Date().getFullYear()}`;

    const newOrderData = {
      id: `ORD-${Date.now()}`,
      orderNo: newOrderNo,
      date: customDate, // Use the custom date
      customer: customerName,
      whatsapp: soWhatsApp,
      address: soAddress,
      isDirectShip: isDirectShipSO,
      items: orderItems,
      totalAmount: subtotal,
      dpAmount: dpAmount,
      remainingAmount: remaining,
      paymentType: paymentType,
      paymentStatus,
      deliveryStatus,
      dueDate: remaining > 0 ? '2026-10-15' : null,
      notes,
      createdBy: currentUser || 'POS Kasir'
    };

    onSaveOrder(newOrderData, remaining, customerName);
  };

  return (
    <div className="pos-fullscreen">
      {/* 1. Header POS */}
      <div className="pos-header">
        <div className="pos-header-left">
          <button className="btn-pos-back" onClick={onClose} title="Kembali ke Dashboard">
            <ArrowLeft size={20} />
          </button>
          <div className="pos-logo">
            <ShoppingCart size={22} color="#4f46e5" />
            <span>{isWalkIn ? 'POS Kasir (Walk-in)' : 'Sales Order Builder (B2B)'}</span>
          </div>
        </div>
        <div className="pos-header-center">
          <div className="pos-search-bar">
            <Search size={18} color="#94a3b8" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="F2: Scan Barcode atau ketik nama/kode barang..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length === 1) {
                  addToCart(filteredProducts[0]);
                  setSearchTerm('');
                }
              }}
              autoFocus
            />
            {searchTerm && <X size={16} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />}
          </div>
          <select className="pos-category-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">Semua Kategori</option>
            <option value="Palet Plastik">Palet Plastik</option>
            <option value="Krat Industri Rabbit">Krat Industri Rabbit</option>
            <option value="Food Box & Lunch Box">Food Box & Lunch Box</option>
            <option value="Perlengkapan Numan">Perlengkapan Numan</option>
            <option value="Part Case">Part Case Futari</option>
          </select>
        </div>
        <div className="pos-header-right">
          <div className="pos-user-badge">
            <div className="user-avatar">{getInitials(currentUser || 'Kasir')}</div>
            <span>{currentUser || 'Kasir Aktif'}</span>
          </div>
        </div>
      </div>

      <div className="pos-body">
        {/* 2. Katalog Produk (Kiri) */}
        <div className="pos-catalog">
          <div className="pos-grid">
            {filteredProducts.map(p => {
              const isLowStock = p.stock <= p.minStock;
              return (
                <div key={p.id} className="pos-product-card" onClick={() => addToCart(p)}>
                  <div className="pos-product-img">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <Package size={32} color="#cbd5e1" />}
                    {isLowStock && <div className="pos-stock-badge low">Sisa {p.stock}</div>}
                    {!isLowStock && <div className="pos-stock-badge">{p.stock}</div>}
                  </div>
                  <div className="pos-product-info">
                    <div className="pos-product-price">{formatRupiah(p.sellPrice)}</div>
                    <div className="pos-product-name">{p.cleanName || p.name}</div>
                    <div className="pos-product-code">{p.code}</div>
                  </div>
                </div>
              );
            })}
            
            {filteredProducts.length === 0 && (
              <div className="pos-empty-state">
                <Package size={48} color="#cbd5e1" />
                <h3>Tidak ada barang ditemukan</h3>
                <p>Coba gunakan kata kunci lain.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Keranjang & Checkout (Kanan) */}
        <div className="pos-cart-panel">
          <div className="pos-cart-customer">
            <User size={16} color="#64748b" />
            {isWalkIn ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Pelanggan Umum (Walk-in)</span>
                <input 
                  type="date" 
                  value={customDate} 
                  onChange={(e) => setCustomDate(e.target.value)} 
                  style={{ padding: '2px 6px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  title="Ubah untuk Input Nota Susulan (Darurat)"
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
                <select 
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  {customers.map(c => {
                    const hasOverdue = orders.some(o => {
                      if (o.customer === c.name && o.remainingAmount > 0 && o.dueDate) {
                        const due = new Date(o.dueDate);
                        due.setHours(0,0,0,0);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        return due < today;
                      }
                      return false;
                    });
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} {hasOverdue ? '⚠️ (TERBLOKIR)' : ''}
                      </option>
                    );
                  })}
                </select>
                <input 
                  type="text" 
                  placeholder="No. WhatsApp Pelanggan..." 
                  value={soWhatsApp} 
                  onChange={(e) => setSoWhatsApp(e.target.value)} 
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
                <textarea 
                  placeholder="Alamat Pengiriman Lengkap..." 
                  value={soAddress} 
                  onChange={(e) => setSoAddress(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', resize: 'none' }}
                  rows="2"
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer', background: '#e0e7ff', padding: '6px', borderRadius: '4px', color: '#3730a3' }}>
                  <input type="checkbox" checked={isDirectShipSO} onChange={(e) => setIsDirectShipSO(e.target.checked)} />
                  <strong>Direct Ship (Pabrik ke Customer)</strong>
                </label>
              </div>
            )}
          </div>

          <div className="pos-cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <ShoppingCart size={40} color="#e2e8f0" />
                <p>Keranjang masih kosong</p>
                <span>Pilih barang dari katalog untuk menambahkan ke nota.</span>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="cart-item">
                  <div className="cart-item-details">
                    <div className="cart-item-name">{item.product.cleanName || item.product.name}</div>
                    <div className="cart-item-price-edit">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '4px' }}>Rp</span>
                      <input 
                        type="number"
                        min="0"
                        value={item.customPrice ?? item.product.sellPrice}
                        onChange={(e) => updateCartPrice(item.product.id, parseInt(e.target.value) || 0)}
                        style={{ width: '80px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}
                      />
                      <span className="cart-item-unit"> / {item.product.unit || 'pcs'}</span>
                    </div>
                  </div>
                  <div className="cart-item-actions">
                    <div className="qty-control">
                      <button onClick={() => updateCartQty(item.product.id, -1)}><Minus size={14} /></button>
                      <input type="text" readOnly value={item.qty} />
                      <button onClick={() => updateCartQty(item.product.id, 1)}><Plus size={14} /></button>
                    </div>
                    <div className="cart-item-total">{formatRupiah((item.customPrice ?? item.product.sellPrice) * item.qty)}</div>
                    <button className="btn-remove" onClick={() => removeFromCart(item.product.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-cart-summary">
            <div className="summary-row">
              <span>Total Item</span>
              <span>{cart.reduce((a, c) => a + c.qty, 0)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            
            
            {isCustomerBlocked && !isWalkIn && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem', textAlign: 'center' }}>
                <ShieldAlert size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
                <strong>TERBLOKIR</strong>: Selesaikan tunggakan piutang.
              </div>
            )}

            <button 
              className="btn-pay-main" 
              disabled={cart.length === 0 || (isCustomerBlocked && !isWalkIn)}
              style={isCustomerBlocked && !isWalkIn ? { background: '#cbd5e1', cursor: 'not-allowed' } : {}}
              onClick={() => {
                setPaymentAmount(subtotal.toString());
                setShowPayment(true);
              }}
            >
              <CreditCard size={20} />
              {isWalkIn ? 'F9: BAYAR SEKARANG' : 'SIMPAN & BUAT SO'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Payment Overlay with Numpad */}
      {showPayment && (
        <div className="pos-payment-overlay">
          <div className="pos-payment-box">
            <div className="payment-header">
              <h3>Pembayaran & Pelunasan</h3>
              <button className="btn-close" onClick={() => setShowPayment(false)}><X size={20} /></button>
            </div>
            
            <div className="payment-body">
              {/* Info Kiri */}
              <div className="payment-info">
                <div className="bill-total-card">
                  <div className="bill-label">TOTAL TAGIHAN</div>
                  <div className="bill-value">{formatRupiah(subtotal)}</div>
                </div>

                <div className="payment-type-selector">
                  <label>Metode Pembayaran</label>
                  <div className="type-buttons">
                    <button className={paymentType === 'Cash' ? 'active' : ''} onClick={() => setPaymentType('Cash')}>Cash / Tunai</button>
                    <button className={paymentType === 'Transfer Bank' ? 'active' : ''} onClick={() => setPaymentType('Transfer Bank')}>Transfer Bank</button>
                    {!isWalkIn && <button className={paymentType === 'Tempo/Giro' ? 'active' : ''} onClick={() => setPaymentType('Tempo/Giro')}>Tempo / Giro</button>}
                  </div>
                </div>

                {!isWalkIn && (
                  <div className="payment-notes">
                    <AlertTriangle size={16} color="#f59e0b" />
                    <span>Minimal DP untuk cetak Surat Jalan adalah 25% ({formatRupiah(minDpRequired)})</span>
                  </div>
                )}
                {isWalkIn && (
                  <div className="payment-notes" style={{ background: '#dcfce7', color: '#166534' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span>Kasir POS: Stok akan langsung dipotong setelah bayar.</span>
                  </div>
                )}
              </div>

              {/* Numpad Kanan */}
              <div className="payment-numpad-section">
                <div className="numpad-input-box">
                  <span className="currency">Rp</span>
                  <input type="text" readOnly value={Number(paymentAmount).toLocaleString('id-ID')} />
                </div>
                
                <div className="numpad-quick-actions">
                  <button onClick={() => handleNumpad('Exact')}>Uang Pas</button>
                  {!isWalkIn && <button onClick={() => handleNumpad('DP25')}>Bayar DP 25%</button>}
                </div>

                <div className="numpad-grid">
                  {['7','8','9','4','5','6','1','2','3','C','0','000'].map(key => (
                    <button 
                      key={key} 
                      className={`numpad-btn ${key === 'C' ? 'btn-clear' : ''}`}
                      onClick={() => handleNumpad(key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="payment-calc-result">
                  <div className="result-row">
                    <span>Kembalian / Sisa:</span>
                    <span className={(subtotal - Number(paymentAmount)) > 0 ? 'text-red' : 'text-green'}>
                      {formatRupiah(Math.abs(subtotal - Number(paymentAmount)))}
                      {(subtotal - Number(paymentAmount)) > 0 ? ' (Kurang)' : ' (Kembali)'}
                    </span>
                  </div>
                </div>

                <button className="btn-process-payment" onClick={handleProcessOrder}>
                  <CheckCircle2 size={20} />
                  Proses Nota Pesanan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles inline for POS specific */}
      <style>{`
        .pos-fullscreen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #f8fafc; z-index: 9999; display: flex; flex-direction: column; font-family: 'Inter', sans-serif; }
        .pos-header { height: 64px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .pos-header-left { display: flex; align-items: center; gap: 16px; }
        .btn-pos-back { width: 40px; height: 40px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; transition: all 0.2s; }
        .btn-pos-back:hover { background: #f1f5f9; color: #0f172a; }
        .pos-logo { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 1.1rem; color: #1e293b; letter-spacing: -0.5px; }
        .pos-header-center { display: flex; align-items: center; gap: 12px; flex: 1; max-width: 600px; margin: 0 40px; }
        .pos-search-bar { flex: 1; height: 42px; background: #f1f5f9; border-radius: 20px; display: flex; align-items: center; padding: 0 16px; gap: 12px; border: 1px solid transparent; transition: all 0.2s; }
        .pos-search-bar:focus-within { background: white; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .pos-search-bar input { flex: 1; background: transparent; border: none; outline: none; font-size: 0.9rem; font-family: inherit; }
        .pos-category-select { height: 42px; border-radius: 20px; border: 1px solid #e2e8f0; padding: 0 16px; font-size: 0.85rem; font-weight: 600; color: #475569; outline: none; cursor: pointer; }
        .pos-user-badge { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 600; color: #334155; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; }
        
        .pos-body { display: flex; flex: 1; overflow: hidden; }
        .pos-catalog { flex: 1; overflow-y: auto; padding: 20px; }
        .pos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        .pos-product-card { background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; }
        .pos-product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: #c7d2fe; }
        .pos-product-card:active { transform: translateY(0); }
        .pos-product-img { height: 140px; background: #f8fafc; display: flex; align-items: center; justify-content: center; position: relative; border-bottom: 1px solid #f1f5f9; }
        .pos-product-img img { width: 100%; height: 100%; object-fit: cover; }
        .pos-stock-badge { position: absolute; top: 10px; right: 10px; background: #1e293b; color: white; font-size: 0.7rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .pos-stock-badge.low { background: #ef4444; }
        .pos-product-info { padding: 12px; display: flex; flex-direction: column; flex: 1; }
        .pos-product-price { font-weight: 900; color: #4f46e5; font-size: 1.05rem; margin-bottom: 4px; }
        .pos-product-name { font-size: 0.8rem; font-weight: 700; color: #1e293b; line-height: 1.3; margin-bottom: 6px; flex: 1; }
        .pos-product-code { font-size: 0.7rem; color: #64748b; font-family: ui-monospace, monospace; }
        .pos-empty-state { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #64748b; text-align: center; }
        .pos-empty-state h3 { font-size: 1.2rem; color: #334155; margin: 16px 0 8px; }

        .pos-cart-panel { width: 380px; background: white; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; box-shadow: -4px 0 16px rgba(0,0,0,0.02); }
        .pos-cart-customer { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px; background: #f8fafc; }
        .pos-cart-customer select { flex: 1; height: 36px; border-radius: 8px; border: 1px solid #cbd5e1; padding: 0 12px; font-weight: 600; font-size: 0.85rem; color: #1e293b; outline: none; }
        .pos-cart-items { flex: 1; overflow-y: auto; padding: 12px 20px; }
        .cart-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: #94a3b8; }
        .cart-empty p { font-weight: 700; color: #64748b; margin: 12px 0 4px; }
        .cart-empty span { font-size: 0.8rem; }
        .cart-item { padding: 12px 0; border-bottom: 1px dashed #e2e8f0; display: flex; flex-direction: column; gap: 10px; }
        .cart-item-name { font-weight: 700; font-size: 0.85rem; color: #0f172a; line-height: 1.3; }
        .cart-item-price { font-weight: 800; color: #4f46e5; font-size: 0.85rem; }
        .cart-item-unit { color: #94a3b8; font-weight: 500; font-size: 0.75rem; }
        .cart-item-actions { display: flex; align-items: center; justify-content: space-between; }
        .qty-control { display: flex; align-items: center; background: #f1f5f9; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; }
        .qty-control button { width: 32px; height: 32px; background: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; }
        .qty-control button:hover { background: #e2e8f0; color: #0f172a; }
        .qty-control input { width: 40px; height: 32px; text-align: center; border: none; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; font-weight: 800; font-size: 0.85rem; background: transparent; pointer-events: none; }
        .cart-item-total { font-weight: 900; font-size: 0.95rem; color: #1e293b; }
        .btn-remove { width: 32px; height: 32px; border-radius: 8px; border: none; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .btn-remove:hover { background: #fca5a5; color: #991b1b; }

        .pos-cart-summary { padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; color: #475569; font-weight: 600; }
        .total-row { font-size: 1.25rem; font-weight: 900; color: #0f172a; margin-top: 12px; margin-bottom: 20px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
        .btn-pay-main { width: 100%; height: 56px; border-radius: 12px; background: #4f46e5; color: white; border: none; font-weight: 900; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(79,70,229,0.3); }
        .btn-pay-main:hover:not(:disabled) { background: #4338ca; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(79,70,229,0.4); }
        .btn-pay-main:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; }

        .pos-payment-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 10000; display: flex; align-items: center; justify-content: center; }
        .pos-payment-box { width: 100%; max-width: 800px; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.2); animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes popIn { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .payment-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .payment-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a; }
        .btn-close { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
        .btn-close:hover { background: #e2e8f0; color: #0f172a; }
        
        .payment-body { display: flex; min-height: 400px; }
        .payment-info { flex: 1; padding: 24px; background: #f8fafc; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 24px; }
        .bill-total-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #cbd5e1; text-align: center; }
        .bill-label { font-size: 0.85rem; font-weight: 800; color: #64748b; letter-spacing: 1px; margin-bottom: 8px; }
        .bill-value { font-size: 2.2rem; font-weight: 900; color: #4f46e5; }
        .payment-type-selector label { font-size: 0.85rem; font-weight: 700; color: #475569; display: block; margin-bottom: 10px; }
        .type-buttons { display: flex; flex-direction: column; gap: 10px; }
        .type-buttons button { height: 48px; border-radius: 10px; border: 2px solid #e2e8f0; background: white; font-weight: 700; font-size: 0.95rem; color: #475569; cursor: pointer; transition: all 0.2s; }
        .type-buttons button.active { border-color: #4f46e5; background: #eef2ff; color: #4f46e5; }
        .payment-notes { margin-top: auto; display: flex; gap: 12px; background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; color: #92400e; font-size: 0.85rem; font-weight: 600; line-height: 1.4; }

        .payment-numpad-section { width: 360px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .numpad-input-box { height: 60px; border: 2px solid #4f46e5; border-radius: 12px; display: flex; align-items: center; padding: 0 16px; background: #f8fafc; }
        .numpad-input-box .currency { font-weight: 800; font-size: 1.2rem; color: #64748b; margin-right: 10px; }
        .numpad-input-box input { flex: 1; border: none; background: transparent; outline: none; text-align: right; font-size: 1.8rem; font-weight: 900; color: #0f172a; width: 100%; }
        .numpad-quick-actions { display: flex; gap: 10px; }
        .numpad-quick-actions button { flex: 1; height: 44px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-weight: 700; color: #0f172a; cursor: pointer; }
        .numpad-quick-actions button:hover { background: #f1f5f9; }
        .numpad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .numpad-btn { height: 60px; border-radius: 10px; border: none; background: #f1f5f9; font-size: 1.4rem; font-weight: 800; color: #1e293b; cursor: pointer; transition: all 0.1s; }
        .numpad-btn:active { background: #e2e8f0; transform: scale(0.96); }
        .numpad-btn.btn-clear { color: #ef4444; background: #fee2e2; }
        .payment-calc-result { padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .result-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 0.9rem; }
        .text-red { color: #dc2626; }
        .text-green { color: #16a34a; }
        .btn-process-payment { margin-top: auto; height: 56px; border-radius: 12px; background: #10b981; color: white; border: none; font-size: 1.1rem; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.3); transition: all 0.2s; }
        .btn-process-payment:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16,185,129,0.4); }
      `}</style>
    </div>
  );
};

export default POSModule;
