// Menyalakan PocketBase asli dengan database sementara untuk test integrasi.
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import PocketBase from 'pocketbase';
import { startServer, upsertSuperuser } from '../../scripts/pb-utils.mjs';
import { seed, defaultUsers } from '../../scripts/seed-data.mjs';
import { PALETINDO_FULL_STOCK } from '../../backend/seed/products.js';

export const USER_PASSWORD = 'test-user-12345';
const ADMIN = { email: 'admin@test.local', password: 'test-admin-12345' };

export async function startTestServer({ productCount = 30 } = {}) {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'palora-test-'));
  upsertSuperuser(dataDir, ADMIN.email, ADMIN.password);
  const port = 18000 + Math.floor(Math.random() * 1500);
  const server = await startServer(dataDir, port);

  const admin = new PocketBase(server.url);
  admin.autoCancellation(false);
  await admin.collection('_superusers').authWithPassword(ADMIN.email, ADMIN.password);
  await seed(admin, { users: defaultUsers(USER_PASSWORD), products: PALETINDO_FULL_STOCK.slice(0, productCount) });

  const login = async (email) => {
    const pb = new PocketBase(server.url);
    pb.autoCancellation(false);
    await pb.collection('users').authWithPassword(email, USER_PASSWORD);
    return pb;
  };

  return {
    url: server.url,
    admin,
    login,
    owner: await login('yanto@palora.local'),
    gudang: await login('heri@palora.local'),
    finance: await login('bude@palora.local'),
    async stop() {
      await server.stop();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

export async function errorOf(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('Seharusnya gagal, tapi berhasil');
}

export const post = (pb, url, body) => pb.send(url, { method: 'POST', body });

export const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

export const product = (pb, code) => pb.collection('products').getFirstListItem(`code = "${code}"`);

export const line = (p, qty, price) => ({
  productCode: p.code,
  name: p.name,
  color: p.color,
  unit: p.unit,
  qty,
  price: price ?? p.sell_price,
});
