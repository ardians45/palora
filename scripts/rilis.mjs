// Rilis ke PC gudang: test -> build -> zip -> GitHub Release.
// PC gudang mengambilnya sendiri lewat backend/windows/update-palora.ps1 (dicek tiap 10 menit).
//   npm run rilis                  -> rilis commit yang sudah di-push ke main
//   npm run rilis -- --catatan "perbaikan cetak PO"
// Isi rilis: pb_migrations, pb_hooks, pb_public, windows. Database (pb_data) TIDAK ikut.
import { execFileSync, execSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BACKEND_DIR, ROOT } from './pb-utils.mjs';

const REPO = 'ardians45/palora';
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { cwd: ROOT }).toString().trim();
const stop = (msg) => {
  console.error(`\n[X] ${msg}`);
  process.exit(1);
};

// yang dirilis harus sama persis dengan yang ada di GitHub, supaya bisa dilacak
if (out('git status --porcelain')) stop('Masih ada perubahan yang belum di-commit. Commit dulu.');
run('git fetch origin main --quiet');
const commit = out('git rev-parse HEAD');
if (commit !== out('git rev-parse origin/main')) stop('Commit terakhir belum ada di GitHub (main). Push / merge dulu.');

console.log('\n[1/4] Test...');
run('npx vitest run');
console.log('\n[2/4] Build...');
run('npm run build:server');

console.log('\n[3/4] Kemas...');
const tag = 'v' + new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-'); // WIB
const stage = mkdtempSync(path.join(os.tmpdir(), 'palora-rilis-'));
for (const dir of ['pb_migrations', 'pb_hooks', 'pb_public', 'windows']) cpSync(path.join(BACKEND_DIR, dir), path.join(stage, dir), { recursive: true });
writeFileSync(path.join(stage, 'versi.txt'), `${tag}\n${commit}\n`);
const zip = path.join(os.tmpdir(), 'palora-update.zip');
rmSync(zip, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${stage}\\*' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
rmSync(stage, { recursive: true, force: true });

console.log(`\n[4/4] Unggah ${tag} ke GitHub...`);
const i = process.argv.indexOf('--catatan');
const notes = `${i !== -1 ? process.argv[i + 1] + '\n\n' : ''}Commit ${commit.slice(0, 7)}: ${out('git log -1 --format=%s')}`;
// pakai login pemilik repo walau akun gh yang aktif berbeda
let token = '';
try {
  token = execFileSync('gh', ['auth', 'token', '--user', REPO.split('/')[0]]).toString().trim();
} catch {
  /* pakai akun gh yang aktif */
}
execFileSync('gh', ['release', 'create', tag, zip, '--repo', REPO, '--target', commit, '--title', `PALORA ${tag}`, '--notes', notes], {
  stdio: 'inherit',
  env: token ? { ...process.env, GH_TOKEN: token } : process.env,
});
console.log(`\nRilis ${tag} terbit. PC gudang memasangnya sendiri dalam ~10 menit (lihat update-palora.log di sana).`);
