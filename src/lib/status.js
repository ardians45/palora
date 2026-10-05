// Label & warna status: satu sumber untuk semua modul.
// tone: neutral (abu) | info (biru) | warn (oranye) | ok (hijau) | bad (merah)
import { daysFromToday } from './format';

export const ORDER_STATUS = {
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
