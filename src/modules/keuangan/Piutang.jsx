// Piutang customer: ringkasan per customer + detail nota terbuka, cicilan, tagih via WA.
import React, { useMemo, useState } from 'react';
import { CreditCard, MessageCircle } from 'lucide-react';
import { useRecords, q } from '../../lib/data';
import { navigate, replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, daysFromToday, num, rp, waLink } from '../../lib/format';
import { ORDER_STATUS, dueTone } from '../../lib/status';
import { Badge, Button, Empty, Input, Kpi, PageHeader, Panel, Select, StatusBadge } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import PaymentDialog from '../../ui/PaymentDialog';

const OPEN = 'remaining_amount > 0 && status != "batal"';

export function PiutangList() {
  const { query } = useRoute();
  const search = query.q || '';
  const f = query.f || '';
  const { items, loading, error, reload } = useRecords('sales_orders', { filter: OPEN, sort: 'due_date' });

  const groups = useMemo(() => {
    const map = new Map();
    for (const o of items) {
      const g = map.get(o.customer) || { customer: o.customer, count: 0, total: 0, paid: 0, remaining: 0, overdue: 0, nextDue: '', phone: '' };
      g.count++;
      g.total += o.total_amount;
      g.paid += o.paid_amount;
      g.remaining += o.remaining_amount;
      g.phone = g.phone || o.customer_phone;
      const d = daysFromToday(o.due_date);
      if (d !== null && d < 0) g.overdue += o.remaining_amount;
      if (o.due_date && (!g.nextDue || o.due_date < g.nextDue)) g.nextDue = o.due_date;
      map.set(o.customer, g);
    }
    return [...map.values()];
  }, [items]);

  const rows = groups.filter((g) => (f !== 'lewat' || g.overdue > 0) && (f !== 'minggu' || (daysFromToday(g.nextDue) ?? 99) <= 7) && matchText(g, search, ['customer']));
  const sum = (k) => groups.reduce((s, g) => s + g[k], 0);

  return (
    <>
      <PageHeader crumbs={[{ label: 'Keuangan' }]} title="Piutang Customer" sub="Nota yang belum lunas" />
      <div className="kpis">
        <Kpi label="Total piutang" value={rp(sum('remaining'))} />
        <Kpi label="Lewat jatuh tempo" value={rp(sum('overdue'))} tone={sum('overdue') > 0 ? 'bad' : undefined} to={['piutang']} query={{ f: 'lewat' }} />
        <Kpi label="Customer berhutang" value={num(groups.length)} />
        <Kpi label="Nota belum lunas" value={num(items.length)} />
      </div>
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari customer..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari customer" />
        <Select className="w-sm" value={f} onChange={(e) => replaceQuery({ ...query, f: e.target.value })} aria-label="Filter">
          <option value="">Semua</option>
          <option value="lewat">Lewat jatuh tempo</option>
          <option value="minggu">Jatuh tempo ≤ 7 hari</option>
        </Select>
      </div>
      <DataTable
        rows={rows}
        rowKey={(g) => g.customer}
        loading={loading}
        error={error}
        onRetry={reload}
        initialSort={{ key: 'overdue', dir: -1 }}
        onRowClick={(g) => navigate(['piutang', g.customer])}
        empty={<Empty title={search || f ? 'Tidak ada yang cocok' : 'Tidak ada piutang'}>Semua nota sudah lunas.</Empty>}
        columns={[
          { key: 'customer', label: 'Customer', render: (g) => <b>{g.customer}</b> },
          { key: 'count', label: 'Nota', align: 'right' },
          { key: 'total', label: 'Total Tagihan', align: 'right', render: (g) => num(g.total), total: true },
          { key: 'paid', label: 'Dibayar', align: 'right', render: (g) => num(g.paid), total: true },
          { key: 'remaining', label: 'Sisa', align: 'right', render: (g) => <b>{num(g.remaining)}</b>, total: true },
          {
            key: 'nextDue',
            label: 'Jatuh Tempo Terdekat',
            render: (g) => {
              if (!g.nextDue) return '';
              const t = dueTone(g.nextDue, 1);
              return (
                <span className="row">
                  {date(g.nextDue)} <Badge tone={t.tone}>{t.label}</Badge>
                </span>
              );
            },
          },
          { key: 'overdue', label: 'Lewat Tempo', align: 'right', render: (g) => (g.overdue > 0 ? <span className="text-bad strong">{num(g.overdue)}</span> : '-'), total: true },
        ]}
      />
    </>
  );
}

export function PiutangCustomer({ name }) {
  const { settings } = useSession();
  const open = useRecords('sales_orders', { filter: `customer = ${q(name)} && ${OPEN}`, sort: 'due_date' });
  const paidOrders = useRecords('sales_orders', { filter: `customer = ${q(name)} && remaining_amount <= 0 && status != "batal"`, sort: '-date', limit: 50 });
  const payments = useRecords('payments', { filter: `partner = ${q(name)} && kind = "customer"`, sort: '-created', limit: 100 });
  const customers = useRecords('customers', { filter: `name = ${q(name)}`, limit: 1 });
  const [payFor, setPayFor] = useState(null);

  const cust = customers.items[0];
  const phone = cust?.whatsapp || cust?.phone || open.items.find((o) => o.customer_phone)?.customer_phone || '';
  const total = open.items.reduce((s, o) => s + o.remaining_amount, 0);
  const banks = (settings?.bank_accounts || []).map((b) => `${b.bank} ${b.number} a.n. ${b.name}`);
  const text = [
    `Yth. ${name},`,
    'Berikut tagihan yang belum lunas:',
    ...open.items.map((o) => `- ${o.order_no} (${date(o.date)}): sisa ${rp(o.remaining_amount)}${o.due_date ? `, jatuh tempo ${date(o.due_date)}` : ''}`),
    `Total: ${rp(total)}`,
    banks.length ? `Pembayaran ke: ${banks.join(' / ')}` : null,
    'Terima kasih. PT Paletindo Prakarsa Unggul',
  ]
    .filter(Boolean)
    .join('\n');

  const orderCols = [
    { key: 'order_no', label: 'No. Nota', render: (o) => <span className="mono">{o.order_no}</span> },
    { key: 'date', label: 'Tanggal', render: (o) => date(o.date) },
    { key: 'total_amount', label: 'Total', align: 'right', render: (o) => num(o.total_amount), total: true },
    { key: 'paid_amount', label: 'Dibayar', align: 'right', render: (o) => num(o.paid_amount), total: true },
    { key: 'remaining_amount', label: 'Sisa', align: 'right', render: (o) => <b>{num(o.remaining_amount)}</b>, total: true },
    {
      key: 'due_date',
      label: 'Jatuh Tempo',
      render: (o) => {
        const t = dueTone(o.due_date, o.remaining_amount);
        return o.due_date ? (
          <span className="row">
            {date(o.due_date)} <Badge tone={t.tone}>{t.label}</Badge>
          </span>
        ) : (
          ''
        );
      },
    },
    { key: 'status', label: 'Status', render: (o) => <StatusBadge map={ORDER_STATUS} value={o.status} /> },
    {
      key: 'act',
      label: '',
      sortable: false,
      render: (o) => (
        <Button size="sm" icon={CreditCard} onClick={() => setPayFor(o)}>
          Bayar
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Piutang', to: ['piutang'] }, { label: name }]}
        title={name}
        sub={phone}
        actions={
          open.items.length > 0 && (
            <a className="btn" href={waLink(phone, text)} target="_blank" rel="noreferrer">
              <MessageCircle /> Tagih via WA
            </a>
          )
        }
      />
      <div className="kpis">
        <Kpi label="Sisa tagihan" value={rp(total)} tone={total > 0 ? 'bad' : 'ok'} />
        <Kpi label="Nota belum lunas" value={num(open.items.length)} />
        {cust?.credit_limit > 0 && <Kpi label="Limit kredit" value={rp(cust.credit_limit)} tone={total > cust.credit_limit ? 'bad' : undefined} />}
      </div>
      <div className="stack">
        <Panel title="Nota belum lunas" bodyClass="">
          <DataTable autoHeight columns={orderCols} rows={open.items} loading={open.loading} onRowClick={(o) => navigate(['penjualan', o.id])} empty={<Empty title="Semua nota sudah lunas" />} />
        </Panel>
        <Panel title="Riwayat pembayaran" bodyClass="">
          <DataTable
            autoHeight
            rows={payments.items}
            loading={payments.loading}
            pageSize={20}
            empty={<Empty title="Belum ada pembayaran" />}
            columns={[
              { key: 'date', label: 'Tanggal', render: (p) => date(p.date) },
              { key: 'ref_no', label: 'No. Nota', render: (p) => <span className="mono">{p.ref_no}</span> },
              { key: 'method', label: 'Metode' },
              { key: 'note', label: 'Keterangan' },
              { key: 'recorded_by', label: 'Dicatat oleh' },
              { key: 'amount', label: 'Jumlah', align: 'right', render: (p) => num(p.amount), total: true },
            ]}
          />
        </Panel>
        {paidOrders.items.length > 0 && (
          <Panel title="Nota lunas (50 terakhir)" bodyClass="">
            <DataTable autoHeight columns={orderCols.filter((c) => c.key !== 'act' && c.key !== 'due_date')} rows={paidOrders.items} onRowClick={(o) => navigate(['penjualan', o.id])} pageSize={20} />
          </Panel>
        )}
      </div>
      {payFor && <PaymentDialog kind="customer" target={payFor} remaining={payFor.remaining_amount} title={`Pembayaran ${payFor.order_no}`} onClose={() => setPayFor(null)} />}
    </>
  );
}
