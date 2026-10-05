// Router hash sederhana: #/penjualan/INV-xxx?tab=bayar
// Setiap halaman punya URL sendiri supaya bisa dibagikan lewat WA & tombol Back browser bekerja.
import { useEffect, useState } from 'react';

function read() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { path: `/${parts.join('/')}`, parts, query };
}

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Bangun URL hash dari potongan path + query. */
export function href(parts, query) {
  const p = (Array.isArray(parts) ? parts : String(parts).split('/'))
    .filter((x) => x !== '' && x !== undefined && x !== null)
    .map((x) => encodeURIComponent(String(x)))
    .join('/');
  const q = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v !== undefined && v !== null)).toString() : '';
  return `#/${p}${q ? `?${q}` : ''}`;
}

export function navigate(parts, query) {
  window.location.hash = href(parts, query).slice(1);
}

/** Ganti query tanpa menambah riwayat (dipakai filter/tab). */
export function replaceQuery(query) {
  const { parts } = read();
  window.history.replaceState(null, '', href(parts, query));
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
