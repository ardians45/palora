# Spesifikasi Desain: Redesain UI Modern Palora ERP

**Tanggal:** 23 September 2026  
**Status:** Menunggu Konfirmasi Pengguna  
**Referensi:** Gambar Dashboard Modern SaaS (Clean Light Canvas, Obsidian Featured Card, Metric Cards dengan Panah ↗, Aksen Violet `#5C59F7`, dan Sidebar In-Module)

---

## 1. Latar Belakang & Tujuan
Aplikasi Palora (Sistem ERP PT Paletindo Prakarsa Unggul) telah memiliki fungsionalitas modular yang lengkap mencakup 9 modul operasional (Penjualan, Pembelian/PO, Gudang, Surat Jalan, Piutang, Arsip Dokumen, Marketplace, Master Data, dan Laporan). 

Tujuan dari redesain ini adalah memperbarui gaya antarmuka (UI/UX) agar memiliki estetika premium berstandar internasional sesuai gambar referensi:
1. **Palet Warna & Estetika**: Kanvas bersih abu-abu lembut (`#F4F6FA`), kartu putih bersih berbayang halus (`#FFFFFF`, `border-radius: 20px`), aksen violet/indigo modern (`#5C59F7`), serta kartu *featured* obsidian gelap (`#161922`).
2. **Halaman Depan (App Launcher)**: Berbentuk grid kartu metrik modular yang masing-masing menampilkan angka *live*, tombol panah diagonal `↗`, ikon melingkar, dan *pill badge* status.
3. **Navigasi Dalam Modul (In-Module Sidebar)**: Saat modul dibuka, sidebar navigasi kiri otomatis muncul dengan tombol "← Beranda" dan 9 modul ERP, di mana modul aktif memiliki sorotan *pill* ungu solid (`#5C59F7`).
4. **Integritas Modul & Alur Bisnis**: Seluruh logika bisnis, status *order*, SOP DP 25%, validasi tahan pengiriman, pembuat PO pabrik, cetak Surat Jalan, dan *localStorage persistence* dipertahankan 100% tanpa kompromi.

---

## 2. Arsitektur Komponen & Layout

### 2.1 State & Routing Terpusat (`App.jsx`)
* **State Utama**:
  * `activeModule`: Objek modul yang sedang aktif, atau `null` untuk halaman depan.
  * `currentRole`: Role pengguna aktif (Mas Heri, Pak Yanto, Bude Keuangan).
  * Data persisten: `products`, `orders`, `purchaseOrders`, `deliveries`, `customers`, `suppliers`, `documents`.
  * `printModal`: Kontrol preview cetak dokumen resmi PT Paletindo.
* **Kondisi Tampilan**:
  * `!activeModule` (Halaman Home): Merender `Navbar` atas + `AppLauncher` (Grid Kartu Metrik Modern + SOP Banner).
  * `activeModule` (Dalam Modul): Merender layout 2 kolom:
    * **Kolom Kiri**: `Sidebar` (lebar 260px) berisi logo, tombol kembali, dan daftar 9 modul.
    * **Kolom Kanan**: `ModuleHeader` (breadcrumb, judul modul, search) + Konten modul aktif (`SalesModule`, `PurchaseModule`, dll).

### 2.2 Komponen Sidebar (`src/components/Sidebar.jsx`)
* **Tampilan**:
  * Logo Palora dengan ikon modern dan nama perusahaan.
  * Tombol navigasi cepat: `← Menu Utama`.
  * Bagian `Modul ERP`: 9 item modul dengan ikon Lucide.
  * Modul yang aktif menggunakan class `.sidebar-item-active` dengan background `#5C59F7`, teks dan ikon putih, serta efek radius halus (seperti tombol "Dashboard" di contoh).
  * Bagian bawah sidebar: Info pengguna & switcher role praktis.

### 2.3 Komponen Navbar (`src/components/Navbar.jsx`)
* Dioptimalkan untuk halaman depan:
  * Brand badge "PALORA - PT Paletindo Prakarsa Unggul".
  * Search bar bergaya pill membulat.
  * Notification bell dengan dot indikator.
  * Role Switcher dikemas menyerupai dropdown bahasa (`EN ▾`) di contoh yang bersih dan rapi.

### 2.4 Komponen AppLauncher (`src/components/AppLauncher.jsx`)
Grid kartu modul dirombak menjadi **Executive Metric Cards**:
1. **Kartu Penjualan & Kasir (Featured Dark Card)**:
   * Background: Obsidian Dark `#161922` / `#1E202B`.
   * Teks putih bersih dengan aksen hijau neon.
   * Nilai Live: Total omzet pesanan / jumlah pesanan aktif.
   * Badge: `+25% SOP DP Aman`.
   * Tombol `↗` di pojok kanan atas.
2. **Kartu Gudang & Stok**:
   * Background: Putih bersih `#FFFFFF`.
   * Nilai Live: Total stok unit fisik (`1,603 Units`).
   * Visual: Mini bar sparkline visual untuk stok barang.
   * Badge: `1 Stok Rendah`.
3. **Kartu Pembelian & PO**:
   * Nilai Live: Jumlah PO pending ke pabrik Maspion / Maxipack.
   * Badge: `1 Menunggu Konfirmasi`.
4. **Kartu Surat Jalan & Pengiriman**:
   * Nilai Live: Jumlah pengiriman siap jalan & armada aktif.
   * Badge: `1 Siap Jalan`.
5. **Kartu Piutang & Kas**:
   * Nilai Live: Total nominal piutang customer tempo.
   * Badge: `2 Jatuh Tempo`.
6. **Kartu Arsip Dokumen**:
   * Nilai Live: Dokumen fisik terverifikasi (SJ & Faktur Pajak).
7. **Kartu Marketplace Sync**:
   * Nilai Live: Integrasi Excel Shopee & Tokopedia.
8. **Kartu Master Data**:
   * Nilai Live: 4 Pelanggan & 4 Supplier Pabrik.
9. **Kartu Laporan & Rekap**:
   * Nilai Live: Analisis margin & perputaran stok.
10. **Banner SOP Operasional Paletindo**:
    * Box modern di bawah grid dengan panduan Mas Heri: "Minimal DP 25% | Barang Tidak Boleh Dikirim Sebelum Lunas".

---

## 3. Desain Sistem & Tokens CSS (`src/index.css`)

```css
:root {
  /* Brand Accent */
  --primary: #5c59f7;
  --primary-hover: #4d4ae0;
  --primary-light: #eef0fe;
  
  /* Obsidian Dark Card */
  --card-dark: #161922;
  --card-dark-surface: #222531;
  --card-dark-border: rgba(255, 255, 255, 0.08);

  /* Neutrals & Surfaces */
  --bg-app: #f4f6fa;
  --bg-card: #ffffff;
  --border-subtle: #eaeff5;
  --border-hover: #d5dde8;

  /* Typography */
  --text-main: #111827;
  --text-muted: #6b7280;
  --text-subtle: #9ca3af;

  /* Radii */
  --radius-card: 20px;
  --radius-pill: 9999px;
  --radius-btn: 12px;

  /* Elevation */
  --shadow-subtle: 0 2px 10px rgba(16, 24, 40, 0.04);
  --shadow-hover: 0 12px 24px -4px rgba(16, 24, 40, 0.08);
}
```

---

## 4. Penjaminan Alur & Modul Bisnis (No Breaking Changes)
* **SalesModule**: Form kasir, kalkulasi DP 25%, pesan peringatan "Barang Ditahan", cetak nota.
* **PurchaseModule**: Filter per pabrik (1 PO = 1 Supplier), kalkulasi total beli, tombol simpan & cetak PO.
* **InventoryModule**: Pencarian multi-kategori, stok opname cepat, penyesuaian stok fisik vs sistem.
* **DeliveryModule**: Pembuatan surat jalan, pemilihan supir & plat kendaraan, integrasi nota lunas.
* **ReceivablesModule**: Kartu piutang, pelunasan sisa tagihan, peringatan jatuh tempo.
* **DocumentModule**: Manajemen berkas arsip PDF/foto stempel basah.
* **MarketplaceModule**: Import simulasi order Shopee/Tokopedia untuk potong stok otomatis.
* **MasterDataModule**: Tambah/edit data pelanggan dan pabrik rekanan.
* **ReportsModule**: Grafik performa, rekapitulasi laba kotor & omzet.
* **PrintModal**: Kop surat resmi PT Paletindo Prakarsa Unggul, format Surat Jalan & Nota Resmi.

---

## 5. Rencana Verifikasi
1. **Pengujian Tampilan Home**:
   - Memastikan 9 kartu metrik modular terisi data live dan dapat diklik.
   - Memastikan kartu "Penjualan & Kasir" berpenampilan obsidian dark berkontras tinggi dengan tombol `↗`.
2. **Pengujian Transisi In-Module**:
   - Saat salah satu modul diklik, sidebar kiri muncul dengan animasi halus.
   - Modul yang aktif ditandai dengan pill ungu `#5C59F7`.
   - Tombol "← Menu Utama" mengembalikan tampilan ke Home Grid.
   - Pindah antar modul lewat sidebar kiri berlangsung instan tanpa reload.
3. **Pengujian Integritas Alur & SOP**:
   - Buat pesanan baru dengan DP < 25% -> Sistem harus memvalidasi dan memberi peringatan.
   - Pengiriman pesanan yang belum lunas -> Status harus "Tahan Pengiriman".
   - Cetak Surat Jalan dan Nota -> Modal cetak muncul dengan format resmi PT Paletindo.
