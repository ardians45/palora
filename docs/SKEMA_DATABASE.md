# Skema Database PALORA (v2)

Backend: **PocketBase 0.40** (SQLite). Definisi: `backend/pb_migrations/`, aturan bisnis: `backend/pb_hooks/palora.pb.js`.

## Prinsip

| Prinsip | Penerapan |
|---|---|
| Ikuti alur lama | Nomor & format dokumen meniru kertas Paletindo (PO-038/PPU/2026, 0063/DO/PPU/X/2026). |
| Stok & uang aman | `stock`, status & semua nilai uang pesanan (total, dibayar, sisa), `receipts`/total PO, status surat jalan, `paid_amount` invoice **tidak bisa** diubah lewat API biasa (termasuk modifier `field+`): hook server selalu mengembalikan nilainya. Hanya lewat endpoint `/api/palora/*` dalam **satu transaksi**. Kode barang tidak bisa diganti; barang yang masih dipakai pesanan/PO berjalan tidak bisa diarsipkan. Qty harus bilangan bulat. |
| Tidak ada hapus permanen | `deleteRule = null`; arsip memakai `deleted = true`. |
| Riwayat lengkap | Setiap perubahan tercatat di `audit_trail` (pelaku, waktu, nilai sebelum → sesudah) dan tampil sebagai panel "Riwayat" di tiap dokumen. |
| Baris barang bersama dokumennya | `items`, `receipts` disimpan JSON di dokumen induk; total dihitung ulang oleh server. |

## Tabel

| Tabel | Isi | Catatan |
|---|---|---|
| `users` | akun login, `role` (owner/gudang/finance), `active` | user nonaktif tidak bisa login; sesi 8 jam |
| `settings` | kop perusahaan, NPWP, rekening, penandatangan, kode dokumen (PPU), PPN %, minimal DP % | 1 baris, hanya Owner yang ubah |
| `counters` | nomor urut dokumen per jenis | hanya server |
| `products` | kode, nama, kelompok, warna, ukuran, satuan, stok, stok minimum, harga modal/jual, **foto** (+thumbnail otomatis) | stok hanya via endpoint |
| `stock_movements` | mutasi IN/OUT/OPNAME/ADJUSTMENT: sebelum, sesudah, dokumen, petugas | hanya server |
| `customers`, `suppliers` | master mitra (UP, WA, email, syarat bayar, aturan diskon) | arsip, bukan hapus |
| `sales_orders` | pesanan / nota kasir / penjualan marketplace: `status` (draft = disimpan belum lengkap, belum bernomor INV & tidak dihitung; baru, dp, lunas, dikirim, diambil, selesai, batal), `channel`, PPN, dibayar, sisa, jatuh tempo, izin kirim Owner; per baris `sentQty` (sudah keluar) & `returnedQty`; `returns` (riwayat retur) | nomor INV/NT/MP dibuat server. Pesanan baru tanpa DP belum dihitung omzet/piutang (dokumennya "Konfirmasi Pesanan") |
| `payments` | DP, pelunasan, cicilan (customer), bayar invoice supplier, `refund` (dana retur dikembalikan) + foto bukti | hanya via endpoint |
| `deliveries` | surat jalan customer + konfirmasi diterima + foto SJ bertanda tangan | dibuat saat barang keluar |
| `purchase_orders` | PO supplier: `state` (draft, dikirim, sebagian, selesai, batal), baris barang + `receivedQty`, `receipts` per surat jalan supplier, `for_orders` (pesanan customer tujuan bila barang langsung dikirim ke customer) | penerimaan via endpoint; harga modal barang mengikuti harga PO terakhir yang diterima |
| `supplier_invoices` | invoice & faktur supplier per PO: no. invoice, surat jalan yang ditagih (`sj_nos`), foto invoice & faktur, jatuh tempo, dibayar, diterima oleh | dicatat siapa saja yang menerima dokumen (biasanya Mas Heri); bayar hanya Owner & Keuangan; no. invoice per supplier tidak boleh dobel |
| `documents` | arsip foto/PDF (surat jalan, invoice, faktur, bukti) per no. PO / dokumen | maks 5 MB |
| `marketplace_imports`, `sku_mappings` | riwayat import laporan marketplace & pemetaan SKU → kode barang | anti dobel per toko + no. pesanan |
| `opname_sessions` | hasil stok opname: per barang stok sistem, hitung fisik, selisih | |
| `audit_trail`, `system_logs` | riwayat perubahan | riwayat akun & pengaturan khusus Owner |

## Map PO (arsip per PO)

Meniru map kertas Paletindo: **PO → surat jalan 1..n → invoice → faktur → pembayaran**.

- 1 PO bisa beberapa surat jalan (`purchase_orders.receipts`, masing-masing dengan foto di `documents`).
- 1 surat jalan hanya untuk 1 PO (no. SJ unik per PO; invoice hanya boleh menunjuk SJ milik PO-nya).
- Invoice & faktur ditautkan ke PO (`supplier_invoices.po_id`) dan ke surat jalan yang ditagih (`sj_nos`).
- Halaman PO menampilkan centang kelengkapan, timeline berurutan tanggal, kontak supplier (tombol WA minta kirim ulang dokumen), dan sisa hutang. Lembar sampul map bisa dicetak (`#/cetak/map-po/:id`).

## Endpoint aksi bisnis (`POST /api/palora/...`)

| Endpoint | Fungsi | Role |
|---|---|---|
| `po/state` | PO draft → dikirim; batal (bila belum ada penerimaan); sebagian → selesai = **tutup PO kurang** (wajib alasan, barang yang kurang dicatat) | Owner, Gudang |
| `po/receive` | terima barang bertahap per surat jalan supplier (+ foto), rusak tidak masuk stok; melebihi sisa PO hanya dengan `over_reason`; no. surat jalan yang sudah dipakai PO lain dari supplier yang sama ditolak (1 SJ = 1 PO); harga modal master diperbarui ke harga PO | Owner, Gudang |
| `payment` | catat DP / pelunasan / cicilan / bayar supplier, tidak boleh melebihi sisa; status pesanan diperbarui otomatis | lihat tabel hak akses |
| `orders/release` | izinkan barang keluar sebelum lunas (pelanggan tempo) | Owner |
| `orders/dispatch` | keluarkan barang: dikirim (terbit surat jalan) atau diambil sendiri; stok terpotong. `lines` [{index, qty}] = **kirim bertahap** (1 pesanan beberapa surat jalan); status "dikirim" setelah semua keluar | Owner, Gudang |
| `deliveries/received` | konfirmasi surat jalan diterima customer | Owner, Gudang |
| `orders/cancel` | batalkan pesanan sebelum ada barang keluar (yang sudah dibayar: Owner) | Owner, Gudang |
| `orders/return` | **retur** barang yang sudah keluar: `refund` (tagihan dihitung ulang, kelebihan bayar dikembalikan; dana keluar hanya Owner/Keuangan) atau `ganti` (baris dibuka lagi untuk dikirim ulang). Kondisi baik masuk stok (mutasi RETUR), rusak tidak | Owner, Gudang, Keuangan |
| `printed` | catat nota/invoice/surat jalan/PO yang dicetak ke riwayat dokumen | semua |
| `kasir/checkout` | penjualan langsung: nota NT, stok terpotong, pembayaran tercatat | Owner, Gudang |
| `stock/adjust` | koreksi stok satu barang (wajib alasan) | Owner, Gudang |
| `opname/apply` | stok opname; hanya baris yang dihitung yang disesuaikan. Selisih = hitung fisik − stok sistem **saat dihitung** (`system_at_count`), jadi transaksi selama opname tidak ikut dikoreksi | Owner, Gudang |
| `products/import` | import/update master barang dari Excel (kolom kosong tidak menimpa data) | Owner, Gudang |
| `marketplace/import` | import laporan marketplace; `dry_run` untuk preview & SKU yang belum dikenal | Owner, Gudang |

## Hak akses (PRD 6.7)

| Fitur | Owner | Gudang & Kasir | Keuangan |
|---|---|---|---|
| Lihat stok, pesanan, PO, surat jalan, arsip | Ya | Ya | Ya |
| Buat pesanan, kasir, PO, terima barang, surat jalan | Ya | Ya | – |
| Master barang, koreksi stok, opname, marketplace | Ya | Ya | – |
| Catat DP / pelunasan **sebelum** barang keluar | Ya | Ya | Ya |
| Piutang setelah barang keluar, hutang supplier, laporan | Ya | – | Ya |
| Izin kirim sebelum lunas | Ya | – | – |
| Pengguna, pengaturan perusahaan, aktivitas sistem | Ya | – | – |

Semua aturan di atas dicek **di server**; tampilan hanya menyembunyikan tombol yang tidak boleh dipakai.
Dibuktikan oleh test integrasi di `tests/integration/api.test.js` (termasuk percobaan menembus API biasa).
