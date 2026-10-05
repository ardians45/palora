// Isi database PALORA dengan master data asli Paletindo + akun pengguna awal.
// Transaksi contoh (PO, pesanan, kasir) hanya dibuat dengan opsi demo, lewat endpoint yang sama
// dengan aplikasi, jadi stok & nomor dokumennya konsisten.
import { PALETINDO_FULL_STOCK } from '../backend/seed/products.js';
import { INITIAL_CUSTOMERS, INITIAL_SUPPLIERS, DEMO_CUSTOMERS } from '../backend/seed/partners.js';
import { fixColor, fixName } from '../backend/seed/product-names.js';

/** Akun awal sesuai persona PRD. Password diambil dari env SEED_USER_PASSWORD. */
export function defaultUsers(password) {
  return [
    { email: 'yanto@palora.local', name: 'Pak Yanto', role: 'owner' },
    { email: 'heri@palora.local', name: 'Mas Heri', role: 'gudang' },
    { email: 'bude@palora.local', name: 'Bude', role: 'finance' },
  ].map((u) => ({ ...u, password, passwordConfirm: password, active: true, emailVisibility: true }));
}

export const productRecord = (p) => ({
  uid: p.id,
  code: String(p.code),
  name: fixName(p.code, p.cleanName || p.name),
  clean_name: fixName(p.code, p.cleanName || p.name),
  group_name: p.jsonCategory || p.category || '',
  category: p.category || '',
  json_category: p.jsonCategory || '',
  factory: p.factory || '',
  stock: Math.max(0, Math.round(Number(p.stock) || 0)),
  unit: p.unit || 'pcs',
  min_stock: Number(p.minStock) || 0,
  buy_price: Number(p.buyPrice) || 0,
  sell_price: Number(p.sellPrice) || 0,
  location: p.location || '',
  color: fixColor(p.cleanName || p.name, p.color),
  color_category: p.colorCategory || '',
  size: p.size || '',
  notes: p.notes || '',
  extra: { modalLama: p.modalLama ?? null, modalBaru: p.modalBaru ?? null, pricelistPabrik: p.pricelistPabrik ?? null },
});

export const customerRecord = (c) => ({
  uid: c.id,
  name: c.name,
  contact_person: c.contactPerson || '',
  phone: c.phone || '',
  whatsapp: c.whatsapp || '',
  email: c.email || '',
  address: c.address || '',
  shipping_address: c.shippingAddress || '',
  npwp: c.npwp || '',
  type: c.type || '',
  credit_limit: Number(c.creditLimit) || 0,
  default_terms: c.defaultTerms || '',
});

const supplierRecord = (s) => ({
  uid: s.id,
  name: s.name,
  sales_person: s.salesPerson || '',
  phone: s.phone || '',
  whatsapp: s.whatsapp || '',
  email: s.email || '',
  address: s.address || '',
  terms: s.terms || '',
  discount_rule: s.discountRule || '',
  categories: s.categories || [],
});

async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

/**
 * @param pb  PocketBase client yang sudah login sebagai superuser
 * @param opts.users  daftar user yang dibuat (dilewati jika email sudah ada)
 * @param opts.products  batasi jumlah produk (untuk test yang cepat)
 */
export async function seed(pb, { users = [], log = () => {}, products = PALETINDO_FULL_STOCK } = {}) {
  for (const u of users) {
    const exists = await pb.collection('users').getList(1, 1, { filter: pb.filter('email = {:e}', { e: u.email }) });
    if (exists.totalItems) {
      log(`- user ${u.email} sudah ada, dilewati`);
      continue;
    }
    await pb.collection('users').create(u);
    log(`+ user ${u.email} (${u.role})`);
  }

  const sets = [
    ['products', products.map(productRecord)],
    ['customers', INITIAL_CUSTOMERS.map(customerRecord)],
    ['suppliers', INITIAL_SUPPLIERS.map(supplierRecord)],
  ];
  for (const [name, rows] of sets) {
    const existing = await pb.collection(name).getList(1, 1);
    if (existing.totalItems > 0) {
      log(`- ${name}: sudah berisi ${existing.totalItems} data, dilewati`);
      continue;
    }
    await inBatches(rows, 20, (row) => pb.collection(name).create(row));
    log(`+ ${name}: ${rows.length} data`);
  }
}

/** Transaksi contoh untuk demo/presentasi, dibuat sebagai user biasa lewat endpoint aplikasi. */
export async function seedDemo(asGudang, asFinance, log = () => {}) {
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  for (const c of DEMO_CUSTOMERS) {
    const ex = await asGudang.collection('customers').getList(1, 1, { filter: `uid = "${c.id}"` });
    if (!ex.totalItems) await asGudang.collection('customers').create(customerRecord(c));
  }
  const product = async (code) => asGudang.collection('products').getFirstListItem(`code = "${code}"`);
  const line = (p, qty, price) => ({
    productCode: p.code, name: p.name, color: p.color, size: p.size, unit: p.unit, qty, price: price ?? p.sell_price,
  });
  const p2 = await product('PLT-0002');
  const p4 = await product('PLT-0004');
  const p5 = await product('PLT-0005');

  // PO ke Futari: dikirim, diterima sebagian
  const po = await asGudang.collection('purchase_orders').create({
    date: today, supplier: 'PT FUTARI PLASTIK INDONESIA', up_person: 'Pak Hendra Kusuma',
    items: [line(p2, 200, 26000), line(p4, 100, 26000)], notes: 'Diambil supir Paletindo',
  });
  await asGudang.send('/api/palora/po/state', { method: 'POST', body: { po_id: po.id, state: 'dikirim' } });
  await asGudang.send('/api/palora/po/receive', {
    method: 'POST',
    body: { po_id: po.id, sj_no: 'SJ-FTR-1021', date: today, driver: 'Pak Suryanto', lines: [{ index: 0, good: 120, bad: 2 }] },
  });
  log(`+ PO ${po.po_no} (diterima sebagian)`);

  // Pesanan tempo dengan DP 25%
  const order = await asGudang.collection('sales_orders').create({
    date: today, customer: 'Toko Plastik Berkah Jaya', up_person: 'Pak Haji Rohman', po_customer_ref: 'PO-BJ-991',
    destination: 'Pasar Induk Kramat Jati Blok C No. 12, Jakarta Timur', payment_type: 'Tempo 14 Hari',
    items: [line(p4, 50), line(p5, 40)],
  });
  await asGudang.send('/api/palora/payment', {
    method: 'POST', body: { kind: 'customer', order_id: order.id, amount: Math.ceil(order.total_amount * 0.25), method: 'Transfer BCA', date: today },
  });
  log(`+ Pesanan ${order.order_no} (DP 25%)`);

  // Pesanan lunas lalu dikirim
  const order2 = await asGudang.collection('sales_orders').create({
    date: today, customer: 'PT ASTRO TECHNOLOGIES INDONESIA', up_person: 'Ibu Syafina Nur Fauzia', po_customer_ref: 'ID1/POR/260500000-360',
    destination: 'Storage Asset Hub PSG, Jl. Raya Cirendeu No. 6 Pisangan, Tangerang Selatan', payment_type: 'Transfer',
    items: [line(p2, 100)],
  });
  await asFinance.send('/api/palora/payment', {
    method: 'POST', body: { kind: 'customer', order_id: order2.id, amount: order2.total_amount, method: 'Transfer Mandiri', date: today },
  });
  await asGudang.send('/api/palora/orders/dispatch', {
    method: 'POST', body: { order_id: order2.id, mode: 'kirim', date: today, driver_name: 'Pak Suryanto', vehicle_plate: 'B 9482 PPU' },
  });
  log(`+ Pesanan ${order2.order_no} (lunas, surat jalan terbit)`);

  // Kasir
  const sale = await asGudang.send('/api/palora/kasir/checkout', {
    method: 'POST', body: { date: today, items: [line(p5, 2)], received_amount: 70000, method: 'Tunai' },
  });
  log(`+ Kasir ${sale.order.order_no}`);
}
