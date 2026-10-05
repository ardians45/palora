// Skenario PO bertahap + foto SJ, stok opname, import Excel barang, marketplace.
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { test, expect, login, api, stockOf, toast } from './fixtures.js';

const tmp = (name) => path.join(os.tmpdir(), name);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

test('Pak De: PO 2 barang -> terima 60% + foto SJ -> terima sisa -> selesai, stok bertambah', async ({ page }) => {
  const pb = await api();
  const b29 = await stockOf(pb, 'BOX-0029');
  const b30 = await stockOf(pb, 'BOX-0030');
  await login(page, 'owner');
  await page.goto('/#/pembelian/baru');
  await page.getByLabel(/^Supplier/).fill('PT LINHUI');
  await expect(page.getByLabel('Up (sales supplier)')).toHaveValue('Ibu Fitri');
  const prod = page.getByPlaceholder('+ Ketik kode / nama barang');
  await prod.fill('BOX-0029');
  await prod.press('Enter');
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('24750');
  await page.keyboard.press('Enter'); // ke baris berikutnya
  await page.keyboard.type('BOX-0030');
  await page.keyboard.press('Enter');
  await page.keyboard.type('5');
  await expect(page.getByText('Rp 345.500')).toBeVisible(); // 10x24.750 + 5x19.600
  await page.getByRole('button', { name: 'Simpan PO' }).click();

  await expect(page.getByRole('heading', { name: /^PO-\d{3}\/PPU\/\d{4}PT LINHUI/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tandai Sudah Dikirim' }).click();
  await expect(page.locator('.steps .current')).toHaveText('Dikirim');

  // terima 6 dari 10 + foto surat jalan
  await page.getByRole('button', { name: 'Terima Barang' }).click();
  let dlg = page.getByRole('dialog');
  await dlg.getByLabel('No. surat jalan supplier').fill('LH-001');
  await dlg.getByLabel(/^Diterima L - 65/).fill('6');
  await dlg.getByLabel(/^Rusak L - 65/).fill('1');
  await dlg.getByLabel(/^Diterima L - 85/).fill('0');
  await dlg.locator('input[type=file]').setInputFiles({ name: 'sj-linhui.pdf', mimeType: 'application/pdf', buffer: PDF });
  await dlg.getByRole('button', { name: 'Simpan Penerimaan' }).click();
  await expect(page.locator('.steps .current')).toHaveText('Diterima Sebagian');
  expect(await stockOf(pb, 'BOX-0029')).toBe(b29 + 6);
  await expect(page.getByRole('link', { name: 'Lihat' })).toBeVisible(); // foto SJ tersimpan

  // terima sisanya
  await page.getByRole('button', { name: 'Terima Barang' }).click();
  dlg = page.getByRole('dialog');
  await dlg.getByLabel('No. surat jalan supplier').fill('LH-002');
  await dlg.getByRole('button', { name: 'Simpan Penerimaan' }).click();
  await expect(page.locator('.steps .current')).toHaveText('Selesai');
  expect(await stockOf(pb, 'BOX-0029')).toBe(b29 + 10);
  expect(await stockOf(pb, 'BOX-0030')).toBe(b30 + 5);
});

test('Stok opname: hanya baris yang diisi yang disesuaikan', async ({ page }) => {
  const pb = await api();
  const a = await stockOf(pb, 'PLT-0010');
  const b = await stockOf(pb, 'PLT-0012');
  await login(page, 'gudang');
  await page.goto('/#/opname/baru');
  await page.getByLabel('Cari barang').fill('PLT-001');
  await page.getByLabel('Hitung fisik PLT-0010').fill(String(a - 2));
  await page.getByLabel('Hitung fisik PLT-0012').fill(String(b));
  await expect(page.getByText('2 dihitung · 1 selisih')).toBeVisible();
  await page.getByRole('button', { name: 'Simpan Opname' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan Opname' }).click();
  await expect(page.getByRole('heading', { name: /^OP\/PPU\/\d{8}\/\d{2}$/ })).toBeVisible();
  expect(await stockOf(pb, 'PLT-0010')).toBe(a - 2);
  expect(await stockOf(pb, 'PLT-0012')).toBe(b);
});

test('Import Excel barang: preview lalu update & tambah barang', async ({ page }) => {
  const file = tmp('palora-e2e-import.xlsx');
  const ws = XLSX.utils.json_to_sheet([
    { Kode: 'PLT-0014', 'Harga Jual': 33000 },
    { Kode: 99001, 'Nama Barang': 'Ember Uji 20L', Kelompok: 'BIOPLAST', Qty: 12, 'Harga Jual': 73000 },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stok');
  XLSX.writeFile(wb, file);

  const pb = await api();
  const s14 = await stockOf(pb, 'PLT-0014');
  await login(page, 'gudang');
  await page.goto('/#/stok');
  await page.getByRole('button', { name: 'Import Excel' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.locator('input[type=file]').setInputFiles(file);
  await expect(dlg.getByText('2 baris terbaca: 1 barang baru, 1 diperbarui')).toBeVisible();
  await dlg.getByRole('button', { name: 'Import 2 baris' }).click();
  await expect(toast(page)).toContainText('1 barang baru, 1 diperbarui');
  const p14 = await pb.collection('products').getFirstListItem('code = "PLT-0014"');
  expect(p14).toMatchObject({ sell_price: 33000, stock: s14 }); // stok tidak berubah karena kolom Qty kosong
  expect(await stockOf(pb, '99001')).toBe(12);
});

test('Marketplace: laporan Shopee -> cocokkan SKU -> potong stok; upload ulang dilewati', async ({ page }) => {
  const file = tmp('palora-e2e-shopee.xlsx');
  const ws = XLSX.utils.json_to_sheet([
    { 'No. Pesanan': '2410E2E01', 'Waktu Pesanan Dibuat': '2026-10-04 10:00', 'Nomor Referensi SKU': 'SKU-DARKBLUE', 'Nama Produk': 'Palet Biru Tua', Jumlah: 2, 'Harga Setelah Diskon': 35000, 'Status Pesanan': 'Selesai' },
    { 'No. Pesanan': '2410E2E01', 'Waktu Pesanan Dibuat': '2026-10-04 10:00', 'Nomor Referensi SKU': 'PLT-0015', 'Nama Produk': 'Palet', Jumlah: 1, 'Harga Setelah Diskon': 35000, 'Status Pesanan': 'Selesai' },
    { 'No. Pesanan': '2410E2E02', 'Waktu Pesanan Dibuat': '2026-10-04 11:00', 'Nomor Referensi SKU': 'PLT-0015', 'Nama Produk': 'Palet', Jumlah: 5, 'Harga Setelah Diskon': 35000, 'Status Pesanan': 'Batal' },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'orders');
  XLSX.writeFile(wb, file);

  const pb = await api();
  const blue = await stockOf(pb, 'PLT-0009');
  const p15 = await stockOf(pb, 'PLT-0015');
  await login(page, 'gudang');
  await page.goto('/#/marketplace');
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByText('1 baris batal/retur dilewati')).toBeVisible();
  await expect(page.getByText('1 SKU marketplace belum dikenal')).toBeVisible();
  const map = page.getByPlaceholder('Pilih barang...');
  await map.fill('PLT-0009');
  await map.press('Enter');
  await page.getByRole('button', { name: /^Import 1 pesanan/ }).click();
  await expect(toast(page)).toContainText('1 pesanan Shopee 1 diimpor');
  expect(await stockOf(pb, 'PLT-0009')).toBe(blue - 2);
  expect(await stockOf(pb, 'PLT-0015')).toBe(p15 - 1);

  // file yang sama lagi -> dilewati, pemetaan SKU sudah diingat
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByText('1 pesanan sudah pernah diimpor')).toBeVisible();
  await expect(page.getByText('SKU marketplace belum dikenal')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Import 0 pesanan/ })).toBeDisabled();
});
