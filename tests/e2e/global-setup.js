// Siapkan PocketBase berisi data bersih (451 barang asli + 3 akun) khusus untuk test E2E.
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import PocketBase from 'pocketbase';
import { startServer, upsertSuperuser } from '../../scripts/pb-utils.mjs';
import { seed, defaultUsers } from '../../scripts/seed-data.mjs';
import { applyPhotos } from '../../scripts/photos.mjs';
import { ADMIN, PB_PORT, STATE_FILE, USER_PASSWORD } from './env.js';

export default async function globalSetup() {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'palora-e2e-'));
  upsertSuperuser(dataDir, ADMIN.email, ADMIN.password);
  const server = await startServer(dataDir, PB_PORT);
  const admin = new PocketBase(server.url);
  admin.autoCancellation(false);
  await admin.collection('_superusers').authWithPassword(ADMIN.email, ADMIN.password);
  await seed(admin, { users: defaultUsers(USER_PASSWORD) });
  await applyPhotos(admin);
  writeFileSync(STATE_FILE, JSON.stringify({ dataDir, pid: server.pid }));
  globalThis.__PALORA_PB__ = server;
}
