// Skenario penjualan: kasir (Mas Heri), pesanan tempo dengan DP -> izin Owner -> surat jalan -> cicilan Bude.
import { test, expect, login, api, stockOf, toast } from './fixtures.js';

test('Mas Heri: kasir 3 langkah, harga nego, kembalian, stok terpotong', async ({ page }) => {
  const pb = await api();
  const before = await stockOf(pb, 'PLT-0002');
  await login(page, 'gudang');
  await page.getByRole('link', { name: 'Kasir' }).click();

  // 1. cari & tambah
  const search = page.getByLabel('Cari barang');
  await search.fill('PLT-0002');
  await search.press('Enter');
  // 2. qty & harga nego
  await page.getByLabel(/^Qty Palet FUTARI FP 0303 Hijau/).fill('3');
  await page.getByLabel(/^Harga Palet FUTARI FP 0303 Hijau/).fill('30000');
  await page.getByLabel('Uang diterima').fill('100000');
  await expect(page.getByLabel('Kembalian')).toHaveValue('10.000');
  // 3. bayar
  await page.getByRole('button', { name: /^Bayar Rp 90\.000/ }).click();

  await expect(page.getByRole('heading', { name: 'Transaksi selesai' })).toBeVisible();
  await expect(page.getByText('Rp 10.000')).toBeVisible();
  expect(await stockOf(pb, 'PLT-0002')).toBe(before - 3);
  const order = await pb.collection('sales_orders').getFirstListItem('channel = "kasir"', { sort: '-created' });
  expect(order).toMatchObject({ total_amount: 90000, status: 'selesai' });
  expect(order.items[0]).toMatchObject({ price: 30000, originalPrice: 31900 });
});

test('Kasir menolak jual melebihi stok dengan pesan jelas', async ({ page }) => {
  await login(page, 'gudang');
  await page.goto('/#/kasir');
  const search = page.getByLabel('Cari barang');
  await search.fill('PLT-0003'); // stok 17
  await search.press('Enter');
  await page.getByLabel(/^Qty /).fill('99');
  await page.getByRole('button', { name: /^Bayar/ }).click();
  await expect(page.getByRole('alert')).toContainText('hanya 17');
});

test('Pesanan tempo: DP 25% -> Owner izinkan -> surat jalan -> Bude catat 2x cicilan -> diterima -> selesai', async ({ page }) => {
  const pb = await api();
  const before = await stockOf(pb, 'PLT-0006');

  // Mas Heri membuat pesanan + DP
  await login(page, 'gudang');
  await page.goto('/#/penjualan/baru');
  await page.getByLabel(/^Customer/).fill('Toko Uji Tempo');
  await page.getByLabel('UP (penerima)').fill('Pak Uji');
  await page.getByLabel('Telepon / WA').fill('0812-1111-2222');
  await page.getByLabel('Alamat kirim').fill('Jl. Uji No. 1, Tangerang');
  const prod = page.getByPlaceholder('+ Ketik kode / nama barang');
  await prod.fill('PLT-0006');
  await prod.press('Enter');
  await page.keyboard.type('10');
  await expect(page.getByText('Rp 319.000').first()).toBeVisible();
  await page.getByLabel('DP diterima sekarang').fill('79750');
  await page.getByRole('button', { name: 'Simpan Pesanan' }).click();

  await expect(page.getByRole('heading', { name: /^INV\/PPU\// })).toBeVisible();
  const orderUrl = page.url();
  await expect(page.locator('.steps .current')).toHaveText('DP');
  await expect(page.getByRole('button', { name: 'Keluarkan Barang' })).toHaveCount(0);

  // Owner mengizinkan kirim sebelum lunas
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await login(page, 'owner');
  await page.goto(orderUrl);
  await page.getByRole('button', { name: 'Izinkan Kirim Sebelum Lunas' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Izinkan' }).click();
  await expect(toast(page)).toContainText('Izin kirim');

  // Keluarkan barang -> surat jalan
  await page.getByRole('button', { name: 'Keluarkan Barang' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Supir').fill('Pak Suryanto');
  await dlg.getByLabel('No. kendaraan').fill('B 9482 PPU');
  await dlg.getByRole('button', { name: 'Terbitkan Surat Jalan' }).click();
  await expect(page.getByRole('heading', { name: /^\d{4}\/DO\/PPU\/[IVX]+\/\d{4}$/ })).toBeVisible();
  const sjUrl = page.url();
  expect(await stockOf(pb, 'PLT-0006')).toBe(before - 10);

  // Bude mencatat cicilan dari menu Piutang
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await login(page, 'finance');
  await page.getByRole('link', { name: 'Piutang' }).first().click();
  await page.getByRole('cell', { name: 'Toko Uji Tempo' }).click();
  await page.getByRole('button', { name: 'Bayar' }).click();
  await page.getByRole('dialog').getByLabel('Jumlah').fill('100000');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan Pembayaran' }).click();
  await expect(toast(page)).toContainText('Rp 100.000');
  await page.getByRole('button', { name: 'Bayar' }).click();
  await expect(page.getByRole('dialog').locator('.alert.info')).toContainText('Rp 139.250');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan Pembayaran' }).click();
  await expect(page.getByText('Semua nota sudah lunas')).toBeVisible();

  // Mas Heri konfirmasi surat jalan diterima -> pesanan selesai
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await login(page, 'gudang');
  await page.goto(sjUrl);
  await page.getByRole('button', { name: 'Konfirmasi Diterima' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByText('Diterima Customer')).toBeVisible();
  const order = await pb.collection('sales_orders').getFirstListItem('customer = "Toko Uji Tempo"');
  expect(order).toMatchObject({ status: 'selesai', remaining_amount: 0, paid_amount: 319000 });
  const pays = await pb.collection('payments').getFullList({ filter: `order_id = "${order.id}"`, sort: 'created' });
  expect(pays.map((p) => p.amount)).toEqual([79750, 100000, 139250]);
});

test('Ambil sendiri: lunas -> serahkan barang tanpa surat jalan', async ({ page }) => {
  const pb = await api();
  const before = await stockOf(pb, 'PLT-0007');
  await login(page, 'gudang');
  await page.goto('/#/penjualan/baru');
  await page.getByLabel(/^Customer/).fill('Pembeli Ambil Sendiri');
  const prod = page.getByPlaceholder('+ Ketik kode / nama barang');
  await prod.fill('PLT-0007');
  await prod.press('Enter');
  await page.keyboard.type('4');
  await page.keyboard.press('Enter');
  await page.keyboard.type('30000');
  await page.getByLabel('DP diterima sekarang').fill('120000');
  await page.getByRole('button', { name: 'Simpan Pesanan' }).click();
  await expect(page.locator('.steps .current')).toHaveText('Lunas');
  await page.getByRole('button', { name: 'Keluarkan Barang' }).click();
  await page.getByRole('dialog').getByRole('radio', { name: 'Diambil sendiri' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Serahkan Barang' }).click();
  await expect(page.locator('.steps .current')).toHaveText('Selesai');
  expect(await stockOf(pb, 'PLT-0007')).toBe(before - 4);
  const sj = await pb.collection('deliveries').getList(1, 1, { filter: 'customer = "Pembeli Ambil Sendiri"' });
  expect(sj.totalItems).toBe(0);
});

test('Pembatalan wajib alasan dan tercatat', async ({ page }) => {
  await login(page, 'gudang');
  await page.goto('/#/penjualan/baru');
  await page.getByLabel(/^Customer/).fill('Customer Batal');
  const prod = page.getByPlaceholder('+ Ketik kode / nama barang');
  await prod.fill('PLT-0009');
  await prod.press('Enter');
  await page.getByRole('button', { name: 'Simpan Pesanan' }).click();
  await page.getByRole('button', { name: 'Batalkan' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Batalkan Pesanan' }).click();
  await expect(dlg.getByText('Alasan pembatalan wajib diisi.')).toBeVisible();
  await dlg.getByLabel('Alasan pembatalan').fill('Customer tidak jadi');
  await dlg.getByRole('button', { name: 'Batalkan Pesanan' }).click();
  await expect(page.locator('.steps .exception')).toHaveText('Dibatalkan');
  await expect(page.getByText('Dibatalkan: Customer tidak jadi')).toBeVisible();
});
