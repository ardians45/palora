// Pembaca file Excel/CSV: laporan marketplace & master barang. Fungsi murni (dites di tests/importers.test.js).
import * as XLSX from 'xlsx';
import { today } from './format';

// ---------------------------------------------------------------------------
// Master barang
// ---------------------------------------------------------------------------
// nama kolom yang dikenali -> field
const ALIASES = {
  code: ['kode', 'kode barang', 'code', 'sku'],
  name: ['nama barang', 'nama', 'nama produk', 'name'],
  group_name: ['kelompok', 'group', 'merek', 'kategori'],
  color: ['warna', 'color'],
  size: ['ukuran', 'size'],
  unit: ['satuan', 'unit'],
  stock: ['qty', 'stok', 'stock', 'stok fisik gudang'],
  sell_price: ['harga jual', 'harga jual pricelist', 'harga'],
  buy_price: ['harga modal', 'modal', 'modal baru', 'harga modal beli'],
  min_stock: ['stok minimum', 'min stok', 'minimum'],
  notes: ['keterangan', 'catatan', 'notes'],
};

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export function mapRows(sheetRows) {
  if (sheetRows.length === 0) return { rows: [], columns: {} };
  const headers = Object.keys(sheetRows[0]);
  const columns = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    const h = headers.find((x) => names.includes(norm(x)));
    if (h) columns[field] = h;
  }
  const rows = sheetRows
    .map((r) => {
      const o = {};
      for (const [field, h] of Object.entries(columns)) {
        const v = r[h];
        if (v !== undefined && v !== null && String(v).trim() !== '') o[field] = typeof v === 'string' ? v.trim() : v;
      }
      return o;
    })
    .filter((o) => o.code !== undefined);
  return { rows, columns };
}


// ---------------------------------------------------------------------------
// Laporan pesanan marketplace
// ---------------------------------------------------------------------------
const COLS = {
  order_no: ['no. pesanan', 'no pesanan', 'nomor pesanan', 'order id', 'order no', 'nomor invoice', 'no. invoice', 'invoice', 'order number'],
  date: ['waktu pesanan dibuat', 'tanggal pesanan', 'tanggal', 'created time', 'create time', 'order date', 'waktu pembayaran dilakukan', 'payment date'],
  sku: ['nomor referensi sku', 'sku induk', 'seller sku', 'sku', 'kode sku', 'sku penjual', 'sellersku'],
  name: ['nama produk', 'product name', 'nama barang', 'item name'],
  qty: ['jumlah', 'quantity', 'qty', 'jumlah produk', 'kuantitas'],
  price: ['harga setelah diskon', 'harga satuan', 'harga awal', 'unit price', 'harga', 'item price', 'harga jual'],
  status: ['status pesanan', 'order status', 'status'],
};
const CANCELLED = /(batal|cancel|dibatalkan|gagal|return|pengembalian)/i;


function toIsoDate(v) {
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(v || '');
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return today();
}

/**
 * Angka uang dari laporan marketplace: "Rp 125.000", "125000.00", "125,000.50", "125.000,50".
 * Pemisah terakhir yang diikuti 1-2 digit di akhir = desimal; selain itu pemisah ribuan.
 */
export function parseMoney(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  const decimal = last !== -1 && /^\d{1,2}$/.test(s.slice(last + 1));
  const intPart = decimal ? s.slice(0, last) : s;
  const n = Number(intPart.replace(/[.,]/g, '') + (decimal ? `.${s.slice(last + 1)}` : ''));
  return Number.isFinite(n) ? n : 0;
}

/** Baca baris laporan marketplace menjadi { order_no, date, sku, name, qty, price }. Diekspor untuk test. */
export function parseReport(sheetRows) {
  if (sheetRows.length === 0) return { rows: [], skipped: 0, missing: Object.keys(COLS) };
  const headers = Object.keys(sheetRows[0]);
  const col = {};
  for (const [k, names] of Object.entries(COLS)) {
    col[k] = names.map((n) => headers.find((h) => norm(h) === n)).find(Boolean);
  }
  const missing = ['order_no', 'qty'].filter((k) => !col[k]);
  if (!col.sku && !col.name) missing.push('sku');
  if (missing.length) return { rows: [], skipped: 0, missing };
  let skipped = 0;
  const rows = [];
  for (const r of sheetRows) {
    const orderNo = String(r[col.order_no] ?? '').trim();
    if (!orderNo) continue;
    if (col.status && CANCELLED.test(String(r[col.status] || ''))) {
      skipped++;
      continue;
    }
    const qty = Number(String(r[col.qty]).replace(/[^\d.-]/g, '')) || 0;
    if (qty <= 0) continue;
    const priceRaw = col.price ? r[col.price] : 0;
    const price = parseMoney(priceRaw);
    rows.push({
      order_no: orderNo,
      date: col.date ? toIsoDate(r[col.date]) : today(),
      sku: String(col.sku ? r[col.sku] ?? '' : '').trim() || String(r[col.name] || '').trim(),
      name: String(col.name ? r[col.name] ?? '' : '').trim(),
      qty,
      price,
    });
  }
  return { rows, skipped, missing: [] };
}

