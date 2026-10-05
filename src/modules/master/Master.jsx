// Master pelanggan & supplier: daftar, tambah/ubah, arsipkan.
import React, { useState } from 'react';
import { Archive, Plus } from 'lucide-react';
import { pb } from '../../lib/pb';
import { useRecords } from '../../lib/data';
import { replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { num } from '../../lib/format';
import { Button, Empty, Field, Input, MoneyInput, PageHeader, Select, Textarea } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import { Dialog, useConfirm, useToast } from '../../ui/feedback';
import { TERMS } from '../penjualan/PesananForm';

const CONFIG = {
  customers: {
    title: 'Pelanggan',
    singular: 'pelanggan',
    search: ['name', 'contact_person', 'phone', 'whatsapp', 'address'],
    columns: [
      { key: 'name', label: 'Nama', render: (c) => <b>{c.name}</b> },
      { key: 'contact_person', label: 'UP / Kontak' },
      { key: 'phone', label: 'Telepon / WA', render: (c) => c.whatsapp || c.phone },
      { key: 'type', label: 'Tipe' },
      { key: 'default_terms', label: 'Syarat Bayar' },
      { key: 'credit_limit', label: 'Limit Kredit', align: 'right', render: (c) => (c.credit_limit ? num(c.credit_limit) : '-') },
    ],
    fields: [
      { key: 'name', label: 'Nama customer / toko', required: true, span: 'span-2' },
      { key: 'type', label: 'Tipe', options: ['', 'Korporat', 'Grosir', 'Toko', 'Perorangan'] },
      { key: 'contact_person', label: 'UP / kontak' },
      { key: 'whatsapp', label: 'No. WhatsApp' },
      { key: 'phone', label: 'Telepon kantor' },
      { key: 'email', label: 'Email' },
      { key: 'npwp', label: 'NPWP' },
      { key: 'default_terms', label: 'Syarat bayar biasa', options: ['', ...TERMS] },
      { key: 'address', label: 'Alamat (penagihan)', span: 'span-all', textarea: true },
      { key: 'shipping_address', label: 'Alamat kirim', span: 'span-all', textarea: true },
      { key: 'credit_limit', label: 'Limit kredit', money: true },
    ],
  },
  suppliers: {
    title: 'Supplier',
    singular: 'supplier',
    search: ['name', 'sales_person', 'phone', 'whatsapp', 'email'],
    columns: [
      { key: 'name', label: 'Nama', render: (s) => <b>{s.name}</b> },
      { key: 'sales_person', label: 'Up (Sales)' },
      { key: 'phone', label: 'Telepon / WA', render: (s) => s.whatsapp || s.phone },
      { key: 'email', label: 'Email' },
      { key: 'terms', label: 'Syarat Bayar' },
      { key: 'discount_rule', label: 'Aturan Diskon' },
    ],
    fields: [
      { key: 'name', label: 'Nama supplier / pabrik', required: true, span: 'span-2' },
      { key: 'terms', label: 'Syarat bayar', options: ['', 'Tunai / Lunas dulu', 'Tempo 14 Hari', 'Tempo 30 Hari', 'Tempo 45 Hari'] },
      { key: 'sales_person', label: 'Up (sales)' },
      { key: 'whatsapp', label: 'No. WhatsApp', hint: 'Untuk tombol Kirim PO via WA' },
      { key: 'email', label: 'Email', hint: 'Untuk tombol Kirim PO via Email' },
      { key: 'phone', label: 'Telepon kantor' },
      { key: 'discount_rule', label: 'Aturan diskon', hint: 'mis. Pricelist - 20% + PPN 11%', span: 'span-2' },
      { key: 'address', label: 'Alamat', span: 'span-all', textarea: true },
    ],
  },
};

export default function Master({ collection }) {
  const cfg = CONFIG[collection];
  const { query } = useRoute();
  const { can } = useSession();
  const search = query.q || '';
  const { items, loading, error, reload } = useRecords(collection, { filter: 'deleted = false', sort: 'name' });
  const [edit, setEdit] = useState(null);
  const rows = items.filter((r) => matchText(r, search, cfg.search));
  const canEdit = collection === 'customers' || can('owner', 'gudang', 'finance');

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Master Data' }, { label: cfg.title }]}
        title={cfg.title}
        actions={
          canEdit && (
            <Button variant="primary" icon={Plus} onClick={() => setEdit({})}>
              Tambah {cfg.singular}
            </Button>
          )
        }
      />
      <div className="table-tools">
        <Input className="search" type="search" placeholder={`Cari ${cfg.singular}...`} value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label={`Cari ${cfg.singular}`} />
      </div>
      <DataTable
        columns={cfg.columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={canEdit ? (r) => setEdit(r) : undefined}
        empty={<Empty title={search ? 'Tidak ada yang cocok' : `Belum ada ${cfg.singular}`} />}
      />
      {edit && <EditDialog cfg={cfg} collection={collection} record={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </>
  );
}

function EditDialog({ cfg, collection, record, onClose }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [f, setF] = useState(() => Object.fromEntries(cfg.fields.map((x) => [x.key, record?.[x.key] ?? (x.money ? '' : '')])));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!String(f.name || '').trim()) return setErr('Nama wajib diisi.');
    const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v === '' ? 0 : v]));
    setBusy(true);
    try {
      if (record) await pb.collection(collection).update(record.id, body);
      else {
        const dup = await pb.collection(collection).getList(1, 1, { filter: pb.filter('name = {:n} && deleted = false', { n: body.name }) });
        if (dup.totalItems) {
          setErr(`"${body.name}" sudah ada.`);
          setBusy(false);
          return;
        }
        await pb.collection(collection).create({ ...body, uid: `${collection === 'customers' ? 'CUST' : 'SUP'}-${Date.now()}` });
      }
      toast.ok(`${body.name} tersimpan`);
      onClose();
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    const ok = await confirm({ title: `Arsipkan ${record.name}?`, message: 'Tidak akan muncul lagi di pilihan. Riwayat transaksi tetap tersimpan.', confirmLabel: 'Arsipkan', danger: true });
    if (!ok) return;
    try {
      await pb.collection(collection).update(record.id, { deleted: true });
      toast.ok(`${record.name} diarsipkan`);
      onClose();
    } catch (ex) {
      toast.error(ex);
    }
  };

  return (
    <Dialog title={record ? `Ubah ${record.name}` : `Tambah ${cfg.singular}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="dialog-body">
          <div className="form-grid cols-3">
            {cfg.fields.map((x) => (
              <Field key={x.key} label={x.label} required={x.required} hint={x.hint} className={x.span || ''}>
                {x.options ? (
                  <Select value={f[x.key] || ''} onChange={(e) => set(x.key, e.target.value)} options={x.options.includes(f[x.key]) || !f[x.key] ? x.options : [f[x.key], ...x.options]} />
                ) : x.money ? (
                  <MoneyInput value={f[x.key]} onChange={(v) => set(x.key, v)} />
                ) : x.textarea ? (
                  <Textarea rows={2} value={f[x.key] || ''} onChange={(e) => set(x.key, e.target.value)} />
                ) : (
                  <Input value={f[x.key] || ''} onChange={(e) => set(x.key, e.target.value)} />
                )}
              </Field>
            ))}
          </div>
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          {record && (
            <Button variant="danger" icon={Archive} onClick={archive} className="mr-auto">
              Arsipkan
            </Button>
          )}
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" busy={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
