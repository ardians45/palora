// Daftar & detail surat jalan pengiriman ke customer.
import React, { useState } from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import { action, fileUrl, useRecord, useRecords } from '../../lib/data';
import { href, navigate, replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, num, today } from '../../lib/format';
import { SJ_STATUS } from '../../lib/status';
import { Button, DescList, Empty, ErrorBox, Field, FilePick, Input, Loading, PageHeader, Panel, StatusBadge, Tabs } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import Activity from '../../ui/Activity';
import { Dialog, useToast } from '../../ui/feedback';

export function SuratJalanList() {
  const { query } = useRoute();
  const tab = query.tab || 'semua';
  const search = query.q || '';
  const { items, loading, error, reload } = useRecords('deliveries', { filter: 'deleted = false', sort: '-date,-created' });
  const base = items.filter((d) => matchText(d, search, ['sj_no', 'order_no', 'customer', 'destination', 'driver_name']));
  const rows = base.filter((d) => tab === 'semua' || d.status === tab);

  return (
    <>
      <PageHeader crumbs={[{ label: 'Penjualan', to: ['penjualan'] }, { label: 'Surat Jalan' }]} title="Surat Jalan" sub="Surat jalan terbit dari pesanan yang sudah lunas / diizinkan" />
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari no. SJ, nota, customer, supir..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari surat jalan" />
      </div>
      <Tabs
        tabs={[
          { key: 'semua', label: 'Semua', count: base.length },
          { key: 'dikirim', label: 'Dalam Pengiriman', count: base.filter((d) => d.status === 'dikirim').length },
          { key: 'diterima', label: 'Diterima', count: base.filter((d) => d.status === 'diterima').length },
        ]}
        value={tab}
        onChange={(k) => replaceQuery({ ...query, tab: k })}
      />
      <DataTable
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(d) => navigate(['surat-jalan', d.id])}
        empty={<Empty title="Belum ada surat jalan">Surat jalan dibuat dari halaman pesanan: tombol "Keluarkan Barang".</Empty>}
        columns={[
          { key: 'sj_no', label: 'No. Surat Jalan', render: (d) => <span className="mono">{d.sj_no}</span> },
          { key: 'date', label: 'Tanggal', render: (d) => date(d.date) },
          { key: 'order_no', label: 'No. Nota', render: (d) => <span className="mono">{d.order_no}</span> },
          { key: 'customer', label: 'Customer' },
          { key: 'destination', label: 'Kirim Ke' },
          { key: 'driver_name', label: 'Supir' },
          { key: 'status', label: 'Status', render: (d) => <StatusBadge map={SJ_STATUS} value={d.status} /> },
        ]}
      />
    </>
  );
}

export function SuratJalanDoc({ id }) {
  const { item: d, loading, error, reload } = useRecord('deliveries', id);
  const { can } = useSession();
  const [open, setOpen] = useState(false);
  if (loading && !d) return <Loading />;
  if (error || !d) return <ErrorBox error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader crumbs={[{ label: 'Penjualan', to: ['penjualan'] }, { label: 'Surat Jalan', to: ['surat-jalan'] }, { label: d.sj_no }]} title={d.sj_no} />
      <div className="doc-bar">
        <div className="actions">
          <Button variant={d.status === 'dikirim' ? undefined : 'primary'} icon={Printer} onClick={() => window.open(href(['cetak', 'sj', d.id]), '_blank')}>
            Cetak Surat Jalan
          </Button>
          {d.status === 'dikirim' && can('owner', 'gudang') && (
            <Button variant="primary" icon={CheckCircle2} onClick={() => setOpen(true)}>
              Konfirmasi Diterima
            </Button>
          )}
        </div>
        <StatusBadge map={SJ_STATUS} value={d.status} />
      </div>
      <div className="doc-layout">
        <div className="sheet">
          <div className="doc-no">{d.sj_no}</div>
          <div className="two-col">
            <DescList
              items={[
                ['Kepada', <b key="c">{d.customer}</b>],
                ['UP', d.up_person],
                ['Kirim ke', d.destination],
                ['PO customer', d.po_customer_ref],
              ]}
            />
            <DescList
              items={[
                ['Tanggal', date(d.date)],
                ['No. nota', d.order_id ? <a key="o" href={href(['penjualan', d.order_id])}>{d.order_no}</a> : d.order_no],
                ['Supir', d.driver_name],
                ['Kendaraan', d.vehicle_plate],
                ['Diterima oleh', d.received_by ? `${d.received_by} (${date(d.received_date)})` : null],
                ['Foto SJ ditandatangani', d.signed_file ? <a key="f" href={fileUrl(d, d.signed_file)} target="_blank" rel="noreferrer">Lihat</a> : null],
              ]}
            />
          </div>
          <div className="table-wrap auto-h mt-4">
            <table className="dt">
              <thead>
                <tr>
                  <th className="right">Quantity</th>
                  <th>Item Barang</th>
                </tr>
              </thead>
              <tbody>
                {(d.items || []).map((it, i) => (
                  <tr key={i}>
                    <td className="right">
                      {num(it.qty)} {it.unit || 'pcs'}
                    </td>
                    <td>
                      {it.name}
                      {it.color && !it.name.toLowerCase().includes(String(it.color).toLowerCase()) ? ` - ${it.color}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Panel title="Riwayat" bodyClass="">
          <Activity recordIds={[d.id, d.order_id]} />
        </Panel>
      </div>
      {open && <ReceivedDialog delivery={d} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReceivedDialog({ delivery, onClose }) {
  const toast = useToast();
  const [name, setName] = useState(delivery.up_person || '');
  const [day, setDay] = useState(today());
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title="Konfirmasi Barang Diterima" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return setErr('Nama penerima wajib diisi.');
          setBusy(true);
          try {
            await action('deliveries/received', { delivery_id: delivery.id, received_by: name, date: day, signed_file: file || undefined });
            toast.ok(`${delivery.sj_no} dikonfirmasi diterima`);
            onClose();
          } catch (ex) {
            setErr(ex?.response?.message || ex.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-body">
          <div className="form-grid">
            <Field label="Nama penerima" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <Field label="Tanggal diterima">
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </Field>
            <Field label="Foto surat jalan bertanda tangan (opsional)" className="span-all">
              <FilePick value={file} onChange={setFile} onError={setErr} />
            </Field>
          </div>
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" busy={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
