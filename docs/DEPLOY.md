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

**Di laptop developer** (sekali): siapkan database produksi yang bersih (tanpa data uji coba).
1. Matikan `npm run backend` / `npm run dev` bila sedang jalan.
2. Ganti nama folder `backend\pb_data` → `backend\pb_data-dev` (database uji coba disimpan, tidak ikut ke gudang).
3. Salin `backend\.env.example` → `backend\.env`, ganti **semua password** dengan yang kuat.
4. Jalankan:
   ```bash
   npm install
   npm run setup
   npm run build:server
   ```
Hasilnya folder `backend/` berisi `pocketbase.exe`, `pb_data` (database + akun), `pb_public` (aplikasi),
`pb_migrations`, `pb_hooks`, dan `windows/`. (`pb_data-dev`, `seed/`, `.env` tidak perlu dicopy.)

**Di PC gudang:**
1. Copy folder `backend/` (lewat flashdisk) ke `C:\PALORA\`.
2. Klik kanan `C:\PALORA\windows\pasang-autostart.bat` → **Run as administrator**.
   Server langsung menyala, menyala otomatis setiap PC dihidupkan (walau belum login, tanpa jendela),
   restart sendiri bila berhenti, dan port 8090 dibuka di firewall untuk jaringan Private.
   (`jalankan-palora.bat` hanya untuk percobaan manual; jangan dijalankan bersamaan.)
3. Cari IP PC gudang (`ipconfig` → IPv4, misal `192.168.1.10`). Sebaiknya di-set IP statis di router.
   Pastikan jaringan WiFi/LAN gudang di Windows bertipe **Private**.
4. Dari komputer/HP lain di WiFi gudang buka `http://192.168.1.10:8090`.

### Memindahkan tunnel dari laptop ke PC gudang

Satu tunnel boleh punya beberapa "connector". Kalau laptop dan PC gudang **sama-sama** menyala dengan
token yang sama, pengunjung dibagi acak ke dua database berbeda. Jadi urutannya:

1. Pastikan PALORA di PC gudang sudah jalan (`http://localhost:8090` terbuka di PC gudang).
2. Di PC gudang: `C:\PALORA\windows\pasang-tunnel.bat <TOKEN>` (token yang sama, ambil lagi di
   Zero Trust → Networks → Tunnels → tunnel Anda → *Configure*).
3. Cek di dashboard tunnel → tab **Connectors**: sekarang ada 2 (laptop & PC gudang).
4. **Di laptop**, matikan connector-nya:
   - bila dipasang sebagai service (Command Prompt *Run as administrator*): `cloudflared service uninstall`
   - bila dijalankan di terminal (`cloudflared tunnel run ...`): tutup terminalnya.
5. Dashboard **Connectors** tinggal 1 (nama PC gudang). Buka `https://palora.paletindo.id` dari HP pakai data seluler.

Public Hostname (`palora.paletindo.id` → `localhost:8090`) tidak perlu diubah karena `localhost` dibaca
dari sisi komputer yang menjalankan connector.

### Akses dari internet dengan subdomain `palora.paletindo.id` (Cloudflare Tunnel, gratis)

Tidak perlu IP publik, tidak perlu buka port router, HTTPS otomatis.

**1. Pindahkan pengelolaan DNS paletindo.id ke Cloudflare** (sekali, gratis)
1. Daftar di [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a domain** → `paletindo.id` → paket **Free**.
2. Cloudflare memindai record DNS lama (website, email/MX). **Cocokkan dengan record di registrar lama** —
   pastikan record website & email ikut, supaya website paletindo.id dan email tidak mati.
3. Di panel registrar tempat paletindo.id dibeli, ganti **nameserver** ke 2 nameserver dari Cloudflare.
   Aktif dalam beberapa menit sampai 24 jam. (Butuh akses dari pengelola website paletindo.id.)

**2. Buat tunnel**
1. Cloudflare → **Zero Trust** → **Networks → Tunnels** → **Create a tunnel** → tipe *Cloudflared* → nama `palora-gudang`.
2. Pilih Windows, salin **token** (teks panjang setelah `service install`).
3. Di PC gudang, klik kanan `C:\PALORA\windows\pasang-tunnel.bat` → *Run as administrator* lewat Command Prompt:
   ```bash
   C:\PALORA\windows\pasang-tunnel.bat <TOKEN>
   ```
4. Kembali ke dashboard tunnel → **Public Hostname → Add**:
   Subdomain `palora` · Domain `paletindo.id` · Service **HTTP** · URL `localhost:8090` → Save.
5. Buka `https://palora.paletindo.id` dari HP (pakai data seluler, bukan WiFi gudang).

**3. Amankan dashboard admin** (disarankan)
Zero Trust → **Access → Applications → Add** → Self-hosted → domain `palora.paletindo.id`, path `_/` →
policy *Emails*: email Owner. Dashboard database (`/_/`) jadi hanya bisa dibuka Owner (kode OTP lewat email).
Aplikasi PALORA biasa tetap dibuka dengan login akun masing-masing.

**Agar selalu online**
- Power Options: *Sleep = Never*, matikan "Turn off hard disk".
- BIOS: aktifkan *Restore on AC Power Loss = Power On* (PC menyala sendiri setelah listrik padam). UPS sangat disarankan.
- Server otomatis lewat `pasang-autostart.bat`, tunnel otomatis lewat `pasang-tunnel.bat` (Windows Service).
  Cek: Task Scheduler → *PALORA Server* (Running) dan `services.msc` → *Cloudflared agent* (Running).
- Bila internet gudang mati: dari dalam gudang tetap bisa dibuka lewat `http://<IP-PC-gudang>:8090`.

**Alternatif tanpa domain:** Tailscale (gratis): install di PC gudang & HP Pak De, buka `http://<nama-pc>:8090`.

**Backup:**
- Otomatis: buka `http://localhost:8090/_/` → *Settings → Backups* → aktifkan jadwal harian.
  Bisa juga diarahkan ke penyimpanan S3/Cloudflare R2.
- Manual: matikan server (`schtasks /end /tn "PALORA Server"` sebagai administrator), jalankan
  `windows\backup-palora.bat` (zip ke folder `backups\`), lalu `schtasks /run /tn "PALORA Server"`.

## Pindah dari cloud ke server gudang (atau sebaliknya)

1. Buat backup di dashboard admin (`/_/` → *Settings → Backups → Create*), download file zip-nya.
2. Di server tujuan, buka dashboard admin → *Backups* → upload & **Restore**.

Selesai. Semua akun, data, dan file ikut pindah.

## Update aplikasi

- **Cloud:** push ke GitHub, Railway otomatis build ulang. Migrasi skema jalan otomatis saat start.
- **Server gudang:** `npm run build:server` di laptop, lalu copy ulang folder `pb_public`, `pb_migrations`,
  `pb_hooks` ke PC gudang (**jangan** timpa `pb_data`). Restart server sebagai administrator:
  `schtasks /end /tn "PALORA Server"` lalu `schtasks /run /tn "PALORA Server"`.
