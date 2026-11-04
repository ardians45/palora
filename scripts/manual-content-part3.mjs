// Konten Manual Book Bagian 3: Modul 06, 07, 08, 09
import { getImgBase64 } from './manual-builder.mjs';

export function getModul06() {
  const imgArsip = getImgBase64('21_arsip.png');

  return {
    docCode: 'MB-06/PLR/2026',
    title: 'Modul Arsip Dokumen Digital per PO',
    moduleName: 'Arsip Dokumen (Digital Filing System per PO)',
    roleList: ['Finance', 'Gudang', 'Owner'],
    version: '1.0',
    summary: 'Sistem pengarsipan digital terstruktur per nomor Purchase Order untuk menyatukan PO asli, foto surat jalan penerimaan barang, lembar invoice tagihan pabrik, serta faktur pajak.',
    contentHtml: `
      <h1>1. Mengapa Sistem Arsip Digital Dibutuhkan?</h1>
      <p>
        Salah satu temuan paling kritis dari wawancara operasional Paletindo adalah masalah <strong>dokumen fisik yang tercecer atau hilang</strong>. Di masa lalu, ketika supir membawa surat jalan kertas dari pabrik, lembaran kertas tersebut diletakkan di keranjang meja gudang. Saat Bude hendak membayar tagihan atau membuat laporan pajak bulanan, lembaran surat jalan atau faktur sering kali terselip, basah, atau bahkan hilang sehingga perusahaan harus repot meminta salinan ulang ke pihak supplier.
      </p>

      <h1>2. Konsep Map Digital: Satu PO, Satu Berkas Lengkap</h1>
      <p>
        PALORA menerapkan konsep <strong>Map Folder Digital per Nomor PO</strong>. Setiap kali sebuah Purchase Order diterbitkan, sistem secara otomatis membuat satu "map berkas elektronik" yang akan menampung seluruh dokumen yang berkaitan dengan transaksi pengadaan tersebut hingga tuntas:
      </p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgArsip}" alt="Layar Arsip Dokumen Digital">
        </div>
        <div class="screenshot-caption">Gambar 6.1: Daftar Berkas Arsip Digital dikelompokkan per nomor PO beserta indikator kelengkapan dokumen</div>
      </div>

      <h2>2.1 Struktur 4 Dokumen Kunci dalam Setiap Map PO</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Jenis Dokumen</th>
            <th style="width: 25%;">Pihak Pengunggah</th>
            <th style="width: 50%;">Fungsi & Verifikasi</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Purchase Order (PO)</strong></td>
            <td>Sistem (Otomatis)</td>
            <td>Dokumen acuan pesanan resmi Paletindo yang dikirim ke pabrik saat awal transaksi.</td>
          </tr>
          <tr>
            <td><strong>2. Surat Jalan Supplier (SJ)</strong></td>
            <td>Mas Heri (Gudang)</td>
            <td>Foto lembar surat jalan fisik yang dibawa supir saat mengantar barang ke gudang (bisa lebih dari 1 foto jika pengiriman bertahap).</td>
          </tr>
          <tr>
            <td><strong>3. Invoice Supplier</strong></td>
            <td>Bude (Keuangan)</td>
            <td>Lembar tagihan resmi yang diterbitkan pabrik setelah barang selesai dikirim.</td>
          </tr>
          <tr>
            <td><strong>4. Faktur Pajak</strong></td>
            <td>Bude (Keuangan)</td>
            <td>Bukti potong/pungut PPN dari pabrik rekanan untuk pelaporan SPT masa pajak perusahaan.</td>
          </tr>
        </tbody>
      </table>

      <div class="page-break"></div>

      <h1>3. Tata Cara Mengunggah & Memeriksa Dokumen</h1>
      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Buka Menu "Arsip Dokumen"</div>
            <p class="step-desc">Cari nomor PO atau nama supplier yang ingin diperiksa menggunakan kolom pencarian di bagian atas layar.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Periksa Status Kelengkapan (Badge Berkas)</div>
            <p class="step-desc">
              Setiap map PO memiliki badge indikator kelengkapan:
              <br>&bull; <span style="color: #b45309; font-weight: bold;">Kuning (Belum Lengkap):</span> Masih ada dokumen yang belum diunggah (misal SJ sudah ada, tapi invoice pabrik belum datang).
              <br>&bull; <span style="color: #15803d; font-weight: bold;">Hijau (Lengkap):</span> Seluruh 4 dokumen telah diunggah dan terverifikasi.
            </p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Unggah File (Foto HP / Scan PDF)</div>
            <p class="step-desc">Klik slot dokumen yang kosong, lalu pilih file foto dari kamera HP atau file PDF hasil scan. File langsung terenkripsi dan tersimpan aman di server lokal gudang.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-content">
            <div class="step-title">Pratinjau & Unduh Dokumen</div>
            <p class="step-desc">Kapan pun Bude atau Pak Yanto membutuhkan dokumen tersebut, cukup klik nama dokumen untuk melihat pratinjau resolusi tinggi di layar atau klik tombol unduh untuk mencetaknya.</p>
          </div>
        </div>
      </div>

      <div class="callout callout-success">
        <div class="callout-title">Keuntungan Nyata bagi Tim Keuangan & Pajak</div>
        Dengan sistem arsip digital ini, saat audit keuangan atau pelaporan SPT Pajak tahunan, Bude tidak perlu lagi membongkar lemari berkas fisik. Seluruh riwayat transaksi pengadaan dapat ditelusuri dalam hitungan detik hanya dengan mengetik nomor PO atau nama pabrik!
      </div>
    `,
  };
}

export function getModul07() {
  const imgLaporan = getImgBase64('22_laporan.png');

  return {
    docCode: 'MB-07/PLR/2026',
    title: 'Modul Laporan & Analitik Bisnis',
    moduleName: 'Laporan (Executive Reports & Business Analytics)',
    roleList: ['Owner', 'Finance'],
    version: '1.0',
    summary: 'Panduan pemanfaatan laporan eksekutif berkala, analisis omset penjualan, produk terlaris, rekapitulasi belanja pabrik, valuasi stok persediaan gudang, serta ekspor data ke Excel.',
    contentHtml: `
      <h1>1. Pengambilan Keputusan Bisnis Berbasis Data</h1>
      <p>
        Modul Laporan dirancang untuk memberikan visibilitas penuh kepada <strong>Pak Yanto (Owner)</strong> dan <strong>Bude (Keuangan)</strong> mengenai kesehatan finansial dan operasional PT Paletindo Prakarsa Unggul secara objektif dan real-time.
      </p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgLaporan}" alt="Layar Dashboard Laporan Bisnis">
        </div>
        <div class="screenshot-caption">Gambar 7.1: Halaman Laporan Eksekutif dengan filter rentang tanggal dan grafik tren operasional</div>
      </div>

      <h1>2. Jenis-Jenis Laporan Utama di PALORA</h1>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 28%;">Nama Laporan</th>
            <th style="width: 42%;">Isi & Rincian Data</th>
            <th style="width: 30%;">Tujuan Pengambilan Keputusan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Laporan Penjualan & Omset</strong></td>
            <td>Rekap pendapatan kotor, diskon yang diberikan, pendapatan bersih, perbandingan penjualan B2B grosir vs kasir walk-in vs marketplace.</td>
            <td>Evaluasi target penjualan bulanan dan efektivitas masing-masing saluran pemasaran.</td>
          </tr>
          <tr>
            <td><strong>Laporan Produk Terlaris (Fast-Moving)</strong></td>
            <td>Peringkat produk plastik dengan perputaran volume unit tertinggi dan kontribusi margin profit terbesar.</td>
            <td>Menentukan prioritas produk yang harus dicetak ulang di pabrik agar tidak kehabisan stok.</td>
          </tr>
          <tr>
            <td><strong>Laporan Pengadaan (PO Pabrik)</strong></td>
            <td>Total belanja modal ke masing-masing supplier, fluktuasi harga modal biji plastik per kilogram/unit.</td>
            <td>Negosiasi harga borongan dengan pabrik cetak berdasarkan volume tahunan.</td>
          </tr>
          <tr>
            <td><strong>Laporan Valuasi Stok Gudang</strong></td>
            <td>Total nominal rupiah nilai aset persediaan yang sedang tersimpan di gudang fisik Paletindo.</td>
            <td>Penyusunan neraca keuangan dan evaluasi perputaran modal kerja.</td>
          </tr>
          <tr>
            <td><strong>Laporan Rekapitulasi Piutang & Hutang</strong></td>
            <td>Daftar saldo piutang tertahan per toko, umur piutang, dan jadwal pembayaran hutang supplier yang akan jatuh tempo minggu ini.</td>
            <td>Perencanaan likuiditas arus kas (cash flow) mingguan untuk pembayaran gaji dan operasional.</td>
          </tr>
        </tbody>
      </table>

      <div class="page-break"></div>

      <h1>3. Cara Menggunakan Filter & Ekspor Data ke Excel</h1>
      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Pilih Jenis Laporan & Tentukan Rentang Tanggal</div>
            <p class="step-desc">Pilih tab laporan yang diinginkan. Tentukan periode waktu analisis (misal: <em>Bulan Ini</em>, <em>Bulan Lalu</em>, atau pilih tanggal kustom dari tanggal 1 sampai 31).</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Tinjau Ringkasan Kartu Metrik di Layar</div>
            <p class="step-desc">Sistem langsung memperbarui angka ringkasan kartu metrik: total omset, jumlah transaksi, rata-rata nilai nota, dan persentase piutang tertagih.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Ekspor ke Excel (Format .XLSX Asli)</div>
            <p class="step-desc">Klik tombol hijau <strong>Ekspor ke Excel</strong>. Sistem akan men-download file spreadsheet yang rapi, bergaris, dan memiliki rumus total bawaan, siap dilampirkan dalam rapat evaluasi bulanan manajemen.</p>
          </div>
        </div>
      </div>
    `,
  };
}

export function getModul08() {
  const imgPelanggan = getImgBase64('23_master_pelanggan.png');
  const imgSupplier = getImgBase64('24_master_supplier.png');
  const imgKatalog = getImgBase64('11_stok_katalog.png');

  return {
    docCode: 'MB-08/PLR/2026',
    title: 'Modul Master Data (Pelanggan, Supplier & Produk)',
    moduleName: 'Master Data (Entities & Product Catalog Management)',
    roleList: ['Owner', 'Gudang'],
    version: '1.0',
    summary: 'Panduan pemeliharaan database master pelanggan, database supplier/pabrik cetak rekanan, standarisasi kode SKU, spesifikasi dimensi barang, dan satuan kemasan produk.',
    contentHtml: `
      <h1>1. Peran Penting Master Data yang Rapi</h1>
      <p>
        Integritas data transaksi harian di PALORA bergantung sepenuhnya pada kerapian <strong>Master Data</strong>. Ketika data master pelanggan, supplier, dan barang tersusun dengan benar, staf tidak perlu mengetik ulang nama toko, nomor telepon, atau harga secara manual di setiap transaksi, sehingga kesalahan tulis tangan dapat dicegah hingga 100%.
      </p>

      <h1>2. Mengelola Master Pelanggan (Customers)</h1>
      <p>Modul Master Pelanggan memuat database seluruh toko grosir, agen luar kota, dan pembeli tetap Paletindo.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgPelanggan}" alt="Master Pelanggan">
        </div>
        <div class="screenshot-caption">Gambar 8.1: Daftar Master Pelanggan dengan kontak telepon/WA, alamat pengiriman, dan ketentuan tempo</div>
      </div>

      <h2>2.1 Informasi Penting yang Wajib Diisi pada Data Pelanggan</h2>
      <ul>
        <li><strong>Nama Toko / Perusahaan:</strong> Nama resmi toko langganan (contoh: <em>Toko Berkah Jaya Plastik</em>).</li>
        <li><strong>Nama Kontak / PIC:</strong> Nama pemilik atau penanggung jawab pemesanan (contoh: <em>Bpk. Hendra</em>).</li>
        <li><strong>Nomor Handphone / WhatsApp:</strong> Nomor aktif PIC untuk pengiriman bukti nota dan fitur tagihan otomatis.</li>
        <li><strong>Alamat Lengkap Pengiriman:</strong> Alamat gudang tujuan untuk dicetak otomatis pada dokumen Surat Jalan.</li>
        <li><strong>Syarat Pembayaran (Term of Payment):</strong> Pilihan antara <em>Tunai di Muka / DP</em> atau <em>Tempo (7/14/30 Hari)</em>.</li>
      </ul>

      <div class="page-break"></div>

      <h1>3. Mengelola Master Supplier (Pabrik Produsen)</h1>
      <p>Database supplier memuat informasi pabrik-pabrik cetak pihak ketiga yang menjadi mitra produksi Paletindo.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgSupplier}" alt="Master Supplier">
        </div>
        <div class="screenshot-caption">Gambar 8.2: Database Master Supplier pabrik produsen beserta rekening bank dan kontak pabrik</div>
      </div>

      <h2>3.1 Informasi Penting pada Data Supplier</h2>
      <ul>
        <li><strong>Nama Pabrik / Supplier:</strong> Nama badan usaha pabrik rekanan.</li>
        <li><strong>Nomor WhatsApp Marketing Pabrik:</strong> Digunakan untuk pengiriman dokumen Purchase Order langsung dari sistem.</li>
        <li><strong>Nomor Rekening Bank Resmi Pabrik:</strong> Nama bank, nomor rekening, dan nama pemilik rekening untuk mencegah kekeliruan saat Bude melakukan transfer pembayaran hutang.</li>
      </ul>

      <h1>4. Katalog Master Produk & Penamaan Standar</h1>
      <p>PALORA memuat 451 item produk asli Paletindo. Setiap produk memiliki identitas unik berupa kode SKU.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgKatalog}" alt="Katalog Master Produk">
        </div>
        <div class="screenshot-caption">Gambar 8.3: Katalog master produk dengan dimensi ukuran, satuan kemasan koli/dus, dan foto asli</div>
      </div>

      <h2>4.1 Aturan Standarisasi Penamaan Produk Plastik Paletindo</h2>
      <div class="callout callout-info">
        <div class="callout-title">Format Penamaan Resmi: [Jenis Barang] [Kode] [Warna/Varian]</div>
        Contoh: <strong>Keranjang Segi 2808 Biru</strong> atau <strong>Baskom Cuci 2288 Merah</strong>.
        <br>Dengan selalu mencantumkan nomor kode di depan varian warna, Mas Heri dan Pak Yanto tidak akan pernah lagi keliru membedakan produk yang bentuknya mirip di rak gudang!
      </div>
    `,
  };
}

export function getModul09() {
  const imgPengguna = getImgBase64('25_admin_pengguna.png');
  const imgAktivitas = getImgBase64('26_admin_aktivitas.png');
  const imgPengaturan = getImgBase64('27_admin_pengaturan.png');

  return {
    docCode: 'MB-09/PLR/2026',
    title: 'Modul Administrasi, Keamanan & Pengaturan Sistem',
    moduleName: 'Administrasi & Keamanan (Admin, Audit Trail & Settings)',
    roleList: ['Owner'],
    version: '1.0',
    summary: 'Petunjuk pengelolaan akun pengguna, pembagian peran wewenang (RBAC), pemantauan log audit trail transaksi, pengaturan identitas kop surat perusahaan, serta jadwal backup database rutin.',
    contentHtml: `
      <h1>1. Wewenang Eksklusif Administrator & Owner</h1>
      <p>
        Modul Administrasi dan Pengaturan adalah panel kendali tertinggi yang <strong>hanya dapat dibuka oleh akun Pak Yanto (Owner)</strong>. Modul ini bertanggung jawab atas keamanan data perusahaan, hak akses staf, serta transparansi seluruh aktivitas kerja.
      </p>

      <h1>2. Manajemen Pengguna & Hak Akses (User Management)</h1>
      <p>Menu <strong>Pengguna</strong> memungkinkan Owner untuk menambah akun staf baru, mengatur peran kerja, atau menonaktifkan akun karyawan yang sudah tidak bekerja.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgPengguna}" alt="Manajemen Pengguna">
        </div>
        <div class="screenshot-caption">Gambar 9.1: Layar Manajemen Akun Pengguna dan pembagian wewenang role RBAC</div>
      </div>

      <h2>2.1 Prosedur Menambah Pengguna Baru atau Ganti Password</h2>
      <ol>
        <li>Buka menu <strong>Pengguna</strong> &rarr; klik tombol <strong>+ Tambah Pengguna</strong>.</li>
        <li>Masukkan nama lengkap karyawan, alamat email login resmi, dan password awal.</li>
        <li>Pilih <strong>Peran (Role)</strong> yang sesuai:
          <ul>
            <li><strong>Gudang:</strong> Untuk staf lapangan (akses: Stok, Kasir, Terima Barang PO, Surat Jalan, Opname).</li>
            <li><strong>Finance:</strong> Untuk staf pembukuan (akses: Piutang, Hutang, Arsip, Laporan, Pembayaran).</li>
            <li><strong>Owner:</strong> Akses penuh tanpa batas termasuk harga modal dan pengaturan sistem.</li>
          </ul>
        </li>
        <li>Klik <strong>Simpan Pengguna</strong>.</li>
      </ol>

      <div class="page-break"></div>

      <h1>3. Pengawasan Audit Trail & Log Aktivitas Sistem</h1>
      <p>Untuk mencegah tuduhan sepihak atau kebingungan saat terjadi selisih stok fisik, PALORA mencatat setiap aksi operasional ke dalam menu <strong>Aktivitas</strong>.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgAktivitas}" alt="Layar Log Aktivitas Sistem">
        </div>
        <div class="screenshot-caption">Gambar 9.2: Halaman Log Aktivitas Sistem (Audit Trail) mencatat waktu, pelaku, dan rincian perubahan data</div>
      </div>

      <h2>3.1 Prinsip Kerja Audit Trail</h2>
      <div class="callout callout-info">
        <div class="callout-title">Catatan Tidak Bisa Dihapus (Immutable Log)</div>
        Setiap kali seseorang membuat pesanan, mencatat DP, menerbitkan surat jalan, menerima barang PO, mengubah stok opname, atau mengedit data master, sistem server secara otomatis mencatat:
        <strong>Siapa pelakunya, tanggal dan jam detik transaksi, alamat IP, jenis aksi, serta rincian data sebelum dan sesudah diubah</strong>. Catatan ini bersifat permanen dan tidak dapat diedit atau dihapus oleh siapa pun.
      </div>

      <div class="page-break"></div>

      <h1>4. Pengaturan Identitas Perusahaan & Kop Surat Dokumen</h1>
      <p>Menu <strong>Pengaturan</strong> digunakan untuk mengonfigurasi profil bisnis yang akan tercetak pada kop resmi seluruh dokumen (Surat Jalan, Nota, Invoice, PO).</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgPengaturan}" alt="Pengaturan Perusahaan">
        </div>
        <div class="screenshot-caption">Gambar 9.3: Layar Pengaturan Identitas Perusahaan PT Paletindo Prakarsa Unggul</div>
      </div>

      <h2>4.1 Data Identitas yang Dapat Dikonfigurasi</h2>
      <ul>
        <li><strong>Nama Perusahaan:</strong> PT Paletindo Prakarsa Unggul</li>
        <li><strong>Alamat Kantor & Gudang:</strong> Alamat resmi untuk kop surat pengiriman barang.</li>
        <li><strong>Nomor Telepon & Hotline WA:</strong> Kontak layanan pelanggan yang tercetak di nota.</li>
        <li><strong>Nomor Rekening Bank Resmi:</strong> Daftar nomor rekening BCA / Mandiri yang otomatis dicantumkan pada template penagihan WhatsApp dan nota pesanan.</li>
        <li><strong>Catatan Kaki Nota:</strong> Teks syarat dan ketentuan (misal: "Barang yang sudah dibeli tidak dapat ditukar kecuali perjanjian khusus").</li>
      </ul>

      <h1>5. Prosedur Backup & Keamanan Database Rutin</h1>
      <p>Database PALORA disimpan secara lokal di komputer gudang (SQLite engine via PocketBase). Untuk mengantisipasi kerusakan perangkat keras laptop atau komputer gudang, wajib dilakukan pencadangan rutin:</p>

      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Backup Otomatis Harian (File Script Windows)</div>
            <p class="step-desc">Di folder <code>backend/windows/</code> telah disediakan script <code>backup-palora.bat</code>. Script ini dapat dijadwalkan otomatis setiap pukul 21:00 WIB untuk menyalin file database ke flashdisk eksternal atau Google Drive.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Prosedur Pemulihan Data Darurat (Restore)</div>
            <p class="step-desc">Apabila komputer gudang rusak, cukup pasang file backup folder <code>pb_data</code> ke komputer cadangan baru dan jalankan <code>jalankan-palora.bat</code>. Seluruh data operasional akan kembali 100% utuh dalam waktu kurang dari 5 menit.</p>
          </div>
        </div>
      </div>
    `,
  };
}
