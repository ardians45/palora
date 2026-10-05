import PocketBase from 'pocketbase';

// Default: server yang sama dengan halaman (production: PocketBase menyajikan frontend dari pb_public;
// development: Vite mem-proxy /api ke PocketBase, lihat vite.config.js).
// Bisa diganti lewat VITE_PB_URL kalau frontend & backend dipisah (mis. frontend di Vercel).
export const pb = new PocketBase(import.meta.env.VITE_PB_URL || window.location.origin);
pb.autoCancellation(false);

// Versi prototipe menyimpan semua data di localStorage (palora_*). Sekarang data ada di server,
// jadi sisa data lama dibersihkan supaya tidak membingungkan & tidak memakan ruang browser.
try {
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith('palora_'))
    .forEach((k) => window.localStorage.removeItem(k));
} catch {
  /* localStorage tidak tersedia (mode privat) */
}

/** Ubah error PocketBase menjadi pesan bahasa Indonesia yang jelas (NFR 7.4). */
export function errorMessage(err) {
  if (!err) return 'Terjadi kesalahan.';
  const status = err.status ?? err.response?.status;
  if (status === 0) {
    return 'Tidak bisa terhubung ke server PALORA. Cek koneksi internet / pastikan server gudang menyala.';
  }
  if (status === 401) return 'Sesi login sudah habis. Silakan login ulang.';
  if (status === 403) return err.response?.message?.startsWith('Akun') ? err.response.message : 'Akun Anda tidak punya akses untuk aksi ini.';
  // PocketBase menjawab 404 juga saat updateRule menolak
  if (status === 404) return 'Data tidak ditemukan, atau akun Anda tidak punya akses untuk mengubahnya.';

  const fields = err.response?.data;
  if (fields && typeof fields === 'object' && Object.keys(fields).length) {
    const details = Object.entries(fields)
      .map(([field, info]) => {
        if (info?.code === 'validation_not_unique') return `${field}: sudah dipakai, gunakan nomor/kode lain`;
        return `${field}: ${info?.message || 'tidak valid'}`;
      })
      .join('\n');
    // aturan API yang menolak (mis. mencoba ubah stok langsung) muncul tanpa detail field
    return `Data tidak bisa disimpan:\n${details}`;
  }
  const msg = err.response?.message || err.message;
  if (status === 400 && /Failed to (create|update)/i.test(msg || '')) {
    return 'Data ditolak server. Kemungkinan akun Anda tidak punya akses untuk mengubah data ini.';
  }
  return msg || 'Terjadi kesalahan.';
}

export const fileUrl = (record, filename) => pb.files.getURL(record, filename);
