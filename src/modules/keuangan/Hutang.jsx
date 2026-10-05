// Hutang ke supplier: invoice supplier (foto invoice & faktur), jatuh tempo, cicilan pembayaran.
import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { pb } from '../../lib/pb';
import { fileUrl, useRecord, useRecords, q } from '../../lib/data';
import { href, navigate, replaceQuery, useRoute } from '../../lib/router';
import { date, daysFromToday, dueDateFromTerms, num, rp, today } from '../../lib/format';
import { dueTone, payableStatus } from '../../lib/status';
import { Badge, Button, DescList, Empty, ErrorBox, Field, FilePick, Input, Kpi, Loading, MoneyInput, PageHeader, Panel, Select, Textarea } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import Activity from '../../ui/Activity';
import PaymentDialog from '../../ui/PaymentDialog';
import { Dialog, useToast } from '../../ui/feedback';

export function HutangList() {
  const { query } = useRoute();
  const search = query.q || '';
  const f = query.f || '';
  const [adding, setAdding] = useState(false);
  const { items, loading, error, reload } = useRecords('supplier_invoices', { filter: 'deleted = false', sort: 'due_date' });
  const open = items.filter((i) => i.total_amount - i.paid_amount > 0);
  const rows = items.filter(
    (i) =>
      matchText(i, search, ['invoice_no', 'supplier', 'po_no', 'tax_invoice_no']) &&
      (f === 'semua' || (f === 'lewat' ? i.total_amount - i.paid_amount > 0 && (daysFromToday(i.due_date) ?? 1) < 0 : f === 'lunas' ? i.total_amount - i.paid_amount <= 0 : i.total_amount - i.paid_amount > 0))
  );
  const remaining = open.reduce((s, i) => s + i.total_amount - i.paid_amount, 0);
  const overdue = open.filter((i) => (daysFromToday(i.due_date) ?? 1) < 0).reduce((s, i) => s + i.total_amount - i.paid_amount, 0);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Keuangan' }]}
        title="Hutang Supplier"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
            Catat Invoice Supplier
          </Button>
        }
      />
      <div className="kpis">
        <Kpi label="Sisa hutang" value={rp(remaining)} />
        <Kpi label="Lewat jatuh tempo" value={rp(overdue)} tone={overdue > 0 ? 'bad' : undefined} to={['hutang']} query={{ f: 'lewat' }} />
        <Kpi label="Invoice belum lunas" value={num(open.length)} />
      </div>
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari no. invoice, supplier, PO..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari invoice" />
        <Select className="w-sm" value={f} onChange={(e) => replaceQuery({ ...query, f: e.target.value })} aria-label="Filter">
          <option value="">Belum lunas</option>
          <option value="lewat">Lewat jatuh tempo</option>
          <option value="lunas">Lunas</option>
          <option value="semua">Semua</option>
        </Select>
      </div>
      <DataTable
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(i) => navigate(['hutang', i.id])}
        empty={<Empty title="Belum ada invoice supplier" action={<Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Catat invoice</Button>} />}
        columns={[
          { key: 'supplier', label: 'Supplier', render: (i) => <b>{i.supplier}</b> },
          { key: 'invoice_no', label: 'No. Invoice', render: (i) => <span className="mono">{i.invoice_no}</span> },
          { key: 'po_no', label: 'No. PO', render: (i) => <span className="mono">{i.po_no}</span> },
          { key: 'date', label: 'Tanggal', render: (i) => date(i.date) },
          {
            key: 'due_date',
            label: 'Jatuh Tempo',
            render: (i) => {
              const t = dueTone(i.due_date, i.total_amount - i.paid_amount);
              return i.due_date ? (
                <span className="row">
                  {date(i.due_date)} {i.total_amount - i.paid_amount > 0 && <Badge tone={t.tone}>{t.label}</Badge>}
                </span>
              ) : (
                ''
              );
            },
          },
          { key: 'total_amount', label: 'Total', align: 'right', render: (i) => num(i.total_amount), total: true },
          { key: 'paid_amount', label: 'Dibayar', align: 'right', render: (i) => num(i.paid_amount), total: true },
          { key: 'sisa', label: 'Sisa', align: 'right', value: (i) => i.total_amount - i.paid_amount, render: (i) => <b>{num(i.total_amount - i.paid_amount)}</b>, total: true },
          {
            key: 'status',
            label: 'Status',
            value: (i) => payableStatus(i).label,
            render: (i) => {
              const s = payableStatus(i);
              return <Badge tone={s.tone}>{s.label}</Badge>;
            },
          },
        ]}
      />
      {adding && <InvoiceDialog onClose={() => setAdding(false)} />}
    </>
  );
}

export function InvoiceDialog({ onClose, presetPo, stay = false }) {
  const toast = useToast();
  const pos = useRecords('purchase_orders', { filter: 'deleted = false && state != "batal"', sort: '-date' });
  const suppliers = useRecords('suppliers', { filter: 'deleted = false', sort: 'name' });
  const [f, setF] = useState({
    invoice_no: '',
    supplier: presetPo?.supplier || '',
    po_id: presetPo?.id || '',
    date: today(),
    due_date: dueDateFromTerms('Tempo 30 Hari'),
    total_amount: presetPo?.total_amount || '',
    tax_invoice_no: '',
    notes: '',
    received_date: today(),
  });
  // surat jalan PO yang ditagih invoice ini (default: semua yang belum ditagih invoice lain)
  const receipts = presetPo?.receipts || [];
  const [sjNos, setSjNos] = useState(null);
  const [totalTouched, setTotalTouched] = useState(false);
  // invoice lain di PO yang sama: cegah tagihan dobel
  const prior = useRecords('supplier_invoices', { filter: `po_id = ${q(f.po_id)} && deleted = false`, enabled: !!f.po_id });
  const billedBy = useMemo(() => {
    const m = new Map();
    for (const inv of prior.items) for (const sj of inv.sj_nos || []) m.set(String(sj).toLowerCase(), inv.invoice_no);
    return m;
  }, [prior.items]);
  const billed = prior.items.reduce((sum, inv) => sum + inv.total_amount, 0);
  const selectedPo = presetPo || pos.items.find((x) => x.id === f.po_id);
  const unbilled = selectedPo ? Math.max(0, selectedPo.total_amount - billed) : 0;
  const chosenSj = sjNos ?? receipts.map((r) => r.sjNo).filter((sj) => !billedBy.has(String(sj).toLowerCase()));
  useEffect(() => {
    // total awal = nilai PO yang belum ditagih (bukan seluruh nilai PO)
    if (!totalTouched && selectedPo && !prior.loading) set({ total_amount: unbilled || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prior.loading, billed, f.po_id]);
  const [file, setFile] = useState(null);
  const [taxFile, setTaxFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const poOptions = useMemo(() => {
    const list = pos.items.filter((p) => !f.supplier || p.supplier.toLowerCase() === f.supplier.toLowerCase());
    return presetPo && !list.some((p) => p.id === presetPo.id) ? [presetPo, ...list] : list;
  }, [pos.items, f.supplier, presetPo]);

  const onSupplier = (name) => {
    const s = suppliers.items.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    set({ supplier: s ? s.name : name, due_date: s?.terms ? dueDateFromTerms(s.terms, f.date) : f.due_date });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.invoice_no.trim() || !f.supplier.trim()) return setErr('No. invoice dan supplier wajib diisi.');
    if (!(Number(f.total_amount) > 0)) return setErr('Total tagihan wajib diisi.');
    const po = pos.items.find((p) => p.id === f.po_id);
    const fd = new FormData();
    Object.entries({ ...f, po_no: po?.po_no || presetPo?.po_no || '', total_amount: Number(f.total_amount) }).forEach(([k, v]) => fd.append(k, String(v ?? '')));
    fd.append('sj_nos', JSON.stringify(chosenSj));
    if (file) fd.append('file', file);
    if (taxFile) fd.append('tax_file', taxFile);
    setBusy(true);
    try {
      const rec = await pb.collection('supplier_invoices').create(fd);
      toast.ok(`Invoice ${rec.invoice_no} tercatat di map ${rec.po_no || 'PO'}`);
      onClose();
      if (!stay) navigate(['hutang', rec.id]);
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={presetPo ? `Invoice / Faktur untuk ${presetPo.po_no}` : 'Catat Invoice Supplier'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="dialog-body">
          {prior.items.length > 0 && selectedPo && (
            <div className={`alert ${unbilled > 0 ? 'warn' : 'error'}`}>
              {selectedPo.po_no} (nilai {rp(selectedPo.total_amount)}) sudah punya invoice:{' '}
              {prior.items.map((inv) => `${inv.invoice_no} ${rp(inv.total_amount)}`).join(', ')}.{' '}
              {unbilled > 0
                ? `Yang belum ditagih ± ${rp(unbilled)}.`
                : 'Nilai PO sudah ditagih semua.'}{' '}
              Kalau kertas yang datang adalah invoice yang sama, jangan dicatat lagi: lengkapi foto/faktur di invoice yang sudah ada.
            </div>
          )}
          <div className="form-grid cols-3">
            <Field label="Supplier" required className="span-2">
              <Input list="sup-inv-list" value={f.supplier} onChange={(e) => onSupplier(e.target.value)} readOnly={!!presetPo} autoFocus={!presetPo} />
            </Field>
            <datalist id="sup-inv-list">
              {suppliers.items.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
            <Field label="No. invoice" required>
              <Input value={f.invoice_no} onChange={(e) => set({ invoice_no: e.target.value })} autoFocus={!!presetPo} />
            </Field>
            <Field label="Untuk PO" className="span-2">
              <Select
                disabled={!!presetPo}
                value={f.po_id}
                onChange={(e) => {
                  const po = pos.items.find((p) => p.id === e.target.value);
                  set({ po_id: e.target.value, total_amount: po ? po.total_amount : f.total_amount, supplier: po ? po.supplier : f.supplier });
                }}
              >
                <option value="">(tanpa PO)</option>
                {poOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.po_no} · {p.supplier} · {num(p.total_amount)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Total tagihan" required>
              <MoneyInput
                value={f.total_amount}
                onChange={(v) => {
                  setTotalTouched(true);
                  set({ total_amount: v });
                }}
              />
            </Field>
            {receipts.length > 0 && (
              <Field label="Untuk surat jalan" className="span-all" hint="1 PO bisa beberapa surat jalan; centang yang ditagih invoice ini">
                <div className="row">
                  {receipts.map((r) => {
                    const by = billedBy.get(String(r.sjNo).toLowerCase());
                    return (
                      <label key={r.sjNo} className={`check ${by ? 'muted' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={!!by}
                          checked={!by && chosenSj.includes(r.sjNo)}
                          onChange={(e) => setSjNos(e.target.checked ? [...chosenSj, r.sjNo] : chosenSj.filter((x) => x !== r.sjNo))}
                        />
                        {r.sjNo} ({date(r.date)}){by ? ` · sudah ditagih ${by}` : ''}
                      </label>
                    );
                  })}
                </div>
              </Field>
            )}
            <Field label="Dokumen diterima tanggal">
              <Input type="date" value={f.received_date} onChange={(e) => set({ received_date: e.target.value })} />
            </Field>
            <Field label="Tanggal invoice">
              <Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Jatuh tempo">
              <Input type="date" value={f.due_date} onChange={(e) => set({ due_date: e.target.value })} />
            </Field>
            <Field label="No. faktur pajak">
              <Input value={f.tax_invoice_no} onChange={(e) => set({ tax_invoice_no: e.target.value })} />
            </Field>
            <Field label="Foto / PDF invoice" className="span-all">
              <FilePick value={file} onChange={setFile} onError={setErr} />
            </Field>
            <Field label="Foto / PDF faktur pajak" className="span-all">
              <FilePick value={taxFile} onChange={setTaxFile} onError={setErr} />
            </Field>
            <Field label="Catatan" className="span-all">
              <Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
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

export function HutangDoc({ id }) {
  const { item: inv, loading, error, reload } = useRecord('supplier_invoices', id);
  const pays = useRecords('payments', { filter: `invoice_id = ${q(id)}`, sort: 'created' });
  const [paying, setPaying] = useState(false);
  const toast = useToast();
  const [uploading, setUploading] = useState(null);
  if (loading && !inv) return <Loading />;
  if (error || !inv) return <ErrorBox error={error} onRetry={reload} />;
  const rem = inv.total_amount - inv.paid_amount;
  const st = payableStatus(inv);

  const upload = async (field, file) => {
    if (!file) return;
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append(field, file);
      await pb.collection('supplier_invoices').update(inv.id, fd);
      toast.ok('File tersimpan');
    } catch (ex) {
      toast.error(ex);
    } finally {
      setUploading(null);
    }
  };

  return (
    <>
      <PageHeader crumbs={[{ label: 'Hutang Supplier', to: ['hutang'] }, { label: inv.invoice_no }]} title={`Invoice ${inv.invoice_no}`} sub={inv.supplier} />
      <div className="doc-bar">
        <div className="actions">
          {rem > 0 && (
            <Button variant="primary" icon={CreditCard} onClick={() => setPaying(true)}>
              Catat Pembayaran
            </Button>
          )}
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <div className="doc-layout">
        <div className="stack">
          <div className="sheet">
            <div className="two-col">
              <DescList
                items={[
                  ['Supplier', <b key="s">{inv.supplier}</b>],
                  ['No. invoice', inv.invoice_no],
                  ['PO', inv.po_id ? <a key="p" href={href(['pembelian', inv.po_id])}>{inv.po_no}</a> : '-'],
                  ['Faktur pajak', inv.tax_invoice_no],
                ]}
              />
              <DescList
                items={[
                  ['Tanggal', date(inv.date)],
                  ['Jatuh tempo', inv.due_date ? date(inv.due_date) : '-'],
                  ['Dicatat oleh', inv.created_by],
                  ['Catatan', inv.notes],
                ]}
              />
            </div>
            <div className="totals">
              <span className="grand">Total</span>
              <span className="grand right">{rp(inv.total_amount)}</span>
              <span>Dibayar</span>
              <span className="right">{num(inv.paid_amount)}</span>
              <span className="strong">Sisa</span>
              <span className={`right strong ${rem > 0 ? 'text-bad' : 'text-ok'}`}>{rp(rem)}</span>
            </div>
          </div>
          <Panel title="Berkas">
            <div className="form-grid">
              <Field label="Invoice">
                {inv.file ? (
                  <a href={fileUrl(inv, inv.file)} target="_blank" rel="noreferrer">
                    Lihat invoice
                  </a>
                ) : (
                  <FilePick value={null} onChange={(file) => upload('file', file)} label={uploading === 'file' ? 'Mengunggah...' : 'Upload'} onError={toast.error} />
                )}
              </Field>
              <Field label="Faktur pajak">
                {inv.tax_file ? (
                  <a href={fileUrl(inv, inv.tax_file)} target="_blank" rel="noreferrer">
                    Lihat faktur
                  </a>
                ) : (
                  <FilePick value={null} onChange={(file) => upload('tax_file', file)} label={uploading === 'tax_file' ? 'Mengunggah...' : 'Upload'} onError={toast.error} />
                )}
              </Field>
            </div>
          </Panel>
          <Panel title="Pembayaran" bodyClass="">
            <DataTable
              autoHeight
              rows={pays.items}
              loading={pays.loading}
              empty={<Empty title="Belum ada pembayaran" />}
              columns={[
                { key: 'date', label: 'Tanggal', render: (p) => date(p.date) },
                { key: 'method', label: 'Metode' },
                { key: 'note', label: 'Keterangan' },
                { key: 'recorded_by', label: 'Dicatat oleh' },
                { key: 'amount', label: 'Jumlah', align: 'right', render: (p) => num(p.amount), total: true },
                { key: 'proof', label: 'Bukti', render: (p) => (p.proof ? <a href={fileUrl(p, p.proof)} target="_blank" rel="noreferrer">Lihat</a> : '') },
              ]}
            />
          </Panel>
        </div>
        <Panel title="Riwayat" bodyClass="">
          <Activity recordIds={inv.id} />
        </Panel>
      </div>
      {paying && <PaymentDialog kind="supplier" target={inv} remaining={rem} title={`Bayar ${inv.supplier}`} onClose={() => setPaying(false)} />}
    </>
  );
}
