# Plan PALORA v2: Full System, Flow Lama Tetap, UI Rapi

Tanggal: 5 Oktober 2026
Dasar: transkrip wawancara (Standar 17), PRD, contoh dokumen asli di `referensi/dokumen-klien/`,
audit kode saat ini, dan pedoman UI ERP (Odoo, SAP Fiori, NN/g, Carbon, Polaris).

---

## 0. Ringkasan

**Tujuan:** semua transaksi Paletindo tercatat di sistem (pembelian, penerimaan, penjualan,
pembayaran, surat jalan, piutang, hutang, stok), **tanpa mengubah cara kerja mereka**.
Sistem lama gagal karena *"maksa kita ngubah flow kita"* (wawancara 50:06).

**Prinsip:**
1. **Ikuti kertas & Excel mereka.** Kolom tabel, urutan, istilah, dan format dokumen meniru
   `Stok Stok.xlsx`, `PO 37.xlsx`, dan `SURAT JALAN.pdf`. Yang hilang cuma tulis tangan.
2. **Satu layar, sedikit klik.** Mas Heri: *"susah kalau banyak klik-klik yang panjang"* (51:06).
3. **Harga selalu bisa dinego.** Harga master hanya isian awal (01:15:47).
4. **Semua tercatat & bisa dilacak.** Siapa, kapan, ubah apa, plus riwayat bayar per dokumen.
5. **Home tetap launcher ikon per modul** (seperti sekarang), isinya dirapikan.

**Branding:**
- **Aplikasi** (login, navbar, launcher, favicon): logo **PALORA**.
- **Semua dokumen cetak** (Surat Jalan, Nota/Invoice, PO, Tanda Terima): logo & kop
  **PT Paletindo Prakarsa Unggul**.

**Kondisi sekarang (hasil audit):** backend sudah benar (stok atomik, role, audit trail,
upload, 41 test lulus). Masalah ada di frontend prototipe:
- 10 bug fatal, misalnya import marketplace palsu yang memotong stok asli, print rusak,
  buat PO error, dan stock opname bisa mengembalikan stok lama.
- 645 inline style, 70 `alert()`, 3 sistem tabel berbeda.
- Status yang tidak konsisten antar modul.
- 9 dari 26 ikon launcher mengarah ke halaman kosong atau salah.

---

## 1. Peta Flow: Flow Lama → Layar di Sistem

| # | Flow lama (wawancara) | Di sistem | Catatan penting |
|---|---|---|---|
| 1 | Pak De WA pabrik → tulis PO kertas/Excel → kirim WA/email | **Pembelian → PO baru**. Pilih supplier, ketik kode barang, harga modal terisi tapi bisa diubah, total otomatis. **Cetak / Kirim WA / Email** dengan preview dulu. | 1 PO = 1 supplier (29:30). Nomor PO dikontrol Paletindo (03:28). |
| 2 | Supir ambil barang, dapat surat jalan supplier → barang masuk gudang → baru masuk stok | **PO → Terima Barang**. Isi no. SJ supplier, qty baik & rusak per baris, **foto SJ** dari HP. Stok bertambah otomatis. | 1 PO bisa 2–3 SJ (55:22). 1 SJ tidak boleh untuk 2 PO (56:34). Rusak tidak masuk stok (58:15). |
| 3 | SJ ditaruh keranjang, diambil Bude, disusun per PO + invoice | **Arsip per PO**: PO → SJ-SJ → invoice supplier → faktur. Status kelengkapan terlihat. | Arsip tetap per PO (02:02). |
| 4 | Supplier kirim invoice + faktur (tempo / harus lunas) | **Hutang Supplier** (baru, untuk Bude): invoice supplier, jatuh tempo, catat bayar (cicil). | Saat ini fitur ini tercecer di modul PO dan dipegang gudang. Dipindah ke Keuangan. |
| 5 | Customer telp/WA Pak De → cek stok (dulu tanya Heri) → deal harga | **Stok** bisa dilihat semua orang, real-time. **Pesanan baru** dengan harga per baris bisa diubah. | Nama "**Pesanan**", bukan "PO", untuk order customer (32:19). |
| 6 | DP min 25% → nota tulis tangan foto ke WA → lunas → baru kirim | Pesanan: **Catat DP** → **cetak/kirim Nota** (DP & sisa tertulis) → **Catat Pelunasan** → baru bisa **Surat Jalan** / **Serah Ambil Sendiri**. | Tanpa DP = "cuma pesanan", belum diproses (09:00). 1 pesanan = 1 nota (11:27). |
| 7 | Dikirim → surat jalan; ambil sendiri → tanpa SJ | Pesanan Lunas → pilih **Kirim (buat SJ)** atau **Diambil sendiri**. Stok dipotong di langkah itu. | Format SJ meniru kertas asli. |
| 8 | Walk-in, nota tulis tangan, harga bisa diskon | **Kasir**: ketik kode/scan → qty (ketik angka) → harga bisa diubah → Bayar → nota. **Maks 3 langkah.** | Stok langsung terpotong. |
| 9 | Tempo: invoice dikirim, nagih via WA, banyak lupa | **Piutang**: daftar per customer, umur piutang, jatuh tempo, riwayat cicilan, tombol **Tagih via WA** (pesan otomatis + nominal). | Contoh "Ibu Siska" (01:05:24): halaman detail berisi log pembayaran. |
| 10 | Marketplace: download laporan → potong stok manual | **Marketplace → Upload laporan** (Shopee/Tokopedia/Lazada/Blibli) → preview pencocokan kode → konfirmasi → stok terpotong + tercatat sebagai penjualan. | Fitur sekarang **palsu**, harus dibuat ulang. Butuh contoh file laporan asli. |
| 11 | Hitung stok di kertas, opname jarang | **Stock Opname** pakai lembar hitung (cetak atau di HP): isi hasil hitung → sistem tampilkan selisih → simpan hanya baris yang dihitung. | Perbaikan bug opname yang sekarang menimpa semua barang. |
| 12 | Direct ship (supplier → langsung ke customer) | Di PO: tandai baris **"Langsung kirim ke customer"** + pilih pesanan. Diterima = langsung keluar, stok gudang tidak berubah, tapi tercatat. | Fase 2, butuh konfirmasi detail ke klien. |

---

## 2. Aturan UI (Golden Rules ERP, versi Palora)

### 2.1 Navigasi: maksimal 4 level

```
Launcher (ikon)  →  Modul (langsung ke Daftar)  →  Daftar  →  Dokumen
Contoh:  Home → Penjualan → Pesanan → INV-0092/PPU/2026
```

- **Launcher tetap ikon** per modul (gaya sekarang). Hanya ikon yang benar-benar berfungsi:
  satu ikon per modul + beberapa pintasan yang berfungsi (mis. *Kasir*, *Stock Opname*,
  *Jatuh Tempo*). Ikon palsu (*Sewa Armada*, *Tanda Tangan*, *SOP & Bantuan*,
  *Data Karyawan*, *Hubungan Mitra*, *Jadwal Kirim*, *Faktur Pajak*) **dihapus**.
- **Badge angka di ikon = data asli**: jumlah pesanan menunggu, PO belum diterima, stok
  menipis, piutang jatuh tempo. Tidak ada angka hardcode.
- Ikon yang tidak boleh diakses role tersebut **disembunyikan**, bukan di-disable.
- Di dalam modul: **top bar** berisi tombol Home, nama modul, sub-menu modul, dan user.
  Di bawahnya **breadcrumb** yang bisa diklik.
- Setiap dokumen punya URL sendiri (`#/penjualan/pesanan/INV-0092`) supaya bisa dikirim
  lewat WA ke Pak De.

### 2.2 Dua template halaman (dipakai semua modul)

**A. Halaman Daftar**
```
┌──────────────────────────────────────────────────────────────────────┐
│ Penjualan / Pesanan                        [+ Pesanan Baru] [Ekspor] │
│ [Cari no. / customer / kode barang…]  [Filter ▾]  [Kelompok ▾]       │
│ Semua (45) | Menunggu DP (3) | Diproses (5) | Lunas (12) | Selesai   │
├────┬──────────────┬──────────┬───────────────────┬──────────┬───────┤
│ No │ No. Nota     │ Tanggal  │ Customer          │    Total │Status │
│  1 │ INV-0092/PPU │ 05 Okt 26│ Toko Berkah Jaya  │2.871.000 │[DP]   │
├────┴──────────────┴──────────┴───────────────────┴──────────┴───────┤
│ Total (filter aktif)                                    12.450.000  │
│ 1–50 dari 312                                        ‹ 1 2 3 … ›    │
└──────────────────────────────────────────────────────────────────────┘
```

**B. Halaman Dokumen** (pengganti modal-modal sekarang)
```
┌──────────────────────────────────────────────────────────────────────┐
│ Penjualan / Pesanan / INV-0092/PPU/2026                              │
│ [Catat Pelunasan] [Cetak Nota] [Kirim WA] [⋯]                        │
│                        Masuk › DP Diterima › [Lunas] › Dikirim › Selesai │
├──────────────────────────────────────────────────────────────────────┤
│ INV-0092/PPU/2026                                                    │
│ Customer   Toko Plastik Berkah Jaya   │ Tanggal     05 Okt 2026      │
│ UP         Pak Haji Rohman            │ Syarat      Tempo 14 Hari    │
│ PO Cust.   PO-BJ-991                  │ Jatuh tempo 19 Okt 2026      │
├──────────────────────────────────────────────────────────────────────┤
│ No │ Kode │ Nama Barang    │ Warna  │ Qty │ Harga  │ Jumlah            │
│  1 │ 0303 │ Palet FP 0303  │ Coklat │  50 │ 31.900 │ 1.595.000         │
│                                          Total       2.871.000        │
│                                          Dibayar     1.000.000        │
│                                          Sisa        1.871.000        │
├──────────────────────────────────────────────────────────────────────┤
│ Riwayat                                                              │
│ 05 Okt 14:32  Mas Heri   membuat pesanan                             │
│ 05 Okt 14:40  Bude       catat DP Rp 1.000.000 (Transfer BCA) [bukti]│
└──────────────────────────────────────────────────────────────────────┘
```
- **Status bar** di kanan atas memperlihatkan posisi dokumen di alurnya. Tombol aksi
  berikutnya ada di kiri. Staf selalu tahu langkah selanjutnya.
- **Riwayat** di bawah setiap dokumen diambil dari `audit_trail` + pembayaran + cetak.
  Pengganti "nyari di WA" (01:05).

### 2.3 Tabel
- Kolom pertama selalu nomor/kode yang dibaca manusia. **Angka rata kanan**, format
  `2.871.000`, nol ditampilkan `-` (sama seperti Excel mereka). Tanggal `05 Okt 2026`.
- Header **sticky**. Baris **Total** di bawah. Paginasi 50 baris.
- Maksimal 2 aksi per baris, sisanya di menu `⋯`.
- Kosong ada 3 jenis: belum ada data (+ tombol tambah), tidak ada hasil cari (+ hapus filter),
  gagal muat (+ coba lagi).

### 2.4 Form dokumen: baris barang seperti Excel
- Ketik **kode** (mereka bicara pakai kode: "2808", "64120") atau nama → pilih.
  Harga, satuan, dan **stok saat ini** terisi otomatis.
- **Tab/Enter** pindah sel. Enter di sel terakhir menambah baris baru. Selalu ada 1 baris kosong.
- Qty diketik langsung, bukan tombol +1 seperti POS sekarang (100 palet = 99 klik).
- Angka diterima dalam format `1.250.000` maupun `1250000`.
- Peringatan (stok kurang) tidak memblokir kalau aturannya memang boleh (pesanan inden).
  Hanya error sungguhan yang memblokir.

### 2.5 Pesan & dialog
- **Tidak ada `alert()` / `confirm()` / `prompt()` browser.**
- Sukses → **toast** kecil, hilang 4 detik ("Surat jalan 0063 tersimpan"), dengan
  "Urungkan" kalau bisa.
- Error aturan bisnis → pesan di dalam halaman, pakai angka:
  *"Stok Palet FP 0303 Coklat hanya 40 pcs, pesanan 55."*
- Dialog konfirmasi **hanya untuk aksi yang tidak bisa diurungkan**, dengan tombol
  berlabel kata kerja ("Batalkan PO", bukan "OK").
- Tombol simpan menampilkan spinner dan dikunci saat proses (anti dobel-klik).

### 2.6 Warna status (sama di semua modul)

| Arti | Warna | Contoh |
|---|---|---|
| Draft / belum mulai | abu | Draft, Pesanan Masuk |
| Sedang jalan | biru | Dikirim ke Supplier, DP Diterima |
| Perlu perhatian | oranye | Diterima Sebagian, Jatuh tempo 3 hari |
| Selesai / beres | hijau | Lunas, Selesai, Diterima |
| Masalah | merah | Dibatalkan, Lewat Jatuh Tempo, Stok Habis |

Warna selalu disertai teks; warna tidak boleh berdiri sendiri.

### 2.7 Gaya visual: anti "AI slop", seperti software kerja beneran

**Dilarang:**
- gradien ungu, glow, glassmorphism, kartu KPI raksasa di setiap modul;
- avatar, progress bar, atau chip warna-warni di setiap baris;
- emoji di UI;
- teks marketing ("Premium", "Executive", "✓ Otomatisasi …");
- placeholder gambar 60px di tabel stok (tidak ada produk yang punya foto).

**Pakai:**
- 1 font (Inter / system-ui) dengan **angka tabular**. Teks tabel **15px**, minimal 14px
  (pengguna bukan anak muda semua).
- Latar putih/abu muda, garis tipis, **1 warna brand** (dari logo PALORA) hanya untuk tombol
  utama & link. Warna lain hanya untuk status.
- Skala jarak 4/8/12/16/24/32. Tinggi baris tabel 40px (opsi rapat 32px).
- Ikon Lucide outline, selalu dengan label teks.
- Kontras WCAG AA.
- **Semua styling lewat CSS (design tokens + komponen)**, bukan 645 inline style.

### 2.8 Bahasa
Indonesia penuh, pakai **istilah mereka**:

| Konsep | Istilah di UI |
|---|---|
| Order customer | Pesanan |
| Order ke supplier | PO |
| Surat jalan | Surat Jalan |
| Bukti penjualan | Nota (penjualan langsung) / Invoice (tempo) |
| Pembayaran | DP, Pelunasan, Tempo, Cicilan |
| Harga | Harga Modal, Harga Jual |
| Pengambilan | Ambil Sendiri |
| Retur / rusak | Rusak / Pecah |
| Stock opname | Stok Opname |

Hindari "SO" (bagi mereka SO = **Stok Opname**), "Walk-in", "Direct Ship",
"3-Way Matching", "Sales Order Builder".

### 2.9 HP (Pak De)
- Home & daftar jadi tampilan kartu.
- Tombol aksi utama menempel di bawah.
- Form 1 kolom, keyboard angka untuk qty & harga.
- Prioritas di HP: **cek stok, lihat pesanan, lihat piutang, buat PO**.

---

## 3. Layar per Modul: Kolom Meniru Excel / Kertas Mereka

### 3.1 Stok (meniru `Stok Stok.xlsx` Sheet1)

Judul **"Stock Barang Jadi Paletindo"**, keterangan *"Update {tanggal}"*. Tabel
**dikelompokkan** per kelompok barang/merek (Palet FUTARI FP 0303, Part Case, Rabbit,
LINHUI, MASPION, GBU, BIOPLAST, …) dengan judul kelompok tebal, persis seperti Excel.

| No | Kode | Nama Barang | Warna | Qty | Harga Jual | Total | Keterangan |
|---|---|---|---|---:|---:|---:|---|

- Subtotal Qty per kelompok, **total keseluruhan** di bawah (Excel mereka tidak punya).
- Stok di bawah minimum: teks merah + filter "Stok menipis".
- Tambahan dari sistem: **Dipesan** (sudah ada pesanan belum keluar) & **Bisa Dijual**,
  bisa disembunyikan.
- Kolom Harga Modal / Margin **hanya untuk Owner**.
- Klik baris → kartu stok: data barang + **riwayat mutasi** (masuk/keluar/opname per tanggal
  dengan no. dokumen).

### 3.2 Daftar Harga Modal (meniru Sheet2, khusus Owner)

| Tipe | Pricelist | Modal Lama | Modal Baru | Harga Jual | Margin |
|---|---:|---:|---:|---:|---:|

- Dikelompokkan per supplier.
- Aturan diskon per supplier disimpan (Rabbit 20%, GOLDEN 10% + 2,5%, KIMPLAST 15% + 5%,
  PPN 11%), jadi modal dihitung otomatis seperti rumus Excel mereka.

### 3.3 PO ke Supplier (meniru `PO 37.xlsx`)

Daftar:

| No. PO | Tanggal | Supplier | Total | Diterima | Status |
|---|---|---|---:|---|---|

Form/dokumen:

| No | Tipe | Ukuran | Warna | Harga | Qty | Jumlah |
|---|---|---|---|---:|---:|---:|

- Diakhiri **Total**, lalu *"Tangerang, {tgl}"* dan nama perusahaan.
- Status: **Draft → Dikirim → Diterima Sebagian → Selesai** (+ Dibatalkan).
- Aksi: Cetak, Kirim WA (pesan + link PDF), Kirim Email (preview dulu), Terima Barang, Batalkan.
- Produk perlu field baru **Ukuran** (mis. `60*40*35,5`).

### 3.4 Terima Barang (Penerimaan)

| No | Tipe | Warna | Qty PO | Sudah Diterima | Diterima Sekarang (baik) | Rusak | Sisa |
|---|---|---|---:|---:|---:|---:|---:|

- Wajib: **No. SJ Supplier** (tidak diisi otomatis lagi) + tanggal.
- **Foto SJ** dianjurkan (bisa menyusul).
- Qty tidak boleh melebihi sisa PO (ada peringatan).
- Dicetak sebagai **Tanda Terima Barang** (opsional).

### 3.5 Pesanan Customer (pengganti "Sales Order")

Daftar:

| No. Nota | Tanggal | Customer | Total | Dibayar | Sisa | Jatuh Tempo | Status |
|---|---|---|---:|---:|---:|---|---|

Form/dokumen:
- Header: Customer, UP, PO Customer (no. PO dari customer, seperti di SJ asli), Alamat Kirim, Syarat Bayar.
- Baris: `No · Kode · Nama Barang · Warna · Qty · Harga · Jumlah`.
- Total: Total, Dibayar, Sisa (+ PPN bila dicentang).

Status: **Pesanan Masuk → DP Diterima → Lunas → Dikirim / Diambil → Selesai** (+ Dibatalkan).
Aturan:
- **DP minimal 25%** sebelum diproses. Kurang dari itu hanya bisa dengan izin Owner (tercatat).
- Barang keluar hanya setelah **Lunas**, atau ada **Izin Kirim Owner** untuk customer tempo (tercatat).
- Pembayaran dicatat dengan **tanggal, jumlah, metode, bukti foto**. Tidak boleh melebihi sisa.

### 3.6 Kasir (penjualan langsung)

Satu layar:
- Kiri: kotak cari besar (kode/nama) + daftar hasil.
- Kanan: keranjang dengan qty & harga yang bisa diketik.
- Tombol **Bayar (F9)**: Tunai/Transfer → **cetak nota**.

Target **3 langkah**: cari → qty → bayar. Nota bisa dikirim WA.

### 3.7 Surat Jalan (meniru `SURAT JALAN.pdf` persis)
- Kop: logo + **PT PALETINDO PRAKARSA UNGGUL**, Telp/Fax/E-mail.
- Kanan atas: tanggal (`23 MEI 2026`), **Kepada** + 3 baris alamat.
- **No.** `0063/DO/PPU/X/2026` (urutan/DO/kode/bulan romawi/tahun).
- *"Kami kirimkan barang-barang tersebut di bawah ini :"*
- Tabel **QUANTITY | ITEM BARANG** saja. Di bawah nama barang ada baris `PO #:`, `UP.`,
  `KIRIM KE :` + alamat.
- Tanda tangan: **Penerima · Mengetahui · Pengirim**.
- Ukuran **A5 / setengah halaman**, sama dengan form kertasnya.
- Daftar SJ: `No. SJ · Tanggal · No. Nota · Customer · Kirim Ke · Supir · Status`.
- Aksi **Tandai Diterima**: nama penerima + foto SJ bertanda tangan (pengganti `prompt()`).

### 3.8 Nota / Invoice
- Kop PT Paletindo Prakarsa Unggul.
- Baris: `No · Nama Barang · Qty · Harga · Jumlah`.
- Total, DP, **Sisa**, **Terbilang**.
- Kalau ber-PPN: DPP & PPN dihitung benar (bukan selalu dibagi 1,11 seperti sekarang).
- Label **"NOTA"** (bayar langsung) atau **"INVOICE"** (tempo), **bukan "FAKTUR PAJAK"**
  (faktur dibuat di Coretax).
- Rekening bank dari **Pengaturan Perusahaan**, bukan placeholder.

### 3.9 Piutang (Bude & Owner)

| Customer | Jml Nota | Total Tagihan | Dibayar | Sisa | Jatuh Tempo Terdekat | Lewat Tempo |
|---|---:|---:|---:|---:|---|---:|

- Klik customer → daftar nota tempo + riwayat cicilan.
- Aksi: **Catat Pembayaran**, **Tagih via WA** (nomor diformat `62…`, nominal, no. nota,
  rekening dari pengaturan).
- Filter: Jatuh tempo minggu ini / Lewat tempo.

### 3.10 Hutang Supplier (baru, Bude & Owner)

| Supplier | No. Invoice | No. PO | Tanggal | Jatuh Tempo | Total | Dibayar | Sisa | Status |
|---|---|---|---|---|---:|---:|---:|---|

- Upload foto invoice & faktur supplier, catat bayar.
- Status kelengkapan berkas per PO: **PO ✓ · SJ ✓ · Invoice ✓ · Faktur ✓ · Lunas ✓**.

### 3.11 Marketplace
- Pilih toko (3 Shopee, 2 Tokopedia/TikTok, Lazada, Blibli), lalu upload file laporan.
- **Preview**:

  | No. Pesanan MP | Tanggal | SKU | Nama | Qty | Cocok ke Kode | Status |
  |---|---|---|---|---:|---|---|

- Baris yang SKU-nya tidak dikenal dipetakan sekali; pemetaan disimpan untuk berikutnya.
- Pesanan yang sudah pernah diimpor ditolak (anti dobel).
- Konfirmasi → stok terpotong + tercatat sebagai penjualan marketplace (masuk laporan omzet).

### 3.12 Stok Opname
- Buat sesi opname (semua barang atau satu kelompok).
- **Cetak lembar hitung**: `No · Kode · Nama · Warna · Hitung Fisik ____`.
- Input hasil di HP/PC. Sistem tampilkan `Stok Sistem · Hitung Fisik · Selisih`.
- Simpan → hanya baris yang diisi yang disesuaikan, dengan mutasi OPNAME & nama petugas.

### 3.13 Laporan (Owner & Bude)
- Filter **periode** (hari ini / minggu / bulan / custom).
- Omzet (pesanan + kasir + marketplace), kas masuk, kas keluar (bayar supplier),
  piutang & hutang, barang terlaris, nilai stok (harga modal).
- Semua angka bisa diklik ke daftarnya. Ekspor Excel dengan kolom yang sama.

### 3.14 Master Data & Pengaturan
- **Customer**: Nama, UP, Telepon/WA, Email, Alamat, Alamat Kirim, NPWP, Tipe, Limit Kredit,
  Tempo default. Bisa edit & arsip.
- **Supplier**: Nama, Up (sales), Telepon/WA, **Email**, Alamat, Syarat bayar,
  Aturan diskon. Bisa edit & arsip.
- **Pengaturan Perusahaan (Owner)**: nama, alamat, telp/fax/email, NPWP, rekening bank,
  penandatangan, kode nomor dokumen, format nomor. Dipakai semua dokumen cetak.
- **Pengguna**: sudah ada.

### 3.15 Aktivitas Sistem (Owner)
- Tabel `Waktu · Pengguna · Modul · Aksi · Dokumen · Detail`, filter per pengguna/modul/tanggal.
- Detail menampilkan perubahan **sebelum → sesudah** dari `audit_trail`.

---

## 4. Perubahan Data (Backend)

| Perubahan | Alasan |
|---|---|
| `products`: tambah `size` (Ukuran), `group_name` (kelompok seperti Excel), `keterangan` | Meniru kolom Excel & PO |
| `sales_orders`: status baku, `channel` (pesanan / kasir / marketplace), `fulfillment` (kirim / ambil), `tax_mode`, `marketplace_order_no` | Satu sumber untuk omzet & laporan |
| `payments` (tabel baru): dokumen, tanggal, jumlah, metode, bukti foto, oleh | Riwayat cicilan piutang & hutang yang bisa diaudit; validasi tidak boleh lebih dari sisa di server |
| `supplier_invoices` (tabel baru) | Hutang supplier |
| `marketplace_imports` + `sku_mappings` (tabel baru) | Anti dobel import & pemetaan SKU |
| `opname_sessions` (tabel baru) | Opname yang aman |
| `settings` (tabel baru, 1 baris) | Kop dokumen, rekening, penomoran |
| Penomoran dokumen di **server** (counter per jenis/tahun) | Nomor tidak bentrok antar perangkat |
| Aksi bisnis jadi **endpoint server dalam 1 transaksi**: terima barang, terbitkan SJ, bayar kasir, catat pembayaran, simpan opname, import marketplace | Stok, dokumen, mutasi, dan log tersimpan bersamaan atau gagal bersamaan. Ini menutup celah "stok terpotong tapi SJ gagal" |
| Seed: hanya master data asli (produk, supplier, customer); data transaksi contoh hanya dengan `--demo` | Database klien tidak berisi transaksi palsu |
| Status disimpan sebagai kode (`dp_received`), label Indonesia di satu file | Menghapus 15+ variasi teks status |

---

## 5. Bug yang Wajib Ditutup (dari audit)

**Fatal (Fase 1):**
1. Import marketplace palsu yang memotong stok asli → dinonaktifkan dulu, dibuat ulang di Fase 4.
2. Print mencetak seluruh aplikasi → `@media print` + halaman cetak khusus.
3. Buat PO error (`supplierName` undefined).
4. Stock opname menimpa stok lama & mengubah input kosong jadi 0.
5. Stok "dipesan" dihitung dobel.
6. Tombol "Lihat Daftar Piutang" di launcher crash.
7. Import Excel stok mengubah stok jadi 0 kalau kolom tidak ada, dan kode angka jadi duplikat.
8. Esc keluar dari modul dan menghilangkan isian form.
9. Bayar melebihi tagihan → sisa minus.
10. Tanggal pakai UTC (00:00–07:00 WIB tercatat kemarin).
11. Alamat dari kasir tidak sampai ke surat jalan (`address` vs `destination`).
12. Pelunasan mengembalikan status "Terkirim" ke "Siap Kirim".
13. Gudang bisa catat pembayaran piutang & hutang (melanggar PRD 6.7).
14. Loading selamanya kalau server gagal.

**Lainnya:** semua tombol "Ekspor" palsu, upload bukti palsu, KPI palsu (88,4%), badge
hardcode, rekening placeholder, nama default ("Mas Heri", "Pak Yanto", plat nomor) di
dokumen, filter log yang tidak cocok, kategori yang hilang di form, form tambah produk berisi
nilai palsu (stok 50).

---

## 6. Testing: Target "Nol Error"

| Lapis | Alat | Isi |
|---|---|---|
| Unit | Vitest | Format rupiah/tanggal, terbilang, hitung DPP/PPN, DP 25%, jatuh tempo, penomoran, pemetaan SKU marketplace, parser file marketplace & Excel |
| Integrasi server | Vitest + PocketBase asli (sudah ada, 41 test) | Setiap endpoint aksi bisnis: sukses, gagal di tengah (rollback), hak akses per role, angka tidak boleh minus/lebih, anti dobel import, nomor unik saat 20 request bersamaan |
| End-to-end | Playwright di browser asli | Skenario per persona (bawah). Juga dijalankan di layar HP (375px) |
| Visual & aksesibilitas | Playwright screenshot + axe | Tidak ada elemen terpotong di 375/768/1366px; kontras AA; semua tombol bisa diakses keyboard |
| Cetak | Playwright `page.pdf()` | SJ, Nota, Invoice, PO menghasilkan PDF 1 halaman tanpa UI aplikasi; dibandingkan dengan contoh asli |

**Skenario E2E wajib** (semua harus lulus sebelum dianggap selesai):
1. **Mas Heri:** login → Kasir → jual 2 barang, ubah harga 1 barang → cetak nota → stok berkurang, mutasi tercatat.
2. **Pak De:** buat PO 4 baris → kirim WA (cek link) → Mas Heri terima 60% + foto SJ → terima sisa → PO Selesai, stok bertambah tepat.
3. **Pesanan tempo:** DP 25% → nota → SJ ditolak (belum lunas) → Owner izinkan → SJ terbit → Bude catat 2× cicilan → Lunas → piutang 0.
4. **Ambil sendiri:** pesanan lunas → "Diambil sendiri" → stok terpotong, tanpa SJ.
5. **Dua perangkat:** dua kasir menjual stok terakhir bersamaan → satu ditolak dengan pesan jelas.
6. **Marketplace:** upload laporan Shopee contoh → preview → 1 SKU dipetakan → konfirmasi → upload file yang sama lagi → ditolak.
7. **Opname:** hitung 3 barang (1 lebih, 1 kurang, 1 sama) → hanya 2 tersesuaikan; barang lain yang terjual saat opname tidak tertimpa.
8. **Hak akses:** Bude tidak melihat Kasir/PO, Mas Heri tidak melihat Piutang/Laporan, URL langsung ke modul terlarang ditolak.
9. **Gangguan:** server dimatikan saat simpan → pesan jelas, isian tidak hilang, coba lagi berhasil.
10. **Cetak:** semua dokumen → PDF rapi, kop PT Paletindo Prakarsa Unggul.

Pemeriksaan otomatis saat build:
- linter **0 error**;
- **0 `alert(`/`confirm(`/`prompt(`** (dicek script);
- **0 inline `style={{`** di modul baru;
- console browser **0 error** selama E2E.

---

## 7. Urutan Kerja (fase kecil, masing-masing bisa diuji & didemokan)

| Fase | Isi | Hasil yang bisa didemokan |
|---|---|---|
| **1. Fondasi & perbaikan fatal** (± 3 hari) | Design tokens + komponen dasar (`PageHeader`, `DataTable`, `StatusBadge`, `StatusBar`, `Toast`, `Dialog`, `MoneyInput`, `LineItemGrid`, `EmptyState`); routing daftar/dokumen; toast pengganti alert; logo PALORA di app; tutup bug fatal §5; matikan marketplace palsu; launcher dirapikan + badge asli | App stabil, tampilan konsisten, tidak ada alert |
| **2. Stok & PO** (± 3 hari) | Layar Stok meniru Excel + kartu stok; PO baru (form ala Excel) + cetak PO; Terima Barang + foto SJ; endpoint server terima barang; Pengaturan Perusahaan + penomoran server | Flow 1–2 utuh |
| **3. Penjualan** (± 4 hari) | Pesanan (daftar + dokumen + status bar); Kasir 3 langkah; pembayaran (tabel `payments`); Surat Jalan meniru kertas asli (A5); Nota/Invoice + terbilang; kirim WA | Flow 5–8 utuh |
| **4. Keuangan & Marketplace** (± 4 hari) | Piutang + tagih WA; Hutang Supplier; Arsip per PO; Marketplace import asli; Laporan per periode | Flow 3–4, 9–10 utuh |
| **5. Opname, log, HP, uji akhir** (± 3 hari) | Opname sesi + lembar hitung; Aktivitas Sistem dari audit trail; tampilan HP; seluruh E2E/visual/print test; bersihkan kode lama | Siap UAT dengan Mas Heri |

Setiap fase selesai jika: semua test lulus, demo flow fase itu jalan di browser, dan tidak
ada error di console.

---

## 8. Pertanyaan untuk Klien / Tim

**Perlu dijawab sebelum Fase 1–2:**
1. **Kode di nomor dokumen**: contoh SJ asli `0062/DO/PIM/V/2026` (PIM = Paletindo Inti Makmur).
   Karena semua dokumen jadi atas nama **PT Paletindo Prakarsa Unggul**, kodenya diganti
   **PPU** (`0063/DO/PPU/X/2026`)? Nomor urut melanjutkan dari 0062?
2. **Logo Paletindo resolusi tinggi** (PNG ≥ 600px atau SVG). File sekarang hanya 86×86 px,
   akan buram di kertas.
3. **Logo PALORA**: file sekarang berisi tulisan di dalam gambar. Ada versi ikon saja (tanpa teks)?
   Kalau tidak ada, akan dipotong otomatis dari file yang ada.
4. **Alamat, telepon, NPWP, rekening bank** resmi PT Paletindo Prakarsa Unggul untuk kop &
   nota. Yang ada sekarang milik Inti Makmur, dan NPWP-nya salah format.

**Perlu dijawab sebelum Fase 3–4:**
5. **PPN**: nota/invoice mana yang ber-PPN? Harga di PO sudah termasuk PPN?
6. **Contoh file laporan** Shopee/Tokopedia/Lazada/Blibli (download dari seller center) untuk
   membuat import yang asli. Toko "2 Tokped" = 2 Tokopedia atau Tokopedia + TikTok?
7. **Siapa membuat invoice**: Pak De (wawancara) atau Bude (PRD)? Ini menentukan hak akses.
8. **Hutang supplier**: dipegang Bude saja?
9. **Foto nota tulis tangan yang sudah terisi** (dijanjikan klien di wawancara 11:59) untuk
   meniru format nota.
10. **Direct ship** (PO langsung ke customer): perlu di versi ini atau fase berikutnya?

---

## 9. Yang Sengaja TIDAK Dikerjakan

- Faktur pajak: tetap di Coretax. Sistem hanya menyimpan nomor & file-nya.
- Integrasi API langsung ke marketplace (pakai upload laporan, sesuai kesepakatan wawancara).
- Akuntansi penuh / jurnal double-entry.
- Multi-gudang (cuma 1 gudang).
- Retur kompleks. Barang rusak saat terima sudah tercatat; retur customer cukup catatan di pesanan.
