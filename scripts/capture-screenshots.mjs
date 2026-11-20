// Script otomatis untuk mengambil screenshot semua layar PALORA untuk Manual Book
import { spawn } from 'node:child_process';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { BACKEND_DIR, startServer } from './pb-utils.mjs';

const WEB_PORT = 5173;
const PB_PORT = 8090;
// Password akun contoh dibaca dari environment (SCREENSHOT_PASSWORD atau SEED_USER_PASSWORD), tidak ditulis di kode.
if (!(process.env.SCREENSHOT_PASSWORD || process.env.SEED_USER_PASSWORD)) {
  console.error('Set SCREENSHOT_PASSWORD (password akun contoh di database) sebelum menjalankan script ini.');
  process.exit(1);
}
const OUTPUT_DIR = path.resolve('manual_book/assets/screenshots');

async function waitForHttp(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  console.log('1. Memulai server PocketBase di port ' + PB_PORT + '...');
  const dataDir = path.join(BACKEND_DIR, 'pb_data');
  const pbServer = await startServer(dataDir, PB_PORT, { quiet: true });

  console.log('2. Memulai server Vite di port ' + WEB_PORT + '...');
  const isWin = process.platform === 'win32';
  const viteCmd = isWin ? 'npx.cmd' : 'npx';
  const viteProc = spawn(viteCmd, ['vite', '--port', String(WEB_PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: isWin,
    env: { ...process.env, PB_URL: `http://127.0.0.1:${PB_PORT}` },
  });

  try {
    await waitForHttp(`http://127.0.0.1:${WEB_PORT}/`);
    console.log('Server frontend & backend siap.');

    const browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1366, height: 860 },
      deviceScaleFactor: 2, // Retina 2x screenshot
      locale: 'id-ID',
      timezoneId: 'Asia/Jakarta',
    });

    const page = await context.newPage();

    async function loginAs(email, roleName) {
      console.log(`Login sebagai ${roleName} (${email})...`);
      await page.goto(`http://127.0.0.1:${WEB_PORT}/#/`);
      await page.waitForLoadState('networkidle');
      
      // Jika sudah login, klik tombol logout dulu
      const logoutBtn = page.getByRole('button', { name: /Keluar/i });
      if (await logoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await logoutBtn.click();
        await page.waitForTimeout(500);
      }

      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password', { exact: true }).fill(process.env.SCREENSHOT_PASSWORD || process.env.SEED_USER_PASSWORD || '');
      await page.getByRole('button', { name: 'Masuk' }).click();
      await page.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 15000 });
      await page.waitForTimeout(800);
    }

    async function snap(filename, selector = null) {
      const targetPath = path.join(OUTPUT_DIR, filename);
      await page.waitForTimeout(600);
      if (selector) {
        const el = page.locator(selector);
        if (await el.isVisible().catch(() => false)) {
          await el.screenshot({ path: targetPath });
          console.log(`  [OK] Saved ${filename} (selector: ${selector})`);
          return;
        }
      }
      await page.screenshot({ path: targetPath, fullPage: false });
      console.log(`  [OK] Saved ${filename}`);
    }

    // --- 00. LOGIN PAGE ---
    console.log('Mengambil screenshot Halaman Login...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/`);
    await page.waitForLoadState('networkidle');
    const logoutBtn = page.getByRole('button', { name: /Keluar/i });
    if (await logoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(500);
    }
    await snap('00_login.png');

    // --- 01. LOGIN SEBAGAI OWNER (PAK YANTO) ---
    await loginAs('yanto@palora.local', 'Owner (Pak Yanto)');
    await snap('01_launcher_owner.png');

    // --- 02. PENJUALAN ---
    console.log('Mengambil screenshot Modul Penjualan...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/penjualan`);
    await page.waitForTimeout(1000);
    await snap('02_penjualan_list.png');

    // Form Pesanan Baru
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/penjualan/baru`);
    await page.waitForTimeout(1000);
    await snap('03_penjualan_baru.png');

    // Pesanan Dokumen (Detail pesanan yang sudah ada di demo)
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/penjualan`);
    await page.waitForTimeout(800);
    const orderRows = page.locator('tbody tr');
    if (await orderRows.count() > 0) {
      await orderRows.first().click();
      await page.waitForTimeout(1000);
      await snap('04_pesanan_detail.png');
    }

    // Kasir POS
    console.log('Mengambil screenshot Kasir...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/kasir`);
    await page.waitForTimeout(1000);
    await snap('05_kasir_pos.png');

    // Surat Jalan List
    console.log('Mengambil screenshot Surat Jalan...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/surat-jalan`);
    await page.waitForTimeout(1000);
    await snap('06_surat_jalan_list.png');

    // Surat Jalan Cetak Preview (bila ada)
    const sjRows = page.locator('tbody tr');
    if (await sjRows.count() > 0) {
      await sjRows.first().click();
      await page.waitForTimeout(1000);
      await snap('07_surat_jalan_detail.png');
    }

    // --- 03. PEMBELIAN (PO) ---
    console.log('Mengambil screenshot Modul Pembelian...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/pembelian`);
    await page.waitForTimeout(1000);
    await snap('08_pembelian_list.png');

    // Form PO Baru
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/pembelian/baru`);
    await page.waitForTimeout(1000);
    await snap('09_pembelian_baru.png');

    // PO Detail / Folder & Terima Barang
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/pembelian`);
    await page.waitForTimeout(800);
    const poRows = page.locator('tbody tr');
    if (await poRows.count() > 0) {
      await poRows.first().click();
      await page.waitForTimeout(1000);
      await snap('10_pembelian_detail_terima.png');
    }

    // --- 04. STOK GUDANG ---
    console.log('Mengambil screenshot Modul Stok...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/stok`);
    await page.waitForTimeout(1200);
    await snap('11_stok_katalog.png');

    // Mutasi Stok
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/stok/mutasi`);
    await page.waitForTimeout(1000);
    await snap('12_stok_mutasi.png');

    // Stok Opname
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/opname`);
    await page.waitForTimeout(1000);
    await snap('13_stok_opname_list.png');

    // Stok Opname Baru
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/opname/baru`);
    await page.waitForTimeout(1000);
    await snap('14_stok_opname_baru.png');

    // Harga Modal (Khusus Owner)
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/stok/harga`);
    await page.waitForTimeout(1000);
    await snap('15_stok_harga_modal.png');

    // Kartu Stok Detail (klik barang pertama di stok)
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/stok`);
    await page.waitForTimeout(1000);
    const prodRows = page.locator('tbody tr');
    if (await prodRows.count() > 0) {
      await prodRows.first().click();
      await page.waitForTimeout(1000);
      await snap('16_stok_kartu_detail.png');
    }

    // --- 05. KEUANGAN (PIUTANG & HUTANG) ---
    console.log('Mengambil screenshot Modul Keuangan...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/piutang`);
    await page.waitForTimeout(1000);
    await snap('17_keuangan_piutang.png');

    // Piutang Detail (jika ada customer)
    const piutangRows = page.locator('tbody tr');
    if (await piutangRows.count() > 0) {
      await piutangRows.first().click();
      await page.waitForTimeout(1000);
      await snap('18_keuangan_piutang_detail.png');
    }

    // Hutang Supplier
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/hutang`);
    await page.waitForTimeout(1000);
    await snap('19_keuangan_hutang.png');

    // --- 06. MARKETPLACE ---
    console.log('Mengambil screenshot Modul Marketplace...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/marketplace`);
    await page.waitForTimeout(1000);
    await snap('20_marketplace.png');

    // --- 07. ARSIP DOKUMEN ---
    console.log('Mengambil screenshot Modul Arsip...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/arsip`);
    await page.waitForTimeout(1000);
    await snap('21_arsip.png');

    // --- 08. LAPORAN ---
    console.log('Mengambil screenshot Modul Laporan...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/laporan`);
    await page.waitForTimeout(1000);
    await snap('22_laporan.png');

    // --- 09. MASTER DATA ---
    console.log('Mengambil screenshot Master Data...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/pelanggan`);
    await page.waitForTimeout(1000);
    await snap('23_master_pelanggan.png');

    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/supplier`);
    await page.waitForTimeout(1000);
    await snap('24_master_supplier.png');

    // --- 10. ADMIN & SISTEM ---
    console.log('Mengambil screenshot Modul Admin & Sistem...');
    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/pengguna`);
    await page.waitForTimeout(1000);
    await snap('25_admin_pengguna.png');

    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/aktivitas`);
    await page.waitForTimeout(1000);
    await snap('26_admin_aktivitas.png');

    await page.goto(`http://127.0.0.1:${WEB_PORT}/#/pengaturan`);
    await page.waitForTimeout(1000);
    await snap('27_admin_pengaturan.png');

    // --- 11. ROLE GUDANG & FINANCE LAUNCHER ---
    await loginAs('heri@palora.local', 'Admin Gudang (Mas Heri)');
    await snap('28_launcher_gudang.png');

    await loginAs('bude@palora.local', 'Keuangan (Bude)');
    await snap('29_launcher_keuangan.png');

    await browser.close();
    console.log('\nSemua screenshot berhasil diambil!');
  } finally {
    console.log('Menghentikan server backend dan frontend...');
    try { viteProc.kill(); } catch {}
    try { await pbServer.stop(); } catch {}
  }
}

run().catch((err) => {
  console.error('Error saat capture screenshot:', err);
  process.exit(1);
});
