// Initial Master Data authentic to PT Paletindo Prakarsa Unggul / Paletindo Inti Makmur
// Derived directly from: 'PO 37.xlsx', 'Stok Stok.xlsx' (Sheet1 & Sheet2 - 446 SKUs), 'SURAT JALAN.pdf', and 'FAKTUR PAJAK.pdf'
import { PALETINDO_FULL_STOCK } from './paletindoInventory.js';

export const INITIAL_PRODUCTS = PALETINDO_FULL_STOCK;

export const INITIAL_CUSTOMERS = [
  {
    id: 'CUST-001',
    name: 'PT ASTRO TECHNOLOGIES INDONESIA',
    contactPerson: 'Ibu Syafina Nur Fauzia',
    phone: '021-5698-XXXX / 0812-9988-7766',
    address: 'Graha Antero Lt. 5-6, Jl. Tomang Raya No. 27, Tomang, Grogol Petamburan, Jakarta Barat 11440',
    shippingAddress: 'Storage Asset Hub PSG, Jl. Raya Cirendeu No. 6 Pisangan, Tangerang Selatan',
    npwp: '04.303.054.6-608.600',
    type: 'Korporat',
    creditLimit: 50000000,
    currentDebt: 0
  },
  {
    id: 'CUST-002',
    name: 'Toko Plastik Berkah Jaya',
    contactPerson: 'Pak Haji Rohman',
    phone: '0812-3456-7890',
    address: 'Pasar Induk Kramat Jati Blok C No. 12, Jakarta Timur',
    shippingAddress: 'Pasar Induk Kramat Jati Blok C No. 12, Jakarta Timur',
    npwp: '08.123.456.7-001.000',
    type: 'Grosir',
    creditLimit: 15000000,
    currentDebt: 3500000
  },
  {
    id: 'CUST-003',
    name: 'CV Sinar Logistik',
    contactPerson: 'Ibu Ratna',
    phone: '0813-8877-6655',
    address: 'Kawasan Industri Pulogadung No. 45, Jakarta Timur',
    shippingAddress: 'Kawasan Industri Pulogadung No. 45, Jakarta Timur',
    npwp: '02.998.877.6-002.000',
    type: 'Korporat',
    creditLimit: 25000000,
    currentDebt: 0
  },
  {
    id: 'CUST-004',
    name: 'Grosir Makmur Sentosa',
    contactPerson: 'Koh Hendra',
    phone: '0817-9900-1122',
    address: 'Jl. Raya Bekasi Timur No. 88, Bekasi',
    shippingAddress: 'Jl. Raya Bekasi Timur No. 88, Bekasi',
    npwp: '09.554.433.2-003.000',
    type: 'Grosir',
    creditLimit: 20000000,
    currentDebt: 8250000
  }
];

export const INITIAL_SUPPLIERS = [
  {
    id: 'SUP-001',
    name: 'PT LINHUI',
    salesPerson: 'Ibu Fitri',
    phone: '021-5590-XXXX / 0812-8877-6655',
    address: 'Kawasan Industri Manis, Jl. Manis Raya No. 12, Tangerang',
    terms: 'Tempo 30 Hari',
    categories: ['Box Logistik 43147/43170', 'Palet Mangkuk 1111/1210', 'Kontainer 3.37kg']
  },
  {
    id: 'SUP-002',
    name: 'PT FUTARI PLASTIK INDONESIA',
    salesPerson: 'Pak Hendra Kusuma',
    phone: '021-5918-XXXX',
    address: 'Kawasan Industri Pasar Kemis, Tangerang, Banten',
    terms: 'Tempo 30 Hari',
    categories: ['Palet FUTARI FP 0303', 'Palet FLAT', 'Part Case Small/Medium/Besar', 'Keranjang Solid 481', 'Lure Box']
  },
  {
    id: 'SUP-003',
    name: 'PT MASPION KENCANA',
    salesPerson: 'Pak Budi Santoso',
    phone: '031-891-2345',
    address: 'Sidoarjo Industrial Estate, Jawa Timur',
    terms: 'Tempo 45 Hari',
    categories: ['Box 2315', 'Box 2823', 'TB Classy 13"/17"', 'Fancy Grill', 'Teko Regoletto']
  },
  {
    id: 'SUP-004',
    name: 'RABBIT PLASTIK INDONESIA',
    salesPerson: 'Pak Gunawan Rabbit',
    phone: '021-6530-8899',
    address: 'Kawasan Industri Pulogadung, Jakarta Timur',
    terms: 'Tempo 30 Hari',
    categories: ['Krat Gelas 7001/7202', 'Krat Telur 9001', 'Krat Botol 8002/8006', 'Keranjang Tipe 1001-6699', 'Palet NPK/NPS']
  },
  {
    id: 'SUP-005',
    name: 'BIOPLAST',
    salesPerson: 'Ibu Yenny Bioplast',
    phone: '021-5437-9900',
    address: 'Daan Mogot KM 19, Tangerang',
    terms: 'Tempo 14 Hari',
    categories: ['Ember 4L/20L', 'Ember Pull Up', 'Toples 500-1200ml Tutup Alumunium']
  },
  {
    id: 'SUP-006',
    name: 'PT ASIA PLAST',
    salesPerson: 'Pak Victor Asia Plast',
    phone: '021-5555-8811',
    address: 'Kawasan Industri Cikupa Mas, Tangerang',
    terms: 'Tempo 30 Hari',
    categories: ['Kontainer Lipat Solid', 'Kontainer Lipat Berlubang + Tutup']
  },
  {
    id: 'SUP-007',
    name: 'GOLDEN',
    salesPerson: 'Sales Representative Golden',
    phone: '021-690-1122',
    address: 'Jakarta Barat',
    terms: 'Diskon 10% + 2.5% CBD',
    categories: ['Krat Industri ORI 61x42x32', 'KW1', 'Keranjang Kelengkeng']
  },
  {
    id: 'SUP-008',
    name: 'GBU PLASTIK',
    salesPerson: 'Sales Team GBU',
    phone: '021-628-9900',
    address: 'Jakarta Utara',
    terms: 'Tempo 14 Hari',
    categories: ['Gelas Kimmy', 'Gelas Boston', 'Tempat Sendok Clara', 'Ember Mizu 12L/15L']
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'ORD-001',
    orderNo: 'INV/PIM/202605/0062',
    date: '2026-05-22',
    customer: 'PT ASTRO TECHNOLOGIES INDONESIA',
    poCustomerRef: 'ID1/POR/260500000-360',
    upPerson: 'Ibu Syafina Nur Fauzia',
    destination: 'Storage Asset Hub PSG, Jl. Raya Cirendeu No. 6 Pisangan, Tangerang Selatan',
    items: [
      { productCode: 'PLT-0002', name: 'Palet FP 0303 - Hijau', qty: 100, price: 31900, total: 3190000 }
    ],
    totalAmount: 3190000,
    dpAmount: 3190000,
    remainingAmount: 0,
    paymentType: 'Transfer Mandiri (Lunas)',
    paymentStatus: 'Lunas',
    deliveryStatus: 'Sudah Diterbitkan Surat Jalan (0062/DO/PIM/V/2026)',
    taxInvoiceNo: '04002600191092114',
    dppAmount: 2926605,
    ppnAmount: 263395,
    dueDate: null,
    notes: 'Sesuai pesanan PO ID1/POR/260500000-360. Faktur Pajak sudah diterbitkan.',
    createdBy: 'Pak Yanto'
  },
  {
    id: 'ORD-002',
    orderNo: 'INV/PIM/202609/0088',
    date: '2026-09-22',
    customer: 'Toko Plastik Berkah Jaya',
    poCustomerRef: 'PO-BJ-991',
    upPerson: 'Pak Haji Rohman',
    destination: 'Pasar Induk Kramat Jati Blok C No. 12, Jakarta Timur',
    items: [
      { productCode: 'PLT-0004', name: 'Palet FP 0303 - Coklat', qty: 50, price: 31900, total: 1595000 },
      { productCode: 'PLT-0005', name: 'Palet FP 0303 - Orange', qty: 40, price: 31900, total: 1276000 }
    ],
    totalAmount: 2871000,
    dpAmount: 1000000, // DP > 25% (Min DP Rp 717.750)
    remainingAmount: 1871000,
    paymentType: 'Tempo 14 Hari',
    paymentStatus: 'DP Terbayar (Tahan Pengiriman)',
    deliveryStatus: 'Tahan (Menunggu Pelunasan)',
    taxInvoiceNo: null,
    dueDate: '2026-10-06',
    notes: 'SOP Mas Heri: Jangan kirim barang sebelum sisa Rp 1.871.000 lunas atau disetujui Pak De!',
    createdBy: 'Mas Heri'
  },
  {
    id: 'ORD-003',
    orderNo: 'INV/PIM/202609/0090',
    date: '2026-09-18',
    customer: 'Grosir Makmur Sentosa',
    poCustomerRef: 'GMS-0982',
    upPerson: 'Koh Hendra',
    destination: 'Jl. Raya Bekasi Timur No. 88, Bekasi',
    items: [
      { productCode: 'PLT-0008', name: 'Palet FP 0303 - Light Grey', qty: 30, price: 31900, total: 957000 }
    ],
    totalAmount: 957000,
    dpAmount: 0,
    remainingAmount: 957000,
    paymentType: 'Tempo 7 Hari',
    paymentStatus: 'Belum Bayar (Overdue)',
    deliveryStatus: 'Barang Ditahan',
    taxInvoiceNo: null,
    dueDate: '2026-09-25',
    notes: 'Customer belum bayar DP. Barang tetap tertahan di gudang.',
    createdBy: 'Mas Heri'
  }
];

export const INITIAL_PO = [
  {
    id: 'PO-037',
    poNo: 'PO-037/PIM/2026',
    date: '2026-05-18',
    supplier: 'PT FUTARI PLASTIK INDONESIA',
    upPerson: 'Pak Hendra Kusuma',
    items: [
      { productCode: 'PLT-0002', name: 'Palet FP 0303 - Hijau', qty: 200, buyPrice: 26000, total: 5200000 }
    ],
    totalAmount: 5200000,
    status: 'Menunggu Pengiriman Pabrik',
    expectedDate: '2026-05-25',
    notes: 'PO Resmi No. 37 PT Futari. Supir Paletindo siap ambil ke pabrik Pasar Kemis Tangerang.',
    createdBy: 'Pak Yanto (Owner)'
  },
  {
    id: 'PO-036',
    poNo: 'PO-036/PIM/2026',
    date: '2026-05-10',
    supplier: 'PT FUTARI PLASTIK INDONESIA',
    upPerson: 'Pak Hendra Kusuma',
    items: [
      { productCode: 'PLT-0002', name: 'Palet FP 0303 - Hijau', qty: 500, buyPrice: 26000, total: 13000000 }
    ],
    totalAmount: 13000000,
    status: 'Selesai & Masuk Stok',
    expectedDate: '2026-05-15',
    notes: 'Barang sudah masuk fisik di Gudang B - Blok Palet. Diterima lengkap oleh Mas Heri.',
    createdBy: 'Pak Yanto (Owner)'
  }
];

export const INITIAL_DELIVERIES = [
  {
    id: 'SJ-0062',
    sjNo: '0062/DO/PIM/V/2026',
    date: '2026-05-23',
    orderNo: 'INV/PIM/202605/0062',
    customer: 'PT ASTRO TECHNOLOGIES INDONESIA',
    poCustomerRef: 'ID1/POR/260500000-360',
    upPerson: 'Ibu Syafina Nur Fauzia',
    destination: 'Storage Asset Hub PSG, Jl. Raya Cirendeu No. 6 Pisangan, Tangerang Selatan',
    driverName: 'Pak Suryanto / Supir Paletindo',
    vehiclePlate: 'B 9482 PPU (Pickup Grandmax)',
    status: 'Terkirim & Diterima',
    taxInvoiceNo: '04002600191092114',
    items: [
      { productCode: 'PLT-0002', name: 'Palet FP 0303 - Hijau', qty: 100, unit: 'pcs' }
    ],
    signedBy: 'Ibu Syafina Nur Fauzia (Stempel PT Astro Technologies Ind)'
  }
];

export const INITIAL_STOCK_MOVEMENTS = [
  {
    id: 'MV-001',
    date: '2026-05-15 14:30',
    type: 'IN',
    productId: 'PRD-0002',
    productCode: 'PLT-0002',
    productName: 'Palet FP 0303 - Hijau',
    qty: 500,
    refNo: 'PO-036/PIM/2026',
    reason: 'Penerimaan barang dari PO pabrik PT FUTARI',
    beforeStock: 1104,
    afterStock: 1604,
    operator: 'Mas Heri'
  },
  {
    id: 'MV-002',
    date: '2026-05-23 09:15',
    type: 'OUT',
    productId: 'PRD-0002',
    productCode: 'PLT-0002',
    productName: 'Palet FP 0303 - Hijau',
    qty: -100,
    refNo: '0062/DO/PIM/V/2026',
    reason: 'Pengiriman via Surat Jalan ke PT ASTRO TECHNOLOGIES',
    beforeStock: 1704,
    afterStock: 1604,
    operator: 'Mas Heri'
  },
  {
    id: 'MV-003',
    date: '2026-09-20 16:00',
    type: 'OPNAME',
    productId: 'PRD-0001',
    productCode: 'PLT-0001',
    productName: 'Palet FP 0303 - Merah',
    qty: -2,
    refNo: 'SO-2026-09',
    reason: 'Penyesuaian fisik Stock Opname Bulanan Mas Heri (stok riil 0)',
    beforeStock: 2,
    afterStock: 0,
    operator: 'Mas Heri'
  },
  {
    id: 'MV-004',
    date: '2026-09-25 11:20',
    type: 'ADJUSTMENT',
    productId: 'PRD-0008',
    productCode: 'PLT-0008',
    productName: 'Palet FP 0303 - Light Grey',
    qty: 10,
    refNo: 'ADJ-2026-001',
    reason: 'Penataan ulang rak Gudang B (ditemukan 10 pcs tambahan)',
    beforeStock: 1081,
    afterStock: 1091,
    operator: 'Mas Heri'
  }
];

export const INITIAL_DOCUMENTS = [
  {
    id: 'DOC-001',
    title: 'Surat Jalan No. 0062/DO/PIM/V/2026 - PT Futari',
    type: 'Surat Jalan Asli (Stempel Basah)',
    refNo: 'PO-036/PIM/2026',
    date: '2026-05-15',
    partner: 'PT FUTARI PLASTIK INDONESIA',
    fileName: 'SURAT JALAN.pdf',
    uploadedBy: 'Mas Heri',
    category: 'Surat Jalan'
  },
  {
    id: 'DOC-002',
    title: 'Faktur Pajak No. 04002600191092114 - PT Futari',
    type: 'Faktur Pajak Elektronik (e-Faktur)',
    refNo: 'PO-036/PIM/2026',
    date: '2026-05-15',
    partner: 'PT FUTARI PLASTIK INDONESIA',
    fileName: 'FAKTUR PAJAK.pdf',
    uploadedBy: 'Bude (Keuangan)',
    category: 'Faktur Pajak'
  },
  {
    id: 'DOC-003',
    title: 'Purchase Order No. 37 - PT Linhui',
    type: 'Surat Pesanan Supplier',
    refNo: 'PO-037/PIM/2026',
    date: '2026-05-18',
    partner: 'PT LINHUI',
    fileName: 'PO 37.xlsx',
    uploadedBy: 'Pak Yanto',
    category: 'Purchase Order'
  },
  {
    id: 'DOC-004',
    title: 'Rekap Stock Barang Jadi Paletindo',
    type: 'Data Opname Fisik Gudang',
    refNo: 'STK-PIM-20250412',
    date: '2025-04-12',
    partner: 'Gudang Utama Paletindo',
    fileName: 'Stok Stok.xlsx',
    uploadedBy: 'Mas Heri',
    category: 'Stok Opname'
  }
];

export const APP_MODULES = [
  {
    id: 'sales',
    title: 'Penjualan & Kasir',
    subtitle: 'Point of Sale, Nota & DP 25%',
    description: 'Input pesanan toko/korporat, validasi minimal DP 25%, dan kontrol status siap kirim.',
    category: 'Operasional Kasir',
    icon: 'Store',
    badge: '3 Pesanan',
    roleAccess: ['owner', 'gudang']
  },
  {
    id: 'purchases',
    title: 'Pembelian & PO',
    subtitle: 'Surat Pesanan ke Pabrik',
    description: 'Pembuatan surat PO pabrik resmi (PT Linhui, PT Futari, PT Maspion) & otomatis tambah stok masuk.',
    category: 'Pengadaan Pabrik',
    icon: 'FileText',
    badge: '1 PO Pending',
    roleAccess: ['owner', 'gudang']
  },
  {
    id: 'inventory',
    title: 'Gudang & Stok',
    subtitle: 'Master Barang & Opname',
    description: 'Stok fisik barang jadi (Part Case Futari, Palet FP 0303, Krat Gelas/Telur), mutasi otomatis & batas kritis.',
    category: 'Manajemen Gudang',
    icon: 'Boxes',
    badge: '1 Kritis',
    roleAccess: ['owner', 'gudang', 'finance']
  },
  {
    id: 'deliveries',
    title: 'Surat Jalan & Kirim',
    subtitle: 'Logistik Armada & Supir',
    description: 'Terbitkan Surat Jalan resmi Paletindo (DO/PIM), otomatis potong stok gudang, dan rekam stempel terima.',
    category: 'Logistik Gudang',
    icon: 'Truck',
    badge: '1 Terkirim',
    roleAccess: ['owner', 'gudang']
  },
  {
    id: 'receivables',
    title: 'Piutang & Kas',
    subtitle: 'Tagihan Tempo & Pelunasan',
    description: 'Monitoring piutang toko langganan (tempo 7-30 hari), rekonsiliasi transfer Mandiri/BCA & kontrol kredit.',
    category: 'Keuangan & Finansial',
    icon: 'CreditCard',
    badge: 'Rp 11.75 Jt',
    roleAccess: ['owner', 'finance']
  },
  {
    id: 'documents',
    title: 'Arsip Dokumen',
    subtitle: 'Surat Jalan & Faktur Digital',
    description: 'Penyimpanan bukti fisik surat jalan stempel basah, e-Faktur Pajak, dan berkas PO per transaksi.',
    category: 'Administrasi',
    icon: 'FolderArchive',
    badge: '4 Berkas',
    roleAccess: ['owner', 'gudang', 'finance']
  },
  {
    id: 'marketplace',
    title: 'Import Marketplace',
    subtitle: 'Shopee & Tokopedia Excel',
    description: 'Sinkronisasi pesanan Shopee & Tokopedia via upload file Excel untuk potong stok gudang otomatis.',
    category: 'Penjualan Online',
    icon: 'FileSpreadsheet',
    badge: 'Excel Sync',
    roleAccess: ['owner', 'gudang']
  },
  {
    id: 'masterdata',
    title: 'Master Data',
    subtitle: 'Pelanggan & Supplier Pabrik',
    description: 'Database mitra usaha: PT Astro Tech, Toko Grosir, PT Linhui, PT Futari, PT Maspion, dan pricelist.',
    category: 'Master Bisnis',
    icon: 'Users',
    badge: '4 Toko • 4 Pabrik',
    roleAccess: ['owner', 'gudang', 'finance']
  },
  {
    id: 'reports',
    title: 'Laporan & Rekap',
    subtitle: 'Omzet & Barang Terlaris',
    description: 'Rekapitulasi penjualan, analisis margin per item, valuasi aset gudang, dan ekspor laporan keuangan Excel.',
    category: 'Laporan Eksekutif',
    icon: 'BarChart3',
    badge: 'Rekap Realtime',
    roleAccess: ['owner', 'finance']
  },
  {
    id: 'systemlogs',
    title: 'Aktivitas Sistem',
    subtitle: 'Audit Trail & Keamanan',
    description: 'Log riwayat seluruh aktivitas operator (Kasir, Gudang, PO, dll) untuk keamanan data (Audit Trail).',
    category: 'Sistem Administrasi',
    icon: 'Activity',
    badge: 'Log Aktif',
    roleAccess: ['owner']
  },
  {
    id: 'users',
    title: 'Pengguna & Akses',
    subtitle: 'Akun Login & Role',
    description: 'Kelola akun login tim (Owner, Admin Gudang, Keuangan), reset password, dan nonaktifkan akun.',
    category: 'Sistem Administrasi',
    icon: 'UserCog',
    badge: 'Owner',
    roleAccess: ['owner']
  }
];

export const INITIAL_SYSTEM_LOGS = [
  {
    id: 'LOG-001',
    date: '2026-09-29 08:30:15',
    user: 'Mas Heri (Admin Gudang & POS)',
    module: 'Penjualan',
    action: 'Pembuatan Nota Penjualan',
    detail: 'Mencetak nota kasir POS-392812 (Total Rp 450.000)'
  },
  {
    id: 'LOG-002',
    date: '2026-09-29 09:12:44',
    user: 'Bude (Keuangan)',
    module: 'Pembelian',
    action: 'Pelunasan PO Pabrik',
    detail: 'Melunasi PO-PTL-2026-0112 ke PT LINHUI'
  }
];
