// Kartu stok: data barang + riwayat masuk/keluar per tanggal dengan no. dokumen.
import React, { useState } from 'react';
import { Archive, Pencil, SlidersHorizontal } from 'lucide-react';
import { pb } from '../../lib/pb';
import { useRecord, useRecords, q } from '../../lib/data';
import { navigate, replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, dateTime, num, numOrDash } from '../../lib/format';
import { MOVEMENT_TYPE } from '../../lib/status';
import { Badge, Button, DescList, Empty, ErrorBox, Input, Loading, PageHeader, Panel, Select, StatusBadge } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import Activity from '../../ui/Activity';
import { useConfirm, useToast } from '../../ui/feedback';
import ProductDialog, { AdjustDialog } from './ProductDialog';
import ProductPhoto from '../../ui/ProductPhoto';
import { FilePick } from '../../ui/core';

const movementColumns = (withProduct) => [
  { key: 'created', label: 'Waktu', render: (m) => <span className="nowrap">{dateTime(m.created)}</span> },
  ...(withProduct
    ? [
        { key: 'product_code', label: 'Kode', render: (m) => <span className="mono">{m.product_code}</span> },
        { key: 'product_name', label: 'Nama Barang' },
      ]
    : []),
  { key: 'type', label: 'Jenis', render: (m) => <StatusBadge map={MOVEMENT_TYPE} value={m.type} /> },
  { key: 'ref_no', label: 'Dokumen', render: (m) => <span className="mono small">{m.ref_no}</span> },
  { key: 'reason', label: 'Keterangan' },
  {
    key: 'qty',
    label: 'Masuk / Keluar',
    align: 'right',
    render: (m) => <span className={m.qty < 0 ? 'text-bad' : 'text-ok'}>{m.qty > 0 ? `+${num(m.qty)}` : num(m.qty)}</span>,
  },
  { key: 'after_stock', label: 'Saldo', align: 'right', render: (m) => num(m.after_stock) },
  { key: 'operator', label: 'Oleh', render: (m) => <span className="small">{m.operator}</span> },
];

export default function StokCard({ id }) {
  const { item: p, loading, error, reload } = useRecord('products', id);
  const { can } = useSession();
  const moves = useRecords('stock_movements', { filter: p ? `product_code = ${q(p.code)}` : '', sort: '-created', enabled: !!p, limit: 500 });
  const toast = useToast();
  const confirm = useConfirm();
  const [dlg, setDlg] = useState(null);

  if (loading && !p) return <Loading />;
  if (error || !p) return <ErrorBox error={error} onRetry={reload} />;

  const archive = async () => {
    const ok = await confirm({
      title: `Arsipkan ${p.code}?`,
      message: `${p.name} tidak akan tampil lagi di daftar stok dan pilihan barang. Riwayat transaksinya tetap tersimpan.${p.stock > 0 ? ` Stok tercatat masih ${p.stock}.` : ''}`,
      confirmLabel: 'Arsipkan',
      danger: true,
    });
    if (!ok) return;
    try {
      await pb.collection('products').update(p.id, { deleted: true });
      toast.ok(`${p.code} diarsipkan`);
      navigate(['stok']);
    } catch (ex) {
      toast.error(ex);
    }
  };

  const low = p.min_stock > 0 && p.stock <= p.min_stock;
  return (
    <>
      <PageHeader crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: p.code }]} title={p.name} sub={p.code} />
      {can('owner', 'gudang') && (
        <div className="doc-bar">
          <div className="actions">
            <Button icon={Pencil} onClick={() => setDlg('edit')}>
              Ubah Data
            </Button>
            <Button icon={SlidersHorizontal} onClick={() => setDlg('adjust')}>
              Koreksi Stok
            </Button>
            <Button variant="danger" icon={Archive} onClick={archive}>
              Arsipkan
            </Button>
          </div>
        </div>
      )}
      <div className="doc-layout">
        <div className="stack">
          <div className="kpis">
            <div className="kpi">
              <div className="label">Stok sekarang</div>
              <div className={`value ${low ? 'text-bad' : ''}`}>
                {num(p.stock)} {p.unit}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Harga jual</div>
              <div className="value">{num(p.sell_price)}</div>
            </div>
            {can('owner') && (
              <div className="kpi">
                <div className="label">Harga modal</div>
                <div className="value">{num(p.buy_price)}</div>
              </div>
            )}
            <div className="kpi">
              <div className="label">Nilai stok (harga jual)</div>
              <div className="value">{num(p.stock * p.sell_price)}</div>
            </div>
          </div>
          <div className="sheet">
            <div className="two-col">
              <DescList
                items={[
                  ['Kode', <span key="c" className="mono">{p.code}</span>],
                  ['Kelompok', p.group_name],
                  ['Warna', p.color],
                  ['Ukuran', p.size],
                ]}
              />
              <DescList
                items={[
                  ['Stok minimum', p.min_stock ? <span key="m">{num(p.min_stock)} {low && <Badge tone="bad">Menipis</Badge>}</span> : null],
                  ['Lokasi', p.location],
                  ['Pabrik', p.factory],
                  ['Keterangan', p.notes],
                ]}
              />
            </div>
          </div>
          <Panel title="Riwayat mutasi stok" bodyClass="">
            <DataTable autoHeight columns={movementColumns(false)} rows={moves.items} loading={moves.loading} error={moves.error} empty={<Empty title="Belum ada mutasi" />} pageSize={25} />
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Foto">
            <PhotoPanel product={p} canEdit={can('owner', 'gudang')} />
          </Panel>
          <Panel title="Riwayat perubahan data" bodyClass="">
            <Activity recordIds={p.id} />
          </Panel>
        </div>
      </div>
      {dlg === 'edit' && <ProductDialog product={p} onClose={() => setDlg(null)} />}
      {dlg === 'adjust' && <AdjustDialog product={p} onClose={() => setDlg(null)} />}
    </>
  );
}

function PhotoPanel({ product, canEdit }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('photo_source', 'Upload manual');
      await pb.collection('products').update(product.id, fd);
      toast.ok('Foto tersimpan');
    } catch (ex) {
      toast.error(ex);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Hapus foto barang ini?', message: 'Foto bisa diupload lagi kapan saja.', confirmLabel: 'Hapus Foto', danger: true }))) return;
    try {
      await pb.collection('products').update(product.id, { photo: null, photo_source: '' });
      toast.ok('Foto dihapus');
    } catch (ex) {
      toast.error(ex);
    }
  };
  return (
    <div className="photo-panel">
      <ProductPhoto product={product} size="lg" />
      {product.photo_source && (
        <div className="source">
          Sumber:{' '}
          {/^https?:/.test(product.photo_source) ? (
            <a href={product.photo_source} target="_blank" rel="noreferrer">
              katalog paletindo.com
            </a>
          ) : (
            product.photo_source
          )}
          {/^https?:/.test(product.photo_source) ? ' · foto contoh model, warna bisa berbeda' : ''}
        </div>
      )}
      {canEdit && (
        <div className="row">
          <FilePick value={null} onChange={upload} accept="image/jpeg,image/png,image/webp" label={busy ? 'Mengunggah...' : product.photo ? 'Ganti foto' : 'Upload foto'} maxMB={3} onError={toast.error} />
          {product.photo && (
            <Button size="sm" variant="ghost" onClick={remove}>
              Hapus foto
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function MutasiList() {
  const { query } = useRoute();
  const search = query.q || '';
  const type = query.t || '';
  const { items, loading, error, reload } = useRecords('stock_movements', { sort: '-created', limit: 2000, filter: type ? `type = ${q(type)}` : '' });
  const rows = items.filter((m) => matchText(m, search, ['product_code', 'product_name', 'ref_no', 'reason', 'operator']));
  return (
    <>
      <PageHeader crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: 'Mutasi Stok' }]} title="Mutasi Stok" sub="2.000 mutasi terakhir" />
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari kode, nama, dokumen, petugas..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari mutasi" />
        <Select className="w-sm" value={type} onChange={(e) => replaceQuery({ ...query, t: e.target.value })} aria-label="Jenis mutasi">
          <option value="">Semua jenis</option>
          {Object.entries(MOVEMENT_TYPE).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>
      <DataTable columns={movementColumns(true)} rows={rows} loading={loading} error={error} onRetry={reload} empty={<Empty title="Belum ada mutasi stok" />} />
    </>
  );
}

/** Daftar harga modal (khusus Owner): meniru Sheet2 "Tipe · Pricelist · Modal · Harga Jual · Margin". */
export function HargaModal() {
  const { products } = useSession();
  const { query } = useRoute();
  const search = query.q || '';
  const rows = products.filter((p) => matchText(p, search, ['code', 'name', 'group_name', 'factory']));
  return (
    <>
      <PageHeader crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: 'Harga Modal' }]} title="Daftar Harga Modal" sub="Khusus Owner" />
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari kode, nama, kelompok..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari" />
      </div>
      <DataTable
        rows={rows}
        groupBy={(p) => p.group_name || 'Lainnya'}
        onRowClick={(p) => navigate(['stok', p.id])}
        columns={[
          { key: 'code', label: 'Kode', render: (p) => <span className="mono">{p.code}</span> },
          { key: 'name', label: 'Tipe / Nama' },
          { key: 'pricelist', label: 'Pricelist', align: 'right', value: (p) => p.extra?.pricelistPabrik || 0, render: (p) => numOrDash(p.extra?.pricelistPabrik) },
          { key: 'buy_price', label: 'Modal', align: 'right', render: (p) => numOrDash(p.buy_price) },
          { key: 'sell_price', label: 'Harga Jual', align: 'right', render: (p) => numOrDash(p.sell_price) },
          {
            key: 'margin',
            label: 'Margin',
            align: 'right',
            value: (p) => p.sell_price - p.buy_price,
            render: (p) => (p.buy_price > 0 ? <span className={p.sell_price < p.buy_price ? 'text-bad' : ''}>{num(p.sell_price - p.buy_price)}</span> : '-'),
          },
          { key: 'pct', label: '%', align: 'right', value: (p) => (p.buy_price > 0 ? (p.sell_price - p.buy_price) / p.buy_price : 0), render: (p) => (p.buy_price > 0 ? `${Math.round(((p.sell_price - p.buy_price) / p.buy_price) * 100)}%` : '-') },
          { key: 'updated', label: 'Diubah', render: (p) => date(p.updated) },
        ]}
      />
    </>
  );
}
