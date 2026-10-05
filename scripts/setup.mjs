// Setup sekali jalan: migrasi skema, buat superuser, isi data awal & akun pengguna.
//
//   npm run setup                                  -> server lokal (backend/pb_data)
//   npm run setup -- --url https://palora.domain   -> server yang sudah online (cloud / server gudang)
//
// Kredensial dibaca dari backend/.env (salin dari backend/.env.example lalu ganti password-nya).
import path from 'node:path';
import PocketBase from 'pocketbase';
import { BACKEND_DIR, loadEnv, startServer, upsertSuperuser } from './pb-utils.mjs';
import { seed, defaultUsers } from './seed-data.mjs';

const env = loadEnv();
if (env.__file.endsWith('.env.example')) {
  console.warn('! backend/.env belum ada, memakai backend/.env.example (hanya untuk development).');
}
for (const k of ['PB_ADMIN_EMAIL', 'PB_ADMIN_PASSWORD', 'SEED_USER_PASSWORD']) {
  if (!env[k]) throw new Error(`${k} belum diisi di ${env.__file}`);
}

const urlArg = process.argv.indexOf('--url');
const remoteUrl = urlArg !== -1 ? process.argv[urlArg + 1] : null;

async function fill(url) {
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
  console.log('Mengisi data awal...');
  await seed(pb, { users: defaultUsers(env.SEED_USER_PASSWORD), log: (m) => console.log('  ' + m) });
}

if (remoteUrl) {
  // Server online: migrasi & superuser sudah dibuat oleh container/server itu sendiri
  console.log(`Setup server ${remoteUrl}`);
  await fill(remoteUrl.replace(/\/$/, ''));
  console.log('\nSelesai.');
} else {
  const dataDir = path.join(BACKEND_DIR, 'pb_data');
  const port = Number(env.SETUP_PORT || 8099);

  console.log('1. Migrasi skema & superuser...');
  upsertSuperuser(dataDir, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);

  console.log('2. Menjalankan server sementara...');
  const server = await startServer(dataDir, port);
  try {
    console.log('3.');
    await fill(server.url);
    console.log('\nSelesai. Jalankan `npm run backend` lalu `npm run dev`.');
  } finally {
    await server.stop();
  }
}
