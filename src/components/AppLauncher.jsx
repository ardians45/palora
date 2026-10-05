import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { APP_MODULES } from '../data/mockData';

// 24 Authentic Palora ERP Apps for PT Paletindo Prakarsa Unggul
// Every single name and icon visual strictly corresponds to what it opens!
export const PALORA_APPS = [
  // ROW 1: TRANSAKSI UTAMA (Sales, Kasir, Gudang, Opname, Pembelian, Surat Jalan)
  {
    id: 'sales_orders',
    title: 'Penjualan',
    subtitle: 'Pesanan & Nota Pelanggan',
    targetModuleId: 'sales',
    initialTab: 'all',
    icon: (
      // 3 ascending rounded bars in purple, orange, red (Iconic Sales Chart)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="9" y="20" width="6" height="13" rx="3" fill="#b37feb" />
        <rect x="17" y="14" width="6" height="19" rx="3" fill="#fa8c16" />
        <rect x="25" y="8" width="6" height="25" rx="3" fill="#ff4d4f" />
      </svg>
    )
  },
  {
    id: 'pos_cashier',
    title: 'Kasir (POS)',
    subtitle: 'Point of Sale & DP 25%',
    targetModuleId: 'sales',
    initialTab: 'dp',
    icon: (
      // Striped shopfront awning in orange, gold, purple (Iconic Point of Sale)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <path d="M7 13h26l-3 10H10L7 13z" fill="#fa8c16" />
        <path d="M12 13h5l-1 10h-4l0-10z" fill="#ffd666" />
        <path d="M23 13h5l-1 10h-4l0-10z" fill="#ffd666" />
        <path d="M7 23c1.5 2 4.5 2 6 0 1.5 2 4.5 2 6 0 1.5 2 4.5 2 6 0 1.5 2 4.5 2 6 0v2H7v-2z" fill="#fa541c" />
        <rect x="9" y="27" width="22" height="4" rx="2" fill="#722ed1" />
      </svg>
    )
  },
  {
    id: 'inventory_stock',
    title: 'Stok Gudang',
    subtitle: 'Palet, Krat & Part Case Futari',
    targetModuleId: 'inventory',
    initialTab: 'inventory',
    initialFilter: 'all',
    badge: 1,
    badgeColor: '#ef4444',
    icon: (
      // 3D Isometric cube box in purple, orange, gold (Iconic Odoo Inventory Cube)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <polygon points="20,8 31,14 20,20 9,14" fill="#faad14" />
        <polygon points="9,14 20,20 20,32 9,26" fill="#722ed1" />
        <polygon points="20,20 31,14 31,26 20,32" fill="#fa541c" />
      </svg>
    )
  },
  {
    id: 'stock_opname',
    title: 'Stock Opname',
    subtitle: 'Cek Fisik & Penyesuaian Mas Heri',
    targetModuleId: 'inventory',
    initialTab: 'opname',
    icon: (
      // Clipboard with checkmark in emerald & purple (Iconic Project/Task Check)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <path d="M12 21l6 6L30 11" stroke="#00b96b" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 27l6 6L28 19" stroke="#722ed1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      </svg>
    )
  },
  {
    id: 'purchases_po',
    title: 'Pembelian (PO)',
    subtitle: 'Surat Pesanan Pabrik PO-037/PIM',
    targetModuleId: 'purchases',
    initialTab: 'all',
    icon: (
      // Horizontal layered purchase cards in teal, purple, coral (Iconic Purchase)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="7" y="11" width="26" height="5" rx="2" fill="#13c2c2" />
        <rect x="7" y="18" width="26" height="5" rx="2" fill="#722ed1" />
        <rect x="7" y="25" width="26" height="5" rx="2" fill="#fa541c" />
      </svg>
    )
  },
  {
    id: 'deliveries_do',
    title: 'Surat Jalan (DO)',
    subtitle: 'DO/PIM & Armada Pengiriman',
    targetModuleId: 'deliveries',
    initialTab: 'all',
    badge: 1,
    badgeColor: '#0ea5e9',
    icon: (
      // Delivery truck in cyan & deep blue
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <path d="M6 12h17v14H6V12z" fill="#0284c7" />
        <path d="M23 16h6l4 4v6h-10V16z" fill="#38bdf8" />
        <circle cx="12" cy="27" r="3.5" fill="#0f172a" />
        <circle cx="28" cy="27" r="3.5" fill="#0f172a" />
        <circle cx="12" cy="27" r="1.5" fill="#fff" />
        <circle cx="28" cy="27" r="1.5" fill="#fff" />
      </svg>
    )
  },

  // ROW 2: KEUANGAN, PAJAK, ARSIP & MITRA
  {
    id: 'receivables_ar',
    title: 'Piutang & Kas',
    subtitle: 'Tagihan Tempo & Pelunasan Bank',
    targetModuleId: 'receivables',
    initialTab: 'all',
    icon: (
      // Bold modern % symbol in purple & teal (Iconic Accounting %)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <circle cx="13" cy="14" r="4.5" fill="#722ed1" />
        <path d="M10 29l20-18" stroke="#13c2c2" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="27" cy="26" r="4.5" fill="#722ed1" />
      </svg>
    )
  },
  {
    id: 'faktur_pajak',
    title: 'Faktur Pajak',
    subtitle: 'e-Faktur PPN 11% & DPP',
    targetModuleId: 'documents',
    initialFilter: 'Faktur Pajak',
    icon: (
      // Tax document with official seal in blue & gold
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="7" width="24" height="26" rx="4" fill="#1e3a8a" />
        <path d="M13 14h14M13 19h14M13 24h9" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="26" cy="25" r="4.5" fill="#f59e0b" />
        <path d="M24.5 25l1 1 2-2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'digital_documents',
    title: 'Arsip Berkas',
    subtitle: 'Surat Jalan Asli Stempel Basah',
    targetModuleId: 'documents',
    initialFilter: '',
    icon: (
      // 3 overlapping colored sheets (Iconic Documents)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="9" y="11" width="16" height="20" rx="3" transform="rotate(-10 9 11)" fill="#1890ff" opacity="0.9" />
        <rect x="14" y="9" width="16" height="20" rx="3" transform="rotate(5 14 9)" fill="#faad14" opacity="0.9" />
        <rect x="18" y="11" width="16" height="20" rx="3" transform="rotate(18 18 11)" fill="#ff4d4f" />
      </svg>
    )
  },
  {
    id: 'import_marketplace',
    title: 'Import Excel',
    subtitle: 'Sinkronisasi Shopee & Tokopedia',
    targetModuleId: 'marketplace',
    initialTab: 'all',
    icon: (
      // Dual swirling waves in blue & cyan (Iconic Sync Waves)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <path d="M8 18c6-6 18-6 24 0s-6 6-12 6-18-6-12-6z" fill="#096dd9" />
        <path d="M8 22c6 6 18 6 24 0s-6-6-12-6-18 6-12 6z" fill="#40a9ff" />
      </svg>
    )
  },
  {
    id: 'customers_data',
    title: 'Pelanggan',
    subtitle: 'PT Astro Technologies & Toko Grosir',
    targetModuleId: 'masterdata',
    initialTab: 'customers',
    icon: (
      // ID card / contact badge in green & purple (Iconic Contacts)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="7" width="24" height="26" rx="5" fill="#00b96b" />
        <circle cx="20" cy="16" r="4.5" fill="#ffffff" />
        <path d="M12 28c0-3.5 3.5-5 8-5s8 1.5 8 5" fill="#ffffff" />
        <rect x="15" y="6" width="10" height="3" rx="1.5" fill="#722ed1" />
      </svg>
    )
  },
  {
    id: 'suppliers_data',
    title: 'Pabrik & Supplier',
    subtitle: 'PT Linhui, PT Futari & PT Maspion',
    targetModuleId: 'masterdata',
    initialTab: 'suppliers',
    icon: (
      // Factory manufacturing shapes in teal & orange (Iconic Manufacturing)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="14" width="10" height="18" rx="2" fill="#08979c" />
        <rect x="15" y="10" width="10" height="22" rx="2" fill="#13c2c2" opacity="0.9" />
        <rect x="22" y="16" width="10" height="16" rx="2" fill="#fa8c16" />
      </svg>
    )
  },

  // ROW 3: LAPORAN, JADWAL, TENGGAT, OTORISASI
  {
    id: 'financial_reports',
    title: 'Laporan Omzet',
    subtitle: 'Rekapitulasi Penjualan & Margin',
    targetModuleId: 'reports',
    initialTab: 'all',
    icon: (
      // 4-quadrant rounded dashboard widgets in purple, rose, yellow, teal (Iconic Dashboards)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="8" width="10" height="10" rx="3" fill="#eb2f96" />
        <rect x="22" y="8" width="10" height="10" rx="3" fill="#fa541c" />
        <rect x="8" y="22" width="10" height="10" rx="3" fill="#722ed1" />
        <rect x="22" y="22" width="10" height="10" rx="3" fill="#13c2c2" />
      </svg>
    )
  },
  {
    id: 'delivery_schedule',
    title: 'Jadwal Kirim',
    subtitle: 'Antrean Kirim Armada Supir',
    targetModuleId: 'deliveries',
    initialTab: 'all',
    icon: (
      // Calendar with "31" top in red/white (Iconic Calendar)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="8" width="28" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
        <path d="M6 14C6 10.686 8.686 8 12 8h16c3.314 0 6 2.686 6 6v2H6v-2z" fill="#f5222d" />
        <circle cx="12" cy="11" r="1.5" fill="#ffffff" />
        <circle cx="28" cy="11" r="1.5" fill="#ffffff" />
        <text x="20" y="27" textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="800" fontFamily="system-ui, sans-serif">31</text>
      </svg>
    )
  },
  {
    id: 'payment_due',
    title: 'Jatuh Tempo',
    subtitle: 'Monitoring Tempo Piutang 14-30 Hari',
    targetModuleId: 'receivables',
    initialTab: 'all',
    badge: 25,
    badgeColor: '#f59e0b',
    icon: (
      // Calendar with green checkmark (Iconic Appointments)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="8" width="28" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
        <path d="M6 14C6 10.686 8.686 8 12 8h16c3.314 0 6 2.686 6 6v2H6v-2z" fill="#00b96b" />
        <circle cx="12" cy="11" r="1.5" fill="#ffffff" />
        <circle cx="28" cy="11" r="1.5" fill="#ffffff" />
        <text x="16" y="26" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="800">31</text>
        <circle cx="26" cy="24" r="5" fill="#00b96b" />
        <path d="M24 24l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'official_stamp',
    title: 'Tanda Tangan',
    subtitle: 'Otorisasi Direktur & Stempel',
    targetModuleId: 'documents',
    initialFilter: 'Surat Jalan',
    icon: (
      // Signature curve in dark teal (Iconic Sign)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <path d="M9 25c4-12 7-15 9-6 2 8 4 10 7 2s4-10 6-6" stroke="#00474f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="31" cy="18" r="2" fill="#00474f" />
      </svg>
    )
  },
  {
    id: 'staff_employees',
    title: 'Data Karyawan',
    subtitle: 'Mas Heri, Supir Gudang & Staf',
    targetModuleId: 'masterdata',
    initialTab: 'customers',
    icon: (
      // 3 team avatars in purple, gold, teal (Iconic Employees)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="14" r="4" fill="#faad14" />
        <path d="M12 27c0-4 4-6 8-6s8 2 8 6" fill="#722ed1" />
        <circle cx="11" cy="17" r="3" fill="#13c2c2" />
        <circle cx="29" cy="17" r="3" fill="#13c2c2" />
      </svg>
    )
  },
  {
    id: 'sop_knowledge',
    title: 'SOP & Bantuan',
    subtitle: 'Aturan DP Minimal 25% & Syarat DO',
    targetModuleId: 'documents',
    initialFilter: '',
    icon: (
      // Dual overlapping bookmarks in teal & purple (Iconic Knowledge)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <path d="M12 7h10a2 2 0 012 2v23l-7-4-7 4V9a2 2 0 012-2z" fill="#13c2c2" opacity="0.85" />
        <path d="M18 11h10a2 2 0 012 2v21l-7-4-7 4V13a2 2 0 012-2z" fill="#722ed1" />
      </svg>
    )
  },

  // ROW 4: KATEGORI PRODUK & OPERASIONAL KHUSUS PALETINDO
  {
    id: 'part_case_futari',
    title: 'Part Case 945',
    subtitle: 'Katalog Futari Small / Rak 01',
    targetModuleId: 'inventory',
    initialTab: 'inventory',
    initialFilter: 'Part Case',
    icon: (
      // Dual sliders / container parts in orange & teal (Iconic Planning/Containers)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="7" y="10" width="11" height="20" rx="3" fill="#fa8c16" />
        <rect x="22" y="10" width="11" height="20" rx="3" fill="#13c2c2" />
        <circle cx="12.5" cy="16" r="2.5" fill="#fff" />
        <circle cx="27.5" cy="24" r="2.5" fill="#fff" />
      </svg>
    )
  },
  {
    id: 'palet_plastik',
    title: 'Palet Plastik',
    subtitle: 'Palet Futari FP 0303 Hijau/Kuning',
    targetModuleId: 'inventory',
    initialTab: 'inventory',
    initialFilter: 'Palet Plastik',
    icon: (
      // Plastic pallet / flat rack in emerald & teal
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="14" width="28" height="6" rx="2" fill="#059669" />
        <rect x="9" y="20" width="4" height="7" rx="1" fill="#10b981" />
        <rect x="18" y="20" width="4" height="7" rx="1" fill="#10b981" />
        <rect x="27" y="20" width="4" height="7" rx="1" fill="#10b981" />
        <rect x="6" y="27" width="28" height="3" rx="1.5" fill="#047857" />
      </svg>
    )
  },
  {
    id: 'krat_industri',
    title: 'Krat & Box',
    subtitle: 'Krat Gelas 7001/7202 & Krat Telur',
    targetModuleId: 'inventory',
    initialTab: 'inventory',
    initialFilter: 'Krat',
    icon: (
      // Industrial crate box in orange & beige
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="7" y="10" width="26" height="20" rx="4" fill="#ea580c" />
        <rect x="11" y="14" width="5" height="5" rx="1" fill="#fed7aa" />
        <rect x="18" y="14" width="5" height="5" rx="1" fill="#fed7aa" />
        <rect x="25" y="14" width="5" height="5" rx="1" fill="#fed7aa" />
        <rect x="11" y="21" width="5" height="5" rx="1" fill="#fed7aa" />
        <rect x="18" y="21" width="5" height="5" rx="1" fill="#fed7aa" />
        <rect x="25" y="21" width="5" height="5" rx="1" fill="#fed7aa" />
      </svg>
    )
  },
  {
    id: 'min_stock_alert',
    title: 'Batas Kritis',
    subtitle: 'Peringatan Stok Kurang Dari Minimum',
    targetModuleId: 'inventory',
    initialTab: 'inventory',
    initialFilter: 'all',
    icon: (
      // Slanted modern check in teal (Iconic To-do)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <path d="M8 28l18-18 6 6-18 18H8v-6z" fill="#08979c" />
        <path d="M26 10l3-3 6 6-3 3-6-6z" fill="#13c2c2" />
        <circle cx="11" cy="30" r="2" fill="#00474f" />
      </svg>
    )
  },
  {
    id: 'crm_partners',
    title: 'Hubungan Mitra',
    subtitle: 'Kerjasama Korporat B2B & PO',
    targetModuleId: 'masterdata',
    initialTab: 'customers',
    icon: (
      // Interlocking handshake / links in teal & magenta (Iconic CRM)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <path d="M9 16l8-8 5 5-5 5H9v-2z" fill="#13c2c2" />
        <path d="M31 24l-8 8-5-5 5-5h8v2z" fill="#eb2f96" />
        <path d="M17 18l6-6 4 4-6 6h-4z" fill="#722ed1" />
      </svg>
    )
  },
  {
    id: 'armada_logistik',
    title: 'Sewa Armada',
    subtitle: 'Truk Engkel & Fuso Kirim',
    targetModuleId: 'deliveries',
    initialTab: 'all',
    icon: (
      // Key & lock graphic in purple & cyan (Iconic Rental)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <circle cx="27" cy="13" r="6" fill="#722ed1" />
        <circle cx="27" cy="13" r="2.5" fill="#fff" />
        <path d="M22 17l-12 12v4h4v-2h2v-2h2l4-4" stroke="#13c2c2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'system_logs',
    title: 'Aktivitas Sistem',
    subtitle: 'Audit Trail & Log',
    targetModuleId: 'systemlogs',
    icon: (
      // Pulse line in violet over card (Audit trail)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <rect x="7" y="9" width="26" height="22" rx="5" fill="#722ed1" />
        <path d="M11 21h5l3-6 4 11 3-5h4" stroke="#ffd666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'user_access',
    title: 'Pengguna',
    subtitle: 'Akun Login & Role',
    targetModuleId: 'users',
    icon: (
      // Two people in orange & purple (User management)
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
        <circle cx="16" cy="14" r="5" fill="#fa8c16" />
        <path d="M7 31c0-5 4-9 9-9s9 4 9 9H7z" fill="#fa8c16" />
        <circle cx="27" cy="16" r="4" fill="#722ed1" />
        <path d="M22 31c0-4 2.5-7.5 6-7.5s6 3.5 6 7.5H22z" fill="#722ed1" />
      </svg>
    )
  }
];

export default function AppLauncher({ 
  onSelectModule, 
  orders = [], 
  products = [], 
  purchaseOrders = [], 
  deliveries = [], 
  customers = [], 
  suppliers = [], 
  documents = [],
  searchQuery = '',
  setSearchQuery,
  currentUser = '',
  allowedModuleIds = null
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const query = searchQuery !== undefined ? searchQuery : internalSearch;
  const setQuery = setSearchQuery || setInternalSearch;

  // Filter apps based on search
  const filteredApps = PALORA_APPS.filter(app => {
    if (allowedModuleIds && !allowedModuleIds.includes(app.targetModuleId)) return false;
    if (!query || query.trim() === '') return true;
    const q = query.toLowerCase().trim();
    return app.title.toLowerCase().includes(q) || 
           app.subtitle.toLowerCase().includes(q) ||
           app.targetModuleId.toLowerCase().includes(q);
  });

  const handleLaunchApp = (app) => {
    const baseModule = APP_MODULES.find(m => m.id === app.targetModuleId) || APP_MODULES[0];
    onSelectModule({
      ...baseModule,
      title: baseModule.title,
      initialTab: app.initialTab,
      initialFilter: app.initialFilter
    });
  };

  // Receivable Alerts for Bude (Keuangan) & Pak Yanto (Owner)
  const isManagement = currentUser.includes('Keuangan') || currentUser.includes('Owner');
  let overdueCount = 0;
  let dueThisWeekCount = 0;

  if (isManagement) {
    const today = new Date();
    today.setHours(0,0,0,0);
    orders.forEach(o => {
      if (o.remainingAmount > 0 && o.dueDate) {
        const due = new Date(o.dueDate);
        due.setHours(0,0,0,0);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays < 0) overdueCount++;
        else if (diffDays <= 7) dueThisWeekCount++;
      }
    });
  }

  return (
    <div className="odoo-launcher-container">
      {isManagement && (overdueCount > 0 || dueThisWeekCount > 0) && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 20px', padding: '16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#f59e0b', color: 'white', padding: '8px', borderRadius: '50%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', color: '#92400e', fontSize: '1rem', fontWeight: 'bold' }}>Perhatian: Piutang Penjualan Tempo</h4>
              <p style={{ margin: 0, color: '#b45309', fontSize: '0.85rem' }}>
                Terdapat <strong>{overdueCount} tagihan terlambat</strong> dan <strong>{dueThisWeekCount} tagihan jatuh tempo minggu ini</strong>. Segera cek menu Daftar Piutang untuk melakukan penagihan WA.
              </p>
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ background: '#d97706', borderColor: '#d97706' }}
            onClick={() => handleLaunchApp(PALORA_APPS.find(a => a.id === 'receivables_monitor'))}
          >
            Lihat Daftar Piutang
          </button>
        </div>
      )}

      {/* Pristine 6-Column Grid of 24 Authentic Palora ERP Apps */}
      <div className="odoo-grid">
        {filteredApps.map((app) => (
          <div 
            key={app.id} 
            className="odoo-app-item"
            onClick={() => handleLaunchApp(app)}
            title={`${app.title} • ${app.subtitle}`}
          >
            <div className="odoo-app-tile">
              {app.icon}
              {app.badge && (
                <span 
                  className="odoo-app-badge"
                  style={{ background: app.badgeColor || '#ef4444' }}
                >
                  {app.badge}
                </span>
              )}
            </div>
            <span className="odoo-app-label">{app.title}</span>
          </div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="odoo-empty-search">
          <p>Tidak ada aplikasi yang cocok dengan "<strong>{query}</strong>"</p>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setQuery('')}
            style={{ marginTop: '12px' }}
          >
            Reset Pencarian
          </button>
        </div>
      )}
    </div>
  );
}
