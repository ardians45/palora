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
  it('invoice supplier + cicilan; tidak boleh lebih dari sisa; gudang tidak bisa', async () => {
    const inv = await S.finance.collection('supplier_invoices').create({
      invoice_no: 'INV-LH-01', supplier: 'PT LINHUI', total_amount: 3465000, date: today(), due_date: '2026-11-05',
    });
    await errorOf(S.gudang.collection('supplier_invoices').getOne(inv.id));
    await errorOf(post(S.gudang, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 1 }));
    await post(S.finance, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 1465000 });
    const err = await errorOf(post(S.finance, '/api/palora/payment', { kind: 'supplier', invoice_id: inv.id, amount: 2000001 }));
    expect(err.message).toMatch(/sisa hutang Rp 2\.000\.000/);
    await errorOf(S.finance.collection('supplier_invoices').update(inv.id, { paid_amount: 0 }));
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
