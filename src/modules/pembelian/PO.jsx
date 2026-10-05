// PO ke supplier: meniru "PO 37.xlsx" (No · Tipe · Ukuran · Warna · Harga · Qty · Jumlah),
// penerimaan barang bertahap (1 PO bisa beberapa surat jalan), foto SJ supplier.
import React, { useMemo, useState } from 'react';
import { Ban, CircleSlash, FileText, FolderOpen, Mail, MessageCircle, PackageCheck, Pencil, Plus, Printer, Save, Send } from 'lucide-react';
import { pb } from '../../lib/pb';
import { action, fileUrl, useRecord, useRecords } from '../../lib/data';
import { href, navigate, replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, num, rp, today, waLink } from '../../lib/format';
import { PO_STATUS, PO_STEPS } from '../../lib/status';
import { Button, DescList, Empty, ErrorBox, Field, FilePick, Input, LinkButton, Loading, PageHeader, Panel, Select, StatusBadge, Steps, Tabs, Textarea } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import DateRange from '../../ui/DateRange';
import LineItems, { lineTotal, validateLines } from '../../ui/LineItems';
import Activity from '../../ui/Activity';
import { ReasonDialog } from '../../ui/PaymentDialog';
import { Dialog, useConfirm, useToast } from '../../ui/feedback';
import { InvoiceDialog } from '../keuangan/Hutang';
import { PayableSummary, PoChecklist, PoTimeline, SupplierContact, usePoFolder } from './POFolder';

const progress = (po) => {
  const items = po.items || [];
  const ordered = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const got = items.reduce((s, it) => s + (Number(it.receivedQty) || 0), 0);
  return { ordered, got };
};

const poState = (po) => po.state || (po.status?.includes('Selesai') ? 'selesai' : 'dikirim');

export function POList() {
  const { query } = useRoute();
  const { can } = useSession();
  const tab = query.tab || 'semua';
  const search = query.q || '';
  const from = query.from || '';
  const to = query.to || '';
  const { items, loading, error, reload } = useRecords('purchase_orders', { filter: 'deleted = false', sort: '-date,-created' });
  const base = items.filter((po) => (!from || po.date >= from) && (!to || po.date <= to) && matchText(po, search, ['po_no', 'supplier', 'notes', (po) => (po.items || []).map((i) => `${i.productCode} ${i.name}`).join(' ')]));
  const tests = {
    semua: () => true,
    draft: (po) => poState(po) === 'draft',
    proses: (po) => ['dikirim', 'sebagian'].includes(poState(po)),
    selesai: (po) => poState(po) === 'selesai',
    batal: (po) => poState(po) === 'batal',
  };
  const rows = base.filter(tests[tab] || tests.semua);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Pembelian' }]}
        title="Purchase Order"
        actions={
          can('owner', 'gudang') && (
            <LinkButton to={['pembelian', 'baru']} variant="primary" icon={Plus}>
              PO Baru
            </LinkButton>
          )
        }
      />
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari no. PO, supplier, barang..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari PO" />
        <DateRange query={query} />
      </div>
      <Tabs
        tabs={[
          { key: 'semua', label: 'Semua', count: base.length },
          { key: 'draft', label: 'Draft', count: base.filter(tests.draft).length },
          { key: 'proses', label: 'Menunggu Barang', count: base.filter(tests.proses).length },
          { key: 'selesai', label: 'Selesai', count: base.filter(tests.selesai).length },
          { key: 'batal', label: 'Dibatalkan', count: base.filter(tests.batal).length },
        ]}
        value={tab}
        onChange={(k) => replaceQuery({ ...query, tab: k })}
      />
      <DataTable
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(po) => navigate(['pembelian', po.id])}
        empty={<Empty title={search || tab !== 'semua' ? 'Tidak ada PO yang cocok' : 'Belum ada PO'} />}
        columns={[
          { key: 'po_no', label: 'No. PO', render: (po) => <span className="mono">{po.po_no}</span> },
          { key: 'date', label: 'Tanggal', render: (po) => date(po.date) },
          { key: 'supplier', label: 'Supplier' },
          { key: 'total_amount', label: 'Total', align: 'right', render: (po) => num(po.total_amount), total: true },
          {
            key: 'progress',
            label: 'Diterima',
            align: 'right',
            value: (po) => {
              const p = progress(po);
              return p.ordered ? p.got / p.ordered : 0;
            },
            render: (po) => {
              const p = progress(po);
              return `${num(p.got)} / ${num(p.ordered)}`;
            },
          },
          { key: 'receipts', label: 'Surat Jalan', align: 'right', value: (po) => (po.receipts || []).length },
          { key: 'state', label: 'Status', value: poState, render: (po) => <StatusBadge map={PO_STATUS} value={poState(po)} /> },
        ]}
      />
    </>
  );
}

export function POForm({ id }) {
  const { item: existing, loading, error } = useRecord('purchase_orders', id || null);
  if (id && loading) return <Loading />;
  if (id && error) return <ErrorBox error={error} />;
  if (existing && !['draft', 'dikirim'].includes(poState(existing))) return <Empty title="PO ini tidak bisa diubah">Barang PO hanya bisa diubah sebelum ada penerimaan.</Empty>;
  return <POFormInner existing={existing} />;
}

function POFormInner({ existing }) {
  const { products } = useSession();
  const suppliers = useRecords('suppliers', { filter: 'deleted = false', sort: 'name' });
  const toast = useToast();
  const [f, setF] = useState(() => ({
    date: existing?.date || today(),
    supplier: existing?.supplier || '',
    up_person: existing?.up_person || '',
    supplier_phone: existing?.supplier_phone || '',
    supplier_email: existing?.supplier_email || '',
    expected_date: existing?.expected_date || '',
    notes: existing?.notes || '',
    items: existing?.items || [],
    for_orders: existing?.for_orders || [],
  }));
  // pesanan customer yang masih menunggu barang (untuk barang yang langsung dikirim dari supplier ke customer)
  const openOrders = useRecords('sales_orders', { filter: 'channel = "pesanan" && (status = "baru" || status = "dp" || status = "lunas")', sort: '-created' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const byName = useMemo(() => new Map(suppliers.items.map((s) => [s.name.toLowerCase(), s])), [suppliers.items]);

  const onSupplier = (name) => {
    const s = byName.get(name.trim().toLowerCase());
    if (s) set({ supplier: s.name, up_person: s.sales_person || f.up_person, supplier_phone: s.whatsapp || s.phone || '', supplier_email: s.email || '' });
    else set({ supplier: name });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.supplier.trim()) return setErr('Supplier wajib diisi. 1 PO = 1 supplier.');
    const lineErr = validateLines(f.items);
    if (lineErr) return setErr(lineErr);
    const body = { ...f, for_orders: f.for_orders.map((o) => ({ id: o.id })), items: f.items.map((it) => ({ ...it, qty: Number(it.qty), price: Number(it.price) })) };
    setBusy(true);
    try {
      const rec = existing ? await pb.collection('purchase_orders').update(existing.id, body) : await pb.collection('purchase_orders').create(body);
      toast.ok(`${rec.po_no} tersimpan`);
      navigate(['pembelian', rec.id]);
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <PageHeader
        crumbs={[{ label: 'Pembelian', to: ['pembelian'] }, existing ? { label: existing.po_no, to: ['pembelian', existing.id] } : null, { label: existing ? 'Ubah' : 'PO Baru' }].filter(Boolean)}
        title={existing ? `Ubah ${existing.po_no}` : 'Purchase Order Baru'}
        actions={
          <>
            <Button onClick={() => window.history.back()}>Batal</Button>
            <Button type="submit" variant="primary" icon={Save} busy={busy}>
              Simpan PO
            </Button>
          </>
        }
      />
      {err && <div className="alert error">{err}</div>}
      <Panel title="Supplier">
        <div className="form-grid cols-3">
          <Field label="Supplier" required className="span-2">
            <Input list="supplier-list" value={f.supplier} onChange={(e) => onSupplier(e.target.value)} autoFocus={!existing} placeholder="Ketik nama supplier" />
          </Field>
          <datalist id="supplier-list">
            {suppliers.items.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
          <Field label="Tanggal">
            <Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Up (sales supplier)">
            <Input value={f.up_person} onChange={(e) => set({ up_person: e.target.value })} />
          </Field>
          <Field label="WA supplier">
            <Input value={f.supplier_phone} onChange={(e) => set({ supplier_phone: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="Email supplier">
            <Input type="email" value={f.supplier_email} onChange={(e) => set({ supplier_email: e.target.value })} />
          </Field>
        </div>
      </Panel>
      <Panel title="Barang">
        <LineItems items={f.items} onChange={(items) => set({ items })} products={products} priceField="buy_price" showSize />
        <div className="totals">
          <span className="grand">Total</span>
          <span className="grand right">{rp(lineTotal(f.items))}</span>
        </div>
      </Panel>
      <Panel title="Untuk pesanan customer (opsional)">
        <p className="small muted mb-2">Isi bila barang PO ini langsung dikirim ke customer tanpa disimpan di gudang. Setelah barang diterima, keluarkan dari halaman pesanannya.</p>
        <div className="chips">
          {f.for_orders.map((o) => (
            <span key={o.id} className="chip">
              {o.order_no} · {o.customer}
              <button type="button" aria-label={`Hapus ${o.order_no}`} onClick={() => set({ for_orders: f.for_orders.filter((x) => x.id !== o.id) })}>
                ×
              </button>
            </span>
          ))}
          <Select
            className="w-md"
            value=""
            onChange={(e) => {
              const o = openOrders.items.find((x) => x.id === e.target.value);
              if (o) set({ for_orders: [...f.for_orders, { id: o.id, order_no: o.order_no, customer: o.customer }] });
            }}
            aria-label="Tambah pesanan customer"
          >
            <option value="">+ Pilih pesanan customer...</option>
            {openOrders.items
              .filter((o) => !f.for_orders.some((x) => x.id === o.id))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_no} · {o.customer}
                </option>
              ))}
          </Select>
        </div>
      </Panel>
      <Panel title="Lainnya">
        <div className="form-grid">
          <Field label="Perkiraan barang siap">
            <Input type="date" value={f.expected_date} onChange={(e) => set({ expected_date: e.target.value })} />
          </Field>
          <Field label="Catatan" className="span-all">
            <Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="mis. diambil supir Paletindo" />
          </Field>
        </div>
      </Panel>
    </form>
  );
}

export function PODoc({ id }) {
  const { item: po, loading, error, reload } = useRecord('purchase_orders', id);
  const folder = usePoFolder(po);
  const { settings, can } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [dlg, setDlg] = useState(null);
  if (loading && !po) return <Loading />;
  if (error || !po) return <ErrorBox error={error} onRetry={reload} />;
  if (!folder) return <Loading />;

  const st = poState(po);
  const editable = can('owner', 'gudang');
  const company = settings?.company_name || 'PT Paletindo Prakarsa Unggul';
  const message = [
    `PURCHASE ORDER ${po.supplier}`,
    po.up_person ? `Up: ${po.up_person}` : null,
    `No: ${po.po_no} · Tanggal ${date(po.date)}`,
    '',
    ...(po.items || []).map((it, i) => `${i + 1}. ${it.name}${it.size ? ` ${it.size}` : ''}${it.color ? ` ${it.color}` : ''} : ${num(it.qty)} x ${num(it.price)} = ${num(it.total)}`),
    '',
    `Total: ${rp(po.total_amount)}`,
    po.notes ? `Catatan: ${po.notes}` : null,
    '',
    company,
  ]
    .filter((x) => x !== null)
    .join('\n');

  const markSent = async () => {
    if (st !== 'draft') return;
    try {
      await action('po/state', { po_id: po.id, state: 'dikirim' });
      toast.ok(`${po.po_no} ditandai sudah dikirim ke supplier`);
    } catch (ex) {
      toast.error(ex);
    }
  };

  const sendWa = async () => {
    const ok = await confirm({
      title: 'Kirim PO via WhatsApp',
      message: (
        <>
          <p className="small muted">Pesan berikut akan dibuka di WhatsApp{po.supplier_phone ? ` ke ${po.supplier_phone}` : ''}. Lampirkan PDF hasil "Cetak PO" bila supplier minta.</p>
          <pre className="alert info">{message}</pre>
        </>
      ),
      confirmLabel: 'Buka WhatsApp',
    });
    if (!ok) return;
    window.open(waLink(po.supplier_phone, message), '_blank');
    markSent();
  };

  const sendEmail = async () => {
    const ok = await confirm({
      title: 'Kirim PO via Email',
      message: (
        <>
          <p className="small muted">Aplikasi email akan terbuka{po.supplier_email ? ` ke ${po.supplier_email}` : ''}. Lampirkan PDF hasil "Cetak PO".</p>
          <pre className="alert info">{message}</pre>
        </>
      ),
      confirmLabel: 'Buka Email',
    });
    if (!ok) return;
    window.location.href = `mailto:${po.supplier_email || ''}?subject=${encodeURIComponent(`Purchase Order ${po.po_no}`)}&body=${encodeURIComponent(message)}`;
    markSent();
  };

  return (
    <>
      <PageHeader crumbs={[{ label: 'Pembelian', to: ['pembelian'] }, { label: po.po_no }]} title={po.po_no} sub={po.supplier} />
      <div className="doc-bar">
        <div className="actions">
          {editable && ['dikirim', 'sebagian', 'draft'].includes(st) && (
            <Button variant="primary" icon={PackageCheck} onClick={() => setDlg('receive')}>
              Terima Barang
            </Button>
          )}
          {st !== 'draft' && st !== 'batal' && (
            <Button variant={st === 'selesai' && folder.invoices.length === 0 ? 'primary' : undefined} icon={FileText} onClick={() => setDlg('invoice')}>
              Catat Invoice / Faktur Datang
            </Button>
          )}
          <Button icon={Printer} onClick={() => window.open(href(['cetak', 'po', po.id]), '_blank')}>
            Cetak PO
          </Button>
          <Button icon={FolderOpen} onClick={() => window.open(href(['cetak', 'map-po', po.id]), '_blank')}>
            Cetak Lembar Map
          </Button>
          {editable && st !== 'batal' && (
            <>
              <Button icon={MessageCircle} onClick={sendWa}>
                Kirim WA
              </Button>
              <Button icon={Mail} onClick={sendEmail}>
                Kirim Email
              </Button>
            </>
          )}
          {editable && st === 'draft' && (
            <Button icon={Send} onClick={markSent}>
              Tandai Sudah Dikirim
            </Button>
          )}
          {editable && ['draft', 'dikirim'].includes(st) && (
            <LinkButton to={['pembelian', po.id, 'ubah']} icon={Pencil}>
              Ubah
            </LinkButton>
          )}
          {editable && st === 'sebagian' && (
            <Button icon={CircleSlash} onClick={() => setDlg('close')}>
              Tutup PO (sisa tidak datang)
            </Button>
          )}
          {editable && ['draft', 'dikirim'].includes(st) && (
            <Button variant="danger" icon={Ban} onClick={() => setDlg('cancel')}>
              Batalkan
            </Button>
          )}
        </div>
        <Steps steps={PO_STEPS} current={st} exception={st === 'batal' ? 'Dibatalkan' : null} />
      </div>
      {st !== 'batal' && <PoChecklist po={po} folder={folder} />}
      <div className="doc-layout">
        <div className="stack">
          <div className="sheet">
            <div className="doc-no">{po.po_no}</div>
            <div className="two-col">
              <DescList items={[['Supplier', <b key="s">{po.supplier}</b>], ['Up', po.up_person], ['WA', po.supplier_phone], ['Email', po.supplier_email]]} />
              <DescList items={[['Tanggal', date(po.date)], ['Perkiraan siap', po.expected_date ? date(po.expected_date) : null], ['Dibuat oleh', po.created_by]]} />
            </div>
            <div className="table-wrap auto-h mt-4">
              <table className="dt">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tipe</th>
                    <th>Ukuran</th>
                    <th>Warna</th>
                    <th className="right">Harga</th>
                    <th className="right">Qty</th>
                    <th className="right">Jumlah</th>
                    <th className="right">Diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.items || []).map((it, i) => {
                    const got = Number(it.receivedQty) || 0;
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <span className="mono muted">{it.productCode}</span> {it.name}
                        </td>
                        <td>{it.size}</td>
                        <td>{it.color}</td>
                        <td className="right">{num(it.price)}</td>
                        <td className="right">{num(it.qty)}</td>
                        <td className="right">{num(it.total)}</td>
                        <td className={`right ${got >= it.qty ? 'text-ok' : got > 0 ? 'text-warn' : 'muted'}`}>{num(got)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6}>Total</td>
                    <td className="right">{num(po.total_amount)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {po.notes && <p className="mt-3 small muted">Catatan: {po.notes}</p>}
          </div>

          <Panel title="Isi map PO (urut tanggal)" bodyClass="">
            <PoTimeline po={po} folder={folder} />
          </Panel>

          <Panel title={`Surat jalan & barang diterima (${(po.receipts || []).length} surat jalan)`} bodyClass="">
            {(po.receipts || []).length === 0 ? (
              <div className="empty">Belum ada barang diterima.</div>
            ) : (
              <table className="dt">
                <thead>
                  <tr>
                    <th>No. SJ Supplier</th>
                    <th>Tanggal</th>
                    <th>Barang (baik / rusak)</th>
                    <th>Diterima oleh</th>
                    <th>Foto SJ</th>
                  </tr>
                </thead>
                <tbody>
                  {po.receipts.map((r, i) => {
                    const doc = folder.docs.find((d) => d.id === r.docId);
                    return (
                      <tr key={i}>
                        <td className="mono">{r.sjNo}</td>
                        <td>{date(r.date)}</td>
                        <td className="small">
                          {(r.items || []).map((x) => `${x.name}: ${num(x.qty)}${x.badQty ? ` (+${num(x.badQty)} rusak)` : ''}`).join(' · ')}
                        </td>
                        <td>{r.by}</td>
                        <td>{doc?.file ? <a href={fileUrl(doc, doc.file)} target="_blank" rel="noreferrer">Lihat</a> : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
        <div className="stack">
          {(po.for_orders || []).length > 0 && (
            <Panel title="Untuk pesanan customer" bodyClass="">
              <table className="dt">
                <tbody>
                  {po.for_orders.map((o) => (
                    <tr key={o.id} className="clickable" onClick={() => navigate(['penjualan', o.id])}>
                      <td className="mono">{o.order_no}</td>
                      <td>{o.customer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(po.receipts || []).length > 0 && (
                <p className="small muted panel-note">Barang sudah diterima: buka pesanannya lalu "Keluarkan Barang" untuk kirim ke customer.</p>
              )}
            </Panel>
          )}
          <Panel title="Kontak supplier">
            <SupplierContact po={po} folder={folder} />
          </Panel>
          <Panel title="Hutang PO ini">
            <PayableSummary folder={folder} />
          </Panel>
          <Panel title="Riwayat" bodyClass="">
            <Activity recordIds={[po.id, ...folder.invoices.map((i) => i.id)]} />
          </Panel>
        </div>
      </div>
      {dlg === 'receive' && <ReceiveDialog po={po} onClose={() => setDlg(null)} />}
      {dlg === 'invoice' && <InvoiceDialog presetPo={po} stay onClose={() => setDlg(null)} />}
      {dlg === 'close' && (
        <ReasonDialog
          title={`Tutup ${po.po_no}?`}
          label="Alasan (sisa barang tidak dikirim supplier)"
          confirmLabel="Tutup PO"
          onClose={() => setDlg(null)}
          onSubmit={async (reason) => {
            await action('po/state', { po_id: po.id, state: 'selesai', reason });
            toast.ok(`${po.po_no} ditutup. Barang yang kurang tercatat di catatan PO.`);
          }}
        />
      )}
      {dlg === 'cancel' && (
        <ReasonDialog
          title={`Batalkan ${po.po_no}?`}
          label="Alasan"
          confirmLabel="Batalkan PO"
          danger
          onClose={() => setDlg(null)}
          onSubmit={async (reason) => {
            await action('po/state', { po_id: po.id, state: 'batal', reason });
            toast.ok(`${po.po_no} dibatalkan`);
          }}
        />
      )}
    </>
  );
}

function ReceiveDialog({ po, onClose }) {
  const toast = useToast();
  const items = po.items || [];
  const [sj, setSj] = useState('');
  const [day, setDay] = useState(today());
  const [driver, setDriver] = useState('');
  const [file, setFile] = useState(null);
  const [lines, setLines] = useState(() => items.map((it) => ({ good: Math.max(0, it.qty - (Number(it.receivedQty) || 0)), bad: 0 })));
  const [overReason, setOverReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const overLines = items.filter((it, i) => Number(lines[i].good) > Math.max(0, it.qty - (Number(it.receivedQty) || 0)));

  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!sj.trim()) return setErr('No. surat jalan dari supplier wajib diisi.');
    if (overLines.length && !overReason.trim()) return setErr('Ada barang yang diterima melebihi sisa PO. Isi alasan kelebihan dulu.');
    if (!lines.some((l) => Number(l.good) > 0 || Number(l.bad) > 0)) return setErr('Isi qty yang diterima.');
    setBusy(true);
    try {
      const res = await action('po/receive', {
        po_id: po.id,
        sj_no: sj,
        date: day,
        driver,
        lines: lines.map((l, index) => ({ index, good: Number(l.good) || 0, bad: Number(l.bad) || 0 })),
        over_reason: overLines.length ? overReason : '',
        photo: file || undefined,
      });
      toast.ok(res.state === 'selesai' ? `Barang ${po.po_no} lengkap diterima, stok bertambah` : `Penerimaan ${sj} tersimpan, stok bertambah`);
      onClose();
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Terima Barang ${po.po_no}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="dialog-body">
          <div className="form-grid cols-3">
            <Field label="No. surat jalan supplier" required>
              <Input value={sj} onChange={(e) => setSj(e.target.value)} autoFocus />
            </Field>
            <Field label="Tanggal terima">
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </Field>
            <Field label="Supir / pengantar">
              <Input value={driver} onChange={(e) => setDriver(e.target.value)} />
            </Field>
            <Field label="Foto surat jalan supplier" className="span-all" hint="Dari kamera HP atau file PDF, maks 5MB">
              <FilePick value={file} onChange={setFile} onError={setErr} />
            </Field>
          </div>
          <div className="table-wrap auto-h">
            <table className="lines">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th className="right">Qty PO</th>
                  <th className="right">Sudah</th>
                  <th className="right">Diterima baik</th>
                  <th className="right">Rusak</th>
                  <th className="right">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const done = Number(it.receivedQty) || 0;
                  const rem = it.qty - done - (Number(lines[i].good) || 0);
                  return (
                    <tr key={i}>
                      <td>
                        {it.name} {it.color ? <span className="muted">· {it.color}</span> : null}
                      </td>
                      <td className="right">{num(it.qty)}</td>
                      <td className="right">{num(done)}</td>
                      <td className="right">
                        <input className="cell num w-xs" inputMode="numeric" value={lines[i].good} onChange={(e) => setLine(i, { good: e.target.value.replace(/\D/g, '') })} aria-label={`Diterima ${it.name}`} />
                      </td>
                      <td className="right">
                        <input className="cell num w-xs" inputMode="numeric" value={lines[i].bad} onChange={(e) => setLine(i, { bad: e.target.value.replace(/\D/g, '') })} aria-label={`Rusak ${it.name}`} />
                      </td>
                      <td className={`right ${rem < 0 ? 'text-warn strong' : ''}`}>{rem < 0 ? `lebih ${num(-rem)}` : num(rem)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="small muted">Barang rusak dicatat tapi tidak masuk stok. Sisa bisa diterima di surat jalan berikutnya. Harga modal barang mengikuti harga di PO ini.</p>
          {overLines.length > 0 && (
            <Field label={`Alasan kelebihan (${overLines.map((it) => it.name).join(', ')})`} required>
              <Input value={overReason} onChange={(e) => setOverReason(e.target.value)} placeholder="mis. supplier kirim lebih, sudah disetujui Pak Yanto" />
            </Field>
          )}
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" busy={busy}>
            Simpan Penerimaan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
