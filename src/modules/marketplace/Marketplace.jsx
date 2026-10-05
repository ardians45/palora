// Import laporan penjualan marketplace (Shopee/Tokopedia/TikTok/Lazada/Blibli):
// baca file -> preview -> cocokkan SKU yang belum dikenal (diingat untuk berikutnya) -> potong stok.
// Pesanan yang sudah pernah diimpor otomatis dilewati.
import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseReport } from '../../lib/importers';
import { action, useRecords } from '../../lib/data';
import { useSession } from '../../lib/session';
import { dateTime, num, rp } from '../../lib/format';
import { Button, Empty, Field, FilePick, PageHeader, Panel, Select } from '../../ui/core';
import DataTable from '../../ui/DataTable';
import { ProductCombo } from '../../ui/LineItems';
import { useToast } from '../../ui/feedback';

export const STORES = ['Shopee 1', 'Shopee 2', 'Shopee 3', 'Tokopedia 1', 'Tokopedia 2', 'TikTok Shop', 'Lazada', 'Blibli'];

export default function Marketplace() {
  const { products } = useSession();
  const toast = useToast();
  const history = useRecords('marketplace_imports', { sort: '-created', limit: 50 });
  const [store, setStore] = useState(STORES[0]);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setPreview(null);
    setMapping({});
    setErr('');
  };

  const check = async (rows, maps = mapping) => {
    const res = await action('marketplace/import', { store, rows, mappings: maps, dry_run: true });
    setPreview(res);
    return res;
  };

  const read = async (f) => {
    reset();
    setFile(f);
    if (!f) return;
    setBusy(true);
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      const res = parseReport(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      if (res.missing.length) {
        setErr(`Kolom tidak ditemukan: ${res.missing.join(', ')}. Pastikan file adalah laporan pesanan dari Seller Center (bukan laporan keuangan).`);
        return;
      }
      if (res.rows.length === 0) {
        setErr('Tidak ada pesanan yang bisa diimpor di file ini.');
        return;
      }
      setParsed(res);
      await check(res.rows, {});
    } catch (ex) {
      setErr(ex?.response?.message || `File tidak bisa dibaca: ${ex.message}`);
    } finally {
      setBusy(false);
    }
  };

  const unknownSkus = preview?.unknown ? [...new Map(preview.unknown.map((u) => [u.sku, u])).values()] : [];
  const unmapped = unknownSkus.filter((u) => !mapping[u.sku]);

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      const res = await action('marketplace/import', { store, file_name: file?.name, rows: parsed.rows, mappings: mapping });
      toast.ok(`${res.created} pesanan ${store} diimpor, ${num(res.item_count)} barang keluar${res.skipped.length ? `, ${res.skipped.length} sudah pernah diimpor` : ''}`);
      reset();
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  const orderCount = parsed ? new Set(parsed.rows.map((r) => r.order_no)).size : 0;
  const skippedCount = preview?.skipped?.length || 0;

  return (
    <>
      <PageHeader crumbs={[{ label: 'Marketplace' }]} title="Import Penjualan Marketplace" sub="Potong stok dari laporan Seller Center" />
      <div className="stack">
        <Panel title="1. Pilih toko & file laporan">
          <div className="form-grid">
            <Field label="Toko">
              <Select value={store} onChange={(e) => { setStore(e.target.value); reset(); }} options={STORES} />
            </Field>
            <Field label="File laporan pesanan (.xlsx / .csv)" hint="Download dari Seller Center: Pesanan Saya -> Export, pilih rentang tanggal">
              <FilePick value={file} onChange={read} accept=".xlsx,.xls,.csv" label="Pilih file" maxMB={20} onError={setErr} />
            </Field>
          </div>
          {err && <div className="alert error mt-3">{err}</div>}
        </Panel>

        {parsed && preview && (
          <Panel title="2. Periksa">
            <div className="stack">
              <div className="alert info">
                {num(orderCount)} pesanan ({num(parsed.rows.length)} baris barang) terbaca.
                {parsed.skipped ? ` ${parsed.skipped} baris batal/retur dilewati.` : ''}
                {skippedCount ? ` ${skippedCount} pesanan sudah pernah diimpor dan akan dilewati.` : ''}
              </div>
              {unknownSkus.length > 0 && (
                <>
                  <div className="alert warn">
                    {unknownSkus.length} SKU marketplace belum dikenal. Cocokkan dengan kode barang (cukup sekali, akan diingat untuk import berikutnya).
                  </div>
                  <table className="lines">
                    <thead>
                      <tr>
                        <th>SKU di {store}</th>
                        <th>Nama di marketplace</th>
                        <th>Kode barang Paletindo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unknownSkus.map((u) => {
                        const p = products.find((x) => String(x.code) === mapping[u.sku]);
                        return (
                          <tr key={u.sku}>
                            <td className="mono">{u.sku}</td>
                            <td>{u.name}</td>
                            <td>
                              <ProductCombo products={products} value={p ? `${p.code} · ${p.name}` : ''} onPick={(prod) => setMapping((m) => ({ ...m, [u.sku]: String(prod.code) }))} placeholder="Pilih barang..." />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
              <div className="table-wrap auto-h">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>No. Pesanan</th>
                      <th>Tanggal</th>
                      <th>SKU</th>
                      <th>Nama</th>
                      <th className="right">Qty</th>
                      <th className="right">Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 15).map((r, i) => (
                      <tr key={i} className={preview.skipped?.includes(r.order_no) ? 'muted' : ''}>
                        <td className="mono">{r.order_no}</td>
                        <td>{r.date}</td>
                        <td className="mono">{r.sku}</td>
                        <td>{r.name}</td>
                        <td className="right">{num(r.qty)}</td>
                        <td className="right">{num(r.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 15 && <p className="small muted">...dan {parsed.rows.length - 15} baris lainnya</p>}
              <div className="actions">
                <Button onClick={reset}>Batal</Button>
                <Button variant="primary" icon={Upload} busy={busy} disabled={unmapped.length > 0 || orderCount - skippedCount <= 0} onClick={submit}>
                  {unmapped.length > 0 ? `Cocokkan ${unmapped.length} SKU dulu` : `Import ${orderCount - skippedCount} pesanan & potong stok`}
                </Button>
              </div>
            </div>
          </Panel>
        )}

        <Panel title="Riwayat import" bodyClass="">
          <DataTable
            autoHeight
            rows={history.items}
            loading={history.loading}
            empty={<Empty title="Belum pernah import" />}
            columns={[
              { key: 'created', label: 'Waktu', render: (h) => dateTime(h.created) },
              { key: 'store', label: 'Toko' },
              { key: 'file_name', label: 'File' },
              { key: 'order_count', label: 'Pesanan', align: 'right' },
              { key: 'item_count', label: 'Barang', align: 'right', render: (h) => num(h.item_count) },
              { key: 'total_amount', label: 'Nilai', align: 'right', render: (h) => rp(h.total_amount) },
              { key: 'imported_by', label: 'Oleh' },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

