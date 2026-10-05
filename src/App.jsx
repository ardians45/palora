// PALORA v2: routing halaman + cek hak akses per role.
import React from 'react';
import { useAuth } from './lib/useAuth';
import { useRoute } from './lib/router';
import { SessionProvider, useSession } from './lib/session';
import { FeedbackProvider } from './ui/feedback';
import { Empty, LinkButton, Loading } from './ui/core';
import Login from './layout/Login';
import Launcher from './layout/Launcher';
import Shell from './layout/Shell';
import { canOpen, moduleById } from './modules/registry';

import PesananList from './modules/penjualan/PesananList';
import PesananForm from './modules/penjualan/PesananForm';
import PesananDoc from './modules/penjualan/PesananDoc';
import Kasir from './modules/penjualan/Kasir';
import { SuratJalanList, SuratJalanDoc } from './modules/penjualan/SuratJalan';
import StokList from './modules/stok/StokList';
import StokCard, { HargaModal, MutasiList } from './modules/stok/StokCard';
import { OpnameDoc, OpnameList, OpnameNew } from './modules/stok/Opname';
import { PODoc, POForm, POList } from './modules/pembelian/PO';
import { PiutangCustomer, PiutangList } from './modules/keuangan/Piutang';
import { HutangDoc, HutangList } from './modules/keuangan/Hutang';
import Arsip from './modules/arsip/Arsip';
import Marketplace from './modules/marketplace/Marketplace';
import Laporan from './modules/laporan/Laporan';
import Master from './modules/master/Master';
import { Aktivitas, Pengaturan, Pengguna } from './modules/admin/Admin';
import { MapPOPrint, NotaPrint, OpnamePrint, POPrint, SuratJalanPrint } from './print/Print';

export default function App() {
  const { user, login, logout, expired } = useAuth();
  if (!user) {
    return (
      <FeedbackProvider>
        {expired && <div className="alert warn">Sesi login sudah habis. Silakan masuk lagi.</div>}
        <Login onLogin={login} />
      </FeedbackProvider>
    );
  }
  return (
    <FeedbackProvider>
      {/* key = id user: semua state bersih saat ganti akun */}
      <SessionProvider key={user.id} user={user} onLogout={logout}>
        <Router />
      </SessionProvider>
    </FeedbackProvider>
  );
}

function NoAccess() {
  return (
    <Empty title="Akun Anda tidak punya akses ke halaman ini" action={<LinkButton to={[]}>Kembali ke menu utama</LinkButton>}>
      Hubungi Owner bila perlu akses.
    </Empty>
  );
}

function NotFound() {
  return <Empty title="Halaman tidak ditemukan" action={<LinkButton to={[]}>Kembali ke menu utama</LinkButton>} />;
}

function page(parts, query, role) {
  const [mod, a, b] = parts;
  switch (mod) {
    case 'penjualan':
      if (!a) return <PesananList />;
      if (a === 'baru') return role === 'finance' ? <NoAccess /> : <PesananForm />;
      if (b === 'ubah') return role === 'finance' ? <NoAccess /> : <PesananForm id={a} />;
      return <PesananDoc id={a} />;
    case 'kasir':
      return <Kasir />;
    case 'surat-jalan':
      return a ? <SuratJalanDoc id={a} /> : <SuratJalanList />;
    case 'stok':
      if (!a) return <StokList />;
      if (a === 'mutasi') return <MutasiList />;
      if (a === 'harga') return role === 'owner' ? <HargaModal /> : <NoAccess />;
      return <StokCard id={a} />;
    case 'opname':
      if (!a) return <OpnameList />;
      if (a === 'baru') return <OpnameNew />;
      return <OpnameDoc id={a} />;
    case 'pembelian':
      if (!a) return <POList />;
      if (a === 'baru') return role === 'finance' ? <NoAccess /> : <POForm />;
      if (b === 'ubah') return role === 'finance' ? <NoAccess /> : <POForm id={a} />;
      return <PODoc id={a} />;
    case 'piutang':
      return a ? <PiutangCustomer name={a} /> : <PiutangList />;
    case 'hutang':
      return a ? <HutangDoc id={a} /> : <HutangList />;
    case 'arsip':
      return <Arsip />;
    case 'marketplace':
      return <Marketplace />;
    case 'laporan':
      return <Laporan />;
    case 'pelanggan':
      return <Master collection="customers" />;
    case 'supplier':
      return <Master collection="suppliers" />;
    case 'aktivitas':
      return <Aktivitas />;
    case 'pengguna':
      return <Pengguna />;
    case 'pengaturan':
      return <Pengaturan />;
    default:
      return <NotFound />;
  }
}

function Router() {
  const { parts, query } = useRoute();
  const { role, productsLoading, products } = useSession();
  const mod = parts[0];

  if (productsLoading && products.length === 0) return <div className="loading-screen"><Loading text="Memuat data PALORA..." /></div>;

  if (mod === 'cetak') {
    const [, type, id] = parts;
    if (type === 'sj') return <SuratJalanPrint id={id} />;
    if (type === 'nota' || type === 'invoice') return <NotaPrint id={id} kind={type} />;
    if (type === 'po') return <POPrint id={id} />;
    if (type === 'map-po') return <MapPOPrint id={id} />;
    if (type === 'opname') return <OpnamePrint group={query.g || ''} />;
    return <NotFound />;
  }

  if (!mod) return <Launcher />;
  if (!moduleById(mod)) {
    return (
      <Shell moduleId={null} path={parts}>
        <NotFound />
      </Shell>
    );
  }

  return (
    <Shell moduleId={mod} path={parts}>
      {canOpen(mod, role) ? page(parts, query, role) : <NoAccess />}
    </Shell>
  );
}
