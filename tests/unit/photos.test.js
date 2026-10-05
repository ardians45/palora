// Pastikan foto & perbaikan nama barang konsisten dengan data stok asli (tidak asal pasang).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PALETINDO_FULL_STOCK } from '../../backend/seed/products.js';
import { NAME_FIXES, colorFromName, fixColor } from '../../backend/seed/product-names.js';

const DIR = path.resolve('backend/seed/foto-produk');
const { models } = JSON.parse(readFileSync(path.join(DIR, 'mapping.json'), 'utf8'));
const byCode = new Map(PALETINDO_FULL_STOCK.map((p) => [String(p.code), p]));

describe('pemetaan foto barang', () => {
  it('setiap file foto ada dan berupa gambar', () => {
    for (const m of models) {
      const file = path.join(DIR, m.file);
      expect(existsSync(file), m.file).toBe(true);
      const head = readFileSync(file).subarray(0, 4).toString('hex');
      expect(['ffd8ffe0', 'ffd8ffe1', 'ffd8ffdb', '89504e47'].some((h) => head.startsWith(h.slice(0, 6))), `${m.file} bukan JPG/PNG`).toBe(true);
    }
  });

  it('setiap kode ada di data stok dan tidak dipasang dua foto berbeda', () => {
    const seen = new Map();
    for (const m of models) {
      for (const code of m.codes) {
        expect(byCode.has(code), `${code} tidak ada di stok`).toBe(true);
        expect(seen.has(code), `${code} dipetakan ke ${seen.get(code)} dan ${m.file}`).toBe(false);
        seen.set(code, m.file);
      }
      expect(m.source_url).toMatch(/^https:\/\/www\.paletindo\.com\//);
      expect(m.reason.length).toBeGreaterThan(5);
    }
  });

  it('satu foto hanya untuk satu kelompok barang (model yang sama)', () => {
    for (const m of models) {
      const groups = new Set(m.codes.map((c) => byCode.get(c).jsonCategory));
      expect(groups.size, `${m.file}: ${[...groups].join(', ')}`).toBe(1);
    }
  });
});

describe('perbaikan nama barang', () => {
  it('hanya menambah konteks: nama asli tetap utuh di dalam nama baru', () => {
    for (const [code, fix] of Object.entries(NAME_FIXES)) {
      const p = byCode.get(code);
      expect(p, code).toBeTruthy();
      const original = (p.cleanName || p.name).replace('( Medium )', '(Medium)');
      expect(fix.name.toLowerCase()).toContain(original.toLowerCase());
    }
  });

  it('tidak ada lagi barang (bukan merek campuran) yang namanya cuma warna', () => {
    const colorOnly = /^(green|peach|blue|violet|magenta|grey trans\/ \w+|orange dk grey|orange\/ dk grey)$/i;
    const left = PALETINDO_FULL_STOCK.filter((p) => colorOnly.test((p.cleanName || '').trim()) && !NAME_FIXES[p.code]);
    expect(left.map((p) => `${p.code} ${p.cleanName}`)).toEqual([]);
  });
});

describe('kolom warna', () => {
  it('ambil kata warna di akhir nama, kosong bila tidak ada', () => {
    expect(colorFromName('SS - 800 Green')).toBe('Green');
    expect(colorFromName('SS - 270 ( met blue )')).toBe('met blue');
    expect(colorFromName('TB - 4700 (DL 700) Black Transp')).toBe('Black Transp');
    expect(colorFromName('ember putih 4 L')).toBe('');
    expect(colorFromName('Tipe 7001 Krat gelas 25')).toBe('');
  });

  it('warna yang sudah benar tidak diubah', () => {
    expect(fixColor('Palet FUTARI FP 0303 Merah', 'Merah')).toBe('Merah');
    expect(fixColor('SS - 800 Green', 'SS - 800 Green')).toBe('Green');
  });

  it('setelah diperbaiki tidak ada lagi warna = nama lengkap (kecuali nama memang hanya warna)', () => {
    const left = PALETINDO_FULL_STOCK.filter((p) => {
      const c = fixColor(p.cleanName, p.color);
      return c && c === p.cleanName && colorFromName(p.cleanName) !== p.cleanName;
    });
    expect(left.map((p) => p.cleanName)).toEqual([]);
  });
});
