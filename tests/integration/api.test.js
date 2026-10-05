// Test integrasi semua aturan bisnis & endpoint PALORA v2 terhadap PocketBase asli.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer, errorOf, post, today, product, line, USER_PASSWORD } from './helpers.js';

let S;
beforeAll(async () => {
  S = await startTestServer();
}, 90000);
afterAll(() => S?.stop());

/** Barang baru khusus satu test, supaya stok tidak saling ganggu. */
async function freshProduct(code, stock, extra = {}) {
  return S.gudang.collection('products').create({
    code,
    name: `Barang Test ${code}`,
    unit: 'pcs',
    stock,
    buy_price: 10000,
    sell_price: 15000,
    ...extra,
  });
}

const stockOf = async (code) => (await product(S.owner, code)).stock;
const movementsOf = (code) =>
  S.owner.collection('stock_movements').getFullList({ filter: `product_code = "${code}"`, sort: 'created' });

// ---------------------------------------------------------------------------
describe('Seed & pengaturan', () => {
  it('produk asli masuk dengan stok awal tercatat sebagai mutasi', async () => {
    expect(await stockOf('PLT-0002')).toBe(1604);
    const mv = await movementsOf('PLT-0002');
    expect(mv[0]).toMatchObject({ type: 'ADJUSTMENT', qty: 1604, before_stock: 0, after_stock: 1604, ref_no: 'STOK-AWAL' });
  });

  it('pengaturan perusahaan berisi PT Paletindo Prakarsa Unggul & kode PPU', async () => {
    const s = await S.gudang.collection('settings').getFirstListItem('');
    expect(s.company_name).toBe('PT Paletindo Prakarsa Unggul');
    expect(s.doc_code).toBe('PPU');
  });

  it('hanya Owner yang bisa mengubah pengaturan', async () => {
    const s = await S.owner.collection('settings').getFirstListItem('');
    await errorOf(S.gudang.collection('settings').update(s.id, { signer_name: 'X' }));
    const upd = await S.owner.collection('settings').update(s.id, { signer_name: 'Suryanto' });
    expect(upd.signer_name).toBe('Suryanto');
  });
});

// ---------------------------------------------------------------------------
describe('Master barang', () => {
  it('stok tidak bisa diubah lewat edit biasa', async () => {
    const p = await freshProduct('T-EDIT', 5);
    await errorOf(S.gudang.collection('products').update(p.id, { stock: 999 }));
    const upd = await S.gudang.collection('products').update(p.id, { sell_price: 20000, size: '60*40*35,5' });
    expect(upd).toMatchObject({ sell_price: 20000, size: '60*40*35,5', stock: 5 });
  });

  it('Keuangan tidak boleh menambah barang', async () => {
    await errorOf(S.finance.collection('products').create({ code: 'T-FIN', name: 'X', stock: 0 }));
  });

  it('koreksi stok wajib alasan dan tercatat', async () => {
    const p = await freshProduct('T-ADJ', 10);
    await errorOf(post(S.gudang, '/api/palora/stock/adjust', { product_id: p.id, new_stock: 7 }));
    await post(S.gudang, '/api/palora/stock/adjust', { product_id: p.id, new_stock: 7, reason: 'Pecah 3' });
    expect(await stockOf('T-ADJ')).toBe(7);
    const mv = await movementsOf('T-ADJ');
    expect(mv.at(-1)).toMatchObject({ type: 'ADJUSTMENT', qty: -3, reason: 'Pecah 3', operator: 'Mas Heri (Admin Gudang & Kasir)' });
  });

  it('import Excel: update barang lama, tambah barang baru, stok kosong tidak menjadi 0', async () => {
    await freshProduct('T-IMP', 40);
    const res = await post(S.gudang, '/api/palora/products/import', {
      rows: [
        { code: 'T-IMP', sell_price: 99000 }, // tanpa kolom stok
        { code: 77123, name: 'Barang Kode Angka', stock: 12, group_name: 'Rabbit' }, // kode berupa angka dari Excel
      ],
    });
    expect(res).toEqual({ created: 1, updated: 1 });
    const imp = await product(S.owner, 'T-IMP');
    expect(imp).toMatchObject({ stock: 40, sell_price: 99000 });
    expect(await stockOf('77123')).toBe(12);
    // import ulang kode angka tidak membuat duplikat
    const again = await post(S.gudang, '/api/palora/products/import', { rows: [{ code: 77123, stock: 15 }] });
    expect(again).toEqual({ created: 0, updated: 1 });
    expect(await stockOf('77123')).toBe(15);
  });

  it('import gagal di baris tengah = tidak ada yang tersimpan', async () => {
    const err = await errorOf(
      post(S.gudang, '/api/palora/products/import', {
        rows: [
          { code: 'T-ROLL-1', name: 'Satu', stock: 5 },
          { code: '', name: 'Kode kosong' },
        ],
      })
    );
    expect(err.message).toMatch(/Baris 3: Kode barang kosong/);
    const found = await S.owner.collection('products').getList(1, 1, { filter: 'code = "T-ROLL-1"' });
    expect(found.totalItems).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('PO & terima barang', () => {
  let po;
  it('PO dibuat dengan nomor otomatis lanjutan PO 37 dan total dihitung server', async () => {
    const p = await freshProduct('T-PO1', 0);
    po = await S.gudang.collection('purchase_orders').create({
      date: '2026-10-05',
      supplier: 'PT LINHUI',
      items: [
        { productCode: 'T-PO1', name: p.name, size: '60*40*35,5', color: 'merah', qty: 10, price: 100000, total: 1 },
        { productCode: 'T-PO1', name: p.name, size: '60*40*35,5', color: 'merah', qty: 5, price: 93000 },
      ],
    });
    expect(po.po_no).toMatch(/^PO-0\d\d\/PPU\/2026$/);
    expect(po.total_amount).toBe(1465000); // bukan "1" dari input
    expect(po.state).toBe('draft');
  });

  it('nomor PO berurutan & unik walau dibuat bersamaan', async () => {
    const make = () =>
      S.gudang.collection('purchase_orders').create({ supplier: 'GBU', items: [{ productCode: 'T-PO1', name: 'x', qty: 1, price: 1 }] });
    const list = await Promise.all(Array.from({ length: 8 }, make));
    const nos = new Set(list.map((x) => x.po_no));
    expect(nos.size).toBe(8);
  });

  it('PO tidak bisa dibuat tanpa barang / qty 0', async () => {
    await errorOf(S.gudang.collection('purchase_orders').create({ supplier: 'GBU', items: [] }));
    const err = await errorOf(
      S.gudang.collection('purchase_orders').create({ supplier: 'GBU', items: [{ productCode: 'X', name: 'Ember', qty: 0, price: 1 }] })
    );
    expect(err.message).toMatch(/Qty Ember harus lebih dari 0/);
  });

  it('terima bertahap: 60 lalu sisanya, stok bertambah, rusak tidak masuk stok', async () => {
    await post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'dikirim' });
    const r1 = await post(S.gudang, '/api/palora/po/receive', {
      po_id: po.id, sj_no: 'SJ-A', date: today(), lines: [{ index: 0, good: 6, bad: 1 }],
    });
    expect(r1.state).toBe('sebagian');
    expect(await stockOf('T-PO1')).toBe(6);

    // SJ yang sama tidak boleh dipakai dua kali
    await errorOf(post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'sj-a', lines: [{ index: 0, good: 1 }] }));
    // tidak boleh melebihi sisa
    const over = await errorOf(post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'SJ-B', lines: [{ index: 0, good: 5 }] }));
    expect(over.message).toMatch(/melebihi sisa PO 4/);

    const r2 = await post(S.gudang, '/api/palora/po/receive', {
      po_id: po.id, sj_no: 'SJ-B', lines: [{ index: 0, good: 4 }, { index: 1, good: 5 }],
    });
    expect(r2.state).toBe('selesai');
    expect(r2.receipts).toHaveLength(2);
    expect(await stockOf('T-PO1')).toBe(15);
  });

  it('foto surat jalan supplier tersimpan di arsip PO', async () => {
    const p = await freshProduct('T-PO2', 0);
    const po2 = await S.gudang.collection('purchase_orders').create({
      supplier: 'GBU', items: [{ productCode: p.code, name: p.name, qty: 3, price: 5000 }],
    });
    const fd = new FormData();
    fd.append('po_id', po2.id);
    fd.append('sj_no', 'GBU-77');
    fd.append('lines', JSON.stringify([{ index: 0, good: 3 }]));
    const pdf = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n';
    fd.append('photo', new Blob([pdf], { type: 'application/pdf' }), 'sj.pdf');
    const res = await S.gudang.send('/api/palora/po/receive', { method: 'POST', body: fd });
    const doc = await S.owner.collection('documents').getOne(res.receipts[0].docId);
    expect(doc).toMatchObject({ ref_no: po2.po_no, category: 'Surat Jalan' });
    expect(doc.file).toMatch(/\.pdf$/);
  });

  it('PO yang sudah ada penerimaan tidak bisa dibatalkan', async () => {
    const err = await errorOf(post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'batal', reason: 'x' }));
    expect(err.message).toMatch(/tidak bisa diubah/);
  });

  it('Keuangan tidak bisa menerima barang', async () => {
    await errorOf(post(S.finance, '/api/palora/po/receive', { po_id: po.id, sj_no: 'Z', lines: [] }));
  });
});

// ---------------------------------------------------------------------------
describe('Pesanan customer', () => {
  let p;
  let order;
  beforeAll(async () => {
    p = await freshProduct('T-SO1', 100, { sell_price: 40000 });
  });

  it('dibuat dengan nomor INV/PPU, total dihitung server, status baru', async () => {
    order = await S.gudang.collection('sales_orders').create({
      date: '2026-10-05',
      customer: 'Toko Test',
      payment_type: 'Tempo 14 Hari',
      items: [{ ...line(p, 10), price: 38000 }], // harga dinego
    });
    expect(order.order_no).toMatch(/^INV\/PPU\/202610\/\d{4}$/);
    expect(order).toMatchObject({ total_amount: 380000, remaining_amount: 380000, status: 'baru', channel: 'pesanan' });
    expect(order.due_date).toBe('2026-10-19'); // Tempo 14 Hari
    const t30 = await S.gudang.collection('sales_orders').create({ date: '2026-10-05', customer: 'X', payment_type: 'Tempo 30 Hari', items: [line(p, 1)] });
    expect(t30.due_date).toBe('2026-11-04');
  });

  it('status & nilai uang tidak bisa diubah langsung', async () => {
    await errorOf(S.gudang.collection('sales_orders').update(order.id, { status: 'lunas' }));
    await errorOf(S.gudang.collection('sales_orders').update(order.id, { paid_amount: 380000 }));
    await errorOf(S.gudang.collection('sales_orders').update(order.id, { total_amount: 1 }));
  });

  it('barang belum boleh keluar sebelum DP/lunas', async () => {
    const err = await errorOf(post(S.gudang, '/api/palora/orders/dispatch', { order_id: order.id, mode: 'kirim' }));
    expect(err.message).toMatch(/belum lunas \(sisa Rp 380\.000\)/);
  });

  it('DP di bawah 25% tetap status baru, DP 25% jadi status dp', async () => {
    let r = await post(S.gudang, '/api/palora/payment', { kind: 'customer', order_id: order.id, amount: 50000 });
    expect(r.order.status).toBe('baru');
    r = await post(S.gudang, '/api/palora/payment', { kind: 'customer', order_id: order.id, amount: 45000, method: 'Transfer BCA' });
    expect(r.order).toMatchObject({ status: 'dp', paid_amount: 95000, remaining_amount: 285000 });
  });

  it('pembayaran tidak boleh melebihi sisa', async () => {
    const err = await errorOf(post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: order.id, amount: 300000 }));
    expect(err.message).toMatch(/melebihi sisa tagihan Rp 285\.000/);
  });

  it('ubah barang sebelum lunas menghitung ulang total & sisa', async () => {
    const upd = await S.gudang.collection('sales_orders').update(order.id, { items: [{ ...line(p, 12), price: 38000 }] });
    // DP 95.000 < 25% dari total baru -> kembali butuh DP
    expect(upd).toMatchObject({ total_amount: 456000, remaining_amount: 361000, status: 'baru' });
  });

  it('Owner izinkan kirim sebelum lunas, gudang tidak bisa', async () => {
    await errorOf(post(S.gudang, '/api/palora/orders/release', { order_id: order.id }));
    const r = await post(S.owner, '/api/palora/orders/release', { order_id: order.id });
    expect(r.release_approved).toBe(true);
  });

  it('kirim: surat jalan bernomor xxxx/DO/PPU/{romawi}/{tahun}, stok terpotong', async () => {
    const before = await stockOf('T-SO1');
    const r = await post(S.gudang, '/api/palora/orders/dispatch', {
      order_id: order.id, mode: 'kirim', date: '2026-10-05', driver_name: 'Pak Suryanto', vehicle_plate: 'B 9482 PPU',
    });
    expect(r.delivery.sj_no).toMatch(/^\d{4}\/DO\/PPU\/X\/2026$/);
    expect(r.order.status).toBe('dikirim');
    expect(await stockOf('T-SO1')).toBe(before - 12);
    // tidak bisa dikeluarkan dua kali
    await errorOf(post(S.gudang, '/api/palora/orders/dispatch', { order_id: order.id, mode: 'kirim' }));
  });

  it('nomor surat jalan pertama melanjutkan 0062 dari kertas', async () => {
    const all = await S.owner.collection('deliveries').getFullList({ sort: 'created' });
    expect(all[0].sj_no.startsWith('0063/')).toBe(true);
  });

  it('setelah barang keluar, piutang hanya dicatat Owner/Keuangan', async () => {
    await errorOf(post(S.gudang, '/api/palora/payment', { kind: 'customer', order_id: order.id, amount: 1000 }));
    const r = await post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: order.id, amount: 361000 });
    expect(r.order).toMatchObject({ remaining_amount: 0, status: 'dikirim' });
  });

  it('konfirmasi diterima + lunas = selesai', async () => {
    const d = await S.owner.collection('deliveries').getFirstListItem(`order_id = "${order.id}"`);
    await errorOf(post(S.gudang, '/api/palora/deliveries/received', { delivery_id: d.id }));
    await post(S.gudang, '/api/palora/deliveries/received', { delivery_id: d.id, received_by: 'Pak Budi' });
    const o = await S.owner.collection('sales_orders').getOne(order.id);
    expect(o.status).toBe('selesai');
  });

  it('riwayat pembayaran tercatat lengkap', async () => {
    const pays = await S.owner.collection('payments').getFullList({ filter: `order_id = "${order.id}"`, sort: 'created' });
    expect(pays.map((x) => x.amount)).toEqual([50000, 45000, 361000]);
    expect(pays[1]).toMatchObject({ method: 'Transfer BCA', recorded_by: 'Mas Heri (Admin Gudang & Kasir)' });
  });

  it('ambil sendiri: lunas -> stok terpotong -> langsung selesai, tanpa surat jalan', async () => {
    const o = await S.gudang.collection('sales_orders').create({ customer: 'Ambil Sendiri', items: [line(p, 3)] });
    await post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: o.id, amount: o.total_amount });
    const before = await stockOf('T-SO1');
    const r = await post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'ambil' });
    expect(r).toMatchObject({ delivery: null, order: { status: 'selesai' } });
    expect(await stockOf('T-SO1')).toBe(before - 3);
  });

  it('stok kurang saat kirim = gagal total, tidak ada yang berubah', async () => {
    const low = await freshProduct('T-LOW', 2);
    const o = await S.gudang.collection('sales_orders').create({ customer: 'X', items: [line(p, 1), line(low, 5)] });
    await post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: o.id, amount: o.total_amount });
    const before = await stockOf('T-SO1');
    const err = await errorOf(post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'kirim' }));
    expect(err.message).toMatch(/tidak cukup: tersedia 2 pcs, dibutuhkan 5/);
    expect(await stockOf('T-SO1')).toBe(before); // baris pertama ikut dibatalkan
    expect((await S.owner.collection('sales_orders').getOne(o.id)).status).toBe('lunas');
    const sj = await S.owner.collection('deliveries').getList(1, 1, { filter: `order_id = "${o.id}"` });
    expect(sj.totalItems).toBe(0);
  });

  it('batal: wajib alasan; yang sudah dibayar hanya Owner', async () => {
    const o = await S.gudang.collection('sales_orders').create({ customer: 'Batal', items: [line(p, 1)] });
    await errorOf(post(S.gudang, '/api/palora/orders/cancel', { order_id: o.id }));
    await post(S.gudang, '/api/palora/payment', { kind: 'customer', order_id: o.id, amount: 10000 });
    await errorOf(post(S.gudang, '/api/palora/orders/cancel', { order_id: o.id, reason: 'x' }));
    const r = await post(S.owner, '/api/palora/orders/cancel', { order_id: o.id, reason: 'Customer batal' });
    expect(r.status).toBe('batal');
    await errorOf(post(S.owner, '/api/palora/payment', { kind: 'customer', order_id: o.id, amount: 1 }));
  });

  it('PPN: exclude ditambahkan, include dipecah dari harga', async () => {
    const ex = await S.gudang.collection('sales_orders').create({ customer: 'PPN', tax_mode: 'exclude', items: [line(p, 1, 100000)] });
    expect(ex).toMatchObject({ subtotal: 100000, tax_amount: 11000, total_amount: 111000 });
    const inc = await S.gudang.collection('sales_orders').create({ customer: 'PPN', tax_mode: 'include', items: [line(p, 1, 111000)] });
    expect(inc).toMatchObject({ subtotal: 111000, tax_amount: 11000, total_amount: 111000 });
  });
});

// ---------------------------------------------------------------------------
describe('Kasir', () => {
  it('checkout: nomor NT, stok terpotong, pembayaran tercatat, kembalian dihitung', async () => {
    const p = await freshProduct('T-KSR', 10, { sell_price: 25000 });
    const r = await post(S.gudang, '/api/palora/kasir/checkout', {
      items: [{ ...line(p, 2), price: 24000, originalPrice: 25000 }], received_amount: 50000, method: 'Tunai',
    });
    expect(r.order.order_no).toMatch(/^NT\/PPU\/\d{6}\/\d{4}$/);
    expect(r.order).toMatchObject({ total_amount: 48000, status: 'selesai', channel: 'kasir', customer: 'Pelanggan Umum' });
    expect(r.change).toBe(2000);
    expect(await stockOf('T-KSR')).toBe(8);
  });

  it('uang kurang ditolak', async () => {
    const p = await product(S.owner, 'T-KSR');
    const err = await errorOf(post(S.gudang, '/api/palora/kasir/checkout', { items: [line(p, 1)], received_amount: 1000 }));
    expect(err.message).toMatch(/kurang dari total/);
  });

  it('dua kasir berebut stok terakhir: satu berhasil, satu ditolak, stok tidak minus', async () => {
    const p = await freshProduct('T-RACE', 5);
    const sell = () => post(S.gudang, '/api/palora/kasir/checkout', { items: [line(p, 3)], received_amount: 999999 });
    const res = await Promise.allSettled([sell(), sell()]);
    expect(res.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await stockOf('T-RACE')).toBe(2);
  });

  it('Keuangan tidak bisa memakai kasir', async () => {
    const p = await product(S.owner, 'T-KSR');
    await errorOf(post(S.finance, '/api/palora/kasir/checkout', { items: [line(p, 1)], received_amount: 99999 }));
  });
});

// ---------------------------------------------------------------------------
describe('Hutang supplier', () => {
  it('invoice supplier + cicilan; tidak boleh lebih dari sisa; gudang bisa lihat tapi tidak bisa bayar', async () => {
    const inv = await S.finance.collection('supplier_invoices').create({
      invoice_no: 'INV-LH-01', supplier: 'PT LINHUI', total_amount: 3465000, date: today(), due_date: '2026-11-05',
    });
    expect((await S.gudang.collection('supplier_invoices').getOne(inv.id)).invoice_no).toBe('INV-LH-01');
    await errorOf(post(S.gudang, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 1 }));
    await post(S.finance, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 1465000 });
    const err = await errorOf(post(S.finance, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 2000001 }));
    expect(err.message).toMatch(/sisa hutang Rp 2\.000\.000/);
    await errorOf(S.finance.collection('supplier_invoices').update(inv.id, { paid_amount: 0 }));
  });
});


describe('Map PO: 1 PO, beberapa surat jalan, invoice & faktur', () => {
  let po;
  beforeAll(async () => {
    const p = await freshProduct('T-MAP', 0);
    po = await S.gudang.collection('purchase_orders').create({
      supplier: 'PT LINHUI', items: [{ productCode: p.code, name: p.name, qty: 20, price: 10000 }],
    });
    await post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'dikirim' });
    await post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'LH-SJ-1', lines: [{ index: 0, good: 12 }] });
    await post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'LH-SJ-2', lines: [{ index: 0, good: 8 }] });
  });

  it('Mas Heri mencatat invoice yang datang; supplier & no. PO diambil dari PO', async () => {
    const inv = await S.gudang.collection('supplier_invoices').create({
      invoice_no: 'LH-INV-77', po_id: po.id, supplier: 'NAMA SALAH', total_amount: 200000, sj_nos: ['LH-SJ-1', 'LH-SJ-2'], tax_invoice_no: '040026001',
    });
    expect(inv).toMatchObject({ supplier: 'PT LINHUI', po_no: po.po_no, received_by: 'Mas Heri', paid_amount: 0 });
    expect(inv.sj_nos).toEqual(['LH-SJ-1', 'LH-SJ-2']);
  });

  it('surat jalan dari PO lain ditolak', async () => {
    const err = await errorOf(
      S.gudang.collection('supplier_invoices').create({ invoice_no: 'LH-INV-78', po_id: po.id, total_amount: 1, sj_nos: ['SJ-PO-LAIN'] })
    );
    expect(err.message).toMatch(/SJ-PO-LAIN bukan milik/);
  });

  it('no. invoice yang sama dari supplier yang sama ditolak (anti dobel)', async () => {
    const err = await errorOf(S.finance.collection('supplier_invoices').create({ invoice_no: 'LH-INV-77', po_id: po.id, total_amount: 5 }));
    expect(err.message).toMatch(/sudah pernah dicatat/);
  });

  it('gudang tidak bisa mengubah total tagihan atau membayar; keuangan bisa', async () => {
    const inv = await S.owner.collection('supplier_invoices').getFirstListItem('invoice_no = "LH-INV-77"');
    await errorOf(S.gudang.collection('supplier_invoices').update(inv.id, { total_amount: 1 }));
    await errorOf(post(S.gudang, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 1000 }));
    await post(S.finance, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 200000 });
    expect((await S.owner.collection('supplier_invoices').getOne(inv.id)).paid_amount).toBe(200000);
  });
});

// ---------------------------------------------------------------------------
describe('Stok opname', () => {
  it('hanya baris yang dihitung yang disesuaikan, pakai stok terkini di server', async () => {
    const a = await freshProduct('T-OP-A', 10);
    const b = await freshProduct('T-OP-B', 10);
    const c = await freshProduct('T-OP-C', 10);
    // stok A berubah (terjual) setelah lembar hitung dicetak
    await post(S.gudang, '/api/palora/kasir/checkout', { items: [line(a, 4)], received_amount: 999999 });
    const sess = await post(S.gudang, '/api/palora/opname/apply', {
      date: '2026-10-05',
      lines: [
        { product_id: a.id, counted: 6 }, // sama dengan stok terkini -> tidak berubah
        { product_id: b.id, counted: 12 },
        { product_id: c.id, counted: 7 },
      ],
    });
    expect(sess.code).toMatch(/^OP\/PPU\/20261005\/\d{2}$/);
    expect(sess.adjusted_count).toBe(2);
    expect([await stockOf('T-OP-A'), await stockOf('T-OP-B'), await stockOf('T-OP-C')]).toEqual([6, 12, 7]);
    expect((await movementsOf('T-OP-C')).at(-1)).toMatchObject({ type: 'OPNAME', qty: -3, ref_no: sess.code });
  });

  it('input kosong / minus ditolak', async () => {
    const a = await product(S.owner, 'T-OP-A');
    await errorOf(post(S.gudang, '/api/palora/opname/apply', { lines: [{ product_id: a.id, counted: '' }] }));
    await errorOf(post(S.gudang, '/api/palora/opname/apply', { lines: [{ product_id: a.id, counted: -1 }] }));
    expect(await stockOf('T-OP-A')).toBe(6);
  });
});

// ---------------------------------------------------------------------------
describe('Marketplace', () => {
  const rows = [
    { order_no: '2410AAA', date: '2026-10-04', sku: 'SKU-HIJAU', name: 'Palet Hijau', qty: 2, price: 35000 },
    { order_no: '2410AAA', date: '2026-10-04', sku: 'PLT-0004', name: 'Palet Coklat', qty: 1, price: 35000 },
    { order_no: '2410BBB', date: '2026-10-04', sku: 'PLT-0004', name: 'Palet Coklat', qty: 3, price: 35000 },
  ];

  it('SKU tidak dikenal dilaporkan dulu (preview), tidak ada yang tersimpan', async () => {
    const before = await stockOf('PLT-0004');
    const preview = await post(S.gudang, '/api/palora/marketplace/import', { store: 'Shopee 1', rows, dry_run: true });
    expect(preview.ok).toBe(false);
    expect(preview.unknown).toEqual([{ sku: 'SKU-HIJAU', name: 'Palet Hijau', order_no: '2410AAA' }]);
    await errorOf(post(S.gudang, '/api/palora/marketplace/import', { store: 'Shopee 1', rows }));
    expect(await stockOf('PLT-0004')).toBe(before);
  });

  it('dengan pemetaan SKU: pesanan tercatat, stok terpotong, pemetaan diingat', async () => {
    const h = await stockOf('PLT-0002');
    const c = await stockOf('PLT-0004');
    const r = await post(S.gudang, '/api/palora/marketplace/import', {
      store: 'Shopee 1', file_name: 'shopee.xlsx', rows, mappings: { 'SKU-HIJAU': 'PLT-0002' },
    });
    expect(r).toMatchObject({ ok: true, created: 2, item_count: 6, total_amount: 210000 });
    expect(await stockOf('PLT-0002')).toBe(h - 2);
    expect(await stockOf('PLT-0004')).toBe(c - 4);
    const orders = await S.owner.collection('sales_orders').getFullList({ filter: 'channel = "marketplace"' });
    expect(orders.map((o) => o.marketplace_order_no).sort()).toEqual(['2410AAA', '2410BBB']);
  });

  it('upload file yang sama lagi = dilewati semua (anti dobel)', async () => {
    const c = await stockOf('PLT-0004');
    const r = await post(S.gudang, '/api/palora/marketplace/import', { store: 'Shopee 1', rows });
    expect(r).toMatchObject({ created: 0, skipped: ['2410AAA', '2410BBB'] });
    expect(await stockOf('PLT-0004')).toBe(c);
  });

  it('toko lain dengan no. pesanan sama tetap dihitung terpisah', async () => {
    const r = await post(S.gudang, '/api/palora/marketplace/import', {
      store: 'Tokopedia 1', rows: [rows[2]],
    });
    expect(r.created).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe('Audit trail & hak akses', () => {
  it('perubahan stok lewat endpoint tercatat dengan pelaku', async () => {
    const p = await product(S.owner, 'T-KSR');
    const logs = await S.owner.collection('audit_trail').getFullList({ filter: `record_id = "${p.id}"`, sort: 'created' });
    expect(logs.some((l) => l.action === 'stock' && l.actor_name === 'Mas Heri (Admin Gudang & Kasir)')).toBe(true);
  });

  it('riwayat dokumen terlihat semua user, riwayat akun & log sistem hanya Owner', async () => {
    expect((await S.gudang.collection('audit_trail').getList(1, 1, { filter: 'collection_name = "products"' })).totalItems).toBeGreaterThan(0);
    expect((await S.gudang.collection('audit_trail').getList(1, 1, { filter: 'collection_name = "users"' })).totalItems).toBe(0);
    expect((await S.owner.collection('audit_trail').getList(1, 1, { filter: 'collection_name = "users"' })).totalItems).toBeGreaterThan(0);
    expect((await S.finance.collection('system_logs').getList(1, 1)).totalItems).toBe(0);
  });

  it('data tidak bisa dihapus permanen; mutasi stok & pembayaran tidak bisa dibuat langsung', async () => {
    const p = await product(S.owner, 'T-KSR');
    await errorOf(S.owner.collection('products').delete(p.id));
    await errorOf(S.owner.collection('stock_movements').create({ uid: 'x', qty: 5 }));
    await errorOf(S.owner.collection('payments').create({ kind: 'customer', amount: 5 }));
    await errorOf(S.owner.collection('deliveries').create({ uid: 'x', sj_no: 'x' }));
  });

  it('user nonaktif tidak bisa login; user tidak bisa ubah role sendiri', async () => {
    await S.owner.collection('users').create({
      email: 'off@palora.local', password: USER_PASSWORD, passwordConfirm: USER_PASSWORD, name: 'Off', role: 'gudang', active: false,
    });
    await errorOf(S.login('off@palora.local'));
    await errorOf(S.gudang.collection('users').update(S.gudang.authStore.record.id, { role: 'owner' }));
  });

  it('nama di log diambil dari akun login', async () => {
    const rec = await S.gudang.collection('system_logs').create({ uid: 'LOG-T', user: 'Pak Yanto (Owner)', module: 'x', action: 'x' });
    expect(rec.user).toBe('Mas Heri (Admin Gudang & Kasir)');
  });
});

// ---------------------------------------------------------------------------
describe('Celah API biasa tertutup (kolom milik server)', () => {
  it('pesanan: sisa, nilai uang & data marketplace tidak bisa diubah lewat REST', async () => {
    const p = await freshProduct('T-SEC1', 50, { sell_price: 10000 });
    const o = await S.gudang.collection('sales_orders').create({ customer: 'Sec', payment_type: 'Tempo 14 Hari', items: [line(p, 5)] });
    const upd = await S.gudang.collection('sales_orders').update(o.id, {
      remaining_amount: 0, dp_amount: 50000, subtotal: 1, tax_amount: 1, marketplace_order_no: 'X1', store: 'Shopee', notes: 'boleh',
    });
    expect(upd).toMatchObject({ remaining_amount: 50000, dp_amount: 0, subtotal: 50000, tax_amount: 0, marketplace_order_no: '', store: '', notes: 'boleh' });
    const plus = await S.owner.send(`/api/collections/sales_orders/records/${o.id}`, { method: 'PATCH', body: { 'paid_amount+': 50000 } }).catch((e) => e);
    expect((await S.owner.collection('sales_orders').getOne(o.id)).paid_amount).toBe(0);
    expect(plus).toBeDefined();
  });

  it('barang: stok (termasuk modifier stock+) & kode tidak bisa diubah; arsip ditolak bila masih dipakai', async () => {
    const p = await freshProduct('T-SEC2', 10);
    await S.gudang.send(`/api/collections/products/records/${p.id}`, { method: 'PATCH', body: { 'stock+': 100 } }).catch(() => {});
    expect(await stockOf('T-SEC2')).toBe(10);
    const err = await errorOf(S.gudang.collection('products').update(p.id, { code: 'T-SEC2-BARU' }));
    expect(err.message).toMatch(/Kode barang tidak bisa diganti/);
    await S.gudang.collection('sales_orders').create({ customer: 'Pakai', items: [line(p, 1)] });
    const busy = await errorOf(S.gudang.collection('products').update(p.id, { deleted: true }));
    expect(busy.message).toMatch(/masih dipakai di INV\//);
  });

  it('qty pecahan ditolak dengan pesan jelas', async () => {
    const p = await product(S.owner, 'T-SEC2');
    const err = await errorOf(S.gudang.collection('sales_orders').create({ customer: 'Koma', items: [line(p, 1.5)] }));
    expect(err.message).toMatch(/bilangan bulat/);
  });

  it('invoice supplier: gudang tidak bisa mengarsipkan; total tidak boleh di bawah yang sudah dibayar', async () => {
    const inv = await S.gudang.collection('supplier_invoices').create({ invoice_no: 'INV-SEC-1', supplier: 'PT SEC', total_amount: 1000000, date: today() });
    await errorOf(S.gudang.collection('supplier_invoices').update(inv.id, { deleted: true }));
    await post(S.finance, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 600000 });
    const err = await errorOf(S.owner.collection('supplier_invoices').update(inv.id, { total_amount: 500000 }));
    expect(err.message).toMatch(/lebih kecil dari yang sudah dibayar/);
    await errorOf(S.owner.collection('supplier_invoices').update(inv.id, { deleted: true }));
    await S.finance.collection('supplier_invoices').create({ invoice_no: 'INV-SEC-2', supplier: 'PT SEC', total_amount: 1, date: today() });
    const dup = await errorOf(S.finance.collection('supplier_invoices').update(inv.id, { invoice_no: 'INV-SEC-2' }));
    expect(dup.message).toMatch(/sudah pernah dicatat/);
    expect((await S.owner.collection('supplier_invoices').getOne(inv.id)).deleted).toBe(false);
  });

  it('PO: total & status tidak bisa diubah langsung', async () => {
    const p = await product(S.owner, 'T-SEC2');
    const po = await S.gudang.collection('purchase_orders').create({ supplier: 'PT SEC', items: [line(p, 10, 5000)] });
    const upd = await S.gudang.collection('purchase_orders').update(po.id, { total_amount: 1, status: 'Selesai', notes: 'ok' });
    expect(upd).toMatchObject({ total_amount: 50000, state: 'draft', notes: 'ok' });
  });

  it('surat jalan: status diterima hanya lewat konfirmasi', async () => {
    const p = await freshProduct('T-SEC3', 10);
    const o = await S.gudang.collection('sales_orders').create({ customer: 'SJ', destination: 'Jl. X', items: [line(p, 2)] });
    await post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: o.id, amount: o.total_amount });
    const { delivery } = await post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'kirim' });
    await S.gudang.collection('deliveries').update(delivery.id, { status: 'diterima' }).catch(() => {});
    expect((await S.owner.collection('deliveries').getOne(delivery.id)).status).toBe('dikirim');
  });
});

describe('Pesanan tempo: barang diterima dulu, lunas belakangan', () => {
  it('pelunasan setelah surat jalan diterima -> status selesai', async () => {
    const p = await freshProduct('T-TMP', 10, { sell_price: 10000 });
    const o = await S.gudang.collection('sales_orders').create({ customer: 'Tempo', destination: 'Jl. Y', payment_type: 'Tempo 30 Hari', items: [line(p, 4)] });
    await post(S.owner, '/api/palora/orders/release', { order_id: o.id });
    const { delivery } = await post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'kirim' });
    await post(S.gudang, '/api/palora/deliveries/received', { delivery_id: delivery.id, received_by: 'Pak Andi' });
    expect((await S.owner.collection('sales_orders').getOne(o.id)).status).toBe('dikirim');
    const r = await post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: o.id, amount: o.total_amount });
    expect(r.order).toMatchObject({ status: 'selesai', remaining_amount: 0 });
  });
});

describe('Opname dengan transaksi di tengah', () => {
  it('penjualan antara menghitung & menyimpan tidak ikut dikembalikan', async () => {
    const p = await freshProduct('T-OPS', 100);
    // 09:00 dihitung: fisik 100, sistem 100. 10:00 terjual 10. 11:00 opname disimpan.
    await post(S.gudang, '/api/palora/kasir/checkout', { items: [line(p, 10)], received_amount: 9999999 });
    const sess = await post(S.gudang, '/api/palora/opname/apply', { lines: [{ product_id: p.id, counted: 100, system_at_count: 100 }] });
    expect(sess.adjusted_count).toBe(0);
    expect(await stockOf('T-OPS')).toBe(90);
    // fisik kurang 2 dari saat dihitung -> stok terkini ikut dikurangi 2
    await post(S.gudang, '/api/palora/opname/apply', { lines: [{ product_id: p.id, counted: 88, system_at_count: 90 }] });
    expect(await stockOf('T-OPS')).toBe(88);
  });
});

describe('PO: kurang, lebih & harga modal', () => {
  it('terima lebih dari PO hanya dengan alasan; harga modal ikut harga PO', async () => {
    const p = await freshProduct('T-POX', 0, { buy_price: 10000 });
    const po = await S.gudang.collection('purchase_orders').create({ supplier: 'PT X', items: [line(p, 10, 12500)] });
    await post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'dikirim' });
    const err = await errorOf(post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'SJ-X1', lines: [{ index: 0, good: 12 }] }));
    expect(err.message).toMatch(/isi alasan kelebihan/);
    const r = await post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'SJ-X1', lines: [{ index: 0, good: 12 }], over_reason: 'bonus supplier' });
    expect(r.state).toBe('selesai');
    expect(r.receipts[0].note).toMatch(/Kelebihan .* \+2: bonus supplier/);
    expect(await stockOf('T-POX')).toBe(12);
    expect((await product(S.owner, 'T-POX')).buy_price).toBe(12500);
  });

  it('PO yang sisanya tidak datang bisa ditutup dengan alasan', async () => {
    const p = await product(S.owner, 'T-POX');
    const po = await S.gudang.collection('purchase_orders').create({ supplier: 'PT X', items: [line(p, 10, 12500)] });
    await post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'dikirim' });
    await errorOf(post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'selesai', reason: 'x' })); // belum ada penerimaan
    await post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'SJ-X2', lines: [{ index: 0, good: 6 }] });
    await errorOf(post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'selesai' }));
    const r = await post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'selesai', reason: 'pabrik stop produksi' });
    expect(r).toMatchObject({ state: 'selesai', status: 'Selesai (ditutup kurang)' });
    expect(r.notes).toMatch(/Ditutup kurang: pabrik stop produksi \(.* kurang 4\)/);
    await errorOf(post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'SJ-X3', lines: [{ index: 0, good: 1 }] }));
  });
});

describe('Kirim bertahap: 1 pesanan, beberapa surat jalan', () => {
  it('mobil tidak muat: kirim 60 dulu, sisa 40 di surat jalan kedua', async () => {
    const p = await freshProduct('T-BTH', 100, { sell_price: 10000 });
    const o = await S.gudang.collection('sales_orders').create({ customer: 'Bertahap', destination: 'Jl. Z', items: [line(p, 100)] });
    await post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: o.id, amount: o.total_amount });
    const r1 = await post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'kirim', lines: [{ index: 0, qty: 60 }] });
    expect(r1).toMatchObject({ complete: false, order: { status: 'lunas' } });
    expect(r1.delivery.items[0].qty).toBe(60);
    expect(await stockOf('T-BTH')).toBe(40);
    await errorOf(post(S.owner, '/api/palora/orders/cancel', { order_id: o.id, reason: 'x' }));
    await errorOf(S.gudang.collection('sales_orders').update(o.id, { items: [line(p, 50)] }));
    const over = await errorOf(post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'kirim', lines: [{ index: 0, qty: 41 }] }));
    expect(over.message).toMatch(/melebihi sisa pesanan 40/);
    const r2 = await post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'kirim' });
    expect(r2).toMatchObject({ complete: true, order: { status: 'dikirim' } });
    expect(r2.delivery.items[0].qty).toBe(40);
    await post(S.gudang, '/api/palora/deliveries/received', { delivery_id: r1.delivery.id, received_by: 'A' });
    expect((await S.owner.collection('sales_orders').getOne(o.id)).status).toBe('dikirim'); // SJ kedua belum diterima
    await post(S.gudang, '/api/palora/deliveries/received', { delivery_id: r2.delivery.id, received_by: 'A' });
    expect((await S.owner.collection('sales_orders').getOne(o.id)).status).toBe('selesai');
  });
});

describe('Retur dari customer', () => {
  let p;
  let o;
  beforeAll(async () => {
    p = await freshProduct('T-RTR', 50, { sell_price: 10000 });
    o = await S.gudang.collection('sales_orders').create({ customer: 'Retur', destination: 'Jl. R', items: [line(p, 10)] });
    await post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: o.id, amount: 100000 });
    const r = await post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'kirim' });
    await post(S.gudang, '/api/palora/deliveries/received', { delivery_id: r.delivery.id, received_by: 'B' });
  });

  it('retur rusak + uang kembali: gudang ditolak, Owner bisa; tagihan & kas menyesuaikan', async () => {
    const body = { order_id: o.id, mode: 'refund', reason: 'retak', lines: [{ index: 0, qty: 2, condition: 'rusak' }] };
    const err = await errorOf(post(S.gudang, '/api/palora/orders/return', body));
    expect(err.message).toMatch(/pengembalian dana Rp 20\.000/);
    const r = await post(S.owner, '/api/palora/orders/return', body);
    expect(r.refund).toBe(20000);
    expect(r.order).toMatchObject({ total_amount: 80000, paid_amount: 80000, remaining_amount: 0, status: 'selesai' });
    expect(await stockOf('T-RTR')).toBe(40); // rusak tidak kembali ke stok
    const refund = await S.owner.collection('payments').getFirstListItem(`order_id = "${o.id}" && kind = "refund"`);
    expect(refund.amount).toBe(20000);
    await errorOf(post(S.owner, '/api/palora/orders/return', { ...body, lines: [{ index: 0, qty: 9 }] })); // tinggal 8
  });

  it('ganti barang: barang baik masuk stok, baris dibuka lagi lalu dikirim ulang', async () => {
    const r = await post(S.gudang, '/api/palora/orders/return', {
      order_id: o.id, mode: 'ganti', reason: 'salah warna', lines: [{ index: 0, qty: 3, condition: 'baik' }],
    });
    expect(r.order).toMatchObject({ total_amount: 80000, status: 'lunas' });
    expect(await stockOf('T-RTR')).toBe(43);
    expect((await movementsOf('T-RTR')).at(-1)).toMatchObject({ type: 'RETUR', qty: 3 });
    const d = await post(S.gudang, '/api/palora/orders/dispatch', { order_id: o.id, mode: 'kirim' });
    expect(d.delivery.items[0].qty).toBe(3);
    expect(await stockOf('T-RTR')).toBe(40);
  });
});

describe('PO untuk pesanan customer & riwayat cetak', () => {
  it('PO menyimpan pesanan tujuan dari data asli', async () => {
    const p = await freshProduct('T-DRP', 0);
    const o = await S.gudang.collection('sales_orders').create({ customer: 'Toko Langsung', items: [line(p, 5)] });
    const po = await S.gudang.collection('purchase_orders').create({ supplier: 'PT D', items: [line(p, 5, 1000)], for_orders: [{ id: o.id, customer: 'palsu' }] });
    expect(po.for_orders).toEqual([{ id: o.id, order_no: o.order_no, customer: 'Toko Langsung' }]);
    await errorOf(S.gudang.collection('purchase_orders').update(po.id, { for_orders: [{ id: 'tidakada123456' }] }));
    const found = await S.gudang.collection('purchase_orders').getList(1, 5, { filter: `for_orders ~ '"${o.id}"'` });
    expect(found.totalItems).toBe(1);
  });

  it('cetak tercatat di riwayat dokumen', async () => {
    const o = (await S.owner.collection('sales_orders').getList(1, 1)).items[0];
    await post(S.finance, '/api/palora/printed', { collection: 'sales_orders', id: o.id, doc: 'Nota' });
    const a = await S.owner.collection('audit_trail').getFirstListItem(`record_id = "${o.id}" && action = "print"`);
    expect(a.actor_name).toMatch(/Keuangan/);
    await errorOf(post(S.finance, '/api/palora/printed', { collection: 'users', id: o.id }));
  });
});

describe('1 surat jalan hanya untuk 1 PO', () => {
  it('no. surat jalan yang sama dari supplier yang sama ditolak di PO lain', async () => {
    const p = await freshProduct('T-SJ1', 0);
    const mk = async () => {
      const po = await S.gudang.collection('purchase_orders').create({ supplier: 'PT SJ', items: [line(p, 10, 1000)] });
      await post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'dikirim' });
      return po;
    };
    const a = await mk();
    const b = await mk();
    await post(S.gudang, '/api/palora/po/receive', { po_id: a.id, sj_no: 'SJ-777', lines: [{ index: 0, good: 4 }] });
    const err = await errorOf(post(S.gudang, '/api/palora/po/receive', { po_id: b.id, sj_no: 'sj-777', lines: [{ index: 0, good: 4 }] }));
    expect(err.message).toMatch(new RegExp(`sudah dipakai di ${a.po_no.replace(/[/]/g, '\/')}`));
    // PO yang sama boleh beberapa surat jalan (mobil tidak muat)
    await post(S.gudang, '/api/palora/po/receive', { po_id: a.id, sj_no: 'SJ-778', lines: [{ index: 0, good: 6 }] });
    // supplier lain boleh punya nomor yang kebetulan sama
    const c = await S.gudang.collection('purchase_orders').create({ supplier: 'PT LAIN', items: [line(p, 1, 1000)] });
    await post(S.gudang, '/api/palora/po/receive', { po_id: c.id, sj_no: 'SJ-777', lines: [{ index: 0, good: 1 }] });
  });
});

describe('Draft PO', () => {
  it('draft boleh belum lengkap, tapi tidak bisa dikirim/diterima sebelum dilengkapi', async () => {
    const p = await freshProduct('T-DRF', 0);
    const d = await S.gudang.collection('purchase_orders').create({ supplier: 'PT DRAFT', items: [], is_draft: true });
    expect(d).toMatchObject({ state: 'draft', total_amount: 0 });
    expect(d.po_no).toMatch(/^PO-\d+\/PPU\//);
    await errorOf(S.gudang.collection('purchase_orders').create({ supplier: 'PT DRAFT', items: [] })); // tanpa draft = wajib barang
    const upd = await S.gudang.collection('purchase_orders').update(d.id, { is_draft: true, items: [{ ...line(p, 1, 0), qty: '', price: '' }] });
    expect(upd.items[0]).toMatchObject({ qty: 0, price: 0 });
    const err = await errorOf(post(S.gudang, '/api/palora/po/state', { po_id: d.id, state: 'dikirim' }));
    expect(err.message).toMatch(/masih draft: qty .* belum diisi/);
    await errorOf(post(S.gudang, '/api/palora/po/receive', { po_id: d.id, sj_no: 'SJ-DRF', lines: [{ index: 0, good: 1 }] }));
    await errorOf(S.gudang.collection('purchase_orders').update(d.id, { items: [{ ...line(p, 1, 0), qty: 0 }] })); // simpan biasa = wajib lengkap
    await S.gudang.collection('purchase_orders').update(d.id, { items: [line(p, 25, 9000)] });
    const sent = await post(S.gudang, '/api/palora/po/state', { po_id: d.id, state: 'dikirim' });
    expect(sent).toMatchObject({ state: 'dikirim', total_amount: 225000 });
  });
});

describe('Draft pesanan', () => {
  it('draft belum bernomor invoice, belum dihitung; nomor INV dibuat saat disimpan final', async () => {
    const p = await freshProduct('T-DRS', 20, { sell_price: 10000 });
    await errorOf(S.gudang.collection('sales_orders').create({ is_draft: true, items: [] })); // kosong total
    const d = await S.gudang.collection('sales_orders').create({ is_draft: true, customer: 'Toko Draft', items: [{ ...line(p, 1), qty: '' }] });
    expect(d).toMatchObject({ status: 'draft', total_amount: 0 });
    expect(d.order_no).toMatch(/^DRAFT-/);
    const pay = await errorOf(post(S.finance, '/api/palora/payment', { kind: 'customer', order_id: d.id, amount: 1000 }));
    expect(pay.message).toMatch(/masih draft/);
    await errorOf(post(S.owner, '/api/palora/orders/release', { order_id: d.id }));
    // masih draft: boleh belum lengkap
    const d2 = await S.gudang.collection('sales_orders').update(d.id, { is_draft: true, items: [line(p, 3)] });
    expect(d2).toMatchObject({ status: 'draft', total_amount: 30000 });
    // final tanpa customer ditolak, dengan customer -> nomor INV & status baru
    await errorOf(S.gudang.collection('sales_orders').update(d.id, { is_draft: false, customer: '' }));
    const fin = await S.gudang.collection('sales_orders').update(d.id, { is_draft: false, payment_type: 'Tempo 7 Hari', date: '2026-10-05' });
    expect(fin.order_no).toMatch(/^INV\/PPU\/202610\/\d{4}$/);
    expect(fin).toMatchObject({ status: 'baru', total_amount: 30000, remaining_amount: 30000, due_date: '2026-10-12' });
    // setelah final tidak bisa dihapus seperti draft
    await errorOf(S.gudang.collection('sales_orders').update(d.id, { deleted: true }));
  });

  it('draft bisa dihapus pembuatnya', async () => {
    const d = await S.gudang.collection('sales_orders').create({ is_draft: true, customer: 'Hapus Saya' });
    const r = await S.gudang.collection('sales_orders').update(d.id, { deleted: true });
    expect(r.deleted).toBe(true);
  });
});

describe('Invoice dobel per PO (kasus PO-039)', () => {
  it('invoice kedua senilai PO ditolak; surat jalan tidak bisa ditagih dua kali; sisa nilai boleh', async () => {
    const p = await freshProduct('T-INV2', 0);
    const po = await S.gudang.collection('purchase_orders').create({ supplier: 'PT LAMA', items: [line(p, 100, 27200)] });
    await post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'dikirim' });
    // invoice pertama dicatat sebelum barang datang (supplier minta bayar dulu)
    await S.gudang.collection('supplier_invoices').create({ po_id: po.id, invoice_no: 'INT', total_amount: 2720000, date: today() });
    await post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'SJ-A', lines: [{ index: 0, good: 80, bad: 10 }] });
    await post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'SJ-B', lines: [{ index: 0, good: 20 }] });
    const err = await errorOf(
      S.gudang.collection('supplier_invoices').create({ po_id: po.id, invoice_no: 'APJDADA', total_amount: 2720000, date: today(), sj_nos: ['SJ-A', 'SJ-B'] })
    );
    expect(err.message).toMatch(/Sudah ditagih Rp 2\.720\.000 \(INT Rp 2\.720\.000\)/);
    expect(err.message).toMatch(/paling banyak Rp 299\.200/); // sisa = PPN 11%
    // invoice PPN terpisah masih boleh (dalam batas nilai PO + PPN)
    await S.gudang.collection('supplier_invoices').create({ po_id: po.id, invoice_no: 'PPN-1', total_amount: 299200, date: today(), sj_nos: ['SJ-A'] });
    const dupSj = await errorOf(S.gudang.collection('supplier_invoices').create({ po_id: po.id, invoice_no: 'X', total_amount: 1, date: today(), sj_nos: ['SJ-A'] }));
    expect(dupSj.message).toMatch(/PO-.*bernilai|sudah ditagih di invoice PPN-1/);
  });

  it('PO dibagi 2 invoice (per surat jalan) tetap boleh', async () => {
    const p = await product(S.owner, 'T-INV2');
    const po = await S.gudang.collection('purchase_orders').create({ supplier: 'PT LAMA', items: [line(p, 10, 1000)] });
    await post(S.gudang, '/api/palora/po/state', { po_id: po.id, state: 'dikirim' });
    await post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'S1', lines: [{ index: 0, good: 6 }] });
    await post(S.gudang, '/api/palora/po/receive', { po_id: po.id, sj_no: 'S2', lines: [{ index: 0, good: 4 }] });
    await S.gudang.collection('supplier_invoices').create({ po_id: po.id, invoice_no: 'I-1', total_amount: 6000, date: today(), sj_nos: ['S1'] });
    await S.gudang.collection('supplier_invoices').create({ po_id: po.id, invoice_no: 'I-2', total_amount: 4000, date: today(), sj_nos: ['S2'] });
    const e2 = await errorOf(S.gudang.collection('supplier_invoices').create({ po_id: po.id, invoice_no: 'I-3', total_amount: 1000, date: today(), sj_nos: ['S2'] }));
    expect(e2.message).toMatch(/S2 sudah ditagih di invoice I-2/);
  });
});
