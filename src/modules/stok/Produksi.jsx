// Produksi sendiri: barang jadi masuk stok per batch lengkap dengan HPP-nya.
// Bukan pembelian: tidak membuat PO, invoice, atau hutang supplier. HPP tiap batch boleh berbeda.
import React, { useMemo, useState } from 'react';
import { Ban, Plus, Save } from 'lucide-react';
import { action, q, useRecord, useRecords } from '../../lib/data';
import { href, navigate, replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, num, rp, today } from '../../lib/format';
import { Badge, Button, DescList, Empty, ErrorBox, Field, Input, LinkButton, Loading, MoneyInput, PageHeader, Panel, Textarea } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import DateRange from '../../ui/DateRange';
import { ProductCombo } from '../../ui/LineItems';
import Activity from '../../ui/Activity';
import { ReasonDialog } from '../../ui/PaymentDialog';
import { useToast } from '../../ui/feedback';

/** Margin terhadap harga jual: { rp, pct } atau null bila harga jual kosong. */
const margin = (sell, cost) => (sell > 0 ? { rp: sell - cost, pct: Math.round(((sell - cost) / sell) * 100) } : null);
const MarginText = ({ sell, cost }) => {
  const m = margin(sell, cost);
  if (!m) return <span className="muted">-</span>;
  return <span className={m.rp < 0 ? 'text-bad strong' : 'text-ok'}>{m.pct}%</span>;
};

export function ProduksiList() {
  const { query } = useRoute();
  const { can } = useSession();
  const search = query.q || '';
  const from = query.from || '';
  const to = query.to || '';
  const { items, loading, error, reload } = useRecords('productions', { sort: '-date,-created' });
  const rows = items.filter((b) => (!from || b.date >= from) && (!to || b.date <= to) && matchText(b, search, ['batch_no', 'product_code', 'product_name', 'source', 'notes']));
  const canAdd = can('owner', 'gudang');
  const add = canAdd && (
    <LinkButton to={['produksi', 'baru']} variant="primary" icon={Plus}>
      Catat Produksi
    </LinkButton>
  );
  // batch batal tidak ikut dijumlah
  const live = (f) => (b) => (b.status === 'batal' ? 0 : f(b));

  return (
    <>
      <PageHeader crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: 'Produksi' }]} title="Produksi Sendiri" sub="Barang jadi dari produksi sendiri, per batch dengan HPP-nya" actions={add} />
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari no. batch, barang, asal produksi..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari batch produksi" />
        <DateRange query={query} />
      </div>
      <DataTable
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(b) => navigate(['produksi', b.id])}
        empty={
          <Empty title={search || from || to ? 'Tidak ada batch yang cocok' : 'Belum ada catatan produksi'} action={!search && add}>
            Catat setiap kali barang jadi selesai diproduksi: stok bertambah dan HPP per unit dihitung otomatis.
          </Empty>
        }
        columns={[
          { key: 'batch_no', label: 'No. Batch', render: (b) => <span className="mono">{b.batch_no}</span> },
          { key: 'date', label: 'Tanggal', render: (b) => <span className="nowrap">{date(b.date)}</span> },
          {
            key: 'product_name',
            label: 'Barang',
            render: (b) => (
              <>
                <span className="mono muted">{b.product_code}</span> {b.product_name}
              </>
            ),
          },
          { key: 'qty', label: 'Qty Jadi', align: 'right', value: live((b) => b.qty), render: (b) => num(b.qty), total: true },
          { key: 'total_cost', label: 'Biaya Batch', align: 'right', value: live((b) => b.total_cost), render: (b) => num(b.total_cost), total: true },
          { key: 'unit_cost', label: 'HPP / unit', align: 'right', render: (b) => <b>{num(b.unit_cost)}</b> },
          { key: 'sell_price', label: 'Harga Jual', align: 'right', render: (b) => (b.sell_price ? num(b.sell_price) : '-') },
          { key: 'margin', label: 'Margin', align: 'right', value: (b) => margin(b.sell_price, b.unit_cost)?.pct ?? -999, render: (b) => <MarginText sell={b.sell_price} cost={b.unit_cost} /> },
          { key: 'status', label: 'Status', render: (b) => (b.status === 'batal' ? <Badge tone="bad">Dibatalkan</Badge> : <Badge tone="ok">Masuk stok</Badge>) },
        ]}
      />
    </>
  );
}

export function ProduksiNew() {
  const { products } = useSession();
  const { query } = useRoute();
  const toast = useToast();
  const [f, setF] = useState({ product_id: query.p || '', date: today(), qty: '', material_cost: '', service_cost: '', other_cost: '', source: '', notes: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  // barang yang sudah ditandai produksi sendiri tampil duluan di pencarian
  const sorted = useMemo(() => [...products].sort((a, b) => Number(!!b.produced) - Number(!!a.produced)), [products]);
  const p = products.find((x) => x.id === f.product_id);
  const prev = useRecords('productions', { filter: p ? `product_id = ${q(p.id)} && status = "selesai"` : '', sort: '-date,-created', limit: 5, enabled: !!p });
  const sources = useRecords('productions', { sort: '-created', limit: 50 });
  const sourceList = [...new Set(sources.items.map((b) => b.source).filter(Boolean))];

  const qty = Number(f.qty) || 0;
  const total = (Number(f.material_cost) || 0) + (Number(f.service_cost) || 0) + (Number(f.other_cost) || 0);
  const hpp = qty > 0 ? Math.round(total / qty) : 0;
  const last = prev.items[0];
  const newCost = p && qty > 0 ? Math.round((p.stock * (p.buy_price || 0) + total) / (p.stock + qty)) : 0;
  const m = p ? margin(p.sell_price, hpp) : null;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!p) return setErr('Pilih barang hasil produksi dulu.');
    if (!(qty > 0) || !Number.isInteger(qty)) return setErr('Isi qty barang jadi (bilangan bulat lebih dari 0).');
    if (!(total > 0)) return setErr('Isi biaya material atau jasa supaya HPP bisa dihitung.');
    setBusy(true);
    try {
      const rec = await action('production', { ...f, qty, material_cost: Number(f.material_cost) || 0, service_cost: Number(f.service_cost) || 0, other_cost: Number(f.other_cost) || 0 });
      toast.ok(`${rec.batch_no} tersimpan: stok ${p.name} +${num(qty)}, HPP ${rp(rec.unit_cost)}/unit`);
      navigate(['produksi', rec.id]);
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <PageHeader
        crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: 'Produksi', to: ['produksi'] }, { label: 'Catat Produksi' }]}
        title="Catat Hasil Produksi"
        actions={
          <>
            <Button onClick={() => window.history.back()}>Batal</Button>
            <Button type="submit" variant="primary" icon={Save} busy={busy}>
              Simpan &amp; Masukkan ke Stok
            </Button>
          </>
        }
      />
      {err && <div className="alert error" role="alert">{err}</div>}
      <div className="alert info">Barang masuk stok sebagai hasil produksi sendiri, senilai HPP-nya. Tidak membuat PO, invoice, atau hutang supplier.</div>
      <div className="doc-layout">
        <div className="stack">
          <Panel title="Barang jadi">
            <div className="form-grid cols-3">
              <Field label="Barang hasil produksi" required className="span-2" hint="Ketik kode / nama. Barang produksi sendiri tampil duluan.">
                <ProductCombo products={sorted} value={p ? `${p.code} · ${p.name}` : ''} onPick={(x) => set({ product_id: x.id })} placeholder="Ketik kode / nama barang" autoFocus={!p} />
              </Field>
              <Field label="Tanggal selesai produksi">
                <Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
              </Field>
              <Field label={`Qty barang jadi${p ? ` (${p.unit || 'pcs'})` : ''}`} required hint="Yang layak jual saja">
                <MoneyInput value={f.qty} onChange={(v) => set({ qty: v })} />
              </Field>
              <Field label="Diproduksi oleh" className="span-2" hint="Opsional. Entitas / tempat produksi, mis. nama PT">
                <Input list="prd-source" value={f.source} onChange={(e) => set({ source: e.target.value })} />
              </Field>
              <datalist id="prd-source">
                {sourceList.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </Panel>
          <Panel title="Biaya produksi batch ini">
            <div className="form-grid cols-3">
              <Field label="Biaya material / bahan" hint="Total untuk batch ini">
                <MoneyInput value={f.material_cost} onChange={(v) => set({ material_cost: v })} />
              </Field>
              <Field label="Biaya jasa / upah">
                <MoneyInput value={f.service_cost} onChange={(v) => set({ service_cost: v })} />
              </Field>
              <Field label="Biaya lain" hint="mis. listrik, angkut, kemasan">
                <MoneyInput value={f.other_cost} onChange={(v) => set({ other_cost: v })} />
              </Field>
              <Field label="Catatan" className="span-all">
                <Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="mis. bahan dari batch biji plastik November" />
              </Field>
            </div>
          </Panel>
        </div>
        <Panel title="Hasil hitung">
          {!p ? (
            <p className="muted small">Pilih barang dan isi biaya: HPP per unit, margin, dan harga modal baru langsung terlihat di sini.</p>
          ) : (
            <>
              <div className="hpp-box">
                <div className="label">HPP per unit batch ini</div>
                <div className="value">{hpp ? rp(hpp) : '-'}</div>
                <div className="small muted">{total ? `${rp(total)} / ${num(qty) || '?'} ${p.unit || 'pcs'}` : 'isi qty dan biaya'}</div>
              </div>
              <DescList
                items={[
                  ['Harga jual', p.sell_price ? rp(p.sell_price) : 'belum diisi'],
                  ['Margin / unit', hpp && m ? <span key="m" className={m.rp < 0 ? 'text-bad strong' : 'text-ok strong'}>{rp(m.rp)} ({m.pct}%)</span> : '-'],
                  ['HPP batch lalu', last ? `${rp(last.unit_cost)} · ${date(last.date)}` : 'belum pernah produksi'],
                  ['Stok', `${num(p.stock)} → ${num(p.stock + qty)}`],
                  ['Harga modal', hpp ? `${rp(p.buy_price || 0)} → ${rp(newCost)}` : rp(p.buy_price || 0)],
                ]}
              />
              {hpp > 0 && m && m.rp < 0 && <div className="alert warn mt-3">HPP batch ini lebih tinggi dari harga jual. Cek lagi biayanya atau naikkan harga jual.</div>}
              {hpp > 0 && p.stock > 0 && <p className="small muted mt-3">Stok lama masih {num(p.stock)}, jadi harga modal memakai rata-rata stok lama dan batch ini.</p>}
            </>
          )}
        </Panel>
      </div>
    </form>
  );
}

export function ProduksiDoc({ id }) {
  const { item: b, loading, error, reload } = useRecord('productions', id);
  const { can } = useSession();
  const toast = useToast();
  const [cancel, setCancel] = useState(false);
  if (loading && !b) return <Loading />;
  if (error || !b) return <ErrorBox error={error} onRetry={reload} />;
  const batal = b.status === 'batal';
  const m = margin(b.sell_price, b.unit_cost);
  return (
    <>
      <PageHeader crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: 'Produksi', to: ['produksi'] }, { label: b.batch_no }]} title={b.batch_no} sub={`${b.product_code} · ${b.product_name}`} />
      <div className="doc-bar">
        <div className="actions">
          <LinkButton to={['stok', b.product_id]}>Lihat kartu stok barang</LinkButton>
          {can('owner', 'gudang') && !batal && (
            <>
              <LinkButton to={['produksi', 'baru']} query={{ p: b.product_id }} icon={Plus}>
                Batch baru barang ini
              </LinkButton>
              <Button variant="danger" icon={Ban} onClick={() => setCancel(true)}>
                Batalkan Batch
              </Button>
            </>
          )}
        </div>
        {batal ? <Badge tone="bad">Dibatalkan</Badge> : <Badge tone="ok">Masuk stok</Badge>}
      </div>
      {batal && <div className="alert error mb-3">Batch dibatalkan: {b.cancel_reason}. Stok sudah ditarik kembali.</div>}
      <div className="doc-layout">
        <div className="sheet stack">
          <div className="doc-no">{b.batch_no}</div>
          <div className="two-col">
            <DescList
              items={[
                ['Barang', <a key="p" href={href(['stok', b.product_id])}><b>{b.product_name}</b></a>],
                ['Kode', b.product_code],
                ['Qty barang jadi', `${num(b.qty)} ${b.unit || 'pcs'}`],
                ['Diproduksi oleh', b.source],
                ['Catatan', b.notes],
              ]}
            />
            <DescList items={[['Tanggal', date(b.date)], ['Dicatat oleh', b.created_by], ['Jenis transaksi', 'Hasil produksi sendiri (bukan pembelian)']]} />
          </div>
          <table className="dt">
            <tbody>
              <tr>
                <td>Biaya material / bahan</td>
                <td className="right">{num(b.material_cost)}</td>
              </tr>
              <tr>
                <td>Biaya jasa / upah</td>
                <td className="right">{num(b.service_cost)}</td>
              </tr>
              <tr>
                <td>Biaya lain</td>
                <td className="right">{num(b.other_cost)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Total biaya batch</td>
                <td className="right">{num(b.total_cost)}</td>
              </tr>
              <tr>
                <td>HPP per unit</td>
                <td className="right">{num(b.unit_cost)}</td>
              </tr>
            </tfoot>
          </table>
          <DescList
            items={[
              ['Harga jual saat itu', b.sell_price ? rp(b.sell_price) : 'belum diisi'],
              ['Margin / unit', m ? <span key="m" className={m.rp < 0 ? 'text-bad strong' : 'text-ok strong'}>{rp(m.rp)} ({m.pct}%)</span> : null],
              ['Harga modal barang', `${rp(b.cost_before)} → ${rp(b.cost_after)}`],
            ]}
          />
        </div>
        <Panel title="Riwayat" bodyClass="">
          <Activity recordIds={b.id} />
        </Panel>
      </div>
      {cancel && (
        <ReasonDialog
          title={`Batalkan ${b.batch_no}?`}
          label={`Alasan (stok ${b.product_name} dikurangi ${num(b.qty)} lagi)`}
          confirmLabel="Batalkan Batch"
          danger
          onClose={() => setCancel(false)}
          onSubmit={async (reason) => {
            await action('production/cancel', { id: b.id, reason });
            toast.ok(`${b.batch_no} dibatalkan, stok ditarik kembali`);
          }}
        />
      )}
    </>
  );
}
