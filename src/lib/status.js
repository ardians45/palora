// Label & warna status: satu sumber untuk semua modul.
// tone: neutral (abu) | info (biru) | warn (oranye) | ok (hijau) | bad (merah)
import { daysFromToday } from './format';

export const ORDER_STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  baru: { label: 'Pesanan Masuk', tone: 'neutral' },
  dp: { label: 'DP Diterima', tone: 'info' },
  lunas: { label: 'Lunas, Siap Keluar', tone: 'info' },
  dikirim: { label: 'Dikirim', tone: 'info' },
  diambil: { label: 'Diambil (Belum Lunas)', tone: 'warn' },
  selesai: { label: 'Selesai', tone: 'ok' },
  batal: { label: 'Dibatalkan', tone: 'bad' },
};
export const ORDER_STEPS = [
  { key: 'baru', label: 'Masuk' },
  { key: 'dp', label: 'DP' },
  { key: 'lunas', label: 'Lunas' },
  { key: 'keluar', label: 'Dikirim / Diambil' },
  { key: 'selesai', label: 'Selesai' },
];
export function orderStepKey(status) {
  if (status === 'dikirim' || status === 'diambil') return 'keluar';
  return status;
}

export const PO_STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  dikirim: { label: 'Dikirim ke Supplier', tone: 'info' },
  sebagian: { label: 'Diterima Sebagian', tone: 'warn' },
  selesai: { label: 'Selesai', tone: 'ok' },
  batal: { label: 'Dibatalkan', tone: 'bad' },
};
export const PO_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'dikirim', label: 'Dikirim' },
  { key: 'sebagian', label: 'Diterima Sebagian' },
  { key: 'selesai', label: 'Selesai' },
];

export const SJ_STATUS = {
  dikirim: { label: 'Dalam Pengiriman', tone: 'info' },
  diterima: { label: 'Diterima Customer', tone: 'ok' },
};

export const CHANNEL_LABEL = { pesanan: 'Pesanan', kasir: 'Kasir', marketplace: 'Marketplace' };

export const MOVEMENT_TYPE = {
  IN: { label: 'Masuk', tone: 'ok' },
  OUT: { label: 'Keluar', tone: 'info' },
  OPNAME: { label: 'Opname', tone: 'warn' },
  ADJUSTMENT: { label: 'Koreksi', tone: 'neutral' },
  RETUR: { label: 'Retur', tone: 'warn' },
};

/** Status tagihan berdasarkan jatuh tempo */
export function dueTone(dueDate, remaining) {
  if (!(remaining > 0)) return { label: 'Lunas', tone: 'ok' };
  const d = daysFromToday(dueDate);
  if (d === null) return { label: 'Belum ada jatuh tempo', tone: 'neutral' };
  if (d < 0) return { label: `Lewat ${-d} hari`, tone: 'bad' };
  if (d === 0) return { label: 'Jatuh tempo hari ini', tone: 'warn' };
  if (d <= 7) return { label: `${d} hari lagi`, tone: 'warn' };
  return { label: `${d} hari lagi`, tone: 'neutral' };
}

/** Status hutang supplier */
export function payableStatus(inv) {
  const rem = (inv.total_amount || 0) - (inv.paid_amount || 0);
  if (rem <= 0) return { label: 'Lunas', tone: 'ok' };
  if ((inv.paid_amount || 0) > 0) return { label: 'Dicicil', tone: 'warn' };
  return { label: 'Belum Dibayar', tone: 'neutral' };
}

export const ROLE_LABEL = { owner: 'Owner', gudang: 'Admin Gudang & Kasir', finance: 'Keuangan' };

// Pesanan yang belum dibayar sama sekali: nota/invoice belum terbit (alur lama: dokumen resmi muncul setelah DP),
// yang dicetak/dikirim hanya "Konfirmasi Pesanan".
export const isOrderConfirmation = (o) => o.channel === 'pesanan' && o.status === 'baru' && !(o.paid_amount > 0);

// Pesanan yang sudah "jadi" (ada DP, diizinkan keluar, atau barang sudah keluar). Draft dan pesanan baru tanpa DP
// belum dihitung sebagai omzet maupun piutang (masih konfirmasi pesanan).
export const ORDER_COMMITTED = '(deleted = false && status != "draft" && (status != "baru" || paid_amount > 0 || release_approved = true))';
export const RECEIVABLE_FILTER = `remaining_amount > 0 && status != "batal" && ${ORDER_COMMITTED}`;

// Qty barang yang sudah keluar per baris pesanan (data lama tanpa sentQty: semua keluar bila status sudah keluar)
export const sentOf = (o, it) =>
  it.sentQty !== undefined && it.sentQty !== null ? Number(it.sentQty) || 0 : ['dikirim', 'diambil', 'selesai'].includes(o.status) ? Number(it.qty) || 0 : 0;
export const shipProgress = (o) => {
  const items = o.items || [];
  const any = items.some((it) => sentOf(o, it) > 0);
  const all = items.length > 0 && items.every((it) => sentOf(o, it) >= Number(it.qty));
  return { any, all, partial: any && !all };
};
