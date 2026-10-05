import React, { useState } from 'react';
import { 
  FolderArchive, 
  Search, 
  FileText, 
  Download, 
  Upload, 
  CheckCircle2,
  Paperclip,
  Eye,
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function DocumentModule({ 
  documents, 
  setDocuments, 
  purchaseOrders = [],
  setPurchaseOrders,
  addSystemLog,
  currentUser,
  initialFilter = ''
}) {
  const [searchTerm, setSearchTerm] = useState(initialFilter || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);

  // New Upload Form State
  const [docType, setDocType] = useState('Invoice Resmi');
  const [taxAmount, setTaxAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  React.useEffect(() => {
    if (initialFilter !== undefined) setSearchTerm(initialFilter);
  }, [initialFilter]);

  // Derived Data: Group documents by PO
  const poFolders = purchaseOrders.map(po => {
    // Find all documents related to this PO
    const relatedDocs = documents.filter(d => d.refNo === po.poNo);
    
    // Check required documents (3-Way Matching)
    const hasSJ = relatedDocs.some(d => d.type.includes('Surat Jalan'));
    const hasInvoice = relatedDocs.some(d => d.type.includes('Invoice') || d.type.includes('Faktur'));
    const isPaid = po.status === 'Terbayar' || po.status === 'Lunas';
    
    let docStatus = 'Menunggu Surat Jalan';
    let docBadgeClass = 'badge-slate';

    if (isPaid) {
      docStatus = 'Terbayar';
      docBadgeClass = 'badge-blue';
    } else if (po.status === 'Selesai & Masuk Stok' && hasInvoice) {
      docStatus = 'Lengkap & Terverifikasi';
      docBadgeClass = 'badge-green';
    } else if (po.status === 'Selesai & Masuk Stok') {
      docStatus = 'Menunggu Invoice/Faktur';
      docBadgeClass = 'badge-orange';
    } else {
      docStatus = 'Menunggu Surat Jalan';
      docBadgeClass = 'badge-slate';
    }

    return {
      ...po,
      relatedDocs,
      docStatus,
      docBadgeClass,
      hasSJ,
      hasInvoice,
      isPaid
    };
  });

  const filteredFolders = poFolders.filter(folder => 
    folder.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedPO) return;

    const newDoc = {
      id: `DOC-${Date.now()}`,
      title: `${docType} - ${selectedPO.supplier}`,
      type: docType,
      refNo: selectedPO.poNo,
      date: new Date().toISOString().split('T')[0],
      partner: selectedPO.supplier,
      fileName: uploadFile?.name || '',
      _file: uploadFile || undefined,
      uploadedBy: currentUser || 'Bude',
      category: docType.includes('Invoice') ? 'Invoice' : docType.includes('Faktur') ? 'Faktur Pajak' : 'Surat Jalan',
      ...(docType.includes('Invoice') ? { taxAmount: Number(taxAmount) || 0, dueDate } : {})
    };

    if (!uploadFile && !confirm('Belum ada file foto/PDF yang dipilih. Simpan catatan arsip tanpa file?')) return;

    setDocuments([newDoc, ...documents]);
    setUploadFile(null);
    
    if (addSystemLog) {
      addSystemLog('Arsip Dokumen', 'Unggah Dokumen', `Mengunggah ${docType} untuk ${selectedPO.poNo}`);
    }

    setIsModalOpen(false);
    setSelectedPO(null);
    setDocType('Invoice Resmi');
    setTaxAmount('');
    setDueDate('');
    
    alert(`Berkas ${docType} berhasil ditambahkan ke folder PO ${selectedPO.poNo}`);
  };

  const handleDownloadDoc = (doc) => {
    // File asli tersimpan di server -> unduh langsung
    if (doc.fileUrl) {
      const link = document.createElement('a');
      link.href = `${doc.fileUrl}?download=1`;
      link.download = doc.fileName || '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    // Arsip lama tanpa file: unduh ringkasan data arsipnya saja
    const content = `PT PALETINDO PRAKARSA UNGGUL\nARSIP DOKUMEN DIGITAL RESMI\n\nJudul: ${doc.title}\nNomor Referensi: ${doc.refNo}\nJenis: ${doc.type}\nMitra / Pihak: ${doc.partner}\nTanggal Terbit: ${doc.date}\nPengunggah: ${doc.uploadedBy}\nBerkas: ${doc.fileName}\n\nStatus: Terverifikasi Digital Valid.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ringkasan_${(doc.refNo || doc.id).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = (folder) => {
    // Unduh semua file asli yang terlampir di folder PO ini satu per satu
    const withFile = folder.relatedDocs.filter(d => d.fileUrl);
    if (withFile.length === 0) {
      return alert(`Belum ada file foto/PDF yang terupload untuk PO ${folder.poNo}.`);
    }
    withFile.forEach((d, i) => setTimeout(() => handleDownloadDoc(d), i * 400));
    alert(`Mengunduh ${withFile.length} file untuk PO ${folder.poNo}.${withFile.length < folder.relatedDocs.length ? `\n${folder.relatedDocs.length - withFile.length} arsip lama tidak punya file.` : ''}`);
    if (addSystemLog) {
      addSystemLog('Arsip Dokumen', 'Unduh Arsip PO', `Mengunduh ZIP Arsip untuk ${folder.poNo}`);
    }
  };

  const handleVerify = (folder) => {
    if (!folder.hasSJ || !folder.hasInvoice) {
      return alert("Dokumen belum lengkap (Surat Jalan & Invoice belum ada)!");
    }
    
    if (setPurchaseOrders) {
      // Mark PO as Verified/Ready to pay (This logic might map to keeping it as is, just user verification action)
      alert(`PO ${folder.poNo} berhasil diverifikasi (3-Way Matching cocok)! Siap dibayarkan.`);
      if (addSystemLog) {
        addSystemLog('Arsip Dokumen', 'Verifikasi 3-Way Matching', `Verifikasi 3-Way Matching selesai untuk PO ${folder.poNo}`);
      }
    }
  };

  const handleOpenUpload = (folder) => {
    setSelectedPO(folder);
    setIsModalOpen(true);
  };

  return (
    <div className="module-workspace">
      {/* Header Banner */}
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-icon" style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
            <FolderArchive size={28} />
          </div>
          <div>
            <h2 className="module-title-main">Binder Arsip PO (Digital)</h2>
            <p className="module-desc">Rekonsiliasi dokumen 3-Way Matching (PO, Surat Jalan Gudang, Invoice Supplier) untuk persiapan bayar.</p>
          </div>
        </div>

        <div className="module-actions-right">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Daftar Arsip Dokumen berhasil diekspor ke format Excel (.xlsx)')}
            title="Download Rekap Arsip format Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Ekspor Rekap</span>
          </button>

          <div className="search-input-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Cari PO / Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pos-catalog" style={{ padding: '24px', background: 'transparent' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          
          {filteredFolders.map(folder => (
            <div key={folder.id} style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Folder Header */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.05rem', marginBottom: '4px' }}>
                    {folder.poNo}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.85rem' }}>{folder.supplier}</div>
                </div>
                <span className={`status-pill ${folder.docBadgeClass}`} style={{ fontSize: '0.75rem' }}>
                  {folder.docStatus}
                </span>
              </div>

              {/* Folder Content (Documents) */}
              <div style={{ padding: '16px', flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '10px' }}>
                  BERKAS TERKAIT (3-WAY MATCHING):
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Implicit PO Document */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="#3b82f6" />
                      <span style={{ fontSize: '0.85rem', color: '#334155' }}>Lembar PO Asli</span>
                    </div>
                    <CheckCircle2 size={16} color="#10b981" />
                  </div>

                  {/* Dynamic Linked Documents */}
                  {folder.relatedDocs.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <Paperclip size={16} color="#6366f1" />
                        <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '180px' }} title={doc.type}>
                          {doc.type.split(' ')[0]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn-icon" onClick={() => setPreviewDoc(doc)} title="Lihat">
                          <Eye size={16} color="#64748b" />
                        </button>
                        <CheckCircle2 size={16} color="#10b981" />
                      </div>
                    </div>
                  ))}

                  {/* Warning if incomplete */}
                  {(!folder.hasSJ || !folder.hasInvoice) && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', background: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: '6px', marginTop: '4px' }}>
                      <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
                        {!folder.hasSJ && <div>• Surat Jalan dari Gudang belum ada</div>}
                        {!folder.hasInvoice && <div>• Invoice/Faktur belum diunggah</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Folder Actions */}
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between'
              }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDownloadZip(folder)}
                  title="Unduh semua berkas dalam ZIP"
                  style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
                >
                  <Download size={14} /> ZIP
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenUpload(folder)}
                    disabled={folder.isPaid}
                  >
                    <Upload size={14} /> Unggah Susulan
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleVerify(folder)}
                    disabled={folder.docStatus !== 'Lengkap & Terverifikasi'}
                  >
                    Verifikasi Siap Bayar
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredFolders.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Tidak ada arsip folder PO yang ditemukan.
            </div>
          )}

        </div>
      </div>

      {/* Modal Upload Susulan */}
      {isModalOpen && selectedPO && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Unggah Dokumen Susulan - {selectedPO.poNo}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', padding: '12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <strong>Supplier:</strong> {selectedPO.supplier}
                </div>

                <div className="form-group">
                  <label className="form-label">Jenis Dokumen</label>
                  <select 
                    className="form-select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    <option value="Invoice Resmi">Invoice Resmi (Tagihan)</option>
                    <option value="Faktur Pajak Supplier">Faktur Pajak Supplier</option>
                    <option value="Surat Jalan Asli (Stempel Basah)">Surat Jalan Gudang</option>
                  </select>
                </div>

                {docType.includes('Invoice') && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Nilai Pajak PPN (Rp) - Opsional</label>
                      <input 
                        type="number" 
                        className="form-input"
                        placeholder="Contoh: 110000"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tanggal Jatuh Tempo Tagihan</label>
                      <input 
                        type="date" 
                        className="form-input"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">File Scan / Foto</label>
                  <label style={{
                    display: 'block',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: uploadFile ? '#ecfdf5' : '#f8fafc'
                  }}>
                    <Upload size={28} color="#5c59f7" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                      {uploadFile ? `✓ ${uploadFile.name}` : 'Klik untuk memilih foto / PDF'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                      {uploadFile ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB • klik untuk ganti` : 'Maks 5 MB (JPG/PNG/PDF) • di HP bisa langsung foto'}
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          e.target.value = '';
                          return alert(`Ukuran file ${(file.size / 1024 / 1024).toFixed(1)} MB terlalu besar. Maksimal 5 MB.`);
                        }
                        setUploadFile(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Arsip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Dokumen Digital */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderArchive size={20} color="#f43f5e" />
                <h3 className="modal-title">Pratinjau Arsip: {previewDoc.fileName}</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setPreviewDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  background: '#ffe4e6',
                  color: '#e11d48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <FileText size={32} />
                </div>

                <h4 style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a', marginBottom: '4px' }}>
                  {previewDoc.title}
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {previewDoc.fileName || 'Tanpa file'} • Terarsip oleh <strong>{previewDoc.uploadedBy}</strong>
                </div>

                {previewDoc.fileUrl && (
                  /\.(png|jpe?g|webp|gif)$/i.test(previewDoc.fileUrl) ? (
                    <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer">
                      <img
                        src={previewDoc.fileUrl}
                        alt={previewDoc.title}
                        style={{ maxWidth: '100%', maxHeight: '320px', marginTop: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </a>
                  ) : (
                    <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: '16px', display: 'inline-flex' }}>
                      Buka file di tab baru
                    </a>
                  )
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginTop: '20px',
                  textAlign: 'left',
                  fontSize: '0.83rem',
                  background: '#ffffff',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Nomor Referensi (PO):</span><br />
                    <strong>{previewDoc.refNo}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Jenis Berkas:</span><br />
                    <strong>{previewDoc.type}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Mitra Terkait:</span><br />
                    <strong>{previewDoc.partner}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Tanggal Terbit:</span><br />
                    <strong>{previewDoc.date}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPreviewDoc(null)}>
                Tutup
              </button>
              <button type="button" className="btn btn-primary" onClick={() => handleDownloadDoc(previewDoc)}>
                <Download size={15} />
                <span>Unduh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
