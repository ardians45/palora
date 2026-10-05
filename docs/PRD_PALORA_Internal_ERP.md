# Product Requirements Document (PRD)
# PALORA — Sistem Internal ERP PT Paletindo Prakarsa Unggul

**Versi:** 1.0  
**Tanggal:** 23 September 2026  
**Status:** Draft / Active Baseline  
**Penulis:** Tim Pengembang (Proyek Kampus / Project Work)  
**Sumber Utama:** Transkrip Wawancara Operasional (`referensi/wawancara/perekaman-standar-17-mp3_dengan_penanda_waktu.txt`) & Dokumen Project Work PALORA

---

## 1. Latar Belakang & Konteks

### 1.1 Tentang PT Paletindo Prakarsa Unggul

PT Paletindo Prakarsa Unggul adalah distributor produk plastik rumah tangga (keranjang, kotak makan, botol, dll.) yang beroperasi dengan model bisnis B2B dan B2C. Produk dibuat menggunakan cetakan milik Paletindo melalui jasa cetak pihak ketiga, lalu didistribusikan melalui gudang sendiri maupun marketplace.

**Saluran penjualan aktif:**
- Shopee: 3 akun toko
- Tokopedia: 2 akun toko
- Lazada: 1 akun
- Blibli: 1 akun
- Penjualan langsung (walk-in / telepon / WhatsApp)

### 1.2 Masalah Utama yang Dihadapi

Berdasarkan hasil wawancara mendalam dengan tim operasional (rekaman Standar 17), ditemukan pain point utama berikut:

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | **Stok tidak real-time** - Data Excel Mas Heri sering tidak sinkron dengan stok fisik gudang | Pak De harus telfon/WhatsApp Mas Heri setiap kali ada pesanan untuk konfirmasi ketersediaan |
| 2 | **PO sering salah** - Pak Yanto sering salah tulis nama barang, kode, dan nominal harga di PO | Barang telat datang, salah kirim, kerugian waktu dan biaya |
| 3 | **Dokumen fisik sering hilang** - Surat jalan, invoice, faktur pajak yang ditaruh di meja/keranjang sering hilang | Harus kontak ulang ke supplier, proses accounting terhambat |
| 4 | **Tidak ada tracking piutang** - Pelanggan tempo tidak terpantau, ada yang berbulan-bulan belum bayar | Potensi kehilangan pendapatan |
| 5 | **Tidak ada audit trail** - Tidak bisa tahu siapa mengubah apa dan kapan | Sulit investigasi ketika terjadi selisih stok |
| 6 | **Ketidaksesuaian kode barang** - Barang dengan kode mirip sering tertukar (contoh: 2808 vs 2288) | Salah kirim barang ke customer |

### 1.3 Mengapa Sistem Baru yang Terpisah?

> **KRITIS:** Aplikasi ini **BUKAN** pengembangan dari paletindo.id. Aplikasi ini adalah sistem internal operasional yang **sepenuhnya terpisah** dari website katalog publik.

1. **paletindo.id** = Katalog publik untuk calon pembeli mengakses produk
2. **PALORA** = Sistem operasional internal untuk tim Paletindo (Mas Heri, Pak Yanto/Pak De, Bude)
3. Sistem lama yang pernah dibuat sebelumnya **tidak dipakai** karena memaksa tim mengubah alur kerja - sistem baru ini harus **mengikuti flow yang sudah ada**, bukan sebaliknya

---

## 2. Visi & Tujuan Produk

### 2.1 Visi

> "Mendigitalisasi operasional gudang dan transaksi Paletindo tanpa mengubah cara kerja tim, sehingga lebih mudah, lebih cepat, dan bebas dari kesalahan manual."

### 2.2 Tujuan Utama

1. **Stok real-time** - Siapa pun bisa lihat stok terkini tanpa harus menghubungi Mas Heri
2. **PO tanpa kesalahan** - Generate dokumen PO otomatis dari data master barang
3. **Dokumen digital** - Semua surat jalan, invoice, faktur tersimpan dan tidak bisa hilang
4. **Tracking piutang** - Semua transaksi tempo terpantau beserta riwayat pembayarannya
5. **Audit trail** - Semua perubahan data tercatat

---

## 3. Pengguna (User Personas)

### Persona 1: Mas Heri - Admin Gudang

- **Tugas:** Terima barang masuk, proses penjualan langsung (walk-in), update stok
- **Perangkat:** Komputer desktop di gudang
- **Pain point:** Banyak klik, banyak tab, UI yang membingungkan
- **Kebutuhan:** Antarmuka yang **sangat simpel** - satu flow dari awal sampai selesai tanpa banyak berpindah halaman

### Persona 2: Pak Yanto / Pak De - Owner & Manajer Operasional

- **Tugas:** Buat PO ke supplier, terima pesanan dari customer besar, urus invoice
- **Perangkat:** Laptop / HP
- **Pain point:** Sering salah tulis PO, harus bolak-balik cek harga
- **Kebutuhan:** Form PO yang auto-fill harga dari master data, bisa langsung kirim via WhatsApp/email

### Persona 3: Bude (Ibu) - Administrasi & Keuangan

- **Tugas:** Rekap dokumen, urus faktur pajak, rekap pembukuan
- **Perangkat:** Laptop / HP
- **Pain point:** Dokumen fisik sering hilang, tidak bisa tracking piutang
- **Kebutuhan:** Akses ke semua dokumen digital, daftar tagihan, laporan keuangan sederhana

---

## 4. Ruang Lingkup Sistem

### 4.1 DALAM LINGKUP (In Scope) - MVP

#### Modul 1: Master Data
- Manajemen data produk (kode SKU, nama, ukuran, harga modal, harga jual)
- Manajemen data supplier (nama, kontak, email, nomor WhatsApp)
- Manajemen data customer

#### Modul 2: Purchase Order (PO ke Supplier)
- Buat PO ke supplier dengan auto-fill nama barang dan harga dari master
- Nomor PO otomatis (terformat: PO-YYYYMM-XXXX)
- Satu PO hanya ke satu supplier
- Satu PO bisa memiliki beberapa surat jalan (karena muatan mobil terbatas)
- Generate dokumen PO sebagai PDF
- Kirim PO langsung via tombol WhatsApp / Email ke kontak supplier
- Status tracking PO: Draft, Dikirim, Sebagian Diterima, Selesai

#### Modul 3: Penerimaan Barang (Goods Receipt)
- Input barang masuk berdasarkan PO
- Upload foto surat jalan dari supplier (mobile-friendly)
- Stok otomatis bertambah saat barang diterima
- Penanganan kondisi barang rusak/cacat (stok tidak bertambah untuk item cacat)

#### Modul 4: Pesanan Customer (Sales Order)
- Terima pesanan dari customer (B2B telepon/WA atau walk-in)
- Status pesanan: Masuk, DP Diterima, Diproses, Siap Kirim, Lunas, Selesai
- Aturan bisnis: Pesanan hanya diproses setelah DP minimal 25%; barang baru dikirim/diambil setelah LUNAS
- Harga per item bisa diedit saat membuat nota (untuk diskon/deal harga)

#### Modul 5: Sistem Kasir / POS (Walk-in)
- Antarmuka kasir sederhana untuk penjualan langsung
- Pilih barang, isi quantity, harga bisa diedit, cetak nota
- Stok otomatis terpotong saat transaksi selesai

#### Modul 6: Dokumen Digital
- Nota/Invoice: digenerate otomatis, bisa di-print atau di-share via WhatsApp
- Surat Jalan: digenerate otomatis untuk pengiriman, bisa upload foto surat jalan fisik dari supplier
- Semua dokumen disimpan di cloud (tidak bisa hilang)

#### Modul 7: Manajemen Stok
- Dashboard stok real-time per produk (kode, nama, jumlah tersedia)
- Riwayat mutasi stok (masuk dari PO, keluar dari SO/POS)
- Import stok awal dari Excel (untuk migrasi data Mas Heri)
- Import laporan penjualan dari Shopee (CSV/Excel) untuk update stok marketplace

#### Modul 8: Piutang & Tagihan
- Daftar customer dengan transaksi tempo
- Tracking status pembayaran (sudah bayar berapa, sisa berapa, jatuh tempo kapan)
- Riwayat cicilan pembayaran
- Notifikasi/pengingat jatuh tempo

#### Modul 9: Audit Trail & Log Aktivitas
- Rekam semua aksi pengguna: siapa, aksi apa, kapan, data apa yang diubah
- Tampilan log per modul dan per pengguna

### 4.2 LUAR LINGKUP (Out of Scope) - Fase 1

- Integrasi API langsung dengan Shopee/Tokopedia/Lazada/Blibli (gunakan import manual CSV)
- Modul akuntansi lengkap / pembukuan double-entry
- Manajemen multi-gudang (saat ini 1 gudang)
- Faktur pajak (dikelola terpisah via aplikasi Coretax/e-Faktur)
- Fitur retur kompleks (fase berikutnya)

---

## 5. Alur Bisnis Utama (Business Flows)

### Flow 1: Pembelian ke Supplier (Purchase Order)

```
Pak De butuh stok
    -> Buat PO di PALORA (pilih supplier, pilih barang + quantity, harga auto-fill)
    -> Generate dokumen PO (PDF)
    -> Kirim ke supplier via WhatsApp/Email (satu klik dari sistem)
    -> Supir/driver ambil barang ke supplier
    -> Mas Heri terima barang + surat jalan dari supplier
    -> Upload foto surat jalan ke sistem, input quantity diterima
    -> Stok otomatis bertambah
    -> [Opsional] Invoice dari supplier diunggah ke sistem
```

### Flow 2: Penjualan ke Customer (B2B Order)

```
Customer telepon/WA Pak De minta barang
    -> Pak De cek stok di PALORA (tanpa harus telfon Mas Heri!)
    -> Deal harga -> Pak De buat Sales Order di sistem
    -> Cetak/kirim nota DP ke customer via WhatsApp
    -> Customer kirim bukti transfer DP (minimal 25%)
    -> Status SO update: "DP Diterima" -> bisa diproses
    -> Mas Heri siapkan barang, cek stok via sistem
    -> Customer lunasi sisa pembayaran
    -> Status SO update: "Lunas" -> barang boleh keluar
    -> [Jika dikirim] Generate surat jalan, stok terpotong
    -> [Jika ambil sendiri] Konfirmasi pengambilan, stok terpotong
    -> Pesanan selesai
```

### Flow 3: Penjualan Langsung / Walk-in (POS)

```
Customer datang ke gudang
    -> Mas Heri buka modul POS
    -> Pilih barang, input quantity, edit harga jika ada diskon
    -> Customer bayar tunai/transfer
    -> Cetak nota
    -> Stok otomatis terpotong
```

### Flow 4: Update Stok dari Marketplace

```
Mas Heri / Admin download laporan penjualan dari Shopee/Tokped (CSV/Excel)
    -> Upload file ke PALORA
    -> Sistem baca data, cocokkan kode barang
    -> Sistem tampilkan preview: barang apa, berapa yang keluar
    -> Admin konfirmasi -> stok terpotong otomatis
```

---

## 6. Kebutuhan Fungsional Detail

### 6.1 Master Data Produk
- F-P01: Setiap produk memiliki: Kode SKU (unik), Nama Barang, Ukuran/Dimensi, Warna tersedia, Harga Modal (editable), Harga Jual (editable), Stok Saat Ini
- F-P02: Kode yang sama bisa memiliki banyak warna; stok dihitung per kode SKU
- F-P03: Import produk dari file Excel dengan format yang disediakan
- F-P04: Riwayat perubahan harga tersimpan (audit)
- F-P05: Harga modal dapat diubah saat membuat PO (karena harga supplier fluktuatif)

### 6.2 Purchase Order
- F-PO01: Nomor PO digenerate otomatis: PO-YYYYMM-XXXX
- F-PO02: Satu PO hanya boleh ke satu supplier
- F-PO03: Item PO dipilih dari master produk, harga auto-fill tapi bisa diedit
- F-PO04: Total PO dihitung otomatis (quantity x harga)
- F-PO05: PO bisa digenerate menjadi PDF
- F-PO06: Tombol "Kirim via WhatsApp" membuka WhatsApp dengan pesan + lampiran PO
- F-PO07: Status PO: Draft / Dikirim / Diterima Sebagian / Selesai / Dibatalkan
- F-PO08: Satu PO bisa memiliki beberapa penerimaan (surat jalan terpisah)

### 6.3 Penerimaan Barang
- F-GR01: Input penerimaan harus terhubung ke PO yang ada
- F-GR02: Bisa upload foto surat jalan (jpg/png/pdf, maks 5MB)
- F-GR03: Input quantity diterima per item (boleh sebagian dari total PO)
- F-GR04: Item cacat/rusak tidak masuk stok, dicatat sebagai keterangan
- F-GR05: Stok bertambah otomatis saat penerimaan dikonfirmasi

### 6.4 Sales Order
- F-SO01: Buat SO dengan data: customer, daftar barang, harga per item (editable), catatan
- F-SO02: Harga per item di SO bisa berbeda dari harga jual standar (untuk deal/diskon)
- F-SO03: SO hanya bisa diproses setelah DP minimal 25% dicatat di sistem
- F-SO04: Barang hanya bisa keluar (stok terpotong) setelah status LUNAS
- F-SO05: Generate nota/invoice PDF yang bisa dibagikan via WhatsApp
- F-SO06: Rekam riwayat pembayaran (tanggal, jumlah, metode)
- F-SO07: Untuk pelanggan tempo: tampilkan sisa tagihan dan tanggal jatuh tempo

### 6.5 POS / Kasir
- F-POS01: Antarmuka kasir: search/pilih produk, input qty, edit harga, total otomatis
- F-POS02: Proses transaksi -> cetak nota -> stok terpotong otomatis
- F-POS03: Bisa diakses dari HP (responsive)
- F-POS04: Maksimal 3 langkah dari buka POS sampai nota tercetak

### 6.6 Stok
- F-ST01: Dashboard stok menampilkan semua produk dengan jumlah terkini
- F-ST02: Filter/search berdasarkan kode, nama, atau kategori
- F-ST03: Alert visual ketika stok di bawah batas minimum (batas bisa di-setting)
- F-ST04: Riwayat mutasi stok: tanggal, jenis (masuk/keluar), referensi dokumen, jumlah

### 6.7 Manajemen Pengguna & Hak Akses

| Fitur | Owner/Admin | Admin Gudang (Mas Heri) | Finance (Bude) |
|---|---|---|---|
| Lihat stok | Ya | Ya | Ya |
| Buat PO | Ya | Ya | Tidak |
| Terima barang | Ya | Ya | Tidak |
| Buat Sales Order | Ya | Ya | Tidak |
| Akses POS/Kasir | Ya | Ya | Tidak |
| Kelola master produk | Ya | Ya | Tidak |
| Lihat laporan keuangan | Ya | Tidak | Ya |
| Manage piutang | Ya | Tidak | Ya |
| Kelola user | Ya | Tidak | Tidak |

---

## 7. Kebutuhan Non-Fungsional

### 7.1 Platform & Akses
- Berbasis web - bisa diakses dari komputer desktop (Mas Heri), laptop (Pak De), maupun HP
- Login dengan akun dan password

### 7.2 Performa
- Halaman utama (dashboard stok) harus load kurang dari 2 detik
- Upload foto surat jalan harus berhasil dalam 5 detik untuk file maksimal 5MB

### 7.3 Keamanan
- Session login dengan timeout
- Setiap aksi tersimpan di audit log
- Tidak ada data yang bisa dihapus permanen (soft delete)

### 7.4 UX / Kemudahan Penggunaan
- KRITIS: Mas Heri bukan "anak IT" - UI harus intuitif tanpa perlu pelatihan panjang
- Setiap flow utama (buat PO, proses penjualan, terima barang) harus selesai dalam maksimal 5 langkah
- Gunakan bahasa Indonesia di seluruh antarmuka
- Pesan error harus jelas: "Stok tidak cukup, saat ini tersedia 15 pcs" bukan "Error 400"

---

## 8. Prioritas Fitur (MoSCoW)

### Must Have - MVP Fase 1
- Login & manajemen user dengan role
- Master data produk (CRUD + import Excel)
- Master data supplier & customer
- Buat & kirim PO ke supplier
- Input penerimaan barang + upload surat jalan
- Manajemen stok real-time
- Buat Sales Order + rekam DP/pelunasan
- POS / Kasir walk-in
- Generate nota/invoice PDF
- Audit log aktivitas

### Should Have - Fase 2
- Dashboard laporan & statistik (total penjualan, barang terlaris)
- Manajemen piutang lengkap dengan notifikasi jatuh tempo
- Import laporan penjualan marketplace (CSV Shopee)
- Template WhatsApp otomatis untuk kirim PO/nota

---

## 9. Kriteria Penerimaan (Acceptance Criteria)

Sistem dianggap berhasil jika:
1. Mas Heri dapat menerima barang dari PO dan stok terupdate tanpa input manual di Excel
2. Pak Yanto dapat membuat PO tanpa salah kalkulasi harga (sistem hitung otomatis)
3. Pak De dapat cek ketersediaan stok real-time dari HP tanpa menghubungi Mas Heri
4. Dokumen surat jalan tersimpan di sistem dan bisa diakses kapan saja
5. Semua transaksi penjualan tempo terpantau status pembayarannya
6. Seluruh aktivitas pengguna tercatat di log sistem
7. Sistem tidak memaksa tim mengubah alur kerja yang sudah ada

---

## 10. Catatan Penting untuk Tim Pengembang

**[PERINGATAN]** Sistem ini harus mengikuti alur kerja Paletindo, bukan sebaliknya. Sistem ERP sebelumnya gagal digunakan karena memaksa pengguna beradaptasi. Prioritaskan kemudahan penggunaan di atas kelengkapan fitur.

**[PENTING]** Harga barang di Sales Order harus bisa diubah saat membuat nota. Paletindo selalu melakukan negosiasi harga per transaksi - harga jual di master data hanya referensi awal, bukan harga kaku.

**[CATATAN]** Satu PO dapat menghasilkan banyak surat jalan. Ini terjadi karena keterbatasan muatan kendaraan. Sistem harus mendukung penerimaan bertahap dalam satu nomor PO.

**[TIPS]** Untuk UAT, presentasi utama ke Mas Heri karena dia yang paling banyak menggunakan sistem sehari-hari. Pak De hanya pakai untuk buat PO dan invoice.

---
*Dokumen ini dibuat berdasarkan rekaman diskusi tim (Standar 17) dan penelitian skripsi PALORA pada PT Paletindo Prakarsa Unggul.*
