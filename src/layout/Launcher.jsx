// Menu utama: ikon aplikasi per modul (sesuai role) + daftar "perlu dikerjakan" berisi angka asli.
import React, { useEffect, useMemo, useState } from 'react';
import { pb } from '../lib/pb';
import { href } from '../lib/router';
import { useSession } from '../lib/session';
import { today } from '../lib/format';
import { MODULES } from '../modules/registry';
import { RECEIVABLE_FILTER } from '../lib/status';
import { Input } from '../ui/core';
import { Topbar } from './Shell';

function useCounts(role) {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    let alive = true;
    const t = today();
    const queries = {
      pesananDp: ['sales_orders', 'status = "baru" && channel = "pesanan"'],
      siapKeluar: ['sales_orders', '(status = "lunas" || (release_approved = true && (status = "baru" || status = "dp")))'],
      poBelum: ['purchase_orders', '(state = "dikirim" || state = "sebagian")'],
      sjJalan: ['deliveries', 'status = "dikirim"'],
    };
    if (role === 'owner' || role === 'finance') {
      queries.piutangLewat = ['sales_orders', `${RECEIVABLE_FILTER} && due_date != "" && due_date < "${t}"`];
      queries.hutangLewat = ['supplier_invoices', `deleted = false && paid_amount < total_amount && due_date != "" && due_date < "${t}"`];
    }
    const run = () =>
      Promise.all(
        Object.entries(queries).map(async ([k, [c, f]]) => {
          try {
            return [k, (await pb.collection(c).getList(1, 1, { filter: f, skipTotal: false })).totalItems];
          } catch {
            return [k, 0];
          }
        })
      ).then((pairs) => alive && setCounts(Object.fromEntries(pairs)));
    run();
    const timer = setInterval(run, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [role]);
  return counts;
}

export default function Launcher() {
  const { role, user, products } = useSession();
  const [query, setQuery] = useState('');
  const counts = useCounts(role);
  const lowStock = useMemo(() => products.filter((p) => p.min_stock > 0 && p.stock <= p.min_stock).length, [products]);

  const badge = {
    penjualan: (counts.siapKeluar || 0) + (counts.pesananDp || 0),
    pembelian: counts.poBelum,
    stok: lowStock,
    'surat-jalan': counts.sjJalan,
    piutang: counts.piutangLewat,
    hutang: counts.hutangLewat,
  };

  const apps = MODULES.filter((m) => m.roles.includes(role)).filter((m) => !query || m.title.toLowerCase().includes(query.toLowerCase()));

  const todos = [
    counts.siapKeluar > 0 && { to: ['penjualan'], query: { tab: 'siap' }, label: 'Pesanan lunas / diizinkan, siap dikirim atau diambil', n: counts.siapKeluar, roles: ['owner', 'gudang'] },
    counts.pesananDp > 0 && { to: ['penjualan'], query: { tab: 'baru' }, label: 'Pesanan masuk menunggu DP', n: counts.pesananDp },
    counts.poBelum > 0 && { to: ['pembelian'], query: { tab: 'proses' }, label: 'PO belum diterima lengkap', n: counts.poBelum },
    counts.sjJalan > 0 && { to: ['surat-jalan'], query: { tab: 'dikirim' }, label: 'Surat jalan belum dikonfirmasi diterima', n: counts.sjJalan, roles: ['owner', 'gudang'] },
    lowStock > 0 && { to: ['stok'], query: { f: 'menipis' }, label: 'Barang di bawah stok minimum', n: lowStock },
    counts.piutangLewat > 0 && { to: ['piutang'], query: { f: 'lewat' }, label: 'Piutang lewat jatuh tempo', n: counts.piutangLewat },
    counts.hutangLewat > 0 && { to: ['hutang'], query: { f: 'lewat' }, label: 'Hutang supplier lewat jatuh tempo', n: counts.hutangLewat },
  ].filter((t) => t && (!t.roles || t.roles.includes(role)));

  return (
    <>
      <Topbar moduleId={null} path={[]} />
      <main className="launcher">
        <div className="launcher-head">
          <h1>Halo, {user.name || user.email}</h1>
          <Input className="launcher-search" placeholder="Cari menu..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari menu" />
        </div>
        <div className="launcher-grid">
          {apps.map((m) => (
            <a key={m.id} className="app-tile" href={href([m.id])}>
              <span className="icon">{m.icon}</span>
              <span className="label">{m.title}</span>
              {badge[m.id] > 0 && <span className="badge-count" aria-label={`${badge[m.id]} perlu ditindaklanjuti`}>{badge[m.id]}</span>}
            </a>
          ))}
        </div>

        {todos.length > 0 && (
          <section className="launcher-section">
            <h2>Perlu dikerjakan</h2>
            <div className="todo-list">
              {todos.map((t) => (
                <a key={t.label} href={href(t.to, t.query)}>
                  <span>{t.label}</span>
                  <b className="num">{t.n}</b>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
