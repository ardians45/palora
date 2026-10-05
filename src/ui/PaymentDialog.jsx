// Catat pembayaran: DP / pelunasan / cicilan (customer) atau bayar invoice supplier.
import React, { useEffect, useState } from 'react';
import { pb } from '../lib/pb';
import { action } from '../lib/data';
import { rp, today } from '../lib/format';
import { Button, Field, FilePick, Input, MoneyInput, Select, Textarea } from './core';
import { Dialog, useToast } from './feedback';

export const PAY_METHODS = ['Tunai', 'Transfer BCA', 'Transfer Mandiri', 'Transfer BRI', 'Transfer lainnya', 'Giro'];

export default function PaymentDialog({ kind, target, remaining: initialRemaining, title, onClose, onDone }) {
  const toast = useToast();
  const [remaining, setRemaining] = useState(initialRemaining);
  const [amount, setAmount] = useState(initialRemaining);

  // ambil sisa terbaru dari server (tampilan daftar bisa saja belum diperbarui)
  useEffect(() => {
    let alive = true;
    pb.collection(kind === 'customer' ? 'sales_orders' : 'supplier_invoices')
      .getOne(target.id)
      .then((rec) => {
        if (!alive) return;
        const rem = (rec.total_amount || 0) - (rec.paid_amount || 0);
        setRemaining(rem);
        setAmount((a) => (a === initialRemaining || a > rem ? rem : a));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [kind, target.id, initialRemaining]);
  const [method, setMethod] = useState('Transfer BCA');
  const [day, setDay] = useState(today());
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const n = Number(amount) || 0;
    if (n <= 0) return setErr('Isi jumlah pembayaran.');
    if (n > remaining) return setErr(`Jumlah ${rp(n)} melebihi sisa ${rp(remaining)}.`);
    setBusy(true);
    try {
      const res = await action('payment', {
        kind,
        [kind === 'customer' ? 'order_id' : 'invoice_id']: target.id,
        amount: n,
        method,
        date: day,
        note,
        proof: file || undefined,
      });
      toast.ok(`Pembayaran ${rp(n)} tercatat`);
      onDone?.(res);
      onClose();
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={title || 'Catat Pembayaran'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-body">
          <div className="alert info">Sisa tagihan: <b>{rp(remaining)}</b></div>
          <div className="form-grid">
            <Field label="Jumlah" required>
              <MoneyInput value={amount} onChange={setAmount} autoFocus />
            </Field>
            <Field label="Tanggal">
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </Field>
            <Field label="Metode">
              <Select value={method} onChange={(e) => setMethod(e.target.value)} options={PAY_METHODS} />
            </Field>
            <Field label="Keterangan">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. DP, cicilan ke-2" />
            </Field>
            <Field label="Bukti transfer (opsional)" className="span-all">
              <FilePick value={file} onChange={setFile} onError={setErr} />
            </Field>
          </div>
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" busy={busy}>
            Simpan Pembayaran
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Dialog teks sederhana (alasan batal, nama penerima, dll). */
export function ReasonDialog({ title, label, confirmLabel = 'Simpan', danger, onSubmit, onClose, multiline }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return setErr(`${label} wajib diisi.`);
          setBusy(true);
          try {
            await onSubmit(text.trim());
            onClose();
          } catch (ex) {
            setErr(ex?.response?.message || ex.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-body">
          <Field label={label} required>
            {multiline ? <Textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus /> : <Input value={text} onChange={(e) => setText(e.target.value)} autoFocus />}
          </Field>
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} className={danger ? 'solid' : ''} busy={busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
