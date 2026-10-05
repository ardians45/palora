// Halaman cetak dokumen resmi (dibuka di tab baru, langsung muncul dialog print).
// Kop & logo: PT Paletindo Prakarsa Unggul. Surat jalan meniru form kertas asli (A5).
import React, { useEffect, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useRecord } from '../lib/data';
import { useSession } from '../lib/session';
import { date, dateLong, dateUpper, num, rp, terbilang, today } from '../lib/format';
import { Button, ErrorBox, Loading } from '../ui/core';

function Kop({ s, compact }) {
  return (
    <div className="kop">
      <img src="/paletindo-logo.svg" alt="" className="kop-logo" />
      <div>
        <div className="kop-name">{(s?.company_name || 'PT Paletindo Prakarsa Unggul').toUpperCase()}</div>
        {!compact && s?.tagline && <div className="kop-line">{s.tagline}</div>}
        {s?.address && <div className="kop-line">{s.address}</div>}
        <div className="kop-line">
          {[s?.phone && `Telp: ${s.phone}`, s?.fax && `Fax: ${s.fax}`, s?.email && `E-mail: ${s.email}`].filter(Boolean).join('   ')}
        </div>
        {!compact && s?.npwp && <div className="kop-line">NPWP: {s.npwp}</div>}
      </div>
    </div>
  );
}

function Sign({ title, name }) {
  return (
    <div className="sign">
      <div>{title}</div>
      <div className="sign-space" />
      {name ? <div className="sign-name">( {name} )</div> : <div className="sign-line" />}
    </div>
  );
}

function useAutoPrint(ready) {
  useEffect(() => {
    // ?preview=1 = hanya lihat (tanpa dialog print otomatis)
    if (!ready || window.location.hash.includes('preview=1')) return undefined;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [ready]);
}

function Toolbar({ title }) {
  return (
    <div className="print-toolbar no-print">
      <span>{title}</span>
      <div className="actions">
        <Button variant="primary" icon={Printer} onClick={() => window.print()}>
          Cetak / Simpan PDF
        </Button>
        <Button onClick={() => window.close()}>Tutup</Button>
      </div>
    </div>
  );
}

const addressLines = (text) =>
  String(text || '')
    .split(/,\s*|\n/)
    .reduce((lines, part) => {
      const last = lines[lines.length - 1];
      if (last !== undefined && (last + ', ' + part).length <= 42) lines[lines.length - 1] = `${last}, ${part}`;
      else lines.push(part);
      return lines;
    }, [])
    .slice(0, 3);

// ---------------------------------------------------------------------------
export function SuratJalanPrint({ id }) {
  const { settings } = useSession();
  const { item: d, loading, error } = useRecord('deliveries', id);
  useAutoPrint(!!d && !!settings);
  if (loading && !d) return <Loading />;
  if (error || !d) return <ErrorBox error={error} />;
  const items = d.items || [];
  return (
    <div className="print-root page-sj">
      <Toolbar title={`Surat Jalan ${d.sj_no}`} />
      <div className="paper paper-a5">
        <div className="sj-head">
          <Kop s={settings} compact />
          <div className="sj-to">
            <div className="sj-date">{dateUpper(d.date)}</div>
            <div className="sj-kepada">Kepada</div>
            <div className="sj-line strong">{d.customer}</div>
            {addressLines(d.destination).map((l, i) => (
              <div key={i} className="sj-line">
                {l}
              </div>
            ))}
          </div>
        </div>
        <div className="sj-no">
          No. <span className="sj-line-inline">{d.sj_no}</span>
        </div>
        <p className="sj-intro">Kami kirimkan barang-barang tersebut di bawah ini :</p>
        <table className="pt sj-table">
          <thead>
            <tr>
              <th className="q">QUANTITY</th>
              <th>ITEM BARANG</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="q">
                  {num(it.qty)} {it.unit && it.unit !== 'pcs' ? it.unit : ''}
                </td>
                <td>
                  {it.name.toUpperCase()}
                  {it.color && !it.name.toLowerCase().includes(String(it.color).toLowerCase()) ? ` - ${String(it.color).toUpperCase()}` : ''}
                </td>
              </tr>
            ))}
            <tr className="sj-meta">
              <td />
              <td>
                {d.po_customer_ref && <div>PO #: {d.po_customer_ref}</div>}
                {d.up_person && <div>UP. {d.up_person.toUpperCase()}</div>}
                {d.destination && <div>KIRIM KE : {d.destination.toUpperCase()}</div>}
                {d.order_no && <div className="muted-print">Ref. nota: {d.order_no}</div>}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="signs three">
          <Sign title="Penerima" />
          <Sign title="Mengetahui" name={settings?.signer_name} />
          <Sign title="Pengirim" name={d.driver_name} />
        </div>
        {d.vehicle_plate && <div className="print-foot">Kendaraan: {d.vehicle_plate}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function NotaPrint({ id, kind }) {
  const { settings } = useSession();
  const { item: o, loading, error } = useRecord('sales_orders', id);
  useAutoPrint(!!o && !!settings);
  if (loading && !o) return <Loading />;
  if (error || !o) return <ErrorBox error={error} />;
  const isInvoice = kind === 'invoice';
  const lunas = o.remaining_amount <= 0;
  const banks = settings?.bank_accounts || [];
  return (
    <div className="print-root page-a4">
      <Toolbar title={`${isInvoice ? 'Invoice' : 'Nota'} ${o.order_no}`} />
      <div className="paper paper-a4">
        <div className="doc-head">
          <Kop s={settings} />
          <div className="doc-title">
            <h1>{isInvoice ? 'INVOICE' : 'NOTA'}</h1>
            <table className="kv">
              <tbody>
                <tr>
                  <td>No.</td>
                  <td>{o.order_no}</td>
                </tr>
                <tr>
                  <td>Tanggal</td>
                  <td>{dateLong(o.date)}</td>
                </tr>
                {isInvoice && o.due_date && (
                  <tr>
                    <td>Jatuh tempo</td>
                    <td>{dateLong(o.due_date)}</td>
                  </tr>
                )}
                {o.po_customer_ref && (
                  <tr>
                    <td>PO</td>
                    <td>{o.po_customer_ref}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="parties">
          <div>
            <div className="label">Kepada Yth.</div>
            <b>{o.customer}</b>
            {o.up_person && <div>UP. {o.up_person}</div>}
            {o.destination && <div>{o.destination}</div>}
            {o.customer_phone && <div>{o.customer_phone}</div>}
          </div>
          <div className="right">
            <div className="label">Pembayaran</div>
            <div>{o.payment_type || '-'}</div>
            {lunas ? <div className="stamp">LUNAS</div> : null}
          </div>
        </div>
        <table className="pt">
          <thead>
            <tr>
              <th className="n">No</th>
              <th>Nama Barang</th>
              <th className="r">Qty</th>
              <th className="r">Harga</th>
              <th className="r">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(o.items || []).map((it, i) => (
              <tr key={i}>
                <td className="n">{i + 1}</td>
                <td>
                  {it.name}
                  {it.color && !it.name.toLowerCase().includes(String(it.color).toLowerCase()) ? ` - ${it.color}` : ''}
                </td>
                <td className="r">
                  {num(it.qty)} {it.unit}
                </td>
                <td className="r">{num(it.price)}</td>
                <td className="r">{num(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="sum-row">
          <div className="terbilang">
            <div className="label">Terbilang</div>
            <i>{terbilang(o.total_amount)}</i>
            {banks.length > 0 && (
              <div className="banks">
                <div className="label">Pembayaran transfer ke</div>
                {banks.map((b, i) => (
                  <div key={i}>
                    {b.bank} {b.number} a.n. {b.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <table className="kv sum">
            <tbody>
              {o.tax_mode && o.tax_mode !== 'none' && (
                <>
                  <tr>
                    <td>Subtotal</td>
                    <td className="r">{num(o.subtotal)}</td>
                  </tr>
                  <tr>
                    <td>PPN{o.tax_mode === 'include' ? ' (termasuk)' : ''}</td>
                    <td className="r">{num(o.tax_amount)}</td>
                  </tr>
                </>
              )}
              <tr className="grand">
                <td>Total</td>
                <td className="r">{rp(o.total_amount)}</td>
              </tr>
              {o.paid_amount > 0 && !lunas && (
                <>
                  <tr>
                    <td>Sudah dibayar (DP)</td>
                    <td className="r">{num(o.paid_amount)}</td>
                  </tr>
                  <tr className="grand">
                    <td>Sisa</td>
                    <td className="r">{rp(o.remaining_amount)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        {o.notes && <p className="note">Catatan: {o.notes}</p>}
        <div className="signs two">
          <Sign title="Penerima" />
          <Sign title={`${settings?.city || 'Tangerang Selatan'}, ${dateLong(o.date)}`} name={settings?.signer_name || o.created_by} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function POPrint({ id }) {
  const { settings } = useSession();
  const { item: po, loading, error } = useRecord('purchase_orders', id);
  useAutoPrint(!!po && !!settings);
  if (loading && !po) return <Loading />;
  if (error || !po) return <ErrorBox error={error} />;
  const items = po.items || [];
  return (
    <div className="print-root page-a4">
      <Toolbar title={`PO ${po.po_no}`} />
      <div className="paper paper-a4">
        <Kop s={settings} />
        <div className="po-title">
          <h1>PURCHASE ORDER {po.supplier.toUpperCase()}</h1>
          <div className="po-meta">
            <span>No: {po.po_no}</span>
            {po.up_person && <span>Up : {po.up_person}</span>}
          </div>
        </div>
        <table className="pt bordered">
          <thead>
            <tr>
              <th className="n">No</th>
              <th>Tipe</th>
              <th>Ukuran</th>
              <th>Warna</th>
              <th className="r">Harga</th>
              <th className="r">Qty</th>
              <th className="r">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="n">{i + 1}</td>
                <td>{it.name}</td>
                <td>{it.size}</td>
                <td>{it.color}</td>
                <td className="r">{num(it.price)}</td>
                <td className="r">{num(it.qty)}</td>
                <td className="r">{num(it.total)}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => (
              <tr key={`e${i}`} className="empty-line">
                <td colSpan={7} />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="r strong">
                Total
              </td>
              <td className="r strong">{num(po.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
        {po.notes && <p className="note">Catatan: {po.notes}</p>}
        <div className="signs right-only">
          <Sign title={`${(settings?.city || 'Tangerang').split(' ')[0]}, ${dateLong(po.date)}`} name={settings?.company_name || 'PT Paletindo Prakarsa Unggul'} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function OpnamePrint({ group }) {
  const { settings, products } = useSession();
  const rows = useMemo(() => products.filter((p) => !group || (p.group_name || 'Lainnya') === group), [products, group]);
  useAutoPrint(products.length > 0 && !!settings);
  const groups = [...new Set(rows.map((p) => p.group_name || 'Lainnya'))];
  let no = 0;
  return (
    <div className="print-root page-a4">
      <Toolbar title="Lembar Hitung Stok Opname" />
      <div className="paper paper-a4">
        <Kop s={settings} compact />
        <div className="po-title">
          <h1>LEMBAR HITUNG STOK OPNAME</h1>
          <div className="po-meta">
            <span>Kelompok: {group || 'Semua barang'}</span>
            <span>Tanggal: {date(today())}</span>
          </div>
        </div>
        <table className="pt bordered">
          <thead>
            <tr>
              <th className="n">No</th>
              <th>Kode</th>
              <th>Nama Barang</th>
              <th>Warna</th>
              <th className="r">Hitung Fisik</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <React.Fragment key={g}>
                <tr className="group">
                  <td colSpan={6}>{g}</td>
                </tr>
                {rows
                  .filter((p) => (p.group_name || 'Lainnya') === g)
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="n">{++no}</td>
                      <td>{p.code}</td>
                      <td>{p.name}</td>
                      <td>{p.color}</td>
                      <td className="write" />
                      <td className="write wide" />
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div className="signs two">
          <Sign title="Dihitung oleh" />
          <Sign title="Diperiksa oleh" />
        </div>
      </div>
    </div>
  );
}
