import { existsSync, readFileSync, rmSync } from 'node:fs';
import { STATE_FILE } from './env.js';

export default async function globalTeardown() {
  await globalThis.__PALORA_PB__?.stop();
  if (existsSync(STATE_FILE)) {
    const { dataDir } = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(STATE_FILE, { force: true });
  }
}
