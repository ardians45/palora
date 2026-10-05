// Pasang foto & lengkapi nama barang ke server yang sedang berjalan.
//   npm run photos                              -> http://127.0.0.1:8090 (npm run backend harus jalan)
//   npm run photos -- --url https://palora.domain
//   tambah --overwrite untuk mengganti foto yang sudah ada
import PocketBase from 'pocketbase';
import { loadEnv } from './pb-utils.mjs';
import { applyNames, applyPhotos } from './photos.mjs';

const env = loadEnv();
const i = process.argv.indexOf('--url');
const url = (i !== -1 ? process.argv[i + 1] : 'http://127.0.0.1:8090').replace(/\/$/, '');
const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
console.log(`Server ${url}`);
await applyNames(pb, { log: (m) => console.log('  ' + m) });
await applyPhotos(pb, { log: (m) => console.log('  ' + m), overwrite: process.argv.includes('--overwrite') });
