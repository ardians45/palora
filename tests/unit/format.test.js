import { describe, expect, it } from 'vitest';
import { date, dateUpper, dueDateFromTerms, num, numOrDash, parseNum, rp, terbilang, waNumber } from '../../src/lib/format.js';
import { mapRows, parseReport } from '../../src/lib/importers.js';

describe('format angka & uang', () => {
  it('format Indonesia, nol jadi "-" seperti Excel', () => {
    expect(num(2871000)).toBe('2.871.000');
    expect(rp(2871000)).toBe('Rp 2.871.000');
    expect(rp(-50000)).toBe('-Rp 50.000');
    expect(numOrDash(0)).toBe('-');
    expect(numOrDash(1604)).toBe('1.604');
  });

  it('membaca angka yang diketik dengan atau tanpa titik', () => {
    expect(parseNum('1.250.000')).toBe(1250000);
    expect(parseNum('1250000')).toBe(1250000);
    expect(parseNum('Rp 31.900')).toBe(31900);
    expect(parseNum('')).toBeNaN();
  });
});

describe('tanggal', () => {
  it('format tampilan & surat jalan', () => {
    expect(date('2026-10-05')).toBe('05 Okt 2026');
    expect(dateUpper('2026-05-23')).toBe('23 MEI 2026');
  });

  it('jatuh tempo dari syarat bayar', () => {
    expect(dueDateFromTerms('Tempo 30 Hari', '2026-10-05')).toBe('2026-11-04');
    expect(dueDateFromTerms('Tempo 7 hari', '2026-12-28')).toBe('2027-01-04');
    expect(dueDateFromTerms('Transfer', '2026-10-05')).toBe('2026-10-19');
  });
});

describe('terbilang (nota/invoice)', () => {
  it.each([
    [0, 'Nol Rupiah'],
    [11, 'Sebelas Rupiah'],
    [1000, 'Seribu Rupiah'],
    [1500, 'Seribu Lima Ratus Rupiah'],
    [2871000, 'Dua Juta Delapan Ratus Tujuh Puluh Satu Ribu Rupiah'],
    [5819100, 'Lima Juta Delapan Ratus Sembilan Belas Ribu Seratus Rupiah'],
    [1000000000, 'Satu Miliar Rupiah'],
  ])('%i -> %s', (n, text) => {
    expect(terbilang(n)).toBe(text);
  });
});

describe('nomor WhatsApp', () => {
  it('ambil nomor HP dari isian campuran, abaikan nomor kantor', () => {
    expect(waNumber('0812-3456-7890')).toBe('6281234567890');
    expect(waNumber('021-5698-XXXX / 0812-9988-7766')).toBe('6281299887766');
    expect(waNumber('021-5590-1234')).toBeNull();
    expect(waNumber('')).toBeNull();
  });
});

describe('import Excel master barang', () => {
  it('kenali judul kolom ala Excel Paletindo, abaikan baris tanpa kode', () => {
    const { rows, columns } = mapRows([
      { Kode: 'PLT-0001', 'Nama Barang ': 'Palet Merah', Qty: 0, 'Harga Jual': 31900, Keterangan: 'biru 5, merah 6' },
      { Kode: '', 'Nama Barang ': 'baris kosong' },
      { Kode: 77123, 'Nama Barang ': 'Kode angka', Qty: '', 'Harga Jual': '' },
    ]);
    expect(columns).toMatchObject({ code: 'Kode', name: 'Nama Barang ', stock: 'Qty', sell_price: 'Harga Jual', notes: 'Keterangan' });
    expect(rows).toEqual([
      { code: 'PLT-0001', name: 'Palet Merah', stock: 0, sell_price: 31900, notes: 'biru 5, merah 6' },
      { code: 77123, name: 'Kode angka' }, // kolom kosong tidak dikirim -> data lama tidak tertimpa
    ]);
  });
});

describe('laporan marketplace', () => {
  it('format Shopee: baris batal dilewati, tanggal & harga terbaca', () => {
    const res = parseReport([
      { 'No. Pesanan': '2410A', 'Waktu Pesanan Dibuat': '2026-10-04 10:00', 'Nomor Referensi SKU': 'SKU-1', 'Nama Produk': 'Palet', Jumlah: 2, 'Harga Setelah Diskon': 'Rp35.000', 'Status Pesanan': 'Selesai' },
      { 'No. Pesanan': '2410B', 'Waktu Pesanan Dibuat': '2026-10-04 11:00', 'Nomor Referensi SKU': 'SKU-1', 'Nama Produk': 'Palet', Jumlah: 1, 'Harga Setelah Diskon': 35000, 'Status Pesanan': 'Batal' },
    ]);
    expect(res.skipped).toBe(1);
    expect(res.rows).toEqual([{ order_no: '2410A', date: '2026-10-04', sku: 'SKU-1', name: 'Palet', qty: 2, price: 35000 }]);
  });

  it('format Tokopedia/TikTok berbahasa Inggris & tanggal dd/mm/yyyy', () => {
    const res = parseReport([{ 'Order ID': 'TT1', 'Created Time': '04/10/2026 09:00', 'Seller SKU': 'PLT-0004', 'Product Name': 'Palet', Quantity: 3, 'Unit Price': 30000, 'Order Status': 'Completed' }]);
    expect(res.rows[0]).toMatchObject({ order_no: 'TT1', date: '2026-10-04', sku: 'PLT-0004', qty: 3 });
  });

  it('laporan yang salah (tanpa kolom pesanan/qty) ditolak dengan nama kolom', () => {
    expect(parseReport([{ Tanggal: 'x', Total: 1 }]).missing).toEqual(['order_no', 'qty', 'sku']);
  });
});
