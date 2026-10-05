// Riwayat "siapa melakukan apa" untuk satu dokumen (dari audit_trail server).
import React from 'react';
import { useRecords, q } from '../lib/data';
import { dateTime, num } from '../lib/format';

const ACTION = {
  create: 'membuat',
  update: 'mengubah',
  soft_delete: 'mengarsipkan',
  payment: 'mencatat pembayaran',
  receive: 'menerima barang',
  dispatch: 'mengeluarkan barang (surat jalan)',
  pickup: 'menyerahkan barang (diambil sendiri)',
  received: 'konfirmasi diterima customer',
  release: 'mengizinkan kirim sebelum lunas',
  cancel: 'membatalkan',
  state: 'mengubah status',
  stock: 'mengubah stok',
  import: 'memperbarui lewat import Excel',
  return: 'mencatat retur',
  print: 'mencetak',
  close_short: 'menutup PO (barang kurang)',
  cost_update: 'memperbarui harga modal dari PO',
};

const FIELD = {
  status: 'Status',
  state: 'Status',
  paid_amount: 'Dibayar',
  total_amount: 'Total',
  stock: 'Stok',
  sell_price: 'Harga jual',
  buy_price: 'Harga modal',
  name: 'Nama',
  items: 'Barang',
  customer: 'Customer',
  supplier: 'Supplier',
  sj_no: 'No. SJ',
  receipt: 'Surat jalan',
  release_approved: 'Izin kirim',
  reason: 'Alasan',
  min_stock: 'Stok minimum',
  doc: 'Dokumen',
  invoice_no: 'No. invoice',
};

const show = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') return num(v);
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  if (Array.isArray(v) || typeof v === 'object') return '(diubah)';
  return String(v);
};

const CREATE_FIELDS = ['invoice_no', 'customer', 'supplier', 'name', 'total_amount', 'stock', 'sj_no'];

export function describeChanges(changes, action) {
  return Object.entries(changes || {})
    .filter(([k, c]) => FIELD[k] && c && typeof c === 'object' && 'to' in c)
    .filter(([k]) => action !== 'create' || CREATE_FIELDS.includes(k))
    .map(([k, c]) => (c.from === null || c.from === undefined ? `${FIELD[k]}: ${show(c.to)}` : `${FIELD[k]}: ${show(c.from)} → ${show(c.to)}`))
    .join(' · ');
}

export default function Activity({ recordIds, limit = 50 }) {
  const ids = (Array.isArray(recordIds) ? recordIds : [recordIds]).filter(Boolean);
  const filter = ids.map((id) => `record_id = ${q(id)}`).join(' || ');
  const { items, loading } = useRecords('audit_trail', { filter, sort: '-created', limit, enabled: ids.length > 0 });
  if (loading && items.length === 0) return <div className="empty">Memuat riwayat...</div>;
  if (items.length === 0) return <div className="empty">Belum ada riwayat.</div>;
  return (
    <ul className="activity">
      {items.map((a) => (
        <li key={a.id}>
          <div className="when">{dateTime(a.created)}</div>
          <div>
            <b>{a.actor_name}</b> {ACTION[a.action] || a.action}
          </div>
          {describeChanges(a.changes, a.action) && <div className="chg">{describeChanges(a.changes, a.action)}</div>}
        </li>
      ))}
    </ul>
  );
}
