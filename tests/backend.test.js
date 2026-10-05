// Test integrasi aturan bisnis di server PocketBase.
// Menjalankan PocketBase asli dengan database sementara (tidak menyentuh backend/pb_data).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COLLECTIONS, toRecord } from '../src/lib/schema.js';
import { startTestServer, errorOf, USER_PASSWORD } from './helpers.js';

const increment = (pb, collection, id, delta) =>
  pb.send('/api/palora/increment', { method: 'POST', body: { collection, id, delta } });

let server, admin, login;
let owner, gudang, finance;

beforeAll(async () => {
  server = await startTestServer();
  admin = server.admin;
  login = server.login;
  [owner, gudang, finance] = await Promise.all([
    login('yanto@palora.local'),
    login('heri@palora.local'),
    login('bude@palora.local'),
  ]);
}, 60000);

afterAll(() => server?.stop());

const newProduct = (code, stock = 10) =>
  toRecord(COLLECTIONS.products, {
    id: `PRD-T-${code}`,
    code,
    name: `Produk Test ${code}`,
    stock,
    unit: 'pcs',
    buyPrice: 1000,
    sellPrice: 1500,
  });

describe('Seed data', () => {
  it('mengisi 451 produk asli Paletindo', async () => {
    const res = await owner.collection('products').getList(1, 1);
    expect(res.totalItems).toBe(451);
  });
});

describe('Login & hak akses (PRD 6.7)', () => {
  it('user nonaktif tidak bisa login', async () => {
    await admin.collection('users').create({
      email: 'nonaktif@palora.local',
      password: USER_PASSWORD,
      passwordConfirm: USER_PASSWORD,
      name: 'Nonaktif',
      role: 'gudang',
      active: false,
    });
    await errorOf(login('nonaktif@palora.local'));
  });

  it('Finance tidak boleh menambah produk', async () => {
    const err = await errorOf(finance.collection('products').create(newProduct('FIN-1')));
    expect([400, 403]).toContain(err.status);
  });

  it('Admin gudang boleh menambah produk', async () => {
    const rec = await gudang.collection('products').create(newProduct('GDG-1'));
    expect(rec.code).toBe('GDG-1');
  });

  it('kode produk harus unik', async () => {
    await errorOf(gudang.collection('products').create({ ...newProduct('GDG-1'), uid: 'PRD-T-DUP' }));
  });

  it('Finance tidak boleh membuat Sales Order', async () => {
    const so = toRecord(COLLECTIONS.orders, { id: 'ORD-T-FIN', orderNo: 'INV-T-FIN', totalAmount: 1000 });
    await errorOf(finance.collection('sales_orders').create(so));
  });

  it('user tidak bisa mengganti role-nya sendiri', async () => {
    await errorOf(gudang.collection('users').update(gudang.authStore.record.id, { role: 'owner' }));
  });

  it('hanya Owner yang bisa membuat akun baru', async () => {
    const body = {
      email: 'baru@palora.local',
      password: USER_PASSWORD,
      passwordConfirm: USER_PASSWORD,
      name: 'Baru',
      role: 'gudang',
      active: true,
    };
    await errorOf(gudang.collection('users').create(body));
    const rec = await owner.collection('users').create(body);
    expect(rec.role).toBe('gudang');
  });

  it('log aktivitas hanya bisa dilihat Owner', async () => {
    const asGudang = await gudang.collection('system_logs').getList(1, 1);
    expect(asGudang.totalItems).toBe(0); // listRule menyaring semua baris
    const asOwner = await owner.collection('system_logs').getList(1, 1);
    expect(asOwner.totalItems).toBeGreaterThan(0);
  });
});

describe('Stok atomik', () => {
  it('stok tidak bisa di-PATCH langsung', async () => {
    const p = await gudang.collection('products').create(newProduct('PATCH-1', 5));
    await errorOf(gudang.collection('products').update(p.id, { stock: 999 }));
    // field lain tetap bisa diubah
    const upd = await gudang.collection('products').update(p.id, { sell_price: 2000 });
    expect(upd.sell_price).toBe(2000);
    expect(upd.stock).toBe(5);
  });

  it('stok berkurang lewat endpoint increment & menolak stok minus', async () => {
    const p = await gudang.collection('products').create(newProduct('INC-1', 10));
    const res = await increment(gudang, 'products', p.id, -4);
    expect(res.stock).toBe(6);
    const err = await errorOf(increment(gudang, 'products', p.id, -7));
    expect(err.status).toBe(400);
    expect(err.message).toMatch(/Stok tidak cukup.*tersedia 6 pcs/);
  });

  it('20 transaksi bersamaan tidak bikin stok minus / selisih', async () => {
    const p = await gudang.collection('products').create(newProduct('RACE-1', 15));
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => increment(gudang, 'products', p.id, -1))
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    expect(ok).toBe(15);
    const final = await gudang.collection('products').getOne(p.id);
    expect(final.stock).toBe(0);
  });

  it('Finance tidak boleh mengubah stok, tapi boleh mengubah piutang customer', async () => {
    const p = await gudang.collection('products').create(newProduct('FIN-STK', 3));
    const err = await errorOf(increment(finance, 'products', p.id, 1));
    expect(err.status).toBe(403);

    const cust = await finance.collection('customers').create(
      toRecord(COLLECTIONS.customers, { id: 'CUST-T-1', name: 'Toko Test', currentDebt: 100000 })
    );
    const res = await increment(finance, 'customers', cust.id, -150000);
    expect(res.current_debt).toBe(0); // tidak boleh minus
  });
});

describe('Soft delete & audit trail', () => {
  it('data tidak bisa dihapus permanen', async () => {
    const p = await gudang.collection('products').create(newProduct('DEL-1'));
    await errorOf(owner.collection('products').delete(p.id));
    const soft = await owner.collection('products').update(p.id, { deleted: true });
    expect(soft.deleted).toBe(true);
  });

  it('setiap perubahan tercatat di audit_trail dengan nama pelaku', async () => {
    const p = await gudang.collection('products').create(newProduct('AUD-1', 7));
    await gudang.collection('products').update(p.id, { sell_price: 5000 });
    await increment(gudang, 'products', p.id, -2);

    const logs = await owner.collection('audit_trail').getFullList({
      filter: owner.filter('record_id = {:id}', { id: p.id }),
      sort: 'created',
    });
    expect(logs.map((l) => l.action)).toEqual(['create', 'update', 'increment']);
    expect(logs[0].actor_name).toBe('Mas Heri (Admin Gudang & POS)');
    expect(logs[1].changes.sell_price).toEqual({ from: 1500, to: 5000 });
    expect(logs[2].changes.stock).toMatchObject({ from: 7, to: 5, delta: -2 });
  });

  it('non-Owner tidak bisa melihat audit trail', async () => {
    const res = await gudang.collection('audit_trail').getList(1, 1);
    expect(res.totalItems).toBe(0);
  });

  it('nama user di log diambil dari akun login, bukan dari input', async () => {
    const rec = await gudang.collection('system_logs').create({
      uid: 'LOG-T-SPOOF',
      user: 'Pak Yanto (Owner)',
      module: 'Test',
      action: 'Spoof',
      detail: 'mencoba menyamar',
    });
    expect(rec.user).toBe('Mas Heri (Admin Gudang & POS)');
  });
});

describe('Surat jalan hanya untuk pesanan lunas (F-SO04)', () => {
  const sj = (uid, orderNo) =>
    toRecord(COLLECTIONS.deliveries, { id: uid, sjNo: `${uid}/DO`, orderNo, customer: 'Toko Test' });

  it('menolak surat jalan untuk pesanan yang belum lunas', async () => {
    await gudang.collection('sales_orders').create(
      toRecord(COLLECTIONS.orders, {
        id: 'ORD-T-UNPAID',
        orderNo: 'INV-T-UNPAID',
        totalAmount: 1000000,
        dpAmount: 250000,
        remainingAmount: 750000,
      })
    );
    const err = await errorOf(gudang.collection('deliveries').create(sj('SJ-T-1', 'INV-T-UNPAID')));
    expect(err.message).toMatch(/belum lunas/);
  });

  it('hanya Owner yang bisa memberi izin kirim sebelum lunas', async () => {
    const order = await owner.collection('sales_orders').getFirstListItem('order_no = "INV-T-UNPAID"');
    await errorOf(gudang.collection('sales_orders').update(order.id, { release_approved: true }));
    await owner.collection('sales_orders').update(order.id, { release_approved: true });
    const rec = await gudang.collection('deliveries').create(sj('SJ-T-2', 'INV-T-UNPAID'));
    expect(rec.order_no).toBe('INV-T-UNPAID');
  });

  it('nota kasir walk-in (ambil di tempat) tidak bisa dibuatkan surat jalan, supaya stok tidak terpotong dua kali', async () => {
    await gudang.collection('sales_orders').create(
      toRecord(COLLECTIONS.orders, {
        id: 'ORD-T-POS',
        orderNo: 'POS-20261005-099',
        totalAmount: 5000,
        remainingAmount: 0,
        paymentStatus: 'Lunas',
        deliveryStatus: 'Ambil di Tempat (Selesai)',
      })
    );
    const err = await errorOf(gudang.collection('deliveries').create(sj('SJ-T-POS', 'POS-20261005-099')));
    expect(err.message).toMatch(/ambil di tempat/);
  });

  it('pesanan lunas langsung bisa dibuatkan surat jalan', async () => {
    await gudang.collection('sales_orders').create(
      toRecord(COLLECTIONS.orders, { id: 'ORD-T-PAID', orderNo: 'INV-T-PAID', totalAmount: 5000, remainingAmount: 0 })
    );
    const rec = await gudang.collection('deliveries').create(sj('SJ-T-3', 'INV-T-PAID'));
    expect(rec.sj_no).toBe('SJ-T-3/DO');
  });
});

describe('Upload dokumen (F-GR02)', () => {
  const png = new Blob(
    [Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) => c.charCodeAt(0))],
    { type: 'image/png' }
  );

  it('menerima foto surat jalan dan bisa diunduh lagi', async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(toRecord(COLLECTIONS.documents, { id: 'DOC-T-1', title: 'SJ Test' }))) {
      fd.append(k, typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));
    }
    fd.append('file', png, 'surat-jalan.png');
    const rec = await gudang.collection('documents').create(fd);
    expect(rec.file).toMatch(/surat_jalan.*\.png/);
    const res = await fetch(gudang.files.getURL(rec, rec.file));
    expect(res.status).toBe(200);
  });

  it('menolak jenis file selain gambar/PDF', async () => {
    const fd = new FormData();
    fd.append('uid', 'DOC-T-2');
    fd.append('file', new Blob(['MZ'], { type: 'application/x-msdownload' }), 'virus.exe');
    await errorOf(gudang.collection('documents').create(fd));
  });
});
