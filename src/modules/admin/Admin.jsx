// Khusus Owner: aktivitas sistem (audit trail), pengguna, pengaturan perusahaan.
import React, { useMemo, useState } from 'react';
import { KeyRound, Plus, Save, Trash2 } from 'lucide-react';
import { pb } from '../../lib/pb';
import { useRecords } from '../../lib/data';
import { replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { dateTime, today } from '../../lib/format';
import { ROLE_LABEL } from '../../lib/status';
import { Badge, Button, Empty, Field, Input, PageHeader, Panel, Select } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import { describeChanges } from '../../ui/Activity';
import { Dialog, useToast } from '../../ui/feedback';

const COLL_LABEL = {
  products: 'Barang',
  customers: 'Pelanggan',
  suppliers: 'Supplier',
  sales_orders: 'Penjualan',
  purchase_orders: 'PO',
  deliveries: 'Surat Jalan',
  documents: 'Arsip',
  supplier_invoices: 'Hutang',
  settings: 'Pengaturan',
  users: 'Pengguna',
};
const ACTION_LABEL = {
  create: 'Buat',
  update: 'Ubah',
  soft_delete: 'Arsipkan',
  payment: 'Pembayaran',
  receive: 'Terima barang',
  dispatch: 'Surat jalan',
  pickup: 'Diambil sendiri',
  received: 'Diterima customer',
  release: 'Izin kirim',
  cancel: 'Batal',
  state: 'Status',
  stock: 'Stok',
  import: 'Import',
  delete: 'Hapus',
};

export function Aktivitas() {
  const { query } = useRoute();
  const day = query.d || today();
  const who = query.u || '';
  const coll = query.c || '';
  const search = query.q || '';
  const next = new Date(`${day}T00:00:00`);
  next.setDate(next.getDate() + 1);
  // audit_trail.created dalam UTC; ambil rentang hari lokal
  const startUtc = new Date(`${day}T00:00:00`).toISOString().replace('T', ' ');
  const endUtc = next.toISOString().replace('T', ' ');
  const { items, loading, error, reload } = useRecords('audit_trail', {
    filter: `created >= "${startUtc}" && created < "${endUtc}"${coll ? ` && collection_name = "${coll}"` : ''}`,
    sort: '-created',
    limit: 1000,
  });
  const people = useMemo(() => [...new Set(items.map((a) => a.actor_name))].sort(), [items]);
  const rows = items.filter((a) => (!who || a.actor_name === who) && matchText(a, search, ['actor_name', 'record_uid', (a) => describeChanges(a.changes)]));

  return (
    <>
      <PageHeader crumbs={[{ label: 'Pengaturan' }, { label: 'Aktivitas' }]} title="Aktivitas Sistem" sub="Siapa mengubah apa, kapan" />
      <div className="table-tools">
        <Input type="date" className="w-sm" value={day} onChange={(e) => replaceQuery({ ...query, d: e.target.value })} aria-label="Tanggal" />
        <Select className="w-md" value={who} onChange={(e) => replaceQuery({ ...query, u: e.target.value })} aria-label="Pengguna">
          <option value="">Semua pengguna</option>
          {people.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select className="w-sm" value={coll} onChange={(e) => replaceQuery({ ...query, c: e.target.value })} aria-label="Modul">
          <option value="">Semua modul</option>
          {Object.entries(COLL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Input className="search" type="search" placeholder="Cari..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari aktivitas" />
      </div>
      <DataTable
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={<Empty title="Tidak ada aktivitas pada tanggal ini" />}
        columns={[
          { key: 'created', label: 'Waktu', render: (a) => <span className="nowrap">{dateTime(a.created)}</span> },
          { key: 'actor_name', label: 'Pengguna' },
          { key: 'collection_name', label: 'Modul', render: (a) => COLL_LABEL[a.collection_name] || a.collection_name },
          { key: 'action', label: 'Aksi', render: (a) => <Badge>{ACTION_LABEL[a.action] || a.action}</Badge> },
          { key: 'record_uid', label: 'Data', render: (a) => <span className="mono small">{a.record_uid}</span> },
          { key: 'changes', label: 'Perubahan', sortable: false, render: (a) => <span className="small">{describeChanges(a.changes)}</span> },
        ]}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
export function Pengguna() {
  const { user } = useSession();
  const { items, loading, error, reload } = useRecords('users', { sort: 'name' });
  const [edit, setEdit] = useState(null);
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Pengaturan' }, { label: 'Pengguna' }]}
        title="Pengguna & Hak Akses"
        sub="Karyawan yang keluar cukup dinonaktifkan"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEdit({ role: 'gudang', active: true })}>
            Tambah Akun
          </Button>
        }
      />
      <DataTable
        rows={items}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(u) => setEdit(u)}
        columns={[
          { key: 'name', label: 'Nama', render: (u) => <span className="row"><b>{u.name}</b>{u.id === user.id && <Badge tone="info">Anda</Badge>}</span> },
          { key: 'email', label: 'Email (login)' },
          { key: 'role', label: 'Role', render: (u) => ROLE_LABEL[u.role] || u.role },
          { key: 'active', label: 'Status', render: (u) => <Badge tone={u.active ? 'ok' : 'neutral'}>{u.active ? 'Aktif' : 'Nonaktif'}</Badge> },
        ]}
      />
      <Panel title="Hak akses per role">
        <table className="dt">
          <thead>
            <tr>
              <th>Fitur</th>
              <th className="center">Owner</th>
              <th className="center">Admin Gudang & Kasir</th>
              <th className="center">Keuangan</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Lihat stok', 1, 1, 1],
              ['Buat PO & terima barang', 1, 1, 0],
              ['Pesanan, kasir, surat jalan', 1, 1, 0],
              ['Kelola master barang & stok opname', 1, 1, 0],
              ['Catat DP / pelunasan sebelum barang keluar', 1, 1, 1],
              ['Piutang (setelah barang keluar) & hutang supplier', 1, 0, 1],
              ['Laporan', 1, 0, 1],
              ['Izin kirim sebelum lunas', 1, 0, 0],
              ['Pengguna, pengaturan, aktivitas sistem', 1, 0, 0],
            ].map(([f, ...v]) => (
              <tr key={f}>
                <td>{f}</td>
                {v.map((x, i) => (
                  <td key={i} className="center">
                    {x ? 'Ya' : <span className="muted">-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {edit && <UserDialog record={edit.id ? edit : null} preset={edit} selfId={user.id} onClose={() => setEdit(null)} />}
    </>
  );
}

function UserDialog({ record, preset, selfId, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ name: preset.name || '', email: preset.email || '', role: preset.role || 'gudang', active: preset.active ?? true, password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) return setErr('Nama wajib diisi.');
    if (!record && !f.email.trim()) return setErr('Email wajib diisi.');
    if (!record && f.password.length < 8) return setErr('Password minimal 8 karakter.');
    if (record && f.password && f.password.length < 8) return setErr('Password minimal 8 karakter.');
    if (record?.id === selfId && (!f.active || f.role !== 'owner')) return setErr('Anda tidak bisa menonaktifkan / menurunkan role akun sendiri.');
    const body = { name: f.name.trim(), role: f.role, active: f.active, ...(f.password ? { password: f.password, passwordConfirm: f.password } : {}) };
    setBusy(true);
    try {
      if (record) await pb.collection('users').update(record.id, body);
      else await pb.collection('users').create({ ...body, email: f.email.trim(), emailVisibility: true });
      toast.ok(`Akun ${body.name} tersimpan`);
      onClose();
    } catch (ex) {
      setErr(ex?.response?.data?.email ? 'Email sudah dipakai akun lain.' : ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title={record ? `Ubah ${record.name}` : 'Tambah Akun'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-body">
          <Field label="Nama" required>
            <Input value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
          </Field>
          <Field label="Email (untuk login)" required={!record}>
            <Input type="email" value={f.email} disabled={!!record} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={f.role} onChange={(e) => set({ role: e.target.value })} options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Field>
          <Field label={record ? 'Password baru (kosongkan bila tidak diganti)' : 'Password'} required={!record} hint="Minimal 8 karakter">
            <Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => set({ password: e.target.value })} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> Akun aktif (bisa login)
          </label>
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" icon={KeyRound} busy={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
export function Pengaturan() {
  const { settings, reloadSettings } = useSession();
  const toast = useToast();
  if (!settings) return <Empty title="Pengaturan belum tersedia" />;
  return <SettingsForm key={settings.id} settings={settings} toast={toast} reload={reloadSettings} />;
}

function SettingsForm({ settings, toast, reload }) {
  const [f, setF] = useState(() => ({
    company_name: settings.company_name || '',
    tagline: settings.tagline || '',
    address: settings.address || '',
    city: settings.city || '',
    phone: settings.phone || '',
    fax: settings.fax || '',
    email: settings.email || '',
    npwp: settings.npwp || '',
    signer_name: settings.signer_name || '',
    doc_code: settings.doc_code || 'PPU',
    ppn_rate: settings.ppn_rate ?? 11,
    min_dp_percent: settings.min_dp_percent ?? 25,
    bank_accounts: settings.bank_accounts || [],
  }));
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setBank = (i, patch) => set({ bank_accounts: f.bank_accounts.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await pb.collection('settings').update(settings.id, {
        ...f,
        doc_code: f.doc_code.trim().toUpperCase(),
        ppn_rate: Number(f.ppn_rate) || 0,
        min_dp_percent: Number(f.min_dp_percent) || 0,
        bank_accounts: f.bank_accounts.filter((b) => b.bank || b.number),
      });
      toast.ok('Pengaturan tersimpan');
      reload();
    } catch (ex) {
      toast.error(ex);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <PageHeader
        crumbs={[{ label: 'Pengaturan' }, { label: 'Perusahaan' }]}
        title="Pengaturan Perusahaan"
        sub="Dipakai di kop semua dokumen cetak"
        actions={
          <Button type="submit" variant="primary" icon={Save} busy={busy}>
            Simpan
          </Button>
        }
      />
      <Panel title="Kop dokumen">
        <div className="form-grid">
          <Field label="Nama perusahaan">
            <Input value={f.company_name} onChange={(e) => set({ company_name: e.target.value })} />
          </Field>
          <Field label="Keterangan usaha">
            <Input value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </Field>
          <Field label="Alamat" className="span-all">
            <Input value={f.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label="Kota (tempat tanda tangan)">
            <Input value={f.city} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          <Field label="Telepon / WA">
            <Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Fax">
            <Input value={f.fax} onChange={(e) => set({ fax: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={f.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="NPWP">
            <Input value={f.npwp} onChange={(e) => set({ npwp: e.target.value })} />
          </Field>
          <Field label="Nama penandatangan (Mengetahui)">
            <Input value={f.signer_name} onChange={(e) => set({ signer_name: e.target.value })} />
          </Field>
        </div>
      </Panel>
      <Panel
        title="Rekening bank (tercetak di nota/invoice & pesan tagihan WA)"
        actions={
          <Button size="sm" icon={Plus} onClick={() => set({ bank_accounts: [...f.bank_accounts, { bank: '', number: '', name: '' }] })}>
            Tambah rekening
          </Button>
        }
      >
        {f.bank_accounts.length === 0 && <p className="muted small">Belum ada rekening.</p>}
        {f.bank_accounts.map((b, i) => (
          <div key={i} className="form-grid cols-3 mb-3">
            <Field label="Bank">
              <Input value={b.bank} onChange={(e) => setBank(i, { bank: e.target.value })} placeholder="BCA" />
            </Field>
            <Field label="No. rekening">
              <Input value={b.number} onChange={(e) => setBank(i, { number: e.target.value })} />
            </Field>
            <Field label="Atas nama">
              <div className="row">
                <Input className="grow" value={b.name} onChange={(e) => setBank(i, { name: e.target.value })} />
                <Button variant="ghost" icon={Trash2} aria-label="Hapus rekening" onClick={() => set({ bank_accounts: f.bank_accounts.filter((_, j) => j !== i) })} />
              </div>
            </Field>
          </div>
        ))}
      </Panel>
      <Panel title="Aturan">
        <div className="form-grid cols-3">
          <Field label="Kode di nomor dokumen" hint="mis. PPU → 0063/DO/PPU/X/2026">
            <Input value={f.doc_code} onChange={(e) => set({ doc_code: e.target.value })} maxLength={6} />
          </Field>
          <Field label="PPN (%)">
            <Input type="number" min="0" max="100" value={f.ppn_rate} onChange={(e) => set({ ppn_rate: e.target.value })} />
          </Field>
          <Field label="Minimal DP (%)">
            <Input type="number" min="0" max="100" value={f.min_dp_percent} onChange={(e) => set({ min_dp_percent: e.target.value })} />
          </Field>
        </div>
      </Panel>
    </form>
  );
}
