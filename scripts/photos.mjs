// Pasang foto barang dari "backend/seed/foto-produk/mapping.json" (hasil kurasi katalog paletindo.com).
// Hanya mengisi barang yang BELUM punya foto, jadi foto yang diganti manual oleh tim tidak tertimpa.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './pb-utils.mjs';
import { NAME_FIXES, fixColor } from '../backend/seed/product-names.js';
import { PALETINDO_FULL_STOCK } from '../backend/seed/products.js';

const DIR = path.join(ROOT, 'backend', 'seed', 'foto-produk');

export function loadPhotoMapping() {
  const { models } = JSON.parse(readFileSync(path.join(DIR, 'mapping.json'), 'utf8'));
  return models;
}

/** @param pb client superuser / owner / gudang */
export async function applyPhotos(pb, { log = () => {}, overwrite = false } = {}) {
  let done = 0;
  let skipped = 0;
  for (const m of loadPhotoMapping()) {
    const bytes = readFileSync(path.join(DIR, m.file));
    const type = m.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
    for (const code of m.codes) {
      let product;
      try {
        product = await pb.collection('products').getFirstListItem(pb.filter('code = {:c} && deleted = false', { c: code }));
      } catch {
        continue; // barang tidak ada di database ini
      }
      if (product.photo && !overwrite) {
        skipped++;
        continue;
      }
      const fd = new FormData();
      fd.append('photo', new Blob([bytes], { type }), m.file);
      fd.append('photo_source', m.source_url || '');
      await pb.collection('products').update(product.id, fd);
      done++;
    }
  }
  log(`+ foto barang: ${done} dipasang${skipped ? `, ${skipped} sudah punya foto (dilewati)` : ''}`);
  return { done, skipped };
}

/** Lengkapi nama barang yang di Excel hanya berisi warna. Nama yang sudah diedit tim tidak diubah. */
export async function applyNames(pb, { log = () => {} } = {}) {
  const original = new Map(PALETINDO_FULL_STOCK.map((p) => [String(p.code), p.cleanName || p.name]));
  let done = 0;
  for (const [code, fix] of Object.entries(NAME_FIXES)) {
    let product;
    try {
      product = await pb.collection('products').getFirstListItem(pb.filter('code = {:c} && deleted = false', { c: code }));
    } catch {
      continue;
    }
    if (product.name === fix.name || product.name !== original.get(code)) continue;
    await pb.collection('products').update(product.id, { name: fix.name, clean_name: fix.name });
    done++;
  }
  // warna yang berisi nama lengkap -> ambil kata warnanya saja
  let colors = 0;
  for (const p of PALETINDO_FULL_STOCK) {
    const fixed = fixColor(p.cleanName || p.name, p.color);
    if (fixed === (p.color || '')) continue;
    let product;
    try {
      product = await pb.collection('products').getFirstListItem(pb.filter('code = {:c} && deleted = false', { c: String(p.code) }));
    } catch {
      continue;
    }
    if (product.color !== p.color) continue; // sudah diubah tim
    await pb.collection('products').update(product.id, { color: fixed });
    colors++;
  }
  log(`+ nama barang dilengkapi: ${done}, kolom warna dirapikan: ${colors}`);
  return done;
}
