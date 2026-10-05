// Pilih barang tanpa harus hafal kode/nama: katalog bergambar per kelompok, warna terlihat,
// barang supplier ini & yang pernah dipesan didahulukan, qty diisi langsung di kartu.
import React, { useMemo, useRef, useState } from 'react';
import { History, Minus, Plus, Search } from 'lucide-react';
import { date, num, rp } from '../lib/format';
import { Button, Input, Segmented } from './core';
import { Dialog } from './feedback';
import ProductPhoto from './ProductPhoto';

// "PT FUTARI PLASTIK INDONESIA" ~ "futari plastik indonesia": mencocokkan pabrik barang dengan supplier
export const normMaker = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\bpt\.?\s+/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
export const sameMaker = (a, b) => {
  const x = normMaker(a);
  const y = normMaker(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

// Nama warna di data Paletindo -> contoh warna, supaya barang bisa dikenali dari warnanya
const SWATCH = [
  [/pink|merah muda/, 'pink'],
  [/merah|red|chilli|maroon/, 'red'],
  [/biru muda|sky|baby blue/, 'sky'],
  [/navy|dongker/, 'navy'],
  [/biru|blue/, 'blue'],
  [/tosca|toska|teal/, 'teal'],
  [/hijau|green/, 'green'],
  [/kuning|yellow/, 'yellow'],
  [/orange|oranye|jingga/, 'orange'],
  [/ungu|purple|violet/, 'purple'],
  [/coklat|cokelat|brown/, 'brown'],
  [/hitam|black/, 'black'],
  [/abu|grey|gray|silver/, 'grey'],
  [/cream|krem|beige/, 'cream'],
  [/putih|white|natural/, 'white'],
  [/bening|transparan|clear/, 'clear'],
];
function swatchOf(color) {
  const c = String(color || '').toLowerCase();
  const hit = SWATCH.find(([re]) => re.test(c));
  return hit ? hit[1] : null;
}

function matches(p, words) {
  if (words.length === 0) return true;
  const hay = `${p.code} ${p.name} ${p.color || ''} ${p.size || ''} ${p.group_name || ''} ${p.factory || ''}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/**
 * products: master barang; supplier: nama supplier PO (opsional)
 * history: dokumen sebelumnya (PO ke supplier ini / pesanan customer ini), terbaru dulu: { no, date, items }
 * historyLabel: label filter riwayat, mis. "Pernah dipesan" (PO) atau "Pernah dibeli Toko X" (pesanan)
 * addLabel: teks tombol masukkan (mis. "ke PO" / "ke pesanan")
 * onAdd([{ product, qty }])
 */
export default function ProductPicker({ products, supplier, history = [], historyLabel = 'Pernah dipesan', priceField = 'buy_price', onAdd, onClose }) {
  // riwayat per barang: PO terakhir yang memuatnya
  const last = useMemo(() => {
    const m = new Map();
    for (const po of history) {
      for (const it of po.items || []) {
        if (!m.has(it.productCode)) m.set(it.productCode, { date: po.date, no: po.no, qty: it.qty, price: it.price });
      }
    }
    return m;
  }, [history]);
  const fromSupplier = useMemo(() => products.filter((p) => supplier && sameMaker(p.factory, supplier)), [products, supplier]);

  const [scope, setScope] = useState(() => (fromSupplier.length ? 'supplier' : last.size ? 'pernah' : 'semua'));
  const [group, setGroup] = useState('');
  const [text, setText] = useState('');
  const [qty, setQty] = useState({}); // productId -> angka
  const inputs = useRef({});

  const base = useMemo(() => {
    if (scope === 'supplier') return fromSupplier;
    if (scope === 'pernah') return products.filter((p) => last.has(p.code));
    if (scope === 'menipis') return products.filter((p) => p.stock <= 0 || (p.min_stock > 0 && p.stock <= p.min_stock));
    return products;
  }, [scope, products, fromSupplier, last]);
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = base.filter((p) => matches(p, words));
  const groups = useMemo(() => {
    const m = new Map();
    for (const p of found) m.set(p.group_name || 'Lainnya', (m.get(p.group_name || 'Lainnya') || 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'id'));
  }, [found]);
  const activeGroup = groups.some(([g]) => g === group) ? group : '';
  const shown = found.filter((p) => !activeGroup || (p.group_name || 'Lainnya') === activeGroup);
  const LIMIT = 120;

  const picked = products.filter((p) => qty[p.id] > 0);
  const total = picked.reduce((s, p) => s + qty[p.id] * (Number(p[priceField]) || 0), 0);
  const setQ = (p, v) => setQty((q) => ({ ...q, [p.id]: Math.max(0, v) }));
  const lastPo = history[0];

  const choose = (p) => {
    if (!(qty[p.id] > 0)) setQ(p, last.get(p.code)?.qty || 1);
    setTimeout(() => inputs.current[p.id]?.select(), 0);
  };
  const repeatLast = () => {
    const next = {};
    for (const it of lastPo.items || []) {
      const p = products.find((x) => x.code === it.productCode);
      if (p) next[p.id] = Number(it.qty) || 1;
    }
    setQty(next);
    setScope('pernah');
  };

  const scopes = [
    fromSupplier.length ? { value: 'supplier', label: `Barang ${supplier} (${fromSupplier.length})` } : null,
    last.size ? { value: 'pernah', label: `${historyLabel} (${last.size})` } : null,
    { value: 'menipis', label: 'Stok habis / menipis' },
    { value: 'semua', label: `Semua barang (${products.length})` },
  ].filter(Boolean);

  return (
    <Dialog title="Pilih Barang" onClose={onClose} size="xl">
      {/* Enter di kolom cari/qty tidak boleh ikut menyimpan form di belakang dialog */}
      <div className="picker" onKeyDown={(e) => e.key === 'Enter' && e.target.tagName === 'INPUT' && e.preventDefault()}>
        <div className="picker-top">
          <div className="picker-search">
            <Search size={16} aria-hidden="true" />
            <Input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cari apa saja: palet merah, teko 22, ember 15 ltr, 2808..."
              aria-label="Cari barang di katalog"
            />
          </div>
          <Segmented options={scopes} value={scope} onChange={(v) => { setScope(v); setGroup(''); }} />
        </div>
        <div className="picker-main">
          <nav className="picker-groups" aria-label="Kelompok barang">
            <button type="button" className={!activeGroup ? 'on' : ''} onClick={() => setGroup('')}>
              Semua kelompok <span>{found.length}</span>
            </button>
            {groups.map(([g, n]) => (
              <button type="button" key={g} className={activeGroup === g ? 'on' : ''} onClick={() => setGroup(g)}>
                {g} <span>{n}</span>
              </button>
            ))}
          </nav>
          <div className="picker-grid" role="list">
            {shown.length === 0 && <div className="empty">Tidak ada barang yang cocok. Coba kata lain atau pilih "Semua barang".</div>}
            {shown.slice(0, LIMIT).map((p) => {
              const q = qty[p.id] || 0;
              const h = last.get(p.code);
              const sw = swatchOf(p.color);
              return (
                <div key={p.id} role="listitem" className={`pick-card ${q > 0 ? 'on' : ''}`}>
                  <button type="button" className="pick-body" onClick={() => choose(p)} aria-label={`Pilih ${p.name}`}>
                    <ProductPhoto product={p} size="md" className="pick-photo" />
                    <span className="pick-name">{p.name}</span>
                    <span className="pick-meta">
                      {p.color && (
                        <span className="pick-color">
                          {sw && <i className={`swatch sw-${sw}`} />}
                          {p.color}
                        </span>
                      )}
                      {p.size && <span>{p.size}</span>}
                    </span>
                    <span className="pick-meta">
                      <span className={p.stock <= 0 ? 'text-bad' : ''}>stok {num(p.stock)}</span>
                      <span>{rp(Number(p[priceField]) || 0)}</span>
                    </span>
                    {h && (
                      <span className="pick-last">
                        <History size={12} /> {date(h.date)}: {num(h.qty)} @ {num(h.price)}
                      </span>
                    )}
                    <span className="pick-code mono">{p.code}</span>
                  </button>
                  <div className="pick-qty">
                    <button type="button" className="btn btn-sm btn-icon" onClick={() => setQ(p, q - 1)} disabled={q <= 0} aria-label={`Kurangi ${p.name}`}>
                      <Minus size={14} />
                    </button>
                    <input
                      ref={(el) => (inputs.current[p.id] = el)}
                      className="input num"
                      inputMode="numeric"
                      value={q ? num(q) : ''}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setQ(p, Number(e.target.value.replace(/\D/g, '')) || 0)}
                      aria-label={`Qty ${p.name}`}
                    />
                    <button type="button" className="btn btn-sm btn-icon" onClick={() => setQ(p, q + 1)} aria-label={`Tambah ${p.name}`}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {shown.length > LIMIT && <div className="empty">Menampilkan {LIMIT} dari {shown.length} barang. Pilih kelompok atau ketik pencarian.</div>}
          </div>
        </div>
      </div>
      <div className="dialog-foot picker-foot">
        {lastPo && (
          <Button icon={History} onClick={repeatLast}>
            Samakan dengan {lastPo.no} ({date(lastPo.date)})
          </Button>
        )}
        <span className="picker-sum">
          {picked.length ? (
            <>
              <b>{picked.length} barang</b> · {num(picked.reduce((s, p) => s + qty[p.id], 0))} pcs · {rp(total)}
            </>
          ) : (
            'Klik kartu barang, lalu isi qty'
          )}
        </span>
        <Button onClick={onClose}>Batal</Button>
        <Button variant="primary" disabled={!picked.length} onClick={() => onAdd(picked.map((p) => ({ product: p, qty: qty[p.id] })))}>
          Masukkan {picked.length ? `${picked.length} barang` : ''}
        </Button>
      </div>
    </Dialog>
  );
}
