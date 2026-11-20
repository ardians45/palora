// Ganti semua password (3 akun aplikasi + superuser) dengan password acak yang kuat.
//
//   node scripts/ganti-password.mjs                         -> server di http://127.0.0.1:8090
//   node scripts/ganti-password.mjs --url http://127.0.0.1:8091
//
// Kredensial superuser SAAT INI dibaca dari backend/.env (atau backend/.env.example bila .env belum ada).
// Hasil: password baru ditulis ke backend/PASSWORD-BARU.txt dan dicetak di layar, serta backend/.env
// diperbarui (PB_ADMIN_PASSWORD, SEED_USER_PASSWORD). Simpan lalu HAPUS PASSWORD-BARU.txt setelah dicatat.
import { randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import PocketBase from 'pocketbase';
import { BACKEND_DIR, loadEnv } from './pb-utils.mjs';

const env = loadEnv();
const urlArg = process.argv.indexOf('--url');
const url = (urlArg !== -1 ? process.argv[urlArg + 1] : 'http://127.0.0.1:8090').replace(/\/$/, '');
for (const k of ['PB_ADMIN_EMAIL', 'PB_ADMIN_PASSWORD']) {
  if (!env[k]) throw new Error(`${k} belum diisi di ${env.__file}`);
}

const WORDS = [
  'api', 'awan', 'bata', 'batu', 'bumi', 'cabe', 'darat', 'daun', 'elang', 'emas', 'fajar', 'garam', 'gunung', 'hujan',
  'ikan', 'jagung', 'jeruk', 'kapal', 'kayu', 'kelapa', 'kopi', 'kuda', 'lampu', 'laut', 'madu', 'mawar', 'nasi',
  'padi', 'pasir', 'pelangi', 'pohon', 'rumah', 'sapi', 'sungai', 'tebu', 'teh', 'timur', 'ubi', 'warna', 'zaitun',
];
const pick = (list) => list[randomInt(list.length)];
// 3 kata + 2 angka + 1 simbol, mis. "Kopi-Bata-Elang-47!" (cukup panjang & mudah diketik di HP)
function newPassword() {
  const words = [pick(WORDS), pick(WORDS), pick(WORDS)].map((w) => w[0].toUpperCase() + w.slice(1));
  return `${words.join('-')}-${randomInt(10, 100)}${pick(['!', '#', '$', '*'])}`;
}

const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);

const result = [];
const users = await pb.collection('users').getFullList({ sort: 'email' });
for (const u of users) {
  const password = newPassword();
  await pb.collection('users').update(u.id, { password, passwordConfirm: password });
  result.push({ label: `${u.name || u.email} (${u.role})`, email: u.email, password });
}
const adminPassword = newPassword();
const su = await pb.collection('_superusers').getFirstListItem(`email = ${JSON.stringify(env.PB_ADMIN_EMAIL)}`);
await pb.collection('_superusers').update(su.id, { password: adminPassword, passwordConfirm: adminPassword });
result.push({ label: 'Superuser (dashboard /_/)', email: env.PB_ADMIN_EMAIL, password: adminPassword });

// Satu SEED_USER_PASSWORD di .env tidak lagi mewakili 3 akun yang berbeda; simpan password Owner
// supaya `setup`/skrip lain tetap punya nilai valid, dan jelaskan di file hasil.
const ownerPw = result.find((r) => r.label.endsWith('(owner)'))?.password ?? result[0].password;

const envPath = path.join(BACKEND_DIR, '.env');
let envText = existsSync(envPath) ? readFileSync(envPath, 'utf8') : readFileSync(path.join(BACKEND_DIR, '.env.example'), 'utf8');
const setVar = (text, key, value) =>
  new RegExp(`^${key}\s*=.*$`, 'm').test(text) ? text.replace(new RegExp(`^${key}\s*=.*$`, 'm'), `${key}=${value}`) : `${text.replace(/\s*$/, '\n')}${key}=${value}\n`;
envText = setVar(envText, 'PB_ADMIN_PASSWORD', adminPassword);
envText = setVar(envText, 'SEED_USER_PASSWORD', ownerPw);
writeFileSync(envPath, envText);

const lines = [
  'PASSWORD BARU PALORA',
  `Dibuat: ${new Date().toLocaleString('id-ID')}   Server: ${url}`,
  '',
  ...result.map((r) => `${r.label}\n  Email   : ${r.email}\n  Password: ${r.password}\n`),
  'Catat di tempat aman, lalu HAPUS file ini. File ini tidak ikut git.',
  'backend/.env sudah diperbarui (SEED_USER_PASSWORD diisi password Owner).',
];
const outFile = path.join(BACKEND_DIR, 'PASSWORD-BARU.txt');
writeFileSync(outFile, lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nTersimpan di ${outFile}`);
