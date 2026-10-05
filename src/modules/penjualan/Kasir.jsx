// Kasir penjualan langsung: klik/ketik barang -> atur qty -> Bayar. Target 3 langkah.
// Kiri: barang bergambar per kelompok (bisa tanpa hafal kode). Kanan: keranjang & pembayaran.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Minus, Plus, Printer, MessageCircle, Search, ShoppingCart, Trash2, UserRound } from 'lucide-react';
import { action } from '../../lib/data';
import { href } from '../../lib/router';
import { useSession } from '../../lib/session';
import { num, rp, today, waLink } from '../../lib/format';
import { Button, Field, Input, MoneyInput, PageHeader, Segmented } from '../../ui/core';
import { searchProducts } from '../../ui/LineItems';
import { useToast } from '../../ui/feedback';
import ProductPhoto from '../../ui/ProductPhoto';

const LIMIT = 60;

/** Tombol uang cepat: uang pas + pecahan terdekat di atas total. */
function cashOptions(total) {
  if (!(total > 0)) return [];
  const out = new Set([total]);
  for (const step of [10000, 20000, 50000, 100000]) out.add(Math.ceil(total / step) * step);
  return [...out].sort((a, b) => a - b).slice(0, 4);
}

export default function Kasir() {
  const { products } = useSession();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [active, setActive] = useState(0);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('Tunai');
  const [received, setReceived] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const searchRef = useRef(null);
  const cartRef = useRef(null);

  const groups = useMemo(() => [...new Set(products.map((p) => p.group_name || 'Lainnya'))].sort((a, b) => a.localeCompare(b, 'id')), [products]);
  const results = useMemo(() => {
    const pool = group ? products.filter((p) => (p.group_name || 'Lainnya') === group) : products;
    if (search.trim()) return searchProducts(pool, search, LIMIT);
    // tanpa pencarian: barang yang ada stoknya dulu
    return [...pool].sort((a, b) => (b.stock > 0) - (a.stock > 0)).slice(0, LIMIT);
  }, [products, search, group]);
  const inCart = useMemo(() => new Map(cart.map((it) => [it.productCode, Number(it.qty) || 0])), [cart]);

  const total = cart.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const count = cart.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const paid = received === '' ? total : Number(received);
  const change = paid - total;

  const add = (p) => {
    if (p.stock <= 0) return setErr(`Stok ${p.name} habis.`);
    setErr('');
    setCart((c) => {
      const i = c.findIndex((x) => x.productCode === String(p.code));
      if (i >= 0) return c.map((x, j) => (j === i ? { ...x, qty: (Number(x.qty) || 0) + 1 } : x));
      return [...c, { productCode: String(p.code), name: p.name, color: p.color, unit: p.unit || 'pcs', qty: 1, price: p.sell_price, originalPrice: p.sell_price, stock: p.stock, _product: p }];
    });
    setSearch('');
    setActive(0);
    searchRef.current?.focus();
  };
  const setLine = (i, patch) => setCart((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const pay = async () => {
    setErr('');
    if (cart.length === 0) return setErr('Keranjang masih kosong.');
    const bad = cart.find((it) => !(Number(it.qty) > 0));
    if (bad) return setErr(`Qty ${bad.name} harus lebih dari 0.`);
    const over = cart.find((it) => Number(it.qty) > it.stock);
    if (over) return setErr(`Stok ${over.name} hanya ${num(over.stock)} ${over.unit}.`);
    if (method === 'Tunai' && paid < total) return setErr(`Uang diterima ${rp(paid)} kurang dari total ${rp(total)}.`);
    setBusy(true);
    try {
      const res = await action('kasir/checkout', {
        date: today(),
        customer,
        customer_phone: phone,
        items: cart.map(({ stock: _stock, _product, ...it }) => ({ ...it, qty: Number(it.qty), price: Number(it.price) })),
        received_amount: method === 'Tunai' ? paid : total,
        method,
      });
      setDone(res);
      toast.ok(`Nota ${res.order.order_no} tersimpan`);
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setCart([]);
    setCustomer('');
    setPhone('');
    setReceived('');
    setMethod('Tunai');
    setDone(null);
    setErr('');
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  // F9 = bayar, F2 = ke kotak cari (selalu memakai state terbaru)
  const payRef = useRef(pay);
  useEffect(() => {
    payRef.current = pay;
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        if (!done) payRef.current();
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done]);

  if (done) {
    const o = done.order;
    const text = `Nota ${o.order_no}\n${(o.items || []).map((it) => `- ${it.name} ${num(it.qty)} x ${num(it.price)}`).join('\n')}\nTotal: ${rp(o.total_amount)}\nLUNAS. Terima kasih - PT Paletindo Prakarsa Unggul`;
    return (
      <>
        <PageHeader crumbs={[{ label: 'Penjualan', to: ['penjualan'] }, { label: 'Kasir' }]} title="Transaksi selesai" />
        <div className="pos-done">
          <CheckCircle2 className="pos-done-icon" aria-hidden="true" />
          <div className="mono muted">{o.order_no}</div>
          <div className="pos-done-grid">
            <span>Total</span>
            <b>{rp(o.total_amount)}</b>
            <span>Dibayar ({o.payment_type})</span>
            <b>{rp(o.total_amount + (done.change || 0))}</b>
            {done.change > 0 && (
              <>
                <span>Kembalian</span>
                <b className="pos-change">{rp(done.change)}</b>
              </>
            )}
          </div>
          <div className="actions">
            <Button variant="primary" size="lg" icon={Printer} onClick={() => window.open(href(['cetak', 'nota', o.id]), '_blank')} autoFocus>
              Cetak Nota
            </Button>
            <a className="btn btn-lg" href={waLink(o.customer_phone, text)} target="_blank" rel="noreferrer">
              <MessageCircle /> Kirim WA
            </a>
            <Button size="lg" icon={Plus} onClick={reset}>
              Transaksi Baru
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader crumbs={[{ label: 'Penjualan', to: ['penjualan'] }, { label: 'Kasir' }]} title="Kasir" sub="Klik barang atau ketik lalu Enter · F9 bayar · F2 cari" />
      <div className="pos">
        <section className="pos-left" aria-label="Pilih barang">
          <div className="pos-search">
            <Search size={18} aria-hidden="true" />
            <Input
              ref={searchRef}
              autoFocus
              type="search"
              placeholder="Cari kode, nama, atau warna... (Enter untuk tambah)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === 'Enter' && results[active]) {
                  e.preventDefault();
                  add(results[active]);
                } else if (e.key === 'Escape') {
                  setSearch('');
                }
              }}
              aria-label="Cari barang"
            />
          </div>
          <div className="pos-groups" role="tablist" aria-label="Kelompok barang">
            <button type="button" role="tab" aria-selected={!group} className={!group ? 'on' : ''} onClick={() => setGroup('')}>
              Semua
            </button>
            {groups.map((g) => (
              <button type="button" role="tab" key={g} aria-selected={group === g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>
                {g}
              </button>
            ))}
          </div>
          <div className="pos-results">
            {results.map((p, i) => {
              const q = inCart.get(String(p.code)) || 0;
              const out = p.stock <= 0;
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`pos-item ${i === active && search ? 'kbd-active' : ''} ${q ? 'in-cart' : ''} ${out ? 'out' : ''}`}
                  onClick={() => add(p)}
                  disabled={out}
                  aria-label={`Tambah ${p.name}${out ? ' (stok habis)' : ''}`}
                >
                  {q > 0 && <span className="pos-item-qty">{num(q)}</span>}
                  <ProductPhoto product={p} size="md" className="pos-item-photo" />
                  <span className="pos-item-name">{p.name}</span>
                  <span className="pos-item-price">{rp(p.sell_price)}</span>
                  <span className={`pos-item-stock ${out ? 'text-bad' : p.stock <= 5 ? 'text-warn' : ''}`}>{out ? 'Stok habis' : `stok ${num(p.stock)}`}</span>
                </button>
              );
            })}
            {results.length === 0 && <div className="empty">Tidak ada barang "{search}". Coba kata lain atau pilih kelompok "Semua".</div>}
          </div>
        </section>

        <aside className="pos-cart" aria-label="Keranjang" ref={cartRef}>
          <div className="pos-cart-head">
            <h2>
              <ShoppingCart size={18} aria-hidden="true" /> Keranjang ({cart.length})
            </h2>
            {cart.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCart([])}>
                Kosongkan
              </button>
            )}
          </div>

          <div className="pos-lines">
            {cart.length === 0 ? (
              <div className="pos-empty">
                <ShoppingCart size={28} aria-hidden="true" />
                <p>Belum ada barang. Klik barang di sebelah kiri, atau ketik di kotak cari lalu tekan Enter.</p>
              </div>
            ) : (
              cart.map((it, i) => {
                const q = Number(it.qty) || 0;
                const overStock = q > it.stock;
                return (
                  <div className="pos-line" key={it.productCode}>
                    <ProductPhoto product={it._product} />
                    <div className="pos-line-main">
                      <div className="pos-line-name">{it.name}</div>
                      <div className={`stock-hint ${overStock ? 'low' : ''}`}>
                        {it.productCode} · stok {num(it.stock)}
                        {overStock ? ' · melebihi stok' : ''}
                      </div>
                      <div className="pos-line-ctrl">
                        <div className="stepper">
                          <button type="button" onClick={() => setLine(i, { qty: Math.max(1, q - 1) })} aria-label={`Kurangi ${it.name}`} disabled={q <= 1}>
                            <Minus size={14} />
                          </button>
                          <input
                            className="cell num"
                            inputMode="numeric"
                            value={it.qty}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '');
                              setLine(i, { qty: digits === '' ? '' : Number(digits) });
                            }}
                            aria-label={`Qty ${it.name}`}
                          />
                          <button type="button" onClick={() => setLine(i, { qty: q + 1 })} aria-label={`Tambah ${it.name}`}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="muted">×</span>
                        <MoneyInput className="cell pos-price" value={it.price} onChange={(v) => setLine(i, { price: v })} aria-label={`Harga ${it.name}`} />
                      </div>
                      {Number(it.price) !== it.originalPrice && <div className="stock-hint">harga normal {num(it.originalPrice)} (nego)</div>}
                    </div>
                    <div className="pos-line-end">
                      <b>{num(q * (Number(it.price) || 0))}</b>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setCart((c) => c.filter((_, j) => j !== i))} aria-label={`Hapus ${it.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pos-pay">
            <div className="pos-total-row">
              <span>
                Total <span className="muted small">({num(count)} pcs)</span>
              </span>
              <span className="pos-total">{rp(total)}</span>
            </div>

            <Segmented
              value={method}
              onChange={setMethod}
              options={[
                { value: 'Tunai', label: 'Tunai' },
                { value: 'Transfer', label: 'Transfer' },
                { value: 'QRIS', label: 'QRIS' },
              ]}
            />

            {method === 'Tunai' && (
              <>
                <div className="form-grid">
                  <Field label="Uang diterima">
                    <MoneyInput value={received === '' ? total : received} onChange={setReceived} />
                  </Field>
                  <Field label="Kembalian">
                    <Input readOnly value={change >= 0 ? num(change) : `kurang ${num(-change)}`} className={`num pos-change-input ${change < 0 ? 'invalid' : change > 0 ? 'has-change' : ''}`} />
                  </Field>
                </div>
                {total > 0 && (
                  <div className="cash-quick" aria-label="Uang cepat">
                    {cashOptions(total).map((v) => (
                      <button type="button" key={v} className={`btn btn-sm ${paid === v ? 'on' : ''}`} onClick={() => setReceived(v === total ? '' : v)}>
                        {v === total ? 'Uang pas' : num(v)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <details className="pos-buyer">
              <summary>
                <UserRound size={14} aria-hidden="true" /> Data pembeli (opsional){customer ? `: ${customer}` : ''}
              </summary>
              <div className="form-grid">
                <Field label="Nama pembeli">
                  <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Pelanggan Umum" />
                </Field>
                <Field label="No. WA">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="untuk kirim nota" />
                </Field>
              </div>
            </details>

            {err && (
              <div className="alert error" role="alert">
                {err}
              </div>
            )}
            <Button variant="primary" size="lg" className="pos-pay-btn" busy={busy} onClick={pay} disabled={cart.length === 0}>
              Bayar {rp(total)} (F9)
            </Button>
          </div>
        </aside>
      </div>
      {cart.length > 0 && (
        <div className="pos-mobile-bar">
          <span>
            {cart.length} barang · <b>{rp(total)}</b>
          </span>
          <Button variant="primary" onClick={() => cartRef.current?.scrollIntoView({ block: 'start' })}>
            Keranjang &amp; Bayar
          </Button>
        </div>
      )}
    </>
  );
}
