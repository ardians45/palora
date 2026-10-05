// Grid baris barang yang terasa seperti Excel:
// ketik kode/nama -> pilih -> Enter pindah ke Qty -> Enter ke Harga -> Enter ke baris berikutnya.
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { num } from '../lib/format';
import ProductPhoto from './ProductPhoto';

/** Cari barang berdasarkan kode (awalan) atau nama (berisi kata). */
export function searchProducts(products, query, limit = 30) {
  const q = query.trim().toLowerCase();
  if (!q) return products.slice(0, limit);
  const words = q.split(/\s+/);
  const scored = [];
  for (const p of products) {
    const code = String(p.code).toLowerCase();
    const hay = `${code} ${p.name} ${p.color || ''} ${p.size || ''} ${p.group_name || ''}`.toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    scored.push([code === q ? 0 : code.startsWith(q) ? 1 : 2, p]);
    if (scored.length > 400) break;
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);
}

export function ProductCombo({ products, value, onPick, inputRef, placeholder = 'Ketik kode / nama barang', autoFocus, onKeyDownExtra }) {
  const [text, setText] = useState(null); // null = tampilkan value
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useMemo(() => (open ? searchProducts(products, text ?? '') : []), [open, products, text]);

  const pick = (p) => {
    onPick(p);
    setText(null);
    setOpen(false);
  };

  return (
    <div className="combo">
      <input
        ref={inputRef}
        className="cell"
        value={text ?? value ?? ''}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          setText(null);
        }, 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, list.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && list[active]) pick(list[active]);
            else onKeyDownExtra?.(e);
          } else if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <div className="combo-list" role="listbox">
          {list.length === 0 && <div className="combo-empty">Tidak ada barang "{text}"</div>}
          {list.map((p, i) => (
            <div
              key={p.id}
              role="option"
              aria-selected={i === active}
              className={`combo-item ${i === active ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="row">
                <ProductPhoto product={p} />
                <span className="code">{p.code}</span> {p.name}
                {p.color && !p.name.toLowerCase().includes(p.color.toLowerCase()) ? ` · ${p.color}` : ''}
              </span>
              <span className={p.stock <= 0 ? 'text-bad' : 'muted'}>stok {num(p.stock)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NumCell({ value, onChange, onEnter, inputRef, invalid, label }) {
  return (
    <input
      ref={inputRef}
      className={`cell num ${invalid ? 'invalid' : ''}`}
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      value={value === '' || value === undefined || value === null ? '' : num(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        onChange(digits === '' ? '' : Number(digits));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter?.();
        }
      }}
    />
  );
}

const blank = () => ({ productCode: '', name: '', size: '', color: '', unit: 'pcs', qty: '', price: '' });

/**
 * items: baris barang; onChange(items)
 * priceField: 'sell_price' (penjualan) | 'buy_price' (PO)
 * showStock: tampilkan stok saat ini di samping qty (penjualan)
 * columns: tampilkan kolom Ukuran/Warna (PO meniru PO 37: Tipe · Ukuran · Warna · Harga · Qty · Jumlah)
 */
export default function LineItems({
  items,
  onChange,
  products,
  priceField = 'sell_price',
  showStock = false,
  showSize = false,
  readOnly = false,
  placeholder = '+ Ketik kode / nama barang',
  hint = 'Enter untuk pindah kolom. Harga bisa diubah (nego).',
}) {
  const refs = useRef({});
  const rows = readOnly ? items : [...items, blank()];
  const byCode = useMemo(() => new Map(products.map((p) => [String(p.code), p])), [products]);

  // Pindah fokus harus langsung (bukan ditunda) supaya ketikan cepat tidak nyasar ke kolom lain.
  const pendingFocus = useRef(null);
  const focusEl = (key) => {
    const el = refs.current[key];
    if (el) {
      el.focus();
      el.select?.();
    }
  };
  // fokus setelah render (baris baru baru muncul setelah state berubah)
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      focusEl(pendingFocus.current);
      pendingFocus.current = null;
    }
  });
  const focus = (i, field, afterRender = false) => {
    const key = `${i}-${field}`;
    if (afterRender || !refs.current[key]) pendingFocus.current = key;
    else focusEl(key);
  };

  const update = (i, patch) => {
    const next = [...items];
    if (i >= items.length) next.push({ ...blank(), ...patch });
    else next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const pickProduct = (i, p) => {
    const price = Number(p[priceField]) || 0;
    update(i, {
      productCode: String(p.code),
      name: p.name,
      size: p.size || '',
      color: p.color || '',
      unit: p.unit || 'pcs',
      qty: items[i]?.qty || 1,
      price: items[i]?.productCode === String(p.code) ? items[i].price : price,
      originalPrice: price,
    });
    focus(i, 'qty', true);
  };

  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="table-wrap auto-h">
        <table className="lines">
          <thead>
            <tr>
              <th className="col-no">No</th>
              <th>Kode / Nama Barang</th>
              {showSize && <th>Ukuran</th>}
              <th>Warna</th>
              <th className="right col-qty">Qty</th>
              <th className="right col-money">Harga</th>
              <th className="right col-money">Jumlah</th>
              {!readOnly && <th className="col-no" aria-label="Hapus" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((it, i) => {
              const isBlank = i >= items.length;
              const p = byCode.get(String(it.productCode));
              const qty = Number(it.qty) || 0;
              const lowStock = showStock && p && qty > p.stock;
              return (
                <tr key={i} className={isBlank ? 'empty-row' : ''}>
                  <td className="muted">{isBlank ? '' : i + 1}</td>
                  <td>
                    {readOnly ? (
                      <span>
                        <span className="mono muted">{it.productCode}</span> {it.name}
                      </span>
                    ) : (
                      <ProductCombo
                        products={products}
                        value={it.productCode ? `${it.productCode} · ${it.name}` : ''}
                        onPick={(prod) => pickProduct(i, prod)}
                        inputRef={(el) => (refs.current[`${i}-product`] = el)}
                        placeholder={isBlank ? placeholder : ''}
                      />
                    )}
                  </td>
                  {showSize && (
                    <td>{readOnly ? it.size : <input className="cell" value={it.size || ''} onChange={(e) => update(i, { size: e.target.value })} disabled={isBlank} />}</td>
                  )}
                  <td>{readOnly ? it.color : <input className="cell" value={it.color || ''} onChange={(e) => update(i, { color: e.target.value })} disabled={isBlank} />}</td>
                  <td className="right">
                    {readOnly ? (
                      num(it.qty)
                    ) : (
                      <>
                        <NumCell
                          value={it.qty}
                          onChange={(v) => update(i, { qty: v })}
                          onEnter={() => focus(i, 'price')}
                          inputRef={(el) => (refs.current[`${i}-qty`] = el)}
                          invalid={!isBlank && !(qty > 0)}
                        />
                        {showStock && p && !isBlank && (
                          <div className={`stock-hint ${lowStock ? 'low' : ''}`}>
                            stok {num(p.stock)} {p.unit}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="right">
                    {readOnly ? (
                      num(it.price)
                    ) : (
                      <NumCell
                        value={it.price}
                        onChange={(v) => update(i, { price: v })}
                        onEnter={() => focus(i + 1, 'product')}
                        inputRef={(el) => (refs.current[`${i}-price`] = el)}
                      />
                    )}
                  </td>
                  <td className="right num">{isBlank ? '' : num(qty * (Number(it.price) || 0))}</td>
                  {!readOnly && (
                    <td>
                      {!isBlank && (
                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(i)} aria-label={`Hapus baris ${i + 1}`}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="small muted mt-2">
        {readOnly ? '' : hint}
      </div>
    </div>
  );
}

/** Validasi baris sebelum simpan: kembalikan pesan error atau null. */
export function validateLines(items) {
  if (items.length === 0) return 'Tambahkan minimal 1 barang.';
  for (const [i, it] of items.entries()) {
    if (!it.productCode) return `Baris ${i + 1}: barang belum dipilih.`;
    if (!(Number(it.qty) > 0)) return `Baris ${i + 1} (${it.name}): qty harus lebih dari 0.`;
    if (it.price === '' || Number(it.price) < 0) return `Baris ${i + 1} (${it.name}): harga belum diisi.`;
  }
  return null;
}

export const lineTotal = (items) => items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
