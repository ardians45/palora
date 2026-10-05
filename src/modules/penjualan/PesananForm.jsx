// Form pesanan customer (baru & ubah). Harga per baris bisa dinego.
import React, { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { pb } from '../../lib/pb';
import { action, useRecords, useRecord } from '../../lib/data';
import { navigate } from '../../lib/router';
import { useSession } from '../../lib/session';
import { dueDateFromTerms, num, rp, today } from '../../lib/format';
import { Button, Empty, ErrorBox, Field, FilePick, Input, Loading, MoneyInput, PageHeader, Panel, Select, Textarea } from '../../ui/core';
import LineItems, { lineTotal, validateLines } from '../../ui/LineItems';
import { useToast } from '../../ui/feedback';
import { PAY_METHODS } from '../../ui/PaymentDialog';

export const TERMS = ['Tunai', 'Transfer', 'Tempo 7 Hari', 'Tempo 14 Hari', 'Tempo 30 Hari', 'Tempo 45 Hari'];

export function calcTotals(items, taxMode, rate = 11) {
  const subtotal = lineTotal(items);
  let tax = 0;
  let total = subtotal;
  if (taxMode === 'exclude') {
    tax = Math.round((subtotal * rate) / 100);
    total = subtotal + tax;
  } else if (taxMode === 'include') {
    tax = Math.round((subtotal * rate) / (100 + rate));
  }
  return { subtotal, tax, total };
}

const empty = () => ({
  date: today(),
  customer: '',
  up_person: '',
  customer_phone: '',
  po_customer_ref: '',
  destination: '',
  payment_type: 'Tempo 14 Hari',
  due_date: dueDateFromTerms('Tempo 14 Hari'),
  tax_mode: 'none',
  notes: '',
  items: [],
});

export default function PesananForm({ id }) {
  const { item: existing, loading, error } = useRecord('sales_orders', id || null);
  if (id && loading) return <Loading />;
  if (id && error) return <ErrorBox error={error} />;
  if (id && existing && !['baru', 'dp'].includes(existing.status)) {
    return <Empty title="Pesanan ini tidak bisa diubah">Barang/harga hanya bisa diubah sebelum lunas atau dikirim.</Empty>;
  }
  return <Form existing={existing} />;
}

function Form({ existing }) {
  const { products, settings } = useSession();
  const toast = useToast();
  const customers = useRecords('customers', { filter: 'deleted = false', sort: 'name' });
  const [form, setForm] = useState(() => (existing ? { ...empty(), ...pick(existing) } : empty()));
  const [dp, setDp] = useState({ amount: '', method: 'Transfer BCA', file: null });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const rate = settings?.ppn_rate || 11;
  const minDp = settings?.min_dp_percent ?? 25;
  const t = calcTotals(form.items, form.tax_mode, rate);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const known = useMemo(() => new Map(customers.items.map((c) => [c.name.toLowerCase(), c])), [customers.items]);

  // pilih customer terdaftar -> isi UP, telepon, alamat kirim, syarat bayar
  const onCustomer = (name) => {
    const c = known.get(name.trim().toLowerCase());
    if (c && !existing) {
      const terms = c.default_terms || form.payment_type;
      set({
        customer: c.name,
        up_person: c.contact_person || '',
        customer_phone: c.whatsapp || c.phone || '',
        destination: c.shipping_address || c.address || '',
        payment_type: terms,
        due_date: dueDateFromTerms(terms, form.date),
      });
    } else set({ customer: name });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.customer.trim()) return setErr('Nama customer wajib diisi.');
    const lineErr = validateLines(form.items);
    if (lineErr) return setErr(lineErr);
    const dpAmount = Number(dp.amount) || 0;
    if (dpAmount > t.total) return setErr(`DP ${rp(dpAmount)} melebihi total ${rp(t.total)}.`);

    const body = {
      ...form,
      items: form.items.map((it) => ({ ...it, qty: Number(it.qty), price: Number(it.price) })),
    };
    setBusy(true);
    try {
      let rec;
      if (existing) {
        rec = await pb.collection('sales_orders').update(existing.id, body);
        toast.ok(`Pesanan ${rec.order_no} diperbarui`);
      } else {
        rec = await pb.collection('sales_orders').create(body);
        if (dpAmount > 0) {
          try {
            await action('payment', { kind: 'customer', order_id: rec.id, amount: dpAmount, method: dp.method, date: form.date, note: 'DP', proof: dp.file || undefined });
          } catch (payErr) {
            toast.error(`Pesanan ${rec.order_no} tersimpan, tapi DP gagal dicatat: ${payErr.message}. Catat ulang dari halaman pesanan.`);
            navigate(['penjualan', rec.id]);
            return;
          }
        }
        toast.ok(`Pesanan ${rec.order_no} tersimpan`);
      }
      navigate(['penjualan', rec.id]);
    } catch (ex) {
      toast.error(ex);
    } finally {
      setBusy(false);
    }
  };

  const dpPercent = t.total > 0 ? Math.round(((Number(dp.amount) || 0) / t.total) * 100) : 0;

  return (
    <form onSubmit={submit} className="stack">
      <PageHeader
        crumbs={[{ label: 'Penjualan', to: ['penjualan'] }, existing ? { label: existing.order_no, to: ['penjualan', existing.id] } : null, { label: existing ? 'Ubah' : 'Pesanan Baru' }].filter(Boolean)}
        title={existing ? `Ubah ${existing.order_no}` : 'Pesanan Baru'}
        actions={
          <>
            <Button onClick={() => window.history.back()}>Batal</Button>
            <Button type="submit" variant="primary" icon={Save} busy={busy}>
              Simpan Pesanan
            </Button>
          </>
        }
      />
      {err && <div className="alert error" role="alert">{err}</div>}

      <Panel title="Customer & pengiriman">
        <div className="form-grid cols-3">
          <Field label="Customer" required className="span-2">
            <Input list="customer-list" value={form.customer} onChange={(e) => onCustomer(e.target.value)} placeholder="Ketik nama customer" autoFocus={!existing} />
          </Field>
          <datalist id="customer-list">
            {customers.items.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <Field label="Tanggal">
            <Input type="date" value={form.date} onChange={(e) => set({ date: e.target.value, due_date: dueDateFromTerms(form.payment_type, e.target.value) })} />
          </Field>
          <Field label="UP (penerima)">
            <Input value={form.up_person} onChange={(e) => set({ up_person: e.target.value })} />
          </Field>
          <Field label="Telepon / WA">
            <Input value={form.customer_phone} onChange={(e) => set({ customer_phone: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="No. PO dari customer" hint="Tercetak di surat jalan (PO #)">
            <Input value={form.po_customer_ref} onChange={(e) => set({ po_customer_ref: e.target.value })} />
          </Field>
          <Field label="Alamat kirim" className="span-all">
            <Input value={form.destination} onChange={(e) => set({ destination: e.target.value })} placeholder="Kosongkan bila diambil sendiri" />
          </Field>
        </div>
      </Panel>

      <Panel title="Barang">
        <LineItems items={form.items} onChange={(items) => set({ items })} products={products} priceField="sell_price" showStock />
        <div className="row-between mt-3">
          <div className="form-grid w-md">
            <Field label="PPN">
              <Select value={form.tax_mode} onChange={(e) => set({ tax_mode: e.target.value })}>
                <option value="none">Tanpa PPN</option>
                <option value="exclude">Harga + PPN {rate}%</option>
                <option value="include">Harga sudah termasuk PPN</option>
              </Select>
            </Field>
          </div>
          <div className="totals">
            <span>Subtotal</span>
            <span className="right">{num(t.subtotal)}</span>
            {form.tax_mode !== 'none' && (
              <>
                <span>PPN {rate}%{form.tax_mode === 'include' ? ' (termasuk)' : ''}</span>
                <span className="right">{num(t.tax)}</span>
              </>
            )}
            <span className="grand">Total</span>
            <span className="grand right">{rp(t.total)}</span>
          </div>
        </div>
      </Panel>

      <Panel title="Pembayaran">
        <div className="form-grid cols-3">
          <Field label="Syarat bayar">
            <Select value={form.payment_type} onChange={(e) => set({ payment_type: e.target.value, due_date: dueDateFromTerms(e.target.value, form.date) })} options={TERMS.includes(form.payment_type) ? TERMS : [form.payment_type, ...TERMS]} />
          </Field>
          <Field label="Jatuh tempo pelunasan">
            <Input type="date" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} />
          </Field>
          <span />
          {!existing && (
            <>
              <Field label="DP diterima sekarang" hint={t.total > 0 ? `Minimal ${minDp}% = ${rp(Math.ceil((t.total * minDp) / 100))}${dp.amount ? ` · tercatat ${dpPercent}%` : ''}` : 'Boleh dikosongkan, dicatat nanti'}>
                <MoneyInput value={dp.amount} onChange={(v) => setDp({ ...dp, amount: v })} placeholder="0" />
              </Field>
              <Field label="Metode">
                <Select value={dp.method} onChange={(e) => setDp({ ...dp, method: e.target.value })} options={PAY_METHODS} />
              </Field>
              <Field label="Bukti transfer (opsional)">
                <FilePick value={dp.file} onChange={(file) => setDp({ ...dp, file })} onError={setErr} label="Pilih" />
              </Field>
            </>
          )}
          <Field label="Catatan" className="span-all">
            <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} />
          </Field>
        </div>
        <p className="small muted mt-2">
          Pesanan diproses setelah DP minimal {minDp}%. Barang keluar setelah lunas, atau dengan izin Owner untuk pelanggan tempo.
        </p>
      </Panel>
    </form>
  );
}

function pick(o) {
  return {
    date: o.date,
    customer: o.customer,
    up_person: o.up_person,
    customer_phone: o.customer_phone,
    po_customer_ref: o.po_customer_ref,
    destination: o.destination,
    payment_type: o.payment_type || 'Tempo 14 Hari',
    due_date: o.due_date,
    tax_mode: o.tax_mode || 'none',
    notes: o.notes,
    items: o.items || [],
  };
}
