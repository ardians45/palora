// Akses data dari PocketBase: daftar + realtime, satu record, dan pemanggilan aksi server.
import { useCallback, useEffect, useRef, useState } from 'react';
import { pb } from './pb';

/**
 * Daftar record dengan pembaruan realtime.
 * @returns {{ items, loading, error, reload }}
 */
export function useRecords(collection, { filter = '', sort = '-created', enabled = true, limit = 0 } = {}) {
  const [state, setState] = useState({ items: [], loading: true, error: null });
  const key = `${collection}|${filter}|${sort}|${limit}`;
  const ref = useRef(key);
  ref.current = key;

  const load = useCallback(async () => {
    if (!enabled) {
      setState({ items: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const opts = { sort, ...(filter ? { filter } : {}) };
      const items = limit
        ? (await pb.collection(collection).getList(1, limit, opts)).items
        : await pb.collection(collection).getFullList({ batch: 500, ...opts });
      if (ref.current === key) setState({ items, loading: false, error: null });
    } catch (error) {
      if (ref.current === key) setState({ items: [], loading: false, error });
    }
  }, [collection, filter, sort, enabled, limit, key]);

  useEffect(() => {
    load();
    if (!enabled) return undefined;
    let unsub = null;
    let cancelled = false;
    let timer = null;
    pb.collection(collection)
      .subscribe('*', () => {
        // gabungkan beberapa event beruntun menjadi satu muat ulang
        clearTimeout(timer);
        timer = setTimeout(load, 250);
      })
      .then((fn) => (cancelled ? fn() : (unsub = fn)))
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub?.();
    };
  }, [collection, enabled, load]);

  return { ...state, reload: load };
}

/** Satu record berdasarkan id atau filter, dengan realtime. */
export function useRecord(collection, idOrFilter, { byFilter = false } = {}) {
  const [state, setState] = useState({ item: null, loading: true, error: null });
  const load = useCallback(async () => {
    if (!idOrFilter) {
      setState({ item: null, loading: false, error: null });
      return;
    }
    try {
      const item = byFilter
        ? await pb.collection(collection).getFirstListItem(idOrFilter)
        : await pb.collection(collection).getOne(idOrFilter);
      setState({ item, loading: false, error: null });
    } catch (error) {
      setState({ item: null, loading: false, error });
    }
  }, [collection, idOrFilter, byFilter]);

  useEffect(() => {
    load();
    let unsub = null;
    let cancelled = false;
    pb.collection(collection)
      .subscribe('*', () => load())
      .then((fn) => (cancelled ? fn() : (unsub = fn)))
      .catch(() => {});
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [collection, load]);

  return { ...state, reload: load };
}

/** Panggil endpoint aksi bisnis server. Body berisi File -> dikirim sebagai multipart. */
export function action(path, body = {}) {
  const hasFile = Object.values(body).some((v) => v instanceof Blob);
  let payload = body;
  if (hasFile) {
    payload = new FormData();
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined || v === null) continue;
      if (v instanceof Blob) payload.append(k, v, v.name || k);
      else payload.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  }
  return pb.send(`/api/palora/${path}`, { method: 'POST', body: payload });
}

export const fileUrl = (record, filename, download = false) =>
  filename ? pb.files.getURL(record, filename, download ? { download: 1 } : undefined) : '';

/** Escape nilai untuk filter PocketBase. */
export const q = (value) => JSON.stringify(String(value ?? ''));
