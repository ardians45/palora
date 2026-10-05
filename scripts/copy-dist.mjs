// Salin hasil build frontend (dist/) ke backend/pb_public supaya PocketBase
// menyajikan aplikasi + API dari satu alamat (cocok untuk server gudang).
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { BACKEND_DIR, ROOT } from './pb-utils.mjs';

const dist = path.join(ROOT, 'dist');
const target = path.join(BACKEND_DIR, 'pb_public');
if (!existsSync(dist)) throw new Error('Folder dist/ belum ada. Jalankan `vite build` dulu.');
rmSync(target, { recursive: true, force: true });
cpSync(dist, target, { recursive: true });
console.log(`Frontend disalin ke ${target}. Jalankan \`npm run backend\` lalu buka http://<ip-server>:8090`);
