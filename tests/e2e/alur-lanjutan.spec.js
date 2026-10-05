// Alur hasil wawancara: konfirmasi pesanan sebelum DP, kirim bertahap (mobil tidak muat),
// retur barang rusak dengan pengembalian dana, dan PO yang sisanya tidak dikirim supplier.
import { test, expect, login, api, stockOf, toast } from './fixtures.js';

/** Barang dengan stok cukup untuk skenario (dipilih dari data uji, bukan kode tetap). */
async function stocked(pb, min) {
  return pb.collection('products').getFirstListItem(`deleted = false && stock >= ${min}`, { sort: '-stock' });
}
const item = (p, qty) => ({ productCode: p.code, name: p.name, color: p.color, unit: p.unit || 'pcs', qty, price: 10000 });

test('Belum DP: yang dicetak hanya Konfirmasi Pesanan, bukan nota', async ({ page }) => {
  const gudang = await api('gudang');
  const p = await stocked(gudang, 1);
  const o = await gudang.collection('sales_orders').create({ customer: 'Toko Konfirmasi', items: [item(p, 2)] });
  await login(page, 'gudang');
  await page.goto(`/#/penjualan/${o.id}`);
  await expect(page.getByRole('button', { name: 'Cetak Konfirmasi Pesanan' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Cetak (Nota|Invoice)$/ })).toHaveCount(0);
  await page.goto(`/#/cetak/nota/${o.id}?preview=1`);
  await expect(page.getByRole('heading', { name: 'KONFIRMASI PESANAN' })).toBeVisible();
  await expect(page.getByText('bukan nota/bukti pembayaran')).toBeVisible();
});

test('Mobil tidak muat: 1 pesanan keluar dengan 2 surat jalan', async ({ page }) => {
  const gudang = await api('gudang');
  const finance = await api('finance');
  const p = await stocked(gudang, 10);
  const before = p.stock;
  const o = await gudang.collection('sales_orders').create({ customer: 'Toko Bertahap', destination: 'Jl. Bertahap 1', items: [item(p, 10)] });
  await finance.send('/api/palora/payment', { method: 'POST', body: { kind: 'customer', order_id: o.id, amount: o.total_amount } });

  await login(page, 'gudang');
  await page.goto(`/#/penjualan/${o.id}`);
  await page.getByRole('button', { name: 'Keluarkan Barang' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel(`Keluar sekarang ${p.name}`).fill('6');
  await expect(dlg.getByText('Mobil tidak muat?')).toBeVisible();
  await dlg.getByRole('button', { name: 'Terbitkan Surat Jalan' }).click();
  await expect(toast(page)).toContainText('Sisa barang bisa dikeluarkan berikutnya');
  expect(await stockOf(gudang, p.code)).toBe(before - 6);

  await page.goto(`/#/penjualan/${o.id}`);
  await expect(page.getByText(/Keluar sebagian:/)).toContainText('6/10');
  await page.getByRole('button', { name: 'Keluarkan Sisa Barang' }).click();
  await expect(page.getByRole('dialog').getByLabel(`Keluar sekarang ${p.name}`)).toHaveValue('4');
  await page.getByRole('dialog').getByRole('button', { name: 'Terbitkan Surat Jalan' }).click();
  await expect(page.getByRole('heading', { name: /^\d{4}\/DO\/PPU\// })).toBeVisible();
  expect(await stockOf(gudang, p.code)).toBe(before - 10);
  const sj = await gudang.collection('deliveries').getFullList({ filter: `order_id = "${o.id}"`, sort: 'created' });
  expect(sj.map((d) => d.items[0].qty)).toEqual([6, 4]);
});

test('Retur barang rusak: Owner kembalikan dana, tagihan & riwayat tercatat', async ({ page }) => {
  const gudang = await api('gudang');
  const finance = await api('finance');
  const p = await stocked(gudang, 5);
  const o = await gudang.collection('sales_orders').create({ customer: 'Toko Retur', destination: 'Jl. Retur 2', items: [item(p, 5)] });
  await finance.send('/api/palora/payment', { method: 'POST', body: { kind: 'customer', order_id: o.id, amount: o.total_amount } });
  await gudang.send('/api/palora/orders/dispatch', { method: 'POST', body: { order_id: o.id, mode: 'kirim' } });

  await login(page, 'owner');
  await page.goto(`/#/penjualan/${o.id}`);
  await page.getByRole('button', { name: 'Retur / Ganti Barang' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel(`Diretur ${p.name}`).fill('2');
  await dlg.getByLabel('Alasan').fill('palet retak saat diterima');
  await expect(dlg.locator('.alert.info')).toContainText('Rp 20.000');
  await dlg.getByRole('button', { name: 'Simpan Retur' }).click();
  await expect(toast(page)).toContainText('Rp 20.000 dikembalikan');
  await expect(page.getByText('Uang dikembalikan Rp 20.000')).toBeVisible();
  await expect(page.getByText('Dikembalikan', { exact: true })).toBeVisible();
  const after = await gudang.collection('sales_orders').getOne(o.id);
  expect(after).toMatchObject({ total_amount: 30000, paid_amount: 30000, remaining_amount: 0 });
});

test('PO yang sisanya tidak dikirim supplier bisa ditutup dengan alasan', async ({ page }) => {
  const gudang = await api('gudang');
  const p = await stocked(gudang, 0);
  const po = await gudang.collection('purchase_orders').create({ supplier: 'PT FUTARI', items: [{ ...item(p, 5), price: 8000 }] });
  await gudang.send('/api/palora/po/state', { method: 'POST', body: { po_id: po.id, state: 'dikirim' } });
  await gudang.send('/api/palora/po/receive', { method: 'POST', body: { po_id: po.id, sj_no: 'SJ-E2E-TUTUP', lines: [{ index: 0, good: 3 }] } });

  await login(page, 'gudang');
  await page.goto(`/#/pembelian/${po.id}`);
  await page.getByRole('button', { name: 'Tutup PO (sisa tidak datang)' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('pabrik stop produksi warna ini');
  await page.getByRole('dialog').getByRole('button', { name: 'Tutup PO' }).click();
  await expect(toast(page)).toContainText('ditutup');
  await expect(page.locator('.steps .current')).toHaveText('Selesai');
  await expect(page.getByText(/Ditutup kurang: pabrik stop produksi warna ini/)).toBeVisible();
});
