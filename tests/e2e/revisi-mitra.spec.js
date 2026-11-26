// Revisi dari mitra (docs/PLAN_REVISI_MITRA.md): supplier PPN & format PO, order online (marketplace),
// produksi sendiri dengan HPP per batch, serta ganti password sendiri.
import PocketBase from 'pocketbase';
import { test, expect, login, api, stockOf, toast } from './fixtures.js';
import { PB_URL, USER_PASSWORD } from './env.js';

/** Pilih satu barang lewat katalog bergambar (dipakai form PO & pesanan). */
async function pickFromCatalog(page, code) {
  await page.getByRole('button', { name: 'Pilih dari Katalog' }).first().click();
  const dlg = page.getByRole('dialog', { name: 'Pilih Barang' });
  const all = dlg.getByRole('radio', { name: /^Semua barang/ });
  if (await all.count()) await all.click();
  await dlg.getByLabel('Cari barang di katalog').fill(code);
  await dlg.getByRole('button', { name: /^Pilih / }).first().click();
  await dlg.getByRole('button', { name: /^Masukkan 1 barang/ }).click();
}

test('Supplier PPN: PO otomatis + PPN 11%, tampil di layar dan cetakan', async ({ page }) => {
  const owner = await api('owner');
  const sup = await owner.collection('suppliers').getFirstListItem('name = "PT LINHUI"');
  await owner.collection('suppliers').update(sup.id, { pkp: true });

  await login(page, 'gudang');
  await page.goto('/#/supplier');
  await expect(page.getByRole('row', { name: /PT LINHUI/ }).getByText('PPN', { exact: true })).toBeVisible();

  await page.goto('/#/pembelian/baru');
  await page.getByPlaceholder('Ketik nama supplier').fill('PT LINHUI');
  const ppn = page.getByLabel(/Supplier PPN: harga \+ PPN 11%/);
  await expect(ppn).toBeChecked(); // ikut centang di master supplier
  await pickFromCatalog(page, 'PLT-0005');
  await expect(page.getByText('Subtotal (DPP)')).toBeVisible();
  await page.getByRole('button', { name: 'Simpan PO' }).click();
  await expect(toast(page)).toContainText('tersimpan');
  await expect(page.getByText('Total (termasuk PPN)')).toBeVisible();

  const po = await owner.collection('purchase_orders').getFirstListItem('supplier = "PT LINHUI" && ppn = true', { sort: '-created' });
  expect(po.tax_amount).toBe(Math.round(po.subtotal * 0.11));
  expect(po.total_amount).toBe(po.subtotal + po.tax_amount);

  await page.goto(`/#/cetak/po/${po.id}?preview=1`);
  await expect(page.getByText('PPN 11%')).toBeVisible();
  await expect(page.getByText('Subtotal (DPP)')).toBeVisible();

  await owner.collection('suppliers').update(sup.id, { pkp: false }); // kembalikan untuk test lain
});

test('Order online: toko + no. pesanan marketplace, saringan Offline / Online', async ({ page }) => {
  await login(page, 'gudang');
  await page.goto('/#/penjualan/baru');
  await page.getByRole('radio', { name: 'Online (Marketplace)' }).click();
  await page.getByLabel(/^Customer/).fill('Pembeli Online E2E');
  await pickFromCatalog(page, 'PLT-0005');

  // tanpa no. pesanan marketplace ditolak
  await page.getByRole('button', { name: 'Simpan Pesanan' }).click();
  await expect(page.getByRole('alert')).toContainText('no. pesanan dari marketplace');
  await page.getByLabel(/^No\. pesanan marketplace/).fill('E2E-SHP-001');
  await page.getByRole('button', { name: 'Simpan Pesanan' }).click();
  await expect(toast(page)).toContainText('tersimpan');
  await expect(page.getByText('Online · Shopee 1 #E2E-SHP-001')).toBeVisible();

  await page.goto('/#/penjualan?jenis=online');
  await expect(page.getByRole('cell', { name: 'Pembeli Online E2E' })).toBeVisible();
  await page.goto('/#/penjualan?jenis=offline');
  await expect(page.getByRole('radio', { name: /^Offline/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('cell', { name: 'Pembeli Online E2E' })).toHaveCount(0);
});

test('Produksi sendiri: HPP per unit dihitung, stok masuk tanpa PO, batch bisa dibatalkan', async ({ page }) => {
  const gudang = await api('gudang');
  const p = await gudang.collection('products').getFirstListItem('code = "PLT-0005"');
  const before = p.stock;

  await login(page, 'gudang');
  await page.goto('/#/produksi/baru');
  const combo = page.getByPlaceholder('Ketik kode / nama barang');
  await combo.fill('PLT-0005');
  await combo.press('Enter');
  await page.getByLabel(/^Qty barang jadi/).fill('50');
  await page.getByLabel(/^Biaya material/).fill('400000');
  await page.getByLabel(/^Biaya jasa/).fill('100000');
  await expect(page.locator('.hpp-box .value')).toHaveText('Rp 10.000'); // 500.000 / 50
  await page.getByRole('button', { name: /Simpan & Masukkan ke Stok/ }).click();
  await expect(toast(page)).toContainText('PRD-');
  await expect(page.getByText('Hasil produksi sendiri (bukan pembelian)')).toBeVisible();
  expect(await stockOf(gudang, 'PLT-0005')).toBe(before + 50);

  const batch = await gudang.collection('productions').getFirstListItem('product_code = "PLT-0005"', { sort: '-created' });
  expect(batch).toMatchObject({ qty: 50, total_cost: 500000, unit_cost: 10000, status: 'selesai' });
  const mv = await gudang.collection('stock_movements').getFirstListItem(`ref_id = "${batch.id}"`);
  expect(mv).toMatchObject({ type: 'PRODUKSI', qty: 50 });

  // tampil di daftar produksi dan di kartu stok (ada tautan ke batch)
  await page.goto('/#/produksi');
  await expect(page.getByRole('cell', { name: batch.batch_no })).toBeVisible();
  await page.goto(`/#/stok/${p.id}`);
  await expect(page.getByRole('link', { name: batch.batch_no })).toBeVisible();
  await expect(page.getByText('Produksi sendiri', { exact: true })).toBeVisible();

  // salah input -> batalkan, stok kembali
  await page.goto(`/#/produksi/${batch.id}`);
  await page.getByRole('button', { name: 'Batalkan Batch' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('textbox').fill('salah input qty');
  await dlg.getByRole('button', { name: 'Batalkan Batch' }).click();
  await expect(toast(page)).toContainText('dibatalkan');
  expect(await stockOf(gudang, 'PLT-0005')).toBe(before);
});

test('Ganti password sendiri dari tombol di pojok kanan atas', async ({ page }) => {
  const owner = await api('owner');
  const email = 'ganti-pw@e2e.local';
  await owner.collection('users').create({ email, password: USER_PASSWORD, passwordConfirm: USER_PASSWORD, name: 'Ganti Pw', role: 'gudang', active: true });

  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('heading', { name: /^Halo,/ })).toBeVisible();

  await page.getByRole('button', { name: 'Ganti password' }).click();
  const dlg = page.getByRole('dialog', { name: 'Ganti Password' });
  await dlg.getByLabel(/^Password sekarang/).fill(USER_PASSWORD);
  await dlg.getByLabel(/^Password baru/).fill('baru-e2e-12345');
  await dlg.getByLabel(/^Ulangi password baru/).fill('baru-e2e-12345');
  await dlg.getByRole('button', { name: 'Ganti Password' }).click();
  await expect(toast(page)).toContainText('Password berhasil diganti');
  await expect(page.getByRole('heading', { name: /^Halo,/ })).toBeVisible(); // tetap login

  const pb = new PocketBase(PB_URL);
  await pb.collection('users').authWithPassword(email, 'baru-e2e-12345');
  expect(pb.authStore.isValid).toBe(true);
});
