// Compiler utama untuk mencetak seluruh PDF Manual Book PALORA
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import {
  OUTPUT_PDF_DIR,
  OUTPUT_SRC_DIR,
  SHARED_CSS,
  renderHtmlToPdf,
  wrapHtmlDocument,
} from './manual-builder.mjs';
import { getModul00, getModul01, getModul02 } from './manual-content-part1.mjs';
import { getModul03, getModul04, getModul05 } from './manual-content-part2.mjs';
import { getModul06, getModul07, getModul08, getModul09 } from './manual-content-part3.mjs';

const MODULES_DATA = [
  { file: '00_Panduan_Umum_dan_Navigasi_Sistem', getter: getModul00 },
  { file: '01_Modul_Penjualan_dan_Kasir', getter: getModul01 },
  { file: '02_Modul_Pembelian_PO_dan_Penerimaan', getter: getModul02 },
  { file: '03_Modul_Stok_Gudang_dan_Inventaris', getter: getModul03 },
  { file: '04_Modul_Keuangan_Piutang_dan_Hutang', getter: getModul04 },
  { file: '05_Modul_Marketplace_MultiChannel', getter: getModul05 },
  { file: '06_Modul_Arsip_Dokumen_Digital', getter: getModul06 },
  { file: '07_Modul_Laporan_dan_Analitik_Bisnis', getter: getModul07 },
  { file: '08_Modul_Master_Data_dan_Katalog', getter: getModul08 },
  { file: '09_Modul_Administrasi_dan_Keamanan_Sistem', getter: getModul09 },
];

async function main() {
  console.log('=== MEMULAI KOMPILASI MANUAL BOOK PALORA ===\n');

  // Pastikan folder output ada
  fs.mkdirSync(OUTPUT_PDF_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_SRC_DIR, { recursive: true });

  console.log('Membuka browser Playwright (Microsoft Edge headless)...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const generatedFiles = [];

  // 1. Render masing-masing 10 modul individual
  for (let i = 0; i < MODULES_DATA.length; i++) {
    const item = MODULES_DATA[i];
    const data = item.getter();
    console.log(`[${i + 1}/10] Menghasilkan ${item.file}.pdf...`);

    const htmlContent = wrapHtmlDocument(data);
    const htmlPath = path.join(OUTPUT_SRC_DIR, `${item.file}.html`);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    const pdfPath = path.join(OUTPUT_PDF_DIR, `${item.file}.pdf`);
    await renderHtmlToPdf(browser, htmlContent, pdfPath, data.title);

    const stats = fs.statSync(pdfPath);
    console.log(`      -> Selesai! Ukuran: ${(stats.size / 1024).toFixed(1)} KB`);
    generatedFiles.push({ name: `${item.file}.pdf`, size: stats.size, title: data.title });
  }

  // 2. Render Buku Induk Lengkap Gabungan (Master Manual Book)
  console.log('\n[11/11] Menghasilkan MANUAL_BOOK_LENGKAP_PALORA.pdf (Buku Panduan Induk)...');
  
  let combinedContentHtml = `
    <!-- DAFTAR ISI INDUK -->
    <div style="page-break-after: always; padding-top: 15px;">
      <h1 style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px;">Daftar Isi Buku Panduan Lengkap PALORA</h1>
      <p style="font-size: 10.5pt; color: #475569; margin-bottom: 25px;">
        Buku Panduan Operasional Terintegrasi PT Paletindo Prakarsa Unggul mencakup 10 modul operasional dari hulu ke hilir:
      </p>

      <table class="data-table" style="font-size: 10pt;">
        <thead>
          <tr>
            <th style="width: 15%;">Kode Modul</th>
            <th style="width: 55%;">Judul Modul Panduan</th>
            <th style="width: 30%;">Target Peran</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const item of MODULES_DATA) {
    const d = item.getter();
    const rolesStr = d.roleList.join(', ');
    combinedContentHtml += `
      <tr>
        <td><strong>${d.docCode}</strong></td>
        <td><strong>${d.title}</strong><br><small style="color: #64748b;">${d.moduleName}</small></td>
        <td><span style="font-size: 8.5pt;">${rolesStr}</span></td>
      </tr>
    `;
  }

  combinedContentHtml += `
        </tbody>
      </table>

      <div class="callout callout-info" style="margin-top: 30px;">
        <div class="callout-title">Pedoman Penggunaan Dokumen Induk</div>
        Dokumen ini menyatukan seluruh panduan operasional per modul ke dalam satu buku referensi komprehensif. Masing-masing bab disusun dengan struktur mandiri, mencakup penjelasan alur kerja, tabel aturan validasi server, petunjuk visual layar, dan panduan mitigasi kendala operasional harian.
      </div>
    </div>
  `;

  // Gabungkan seluruh isi konten dari ke-10 modul dengan pembatas halaman
  for (let i = 0; i < MODULES_DATA.length; i++) {
    const item = MODULES_DATA[i];
    const data = item.getter();

    combinedContentHtml += `
      <div style="page-break-before: always; border-top: 4px solid #1e3a8a; padding-top: 20px; margin-top: 20px;">
        <div style="font-size: 9pt; text-transform: uppercase; color: #0284c7; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px;">
          BAGIAN ${i}: ${data.docCode}
        </div>
        <h1 style="font-size: 20pt; margin-top: 0; margin-bottom: 12px; color: #1e3a8a;">${data.title}</h1>
        <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 9.5pt; color: #334155;">
          <strong>Target Pengguna:</strong> ${data.roleList.join(', ')} &bull; 
          <strong>Modul:</strong> ${data.moduleName}
        </div>
        ${data.contentHtml}
      </div>
    `;
  }

  const masterData = {
    docCode: 'MB-MASTER/PLR/2026',
    title: 'Buku Panduan Operasional Lengkap PALORA',
    moduleName: 'Seluruh Modul Terpadu (Full System ERP Suite)',
    roleList: ['Owner', 'Gudang', 'Finance'],
    version: '2.0',
    summary: 'Buku panduan induk komprehensif yang memuat seluruh modul operasional sistem PALORA untuk PT Paletindo Prakarsa Unggul, mulai dari pengadaan pabrik, manajemen stok 451+ produk, penjualan B2B, kasir walk-in, pengiriman surat jalan, keuangan piutang/hutang, arsip digital, hingga administrasi sistem.',
    contentHtml: combinedContentHtml,
  };

  const masterHtml = wrapHtmlDocument(masterData);
  const masterHtmlPath = path.join(OUTPUT_SRC_DIR, 'MANUAL_BOOK_LENGKAP_PALORA.html');
  fs.writeFileSync(masterHtmlPath, masterHtml, 'utf8');

  const masterPdfPath = path.join(OUTPUT_PDF_DIR, 'MANUAL_BOOK_LENGKAP_PALORA.pdf');
  await renderHtmlToPdf(browser, masterHtml, masterPdfPath, 'Buku Panduan Operasional Lengkap PALORA');

  const masterStats = fs.statSync(masterPdfPath);
  console.log(`      -> Selesai! Ukuran: ${(masterStats.size / (1024 * 1024)).toFixed(2)} MB`);
  generatedFiles.push({ name: 'MANUAL_BOOK_LENGKAP_PALORA.pdf', size: masterStats.size, title: masterData.title });

  await browser.close();

  console.log('\n=== REKAPITULASI MANUAL BOOK TELAH DIBUAT ===');
  console.table(generatedFiles.map((f) => ({
    'File PDF': f.name,
    'Ukuran (KB)': (f.size / 1024).toFixed(1),
    'Judul Dokumen': f.title,
  })));
  console.log(`\nSemua file PDF tersimpan di: ${OUTPUT_PDF_DIR}`);
  console.log(`Semua file HTML sumber tersimpan di: ${OUTPUT_SRC_DIR}`);
}

main().catch((err) => {
  console.error('Kompilasi gagal:', err);
  process.exit(1);
});
