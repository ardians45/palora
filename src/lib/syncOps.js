// Menjalankan satu operasi hasil diffCollections() ke server PocketBase.
// Terpisah dari hook React supaya bisa dites langsung terhadap server asli (tests/sync.test.js).

function toFormData(body, fileColumn, file) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) {
    fd.append(k, v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''));
  }
  fd.append(fileColumn, file);
  return fd;
}

/**
 * @param pb     PocketBase client (sudah login)
 * @param cfg    konfigurasi koleksi dari COLLECTIONS
 * @param op     operasi { type: 'create' | 'update' | 'remove', ... }
 * @param idMap  Map uid frontend -> id record PocketBase (diperbarui saat create)
 */
export async function applyOp(pb, cfg, op, idMap) {
  const col = pb.collection(cfg.pb);

  if (op.type === 'create') {
    const rec = op.file
      ? await col.create(toFormData(op.record, cfg.file.column, op.file))
      : await col.create(op.record);
    idMap.set(rec.uid, rec.id);
    return rec;
  }

  const pbId = idMap.get(op.id);
  if (!pbId) throw new Error(`Data ${op.id} belum tersimpan di server.`);

  if (op.type === 'remove') {
    return col.update(pbId, { deleted: true });
  }

  let rec = null;
  if (Object.keys(op.patch).length || op.file) {
    rec = await (op.file ? col.update(pbId, toFormData(op.patch, cfg.file.column, op.file)) : col.update(pbId, op.patch));
  }
  // stok / piutang: selisih dikirim ke endpoint atomik, bukan nilai absolut
  for (const delta of Object.values(op.deltas)) {
    if (!delta) continue;
    rec = await pb.send('/api/palora/increment', {
      method: 'POST',
      body: { collection: cfg.pb, id: pbId, delta },
    });
  }
  return rec;
}
