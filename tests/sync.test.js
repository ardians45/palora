// Test alur aplikasi ujung-ke-ujung: logika yang sama dengan usePbCollection
// (diffCollections + applyOp) dijalankan terhadap server PocketBase asli,
// termasuk simulasi dua perangkat yang bertransaksi bersamaan.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COLLECTIONS, diffCollections, fromRecord } from '../src/lib/schema.js';
import { applyOp } from '../src/lib/syncOps.js';
import { startTestServer, errorOf } from './helpers.js';

/** Tiruan sederhana satu "layar" aplikasi untuk satu koleksi. */
class Device {
  constructor(pb, key) {
    this.pb = pb;
    this.cfg = COLLECTIONS[key];
    this.items = [];
    this.idMap = new Map();
  }
  async load() {
    const recs = await this.pb.collection(this.cfg.pb).getFullList({
      ...(this.cfg.appendOnly ? {} : { filter: 'deleted = false' }),
    });
    this.idMap = new Map(recs.map((r) => [r.uid, r.id]));
    this.items = recs.map((r) => fromRecord(this.cfg, r));
    return this;
  }
  find(id) {
    return this.items.find((x) => x.id === id);
  }
  /** Sama seperti setter di hook: hitung diff lalu kirim ke server berurutan. */
  async set(updater, { allowRemove = false } = {}) {
    const prev = this.items;
    let next = typeof updater === 'function' ? updater(prev) : updater;
    if (!allowRemove) {
      const ids = new Set(next.map((x) => x.id));
      next = [...next, ...prev.filter((x) => !ids.has(x.id))];
    }
    this.items = next;
    for (const op of diffCollections(this.cfg, prev, next)) {
      await applyOp(this.pb, this.cfg, op, this.idMap);
    }
  }
}

let server, owner, gudang, finance;

beforeAll(async () => {
  server = await startTestServer();
  [owner, gudang, finance] = await Promise.all([
    server.login('yanto@palora.local'),
    server.login('heri@palora.local'),
    server.login('bude@palora.local'),
  ]);
}, 60000);

afterAll(() => server?.stop());

const serverProduct = (pb, code) => pb.collection('products').getFirstListItem(`code = "${code}"`);

describe('Dua perangkat bertransaksi bersamaan', () => {
  it('stok tidak bisa terjual melebihi yang ada (kasir A & kasir B)', async () => {
    const gudangA = await new Device(gudang, 'products').load();
    await gudangA.set((list) => [
      { id: 'PRD-SYNC-1', code: 'SYNC-1', name: 'Krat Test', stock: 5, unit: 'pcs', sellPrice: 10000 },
      ...list,
    ]);

    // Dua layar memuat data yang sama (stok 5)
    const kasirA = await new Device(gudang, 'products').load();
    const kasirB = await new Device(owner, 'products').load();
    expect(kasirA.find('PRD-SYNC-1').stock).toBe(5);
    expect(kasirB.find('PRD-SYNC-1').stock).toBe(5);

    // Kasir A jual 3 -> sukses
    await kasirA.set((list) => list.map((p) => (p.id === 'PRD-SYNC-1' ? { ...p, stock: p.stock - 3 } : p)));
    // Kasir B (data lama: masih lihat 5) juga jual 3 -> harus ditolak server
    const err = await errorOf(
      kasirB.set((list) => list.map((p) => (p.id === 'PRD-SYNC-1' ? { ...p, stock: p.stock - 3 } : p)))
    );
    expect(err.message).toMatch(/Stok tidak cukup.*tersedia 2 pcs/);
    expect((await serverProduct(owner, 'SYNC-1')).stock).toBe(2);
  });

  it('edit harga & penjualan bersamaan tidak saling menimpa', async () => {
    const admin = await new Device(gudang, 'products').load();
    await admin.set((list) => [
      { id: 'PRD-SYNC-2', code: 'SYNC-2', name: 'Ember Test', stock: 50, unit: 'pcs', sellPrice: 20000 },
      ...list,
    ]);
    const layarOwner = await new Device(owner, 'products').load();
    const layarKasir = await new Device(gudang, 'products').load();

    // Owner ubah harga, kasir jual 10 -- keduanya dari data lama yang sama
    await layarOwner.set((l) => l.map((p) => (p.id === 'PRD-SYNC-2' ? { ...p, sellPrice: 25000 } : p)));
    await layarKasir.set((l) => l.map((p) => (p.id === 'PRD-SYNC-2' ? { ...p, stock: p.stock - 10 } : p)));

    const final = await serverProduct(owner, 'SYNC-2');
    expect(final.sell_price).toBe(25000); // harga baru tidak hilang
    expect(final.stock).toBe(40); // penjualan tetap tercatat
  });
});

describe('Alur bisnis lengkap', () => {
  it('PO -> terima barang bertahap + foto surat jalan -> stok bertambah', async () => {
    const products = await new Device(gudang, 'products').load();
    const pos = await new Device(gudang, 'purchaseOrders').load();
    const docs = await new Device(gudang, 'documents').load();
    const before = products.find('PRD-0002').stock;

    await pos.set((l) => [
      {
        id: 'PO-SYNC',
        poNo: 'PO-900/PIM/2026',
        supplier: 'PT FUTARI PLASTIK INDONESIA',
        items: [{ productCode: 'PLT-0002', name: 'Palet Hijau', qty: 100, buyPrice: 26000, total: 2600000 }],
        totalAmount: 2600000,
        status: 'Menunggu Konfirmasi Pabrik',
      },
      ...l,
    ]);

    // Penerimaan pertama: 60 dari 100 (muatan mobil terbatas)
    await products.set((l) => l.map((p) => (p.code === 'PLT-0002' ? { ...p, stock: p.stock + 60 } : p)));
    const photo = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], { type: 'application/pdf' });
    await docs.set((l) => [
      { id: 'DOC-SYNC-SJ1', title: 'SJ 1', refNo: 'SJ-A', category: 'Delivery Order', _file: new File([photo], 'sj-1.pdf', { type: 'application/pdf' }) },
      ...l,
    ]);
    await pos.set((l) =>
      l.map((p) =>
        p.id === 'PO-SYNC'
          ? { ...p, status: 'Diterima Sebagian', items: p.items.map((it) => ({ ...it, receivedQty: 60 })), receipts: [{ sjNo: 'SJ-A', items: [{ qty: 60 }] }] }
          : p
      )
    );

    const po = await owner.collection('purchase_orders').getFirstListItem('uid = "PO-SYNC"');
    expect(po.status).toBe('Diterima Sebagian');
    expect(po.receipts).toHaveLength(1);
    expect((await serverProduct(owner, 'PLT-0002')).stock).toBe(before + 60);

    const doc = await owner.collection('documents').getFirstListItem('uid = "DOC-SYNC-SJ1"');
    expect(doc.file).toMatch(/\.pdf$/);
  });

  it('Sales Order tempo: ditahan sampai lunas, lalu surat jalan boleh terbit', async () => {
    const orders = await new Device(gudang, 'orders').load();
    const customers = await new Device(gudang, 'customers').load();
    const deliveries = await new Device(gudang, 'deliveries').load();
    const debtBefore = customers.find('CUST-002').currentDebt;

    // Pesanan Rp 1.000.000, DP 25%
    await customers.set((l) => l.map((c) => (c.id === 'CUST-002' ? { ...c, currentDebt: c.currentDebt + 750000 } : c)));
    await orders.set((l) => [
      { id: 'ORD-SYNC', orderNo: 'INV-9001/PIM/2026', customer: 'Toko Plastik Berkah Jaya', totalAmount: 1000000, dpAmount: 250000, remainingAmount: 750000, paymentStatus: 'DP Terbayar (Tahan Pengiriman)', items: [] },
      ...l,
    ]);

    const sj = { id: 'SJ-SYNC', sjNo: '9001/DO/PIM/X/2026', orderNo: 'INV-9001/PIM/2026', customer: 'Toko Plastik Berkah Jaya', items: [] };
    const err = await errorOf(deliveries.set((l) => [sj, ...l]));
    expect(err.message).toMatch(/belum lunas/);

    // Bude (Keuangan) mencatat pelunasan dari layarnya sendiri
    const ordersBude = await new Device(finance, 'orders').load();
    const customersBude = await new Device(finance, 'customers').load();
    await customersBude.set((l) => l.map((c) => (c.id === 'CUST-002' ? { ...c, currentDebt: c.currentDebt - 750000 } : c)));
    await ordersBude.set((l) =>
      l.map((o) =>
        o.id === 'ORD-SYNC'
          ? { ...o, remainingAmount: 0, dpAmount: 1000000, paymentStatus: 'Lunas', payments: [{ amount: 750000, method: 'Transfer' }] }
          : o
      )
    );

    const deliveries2 = await new Device(gudang, 'deliveries').load();
    await deliveries2.set((l) => [sj, ...l]);
    const saved = await owner.collection('deliveries').getFirstListItem('uid = "SJ-SYNC"');
    expect(saved.order_no).toBe('INV-9001/PIM/2026');

    const cust = await owner.collection('customers').getFirstListItem('uid = "CUST-002"');
    expect(cust.current_debt).toBe(debtBefore);
  });

  it('hapus produk = arsip (soft delete), tetap ada di database', async () => {
    const products = await new Device(gudang, 'products').load();
    await products.set((l) => [{ id: 'PRD-SYNC-DEL', code: 'SYNC-DEL', name: 'Hapus Saya', stock: 0 }, ...l]);
    await products.set((l) => l.filter((p) => p.id !== 'PRD-SYNC-DEL'), { allowRemove: true });

    const reloaded = await new Device(gudang, 'products').load();
    expect(reloaded.find('PRD-SYNC-DEL')).toBeUndefined();
    const raw = await owner.collection('products').getFirstListItem('uid = "PRD-SYNC-DEL"');
    expect(raw.deleted).toBe(true);
  });

  it('array lama (closure basi) tidak menghapus data yang dibuat perangkat lain', async () => {
    const a = await new Device(gudang, 'suppliers').load();
    const stale = a.items; // layar A belum tahu supplier baru
    const b = await new Device(owner, 'suppliers').load();
    await b.set((l) => [{ id: 'SUP-SYNC', name: 'PT Baru' }, ...l]);
    await a.load();
    await a.set(stale.map((s) => s)); // tanpa allowRemove
    const stillThere = await owner.collection('suppliers').getFirstListItem('uid = "SUP-SYNC"');
    expect(stillThere.deleted).toBe(false);
  });
});
