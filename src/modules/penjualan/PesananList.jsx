import React, { useMemo } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { useRecords } from '../../lib/data';
import { useRoute, navigate, replaceQuery } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, num } from '../../lib/format';
import { ORDER_STATUS, CHANNEL_LABEL, dueTone, shipProgress } from '../../lib/status';
import { Badge, Empty, Input, LinkButton, PageHeader, Select, StatusBadge, Tabs } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';

const TABS = [
  { key: 'semua', label: 'Semua', test: () => true },
  { key: 'baru', label: 'Menunggu DP', test: (o) => o.status === 'baru' },
  { key: 'dp', label: 'DP Diterima', test: (o) => o.status === 'dp' && !o.release_approved },
  {
    key: 'siap',
    label: 'Siap Keluar',
    test: (o) => o.status === 'lunas' || (o.release_approved && (o.status === 'baru' || o.status === 'dp')),
  },
  { key: 'keluar', label: 'Dikirim / Diambil', test: (o) => o.status === 'dikirim' || o.status === 'diambil' },
  { key: 'selesai', label: 'Selesai', test: (o) => o.status === 'selesai' },
  { key: 'batal', label: 'Dibatalkan', test: (o) => o.status === 'batal' },
];

export default function PesananList() {
  const { query } = useRoute();
  const { can } = useSession();
  const tab = query.tab || 'semua';
  const channel = query.ch || '';
  const search = query.q || '';
  const { items, loading, error, reload } = useRecords('sales_orders', { sort: '-date,-created' });

  const base = useMemo(
    () => items.filter((o) => (!channel || o.channel === channel) && matchText(o, search, ['order_no', 'customer', 'po_customer_ref', 'marketplace_order_no'])),
    [items, channel, search]
  );
  const rows = base.filter(TABS.find((t) => t.key === tab)?.test || (() => true));

  const columns = [
    { key: 'order_no', label: 'No. Nota', render: (o) => <span className="mono">{o.order_no}</span> },
    { key: 'date', label: 'Tanggal', render: (o) => <span className="nowrap">{date(o.date)}</span> },
    { key: 'customer', label: 'Customer' },
    { key: 'channel', label: 'Saluran', render: (o) => CHANNEL_LABEL[o.channel] || 'Pesanan' },
    { key: 'total_amount', label: 'Total', align: 'right', render: (o) => num(o.total_amount), total: true },
    { key: 'paid_amount', label: 'Dibayar', align: 'right', render: (o) => num(o.paid_amount), total: true },
    {
      key: 'remaining_amount',
      label: 'Sisa',
      align: 'right',
      render: (o) => (o.status === 'batal' ? '-' : <span className={o.remaining_amount > 0 ? 'strong' : 'muted'}>{num(o.remaining_amount)}</span>),
      value: (o) => (o.status === 'batal' ? 0 : o.remaining_amount),
      total: true,
    },
    {
      key: 'due_date',
      label: 'Jatuh Tempo',
      render: (o) => {
        if (o.status === 'batal' || !(o.remaining_amount > 0) || !o.due_date) return '';
        const d = dueTone(o.due_date, o.remaining_amount);
        return <Badge tone={d.tone}>{date(o.due_date)}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (o) => (
        <span className="row">
          <StatusBadge map={ORDER_STATUS} value={o.status} />
          {o.release_approved && ['baru', 'dp'].includes(o.status) && <Badge tone="warn">Izin Owner</Badge>}
          {o.status !== 'batal' && shipProgress(o).partial && <Badge tone="info">Keluar sebagian</Badge>}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Penjualan' }]}
        title="Pesanan"
        actions={
          can('owner', 'gudang') && (
            <>
              <LinkButton to={['kasir']} icon={ShoppingCart}>
                Kasir
              </LinkButton>
              <LinkButton to={['penjualan', 'baru']} variant="primary" icon={Plus}>
                Pesanan Baru
              </LinkButton>
            </>
          )
        }
      />
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari no. nota, customer, PO customer..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari pesanan" />
        <Select value={channel} onChange={(e) => replaceQuery({ ...query, ch: e.target.value })} aria-label="Saluran" className="w-sm">
          <option value="">Semua saluran</option>
          <option value="pesanan">Pesanan</option>
          <option value="kasir">Kasir</option>
          <option value="marketplace">Marketplace</option>
        </Select>
      </div>
      <Tabs tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: base.filter(t.test).length }))} value={tab} onChange={(k) => replaceQuery({ ...query, tab: k })} />
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(o) => navigate(['penjualan', o.id])}
        empty={
          search || tab !== 'semua' || channel ? (
            <Empty title="Tidak ada pesanan yang cocok" />
          ) : (
            <Empty
              title="Belum ada pesanan"
              action={can('owner', 'gudang') && <LinkButton to={['penjualan', 'baru']} variant="primary" icon={Plus}>Buat pesanan pertama</LinkButton>}
            />
          )
        }
      />
    </>
  );
}
