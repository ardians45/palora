# PALORA: Sistem Internal PT Paletindo Prakarsa Unggul

Aplikasi web operasional Paletindo yang **mengikuti alur kerja lama** (PO kertas, surat jalan, DP 25%,
nota, tagihan via WA, Excel stok) tetapi semuanya tercatat: stok real-time, PO & penerimaan bertahap,
pesanan + DP/pelunasan, kasir, surat jalan, piutang, hutang supplier, arsip dokumen per PO,
import marketplace, stok opname, laporan, dan riwayat "siapa melakukan apa".

Dokumen:
- [docs/PLAN_V2_FULL_SYSTEM.md](docs/PLAN_V2_FULL_SYSTEM.md): rencana, peta flow lama → layar, aturan UI.
- [docs/SKEMA_DATABASE.md](docs/SKEMA_DATABASE.md): tabel, hak akses, aturan bisnis server.
- [docs/DEPLOY.md](docs/DEPLOY.md): pasang di cloud (versi gampang) atau server sendiri di gudang.
- [docs/FOTO_PRODUK.md](docs/FOTO_PRODUK.md): foto barang dari katalog paletindo.com & yang perlu dicek.

## Stack

| Bagian | Teknologi |
|---|---|
| Frontend | React 19 + Vite, CSS sendiri (design tokens), ikon Lucide |
| Backend | [PocketBase](https://pocketbase.io) 0.40: database SQLite, login, upload file, realtime, dashboard admin |
| Aturan bisnis | `backend/pb_hooks/`: semua aksi stok/uang = endpoint server dalam **satu transaksi** |
| Test | Vitest (unit + integrasi PocketBase asli) dan Playwright (E2E di Microsoft Edge) |

## Menjalankan di laptop

Syarat: Node.js 20+ dan `backend/pocketbase.exe` (Windows) / `backend/pocketbase` (Mac/Linux) dari
[rilis PocketBase](https://github.com/pocketbase/pocketbase/releases) v0.40.x.

```bash
npm install
npm run setup          # sekali: database, superuser, 451 barang asli + foto, 3 akun tim
npm run backend        # terminal 1: http://127.0.0.1:8090
npm run dev            # terminal 2: http://localhost:5173
```

`npm run setup -- --demo` menambahkan beberapa transaksi contoh untuk presentasi.
Kredensial development ada di `backend/.env.example` (salin ke `backend/.env` & ganti untuk produksi).

| Email | Role | Persona |
|---|---|---|
| yanto@palora.local | Owner | Pak Yanto / Pak De |
| heri@palora.local | Admin Gudang & Kasir | Mas Heri |
| bude@palora.local | Keuangan | Bude |

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Frontend development (proxy `/api` ke PocketBase) |
| `npm run backend` | PocketBase (`-- --lan` agar bisa dibuka dari HP/komputer lain di jaringan) |
| `npm run setup` | Migrasi + superuser + data awal. `-- --url https://...` untuk server online, `-- --demo` transaksi contoh |
| `npm run photos` | Pasang foto & lengkapi nama barang ke server yang sedang jalan |
| `npm test` | Unit + integrasi (71 test) |
| `npm run test:e2e` | Skenario browser end-to-end (16 skenario, Microsoft Edge) |
| `npm run build:server` | Build frontend ke `backend/pb_public` → satu server untuk semuanya |
| `scripts\push.bat "pesan"` | Cek file rahasia, jalankan test & build, commit, tarik perubahan tim, lalu push ke GitHub |

## Struktur

```
palora/
├─ backend/                 SERVER (ini yang dicopy ke PC gudang)
│  ├─ pb_migrations/        skema database
│  ├─ pb_hooks/             aturan bisnis & endpoint /api/palora/* (transaksi)
│  ├─ seed/                 data awal: products.js (451 barang), partners.js, product-names.js,
│  │                        foto-produk/ (foto katalog paletindo.com + mapping.json)
│  ├─ windows/              jalankan-palora.bat, backup-palora.bat
│  └─ .env.example          contoh kredensial
├─ src/                     APLIKASI (frontend React)
│  ├─ layout/               login, menu utama (ikon aplikasi), topbar
│  ├─ modules/              penjualan, stok, pembelian, keuangan, arsip, marketplace, laporan, master, admin
│  ├─ print/                surat jalan (A5, meniru form kertas), nota/invoice, PO, lembar opname
│  ├─ ui/                   komponen: tabel, baris barang ala Excel, dialog, toast, riwayat, foto
│  ├─ lib/                  format angka/tanggal/terbilang, status, router, akses data, pembaca Excel
│  └─ styles/               tokens, komponen, cetak
├─ public/                  logo PALORA & Paletindo (SVG)
├─ scripts/                 setup, seed, foto, jalankan backend; alat/ = script konversi data lama
├─ tests/
│  ├─ unit/                 format, terbilang, parser Excel/marketplace, pemetaan foto
│  ├─ integration/          semua aturan bisnis terhadap PocketBase asli
│  └─ e2e/                  skenario browser per persona (Playwright + Edge)
├─ docs/                    plan, skema, deploy, foto, PRD; arsip/ = dokumen versi lama
└─ referensi/               BAHAN ASLI (bukan kode): dokumen-klien/ (Excel, PDF surat jalan & faktur),
                            wawancara/, prd/ (PRD, skripsi), logo-asli/
```

## Prinsip

- **Stok & uang hanya berubah lewat server** (`/api/palora/*`) dalam satu transaksi. Kalau satu langkah gagal
  (mis. stok kurang), semuanya dibatalkan dengan pesan jelas.
- **Tidak ada hapus permanen**: data diarsipkan. Setiap perubahan tercatat di riwayat dokumen.
- **Nomor dokumen dibuat server** dan melanjutkan nomor kertas (SJ 0063, PO 038), format `0063/DO/PPU/X/2026`.
- Tidak ada `alert()`/`confirm()` browser: semua lewat toast dan dialog aplikasi.
