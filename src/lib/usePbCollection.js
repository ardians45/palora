// Hook pengganti useState+localStorage: data dibaca dari PocketBase, diperbarui realtime,
// dan setiap perubahan lokal otomatis disimpan ke server.
//
// API-nya sama dengan useState -> komponen modul cukup memanggil setProducts(...) seperti biasa:
//   const [products, setProducts] = usePbCollection('products', enabled)
//   setProducts(prev => prev.map(...))                       // update / tambah
//   setProducts(products.filter(...), { allowRemove: true }) // hapus (soft delete)
//
// Cara kerja penyimpanan:
// - Selisih (diff) state lama vs baru diubah jadi operasi create/update/soft-delete.
// - Stok & piutang dikirim sebagai selisih ke /api/palora/increment (atomik di server).
// - Semua operasi dari semua koleksi lewat SATU antrean berurutan. Operasi yang dibuat dalam
//   satu aksi pengguna (satu tick JS) dianggap satu "batch": kalau satu gagal, sisa batch
//   dibatalkan dan data dimuat ulang dari server supaya tampilan kembali sesuai kenyataan.
import { useCallback, useEffect, useRef, useState } from 'react';
import { pb, errorMessage, fileUrl } from './pb';
import { COLLECTIONS, diffCollections, fromRecord } from './schema';
import { applyOp } from './syncOps';

const DEFAULT_SORT = {
  products: 'uid',
  customers: 'name',
  suppliers: 'name',
};

// ---------------------------------------------------------------------------
// Antrean global & batch per aksi
// ---------------------------------------------------------------------------
let chain = Promise.resolve();
let currentBatch = null;
const reloaders = new Map(); // key koleksi -> fungsi muat ulang
const listeners = new Set(); // pemberitahuan status simpan (untuk indikator UI)
let pending = 0;

function notify() {
  listeners.forEach((fn) => fn(pending));
}

export function onSyncStatus(fn) {
  listeners.add(fn);
  fn(pending);
  return () => listeners.delete(fn);
}

function batch() {
  if (!currentBatch) {
    currentBatch = { failed: false, keys: new Set() };
    setTimeout(() => (currentBatch = null), 0);
  }
  return currentBatch;
}

function enqueue(key, task) {
  const b = batch();
  b.keys.add(key);
  pending++;
  notify();
  chain = chain.then(async () => {
    try {
      if (!b.failed) await task();
    } catch (err) {
      if (!b.failed) {
        b.failed = true;
        console.error('[PALORA sync]', err);
        window.alert(`Gagal menyimpan ke server:\n\n${errorMessage(err)}\n\nData akan dimuat ulang dari server.`);
        b.keys.forEach((k) => reloaders.get(k)?.());
      }
    } finally {
      pending--;
      notify();
    }
  });
}

/** Menunggu semua penyimpanan selesai (dipakai sebelum logout). */
export const flushSync = () => chain;

export function usePbCollection(key, enabled = true) {
  const cfg = COLLECTIONS[key];
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef([]);
  const idMap = useRef(new Map()); // uid -> id record PocketBase

  const commit = useCallback((next) => {
    ref.current = next;
    setItems(next);
  }, []);

  const toItem = useCallback((rec) => fromRecord(cfg, rec, fileUrl), [cfg]);

  const load = useCallback(async () => {
    const options = {
      sort: cfg.sort || DEFAULT_SORT[key] || '-date,-created',
      ...(cfg.appendOnly ? {} : { filter: 'deleted = false' }),
    };
    const records = cfg.limit
      ? (await pb.collection(cfg.pb).getList(1, cfg.limit, options)).items
      : await pb.collection(cfg.pb).getFullList({ batch: 500, ...options });
    idMap.current = new Map(records.map((r) => [r.uid, r.id]));
    commit(records.map(toItem));
    setLoaded(true);
  }, [cfg, key, commit, toItem]);

  // Muat awal + realtime
  useEffect(() => {
    if (!enabled) {
      commit([]);
      setLoaded(false);
      return undefined;
    }
    let unsub = null;
    let cancelled = false;
    const reload = () => load().catch((err) => console.error(`[PALORA] gagal memuat ${cfg.pb}`, err));
    reloaders.set(key, reload);
    reload();

    pb.collection(cfg.pb)
      .subscribe('*', (e) => {
        const rec = e.record;
        idMap.current.set(rec.uid, rec.id);
        const current = ref.current;
        const idx = current.findIndex((x) => String(x.id) === rec.uid);
        if (e.action === 'delete' || rec.deleted) {
          if (idx !== -1) commit(current.filter((_, i) => i !== idx));
          return;
        }
        const item = toItem(rec);
        if (idx === -1) commit([item, ...current]);
        else commit(current.map((x, i) => (i === idx ? item : x)));
      })
      .then((fn) => {
        if (cancelled) fn();
        else unsub = fn;
      })
      .catch((err) => console.warn(`[PALORA] realtime ${cfg.pb} tidak aktif`, err));

    return () => {
      cancelled = true;
      reloaders.delete(key);
      unsub?.();
    };
  }, [enabled, key, cfg, load, commit, toItem]);

  const runOp = useCallback((op) => applyOp(pb, cfg, op, idMap.current), [cfg]);

  const set = useCallback(
    (updater, { allowRemove = false } = {}) => {
      const prev = ref.current;
      let next = typeof updater === 'function' ? updater(prev) : updater;
      if (!Array.isArray(next) || next === prev) return;

      if (!allowRemove) {
        // Data yang hilang dari array baru (mis. karena closure lama) tidak dianggap dihapus.
        const nextIds = new Set(next.map((x) => String(x.id)));
        const missing = prev.filter((x) => !nextIds.has(String(x.id)));
        if (missing.length) next = [...next, ...missing];
      }

      commit(next);
      for (const op of diffCollections(cfg, prev, next)) {
        enqueue(key, () => runOp(op));
      }
    },
    [cfg, key, commit, runOp]
  );

  return [items, set, { loaded, reload: load }];
}

