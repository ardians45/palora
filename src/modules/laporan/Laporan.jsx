// Laporan per periode: omzet per saluran, kas masuk/keluar, piutang & hutang, barang terlaris, nilai stok.
import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useRecords } from '../../lib/data';
import { replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, num, rp, today } from '../../lib/format';
import { CHANNEL_LABEL } from '../../lib/status';
import { Button, Field, Input, Kpi, PageHeader, Panel, Select } from '../../ui/core';
import DataTable from '../../ui/DataTable';

function presetRange(key) {
  const d = new Date();
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (key === 'hari') return [today(), today()];
  if (key === '7') return [today(-6), today()];
  if (key === 'bulan') return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), today()];
  if (key === 'lalu') return [iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), iso(new Date(d.getFullYear(), d.getMonth(), 0))];
  if (key === 'tahun') return [iso(new Date(d.getFullYear(), 0, 1)), today()];
  return null;
}

export default function Laporan() {
  const { query } = useRoute();
  const { products } = useSession();
  const preset = query.p || 'bulan';
  const [from, to] = preset === 'custom' ? [query.from || today(-30), query.to || today()] : presetRange(preset);
  const range = `date >= "${from}" && date <= "${to}"`;

  const orders = useRecords('sales_orders', { filter: `${range} && status != "batal"`, sort: 'date' });
  const payments = useRecords('payments', { filter: range, sort: 'date' });
  const openOrders = useRecords('sales_orders', { filter: 'remaining_amount > 0 && status != "batal"' });
  const invoices = useRecords('supplier_invoices', { filter: 'deleted = false' });

  const stats = useMemo(() => {
    const byChannel = {};
    const byDay = new Map();
    const byProduct = new Map();
    for (const o of orders.items) {
      const ch = o.channel || 'pesanan';
      byChannel[ch] = (byChannel[ch] || 0) + o.total_amount;
      const day = byDay.get(o.date) || { date: o.date, count: 0, total: 0, paid: 0 };
      day.count++;
      day.total += o.total_amount;
      day.paid += o.paid_amount;
      byDay.set(o.date, day);
      for (const it of o.items || []) {
        const k = String(it.productCode);
        const p = byProduct.get(k) || { code: k, name: it.name, qty: 0, total: 0 };
        p.qty += Number(it.qty) || 0;
        p.total += Number(it.total) || 0;
        byProduct.set(k, p);
      }
    }
    const cashIn = payments.items.filter((p) => p.kind === 'customer').reduce((s, p) => s + p.amount, 0);
    const cashOut = payments.items.filter((p) => p.kind === 'supplier').reduce((s, p) => s + p.amount, 0);
    const omzet = orders.items.reduce((s, o) => s + o.total_amount, 0);
    const receivable = openOrders.items.reduce((s, o) => s + o.remaining_amount, 0);
    const payable = invoices.items.reduce((s, i) => s + Math.max(0, i.total_amount - i.paid_amount), 0);
    const stockValue = products.reduce((s, p) => s + p.stock * (p.buy_price || 0), 0);
    return {
      byChannel,
      days: [...byDay.values()],
      top: [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 20),
      cashIn,
      cashOut,
      omzet,
      receivable,
      payable,
      stockValue,
    };
  }, [orders.items, payments.items, openOrders.items, invoices.items, products]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        orders.items.map((o) => ({
          Tanggal: o.date,
          'No. Nota': o.order_no,
          Saluran: CHANNEL_LABEL[o.channel] || 'Pesanan',
          Customer: o.customer,
          Total: o.total_amount,
          Dibayar: o.paid_amount,
          Sisa: o.remaining_amount,
          Status: o.status,
        }))
      ),
      'Penjualan'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(payments.items.map((p) => ({ Tanggal: p.date, Jenis: p.kind === 'customer' ? 'Masuk' : 'Keluar', Referensi: p.ref_no, Mitra: p.partner, Metode: p.method, Jumlah: p.amount }))),
      'Kas'
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stats.top.map((t) => ({ Kode: t.code, 'Nama Barang': t.name, Qty: t.qty, Nilai: t.total }))), 'Terlaris');
    XLSX.writeFile(wb, `Laporan Paletindo ${from} sd ${to}.xlsx`);
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Laporan' }]}
        title="Laporan"
        sub={`${date(from)} – ${date(to)}`}
        actions={
          <Button icon={Download} onClick={exportExcel}>
            Ekspor Excel
          </Button>
        }
      />
      <div className="table-tools">
        <Field label="Periode">
          <Select className="w-sm" value={preset} onChange={(e) => replaceQuery({ ...query, p: e.target.value })}>
            <option value="hari">Hari ini</option>
            <option value="7">7 hari terakhir</option>
            <option value="bulan">Bulan ini</option>
            <option value="lalu">Bulan lalu</option>
            <option value="tahun">Tahun ini</option>
            <option value="custom">Pilih tanggal...</option>
          </Select>
        </Field>
        {preset === 'custom' && (
          <>
            <Field label="Dari">
              <Input type="date" value={from} onChange={(e) => replaceQuery({ ...query, from: e.target.value })} />
            </Field>
            <Field label="Sampai">
              <Input type="date" value={to} onChange={(e) => replaceQuery({ ...query, to: e.target.value })} />
            </Field>
          </>
        )}
      </div>
      <div className="kpis">
        <Kpi label="Omzet (semua saluran)" value={rp(stats.omzet)} to={['penjualan']} />
        <Kpi label="Kas masuk" value={rp(stats.cashIn)} />
        <Kpi label="Kas keluar (bayar supplier)" value={rp(stats.cashOut)} />
        <Kpi label="Piutang saat ini" value={rp(stats.receivable)} to={['piutang']} />
        <Kpi label="Hutang saat ini" value={rp(stats.payable)} to={['hutang']} />
        <Kpi label="Nilai stok (harga modal)" value={rp(stats.stockValue)} to={['stok']} />
      </div>
      <div className="two-col">
        <Panel title="Omzet per saluran" bodyClass="">
          <table className="dt">
            <tbody>
              {['pesanan', 'kasir', 'marketplace'].map((ch) => (
                <tr key={ch}>
                  <td>{CHANNEL_LABEL[ch]}</td>
                  <td className="right">{num(stats.byChannel[ch] || 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="right">{num(stats.omzet)}</td>
              </tr>
            </tfoot>
          </table>
        </Panel>
        <Panel title="Barang terlaris" bodyClass="">
          <DataTable
            autoHeight
            pageSize={10}
            rows={stats.top}
            rowKey={(t) => t.code}
            loading={orders.loading}
            columns={[
              { key: 'code', label: 'Kode', render: (t) => <span className="mono">{t.code}</span> },
              { key: 'name', label: 'Nama Barang' },
              { key: 'qty', label: 'Qty', align: 'right', render: (t) => num(t.qty) },
              { key: 'total', label: 'Nilai', align: 'right', render: (t) => num(t.total) },
            ]}
          />
        </Panel>
      </div>
      <div className="mt-4">
        <Panel title="Penjualan per hari" bodyClass="">
          <DataTable
            autoHeight
            rows={stats.days}
            rowKey={(d) => d.date}
            loading={orders.loading}
            initialSort={{ key: 'date', dir: -1 }}
            columns={[
              { key: 'date', label: 'Tanggal', render: (d) => date(d.date) },
              { key: 'count', label: 'Transaksi', align: 'right', total: true },
              { key: 'total', label: 'Omzet', align: 'right', render: (d) => num(d.total), total: true },
              { key: 'paid', label: 'Sudah dibayar', align: 'right', render: (d) => num(d.paid), total: true },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
