# Panduan Deploy PALORA

Aplikasi PALORA = **satu program PocketBase** yang sekaligus menyajikan tampilan aplikasi
(folder `pb_public`), API, database, dan file upload. Jadi cara pasangnya sama di mana pun:
jalankan PocketBase + bawa folder `pb_data`.

Ada dua pilihan, dan **datanya bisa dipindah kapan saja** (cukup copy folder `pb_data`):

| | A. Versi gampang: Cloud | B. Server sendiri di gudang |
|---|---|---|
| Cocok kalau | Klien belum jadi beli server, mau cepat jalan | Klien sudah punya PC/mini PC khusus di gudang |
| Biaya | Gratis–Rp 75rb/bulan | Listrik + PC (sekali beli) |
| Akses dari HP Pak De di luar | Langsung via internet | Perlu Cloudflare Tunnel / Tailscale (gratis) |
| Kalau internet gudang mati | Gudang tidak bisa akses | Komputer di gudang tetap bisa pakai (LAN) |
| Backup | Snapshot volume / backup PocketBase | Backup PocketBase ke flashdisk/Google Drive |

---

## A. Versi gampang: Cloud (Railway)

Repo ini sudah ada `Dockerfile` yang membangun frontend + PocketBase dalam satu container.

1. Push repo ke GitHub.
2. Di [railway.com](https://railway.com): **New Project → Deploy from GitHub repo** → pilih repo ini.
3. Tambah **Volume** dengan mount path `/pb/pb_data` (WAJIB, kalau tidak data hilang saat redeploy).
4. Isi **Variables**:
   - `PB_ADMIN_EMAIL` = email admin
   - `PB_ADMIN_PASSWORD` = password admin yang kuat
5. **Settings → Networking → Generate Domain**, lalu cek `https://<domain>/api/palora/health`.
6. Isi data awal, foto barang & akun tim dari laptop (pakai `backend/.env` yang berisi kredensial yang sama):
   ```bash
   npm run setup -- --url https://<domain>
   ```
7. Login di `https://<domain>`. Segera **ganti password ketiga akun** dari menu *Pengguna*.

> Alternatif tanpa Docker: [PocketHost.io](https://pockethost.io) (hosting khusus PocketBase).
> Upload isi `backend/pb_migrations`, `backend/pb_hooks`, dan hasil `npm run build` (folder `dist`) ke `pb_public`.

Foto barang bisa dipasang ulang kapan saja ke server mana pun: `npm run photos -- --url https://<domain>`.

## B. Server sendiri di gudang (Windows)

Yang dibutuhkan di PC gudang: **tidak perlu install Node.js**, cukup folder `backend/`.

**Di laptop developer** (sekali):
```bash
npm install
npm run setup
npm run build:server
```
Hasilnya folder `backend/` berisi `pocketbase.exe`, `pb_data` (database + akun), `pb_public` (aplikasi),
`pb_migrations`, `pb_hooks`, dan `windows/`.

**Di PC gudang:**
1. Copy seluruh folder `backend/` ke misalnya `C:\PALORA\`.
2. Klik dua kali `C:\PALORA\windows\jalankan-palora.bat`. Kalau Windows Firewall bertanya, pilih **Allow** (Private network).
3. Cari IP PC gudang (`ipconfig` → IPv4, misal `192.168.1.10`). Sebaiknya di-set IP statis di router.
4. Dari komputer/HP lain di WiFi gudang buka `http://192.168.1.10:8090`.

**Supaya otomatis nyala saat PC dihidupkan:** Task Scheduler → *Create Basic Task* →
Trigger *When the computer starts* → Action *Start a program* → pilih `jalankan-palora.bat`.

**Akses dari luar gudang (HP Pak De):** pilih salah satu
- **Cloudflare Tunnel** (gratis, perlu domain): install `cloudflared` di PC gudang, buat tunnel ke `http://localhost:8090`.
- **Tailscale** (gratis, tanpa domain): install Tailscale di PC gudang & HP Pak De, buka `http://<nama-pc>:8090`.

**Backup:**
- Otomatis: buka `http://localhost:8090/_/` → *Settings → Backups* → aktifkan jadwal harian.
  Bisa juga diarahkan ke penyimpanan S3/Cloudflare R2.
- Manual: matikan server, lalu jalankan `windows\backup-palora.bat` (zip ke folder `backups\`).

## Pindah dari cloud ke server gudang (atau sebaliknya)

1. Buat backup di dashboard admin (`/_/` → *Settings → Backups → Create*), download file zip-nya.
2. Di server tujuan, buka dashboard admin → *Backups* → upload & **Restore**.

Selesai. Semua akun, data, dan file ikut pindah.

## Update aplikasi

- **Cloud:** push ke GitHub, Railway otomatis build ulang. Migrasi skema jalan otomatis saat start.
- **Server gudang:** `npm run build:server` di laptop, lalu copy ulang folder `pb_public`, `pb_migrations`,
  `pb_hooks` ke PC gudang (**jangan** timpa `pb_data`). Restart `jalankan-palora.bat`.
