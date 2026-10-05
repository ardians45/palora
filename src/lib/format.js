// Format angka, uang, tanggal, terbilang: satu tempat untuk semua modul.

const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** 2871000 -> "2.871.000" (tanpa "Rp", seperti Excel mereka) */
export const num = (v) => nf.format(Math.round(Number(v) || 0));

/** 2871000 -> "Rp 2.871.000"; minus -> "-Rp 50.000" */
export const rp = (v) => {
  const n = Math.round(Number(v) || 0);
  return (n < 0 ? '-Rp ' : 'Rp ') + nf.format(Math.abs(n));
};

/** Excel: nol ditampilkan "-" */
export const numOrDash = (v) => (Math.round(Number(v) || 0) === 0 ? '-' : num(v));

/** "1.250.000" / "1250000" / "1,5" -> angka */
export function parseNum(text) {
  if (typeof text === 'number') return text;
  const s = String(text ?? '').trim();
  if (!s) return NaN;
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return clean === '' || clean === '-' ? NaN : Number(clean);
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function parts(value) {
  if (!value) return null;
  const s = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  // Timestamp PocketBase (UTC, "2026-10-05 02:15:38.422Z") -> waktu lokal
  if (/Z$|[+-]\d\d:?\d\d$/.test(s) || /\.\d+Z?$/.test(s)) {
    const d = new Date(s.replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) {
      return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
    }
  }
  return { y: +m[1], mo: +m[2] - 1, d: +m[3], h: m[4] ? +m[4] : null, mi: m[5] ? +m[5] : null };
}

/** "2026-10-05" -> "05 Okt 2026" */
export function date(value) {
  const p = parts(value);
  if (!p) return value ? String(value) : '-';
  return `${String(p.d).padStart(2, '0')} ${BULAN[p.mo]} ${p.y}`;
}

/** "2026-10-05" -> "5 Oktober 2026" (untuk dokumen cetak) */
export function dateLong(value) {
  const p = parts(value);
  if (!p) return '';
  return `${p.d} ${BULAN_PANJANG[p.mo]} ${p.y}`;
}

/** "2026-05-23" -> "23 MEI 2026" (gaya surat jalan kertas) */
export const dateUpper = (value) => dateLong(value).toUpperCase();

/** Timestamp -> "05 Okt 2026 14:32" (waktu lokal) */
export function dateTime(value) {
  const p = parts(value);
  if (!p) return '-';
  const t = p.h === null ? '' : ` ${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
  return `${String(p.d).padStart(2, '0')} ${BULAN[p.mo]} ${p.y}${t}`;
}

/** Tanggal hari ini menurut jam komputer (bukan UTC) -> "YYYY-MM-DD" */
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Selisih hari dari hari ini (positif = masih ke depan) */
export function daysFromToday(value) {
  const p = parts(value);
  if (!p) return null;
  const a = new Date(p.y, p.mo, p.d);
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 86400000);
}

/** "Tempo 30 Hari" -> tanggal + 30 hari; tanpa angka -> 14 hari */
export function dueDateFromTerms(terms, fromDate = today(), defaultDays = 14) {
  const m = String(terms || '').match(/(\d+)\s*hari/i);
  const days = m ? Number(m[1]) : defaultDays;
  const p = parts(fromDate) || parts(today());
  const d = new Date(p.y, p.mo, p.d + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Terbilang (Indonesia), untuk nota/invoice
// ---------------------------------------------------------------------------
const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function words(n) {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${words(n - 10)} belas`;
  if (n < 100) return `${words(Math.floor(n / 10))} puluh ${words(n % 10)}`;
  if (n < 200) return `seratus ${words(n - 100)}`;
  if (n < 1000) return `${words(Math.floor(n / 100))} ratus ${words(n % 100)}`;
  if (n < 2000) return `seribu ${words(n - 1000)}`;
  if (n < 1e6) return `${words(Math.floor(n / 1000))} ribu ${words(n % 1000)}`;
  if (n < 1e9) return `${words(Math.floor(n / 1e6))} juta ${words(n % 1e6)}`;
  if (n < 1e12) return `${words(Math.floor(n / 1e9))} miliar ${words(n % 1e9)}`;
  return `${words(Math.floor(n / 1e12))} triliun ${words(n % 1e12)}`;
}

/** 2871000 -> "Dua Juta Delapan Ratus Tujuh Puluh Satu Ribu Rupiah" */
export function terbilang(value) {
  const n = Math.round(Math.abs(Number(value) || 0));
  if (n === 0) return 'Nol Rupiah';
  const text = words(n).replace(/\s+/g, ' ').trim();
  return `${text.replace(/\b\w/g, (c) => c.toUpperCase())} Rupiah`;
}

/** Nomor WhatsApp Indonesia: "0812-3456-7890" -> "6281234567890"; nomor kantor (021) -> null */
export function waNumber(phone) {
  const candidates = String(phone || '').split(/[/,;]| atau /i);
  for (const c of candidates) {
    let d = c.replace(/\D/g, '');
    if (d.startsWith('0')) d = `62${d.slice(1)}`;
    if (/^628\d{7,12}$/.test(d)) return d;
  }
  return null;
}

export const waLink = (phone, text) => {
  const n = waNumber(phone);
  const q = `text=${encodeURIComponent(text)}`;
  return n ? `https://wa.me/${n}?${q}` : `https://wa.me/?${q}`;
};
