import os from 'node:os';
import path from 'node:path';

export const PB_PORT = 18555;
export const PB_URL = `http://127.0.0.1:${PB_PORT}`;
export const ADMIN = { email: 'admin@e2e.local', password: 'e2e-admin-12345' };
export const USER_PASSWORD = 'e2e-user-12345';
export const STATE_FILE = path.join(os.tmpdir(), 'palora-e2e-state.json');
export const USERS = {
  owner: 'yanto@palora.local',
  gudang: 'heri@palora.local',
  finance: 'bude@palora.local',
};
