// Isi database PALORA dengan data awal asli Paletindo (src/data) + akun pengguna awal.
// Dipakai oleh `npm run setup` dan oleh test integrasi.
import { COLLECTIONS, toRecord } from '../src/lib/schema.js';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_ORDERS,
  INITIAL_PO,
  INITIAL_DELIVERIES,
  INITIAL_DOCUMENTS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SYSTEM_LOGS,
} from '../src/data/mockData.js';

export const INITIAL_DATA = {
  products: INITIAL_PRODUCTS,
  customers: INITIAL_CUSTOMERS,
  suppliers: INITIAL_SUPPLIERS,
  orders: INITIAL_ORDERS,
  purchaseOrders: INITIAL_PO,
  deliveries: INITIAL_DELIVERIES,
  documents: INITIAL_DOCUMENTS,
  stockMovements: INITIAL_STOCK_MOVEMENTS,
  systemLogs: INITIAL_SYSTEM_LOGS,
};

/** Akun awal sesuai persona PRD. Password diambil dari env SEED_USER_PASSWORD. */
export function defaultUsers(password) {
  return [
    { email: 'yanto@palora.local', name: 'Pak Yanto', role: 'owner' },
    { email: 'heri@palora.local', name: 'Mas Heri', role: 'gudang' },
    { email: 'bude@palora.local', name: 'Bude', role: 'finance' },
  ].map((u) => ({ ...u, password, passwordConfirm: password, active: true, emailVisibility: true }));
}

async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

/**
 * @param pb  PocketBase client yang sudah login sebagai superuser
 * @param opts.users  daftar user yang dibuat (dilewati jika email sudah ada)
 * @param opts.log    fungsi logging
 */
export async function seed(pb, { users = [], log = () => {} } = {}) {
  for (const u of users) {
    const exists = await pb.collection('users').getList(1, 1, { filter: pb.filter('email = {:e}', { e: u.email }) });
    if (exists.totalItems) {
      log(`- user ${u.email} sudah ada, dilewati`);
      continue;
    }
    await pb.collection('users').create(u);
    log(`+ user ${u.email} (${u.role})`);
  }

  for (const [key, rows] of Object.entries(INITIAL_DATA)) {
    const cfg = COLLECTIONS[key];
    const existing = await pb.collection(cfg.pb).getList(1, 1);
    if (existing.totalItems > 0) {
      log(`- ${cfg.pb}: sudah berisi ${existing.totalItems} data, dilewati`);
      continue;
    }
    await inBatches(rows, 20, (row) => pb.collection(cfg.pb).create(toRecord(cfg, row)));
    log(`+ ${cfg.pb}: ${rows.length} data`);
  }
}
