import React from 'react';
import { Printer, X, Download, CheckCircle2 } from 'lucide-react';

export default function PrintModal({ isOpen, onClose, documentType, data }) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box" 
        style={{ maxWidth: '820px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={20} color="#5c59f7" />
            <h3 className="modal-title">
              Pratinjau Cetak: {documentType === 'sj' ? 'Surat Jalan Resmi' : documentType === 'po' ? 'Surat Purchase Order (PO)' : 'Nota Penjualan / Faktur'}
            </h3>
          </div>
          <button 
            className="btn btn-secondary btn-icon"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Paper Canvas */}
        <div style={{ padding: '24px', background: '#e2e8f0', maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="print-paper" id="printable-document">
            {/* Kop Surat Resmi Paletindo */}
            <div className="letterhead">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src="/logo-paletindo.png" alt="Logo Paletindo" className="print-kop-logo" />
                <div>
                  <h1 className="letterhead-title">PALETINDO INTI MAKMUR</h1>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e3a8a', marginBottom: '2px' }}>
                    PT. PALETINDO PRAKARSA UNGGUL
                  </div>
                  <p className="letterhead-sub">
                    Distributor Resmi Palet Plastik, Box Logistik, Krat Industri & Part Case Futari<br />
                    Griya Asri Kampung Baru Blok A8 No. 3, RT 023 RW 006, Jelupang, Serpong Utara, Tangerang Selatan 15323<br />
                    Telp: (021) 2917 7157 | Fax: (021) 537 4295 | Email: paletindointimakmur@yahoo.co.id | NPWP: 03.138.965.1-607.1000
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ 
                  display: 'inline-block', 
                  border: '2px solid #1e3a8a', 
                  padding: '5px 14px', 
                  fontWeight: '800', 
                  fontSize: '0.88rem',
                  color: '#1e3a8a',
                  borderRadius: '4px',
                  letterSpacing: '0.04em'
                }}>
                  {documentType === 'sj' ? 'SURAT JALAN (DO)' : documentType === 'po' ? 'PURCHASE ORDER' : 'FAKTUR PAJAK / NOTA'}
                </span>
                <div style={{ fontSize: '0.82rem', color: '#0f172a', marginTop: '6px', fontWeight: '700' }}>
                  No: {data.sjNo || data.poNo || data.orderNo}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Tanggal: {data.date}
                </div>
                {data.taxInvoiceNo && (
                  <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '2px' }}>
                    e-Faktur: {data.taxInvoiceNo}
                  </div>
                )}
              </div>
            </div>

            {/* Document Specific Header Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '18px', fontSize: '0.85rem', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <strong>Kepada Yth:</strong><br />
                <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  {data.customer || data.supplier}
                </span><br />
                {data.upPerson && (
                  <span style={{ color: '#475569' }}>UP: <strong>{data.upPerson}</strong><br /></span>
                )}
                {data.poCustomerRef && (
                  <span style={{ color: '#1e3a8a', fontSize: '0.78rem' }}>PO Ref: <strong>{data.poCustomerRef}</strong><br /></span>
                )}
                <span style={{ color: '#475569' }}>
                  Kirim ke: <strong>{data.destination || data.address || 'Gudang / Lokasi Pemesan'}</strong>
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                {documentType === 'sj' && (
                  <>
                    <strong>Informasi Pengiriman:</strong><br />
                    <span>Supir: <strong>{data.driverName || 'Armada Paletindo'}</strong></span><br />
                    <span>Kendaraan: <strong>{data.vehiclePlate || 'B 9482 PPU (Grandmax)'}</strong></span><br />
                    <span>Status: <strong style={{ color: '#16a34a' }}>{data.status}</strong></span>
                  </>
                )}
                {documentType === 'po' && (
                  <>
                    <strong>Informasi Pesanan Pabrik:</strong><br />
                    <span>Estimasi Tiba: <strong>{data.expectedDate || 'Sesuai Jadwal Pabrik'}</strong></span><br />
                    <span>Dibuat Oleh: <strong>{data.createdBy || 'Pak Yanto'}</strong></span><br />
                    <span>Syarat: <strong>Ambil armada supir Paletindo</strong></span>
                  </>
                )}
                {documentType === 'sales' && (
                  <>
                    <strong>Status Pembayaran & Pajak:</strong><br />
                    <span style={{ 
                      color: data.remainingAmount === 0 ? '#16a34a' : '#ea580c',
                      fontWeight: '800'
                    }}>
                      {data.paymentStatus}
                    </span><br />
                    <span>DP Masuk: {formatRupiah(data.dpAmount)}</span><br />
                    <span>Sisa Tagihan: <strong style={{ color: data.remainingAmount > 0 ? '#dc2626' : '#16a34a' }}>{formatRupiah(data.remainingAmount)}</strong></span>
                  </>
                )}
              </div>
            </div>

            {documentType === 'sj' && (
              <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '12px', fontStyle: 'italic' }}>
                Kami kirimkan barang-barang tersebut di bawah ini :
              </div>
            )}

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <th style={{ padding: '8px', textAlign: 'center', width: '40px' }}>No</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Kode & Nama Barang</th>
                  <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Jumlah</th>
                  {documentType !== 'sj' && (
                    <>
                      <th style={{ padding: '8px', textAlign: 'right', width: '120px' }}>Harga Satuan</th>
                      <th style={{ padding: '8px', textAlign: 'right', width: '140px' }}>Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <strong>{item.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Kode: {item.productCode || '-'}</div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '800' }}>
                      {item.qty} {item.unit || 'pcs'}
                    </td>
                    {documentType !== 'sj' && (
                      <>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {formatRupiah(item.price || item.buyPrice || 0)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700' }}>
                          {formatRupiah(item.total || ((item.price || item.buyPrice || 0) * item.qty))}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Section for PO / Nota / Faktur */}
            {documentType !== 'sj' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <div style={{ width: '320px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>Dasar Pengenaan Pajak (DPP):</span>
                    <strong>{formatRupiah(data.dppAmount || Math.round((data.totalAmount || 0) / 1.11))}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#0284c7' }}>
                    <span>PPN (11%):</span>
                    <strong>{formatRupiah(data.ppnAmount || Math.round(((data.totalAmount || 0) / 1.11) * 0.11))}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1.5px solid #0f172a', fontWeight: '800', fontSize: '0.92rem' }}>
                    <span>Total Tagihan Resmi:</span>
                    <strong style={{ color: '#1e3a8a' }}>{formatRupiah(data.totalAmount || 0)}</strong>
                  </div>
                  {data.dpAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#16a34a' }}>
                      <span>Sudah Bayar DP:</span>
                      <strong>{formatRupiah(data.dpAmount)}</strong>
                    </div>
                  )}
                  {data.remainingAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#dc2626', borderTop: '1px dashed #cbd5e1' }}>
                      <span>Sisa Pelunasan:</span>
                      <strong>{formatRupiah(data.remainingAmount)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {data.notes && (
              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem', color: '#4b5563', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <strong>Catatan / Ketentuan:</strong> {data.notes}
              </div>
            )}

            {/* Signature Box (Format Resmi Paletindo: Penerima, Mengetahui Suryanto, Pengirim) */}
            <div className="doc-signatures">
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Penerima Barang,</span>
                <div className="sign-box">
                  {data.signedBy ? (
                    <div style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.78rem' }}>
                      ✓ {data.signedBy}
                    </div>
                  ) : (
                    '( Tanda Tangan & Stempel Toko )'
                  )}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Mengetahui,</span>
                <div className="sign-box" style={{ border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: '700', marginBottom: '2px' }}>
                    [ CAP STEMPEL RESMI ]
                  </div>
                  ( Suryanto - Direktur )
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Pengirim / Supir,</span>
                <div className="sign-box">
                  ( {data.driverName || 'Supir PT Paletindo'} )
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Tutup
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Cetak Dokumen Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
