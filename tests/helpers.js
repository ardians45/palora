// Menyalakan PocketBase asli dengan database sementara untuk test integrasi.
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import PocketBase from 'pocketbase';
import { startServer, upsertSuperuser } from '../scripts/pb-utils.mjs';
import { seed, defaultUsers } from '../scripts/seed-data.mjs';

export const USER_PASSWORD = 'test-user-12345';
const ADMIN = { email: 'admin@test.local', password: 'test-admin-12345' };

export async function startTestServer() {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'palora-test-'));
  upsertSuperuser(dataDir, ADMIN.email, ADMIN.password);
  const port = 18000 + Math.floor(Math.random() * 1500);
  const server = await startServer(dataDir, port);

  const admin = new PocketBase(server.url);
  admin.autoCancellation(false);
  await admin.collection('_superusers').authWithPassword(ADMIN.email, ADMIN.password);
  await seed(admin, { users: defaultUsers(USER_PASSWORD) });

  return {
    url: server.url,
    admin,
    async login(email) {
      const pb = new PocketBase(server.url);
      pb.autoCancellation(false);
      await pb.collection('users').authWithPassword(email, USER_PASSWORD);
      return pb;
    },
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
