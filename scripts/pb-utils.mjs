// Helper untuk menjalankan PocketBase dari script Node (setup, seed, test).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BACKEND_DIR = path.join(ROOT, 'backend');
export const PB_BIN = path.join(BACKEND_DIR, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');

export function assertBinary() {
  if (!existsSync(PB_BIN)) {
    throw new Error(
      `PocketBase tidak ditemukan di ${PB_BIN}.\n` +
        'Download dari https://github.com/pocketbase/pocketbase/releases (sesuaikan OS) lalu extract ke folder backend/.'
    );
  }
}

/** Baca backend/.env (fallback ke backend/.env.example untuk development). */
export function loadEnv() {
  const envFile = existsSync(path.join(BACKEND_DIR, '.env'))
    ? path.join(BACKEND_DIR, '.env')
    : path.join(BACKEND_DIR, '.env.example');
  const env = {};
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { ...env, ...process.env, __file: envFile };
}

export function pbArgs(dataDir) {
  return [
    `--dir=${dataDir}`,
    `--migrationsDir=${path.join(BACKEND_DIR, 'pb_migrations')}`,
    `--hooksDir=${path.join(BACKEND_DIR, 'pb_hooks')}`,
    `--publicDir=${path.join(BACKEND_DIR, 'pb_public')}`,
  ];
}

export function upsertSuperuser(dataDir, email, password) {
  assertBinary();
  // migrate dulu supaya skema siap sebelum superuser dibuat
  const mig = spawnSync(PB_BIN, ['migrate', 'up', ...pbArgs(dataDir)], { encoding: 'utf8' });
  if (mig.status !== 0) throw new Error(`Migrasi gagal:\n${mig.stdout}${mig.stderr}`);
  const res = spawnSync(PB_BIN, ['superuser', 'upsert', email, password, ...pbArgs(dataDir)], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`Gagal membuat superuser:\n${res.stdout}${res.stderr}`);
}

/** Jalankan `pocketbase serve` dan tunggu sampai endpoint health siap. */
export async function startServer(dataDir, port = 8090, { quiet = true } = {}) {
  assertBinary();
  const url = `http://127.0.0.1:${port}`;
  const proc = spawn(PB_BIN, ['serve', `--http=127.0.0.1:${port}`, ...pbArgs(dataDir)], {
    stdio: quiet ? 'ignore' : 'inherit',
  });
  let exited = false;
  proc.on('exit', () => (exited = true));

  for (let i = 0; i < 100; i++) {
    if (exited) throw new Error('PocketBase berhenti saat start (port sudah dipakai?)');
    try {
      const r = await fetch(`${url}/api/palora/health`);
      if (r.ok) break;
    } catch {
      /* belum siap */
    }
    await new Promise((r) => setTimeout(r, 150));
    if (i === 99) throw new Error('PocketBase tidak merespon dalam 15 detik');
  }

  return {
    url,
    stop: () =>
      new Promise((resolve) => {
        if (exited) return resolve();
        proc.once('exit', resolve);
        proc.kill();
      }),
  };
}
