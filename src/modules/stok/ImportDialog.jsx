// Import / update master barang dari Excel. Baca kolom dengan nama yang fleksibel,
// tampilkan preview, lalu kirim ke server dalam satu transaksi.
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { mapRows } from '../../lib/importers';
import { action } from '../../lib/data';
import { useSession } from '../../lib/session';
import { num } from '../../lib/format';
import { Button, FilePick } from '../../ui/core';
import { Dialog, useToast } from '../../ui/feedback';

export default function ImportDialog({ onClose }) {
  const { products } = useSession();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const read = async (f) => {
    setFile(f);
    setErr('');
    setParsed(null);
    if (!f) return;
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      const res = mapRows(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      if (!res.columns.code) return setErr('Kolom "Kode" tidak ditemukan. Pastikan baris pertama berisi judul kolom (Kode, Nama Barang, Qty, Harga Jual, ...).');
      if (res.rows.length === 0) return setErr('Tidak ada baris barang yang terbaca.');
      setParsed(res);
    } catch (ex) {
      setErr(`File tidak bisa dibaca: ${ex.message}`);
    }
  };

  const codes = new Set(products.map((p) => String(p.code)));
  const newCount = parsed ? parsed.rows.filter((r) => !codes.has(String(r.code))).length : 0;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await action('products/import', { rows: parsed.rows });
      toast.ok(`Import selesai: ${res.created} barang baru, ${res.updated} diperbarui`);
      onClose();
    } catch (ex) {
      setErr(ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Import Barang dari Excel" onClose={onClose} wide>
      <div className="dialog-body">
        <p className="small muted">
          Baris pertama = judul kolom. Kolom yang dikenali: Kode (wajib), Nama Barang, Kelompok, Warna, Ukuran, Satuan, Qty, Harga Jual, Harga Modal, Stok Minimum, Keterangan.
          Kolom yang tidak ada / kosong tidak mengubah data lama. Bila Qty diisi, selisihnya tercatat sebagai mutasi "Import Excel".
        </p>
        <FilePick value={file} onChange={read} accept=".xlsx,.xls,.csv" label="Pilih file Excel" onError={setErr} maxMB={10} />
        {parsed && (
          <>
            <div className="alert info">
              {num(parsed.rows.length)} baris terbaca: {num(newCount)} barang baru, {num(parsed.rows.length - newCount)} diperbarui. Kolom: {Object.values(parsed.columns).join(', ')}
            </div>
            <div className="table-wrap auto-h">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th className="right">Qty</th>
                    <th className="right">Harga Jual</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{String(r.code)}</td>
                      <td>{r.name}</td>
                      <td className="right">{r.stock === undefined ? '-' : num(r.stock)}</td>
                      <td className="right">{r.sell_price === undefined ? '-' : num(r.sell_price)}</td>
                      <td>{codes.has(String(r.code)) ? 'Diperbarui' : 'Baru'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.rows.length > 8 && <p className="small muted">...dan {parsed.rows.length - 8} baris lainnya</p>}
          </>
        )}
        {err && <div className="alert error">{err}</div>}
      </div>
      <div className="dialog-foot">
        <Button onClick={onClose}>Batal</Button>
        <Button variant="primary" busy={busy} disabled={!parsed} onClick={submit}>
          Import {parsed ? `${parsed.rows.length} baris` : ''}
        </Button>
      </div>
    </Dialog>
  );
}
