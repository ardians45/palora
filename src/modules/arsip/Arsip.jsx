// Arsip dokumen: disusun per PO seperti map kertas (PO -> surat jalan -> invoice -> faktur),
// plus daftar semua berkas & upload berkas susulan.
import React, { useMemo, useState } from 'react';
import { Check, Minus, Upload } from 'lucide-react';
import { pb } from '../../lib/pb';
import { fileUrl, useRecords } from '../../lib/data';
import { navigate, replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, today } from '../../lib/format';
import { PO_STATUS } from '../../lib/status';
import { Button, Empty, Field, FilePick, Input, PageHeader, Select, StatusBadge, Tabs } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import { Dialog, useToast } from '../../ui/feedback';

export const DOC_CATEGORIES = ['Surat Jalan', 'Invoice', 'Faktur Pajak', 'Bukti Transfer', 'Purchase Order', 'Lainnya'];

const Tick = ({ on, label }) => (
  <span className={on ? 'text-ok' : 'muted'} title={label} aria-label={`${label}: ${on ? 'ada' : 'belum'}`}>
    {on ? <Check size={16} /> : <Minus size={16} />}
  </span>
);

export default function Arsip() {
  const { query } = useRoute();
  const { can } = useSession();
  const tab = query.tab || 'po';
  const search = query.q || '';
  const [upload, setUpload] = useState(false);
  const pos = useRecords('purchase_orders', { filter: 'deleted = false', sort: '-date,-created' });
  const docs = useRecords('documents', { filter: 'deleted = false', sort: '-created' });
  const finance = can('owner', 'finance');
  const invoices = useRecords('supplier_invoices', { filter: 'deleted = false', enabled: finance });

  const folders = useMemo(
    () =>
      pos.items.map((po) => {
        const related = docs.items.filter((d) => d.ref_no === po.po_no);
        const inv = invoices.items.filter((i) => i.po_id === po.id);
        return {
          ...po,
          sj: (po.receipts || []).length > 0 || related.some((d) => d.category === 'Surat Jalan'),
          sjPhoto: related.some((d) => d.category === 'Surat Jalan' && d.file),
          invoice: inv.length > 0 || related.some((d) => d.category === 'Invoice'),
          faktur: inv.some((i) => i.tax_file || i.tax_invoice_no) || related.some((d) => d.category === 'Faktur Pajak'),
          lunas: inv.length > 0 && inv.every((i) => i.paid_amount >= i.total_amount),
          files: related.length + inv.filter((i) => i.file).length + inv.filter((i) => i.tax_file).length,
        };
      }),
    [pos.items, docs.items, invoices.items]
  );

  const folderRows = folders.filter((f) => matchText(f, search, ['po_no', 'supplier']));
  const docRows = docs.items.filter((d) => matchText(d, search, ['title', 'ref_no', 'partner', 'category', 'file_name']));

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Arsip Dokumen' }]}
        title="Arsip Dokumen"
        actions={
          <Button variant="primary" icon={Upload} onClick={() => setUpload(true)}>
            Upload Berkas
          </Button>
        }
      />
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari no. PO, supplier, berkas..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari arsip" />
      </div>
      <Tabs
        tabs={[
          { key: 'po', label: 'Map per PO', count: folderRows.length },
          { key: 'semua', label: 'Semua berkas', count: docRows.length },
        ]}
        value={tab}
        onChange={(k) => replaceQuery({ ...query, tab: k })}
      />
      {tab === 'po' ? (
        <DataTable
          rows={folderRows}
          loading={pos.loading}
          error={pos.error}
          onRowClick={(f) => navigate(['pembelian', f.id])}
          empty={<Empty title="Belum ada PO" />}
          columns={[
            { key: 'po_no', label: 'No. PO', render: (f) => <span className="mono">{f.po_no}</span> },
            { key: 'date', label: 'Tanggal', render: (f) => date(f.date) },
            { key: 'supplier', label: 'Supplier' },
            { key: 'state', label: 'Status PO', render: (f) => <StatusBadge map={PO_STATUS} value={f.state} /> },
            { key: 'po', label: 'PO', align: 'center', sortable: false, render: () => <Tick on label="PO" /> },
            { key: 'sj', label: 'Surat Jalan', align: 'center', value: (f) => (f.sj ? 1 : 0), render: (f) => <Tick on={f.sj} label="Surat jalan" /> },
            ...(finance
              ? [
                  { key: 'invoice', label: 'Invoice', align: 'center', value: (f) => (f.invoice ? 1 : 0), render: (f) => <Tick on={f.invoice} label="Invoice" /> },
                  { key: 'faktur', label: 'Faktur', align: 'center', value: (f) => (f.faktur ? 1 : 0), render: (f) => <Tick on={f.faktur} label="Faktur" /> },
                  { key: 'lunas', label: 'Lunas', align: 'center', value: (f) => (f.lunas ? 1 : 0), render: (f) => <Tick on={f.lunas} label="Lunas" /> },
                ]
              : []),
            { key: 'files', label: 'Berkas', align: 'right' },
          ]}
        />
      ) : (
        <DataTable
          rows={docRows}
          loading={docs.loading}
          error={docs.error}
          empty={<Empty title="Belum ada berkas" />}
          columns={[
            { key: 'created', label: 'Diunggah', render: (d) => date(d.created) },
            { key: 'category', label: 'Jenis' },
            { key: 'title', label: 'Judul' },
            { key: 'ref_no', label: 'No. Referensi', render: (d) => <span className="mono">{d.ref_no}</span> },
            { key: 'partner', label: 'Mitra' },
            { key: 'uploaded_by', label: 'Oleh' },
            {
              key: 'file',
              label: 'File',
              sortable: false,
              render: (d) =>
                d.file ? (
                  <a href={fileUrl(d, d.file)} target="_blank" rel="noreferrer">
                    Buka
                  </a>
                ) : (
                  <span className="muted small">tanpa file</span>
                ),
            },
          ]}
        />
      )}
      {upload && <UploadDialog pos={pos.items} onClose={() => setUpload(false)} />}
    </>
  );
}

function UploadDialog({ pos, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ category: 'Surat Jalan', ref_no: '', partner: '', title: '', date: today() });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  return (
    <Dialog title="Upload Berkas" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return setErr('Pilih foto atau PDF dulu.');
          const fd = new FormData();
          const po = pos.find((p) => p.po_no === f.ref_no);
          Object.entries({
            ...f,
            type: f.category,
            partner: f.partner || po?.supplier || '',
            title: f.title || `${f.category} ${f.ref_no}`.trim(),
            file_name: file.name,
          }).forEach(([k, v]) => fd.append(k, v));
          fd.append('file', file);
          setBusy(true);
          try {
            await pb.collection('documents').create(fd);
            toast.ok('Berkas tersimpan');
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
            <Field label="Jenis berkas">
              <Select value={f.category} onChange={(e) => set({ category: e.target.value })} options={DOC_CATEGORIES} />
            </Field>
            <Field label="Tanggal">
              <Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Untuk PO / no. dokumen" className="span-all" hint="Pilih PO supaya masuk ke map PO tersebut">
              <Input list="po-list" value={f.ref_no} onChange={(e) => set({ ref_no: e.target.value })} />
            </Field>
            <datalist id="po-list">
              {pos.map((p) => (
                <option key={p.id} value={p.po_no}>
                  {p.supplier}
                </option>
              ))}
            </datalist>
            <Field label="Mitra (supplier / customer)" className="span-all">
              <Input value={f.partner} onChange={(e) => set({ partner: e.target.value })} />
            </Field>
            <Field label="Judul (opsional)" className="span-all">
              <Input value={f.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="File" required className="span-all">
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
