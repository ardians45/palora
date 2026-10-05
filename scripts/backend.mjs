// Jalankan server PocketBase PALORA (lintas OS).
//   npm run backend                -> http://127.0.0.1:8090 (hanya komputer ini)
//   npm run backend -- --lan       -> 0.0.0.0:8090 (bisa diakses komputer/HP lain di jaringan gudang)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { BACKEND_DIR, PB_BIN, assertBinary, pbArgs } from './pb-utils.mjs';

assertBinary();
const lan = process.argv.includes('--lan');
const port = process.env.PORT || 8090;
const http = `${lan ? '0.0.0.0' : '127.0.0.1'}:${port}`;

console.log(`PALORA backend -> http://${http}  (dashboard admin: /_/)`);
const proc = spawn(PB_BIN, ['serve', `--http=${http}`, ...pbArgs(path.join(BACKEND_DIR, 'pb_data'))], {
  stdio: 'inherit',
});
proc.on('exit', (code) => process.exit(code ?? 0));
