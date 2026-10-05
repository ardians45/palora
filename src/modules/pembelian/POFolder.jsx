// "Map PO" digital: meniru map kertas Paletindo yang disusun per PO
// (PO -> surat jalan 1..n -> invoice -> faktur -> pembayaran), lengkap dengan kontak supplier.
import React, { useMemo } from 'react';
import { Check, FileText, Mail, MessageCircle, Minus, Phone } from 'lucide-react';
import { fileUrl, useRecords, q } from '../../lib/data';
import { useSession } from '../../lib/session';
import { date, daysFromToday, num, rp, waLink } from '../../lib/format';
import { Badge } from '../../ui/core';

/** Data map satu PO: surat jalan, foto, invoice, pembayaran, kontak supplier. */
export function usePoFolder(po) {
  const enabled = !!po;
  const docs = useRecords('documents', { filter: po ? `ref_no = ${q(po.po_no)} && deleted = false` : '', enabled });
  const invoices = useRecords('supplier_invoices', { filter: po ? `po_id = ${q(po.id)} && deleted = false` : '', sort: 'date', enabled });
  const invIds = invoices.items.map((i) => i.id);
  const pays = useRecords('payments', {
    filter: invIds.length ? invIds.map((id) => `invoice_id = ${q(id)}`).join(' || ') : 'id = ""',
    sort: 'date',
    enabled: enabled && invIds.length > 0,
  });
  const suppliers = useRecords('suppliers', { filter: po ? `name = ${q(po.supplier)} && deleted = false` : '', limit: 1, enabled });

  return useMemo(() => {
    if (!po) return null;
    const receipts = po.receipts || [];
    const items = po.items || [];
    const ordered = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const received = items.reduce((s, it) => s + (Number(it.receivedQty) || 0), 0);
    const invoiced = invoices.items.reduce((s, i) => s + i.total_amount, 0);
    const paid = invoices.items.reduce((s, i) => s + i.paid_amount, 0);
    const sup = suppliers.items[0] || {};
    const lastSj = receipts.length ? receipts[receipts.length - 1].date : '';
    const invoicedSj = new Set(invoices.items.flatMap((i) => (i.sj_nos || []).map((s) => String(s).toLowerCase())));
    return {
      receipts,
      docs: docs.items,
      invoices: invoices.items,
      payments: pays.items,
      ordered,
      received,
      invoiced,
      paid,
      remaining: invoiced - paid,
      lastSj,
      sjWithoutInvoice: invoices.items.length ? receipts.filter((r) => !invoicedSj.has(String(r.sjNo).toLowerCase()) && invoicedSj.size > 0) : [],
      contact: {
        person: po.up_person || sup.sales_person || '',
        whatsapp: po.supplier_phone || sup.whatsapp || sup.phone || '',
        phone: sup.phone || '',
        email: po.supplier_email || sup.email || '',
        terms: sup.terms || '',
      },
      // pembayaran baru dimuat setelah invoice ada: anggap belum siap sampai jumlahnya cocok dengan nilai dibayar invoice
      loading: docs.loading || invoices.loading || pays.loading || pays.items.reduce((s, p) => s + p.amount, 0) < paid,
    };
  }, [po, docs.items, invoices.items, pays.items, suppliers.items, docs.loading, invoices.loading, pays.loading]);
}

const Tick = ({ on, label, detail, warn }) => (
  <div className={`check-item ${on ? 'on' : warn ? 'warn' : ''}`}>
    {on ? <Check size={16} /> : <Minus size={16} />}
    <div>
      <b>{label}</b>
      {detail && <span>{detail}</span>}
    </div>
  </div>
);

/** Kelengkapan map: PO -> surat jalan -> barang lengkap -> invoice -> faktur -> lunas */
export function PoChecklist({ po, folder }) {
  const sent = po.state && po.state !== 'draft';
  const full = folder.ordered > 0 && folder.received >= folder.ordered;
  const hasInv = folder.invoices.length > 0;
  const hasFaktur = folder.invoices.some((i) => i.tax_invoice_no || i.tax_file);
  const lunas = hasInv && folder.remaining <= 0;
  const sinceSj = daysFromToday(folder.lastSj);
  return (
    <div className="checklist" aria-label="Kelengkapan map PO">
      <Tick on={sent} label="PO dikirim" detail={sent ? date(po.date) : 'masih draft'} />
      <Tick on={folder.receipts.length > 0} label={`Surat jalan (${folder.receipts.length})`} detail={folder.lastSj ? `terakhir ${date(folder.lastSj)}` : 'belum ada'} />
      <Tick on={full} label="Barang lengkap" detail={`${num(folder.received)} / ${num(folder.ordered)}`} warn={folder.received > 0} />
      <Tick
        on={hasInv}
        label={`Invoice (${folder.invoices.length})`}
        detail={hasInv ? folder.invoices.map((i) => i.invoice_no).join(', ') : folder.receipts.length && sinceSj !== null ? `belum datang · ${-sinceSj} hari sejak SJ` : 'belum ada'}
        warn={!hasInv && folder.receipts.length > 0 && sinceSj !== null && -sinceSj > 14}
      />
      <Tick on={hasFaktur} label="Faktur pajak" detail={hasFaktur ? folder.invoices.map((i) => i.tax_invoice_no).filter(Boolean).join(', ') || 'ada foto' : 'belum ada'} />
      <Tick on={lunas} label="Lunas" detail={hasInv ? (lunas ? 'hutang selesai' : `sisa ${rp(folder.remaining)}`) : '-'} warn={hasInv && !lunas} />
    </div>
  );
}

/** Timeline dokumen berurutan tanggal, setiap baris dengan foto/berkasnya. */
export function PoTimeline({ po, folder }) {
  const docById = new Map(folder.docs.map((d) => [d.id, d]));
  const events = [
    { date: po.date, order: 0, title: `${po.po_no} dibuat`, sub: `${num(folder.ordered)} barang · ${rp(po.total_amount)} · oleh ${po.created_by || '-'}`, kind: 'po' },
    ...folder.receipts.map((r, i) => {
      const doc = docById.get(r.docId);
      const qty = (r.items || []).reduce((s, x) => s + (Number(x.qty) || 0), 0);
      const bad = (r.items || []).reduce((s, x) => s + (Number(x.badQty) || 0), 0);
      return {
        date: r.date,
        order: 1,
        title: `Surat jalan ${i + 1}: ${r.sjNo}`,
        sub: `${num(qty)} barang diterima${bad ? `, ${num(bad)} rusak` : ''}${r.driver ? ` · supir ${r.driver}` : ''} · ${r.by || ''}`,
        files: doc?.file ? [{ label: 'Foto SJ', url: fileUrl(doc, doc.file) }] : [],
        missing: doc?.file ? null : 'foto SJ belum ada',
        kind: 'sj',
      };
    }),
    ...folder.invoices.flatMap((inv) => [
      {
        date: inv.date || inv.received_date,
        order: 2,
        title: `Invoice ${inv.invoice_no}`,
        sub: `${rp(inv.total_amount)}${inv.due_date ? ` · jatuh tempo ${date(inv.due_date)}` : ''}${(inv.sj_nos || []).length ? ` · untuk SJ ${inv.sj_nos.join(', ')}` : ''} · diterima ${inv.received_by || inv.created_by || ''}`,
        files: [inv.file && { label: 'Foto invoice', url: fileUrl(inv, inv.file) }].filter(Boolean),
        missing: inv.file ? null : 'foto invoice belum ada',
        kind: 'inv',
      },
      (inv.tax_invoice_no || inv.tax_file) && {
        date: inv.date || inv.received_date,
        order: 3,
        title: `Faktur pajak${inv.tax_invoice_no ? ` ${inv.tax_invoice_no}` : ''}`,
        sub: `untuk invoice ${inv.invoice_no}`,
        files: [inv.tax_file && { label: 'Foto faktur', url: fileUrl(inv, inv.tax_file) }].filter(Boolean),
        kind: 'faktur',
      },
    ]),
    ...folder.payments.map((p) => ({
      date: p.date,
      order: 4,
      title: `Bayar ${rp(p.amount)}`,
      sub: `${p.ref_no} · ${p.method}${p.note ? ` · ${p.note}` : ''} · ${p.recorded_by}`,
      files: p.proof ? [{ label: 'Bukti transfer', url: fileUrl(p, p.proof) }] : [],
      kind: 'pay',
    })),
    // dokumen lain yang diunggah manual ke map PO ini (mis. foto susulan dari menu Arsip)
    ...folder.docs
      .filter((d) => !folder.receipts.some((r) => r.docId === d.id))
      .map((d) => ({ date: d.date || d.created, order: 5, title: d.title || d.category, sub: `${d.category} · diunggah ${d.uploaded_by}`, files: d.file ? [{ label: 'Buka', url: fileUrl(d, d.file) }] : [], kind: 'doc' })),
  ]
    .filter(Boolean)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.order - b.order);

  return (
    <ol className="timeline">
      {events.map((ev, i) => (
        <li key={i} className={`tl-${ev.kind}`}>
          <div className="tl-date">{date(ev.date)}</div>
          <div className="tl-body">
            <b>{ev.title}</b>
            <div className="small muted">{ev.sub}</div>
            <div className="row">
              {(ev.files || []).map((f) => (
                <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="small">
                  <FileText size={13} /> {f.label}
                </a>
              ))}
              {ev.missing && <Badge tone="warn">{ev.missing}</Badge>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Kontak supplier + tombol minta kirim ulang dokumen yang hilang (kebiasaan lama: WA ke supplier). */
export function SupplierContact({ po, folder }) {
  const { settings } = useSession();
  const c = folder.contact;
  const ask = (what) =>
    `Halo ${c.person || po.supplier}, kami dari ${settings?.company_name || 'PT Paletindo Prakarsa Unggul'}.\n` +
    `Mohon dikirim ulang ${what} untuk ${po.po_no} tanggal ${date(po.date)}` +
    `${folder.receipts.length ? ` (surat jalan ${folder.receipts.map((r) => r.sjNo).join(', ')})` : ''}. Terima kasih.`;
  return (
    <div className="stack contact">
      <dl className="dl">
        <dt>Supplier</dt>
        <dd>
          <b>{po.supplier}</b>
        </dd>
        {c.person && (
          <>
            <dt>Up</dt>
            <dd>{c.person}</dd>
          </>
        )}
        {c.whatsapp && (
          <>
            <dt>WA</dt>
            <dd>{c.whatsapp}</dd>
          </>
        )}
        {c.phone && c.phone !== c.whatsapp && (
          <>
            <dt>Telepon</dt>
            <dd>
              <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>
                <Phone size={13} /> {c.phone}
              </a>
            </dd>
          </>
        )}
        {c.email && (
          <>
            <dt>Email</dt>
            <dd>{c.email}</dd>
          </>
        )}
        {c.terms && (
          <>
            <dt>Syarat bayar</dt>
            <dd>{c.terms}</dd>
          </>
        )}
      </dl>
      {!c.whatsapp && !c.email && <p className="small muted">Kontak supplier belum diisi. Lengkapi di menu Supplier.</p>}
      <div className="row">
        <a className="btn btn-sm" href={waLink(c.whatsapp, ask('invoice dan faktur pajak'))} target="_blank" rel="noreferrer">
          <MessageCircle /> Minta invoice/faktur
        </a>
        <a className="btn btn-sm" href={waLink(c.whatsapp, ask('surat jalan'))} target="_blank" rel="noreferrer">
          <MessageCircle /> Minta surat jalan
        </a>
        {c.email && (
          <a className="btn btn-sm" href={`mailto:${c.email}?subject=${encodeURIComponent(`Dokumen ${po.po_no}`)}&body=${encodeURIComponent(ask('invoice dan faktur pajak'))}`}>
            <Mail /> Email
          </a>
        )}
      </div>
    </div>
  );
}

/** Ringkasan hutang PO ini */
export function PayableSummary({ folder }) {
  if (folder.invoices.length === 0) return <p className="small muted">Belum ada invoice dari supplier.</p>;
  const nextDue = folder.invoices
    .filter((i) => i.total_amount - i.paid_amount > 0 && i.due_date)
    .map((i) => i.due_date)
    .sort()[0];
  const d = nextDue ? daysFromToday(nextDue) : null;
  return (
    <div className="totals compact">
      <span>Total invoice</span>
      <span className="right">{num(folder.invoiced)}</span>
      <span>Dibayar</span>
      <span className="right">{num(folder.paid)}</span>
      <span className="strong">Sisa hutang</span>
      <span className={`right strong ${folder.remaining > 0 ? 'text-bad' : 'text-ok'}`}>{rp(folder.remaining)}</span>
      {nextDue && (
        <>
          <span>Jatuh tempo</span>
          <span className="right">
            {date(nextDue)} {d !== null && d < 0 && <Badge tone="bad">lewat {-d} hari</Badge>}
          </span>
        </>
      )}
    </div>
  );
}
