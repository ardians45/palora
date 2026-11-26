# Plan Revisi dari Mitra (meeting 26 Nov 2026)

Sumber: catatan konsultasi + rekaman `MEETING MITRA/1.mpeg` (transkrip di folder yang sama).

## 1. Supplier PPN dan Non-PPN

| Yang diminta | Solusi |
|---|---|
| Supplier dibedakan PPN / Non-PPN, pakai centang | Master Supplier: centang **Supplier PPN (PKP)**, tampil sebagai label di daftar supplier |
| Format PO untuk keduanya | PO otomatis ikut status supplier (bisa diubah per PO). PO PPN: **Subtotal (DPP) + PPN + Total**. PO Non-PPN: Total saja. Berlaku di layar, cetak PO, dan pesan WA/Email |
| | Centang "Faktur pajak" di map PO hanya muncul untuk PO PPN |

Harga modal barang tetap harga sebelum PPN (DPP).

## 2. No. PO masuk Invoice dan Surat Jalan

- No. PO customer diisi di form pesanan, lalu tercetak di **invoice/nota** dan **surat jalan** (PO #), tampil di halaman pesanan dan surat jalan, dan bisa dicari.
- Format invoice dan surat jalan final menunggu contoh dari Pak Yanto (dijanjikan di meeting). Begitu contohnya datang, tata letak cetak disamakan.

## 3. Order Offline dan Online (khusus marketplace)

- Setiap order punya jenis: **Offline** (pesanan langsung, kasir) atau **Online** (marketplace).
- Form pesanan: pilih Offline / Online. Online wajib isi **toko marketplace** + **no. pesanan marketplace** (tidak bisa dobel, juga terhadap hasil import Excel).
- Daftar pesanan: saringan Semua / Offline / Online, kolom jenis + nama toko.
- Laporan: omzet order online manual dihitung sebagai Marketplace.

## 4. Barang masuk dari produksi sendiri

Masalah mitra: barang hasil produksi PT milik Owner tidak boleh "tiba-tiba muncul" di stok, tapi juga bukan pembelian biasa (tidak ada PO, tidak ada hutang). HPP tiap batch berbeda.

- Menu baru **Produksi** (kelompok Gudang): catat per **batch**: barang, qty jadi, biaya material, biaya jasa, biaya lain.
- Sistem menghitung **HPP per unit** dan **margin** terhadap harga jual, per batch. Batch berikutnya boleh beda HPP.
- Stok bertambah dengan mutasi jenis **Produksi** (bukan pembelian): tidak membuat PO, invoice, atau hutang.
- Harga modal barang = rata-rata tertimbang (stok lama x modal lama + biaya batch) / stok baru. Bila stok lama habis, modal = HPP batch baru.
- Barang ditandai **Produksi sendiri** otomatis saat batch pertama dicatat (bisa juga dicentang di master barang).
- Batch salah input bisa **dibatalkan** (stok dan harga modal dikembalikan) selama stoknya masih ada.

**Belum diputuskan (di luar sistem):** perlakuan akuntansi dan pajak antar-perusahaan (jual-beli antar PT, PPN/PPh, batas PKP) dikonsultasikan dulu ke dosen akuntansi / konsultan pajak. Sistem hanya mencatat fakta: barang masuk dari produksi, sebesar HPP-nya, dari entitas mana.
