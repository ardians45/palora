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


// --- File dilindungi (dokumen, bukti bayar, invoice, surat jalan) ---------------------------------
// File itu hanya bisa dibuka dengan file token (berlaku ~2 menit). Token di-cache sebentar dan
// diambil ulang otomatis. fileUrl() memberi URL + token yang masih segar; link yang sudah terlanjur
// lama di layar ditangani pencegat klik di bawah (ambil token baru lalu buka file).
let fileToken = { value: '', at: 0 };
const TOKEN_TTL_MS = 60 * 1000;

export async function getFileToken() {
  if (!pb.authStore.isValid) return '';
  if (fileToken.value && Date.now() - fileToken.at < TOKEN_TTL_MS) return fileToken.value;
  fileToken = { value: await pb.files.getToken(), at: Date.now() };
  return fileToken.value;
}

const withToken = (url, token) => (token && url ? url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token) : url);

/** URL file (sinkron). Menyertakan token bila ada yang masih segar; sisanya diurus pencegat klik. */
export const fileUrl = (record, filename, opts) => {
  const url = pb.files.getURL(record, filename, opts);
  return Date.now() - fileToken.at < TOKEN_TTL_MS ? withToken(url, fileToken.value) : url;
};

/** URL file dengan token segar (async), untuk kode yang butuh URL pasti valid. */
export async function fileUrlAsync(record, filename, opts) {
  return withToken(pb.files.getURL(record, filename, opts), await getFileToken());
}

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (ev) => {
      const a = ev.target instanceof Element ? ev.target.closest('a[href*="/api/files/"]') : null;
      if (!a || ev.defaultPrevented || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
      if (/[?&]thumb=/.test(a.href)) return;
      ev.preventDefault();
      // Buka tab dulu (sinkron) supaya tidak diblokir popup blocker, lalu isi alamatnya setelah token siap.
      const blank = a.target === '_blank' ? window.open('', '_blank') : null;
      const url = a.href.replace(/([?&])token=[^&]*&?/, '$1').replace(/[?&]$/, '');
      pb.files
        .getToken()
        .then((t) => {
          fileToken = { value: t, at: Date.now() };
          const target = withToken(url, t);
          if (blank) blank.location.href = target;
          else window.location.href = target;
        })
        .catch(() => {
          if (blank) blank.close();
          window.alert('Tidak bisa membuka file. Silakan login ulang lalu coba lagi.');
        });
    },
    true
  );
}
