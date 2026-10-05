// Tambah / ubah data barang. Stok tidak diubah di sini (pakai Koreksi Stok atau Stok Opname).
import React, { useMemo, useState } from 'react';
import { pb } from '../../lib/pb';
import { action } from '../../lib/data';
import { useSession } from '../../lib/session';
import { Button, Field, Input, MoneyInput, Textarea } from '../../ui/core';
import { Dialog, useToast } from '../../ui/feedback';

export default function ProductDialog({ product, onClose }) {
  const { products } = useSession();
  const toast = useToast();
  const groups = useMemo(() => [...new Set(products.map((p) => p.group_name).filter(Boolean))].sort(), [products]);
  const [f, setF] = useState(() => ({
    code: product?.code || '',
    name: product?.name || '',
    group_name: product?.group_name || '',
    color: product?.color || '',
    size: product?.size || '',
    unit: product?.unit || 'pcs',
    buy_price: product?.buy_price ?? '',
    sell_price: product?.sell_price ?? '',
    min_stock: product?.min_stock ?? '',
    location: product?.location || '',
    factory: product?.factory || '',
    notes: product?.notes || '',
    stock: '',
  }));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.code.trim() || !f.name.trim()) return setErr('Kode dan nama barang wajib diisi.');
    const dup = products.find((p) => String(p.code).toLowerCase() === f.code.trim().toLowerCase() && p.id !== product?.id);
    if (dup) return setErr(`Kode ${f.code} sudah dipakai oleh "${dup.name}".`);
    const body = {
      code: f.code.trim(),
      name: f.name.trim(),
      clean_name: f.name.trim(),
      group_name: f.group_name.trim(),
      color: f.color.trim(),
      size: f.size.trim(),
      unit: f.unit.trim() || 'pcs',
      buy_price: Number(f.buy_price) || 0,
      sell_price: Number(f.sell_price) || 0,
      min_stock: Number(f.min_stock) || 0,
      location: f.location.trim(),
      factory: f.factory.trim(),
      notes: f.notes.trim(),
    };
    setBusy(true);
    try {
      if (product) {
        await pb.collection('products').update(product.id, body);
        toast.ok(`Data ${body.name} diperbarui`);
      } else {
        await pb.collection('products').create({ ...body, stock: Number(f.stock) || 0 });
        toast.ok(`Barang ${body.code} ditambahkan`);
      }
      onClose();
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={product ? `Ubah ${product.code}` : 'Tambah Barang'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="dialog-body">
          <div className="form-grid cols-3">
            <Field label="Kode" required hint="Kode yang biasa dipakai, mis. 2808">
              <Input value={f.code} onChange={(e) => set({ code: e.target.value })} autoFocus={!product} />
            </Field>
            <Field label="Nama barang" required className="span-2">
              <Input value={f.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Kelompok / merek" hint="Judul kelompok di daftar stok">
              <Input list="group-list" value={f.group_name} onChange={(e) => set({ group_name: e.target.value })} />
            </Field>
            <datalist id="group-list">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <Field label="Warna">
              <Input value={f.color} onChange={(e) => set({ color: e.target.value })} />
            </Field>
            <Field label="Ukuran" hint="mis. 60*40*35,5">
              <Input value={f.size} onChange={(e) => set({ size: e.target.value })} />
            </Field>
            <Field label="Harga modal">
              <MoneyInput value={f.buy_price} onChange={(v) => set({ buy_price: v })} />
            </Field>
            <Field label="Harga jual">
              <MoneyInput value={f.sell_price} onChange={(v) => set({ sell_price: v })} />
            </Field>
            <Field label="Satuan">
              <Input value={f.unit} onChange={(e) => set({ unit: e.target.value })} />
            </Field>
            <Field label="Stok minimum" hint="Peringatan bila stok sampai angka ini">
              <MoneyInput value={f.min_stock} onChange={(v) => set({ min_stock: v })} />
            </Field>
            <Field label="Lokasi">
              <Input value={f.location} onChange={(e) => set({ location: e.target.value })} />
            </Field>
            <Field label="Pabrik / supplier">
              <Input value={f.factory} onChange={(e) => set({ factory: e.target.value })} />
            </Field>
            {!product && (
              <Field label="Stok awal" hint="Tercatat sebagai mutasi stok awal">
                <MoneyInput value={f.stock} onChange={(v) => set({ stock: v })} />
              </Field>
            )}
            <Field label="Keterangan" className="span-all">
              <Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="mis. biru 5, merah 6" />
            </Field>
          </div>
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" busy={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Koreksi stok satu barang (wajib alasan, tercatat). */
export function AdjustDialog({ product, onClose }) {
  const toast = useToast();
  const [stock, setStock] = useState(product.stock);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={`Koreksi Stok ${product.code}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (stock === '' || Number(stock) < 0) return setErr('Isi stok yang benar (0 atau lebih).');
          if (!reason.trim()) return setErr('Alasan koreksi wajib diisi.');
          setBusy(true);
          try {
            await action('stock/adjust', { product_id: product.id, new_stock: Number(stock), reason });
            toast.ok(`Stok ${product.code} menjadi ${stock}`);
            onClose();
          } catch (ex) {
            setErr(ex?.response?.message || ex.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-body">
          <p>
            {product.name} · stok sistem sekarang <b>{product.stock}</b> {product.unit}
          </p>
          <div className="form-grid">
            <Field label="Stok sebenarnya" required>
              <MoneyInput value={stock} onChange={setStock} autoFocus />
            </Field>
            <Field label="Selisih">
              <Input readOnly className="num" value={stock === '' ? '' : (Number(stock) - product.stock > 0 ? '+' : '') + (Number(stock) - product.stock)} />
            </Field>
            <Field label="Alasan" required className="span-all">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. pecah 2 pcs, salah hitung" />
            </Field>
          </div>
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" busy={busy}>
            Simpan Koreksi
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
