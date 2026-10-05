// Stok barang: meniru "Stok Stok.xlsx" Sheet1 (No · Nama Barang · Qty · Harga Jual · Total · Keterangan),
// dikelompokkan per kelompok/merek dengan judul tebal seperti di Excel.
import React, { useMemo, useState } from 'react';
import { Download, Plus, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useRecords } from '../../lib/data';
import { navigate, replaceQuery, useRoute } from '../../lib/router';
import { useSession } from '../../lib/session';
import { date, num, numOrDash, today } from '../../lib/format';
import { Button, Empty, Input, PageHeader, Select } from '../../ui/core';
import DataTable, { matchText } from '../../ui/DataTable';
import ProductDialog from './ProductDialog';
import ImportDialog from './ImportDialog';
import ProductPhoto from '../../ui/ProductPhoto';

export function reservedByCode(orders) {
  const map = new Map();
  for (const o of orders) {
    for (const it of o.items || []) map.set(String(it.productCode), (map.get(String(it.productCode)) || 0) + (Number(it.qty) || 0));
  }
  return map;
}

export default function StokList() {
  const { query } = useRoute();
  const { products, productsLoading, productsError, reloadProducts, can } = useSession();
  const openOrders = useRecords('sales_orders', { filter: 'status = "baru" || status = "dp" || status = "lunas"', sort: '-created' });
  const [dlg, setDlg] = useState(null);
  const search = query.q || '';
  const group = query.g || '';
  const f = query.f || '';
  const grouped = query.flat !== '1';
  const isOwner = can('owner');

  const reserved = useMemo(() => reservedByCode(openOrders.items), [openOrders.items]);
  const groups = useMemo(() => [...new Set(products.map((p) => p.group_name || 'Lainnya'))].sort((a, b) => a.localeCompare(b, 'id')), [products]);
  const lastUpdate = useMemo(() => products.reduce((m, p) => (p.updated > m ? p.updated : m), ''), [products]);

  const rows = products.filter(
    (p) =>
      (!group || (p.group_name || 'Lainnya') === group) &&
      (f !== 'menipis' || (p.min_stock > 0 && p.stock <= p.min_stock)) &&
      (f !== 'habis' || p.stock <= 0) &&
      matchText(p, search, ['code', 'name', 'color', 'size', 'group_name', 'factory'])
  );

  const columns = [
    { key: 'photo', label: 'Foto', sortable: false, cellClass: 'photo-cell', render: (p) => <ProductPhoto product={p} /> },
    { key: 'code', label: 'Kode', render: (p) => <span className="mono">{p.code}</span> },
    { key: 'name', label: 'Nama Barang' },
    { key: 'color', label: 'Warna' },
    {
      key: 'stock',
      label: 'Qty',
      align: 'right',
      render: (p) => <span className={p.min_stock > 0 && p.stock <= p.min_stock ? 'text-bad strong' : ''}>{numOrDash(p.stock)}</span>,
      total: true,
    },
    { key: 'reserved', label: 'Dipesan', align: 'right', value: (p) => reserved.get(String(p.code)) || 0, render: (p) => numOrDash(reserved.get(String(p.code))), total: true },
    { key: 'sell_price', label: 'Harga Jual', align: 'right', render: (p) => numOrDash(p.sell_price) },
    ...(isOwner ? [{ key: 'buy_price', label: 'Harga Modal', align: 'right', render: (p) => numOrDash(p.buy_price) }] : []),
    { key: 'total', label: 'Total', align: 'right', value: (p) => p.stock * p.sell_price, render: (p) => numOrDash(p.stock * p.sell_price), total: true },
    { key: 'notes', label: 'Keterangan', render: (p) => <span className="small">{p.notes}</span> },
  ];

  const exportExcel = () => {
    const data = rows.map((p, i) => ({
      No: i + 1,
      Kelompok: p.group_name,
      Kode: p.code,
      'Nama Barang': p.name,
      Warna: p.color,
      Ukuran: p.size,
      Satuan: p.unit,
      Qty: p.stock,
      'Harga Jual': p.sell_price,
      ...(isOwner ? { 'Harga Modal': p.buy_price } : {}),
      Total: p.stock * p.sell_price,
      'Stok Minimum': p.min_stock,
      Keterangan: p.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok');
    XLSX.writeFile(wb, `Stock Barang Jadi Paletindo ${today()}.xlsx`);
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Stok Gudang' }]}
        title="Stock Barang Jadi Paletindo"
        sub={lastUpdate ? `Update ${date(lastUpdate)}` : ''}
        actions={
          <>
            <Button icon={Download} onClick={exportExcel}>
              Ekspor Excel
            </Button>
            {can('owner', 'gudang') && (
              <>
                <Button icon={Upload} onClick={() => setDlg('import')}>
                  Import Excel
                </Button>
                <Button variant="primary" icon={Plus} onClick={() => setDlg('new')}>
                  Tambah Barang
                </Button>
              </>
            )}
          </>
        }
      />
      <div className="table-tools">
        <Input className="search" type="search" placeholder="Cari kode, nama, warna, ukuran..." value={search} onChange={(e) => replaceQuery({ ...query, q: e.target.value })} aria-label="Cari barang" autoFocus />
        <Select className="w-md" value={group} onChange={(e) => replaceQuery({ ...query, g: e.target.value })} aria-label="Kelompok">
          <option value="">Semua kelompok ({groups.length})</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Select className="w-sm" value={f} onChange={(e) => replaceQuery({ ...query, f: e.target.value })} aria-label="Filter stok">
          <option value="">Semua stok</option>
          <option value="menipis">Stok menipis</option>
          <option value="habis">Stok habis</option>
        </Select>
        <label className="check">
          <input type="checkbox" checked={grouped} onChange={(e) => replaceQuery({ ...query, flat: e.target.checked ? '' : '1' })} />
          Kelompokkan seperti Excel
        </label>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={productsLoading}
        error={productsError}
        onRetry={reloadProducts}
        groupBy={grouped ? (p) => p.group_name || 'Lainnya' : undefined}
        groupTotal="stock"
        onRowClick={(p) => navigate(['stok', p.id])}
        totalLabel="Total semua"
        empty={<Empty title={search || group || f ? 'Tidak ada barang yang cocok' : 'Belum ada barang'} />}
      />
      <p className="small muted mt-2">
        Qty merah = di bawah stok minimum. "Dipesan" = sudah ada pesanan tapi barang belum keluar. Total {num(rows.length)} barang.
      </p>
      {dlg === 'new' && <ProductDialog onClose={() => setDlg(null)} />}
      {dlg === 'import' && <ImportDialog onClose={() => setDlg(null)} />}
    </>
  );
}
