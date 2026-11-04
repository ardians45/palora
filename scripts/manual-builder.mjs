// Generator PDF Manual Book PALORA menggunakan Playwright & Headless Microsoft Edge
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

export const SCREENSHOTS_DIR = path.resolve('manual_book/assets/screenshots');
export const OUTPUT_PDF_DIR = path.resolve('manual_book/pdf');
export const OUTPUT_SRC_DIR = path.resolve('manual_book/src');

export function getImgBase64(filename) {
  const p = path.join(SCREENSHOTS_DIR, filename);
  if (!fs.existsSync(p)) {
    console.warn(`[WARN] File gambar tidak ditemukan: ${p}`);
    return '';
  }
  const buf = fs.readFileSync(p);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

export const SHARED_CSS = `
  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
  }
  
  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
    background: #ffffff;
  }

  .cover-page {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 250mm;
    padding: 30mm 10mm 10mm 10mm;
    border-left: 8px solid #1e3a8a;
  }

  .cover-header {
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 15px;
    margin-bottom: 40px;
  }

  .cover-brand {
    font-size: 26pt;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #1e3a8a;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cover-subbrand {
    font-size: 11pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-top: 4px;
    font-weight: 600;
  }

  .cover-title-group {
    margin-top: 40px;
  }

  .cover-badge {
    display: inline-block;
    background: #dbeafe;
    color: #1e40af;
    font-size: 9.5pt;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 15px;
  }

  .cover-title {
    font-size: 25pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.25;
    margin: 0 0 15px 0;
  }

  .cover-subtitle {
    font-size: 13pt;
    color: #475569;
    line-height: 1.5;
    margin: 0;
  }

  .cover-meta {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 20px;
    margin-top: 50px;
  }

  .cover-meta-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }

  .cover-meta-table td {
    padding: 6px 0;
    vertical-align: top;
  }

  .cover-meta-table td.label {
    width: 32%;
    color: #64748b;
    font-weight: 600;
  }

  .cover-meta-table td.val {
    color: #0f172a;
    font-weight: 600;
  }

  .cover-footer {
    font-size: 8.5pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 15px;
  }

  /* Headings */
  h1, h2, h3, h4 {
    color: #0f172a;
    font-weight: 700;
    page-break-after: avoid;
    break-after: avoid;
  }

  h1 {
    font-size: 18pt;
    border-bottom: 2px solid #1e3a8a;
    padding-bottom: 8px;
    margin-top: 25px;
    margin-bottom: 16px;
    color: #1e3a8a;
  }

  h2 {
    font-size: 14pt;
    margin-top: 22px;
    margin-bottom: 12px;
    padding-left: 8px;
    border-left: 4px solid #0284c7;
  }

  h3 {
    font-size: 12pt;
    margin-top: 16px;
    margin-bottom: 8px;
  }

  p {
    margin: 0 0 12px 0;
    text-align: justify;
  }

  ul, ol {
    margin: 0 0 14px 0;
    padding-left: 24px;
  }

  li {
    margin-bottom: 6px;
  }

  /* Callout Boxes */
  .callout {
    padding: 12px 16px;
    border-radius: 6px;
    margin: 16px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .callout-info {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e40af;
  }

  .callout-warning {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }

  .callout-success {
    background: #f0fdf4;
    border-left: 4px solid #10b981;
    color: #065f46;
  }

  .callout-danger {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
    color: #991b1b;
  }

  .callout-title {
    font-weight: 700;
    margin-bottom: 4px;
    text-transform: uppercase;
    font-size: 8.5pt;
    letter-spacing: 0.5px;
  }

  /* Tables */
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 20px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  table.data-table th, table.data-table td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
  }

  table.data-table th {
    background: #f1f5f9;
    color: #1e293b;
    font-weight: 700;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  table.data-table tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Screenshots */
  .screenshot-container {
    margin: 18px 0 24px 0;
    page-break-inside: avoid;
    break-inside: avoid;
    text-align: center;
  }

  .screenshot-frame {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
    background: #f8fafc;
  }

  .screenshot-frame img {
    width: 100%;
    max-height: 125mm;
    object-fit: contain;
    display: block;
  }

  .screenshot-caption {
    font-size: 8.5pt;
    color: #64748b;
    margin-top: 6px;
    font-style: italic;
    font-weight: 500;
  }

  /* Role Badges */
  .badge-role {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 700;
    margin-right: 6px;
  }

  .badge-owner {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .badge-gudang {
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #bae6fd;
  }

  .badge-finance {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .badge-all {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #e2e8f0;
  }

  /* Workflow Steps */
  .step-flow {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 16px 0;
  }

  .step-item {
    display: flex;
    gap: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .step-num {
    background: #1e3a8a;
    color: #ffffff;
    font-weight: 800;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10pt;
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
  }

  .step-title {
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
    font-size: 10.5pt;
  }

  .step-desc {
    font-size: 9.5pt;
    color: #334155;
    margin: 0;
  }

  /* Page Break Utilities */
  .page-break {
    page-break-before: always;
    break-before: always;
  }
`;

export function wrapHtmlDocument({ title, docCode, version, moduleName, roleList, summary, contentHtml }) {
  const rolesHtml = roleList.map((r) => {
    if (r.toLowerCase().includes('owner')) return `<span class="badge-role badge-owner">Owner (Pak Yanto)</span>`;
    if (r.toLowerCase().includes('gudang')) return `<span class="badge-role badge-gudang">Gudang (Mas Heri)</span>`;
    if (r.toLowerCase().includes('keuangan') || r.toLowerCase().includes('finance')) return `<span class="badge-role badge-finance">Keuangan (Bude)</span>`;
    return `<span class="badge-role badge-all">${r}</span>`;
  }).join(' ');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title} - Manual Book PALORA</title>
  <style>
    ${SHARED_CSS}
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="cover-brand">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        PALORA
      </div>
      <div class="cover-subbrand">PT Paletindo Prakarsa Unggul &bull; Sistem Internal Gudang & Operasional</div>
    </div>

    <div class="cover-title-group">
      <div class="cover-badge">${docCode} &bull; BUKU PANDUAN PENGGUNA</div>
      <h1 class="cover-title">${title}</h1>
      <p class="cover-subtitle">${summary}</p>
    </div>

    <div class="cover-meta">
      <table class="cover-meta-table">
        <tr>
          <td class="label">Nama Modul</td>
          <td class="val">${moduleName}</td>
        </tr>
        <tr>
          <td class="label">Target Pengguna</td>
          <td class="val">${rolesHtml}</td>
        </tr>
        <tr>
          <td class="label">Versi Sistem</td>
          <td class="val">PALORA v2.0 (Production Release)</td>
        </tr>
        <tr>
          <td class="label">Versi Dokumen</td>
          <td class="val">${version} &bull; November 2026</td>
        </tr>
        <tr>
          <td class="label">Klasifikasi</td>
          <td class="val">Dokumen Operasional Internal Perusahaan</td>
        </tr>
      </table>
    </div>

    <div class="cover-footer">
      &copy; 2026 PT Paletindo Prakarsa Unggul. Seluruh hak cipta dilindungi undang-undang.
    </div>
  </div>

  <!-- CONTENT -->
  <div class="doc-body">
    ${contentHtml}
  </div>

</body>
</html>`;
}

export async function renderHtmlToPdf(browser, htmlContent, outputPdfPath, title) {
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  await page.pdf({
    path: outputPdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm',
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 7.5pt; font-family: -apple-system, sans-serif; color: #94a3b8; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
        <span><strong>PALORA ERP</strong> &bull; PT Paletindo Prakarsa Unggul</span>
        <span>${title}</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 7.5pt; font-family: -apple-system, sans-serif; color: #94a3b8; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 4px;">
        <span>Internal Operational Guide &bull; Rahasia Perusahaan</span>
        <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
      </div>
    `,
  });

  await page.close();
}
