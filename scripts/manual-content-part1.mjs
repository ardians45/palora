// Konten Manual Book Bagian 1: Modul 00, 01, 02
import { getImgBase64 } from './manual-builder.mjs';

export function getModul00() {
  const imgLogin = getImgBase64('00_login.png');
  const imgLauncherOwner = getImgBase64('01_launcher_owner.png');
  const imgLauncherGudang = getImgBase64('28_launcher_gudang.png');
  const imgLauncherFinance = getImgBase64('29_launcher_keuangan.png');

  return {
    docCode: 'MB-00/PLR/2026',
    title: 'Panduan Umum, Hak Akses & Navigasi Sistem',
    moduleName: 'Panduan Umum & Sistem (System Overview)',
    roleList: ['Owner', 'Gudang', 'Finance'],
    version: '1.0',
    summary: 'Pengenalan sistem internal PALORA bagi seluruh jajaran manajemen dan operasional PT Paletindo Prakarsa Unggul, mencakup tata cara login, pembagian hak akses, navigasi menu, dan prinsip operasional.',
    contentHtml: `
      <h1>1. Mengenal Sistem Internal PALORA</h1>
      <p>
        <strong>PALORA</strong> adalah aplikasi web operasional terintegrasi yang dirancang khusus untuk memenuhi kebutuhan bisnis <strong>PT Paletindo Prakarsa Unggul</strong>, distributor terkemuka produk plastik rumah tangga (seperti baskom, keranjang, kotak makan, botol minum, dan wadah serbaguna). Sistem ini melayani transaksi harian baik pada lini <em>Business to Business (B2B)</em> untuk toko grosir dan agen, maupun <em>Business to Consumer (B2C)</em> melalui penjualan langsung di gudang (walk-in) dan berbagai platform marketplace nasional.
      </p>

      <div class="callout callout-info">
        <div class="callout-title">Catatan Penting: Sistem Internal Khusus Tim Paletindo</div>
        PALORA sepenuhnya terpisah dari situs katalog publik (paletindo.id/paletindo.com). PALORA adalah <strong>sistem internal tertutup</strong> yang hanya dapat diakses oleh personil resmi perusahaan untuk mencatat pembelian pabrik, mutasi stok fisik, pesanan customer, surat jalan, kasir, dan penagihan keuangan.
      </div>

      <h2>1.1 Masalah Operasional Masa Lalu yang Diselesaikan</h2>
      <p>Sebelum implementasi PALORA, operasional harian Paletindo menghadapi kendala krusial yang bersumber dari pencatatan manual kertas dan spreadsheet Excel yang terpisah:</p>
      <ul>
        <li><strong>Stok Fisik Sering Tidak Sinkron:</strong> Pak Yanto (Pak De) harus berulang kali menelepon Mas Heri di gudang hanya untuk memastikan ketersediaan barang sebelum menerima pesanan pelanggan.</li>
        <li><strong>Kesalahan Tulis Tangan pada PO:</strong> Nomor kode barang yang mirip (misalnya kode <code>2808</code> vs <code>2288</code>) sering salah ditulis pada formulir kertas, mengakibatkan pabrik salah mencetak atau salah mengirim barang.</li>
        <li><strong>Dokumen Fisik Rawan Hilang:</strong> Surat jalan supplier, invoice tagihan, dan faktur pajak yang ditaruh di keranjang meja sering tercecer sebelum sempat direkap oleh Bude untuk pembayaran.</li>
        <li><strong>Piutang Customer Tidak Terpantau:</strong> Penjualan dengan sistem pembayaran tempo sering kali terlambat ditagih atau bahkan terlewat hingga berbulan-bulan karena ketiadaan pengingat jatuh tempo otomatis.</li>
        <li><strong>Ketiadaan Riwayat Perubahan (Audit Trail):</strong> Sulit mengetahui siapa yang mengubah kuantitas stok atau nominal transaksi saat terjadi ketidakcocokan data.</li>
      </ul>

      <h2>1.2 Empat Prinsip Emas PALORA</h2>
      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Mengikuti Alur Kerja Asli (Bukan Memaksa Perubahan)</div>
            <p class="step-desc">PALORA tidak memaksakan cara kerja baru yang rumit. Formulir, istilah, urutan langkah, dan format dokumen di sistem meniru persis dokumen kertas yang sudah bertahun-tahun dipakai tim Paletindo.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Satu Layar, Sedikit Klik</div>
            <p class="step-desc">Antarmuka didesain ringkas dan langsung ke inti pekerjaan tanpa popup bertingkat atau menu tersembunyi yang membingungkan staf gudang.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Harga Selalu Fleksibel (Dapat Dinegosiasi)</div>
            <p class="step-desc">Harga pada master data hanya berfungsi sebagai acuan awal. Pada setiap transaksi pesanan atau kasir, harga satuan selalu dapat disesuaikan sesuai kesepakatan tawar-menawar pelanggan.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-content">
            <div class="step-title">Keamanan Transaksi Terpusat (Atomic Server Rules)</div>
            <p class="step-desc">Perubahan stok barang dan uang hanya diproses di server dalam satu transaksi utuh. Jika salah satu langkah gagal (misal stok gudang tidak mencukupi), seluruh proses dibatalkan secara aman dengan notifikasi yang jelas.</p>
          </div>
        </div>
      </div>

      <div class="page-break"></div>

      <h1>2. Hak Akses & Peran Pengguna (Role Personas)</h1>
      <p>Sistem PALORA membagi wewenang ke dalam 3 peran kerja utama untuk menjamin akuntabilitas dan efisiensi tugas masing-masing:</p>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 22%;">Peran (Role)</th>
            <th style="width: 25%;">Akun & Persona</th>
            <th style="width: 53%;">Tanggung Jawab & Wewenang di Sistem</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge-role badge-owner">Owner</span></td>
            <td><strong>Pak Yanto / Pak De</strong><br><small>yanto@palora.local</small></td>
            <td>
              &bull; Pembuatan dan persetujuan Purchase Order (PO) ke pabrik supplier.<br>
              &bull; Negosiasi harga jual pesanan besar pelanggan B2B.<br>
              &bull; Akses penuh melihat dan mengubah Harga Modal produk.<br>
              &bull; Pemantauan Laporan Keuangan, Arus Kas, dan Log Aktivitas Sistem.<br>
              &bull; Manajemen hak akses karyawan dan identitas perusahaan.
            </td>
          </tr>
          <tr>
            <td><span class="badge-role badge-gudang">Admin Gudang</span></td>
            <td><strong>Mas Heri</strong><br><small>heri@palora.local</small></td>
            <td>
              &bull; Penerimaan barang masuk dari supir pabrik (cek fisik baik vs rusak).<br>
              &bull; Pengambilan foto fisik Surat Jalan supplier melalui HP.<br>
              &bull; Pelaksanaan Stock Opname fisik di rak gudang.<br>
              &bull; Operasional Kasir cepat (walk-in) untuk pembeli langsung.<br>
              &bull; Penerbitan dan pencetakan Surat Jalan pengiriman armada Paletindo.<br>
              &bull; Import laporan penjualan multi-channel marketplace.
            </td>
          </tr>
          <tr>
            <td><span class="badge-role badge-finance">Keuangan</span></td>
            <td><strong>Bude (Ibu)</strong><br><small>bude@palora.local</small></td>
            <td>
              &bull; Verifikasi kelengkapan berkas arsip PO (SJ, Invoice, Faktur Pajak).<br>
              &bull; Pemantauan daftar Hutang Supplier dan pencatatan cicilan transfer.<br>
              &bull; Pengawasan Piutang Pelanggan jatuh tempo dan pengiriman pesan tagih WA.<br>
              &bull; Pencatatan pembayaran uang muka (DP) dan pelunasan nota penjualan.
            </td>
          </tr>
        </tbody>
      </table>

      <h1>3. Tata Cara Masuk ke Sistem (Login)</h1>
      <p>Untuk menjaga kerahasiaan data bisnis, setiap staf wajib melakukan autentikasi menggunakan alamat email dan kata sandi masing-masing.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgLogin}" alt="Layar Login PALORA">
        </div>
        <div class="screenshot-caption">Gambar 0.1: Antarmuka Login PALORA dengan identitas merek PT Paletindo Prakarsa Unggul</div>
      </div>

      <ol>
        <li>Buka peramban (browser) di komputer atau ponsel, lalu akses alamat URL PALORA (misal: <code>http://localhost:5173</code> atau alamat IP server gudang).</li>
        <li>Masukkan alamat email terdaftar pada kolom <strong>Email</strong>.</li>
        <li>Ketik kata sandi pada kolom <strong>Password</strong>.</li>
        <li>Klik tombol <strong>Masuk</strong>. Sistem akan memverifikasi kredensial dan mengarahkan pengguna ke halaman Menu Utama (Launcher).</li>
      </ol>

      <div class="callout callout-warning">
        <div class="callout-title">Keamanan Akun & Sesi Login</div>
        Jangan pernah memberitahukan password Anda kepada pihak lain. Apabila sesi login berakhir karena lama tidak aktif, sistem akan menampilkan pemberitahuan <em>"Sesi login sudah habis. Silakan masuk lagi"</em> demi melindungi keamanan data.
      </div>

      <div class="page-break"></div>

      <h1>4. Navigasi & Tampilan Menu Utama (Launcher)</h1>
      <p>Halaman Menu Utama (Launcher) PALORA dirancang menggunakan konsep ikon aplikasi yang familier, cepat diakses, dan secara otomatis menyesuaikan tampilan berdasarkan peran pengguna yang sedang login.</p>

      <h2>4.1 Tampilan Menu Utama untuk Owner (Pak Yanto)</h2>
      <p>Owner memiliki akses menyeluruh ke semua modul operasional, pengadaan, gudang, keuangan, laporan, hingga administrasi sistem.</p>
      
      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgLauncherOwner}" alt="Layar Launcher Menu Utama Owner">
        </div>
        <div class="screenshot-caption">Gambar 0.2: Tampilan Menu Utama Launcher untuk Peran Owner (Pak Yanto)</div>
      </div>

      <h2>4.2 Perbedaan Tampilan Menu untuk Gudang & Keuangan</h2>
      <p>Untuk menyederhanakan fokus kerja dan menjaga privasi data sensitif, modul yang tidak memiliki izin akses akan disembunyikan secara otomatis dari launcher:</p>

      <div style="display: flex; gap: 14px; margin: 16px 0;">
        <div style="flex: 1;">
          <div class="screenshot-frame">
            <img src="${imgLauncherGudang}" alt="Launcher Mas Heri">
          </div>
          <div class="screenshot-caption">Gambar 0.3: Launcher Admin Gudang (Fokus Stok, Kasir, PO)</div>
        </div>
        <div style="flex: 1;">
          <div class="screenshot-frame">
            <img src="${imgLauncherFinance}" alt="Launcher Bude">
          </div>
          <div class="screenshot-caption">Gambar 0.4: Launcher Keuangan (Fokus Piutang, Hutang, Arsip)</div>
        </div>
      </div>

      <h2>4.3 Elemen Antarmuka Standar di Setiap Halaman</h2>
      <ul>
        <li><strong>Top Bar:</strong> Memuat tombol kembali ke Menu Utama (ikon rumah), nama modul yang sedang aktif, sub-menu navigasi cepat, dan nama pengguna yang sedang aktif di pojok kanan atas.</li>
        <li><strong>Badge Status Real-Time:</strong> Menampilkan angka nyata mengenai tugas tertunda (misal: pesanan menunggu DP, PO belum diterima gudang, atau tagihan tempo).</li>
        <li><strong>Tombol Keluar (Logout):</strong> Terletak di pojok kanan atas untuk mengakhiri sesi kerja dengan aman.</li>
      </ul>
    `,
  };
}

export function getModul01() {
  const imgList = getImgBase64('02_penjualan_list.png');
  const imgBaru = getImgBase64('03_penjualan_baru.png');
  const imgDetail = getImgBase64('04_pesanan_detail.png');
  const imgKasir = getImgBase64('05_kasir_pos.png');
  const imgSJList = getImgBase64('06_surat_jalan_list.png');
  const imgSJDetail = getImgBase64('07_surat_jalan_detail.png');

  return {
    docCode: 'MB-01/PLR/2026',
    title: 'Modul Penjualan, Kasir Walk-in & Surat Jalan',
    moduleName: 'Penjualan (Sales, POS & Delivery)',
    roleList: ['Gudang', 'Owner', 'Finance'],
    version: '1.0',
    summary: 'Panduan lengkap pengelolaan transaksi penjualan B2B, penanganan uang muka (DP), pelunasan nota, operasional kasir cepat di gudang, serta penerbitan dan pencetakan surat jalan pengiriman barang.',
    contentHtml: `
      <h1>1. Konsep & Siklus Penjualan di Paletindo</h1>
      <p>
        Operasional penjualan PT Paletindo Prakarsa Unggul terbagi menjadi dua saluran utama dengan karakteristik alur kerja yang berbeda:
      </p>
      <ul>
        <li><strong>Penjualan Pesanan B2B (Partai Besar / Toko Grosir):</strong> Dilakukan melalui pesanan via WhatsApp/telepon oleh pelanggan lama maupun baru. Memiliki siklus: Pesanan Dibuat &rarr; Pembayaran DP (minimal 25%) &rarr; Pelunasan Pembayaran &rarr; Penerbitan Surat Jalan &rarr; Pengiriman Armada.</li>
        <li><strong>Penjualan Kasir Walk-in B2C (Pembelian Langsung di Gudang):</strong> Pelanggan datang langsung ke lokasi gudang, memilih barang, membayar tunai/transfer di tempat, dan langsung membawa pulang barang tanpa surat jalan. Memerlukan kecepatan transaksi maksimal 3 langkah.</li>
      </ul>

      <div class="callout callout-info">
        <div class="callout-title">Aturan Bisnis: Pemotongan Stok Barang</div>
        Stok barang di gudang <strong>TIDAK terpotong</strong> saat pesanan baru dibuat. Stok baru dipotong secara resmi oleh server saat:
        <br>1. Pesanan telah lunas dan <strong>Surat Jalan Diterbitkan</strong> (untuk pesanan dikirim supir), atau
        <br>2. Tombol <strong>Serahkan (Ambil Sendiri)</strong> diklik, atau
        <br>3. Transaksi pembayaran <strong>Kasir Walk-in Selesai</strong>.
      </div>

      <h1>2. Mengelola Daftar Pesanan (Pesanan List)</h1>
      <p>Modul Penjualan menampilkan seluruh transaksi pesanan yang sedang berjalan maupun yang telah selesai, dilengkapi dengan tab filter status untuk mempermudah monitoring.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgList}" alt="Daftar Pesanan Penjualan">
        </div>
        <div class="screenshot-caption">Gambar 1.1: Halaman Daftar Pesanan dengan filter status dan indikator pembayaran</div>
      </div>

      <h2>2.1 Penjelasan Tab Filter Status Pesanan</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Status</th>
            <th style="width: 25%;">Kondisi Pembayaran</th>
            <th style="width: 50%;">Tindakan Selanjutnya</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Semua</strong></td>
            <td>Menampilkan seluruh riwayat</td>
            <td>Pencarian dan peninjauan riwayat pesanan pelanggan.</td>
          </tr>
          <tr>
            <td><strong>Menunggu DP</strong></td>
            <td>DP belum diterima (Rp 0)</td>
            <td>Pesanan berstatus draf ("cuma pesanan"). Hubungi pembeli untuk konfirmasi transfer DP min 25%.</td>
          </tr>
          <tr>
            <td><strong>Diproses</strong></td>
            <td>DP sudah masuk, sisa belum lunas</td>
            <td>Gudang mulai menyiapkan barang di area muat. Tagih pelunasan sebelum jadwal kirim.</td>
          </tr>
          <tr>
            <td><strong>Lunas</strong></td>
            <td>Pembayaran 100% lunas</td>
            <td>Siap dibuatkan Surat Jalan pengiriman atau diambil langsung oleh pembeli.</td>
          </tr>
          <tr>
            <td><strong>Selesai</strong></td>
            <td>Barang sudah dikirim/diterima</td>
            <td>Transaksi tuntas, stok telah terpotong, arsip tersimpan rapi.</td>
          </tr>
        </tbody>
      </table>

      <div class="page-break"></div>

      <h1>3. Membuat Pesanan Baru (Pesanan Baru)</h1>
      <p>Untuk mencatat pesanan dari pelanggan, klik tombol <strong>+ Pesanan Baru</strong> di pojok kanan atas modul Penjualan.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgBaru}" alt="Formulir Pesanan Baru">
        </div>
        <div class="screenshot-caption">Gambar 1.2: Formulir pembuatan pesanan baru dengan pengisian barang ala spreadsheet Excel</div>
      </div>

      <h2>3.1 Panduan Pengisian Formulir</h2>
      <ol>
        <li><strong>Customer:</strong> Pilih nama pelanggan dari daftar master. Jika pelanggan baru, klik tombol tambah customer untuk mengisi data nama dan kontak.</li>
        <li><strong>Tanggal Pesanan:</strong> Otomatis terisi tanggal hari ini, dapat diubah bila diperlukan.</li>
        <li><strong>Metode Pengiriman:</strong> Pilih antara <em>Dikirim (Pakai Surat Jalan)</em> atau <em>Diambil Sendiri di Gudang</em>.</li>
        <li><strong>Daftar Barang (Tabel):</strong>
          <ul>
            <li>Ketik kode barang atau nama barang pada kolom pencarian. Sistem akan menampilkan pilihan produk beserta foto dan sisa stok fisik.</li>
            <li>Masukkan kuantitas pesanan (<strong>Qty</strong>).</li>
            <li><strong>Harga Satuan:</strong> Terisi otomatis dari harga master, namun <em>bebas diubah</em> apabila Pak Yanto telah menyetujui harga diskon khusus.</li>
            <li>Tekan tombol tambah baris untuk menambah jenis barang berikutnya.</li>
          </ul>
        </li>
        <li><strong>Catatan / Keterangan:</strong> Isi instruksi khusus (misal: "Kirim hari Sabtu pagi" atau "Supir Bpk. Roni").</li>
        <li>Klik tombol <strong>Simpan Pesanan</strong>. Nomor nota resmi (contoh: <code>INV/PPU/202611/0001</code>) akan di-generate otomatis oleh sistem.</li>
      </ol>

      <div class="page-break"></div>

      <h1>4. Mengelola Pembayaran DP & Pelunasan Pesanan</h1>
      <p>Setelah pesanan tersimpan, layar akan menampilkan Halaman Dokumen Pesanan dengan riwayat pembayaran dan tombol aksi operasional.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgDetail}" alt="Detail Dokumen Pesanan">
        </div>
        <div class="screenshot-caption">Gambar 1.3: Halaman Dokumen Pesanan dengan status DP dan tombol Catat Pelunasan</div>
      </div>

      <h2>4.1 Mencatat Pembayaran Uang Muka (DP)</h2>
      <p>Aturan standar Paletindo mewajibkan pembayaran DP minimal 25% dari total pesanan sebelum barang disiapkan di gudang:</p>
      <ul>
        <li>Klik tombol <strong>Catat DP</strong> pada bilah aksi dokumen.</li>
        <li>Masukkan nominal pembayaran yang diterima dari pelanggan (sistem menampilkan rekomendasi nominal 25%).</li>
        <li>Pilih metode penerimaan: <em>Transfer Bank BCA/Mandiri</em> atau <em>Tunai</em>.</li>
        <li>Klik <strong>Simpan DP</strong>. Status dokumen akan berubah menjadi <strong>Diproses</strong>.</li>
        <li>Gunakan tombol <strong>Cetak Nota</strong> atau <strong>Kirim WA</strong> untuk mengirimkan bukti tanda terima DP kepada pelanggan.</li>
      </ul>

      <h2>4.2 Mencatat Pelunasan Pembayaran</h2>
      <ul>
        <li>Saat sisa pembayaran telah dibayarkan oleh customer, klik tombol <strong>Catat Pelunasan</strong>.</li>
        <li>Sistem akan otomatis mengisikan sisa tagihan. Verifikasi rekening penerimaan lalu simpan transaksi.</li>
        <li>Status pesanan berubah menjadi <strong>Lunas</strong>, dan tombol <strong>Buat Surat Jalan</strong> akan aktif.</li>
      </ul>

      <div class="page-break"></div>

      <h1>5. Operasional Kasir Walk-in Cepat (POS Gudang)</h1>
      <p>Menu <strong>Kasir</strong> dirancang khusus untuk Mas Heri di meja depan gudang guna melayani pembeli eceran atau grosir kecil yang datang langsung.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgKasir}" alt="Layar Kasir Walk-in POS">
        </div>
        <div class="screenshot-caption">Gambar 1.4: Layar Kasir Walk-in dengan pencarian kilat, penyesuaian harga tawar, dan kalkulator kembalian</div>
      </div>

      <h2>5.1 Alur Transaksi Kasir 3 Langkah</h2>
      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Pilih Barang (Scan / Ketik)</div>
            <p class="step-desc">Ketik sebagian kode SKU atau nama barang pada kolom cari. Klik barang untuk memasukkannya ke keranjang belanja, lalu sesuaikan jumlah unitnya.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Sesuaikan Harga (Jika Ada Diskon/Nego)</div>
            <p class="step-desc">Jika pembeli menawar dan disetujui, Mas Heri dapat langsung mengedit angka harga satuan pada baris barang tersebut tanpa harus meminta izin admin.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Input Pembayaran & Cetak Struk</div>
            <p class="step-desc">Ketik nominal uang tunai yang diterima dari pembeli. Sistem langsung menghitung jumlah kembalian secara otomatis. Klik tombol <strong>Selesaikan Transaksi & Cetak Struk</strong>. Stok langsung terpotong saat itu juga.</p>
          </div>
        </div>
      </div>

      <div class="page-break"></div>

      <h1>6. Penerbitan & Pencetakan Surat Jalan Pengiriman</h1>
      <p>Surat Jalan (Delivery Order) adalah dokumen legal pengiriman barang yang menyertai supir armada Paletindo ke alamat customer.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgSJList}" alt="Daftar Surat Jalan">
        </div>
        <div class="screenshot-caption">Gambar 1.5: Daftar Surat Jalan yang telah diterbitkan beserta status pengantaran</div>
      </div>

      <h2>6.1 Prosedur Penerbitan Surat Jalan</h2>
      <ol>
        <li>Buka dokumen pesanan yang berstatus <strong>Lunas</strong> (atau pesanan pelanggan tempo terpercaya).</li>
        <li>Klik tombol <strong>Buat Surat Jalan</strong>.</li>
        <li>Pilih nama supir atau jasa ekspedisi, serta nomor polisi kendaraan yang bertugas.</li>
        <li>Verifikasi rincian barang yang dimuat ke dalam truk.</li>
        <li>Klik <strong>Terbitkan Surat Jalan</strong>. Sistem akan memberikan nomor Surat Jalan berformat resmi Paletindo (contoh: <code>0063/DO/PPU/XI/2026</code>).</li>
      </ol>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgSJDetail}" alt="Cetak Surat Jalan Paletindo">
        </div>
        <div class="screenshot-caption">Gambar 1.6: Format cetak resmi Surat Jalan Paletindo ukuran A5 sesuai standar dokumen fisik</div>
      </div>

      <div class="callout callout-success">
        <div class="callout-title">Standar Dokumen Cetak Paletindo</div>
        Format cetak Surat Jalan PALORA meniru persis form kertas formulir A5 yang sudah lazim digunakan: memuat kop resmi PT Paletindo Prakarsa Unggul, rincian alamat pengiriman, nomor pesanan, tabel kuantitas barang, serta 4 kolom tanda tangan legal: <em>Penerima, Supir, Petugas Gudang, dan Penanggung Jawab</em>.
      </div>
    `,
  };
}

export function getModul02() {
  const imgList = getImgBase64('08_pembelian_list.png');
  const imgBaru = getImgBase64('09_pembelian_baru.png');
  const imgDetail = getImgBase64('10_pembelian_detail_terima.png');

  return {
    docCode: 'MB-02/PLR/2026',
    title: 'Modul Pembelian (PO) & Penerimaan Barang Masuk',
    moduleName: 'Pembelian (Purchase Order & Receiving)',
    roleList: ['Owner', 'Gudang', 'Finance'],
    version: '1.0',
    summary: 'Petunjuk operasional penerbitan Purchase Order ke pabrik produsen, fleksibilitas negosiasi harga modal, pencetakan dokumen PO, serta prosedur penerimaan barang masuk bertahap dengan pencatatan barang rusak.',
    contentHtml: `
      <h1>1. Konsep Pengadaan Barang di Paletindo</h1>
      <p>
        PT Paletindo Prakarsa Unggul memproduksi produk plastik menggunakan cetakan (moulding) milik sendiri yang dititipkan pada pabrik-pabrik cetak pihak ketiga (supplier). Oleh karena itu, hubungan dengan supplier memiliki karakteristik khusus:
      </p>
      <ul>
        <li><strong>Satu PO untuk Satu Supplier:</strong> Satu lembar Purchase Order hanya boleh ditujukan kepada satu pabrik produsen tertentu.</li>
        <li><strong>Nomor Dokumen Dikontrol Sendiri:</strong> Penomoran PO diatur sepenuhnya oleh Paletindo (format: <code>PO-038/PPU/2026</code>) untuk memudahkan penelusuran.</li>
        <li><strong>Penerimaan Bertahap (Multi-Surat Jalan):</strong> Satu lembar PO yang dipesan sering kali dikirim oleh pabrik secara bertahap dalam 2 sampai 3 kali pengiriman menggunakan Surat Jalan supplier yang berbeda-beda tergantung kapasitas muatan truk pabrik.</li>
        <li><strong>Pemisahan Barang Rusak (Afkir):</strong> Kuantitas barang yang rusak/pecah selama perjalanan tidak boleh dimasukkan ke dalam stok gudang dan harus dicatat terpisah untuk klaim retur ke pabrik.</li>
      </ul>

      <h1>2. Mengelola Daftar Purchase Order (PO List)</h1>
      <p>Modul Pembelian memuat seluruh daftar pengadaan barang yang diajukan ke pabrik beserta progres penerimaan barang fisiknya.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgList}" alt="Daftar Purchase Order">
        </div>
        <div class="screenshot-caption">Gambar 2.1: Daftar Purchase Order dengan status penerimaan bertahap dan total nilai belanja</div>
      </div>

      <h2>2.1 Arti Status pada Purchase Order</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Status PO</th>
            <th style="width: 35%;">Penjelasan Kondisi</th>
            <th style="width: 40%;">Tindak Lanjut Operasional</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Menunggu</strong></td>
            <td>PO baru dikirim ke pabrik, barang belum datang ke gudang Paletindo sama sekali.</td>
            <td>Pak Yanto memantau kepastian jadwal produksi pabrik. Mas Heri menyiapkan space rak gudang.</td>
          </tr>
          <tr>
            <td><strong>Diterima Sebagian</strong></td>
            <td>Truk pabrik sudah tiba mengirimkan sebagian barang (SJ ke-1), sisa barang masih menunggu pengiriman berikutnya.</td>
            <td>Mas Heri mengecek sisa kuantitas yang belum terkirim. PO tetap terbuka menunggu pengiriman berikutnya.</td>
          </tr>
          <tr>
            <td><strong>Selesai</strong></td>
            <td>Seluruh kuantitas barang yang dipesan telah diterima 100% di gudang Paletindo.</td>
            <td>Dokumen PO ditutup. Bude memproses pencocokan invoice tagihan pabrik untuk pembayaran hutang.</td>
          </tr>
        </tbody>
      </table>

      <div class="page-break"></div>

      <h1>3. Membuat Purchase Order Baru (PO Baru)</h1>
      <p>Wewenang membuat PO berada pada <strong>Pak Yanto (Owner)</strong> atau staf gudang yang diberi izin.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgBaru}" alt="Formulir PO Baru">
        </div>
        <div class="screenshot-caption">Gambar 2.2: Formulir pembuatan PO baru dengan auto-fill harga modal dan perhitungan total otomatis</div>
      </div>

      <h2>3.1 Langkah Pengisian Form PO</h2>
      <ol>
        <li>Klik menu <strong>Pembelian</strong> &rarr; pilih <strong>PO Baru</strong>.</li>
        <li>Pilih nama pabrik produsen pada kolom <strong>Supplier</strong>.</li>
        <li>Tentukan <strong>Tanggal PO</strong> dan perkiraan tanggal barang diharapkan tiba di gudang.</li>
        <li>Pada tabel barang, masukkan kode barang atau cari nama produk plastik yang akan diproduksi.
          <div class="callout callout-info" style="margin: 8px 0;">
            <strong>Auto-fill Harga Modal:</strong> Sistem akan otomatis menampilkan harga modal acuan dari master data. Namun, Pak Yanto dapat langsung mengubah nominal harga satuan apabila ada kenaikan biaya biji plastik atau diskon volume dari pabrik.
          </div>
        </li>
        <li>Masukkan jumlah pesanan (<strong>Qty</strong>) per jenis barang.</li>
        <li>Periksa total nominal belanja yang dihitung otomatis oleh sistem di bagian bawah tabel.</li>
        <li>Klik tombol <strong>Simpan PO</strong>.</li>
        <li>Gunakan tombol <strong>Cetak PO</strong> untuk mengunduh dokumen resmi dengan kop PT Paletindo Prakarsa Unggul atau klik <strong>Kirim WA</strong> untuk mengirimkan file dokumen langsung ke PIC pabrik.</li>
      </ol>

      <div class="page-break"></div>

      <h1>4. Prosedur Penerimaan Barang Masuk (Terima Barang Bertahap)</h1>
      <p>Ketika truk ekspedisi atau supir pabrik tiba di gudang membawa muatan barang, <strong>Mas Heri</strong> wajib membuka dokumen PO terkait untuk mencatat penerimaan barang.</p>

      <div class="screenshot-container">
        <div class="screenshot-frame">
          <img src="${imgDetail}" alt="Layar Detail PO dan Terima Barang">
        </div>
        <div class="screenshot-caption">Gambar 2.3: Dialog penerimaan barang masuk dengan input kuantitas baik vs rusak dan upload foto bukti fisik SJ</div>
      </div>

      <h2>4.1 Panduan Cek Fisik & Input Penerimaan Barang</h2>
      <div class="step-flow">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Buka Dokumen PO Terkait & Klik "Terima Barang"</div>
            <p class="step-desc">Cari nomor PO di sistem yang sesuai dengan pesanan yang dikirim oleh supir pabrik, lalu klik tombol biru <strong>Terima Barang</strong>.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Input Nomor Surat Jalan Supplier</div>
            <p class="step-desc">Ketik nomor surat jalan fisik yang dibawa oleh supir pabrik (contoh: <code>SJ-PABRIK-8891</code>). Nomor ini wajib diisi sebagai bukti verifikasi pembukuan.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Hitung Fisik: Qty Baik vs Qty Rusak</div>
            <p class="step-desc">Lakukan penghitungan fisik saat barang diturunkan dari truk. Masukkan jumlah barang dalam kondisi prima pada kolom <strong>Qty Baik</strong>, dan masukkan jumlah barang yang pecah/cacat pada kolom <strong>Qty Rusak</strong>.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-content">
            <div class="step-title">Ambil Foto Surat Jalan Fisik (Kamera HP)</div>
            <p class="step-desc">Klik tombol <strong>Upload / Ambil Foto SJ</strong>. Foto lembaran kertas surat jalan yang telah ditandatangani supir. Foto ini akan tersimpan permanen di arsip digital dan tidak akan hilang.</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-content">
            <div class="step-title">Konfirmasi & Simpan Penerimaan</div>
            <p class="step-desc">Klik <strong>Simpan Penerimaan</strong>. Dalam sepersekian detik, server PALORA akan:</p>
            <ul>
              <li>Menambahkan <strong>Qty Baik</strong> ke dalam stok riil gudang secara otomatis.</li>
              <li>Mencatat <strong>Qty Rusak</strong> ke dalam log cacat (tidak masuk stok).</li>
              <li>Memperbarui sisa kuantitas PO yang belum terkirim.</li>
              <li>Mencatat riwayat penerimaan di modul Arsip Dokumen Bude.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="callout callout-warning">
        <div class="callout-title">Peringatan Gudang: Larangan Penggabungan SJ</div>
        Satu lembar surat jalan dari supplier hanya boleh dicatat untuk satu nomor PO. Jangan pernah menggabungkan dua nomor PO ke dalam satu pencatatan penerimaan surat jalan guna menghindari kekeliruan perhitungan hutang supplier oleh Bude.
      </div>
    `,
  };
}
