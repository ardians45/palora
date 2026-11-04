// Konten Manual Book Bagian 2: Modul 03, 04, 05
import { getImgBase64 } from './manual-builder.mjs';

export function getModul03() {
  const imgKatalog = getImgBase64('11_stok_katalog.png');
  const imgMutasi = getImgBase64('12_stok_mutasi.png');
  const imgOpnameList = getImgBase64('13_stok_opname_list.png');
  const imgOpnameBaru = getImgBase64('14_stok_opname_baru.png');
  const imgHarga = getImgBase64('15_stok_harga_modal.png');
  const imgKartu = getImgBase64('16_stok_kartu_detail.png');

  return {
    docCode: 'MB-03/PLR/2026',
    title: 'Modul Stok Gudang, Mutasi & Stock Opname',
    moduleName: 'Stok Gudang (Inventory & Warehouse Control)',
    roleList: ['Gudang', 'Owner', 'Finance'],
    version: '1.0',
    summary: 'Tata kelola persediaan 451+ produk plastik rumah tangga, penelusuran kartu stok real-time, audit trail mutasi barang, prosedur stock opname berkala, dan manajemen harga modal produk.',
    contentHtml: `
      <h1>1. Prinsip Pengelolaan Stok Barang Paletindo</h1>
      <p>
        Manajemen persediaan barang di gudang PT Paletindo Prakarsa Unggul mencakup lebih dari 451 item produk plastik rumah tangga (seperti baskom, keranjang pakaian, toples, botol minum, kursi plastik, dan wadah serbaguna). Sebelum adanya PALORA, stok hanya dicatat di file Excel lokal Mas Heri yang sering tidak sinkron dengan fisik gudang.
      </p>
      
      <div class="callout callout-info">
        <div class="callout-title">Aturan Bisnis: Akurasi Stok Real-Time</div>
        Di dalam PALORA, <strong>seluruh data stok terpusat di server</strong>. Setiap kali ada barang masuk dari pabrik (penerimaan PO), barang keluar (surat jalan / serah kasir), atau impor marketplace, jumlah stok langsung bertambah atau berkurang secara real-time tanpa perlu entri manual ganda.
      </div>

      <h1>2. Menjelajahi Katalog Stok Barang</h1>
      <p>Halaman <strong>Stok Barang</strong> menampilkan inventaris lengkap seluruh produk Paletindo dengan visualisasi foto produk, indikator sisa stok, satuan kemasan, dan kategori produk.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgKatalog}" alt="Katalog Stok Gudang">
        </div>
        <div class="screenshot-caption">Gambar 3.1: Halaman Katalog Stok Barang dengan pencarian SKU cepat, filter kategori, dan foto produk</div>
      </div>

      <h2>2.1 Fitur Pencarian Cepat & Menghindari Kode Tertukar</h2>
      <p>Salah satu kendala terbesar masa lalu adalah tertukarnya barang dengan nomor kode yang mirip (contoh klasik: kode <code>2808</code> vs <code>2288</code>):</p>
      <ul>
        <li><strong>Pencarian Multi-Kata:</strong> Anda dapat mengetik kode barang (misal: <code>2808</code>) atau kombinasi nama dan warna (misal: <code>keranjang segi biru</code>).</li>
        <li><strong>Foto Produk Asli:</strong> Setiap baris produk dilengkapi thumbnail foto produk dari katalog resmi Paletindo. Arahkan kursor atau klik foto untuk memperbesar tampilan dan memastikan fisik barang tidak salah ambil.</li>
        <li><strong>Indikator Warna Stok:</strong>
          <ul>
            <li><span style="color: #15803d; font-weight: bold;">Hijau (Aman):</span> Stok melimpah (&gt; 50 unit).</li>
            <li><span style="color: #b45309; font-weight: bold;">Kuning (Menipis):</span> Stok mendekati batas minimum (1 &ndash; 49 unit).</li>
            <li><span style="color: #b91c1c; font-weight: bold;">Merah (Habis):</span> Stok 0 unit, segera buat PO baru ke pabrik.</li>
          </ul>
        </li>
      </ul>

      <div class="page-break"></div>

      <h1>3. Kartu Stok & Riwayat Mutasi Barang (Audit Trail)</h1>
      <p>Setiap transaksi barang masuk maupun keluar terekam permanen dalam kartu stok individual untuk setiap produk.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgKartu}" alt="Kartu Stok Produk">
        </div>
        <div class="screenshot-caption">Gambar 3.2: Rincian Kartu Stok Produk yang mencatat tanggal, jenis transaksi, nomor dokumen, dan saldo sisa</div>
      </div>

      <h2>3.1 Cara Membuka Kartu Stok Suatu Produk</h2>
      <ol>
        <li>Buka menu <strong>Stok Gudang</strong>.</li>
        <li>Cari produk yang ingin diperiksa, lalu klik baris produk tersebut.</li>
        <li>Jendela <strong>Kartu Stok</strong> akan terbuka menampilkan:
          <ul>
            <li>Informasi spesifikasi barang (ukuran dimensi, kemasan per dus/koli).</li>
            <li>Stok awal, total masuk, total keluar, dan sisa stok fisik saat ini.</li>
            <li>Tabel riwayat mutasi kronologis: tanggal/jam, nama dokumen (No. PO atau No. Surat Jalan/Nota), keterangan mutasi, kuantitas, dan nama pengguna yang memproses.</li>
          </ul>
        </li>
      </ol>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgMutasi}" alt="Halaman Riwayat Mutasi Semua Stok">
        </div>
        <div class="screenshot-caption">Gambar 3.3: Layar Riwayat Mutasi Semua Barang untuk audit investigasi selisih stok</div>
      </div>

      <div class="page-break"></div>

      <h1>4. Prosedur Stock Opname Fisik Gudang</h1>
      <p>Stock Opname adalah kegiatan pencocokan antara jumlah fisik barang di rak gudang dengan data yang tercatat di sistem PALORA.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgOpnameList}" alt="Daftar Sesi Stock Opname">
        </div>
        <div class="screenshot-caption">Gambar 3.4: Daftar riwayat sesi Stock Opname yang pernah dilakukan di gudang</div>
      </div>

      <div class="callout callout-danger">
        <div class="callout-title">Aturan Krusial: Opname Hanya Mengubah Barang yang Dihitung</div>
        Sistem lama memiliki kelemahan fatal di mana sesi opname mereset seluruh barang lain menjadi 0 jika tidak diisi. Di PALORA, <strong>hanya baris barang yang benar-benar Anda isi angka fisiknya yang akan disesuaikan</strong>. Barang lain yang tidak dihitung pada sesi tersebut tetap aman dan tidak akan berubah.
      </div>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgOpnameBaru}" alt="Layar Perhitungan Stock Opname">
        </div>
        <div class="screenshot-caption">Gambar 3.5: Formulir input hasil hitung fisik opname dengan kalkulasi selisih otomatis (+ / -)</div>
      </div>

      <h2>4.1 Langkah-Langkah Pelaksanaan Opname Fisik</h2>
      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Cetak Lembar Hitung Opname (Kertas)</div>
            <p class="step-desc">Klik tombol <strong>Cetak Lembar Opname</strong>. Mas Heri dapat memilih kelompok barang (misal: "Keranjang" atau "Baskom"). Bawa lembaran kertas ini ke lorong rak gudang untuk mencatat hitungan manual.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Buka Menu "Stok Opname" &rarr; Klik "+ Opname Baru"</div>
            <p class="step-desc">Di komputer gudang atau tablet, buka menu <strong>Stok Opname</strong> lalu buat sesi baru dengan memilih kelompok produk yang baru saja dihitung.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Input Angka Fisik Hasil Hitungan</div>
            <p class="step-desc">Ketik jumlah fisik yang dihitung pada kolom <strong>Fisik</strong>. Sistem langsung menghitung <strong>Selisih</strong> secara otomatis. Jika ada barang hilang/kurang akan berwarna merah (negatif), jika berlebih akan berwarna biru (positif).</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-content">
            <div class="step-title">Tulis Alasan & Simpan Penyesuaian</div>
            <p class="step-desc">Isi kolom keterangan bila ada selisih (misal: "Pecah di rak belakang" atau "Salah hitung koli"). Klik tombol <strong>Simpan Penyesuaian Stok</strong>. Sistem akan mencatat penyesuaian ini ke dalam kartu stok dan riwayat aktivitas.</p>
          </div>
        </div>
      </div>

      <div class="page-break"></div>

      <h1>5. Pengaturan Harga Modal Produk (Khusus Owner)</h1>
      <p>Untuk menjaga kerahasiaan margin keuntungan perusahaan, menu <strong>Harga Modal</strong> hanya dapat diakses oleh akun <strong>Pak Yanto (Owner)</strong>.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgHarga}" alt="Layar Pengaturan Harga Modal">
        </div>
        <div class="screenshot-caption">Gambar 3.6: Halaman kelola Harga Modal produk khusus akun Owner dengan pengeditan cepat ala Excel</div>
      </div>

      <h2>5.1 Panduan Update Harga Modal</h2>
      <ul>
        <li>Gunakan fitur pencarian untuk menemukan produk yang mengalami perubahan harga beli dari pabrik.</li>
        <li>Ketik langsung nominal harga modal baru pada kolom yang tersedia.</li>
        <li>Klik tombol <strong>Simpan Perubahan</strong>. Harga modal baru ini akan otomatis menjadi acuan isian awal saat membuat lembar Purchase Order berikutnya ke supplier.</li>
      </ul>
    `,
  };
}

export function getModul04() {
  const imgPiutang = getImgBase64('17_keuangan_piutang.png');
  const imgPiutangDetail = getImgBase64('18_keuangan_piutang_detail.png');
  const imgHutang = getImgBase64('19_keuangan_hutang.png');

  return {
    docCode: 'MB-04/PLR/2026',
    title: 'Modul Keuangan: Piutang Customer & Hutang Supplier',
    moduleName: 'Keuangan (Finance, Receivables & Payables)',
    roleList: ['Finance', 'Owner'],
    version: '1.0',
    summary: 'Panduan tata kelola penagihan piutang pelanggan tempo, fitur tagih cepat via WhatsApp, pengelolaan jatuh tempo hutang ke pabrik supplier, serta pencatatan cicilan pelunasan.',
    contentHtml: `
      <h1>1. Peran Sentral Keuangan di Palora</h1>
      <p>
        Modul Keuangan adalah instrumen kerja harian utama bagi <strong>Bude (Administrasi Keuangan)</strong> dan <strong>Pak Yanto (Owner)</strong>. Modul ini menyatukan dua sisi arus kas perusahaan:
      </p>
      <ul>
        <li><strong>Piutang Customer:</strong> Uang milik Paletindo yang masih tertahan di toko-toko pelanggan karena fasilitas tempo pembayaran.</li>
        <li><strong>Hutang Supplier:</strong> Kewajiban pembayaran yang harus dilunasi Paletindo kepada pabrik-pabrik produsen atas barang cetak yang telah diterima di gudang.</li>
      </ul>

      <h1>2. Manajemen Piutang Customer (Daftar Tagihan Tempo)</h1>
      <p>Menu <strong>Piutang</strong> menampilkan daftar seluruh pelanggan yang memiliki saldo tagihan belum lunas, diurutkan berdasarkan tingkat urgensi jatuh tempo.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgPiutang}" alt="Daftar Piutang Customer">
        </div>
        <div class="screenshot-caption">Gambar 4.1: Layar Piutang Customer dengan informasi saldo total, batas tempo, dan tombol aksi tagih</div>
      </div>

      <h2>2.1 Kolom-Kolom Utama pada Tabel Piutang</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Nama Kolom</th>
            <th style="width: 75%;">Fungsi & Makna Operasional</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Customer</strong></td>
            <td>Nama toko grosir atau agen yang memiliki tagihan berjalan.</td>
          </tr>
          <tr>
            <td><strong>Total Tagihan</strong></td>
            <td>Akumulasi seluruh nominal faktur penjualan tempo yang belum dilunasi.</td>
          </tr>
          <tr>
            <td><strong>Faktur Tertua</strong></td>
            <td>Tanggal transaksi paling lama yang belum beres, menjadi acuan prioritas penagihan.</td>
          </tr>
          <tr>
            <td><strong>Status / Aging</strong></td>
            <td>
              <span style="color: #15803d; font-weight: bold;">Lancar:</span> Belum melewati tanggal jatuh tempo.<br>
              <span style="color: #b91c1c; font-weight: bold;">Jatuh Tempo:</span> Sudah melewati tanggal perjanjian bayar, harus segera ditagih.
            </td>
          </tr>
          <tr>
            <td><strong>Aksi</strong></td>
            <td>Tombol untuk membuka rincian faktur atau langsung mengirim pesan tagihan via WhatsApp.</td>
          </tr>
        </tbody>
      </table>

      <div class="page-break"></div>

      <h1>3. Rincian Piutang Per Customer & Fitur Tagih via WhatsApp</h1>
      <p>Klik nama pelanggan pada tabel piutang untuk membuka buku pembantu piutang individual pelanggan tersebut.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgPiutangDetail}" alt="Detail Piutang dan Tagih WA">
        </div>
        <div class="screenshot-caption">Gambar 4.2: Halaman Rincian Piutang Customer menampilkan riwayat nota tempo, log cicilan, dan tombol Tagih via WA</div>
      </div>

      <h2>3.1 Prosedur Penagihan Otomatis via WhatsApp (Satu Klik)</h2>
      <p>Masalah penagihan di masa lalu adalah Bude sering lupa nominal rincian nota atau sungkan merangkai kata penagihan. PALORA menyediakan fitur <strong>Tagih via WhatsApp</strong> otomatis:</p>
      
      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Klik Tombol "Tagih via WA"</div>
            <p class="step-desc">Pada baris pelanggan yang jatuh tempo, klik tombol hijau <strong>Tagih via WA</strong>.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Sistem Menyiapkan Pesan Resmi yang Santun</div>
            <p class="step-desc">Sistem secara otomatis membuka aplikasi WhatsApp (web atau desktop) dengan pesan siap kirim yang telah memuat rincian nomor invoice, daftar nota yang jatuh tempo, total saldo yang harus dibayar, serta nomor rekening resmi Paletindo.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Kirim & Catat Respon Pembeli</div>
            <p class="step-desc">Tekan tombol kirim di WhatsApp. Jika pembeli membalas dengan janji bayar (misal: "Bayar hari Senin"), tulis catatan tersebut pada kolom log piutang.</p>
          </div>
        </div>
      </div>

      <h2>3.2 Mencatat Pembayaran Cicilan Piutang</h2>
      <ul>
        <li>Saat transfer bank dari pelanggan diterima, klik tombol <strong>Catat Pembayaran</strong> pada nota terkait.</li>
        <li>Ketik jumlah nominal uang yang ditransfer.</li>
        <li>Pilih rekening bank tujuan (misal: BCA Paletindo) dan masukkan tanggal penerimaan dana.</li>
        <li>Klik <strong>Simpan Pembayaran</strong>. Sisa saldo piutang pelanggan akan otomatis berkurang. Jika lunas, status nota otomatis berubah menjadi <strong>Lunas</strong>.</li>
      </ul>

      <div class="page-break"></div>

      <h1>4. Mengelola Hutang Supplier (Kewajiban Pembayaran Pabrik)</h1>
      <p>Menu <strong>Hutang Supplier</strong> khusus digunakan Bude untuk melacak kewajiban pembayaran kepada pabrik-pabrik cetak plastik mitra Paletindo.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgHutang}" alt="Daftar Hutang Supplier">
        </div>
        <div class="screenshot-caption">Gambar 4.3: Halaman Hutang Supplier per Purchase Order dengan pemantauan jatuh tempo invoice pabrik</div>
      </div>

      <h2>4.1 Alur Pencatatan & Pelunasan Hutang Supplier</h2>
      <ol>
        <li>Hutang supplier muncul secara otomatis di daftar ini setiap kali ada <strong>Penerimaan Barang Masuk (PO)</strong> yang dicatat oleh Mas Heri di gudang.</li>
        <li>Ketika pabrik mengirimkan lembaran <em>Invoice Tagihan</em> fisik atau via WA:
          <ul>
            <li>Buka dokumen hutang nomor PO terkait.</li>
            <li>Cocokkan nominal invoice pabrik dengan total penerimaan barang fisik di sistem.</li>
            <li>Ketik tanggal jatuh tempo pembayaran sesuai kesepakatan tempo (misal: 14 hari atau 30 hari).</li>
          </ul>
        </li>
        <li><strong>Mencatat Pelunasan / Pembayaran Cicilan:</strong>
          <ul>
            <li>Setelah Pak Yanto atau Bude melakukan transfer bank ke rekening pabrik, klik tombol <strong>Catat Pembayaran Hutang</strong>.</li>
            <li>Ketik nominal yang ditransfer, pilih bank sumber dana, dan masukkan nomor referensi transfer.</li>
            <li>Simpan transaksi. Sisa hutang ke pabrik tersebut langsung terupdate.</li>
          </ul>
        </li>
      </ol>

      <div class="callout callout-info">
        <div class="callout-title">Sinkronisasi Otomatis dengan Modul Arsip</div>
        Setiap kali Bude mencatat pembayaran invoice supplier, bukti transfer dapat langsung diunggah ke dalam folder <strong>Arsip Dokumen</strong> nomor PO terkait agar berkas transaksi tersimpan rapi dan lengkap untuk pelaporan pajak.
      </div>
    `,
  };
}

export function getModul05() {
  const imgMarketplace = getImgBase64('20_marketplace.png');

  return {
    docCode: 'MB-05/PLR/2026',
    title: 'Modul Marketplace Multi-Channel',
    moduleName: 'Marketplace (Multi-Store Order Sync & Inventory Deduction)',
    roleList: ['Gudang', 'Owner'],
    version: '1.0',
    summary: 'Petunjuk sinkronisasi penjualan online multi-toko (Shopee, Tokopedia, Lazada, Blibli), prosedur download laporan seller center, verifikasi pencocokan SKU, dan pemotongan stok gudang yang aman.',
    contentHtml: `
      <h1>1. Mengapa Modul Marketplace Diperlukan?</h1>
      <p>
        Selain melayani pesanan grosir B2B dan walk-in, PT Paletindo Prakarsa Unggul mengoperasikan banyak toko online pada platform e-commerce nasional ternama:
      </p>
      <ul>
        <li><strong>Shopee:</strong> 3 Akun Toko Resmi</li>
        <li><strong>Tokopedia:</strong> 2 Akun Toko Resmi</li>
        <li><strong>Lazada:</strong> 1 Akun Toko</li>
        <li><strong>Blibli:</strong> 1 Akun Toko</li>
      </ul>
      <p>
        Di masa lalu, setiap sore Mas Heri harus membuka satu per satu akun seller center, melihat barang yang laku, lalu mengurangi angka stok di file Excel secara manual. Proses manual ini memakan waktu lebih dari 1,5 jam setiap hari dan sangat sering terjadi kesalahan ketik atau barang lupa terpotong sehingga stok fisik menjadi selisih.
      </p>

      <h1>2. Alur Kerja Modul Marketplace PALORA</h1>
      <p>PALORA menyederhanakan proses pemotongan stok marketplace menjadi sistem impor berkas laporan dengan validasi cerdas 3 tahap:</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgMarketplace}" alt="Layar Impor Laporan Marketplace">
        </div>
        <div class="screenshot-caption">Gambar 5.1: Layar Impor Laporan Marketplace dengan drop-zone berkas dan pencocokan SKU barang</div>
      </div>

      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Unduh Laporan Penjualan dari Seller Center</div>
            <p class="step-desc">Mas Heri masuk ke dashboard seller center toko online (misal: Shopee Seller Centre), buka menu <em>Pesanan &rarr; Pesanan Selesai / Siap Dikirim</em>, lalu unduh berkas laporan dalam format Excel (<code>.xlsx</code>) atau CSV.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Pilih Marketplace & Unggah Berkas ke PALORA</div>
            <p class="step-desc">Di PALORA, buka menu <strong>Marketplace</strong>. Pilih saluran yang sesuai (contoh: <em>Shopee - Toko 1</em>), lalu seret (drag-and-drop) atau pilih file Excel yang baru diunduh tadi.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Pencocokan SKU & Layar Pratinjau (Preview)</div>
            <p class="step-desc">Sistem akan membaca isi file dan mencocokkan kolom kode SKU barang dengan master data 451 barang Paletindo. PALORA akan menampilkan tabel pratinjau yang memperlihatkan: nama barang, total unit terjual, dan sisa stok sebelum & sesudah dipotong.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-content">
            <div class="step-title">Konfirmasi & Eksekusi Pemotongan Stok</div>
            <p class="step-desc">Setelah Mas Heri memastikan angka kuantitas sesuai, klik tombol hijau <strong>Konfirmasi & Potong Stok</strong>. Stok gudang langsung terpotong secara otomatis dalam satu transaksi server terpadu, dan riwayat penjualan tercatat di modul Laporan.</p>
          </div>
        </div>
      </div>

      <div class="page-break"></div>

      <h1>3. Menangani SKU yang Belum Terdaftar (Mapping SKU)</h1>
      <p>Terkadang nama varian barang di marketplace ditulis berbeda dengan kode SKU master Paletindo (misalnya di Shopee ditulis <code>BASKOM-PLSTK-MERAH</code>, sedangkan di sistem berkode <code>2808-M</code>):</p>

      <div class="callout callout-warning">
        <div class="callout-title">Deteksi Otomatis SKU Tidak Dikenal</div>
        Apabila sistem menemukan baris barang yang tidak cocok, baris tersebut akan diberi tanda peringatan kuning <em>"SKU Belum Dipetakan"</em>. Mas Heri cukup memilih nama barang padanan dari dropdown yang muncul sekali saja. Sistem akan mengingat pemetaan tersebut untuk impor di masa mendatang!
      </div>

      <h2>3.1 Keuntungan Penggunaan Modul Marketplace</h2>
      <ul>
        <li><strong>Kecepatan:</strong> Proses rekap penjualan marketplace yang tadinya 1,5 jam berkurang menjadi kurang dari 2 menit.</li>
        <li><strong>Mencegah Overselling:</strong> Stok gudang yang real-time mencegah terjadinya pembeli toko online memesan barang yang fisiknya sudah habis di gudang.</li>
        <li><strong>Audit Transparan:</strong> Setiap transaksi impor mencatat nama file yang diunggah, jam transaksi, dan user yang mengonfirmasi.</li>
      </ul>
    `,
  };
}
