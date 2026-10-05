import { describe, expect, it } from 'vitest';
import { COLLECTIONS, diffCollections, dueDateFromTerms, fromRecord, nextSequence, toRecord, userLabel } from '../src/lib/schema.js';

const P = COLLECTIONS.products;

describe('toRecord / fromRecord', () => {
  it('memetakan camelCase ke snake_case dan kembali tanpa kehilangan data', () => {
    const product = {
      id: 'PRD-0001',
      code: 'PLT-0001',
      name: 'Palet Merah',
      stock: 12,
      minStock: 5,
      buyPrice: 25520,
      sellPrice: 31900,
      modalLama: 24000, // tidak punya kolom -> masuk extra
    };
    const rec = toRecord(P, product);
    expect(rec).toMatchObject({ uid: 'PRD-0001', min_stock: 5, buy_price: 25520, extra: { modalLama: 24000 } });
    expect(rec.color).toBe(''); // kolom kosong diisi default

    const back = fromRecord(P, { ...rec, id: 'pbid123' });
    expect(back).toMatchObject(product);
    expect(back.id).toBe('PRD-0001');
  });

  it('mengubah input angka berbentuk string menjadi number', () => {
    expect(toRecord(P, { id: 'X', stock: '7' }).stock).toBe(7);
    expect(toRecord(P, { id: 'X', stock: 'abc' }).stock).toBe(0);
  });

  it('memakai nama kolom khusus (rename)', () => {
    const rec = toRecord(COLLECTIONS.stockMovements, { id: 'MV-1', productId: 'PRD-1', qty: -3 });
    expect(rec.product_uid).toBe('PRD-1');
    expect(fromRecord(COLLECTIONS.stockMovements, rec).productId).toBe('PRD-1');
  });

  it('tidak menyimpan field lokal (file & url)', () => {
    const rec = toRecord(COLLECTIONS.documents, { id: 'D', _file: {}, fileUrl: 'blob:x' });
    expect(rec.extra).toBeNull();
    const back = fromRecord(COLLECTIONS.documents, { ...rec, file: 'a.png' }, (_r, f) => `/files/${f}`);
    expect(back.fileUrl).toBe('/files/a.png');
  });
});

describe('diffCollections', () => {
  const base = [
    { id: 'A', code: 'A', name: 'A', stock: 10 },
    { id: 'B', code: 'B', name: 'B', stock: 5 },
  ];

  it('mendeteksi tambah, ubah, dan hapus', () => {
    const next = [
      { ...base[0], name: 'A2' },
      { id: 'C', code: 'C', name: 'C', stock: 1 },
    ];
    const ops = diffCollections(P, base, next);
    expect(ops).toEqual([
      { type: 'update', id: 'A', patch: { name: 'A2' }, deltas: {} },
      expect.objectContaining({ type: 'create', id: 'C' }),
      { type: 'remove', id: 'B' },
    ]);
  });

  it('perubahan stok dikirim sebagai selisih (delta), bukan nilai absolut', () => {
    const next = [{ ...base[0], stock: 7 }, base[1]];
    const ops = diffCollections(P, base, next);
    expect(ops).toEqual([{ type: 'update', id: 'A', patch: {}, deltas: { stock: -3 } }]);
  });

  it('objek yang sama persis tidak menghasilkan operasi', () => {
    expect(diffCollections(P, base, [...base])).toEqual([]);
    expect(diffCollections(P, base, base.map((x) => ({ ...x })))).toEqual([]);
  });

  it('koleksi append-only tidak pernah menghapus', () => {
    const ops = diffCollections(COLLECTIONS.systemLogs, [{ id: 'L1' }], []);
    expect(ops).toEqual([]);
  });

  it('menyertakan file baru untuk diupload', () => {
    const file = { name: 'sj.png' };
    const ops = diffCollections(COLLECTIONS.documents, [], [{ id: 'D1', title: 'SJ', _file: file }]);
    expect(ops[0].file).toBe(file);
  });
});

describe('helper lain', () => {
  it('nextSequence mengambil angka terbesar + 1 (aman walau ada data terhapus)', () => {
    const nos = ['PO-037/PIM/2026', 'PO-036/PIM/2026', 'PO-040/PIM/2026', 'lainnya'];
    expect(nextSequence(nos, /^PO-(\d+)\//)).toBe(41);
    expect(nextSequence([], /^PO-(\d+)\//, 38)).toBe(38);
  });

  it('jatuh tempo dihitung dari syarat bayar', () => {
    expect(dueDateFromTerms('Tempo 30 Hari', '2026-10-05')).toBe('2026-11-04');
    expect(dueDateFromTerms('Tempo 7 hari', '2026-10-05')).toBe('2026-10-12');
    expect(dueDateFromTerms('Transfer Bank', '2026-10-05')).toBe('2026-10-19'); // default 14 hari
  });

  it('userLabel sesuai format persona', () => {
    expect(userLabel({ name: 'Mas Heri', role: 'gudang' })).toBe('Mas Heri (Admin Gudang & POS)');
    expect(userLabel({ name: 'Pak Yanto', role: 'owner' })).toBe('Pak Yanto (Owner)');
  });
});
