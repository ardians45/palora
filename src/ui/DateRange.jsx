// Filter tanggal untuk daftar dokumen ("hari ini PO apa saja"): disimpan di URL (?from=&to=) supaya bisa dibagikan.
import React from 'react';
import { replaceQuery } from '../lib/router';
import { today } from '../lib/format';
import { Input, Select } from './core';

const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

export function rangeOf(key) {
  const d = new Date();
  if (key === 'hari') return [today(), today()];
  if (key === '7') return [today(-6), today()];
  if (key === 'bulan') return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), today()];
  if (key === 'lalu') return [iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), iso(new Date(d.getFullYear(), d.getMonth(), 0))];
  return ['', ''];
}

const PRESETS = [
  { value: '', label: 'Semua tanggal' },
  { value: 'hari', label: 'Hari ini' },
  { value: '7', label: '7 hari terakhir' },
  { value: 'bulan', label: 'Bulan ini' },
  { value: 'lalu', label: 'Bulan lalu' },
  { value: 'pilih', label: 'Pilih tanggal...' },
];

export default function DateRange({ query }) {
  const preset = query.d || (query.from || query.to ? 'pilih' : '');
  const pick = (key) => {
    if (key === 'pilih') return replaceQuery({ ...query, d: 'pilih', from: query.from || today(), to: query.to || today() });
    const [from, to] = rangeOf(key);
    replaceQuery({ ...query, d: key, from, to });
  };
  return (
    <>
      <Select className="w-sm" value={preset} onChange={(e) => pick(e.target.value)} options={PRESETS} aria-label="Filter tanggal" />
      {preset === 'pilih' && (
        <>
          <Input className="w-xs" type="date" value={query.from || ''} onChange={(e) => replaceQuery({ ...query, from: e.target.value })} aria-label="Dari tanggal" />
          <span className="muted">s/d</span>
          <Input className="w-xs" type="date" value={query.to || ''} onChange={(e) => replaceQuery({ ...query, to: e.target.value })} aria-label="Sampai tanggal" />
        </>
      )}
    </>
  );
}
