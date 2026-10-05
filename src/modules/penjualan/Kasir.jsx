// Kasir penjualan langsung: cari barang -> qty/harga -> Bayar. Target 3 langkah.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, Trash2, MessageCircle, Plus } from 'lucide-react';
import { action } from '../../lib/data';
import { href } from '../../lib/router';
import { useSession } from '../../lib/session';
import { num, parseNum, rp, today, waLink } from '../../lib/format';
import { Button, Field, Input, MoneyInput, PageHeader, Panel, Segmented } from '../../ui/core';
import { searchProducts } from '../../ui/LineItems';
import { useToast } from '../../ui/feedback';
import ProductPhoto from '../../ui/ProductPhoto';

export default function Kasir() {
  const { products } = useSession();
  const toast = useToast();
  const [search, setSearch] = useState('');
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

  const results = useMemo(() => searchProducts(products, search, 12), [products, search]);
  const total = cart.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const paid = received === '' ? total : Number(received);
  const change = paid - total;

  const add = (p) => {
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

  // F9 = bayar (selalu memakai state terbaru)
  const payRef = useRef(pay);
  useEffect(() => {
    payRef.current = pay;
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        if (!done) payRef.current();
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
        <div className="sheet stack">
          <div className="doc-no">{o.order_no}</div>
          <div className="row-between">
            <span>Total</span>
            <span className="pos-total">{rp(o.total_amount)}</span>
          </div>
          {done.change > 0 && (
            <div className="row-between">
              <span>Kembalian</span>
              <span className="pos-total">{rp(done.change)}</span>
            </div>
          )}
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
      <PageHeader crumbs={[{ label: 'Penjualan', to: ['penjualan'] }, { label: 'Kasir' }]} title="Kasir" sub="Penjualan langsung, stok langsung terpotong" />
      <div className="pos">
        <div className="pos-search">
          <Input
            ref={searchRef}
            autoFocus
            type="search"
            placeholder="Ketik kode atau nama barang, Enter untuk tambah"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && results[active]) {
                e.preventDefault();
                add(results[active]);
              }
            }}
            aria-label="Cari barang"
          />
          <div className="table-wrap auto-h pos-results">
            <table className="dt">
              <thead>
                <tr>
                  <th aria-label="Foto" />
                  <th>Kode</th>
                  <th>Nama Barang</th>
                  <th>Warna</th>
                  <th className="right">Stok</th>
                  <th className="right">Harga</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p, i) => (
                  <tr key={p.id} className={`clickable ${i === active ? 'kbd-active' : ''}`} onClick={() => add(p)} aria-selected={i === active}>
                    <td className="photo-cell">
                      <ProductPhoto product={p} size="md" />
                    </td>
                    <td className="mono">{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.color}</td>
                    <td className={`right ${p.stock <= 0 ? 'text-bad' : ''}`}>{num(p.stock)}</td>
                    <td className="right">{num(p.sell_price)}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Tidak ada barang "{search}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Panel title={`Keranjang (${cart.length})`} bodyClass="panel-body stack">
          {cart.length === 0 ? (
            <p className="muted small">Belum ada barang. Ketik kode di kotak cari lalu tekan Enter.</p>
          ) : (
            <table className="lines">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th className="right">Qty</th>
                  <th className="right">Harga</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.map((it, i) => (
                  <tr key={it.productCode}>
                    <td>
                      <div className="row">
                        <ProductPhoto product={it._product} />
                        <span>{it.name}</span>
                      </div>
                      <div className={`stock-hint ${Number(it.qty) > it.stock ? 'low' : ''}`}>
                        {it.productCode} · stok {num(it.stock)}
                      </div>
                    </td>
                    <td className="right">
                      <input
                        className="cell num"
                        inputMode="numeric"
                        value={it.qty}
                        onChange={(e) => {
                          const n = parseNum(e.target.value);
                          setCart((c) => c.map((x, j) => (j === i ? { ...x, qty: Number.isNaN(n) ? '' : n } : x)));
                        }}
                        aria-label={`Qty ${it.name}`}
                      />
                    </td>
                    <td className="right">
                      <MoneyInput className="cell" value={it.price} onChange={(v) => setCart((c) => c.map((x, j) => (j === i ? { ...x, price: v } : x)))} aria-label={`Harga ${it.name}`} />
                      {Number(it.price) !== it.originalPrice && <div className="stock-hint">normal {num(it.originalPrice)}</div>}
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setCart((c) => c.filter((_, j) => j !== i))} aria-label={`Hapus ${it.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="row-between">
            <span>Total</span>
            <span className="pos-total">{rp(total)}</span>
          </div>
          <div className="form-grid">
            <Field label="Nama pembeli (opsional)">
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Pelanggan Umum" />
            </Field>
            <Field label="No. WA (opsional)">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </Field>
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
            <div className="form-grid">
              <Field label="Uang diterima">
                <MoneyInput value={received === '' ? total : received} onChange={setReceived} />
              </Field>
              <Field label="Kembalian">
                <Input readOnly value={change >= 0 ? num(change) : `kurang ${num(-change)}`} className={`num ${change < 0 ? 'invalid' : ''}`} />
              </Field>
            </div>
          )}
          {err && <div className="alert error" role="alert">{err}</div>}
          <Button variant="primary" size="lg" busy={busy} onClick={pay} disabled={cart.length === 0}>
            Bayar {rp(total)} (F9)
          </Button>
        </Panel>
      </div>
    </>
  );
}
