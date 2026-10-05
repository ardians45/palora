// Stok opname: isi hasil hitung fisik. Hanya baris yang diisi yang disesuaikan.
// Stok sistem dicatat saat angka hitung diketik (snapshot); server menghitung selisih terhadap snapshot itu,
// jadi penjualan/penerimaan yang terjadi sambil opname berjalan tidak ikut "dikoreksi".
import React, { useMemo, useState } from 'react';
import { ClipboardCheck, Plus, Printer } from 'lucide-react';
import { action, useRecord, useRecords } from '../../lib/data';
import { href, navigate, replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, dateTime, num, parseNum, today } from '../../lib/format';
import { Button, DescList, Empty, ErrorBox, Field, Input, LinkButton, Loading, PageHeader, Select, Textarea } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import { useConfirm, useToast } from '../../ui/feedback';

export function OpnameList() {
  const { items, loading, error, reload } = useRecords('opname_sessions', { sort: '-created' });
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: 'Stok Opname' }]}
        title="Stok Opname"
        actions={
          <LinkButton to={['opname', 'baru']} variant="primary" icon={Plus}>
            Mulai Opname
          </LinkButton>
        }
      />
      <DataTable
        rows={items}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(s) => navigate(['opname', s.id])}
        empty={<Empty title="Belum pernah opname" action={<LinkButton to={['opname', 'baru']} variant="primary" icon={Plus}>Mulai opname pertama</LinkButton>}>Disarankan minimal seminggu sekali.</Empty>}
        columns={[
          { key: 'code', label: 'No. Opname', render: (s) => <span className="mono">{s.code}</span> },
          { key: 'date', label: 'Tanggal', render: (s) => date(s.date) },
          { key: 'scope', label: 'Cakupan' },
          { key: 'lines', label: 'Dihitung', align: 'right', value: (s) => (s.lines || []).length },
          { key: 'adjusted_count', label: 'Ada selisih', align: 'right' },
          { key: 'created_by', label: 'Petugas' },
        ]}
      />
    </>
  );
}

export function OpnameNew() {
  const { products } = useSession();
  const { query } = useRoute();
  const toast = useToast();
  const confirm = useConfirm();
  const group = query.g || '';
  const search = query.q || '';
  const [counts, setCounts] = useState({}); // productId -> angka | ''
  const [snaps, setSnaps] = useState({}); // productId -> stok sistem saat dihitung
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const groups = useMemo(() => [...new Set(products.map((p) => p.group_name || 'Lainnya'))].sort((a, b) => a.localeCompare(b, 'id')), [products]);
  const rows = products.filter((p) => (!group || (p.group_name || 'Lainnya') === group) && matchText(p, search, ['code', 'name', 'color']));
  const filled = Object.entries(counts).filter(([, v]) => v !== '' && v !== undefined);
  const diffs = filled
    .map(([pid, v]) => {
      const p = products.find((x) => x.id === pid);
      return p ? { p, counted: Number(v), diff: Number(v) - (snaps[pid] ?? p.stock) } : null;
    })
    .filter(Boolean);
  const changed = diffs.filter((d) => d.diff !== 0);

  const submit = async () => {
    setErr('');
    if (filled.length === 0) return setErr('Belum ada barang yang diisi hasil hitungnya.');
    const ok = await confirm({
      title: 'Simpan hasil opname?',
      message: `${filled.length} barang dihitung, ${changed.length} ada selisih dan stoknya akan disesuaikan. Barang yang tidak diisi tidak berubah.`,
      confirmLabel: 'Simpan Opname',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const sess = await action('opname/apply', {
        date: today(),
        scope: group || 'Semua barang',
        note,
        lines: filled.map(([product_id, counted]) => ({ product_id, counted, system_at_count: snaps[product_id] })),
      });
      toast.ok(`Opname ${sess.code} tersimpan: ${sess.adjusted_count} barang disesuaikan`);
      navigate(['opname', sess.id]);
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: 'Stok Opname', to: ['opname'] }, { label: 'Baru' }]}
        title="Stok Opname Baru"
        sub={`${filled.length} dihitung · ${changed.length} selisih`}
        actions={
          <>
            <Button icon={Printer} onClick={() => window.open(href(['cetak', 'opname'], { g: group }), '_blank')}>
              Cetak Lembar Hitung
            </Button>
            <Button variant="primary" icon={ClipboardCheck} busy={busy} onClick={submit}>
              Simpan Opname
            </Button>
          </>
        }
      />
      {err && <div className="alert error mb-3">{err}</div>}
      <div className="table-tools">
        <Select className="w-md" value={group} onChange={(e) => replaceQuery({ ...query, g: e.target.value })} aria-label="Kelompok">
          <option value="">Semua kelompok</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Input className="search" type="search" placeholder="Cari kode / nama..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari barang" />
      </div>
      <DataTable
        rows={rows}
        groupBy={(p) => p.group_name || 'Lainnya'}
        columns={[
          { key: 'code', label: 'Kode', render: (p) => <span className="mono">{p.code}</span> },
          { key: 'name', label: 'Nama Barang' },
          { key: 'color', label: 'Warna' },
          { key: 'stock', label: 'Stok Sistem', align: 'right', render: (p) => num(p.stock) },
          {
            key: 'count',
            label: 'Hitung Fisik',
            align: 'right',
            sortable: false,
            render: (p) => (
              <input
                className="input num w-xs"
                inputMode="numeric"
                value={counts[p.id] ?? ''}
                onChange={(e) => {
                  const n = parseNum(e.target.value);
                  setCounts((c) => ({ ...c, [p.id]: e.target.value === '' || Number.isNaN(n) ? '' : Math.max(0, Math.round(n)) }));
                  setSnaps((sn) => (p.id in sn ? sn : { ...sn, [p.id]: p.stock }));
                }}
                aria-label={`Hitung fisik ${p.code}`}
              />
            ),
          },
          {
            key: 'diff',
            label: 'Selisih',
            align: 'right',
            sortable: false,
            render: (p) => {
              const v = counts[p.id];
              if (v === '' || v === undefined) return '';
              const d = Number(v) - (snaps[p.id] ?? p.stock);
              return <span className={d < 0 ? 'text-bad strong' : d > 0 ? 'text-ok strong' : 'muted'}>{d > 0 ? `+${d}` : d}</span>;
            },
          },
        ]}
      />
      <div className="mt-3">
        <Field label="Catatan opname">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. dihitung Mas Heri & Rizki, rak B belum" />
        </Field>
      </div>
    </>
  );
}

export function OpnameDoc({ id }) {
  const { item: s, loading, error } = useRecord('opname_sessions', id);
  if (loading && !s) return <Loading />;
  if (error || !s) return <ErrorBox error={error} />;
  const lines = s.lines || [];
  return (
    <>
      <PageHeader crumbs={[{ label: 'Stok Gudang', to: ['stok'] }, { label: 'Stok Opname', to: ['opname'] }, { label: s.code }]} title={s.code} />
      <div className="sheet stack">
        <DescList items={[['Tanggal', date(s.date)], ['Cakupan', s.scope], ['Petugas', s.created_by], ['Disimpan', dateTime(s.created)], ['Catatan', s.note]]} />
        <DataTable
          autoHeight
          rows={lines}
          rowKey={(l) => l.product_id}
          initialSort={{ key: 'diff', dir: 1 }}
          columns={[
            { key: 'code', label: 'Kode', render: (l) => <span className="mono">{l.code}</span> },
            { key: 'name', label: 'Nama Barang' },
            { key: 'system', label: 'Stok Sistem', align: 'right', render: (l) => num(l.system) },
            { key: 'counted', label: 'Hitung Fisik', align: 'right', render: (l) => num(l.counted) },
            { key: 'diff', label: 'Selisih', align: 'right', render: (l) => <span className={l.diff < 0 ? 'text-bad strong' : l.diff > 0 ? 'text-ok strong' : 'muted'}>{l.diff > 0 ? `+${l.diff}` : l.diff}</span>, total: true },
          ]}
        />
      </div>
    </>
  );
}
