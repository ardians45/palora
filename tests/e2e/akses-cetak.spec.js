// Hak akses per role, gangguan jaringan, hasil cetak PDF, tampilan HP.
import { PDFParse } from 'pdf-parse';
import { test, expect, login, api } from './fixtures.js';

test('Bude (Keuangan) tidak melihat Kasir/PO baru dan tidak bisa membuka lewat URL', async ({ page }) => {
  await login(page, 'finance');
  const grid = page.locator('.launcher-grid');
  await expect(grid.getByText('Piutang', { exact: true })).toBeVisible();
  await expect(grid.getByText('Kasir', { exact: true })).toHaveCount(0);
  await expect(grid.getByText('Marketplace', { exact: true })).toHaveCount(0);
  await page.goto('/#/kasir');
  await expect(page.getByText('Akun Anda tidak punya akses ke halaman ini')).toBeVisible();
  await page.goto('/#/pembelian/baru');
  await expect(page.getByText('Akun Anda tidak punya akses ke halaman ini')).toBeVisible();
});

test('Mas Heri (Gudang) tidak melihat Piutang, Laporan, Pengguna', async ({ page }) => {
  await login(page, 'gudang');
  const grid = page.locator('.launcher-grid');
  await expect(grid.getByText('Kasir', { exact: true })).toBeVisible();
  for (const name of ['Piutang', 'Hutang Supplier', 'Laporan', 'Pengguna', 'Aktivitas', 'Pengaturan']) {
    await expect(grid.getByText(name, { exact: true })).toHaveCount(0);
  }
  await page.goto('/#/laporan');
  await expect(page.getByText('Akun Anda tidak punya akses ke halaman ini')).toBeVisible();
});

test('Jaringan putus saat bayar: pesan jelas, keranjang tidak hilang, coba lagi berhasil', async ({ page }) => {
  page.__allowHttpErrors = true;
  await login(page, 'gudang');
  await page.goto('/#/kasir');
  const search = page.getByLabel('Cari barang');
  await search.fill('PLT-0016');
  await search.press('Enter');
  await page.route('**/api/palora/kasir/checkout', (route) => route.abort('internetdisconnected'));
  await page.getByRole('button', { name: /^Bayar/ }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Keranjang (1)')).toBeVisible();
  await page.unroute('**/api/palora/kasir/checkout');
  await page.getByRole('button', { name: /^Bayar/ }).click();
  await expect(page.getByRole('heading', { name: 'Transaksi selesai' })).toBeVisible();
});

test('Cetak surat jalan & nota: 1 halaman, kop PT Paletindo Prakarsa Unggul', async ({ page }) => {
  const pb = await api('gudang');
  const p = await pb.collection('products').getFirstListItem('code = "PLT-0013"');
  const order = await pb.collection('sales_orders').create({
    customer: 'PT Uji Cetak',
    up_person: 'Ibu Uji',
    po_customer_ref: 'PO-UJI-1',
    destination: 'Jl. Cetak No. 9, Tangerang Selatan',
    items: [{ productCode: p.code, name: p.name, color: p.color, unit: p.unit, qty: 5, price: 31900 }],
  });
  await pb.send('/api/palora/payment', { method: 'POST', body: { kind: 'customer', order_id: order.id, amount: order.total_amount } });
  const res = await pb.send('/api/palora/orders/dispatch', { method: 'POST', body: { order_id: order.id, mode: 'kirim', driver_name: 'Pak Supir' } });

  await login(page, 'gudang');
  for (const [url, expects] of [
    [`/#/cetak/sj/${res.delivery.id}?preview=1`, ['PT PALETINDO PRAKARSA UNGGUL', 'QUANTITY', 'ITEM BARANG', 'PO #: PO-UJI-1', 'Penerima', 'Mengetahui', 'Pengirim']],
    [`/#/cetak/nota/${order.id}?preview=1`, ['PT PALETINDO PRAKARSA UNGGUL', 'NOTA', 'Terbilang', 'LUNAS']],
  ]) {
    await page.goto(url);
    await expect(page.locator('.paper')).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    const parser = new PDFParse({ data: pdf });
    const info = await parser.getText();
    await parser.destroy();
    expect(info.total, `${url} harus 1 halaman`).toBe(1);
    const text = info.text.replace(/\s+/g, ' ').toUpperCase();
    for (const t of expects) expect(text).toContain(t.toUpperCase());
  }
});

test.describe('Tampilan HP (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('Pak De cek stok & pesanan dari HP tanpa geser ke samping', async ({ page }) => {
    await login(page, 'owner');
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(await noOverflow()).toBe(true);
    for (const url of ['/#/stok', '/#/penjualan', '/#/piutang', '/#/pembelian/baru']) {
      await page.goto(url);
      await expect(page.locator('h1')).toBeVisible();
      expect(await noOverflow(), `${url} melebar di HP`).toBe(true);
    }
  });
});

test('Owner: tambah akun baru, akun nonaktif tidak bisa login', async ({ page }) => {
  await login(page, 'owner');
  await page.goto('/#/pengguna');
  await page.getByRole('button', { name: 'Tambah Akun' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Nama').fill('Rizki');
  await dlg.getByLabel('Email (untuk login)').fill('rizki@palora.local');
  await dlg.getByLabel(/^Password/).fill('rizki-12345');
  await dlg.getByLabel('Akun aktif (bisa login)').uncheck();
  await dlg.getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByRole('cell', { name: 'rizki@palora.local' })).toBeVisible();

  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await page.getByLabel('Email').fill('rizki@palora.local');
  await page.getByLabel('Password').fill('rizki-12345');
  page.__allowHttpErrors = true;
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('alert')).toContainText('belum diaktifkan');
  const pb = await api();
  const u = await pb.collection('users').getFirstListItem('email = "rizki@palora.local"');
  expect(u.active).toBe(false);
});

test('Foto barang tampil di Stok, kartu stok, dan Kasir; nama varian sudah lengkap', async ({ page }) => {
  await login(page, 'gudang');
  await page.goto('/#/stok?q=MT - 200');
  const row = page.getByRole('row', { name: /Tackle Box MT - 200 Orange dk grey/ });
  await expect(row.locator('img.thumb')).toBeVisible();
  await row.click();
  await expect(page.locator('.photo-panel img.thumb.lg')).toBeVisible();
  await expect(page.getByRole('link', { name: 'katalog paletindo.com' })).toHaveAttribute('href', /paletindo\.com/);

  // barang tanpa foto: kotak polos, bukan gambar rusak
  await page.goto('/#/stok?q=L - 65');
  await expect(page.getByRole('row', { name: /L - 65/ }).locator('.thumb.empty')).toBeVisible();

  await page.goto('/#/kasir');
  await page.getByLabel('Cari barang').fill('Smart Box SS - 800');
  await expect(page.locator('.pos-results tbody tr').first().locator('img.thumb')).toBeVisible();
  // gambar benar-benar termuat
  const ok = await page.locator('.pos-results img.thumb').first().evaluate((img) => img.complete && img.naturalWidth > 0);
  expect(ok).toBe(true);
});
