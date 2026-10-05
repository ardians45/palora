// Daftar modul: ikon di launcher, hak akses per role, dan sub-menu di topbar.
// Hak akses mengikuti PRD 6.7. Server tetap memeriksa ulang setiap aksi.
import * as icons from '../ui/appIcons';

const ALL = ['owner', 'gudang', 'finance'];

export const MODULES = [
  {
    id: 'penjualan',
    title: 'Penjualan',
    icon: icons.penjualan,
    roles: ALL,
    nav: [
      { label: 'Pesanan', to: ['penjualan'] },
      { label: 'Pesanan Baru', to: ['penjualan', 'baru'], roles: ['owner', 'gudang'] },
      { label: 'Kasir', to: ['kasir'], roles: ['owner', 'gudang'] },
      { label: 'Surat Jalan', to: ['surat-jalan'] },
    ],
  },
  { id: 'kasir', title: 'Kasir', icon: icons.kasir, roles: ['owner', 'gudang'], navOf: 'penjualan' },
  {
    id: 'stok',
    title: 'Stok Gudang',
    icon: icons.stok,
    roles: ALL,
    nav: [
      { label: 'Stok Barang', to: ['stok'] },
      { label: 'Mutasi Stok', to: ['stok', 'mutasi'] },
      { label: 'Stok Opname', to: ['opname'], roles: ['owner', 'gudang'] },
      { label: 'Harga Modal', to: ['stok', 'harga'], roles: ['owner'] },
    ],
  },
  { id: 'opname', title: 'Stok Opname', icon: icons.opname, roles: ['owner', 'gudang'], navOf: 'stok' },
  {
    id: 'pembelian',
    title: 'Pembelian (PO)',
    icon: icons.pembelian,
    roles: ALL,
    nav: [
      { label: 'Daftar PO', to: ['pembelian'] },
      { label: 'PO Baru', to: ['pembelian', 'baru'], roles: ['owner', 'gudang'] },
      { label: 'Hutang Supplier', to: ['hutang'], roles: ['owner', 'finance'] },
    ],
  },
  { id: 'surat-jalan', title: 'Surat Jalan', icon: icons.suratJalan, roles: ALL, navOf: 'penjualan' },
  {
    id: 'piutang',
    title: 'Piutang',
    icon: icons.piutang,
    roles: ['owner', 'finance'],
    nav: [
      { label: 'Piutang Customer', to: ['piutang'] },
      { label: 'Hutang Supplier', to: ['hutang'] },
      { label: 'Laporan', to: ['laporan'] },
    ],
  },
  { id: 'hutang', title: 'Hutang Supplier', icon: icons.hutang, roles: ['owner', 'finance'], navOf: 'piutang' },
  { id: 'arsip', title: 'Arsip Dokumen', icon: icons.arsip, roles: ALL },
  { id: 'marketplace', title: 'Marketplace', icon: icons.marketplace, roles: ['owner', 'gudang'] },
  { id: 'laporan', title: 'Laporan', icon: icons.laporan, roles: ['owner', 'finance'], navOf: 'piutang' },
  {
    id: 'pelanggan',
    title: 'Pelanggan',
    icon: icons.pelanggan,
    roles: ALL,
    nav: [
      { label: 'Pelanggan', to: ['pelanggan'] },
      { label: 'Supplier', to: ['supplier'] },
    ],
  },
  { id: 'supplier', title: 'Supplier', icon: icons.supplier, roles: ALL, navOf: 'pelanggan' },
  { id: 'aktivitas', title: 'Aktivitas', icon: icons.aktivitas, roles: ['owner'] },
  {
    id: 'pengguna',
    title: 'Pengguna',
    icon: icons.pengguna,
    roles: ['owner'],
    nav: [
      { label: 'Pengguna', to: ['pengguna'] },
      { label: 'Pengaturan Perusahaan', to: ['pengaturan'] },
      { label: 'Aktivitas', to: ['aktivitas'] },
    ],
  },
  { id: 'pengaturan', title: 'Pengaturan', icon: icons.pengaturan, roles: ['owner'], navOf: 'pengguna' },
];

export const moduleById = (id) => MODULES.find((m) => m.id === id);

export function navFor(id, role) {
  const m = moduleById(id);
  if (!m) return { title: '', nav: [] };
  const owner = m.navOf ? moduleById(m.navOf) : m;
  return {
    title: m.title,
    nav: (owner.nav || []).filter((n) => !n.roles || n.roles.includes(role)),
  };
}

export const canOpen = (id, role) => {
  const m = moduleById(id);
  return !!m && m.roles.includes(role);
};
