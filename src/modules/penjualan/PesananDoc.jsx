// Halaman dokumen pesanan: status alur, aksi langkah berikutnya, barang, pembayaran, surat jalan, riwayat.
import React, { useState } from 'react';
import { Ban, CreditCard, MessageCircle, Package, Pencil, Printer, ShieldCheck, Truck } from 'lucide-react';
import { action, fileUrl, useRecord, useRecords, q } from '../../lib/data';
import { href, navigate } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, num, rp, today, waLink } from '../../lib/format';
import { ORDER_STATUS, ORDER_STEPS, SJ_STATUS, CHANNEL_LABEL, dueTone, orderStepKey } from '../../lib/status';
import { Badge, Button, DescList, ErrorBox, Field, Input, LinkButton, Loading, PageHeader, Panel, Segmented, StatusBadge, Steps } from '../../ui/core';
import LineItems from '../../ui/LineItems';
import Activity from '../../ui/Activity';
import PaymentDialog, { ReasonDialog } from '../../ui/PaymentDialog';
import { Dialog, useConfirm, useToast } from '../../ui/feedback';

export default function PesananDoc({ id }) {
  const { item: o, loading, error, reload } = useRecord('sales_orders', id);
  const payments = useRecords('payments', { filter: `order_id = ${q(id)}`, sort: 'created' });
  const deliveries = useRecords('deliveries', { filter: `order_id = ${q(id)}`, sort: 'created' });
  const { role, can } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [dlg, setDlg] = useState(null);

  if (loading && !o) return <Loading />;
  if (error || !o) return <ErrorBox error={error} onRetry={reload} />;

  const st = o.status;
  const open = st === 'baru' || st === 'dp';
  const canOut = can('owner', 'gudang') && (st === 'lunas' || (o.release_approved && open));
  const canPay =
    st !== 'batal' && o.remaining_amount > 0 && (can('owner', 'finance') || (role === 'gudang' && open));
  const due = dueTone(o.due_date, o.remaining_amount);
  const printDoc = o.channel === 'pesanan' && o.remaining_amount > 0 && /tempo/i.test(o.payment_type || '') ? 'invoice' : 'nota';

  const waText = [
    `Yth. ${o.customer},`,
    `${printDoc === 'invoice' ? 'Invoice' : 'Nota'} ${o.order_no} tanggal ${date(o.date)}:`,
    ...(o.items || []).map((it) => `- ${it.name} ${num(it.qty)} ${it.unit || 'pcs'} x ${num(it.price)}`),
    `Total: ${rp(o.total_amount)}`,
    o.paid_amount > 0 ? `Sudah dibayar: ${rp(o.paid_amount)}` : null,
    o.remaining_amount > 0 ? `Sisa: ${rp(o.remaining_amount)}${o.due_date ? ` (jatuh tempo ${date(o.due_date)})` : ''}` : 'Status: LUNAS',
    'Terima kasih. PT Paletindo Prakarsa Unggul',
  ]
    .filter(Boolean)
    .join('\n');

  const release = async () => {
    const ok = await confirm({
      title: 'Izinkan barang keluar sebelum lunas?',
      message: `${o.order_no} masih sisa ${rp(o.remaining_amount)}. Sisa tagihan tetap tercatat di Piutang.`,
      confirmLabel: 'Izinkan',
    });
    if (!ok) return;
    try {
      await action('orders/release', { order_id: o.id });
      toast.ok('Izin kirim sebelum lunas tercatat');
    } catch (ex) {
      toast.error(ex);
    }
  };

  return (
    <>
      <PageHeader crumbs={[{ label: 'Penjualan', to: ['penjualan'] }, { label: o.order_no }]} title={o.order_no} sub={CHANNEL_LABEL[o.channel]} />
      <div className="doc-bar">
        <div className="actions">
          {canPay && (
            <Button variant={open && !canOut ? 'primary' : undefined} icon={CreditCard} onClick={() => setDlg('pay')}>
              {o.paid_amount > 0 ? 'Catat Pembayaran' : 'Catat DP'}
            </Button>
          )}
          {canOut && (
            <Button variant="primary" icon={Truck} onClick={() => setDlg('out')}>
              Keluarkan Barang
            </Button>
          )}
          {role === 'owner' && open && !o.release_approved && (
            <Button icon={ShieldCheck} onClick={release}>
              Izinkan Kirim Sebelum Lunas
            </Button>
          )}
          <Button icon={Printer} onClick={() => window.open(href(['cetak', printDoc, o.id]), '_blank')}>
            Cetak {printDoc === 'invoice' ? 'Invoice' : 'Nota'}
          </Button>
          <a className="btn" href={waLink(o.customer_phone, waText)} target="_blank" rel="noreferrer">
            <MessageCircle /> Kirim WA
          </a>
          {open && can('owner', 'gudang') && (
            <LinkButton to={['penjualan', o.id, 'ubah']} icon={Pencil}>
              Ubah
            </LinkButton>
          )}
          {['baru', 'dp', 'lunas'].includes(st) && can('owner', 'gudang') && (
            <Button variant="danger" icon={Ban} onClick={() => setDlg('cancel')}>
              Batalkan
            </Button>
          )}
        </div>
        {o.channel === 'pesanan' ? (
          <Steps steps={ORDER_STEPS} current={orderStepKey(st)} exception={st === 'batal' ? 'Dibatalkan' : null} />
        ) : (
          <StatusBadge map={ORDER_STATUS} value={st} />
        )}
      </div>

      <div className="doc-layout">
        <div className="stack">
          <div className="sheet">
            <div className="doc-no">{o.order_no}</div>
            {st === 'batal' && <div className="alert error mb-3">Dibatalkan: {o.cancel_reason}</div>}
            {o.release_approved && open && <div className="alert warn mb-3">Owner ({o.dp_override_by}) mengizinkan barang keluar sebelum lunas.</div>}
            <div className="two-col">
              <DescList
                items={[
                  ['Customer', <b key="c">{o.customer}</b>],
                  ['UP', o.up_person],
                  ['Telepon', o.customer_phone],
                  ['PO customer', o.po_customer_ref],
                  ['Kirim ke', o.destination],
                  o.marketplace_order_no ? ['No. pesanan MP', `${o.store} #${o.marketplace_order_no}`] : null,
                ]}
              />
              <DescList
                items={[
                  ['Tanggal', date(o.date)],
                  ['Syarat bayar', o.payment_type],
                  ['Jatuh tempo', o.due_date && o.remaining_amount > 0 ? <span key="d">{date(o.due_date)} <Badge tone={due.tone}>{due.label}</Badge></span> : null],
                  ['Dibuat oleh', o.created_by],
                ]}
              />
            </div>
            <div className="mt-4">
              <LineItems items={o.items || []} products={[]} readOnly onChange={() => {}} />
            </div>
            <div className="totals">
              {o.tax_mode !== 'none' && o.tax_mode && (
                <>
                  <span>Subtotal</span>
                  <span className="right">{num(o.subtotal)}</span>
                  <span>PPN{o.tax_mode === 'include' ? ' (termasuk)' : ''}</span>
                  <span className="right">{num(o.tax_amount)}</span>
                </>
              )}
              <span className="grand">Total</span>
              <span className="grand right">{rp(o.total_amount)}</span>
              <span>Dibayar</span>
              <span className="right">{num(o.paid_amount)}</span>
              <span className="strong">Sisa</span>
              <span className={`right strong ${o.remaining_amount > 0 ? 'text-bad' : 'text-ok'}`}>{st === 'batal' ? '-' : rp(o.remaining_amount)}</span>
            </div>
            {o.notes && <p className="mt-3 small muted">Catatan: {o.notes}</p>}
          </div>

          <Panel title="Pembayaran" bodyClass="">
            {payments.items.length === 0 ? (
              <div className="empty">Belum ada pembayaran.</div>
            ) : (
              <table className="dt">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Metode</th>
                    <th>Keterangan</th>
                    <th>Dicatat oleh</th>
                    <th className="right">Jumlah</th>
                    <th>Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.items.map((p) => (
                    <tr key={p.id}>
                      <td>{date(p.date)}</td>
                      <td>{p.method}</td>
                      <td>{p.note}</td>
                      <td>{p.recorded_by}</td>
                      <td className="right">{num(p.amount)}</td>
                      <td>{p.proof ? <a href={fileUrl(p, p.proof)} target="_blank" rel="noreferrer">Lihat</a> : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {deliveries.items.length > 0 && (
            <Panel title="Surat Jalan" bodyClass="">
              <table className="dt">
                <thead>
                  <tr>
                    <th>No. SJ</th>
                    <th>Tanggal</th>
                    <th>Supir</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.items.map((d) => (
                    <tr key={d.id} className="clickable" onClick={() => navigate(['surat-jalan', d.id])}>
                      <td className="mono">{d.sj_no}</td>
                      <td>{date(d.date)}</td>
                      <td>{d.driver_name}</td>
                      <td>
                        <StatusBadge map={SJ_STATUS} value={d.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </div>

        <Panel title="Riwayat" bodyClass="">
          <Activity recordIds={o.id} />
        </Panel>
      </div>

      {dlg === 'pay' && (
        <PaymentDialog kind="customer" target={o} remaining={o.remaining_amount} title={o.paid_amount > 0 ? 'Catat Pembayaran' : 'Catat DP'} onClose={() => setDlg(null)} onDone={reload} />
      )}
      {dlg === 'out' && <DispatchDialog order={o} onClose={() => setDlg(null)} />}
      {dlg === 'cancel' && (
        <ReasonDialog
          title={`Batalkan ${o.order_no}?`}
          label="Alasan pembatalan"
          confirmLabel="Batalkan Pesanan"
          danger
          onClose={() => setDlg(null)}
          onSubmit={async (reason) => {
            await action('orders/cancel', { order_id: o.id, reason });
            toast.ok(`${o.order_no} dibatalkan`);
          }}
        />
      )}
    </>
  );
}

function DispatchDialog({ order, onClose }) {
  const toast = useToast();
  const [mode, setMode] = useState(order.destination ? 'kirim' : 'ambil');
  const [f, setF] = useState({
    date: today(),
    driver_name: '',
    vehicle_plate: '',
    destination: order.destination || '',
    up_person: order.up_person || '',
    po_customer_ref: order.po_customer_ref || '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (mode === 'kirim' && !f.destination.trim()) return setErr('Alamat kirim wajib diisi.');
    setBusy(true);
    try {
      const res = await action('orders/dispatch', { order_id: order.id, mode, ...f });
      if (res.delivery) {
        toast.ok(`Surat jalan ${res.delivery.sj_no} terbit, stok sudah dipotong`);
        navigate(['surat-jalan', res.delivery.id]);
      } else {
        toast.ok('Barang diserahkan, stok sudah dipotong');
      }
      onClose();
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  return (
    <Dialog title="Keluarkan Barang" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-body">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'kirim', label: 'Dikirim (buat surat jalan)' },
              { value: 'ambil', label: 'Diambil sendiri' },
            ]}
          />
          <div className="small muted">
            <Package size={14} /> {order.items?.length} barang · stok gudang langsung dipotong.
            {mode === 'ambil' ? ' Tidak perlu surat jalan.' : ''}
          </div>
          {mode === 'kirim' && (
            <div className="form-grid">
              <Field label="Tanggal">
                <Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
              </Field>
              <Field label="UP (penerima)">
                <Input value={f.up_person} onChange={(e) => set({ up_person: e.target.value })} />
              </Field>
              <Field label="Kirim ke" required className="span-all">
                <Input value={f.destination} onChange={(e) => set({ destination: e.target.value })} />
              </Field>
              <Field label="Supir">
                <Input value={f.driver_name} onChange={(e) => set({ driver_name: e.target.value })} />
              </Field>
              <Field label="No. kendaraan">
                <Input value={f.vehicle_plate} onChange={(e) => set({ vehicle_plate: e.target.value })} />
              </Field>
              <Field label="PO customer" className="span-all">
                <Input value={f.po_customer_ref} onChange={(e) => set({ po_customer_ref: e.target.value })} />
              </Field>
            </div>
          )}
          {order.remaining_amount > 0 && <div className="alert warn">Belum lunas: sisa {rp(order.remaining_amount)} tetap tercatat sebagai piutang.</div>}
          {err && <div className="alert error">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" busy={busy}>
            {mode === 'kirim' ? 'Terbitkan Surat Jalan' : 'Serahkan Barang'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

