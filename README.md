# PALORA: Sistem Internal ERP PT Paletindo Prakarsa Unggul

Aplikasi web operasional gudang & transaksi Paletindo: stok real-time, PO ke supplier,
penerimaan barang, Sales Order + DP 25%, kasir POS, surat jalan, piutang, arsip dokumen,
import marketplace, laporan, dan audit trail. Spesifikasi: [docs/PRD_PALORA_Internal_ERP.md](docs/PRD_PALORA_Internal_ERP.md).

## Stack

| Bagian | Teknologi |
|---|---|
| Frontend | React 19 + Vite |
| Backend | [PocketBase](https://pocketbase.io) 0.40 (satu file program: database SQLite, login, upload file, realtime, dashboard admin) |
| Aturan bisnis server | `backend/pb_hooks/` (JavaScript) |
| Test | Vitest: unit test + integration test terhadap PocketBase asli |

Dokumen terkait:
- [docs/SKEMA_DATABASE.md](docs/SKEMA_DATABASE.md): ERD, tabel, hak akses, aturan bisnis.
- [docs/DEPLOY.md](docs/DEPLOY.md): pasang di cloud (versi gampang) atau server sendiri di gudang.

## Menjalankan di laptop (development)

Syarat: Node.js 20+ dan `backend/pocketbase.exe` (Windows) / `backend/pocketbase` (Mac/Linux),
download dari [rilis PocketBase](https://github.com/pocketbase/pocketbase/releases) v0.40.x lalu extract ke `backend/`.

```bash
npm install
npm run setup      # sekali: buat database, superuser, data awal 451 produk, 3 akun tim
npm run backend    # terminal 1: server PocketBase di http://127.0.0.1:8090
npm run dev        # terminal 2: aplikasi di http://localhost:5173
```

Kredensial development ada di `backend/.env.example` (salin ke `backend/.env` dan ganti untuk produksi).
Akun yang dibuat `npm run setup`:

| Email | Role | Persona |
|---|---|---|
| yanto@palora.local | Owner | Pak Yanto / Pak De |
| heri@palora.local | Admin Gudang & POS | Mas Heri |
| bude@palora.local | Keuangan | Bude |

Dashboard admin database: http://127.0.0.1:8090/_/ (login pakai `PB_ADMIN_EMAIL`/`PB_ADMIN_PASSWORD`).

Supaya bisa dicoba dari HP di WiFi yang sama: `npm run backend -- --lan` dan `npm run dev`, lalu buka `http://<ip-laptop>:5173`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Frontend development (proxy `/api` ke PocketBase) |
| `npm run backend` | Jalankan PocketBase (`-- --lan` agar bisa diakses perangkat lain) |
| `npm run setup` | Migrasi + superuser + data awal (lokal). `-- --url https://...` untuk server online |
| `npm test` | Semua test (butuh binary PocketBase di `backend/`) |
| `npm run build:server` | Build frontend ke `backend/pb_public` → satu server untuk semuanya |

## Struktur

```
backend/
  pb_migrations/   skema database (versi-kan di git)
  pb_hooks/        aturan bisnis server: audit trail, stok atomik, aturan surat jalan
  windows/         script untuk server gudang (jalankan & backup)
  pb_data/         database + file upload (TIDAK masuk git)
scripts/           setup, seed, helper menjalankan PocketBase
src/
  lib/schema.js          pemetaan data frontend <-> tabel database + diff perubahan
  lib/usePbCollection.js hook pengganti useState: load, realtime, simpan otomatis
  lib/syncOps.js         eksekusi operasi simpan (create / update / increment / soft delete)
  components/modules/    modul-modul ERP
tests/             unit & integration test
```

## Cara kerja simpan data

Modul-modul tetap memakai pola `setProducts(prev => ...)` seperti React biasa. Hook
`usePbCollection` membandingkan data lama vs baru lalu mengirim perubahan ke server:

- data baru → `create`, data berubah → `update` (hanya kolom yang berubah)
- **stok & piutang** dikirim sebagai **selisih** ke `/api/palora/increment`, jadi dua kasir
  yang menjual bersamaan tidak saling menimpa dan stok tidak bisa minus
- hapus → soft delete (`deleted = true`), hanya kalau dipanggil dengan `{ allowRemove: true }`
- satu aksi pengguna = satu batch; kalau satu langkah ditolak server, langkah sisanya dibatalkan,
  muncul pesan jelas, dan data dimuat ulang dari server
- perubahan dari perangkat lain masuk otomatis lewat realtime
