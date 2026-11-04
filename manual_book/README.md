# PALORA &mdash; BUKU PANDUAN PENGGUNA (MANUAL BOOK)
### PT Paletindo Prakarsa Unggul &bull; Sistem Internal Gudang & Operasional
**Versi Dokumen:** 2.0 &bull; **Tanggal Rilis:** November 2026 &bull; **Status:** Production Ready

---

## 📌 Ringkasan Eksekutif

Folder `manual_book/` berisi dokumentasi resmi dan buku panduan operasional (User Manual Book) untuk sistem internal **PALORA v2.0** milik **PT Paletindo Prakarsa Unggul**. Dokumentasi ini dirancang khusus mengikuti alur kerja nyata perusahaan (flow lama tetap dipertahankan, namun seluruh pencatatan kini terdigitalisasi, real-time, bebas dari kesalahan tulis tangan, dan memiliki audit trail transparan).

Setiap modul sistem telah dibuatkan **buku panduan individual berformat PDF**, lengkap dengan:
1. Tangkapan layar antarmuka asli (high-resolution screenshots dari peramban/Edge).
2. Peta alur proses bisnis hulu ke hilir.
3. Petunjuk langkah demi langkah pengoperasian layar (*step-by-step walkthrough*).
4. Penjelasan aturan bisnis server (DP 25%, kuantitas rusak tidak masuk stok, harga tawar fleksibel, dsb.).
5. Matriks hak akses per peran pengguna (*role personas*).
6. Panduan mitigasi kendala dan FAQ operasional.

Selain 10 buku manual individual per modul, tersedia juga **1 Buku Panduan Induk Lengkap (`MANUAL_BOOK_LENGKAP_PALORA.pdf`)** yang menggabungkan seluruh modul dalam satu dokumen master setebal 50+ ribu karakter teks terstruktur.

---

## 📂 Struktur Direktori Folder `manual_book/`

```text
manual_book/
├── README.md                                  <- Dokumen Indeks Panduan (file ini)
├── pdf/                                       <- File Dokumen PDF Siap Cetak & Distribusi
│   ├── 00_Panduan_Umum_dan_Navigasi_Sistem.pdf
│   ├── 01_Modul_Penjualan_dan_Kasir.pdf
│   ├── 02_Modul_Pembelian_PO_dan_Penerimaan.pdf
│   ├── 03_Modul_Stok_Gudang_dan_Inventaris.pdf
│   ├── 04_Modul_Keuangan_Piutang_dan_Hutang.pdf
│   ├── 05_Modul_Marketplace_MultiChannel.pdf
│   ├── 06_Modul_Arsip_Dokumen_Digital.pdf
│   ├── 07_Modul_Laporan_dan_Analitik_Bisnis.pdf
│   ├── 08_Modul_Master_Data_dan_Katalog.pdf
│   ├── 09_Modul_Administrasi_dan_Keamanan_Sistem.pdf
│   └── MANUAL_BOOK_LENGKAP_PALORA.pdf          <- Buku Induk Master Seluruh Modul
├── assets/
│   └── screenshots/                           <- 30 File Tangkapan Layar Asli Aplikasi
│       ├── 00_login.png
│       ├── 01_launcher_owner.png
│       ├── 02_penjualan_list.png
│       ├── ... (30 screenshots lengkap)
│       └── 29_launcher_keuangan.png
└── src/                                       <- File Sumber HTML & CSS Mandiri
    ├── 00_Panduan_Umum_dan_Navigasi_Sistem.html
    ├── 01_Modul_Penjualan_dan_Kasir.html
    ├── ...
    └── MANUAL_BOOK_LENGKAP_PALORA.html
```

---

## 📚 Daftar Buku Panduan & Matriks Peran Pengguna

| No | Kode Dokumen | Nama File PDF | Judul Panduan Modul | Target Pengguna (Persona) |
|---|---|---|---|---|
| **0** | `MB-00/PLR/2026` | [`00_Panduan_Umum_dan_Navigasi_Sistem.pdf`](pdf/00_Panduan_Umum_dan_Navigasi_Sistem.pdf) | Panduan Umum, Hak Akses & Navigasi Sistem | **Semua Tim** (Pak Yanto, Mas Heri, Bude) |
| **1** | `MB-01/PLR/2026` | [`01_Modul_Penjualan_dan_Kasir.pdf`](pdf/01_Modul_Penjualan_dan_Kasir.pdf) | Modul Penjualan, Kasir Walk-in & Surat Jalan | **Mas Heri** (Gudang/Kasir), **Pak Yanto** (Owner) |
| **2** | `MB-02/PLR/2026` | [`02_Modul_Pembelian_PO_dan_Penerimaan.pdf`](pdf/02_Modul_Pembelian_PO_dan_Penerimaan.pdf) | Modul Pembelian (PO) & Penerimaan Barang Masuk | **Pak Yanto** (Owner), **Mas Heri** (Gudang) |
| **3** | `MB-03/PLR/2026` | [`03_Modul_Stok_Gudang_dan_Inventaris.pdf`](pdf/03_Modul_Stok_Gudang_dan_Inventaris.pdf) | Modul Stok Gudang, Mutasi & Stock Opname | **Mas Heri** (Gudang), **Pak Yanto** (Owner) |
| **4** | `MB-04/PLR/2026` | [`04_Modul_Keuangan_Piutang_dan_Hutang.pdf`](pdf/04_Modul_Keuangan_Piutang_dan_Hutang.pdf) | Modul Keuangan: Piutang Customer & Hutang Supplier | **Bude** (Keuangan), **Pak Yanto** (Owner) |
| **5** | `MB-05/PLR/2026` | [`05_Modul_Marketplace_MultiChannel.pdf`](pdf/05_Modul_Marketplace_MultiChannel.pdf) | Modul Marketplace Multi-Channel | **Mas Heri** (Gudang), **Pak Yanto** (Owner) |
| **6** | `MB-06/PLR/2026` | [`06_Modul_Arsip_Dokumen_Digital.pdf`](pdf/06_Modul_Arsip_Dokumen_Digital.pdf) | Modul Arsip Dokumen Digital per PO | **Bude** (Keuangan), **Mas Heri** (Gudang) |
| **7** | `MB-07/PLR/2026` | [`07_Modul_Laporan_dan_Analitik_Bisnis.pdf`](pdf/07_Modul_Laporan_dan_Analitik_Bisnis.pdf) | Modul Laporan & Analitik Bisnis | **Pak Yanto** (Owner), **Bude** (Keuangan) |
| **8** | `MB-08/PLR/2026` | [`08_Modul_Master_Data_dan_Katalog.pdf`](pdf/08_Modul_Master_Data_dan_Katalog.pdf) | Modul Master Data (Pelanggan, Supplier & Produk) | **Pak Yanto** (Owner), **Mas Heri** (Gudang) |
| **9** | `MB-09/PLR/2026` | [`09_Modul_Administrasi_dan_Keamanan_Sistem.pdf`](pdf/09_Modul_Administrasi_dan_Keamanan_Sistem.pdf) | Modul Administrasi, Keamanan & Pengaturan Sistem | **Pak Yanto** (Owner) |
| **⭐** | `MB-MASTER/PLR/2026` | [`MANUAL_BOOK_LENGKAP_PALORA.pdf`](pdf/MANUAL_BOOK_LENGKAP_PALORA.pdf) | **Buku Panduan Operasional Lengkap PALORA** | **Seluruh Jajaran Manajemen & Operasional** |

---

## 🎯 Detail Ringkasan Tiap Modul Panduan

### 1. Modul 00: Panduan Umum, Hak Akses & Navigasi Sistem
- Latar belakang bisnis PT Paletindo Prakarsa Unggul dan alasan pemisahan PALORA dari situs katalog publik.
- 4 Prinsip Desain: Flow lama tetap, satu layar sedikit klik, harga tawar fleksibel, dan keamanan transaksi atomik server.
- Prosedur login resmi, keamanan akun, navigasi launcher ikon, dan badge status tugas tertunda.

### 2. Modul 01: Modul Penjualan, Kasir Walk-in & Surat Jalan
- Siklus pesanan grosir B2B vs transaksi ritel kasir gudang B2C.
- Prosedur pembuatan pesanan baru, penyesuaian harga satuan, aturan DP minimal 25%, dan pelunasan nota.
- Kasir Walk-in 3 langkah kilat: scan/ketik SKU, penyesuaian harga nego, dan hitung uang kembalian otomatis.
- Penerbitan Surat Jalan A5 kop resmi Paletindo dengan pemotongan stok otomatis saat armada berangkat.

### 3. Modul 02: Modul Pembelian (PO) & Penerimaan Barang Masuk
- Hubungan cetak plastik dengan pabrik supplier pihak ketiga (1 PO = 1 Supplier).
- Formulir PO baru dengan nomor dokumen otomatis dan auto-fill harga modal fleksibel.
- Prosedur penerimaan barang masuk bertahap (multi-SJ pabrik), cek kuantitas baik vs rusak, dan upload foto fisik SJ dari kamera HP.
- Jaminan aturan bisnis: barang rusak tidak masuk stok fisik gudang.

### 4. Modul 03: Modul Stok Gudang, Mutasi & Stock Opname
- Katalog 451+ produk plastik rumah tangga dengan foto asli, filter kategori, dan pencegahan tertukar kode barang (contoh: 2808 vs 2288).
- Penelusuran Kartu Stok dan audit trail riwayat mutasi masuk/keluar per barang.
- Prosedur Stock Opname fisik aman: cetak lembar hitung opname, input fisik, dan kalkulasi selisih otomatis.
- Jaminan proteksi opname: **hanya barang yang dihitung yang disesuaikan**, barang lain tidak akan tertimpa.
- Pengaturan Harga Modal produk khusus akun Owner.

### 5. Modul 04: Modul Keuangan: Piutang Customer & Hutang Supplier
- Pemantauan daftar piutang penjualan tempo, tanggal jatuh tempo, dan umur piutang (*aging*).
- Fitur **Tagih via WhatsApp 1 Klik**: otomatis membuka chat WA dengan pesan santun berisi rincian nota, saldo tagihan, dan nomor rekening resmi.
- Pengelolaan daftar hutang supplier per nomor PO, tanggal jatuh tempo invoice pabrik, dan pencatatan bukti transfer pembayaran.

### 6. Modul 05: Modul Marketplace Multi-Channel
- Pengelolaan multi-toko online: Shopee (3 akun), Tokopedia (2 akun), Lazada (1 akun), Blibli (1 akun).
- Prosedur download laporan transaksi dari Seller Center masing-masing marketplace.
- Upload file laporan ke PALORA, verifikasi pencocokan kode SKU otomatis, dan layar pratinjau pemotongan stok sebelum eksekusi final.

### 7. Modul 06: Modul Arsip Dokumen Digital per PO
- Menjawab masalah dokumen fisik yang tercecer di meja gudang.
- Konsep Map Digital terpadu per nomor PO: menyatukan PO, foto SJ penerimaan, invoice supplier, dan faktur pajak.
- Indikator kelengkapan berkas (*Lengkap* vs *Belum Lengkap*) dan fitur pencarian kilat untuk audit keuangan/pajak.

### 8. Modul 07: Modul Laporan & Analitik Bisnis
- Dashboard laporan eksekutif untuk Pak Yanto dan Bude.
- Laporan omset penjualan, produk terlaris (*fast-moving*), belanja modal pabrik, dan valuasi aset persediaan gudang.
- Fitur ekspor laporan ke format Excel asli (`.xlsx`) dan cetak PDF.

### 9. Modul 08: Modul Master Data (Pelanggan, Supplier & Produk)
- Standarisasi database pelanggan B2B dan ketentuan limit tempo.
- Database supplier/pabrik cetak rekanan, kontak PIC, dan rekening bank resmi.
- Katalog master 451+ produk: standarisasi penamaan `[Jenis Barang] [Kode] [Warna]` untuk mencegah barang tertukar.

### 10. Modul 09: Modul Administrasi, Keamanan & Pengaturan Sistem
- Manajemen akun karyawan dan pembagian peran (*Role-Based Access Control* / RBAC).
- Pengawasan Audit Trail & Log Aktivitas (mencatat siapa melakukan apa dan kapan secara permanen).
- Pengaturan profil perusahaan, alamat gudang, nomor kontak, rekening bank, dan teks kop surat.
- Prosedur backup database harian otomatis (`backup-palora.bat`) dan pemulihan darurat (*disaster recovery*).

---

## 🛠️ Cara Menghasilkan Ulang Dokumen (Re-compile)

Apabila di kemudian hari terdapat pembaruan tampilan antarmuka atau penambahan modul baru pada aplikasi PALORA, dokumentasi ini dapat diperbarui dan dicetak ulang secara otomatis melalui perintah berikut:

```bash
# 1. Mengambil ulang tangkapan layar antarmuka dari server yang sedang berjalan
node scripts/capture-screenshots.mjs

# 2. Mengompilasi seluruh file PDF dan file HTML sumber
node scripts/compile-manuals.mjs
```

---

&copy; 2026 PT Paletindo Prakarsa Unggul. Seluruh hak cipta dilindungi undang-undang.
