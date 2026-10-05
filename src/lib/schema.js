// Pemetaan objek frontend (camelCase, seperti di mockData) <-> record PocketBase (snake_case).
// Dipakai oleh frontend (usePbCollection) dan script seed/test, jadi harus tetap bebas dependensi browser.
//
// Tipe kolom: s = teks, n = angka, b = boolean, j = JSON.
// `id` frontend disimpan di kolom `uid`. Atribut yang tidak terdaftar masuk ke kolom `extra`.

export const COLLECTIONS = {
  products: {
    pb: 'products',
    columns: {
      code: 's', name: 's', cleanName: 's', category: 's', jsonCategory: 's', factory: 's',
      stock: 'n', unit: 's', minStock: 'n', buyPrice: 'n', sellPrice: 'n', location: 's',
      color: 's', colorCategory: 's', notes: 's', imageUrl: 's',
    },
    // diubah lewat /api/palora/increment (atomik), bukan PATCH biasa
    deltas: ['stock'],
  },
  customers: {
    pb: 'customers',
    columns: {
      name: 's', contactPerson: 's', phone: 's', email: 's', address: 's', shippingAddress: 's',
      npwp: 's', type: 's', creditLimit: 'n', currentDebt: 'n',
    },
    deltas: ['currentDebt'],
  },
  suppliers: {
    pb: 'suppliers',
    columns: {
      name: 's', salesPerson: 's', phone: 's', email: 's', address: 's', terms: 's', categories: 'j',
    },
  },
  orders: {
    pb: 'sales_orders',
    columns: {
      orderNo: 's', date: 's', customer: 's', poCustomerRef: 's', upPerson: 's', destination: 's',
      items: 'j', totalAmount: 'n', dpAmount: 'n', remainingAmount: 'n', paymentType: 's',
      paymentStatus: 's', deliveryStatus: 's', dueDate: 's', taxInvoiceNo: 's', payments: 'j',
      notes: 's', createdBy: 's', releaseApproved: 'b',
    },
  },
  purchaseOrders: {
    pb: 'purchase_orders',
    columns: {
      poNo: 's', date: 's', supplier: 's', upPerson: 's', items: 'j', totalAmount: 'n', status: 's',
      expectedDate: 's', receipts: 'j', invoice: 'j', notes: 's', isDirectShip: 'b', createdBy: 's',
    },
  },
  deliveries: {
    pb: 'deliveries',
    columns: {
      sjNo: 's', date: 's', orderNo: 's', customer: 's', poCustomerRef: 's', upPerson: 's',
      destination: 's', driverName: 's', vehiclePlate: 's', status: 's', taxInvoiceNo: 's',
      items: 'j', signedBy: 's',
    },
  },
  documents: {
    pb: 'documents',
    columns: {
      title: 's', type: 's', refNo: 's', date: 's', partner: 's', fileName: 's', uploadedBy: 's',
      category: 's',
    },
    // `_file` (File/Blob) diupload ke kolom file; `fileUrl` dihitung dari record
    file: { input: '_file', column: 'file', url: 'fileUrl' },
  },
  stockMovements: {
    pb: 'stock_movements',
    columns: {
      date: 's', type: 's', productId: 's', productCode: 's', productName: 's', qty: 'n', refNo: 's',
      reason: 's', beforeStock: 'n', afterStock: 'n', operator: 's',
    },
    rename: { productId: 'product_uid' },
    appendOnly: true,
    sort: '-created',
    limit: 2000,
  },
  systemLogs: {
    pb: 'system_logs',
    columns: { date: 's', user: 's', module: 's', action: 's', detail: 's' },
    appendOnly: true,
    sort: '-created',
    limit: 1000,
  },
};

// Kolom yang tidak disimpan sama sekali (hanya hidup di UI)
const LOCAL_ONLY = ['_file', 'fileUrl'];

export const toSnake = (key) => key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

export function columnName(cfg, key) {
  return (cfg.rename && cfg.rename[key]) || toSnake(key);
}

function coerce(type, value) {
  switch (type) {
    case 'n': {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    case 'b':
      return Boolean(value);
    case 'j':
      return value === undefined ? null : value;
    default:
      return value === null || value === undefined ? '' : String(value);
  }
}

/** Objek frontend -> body record PocketBase (tanpa file). */
export function toRecord(cfg, obj) {
  const rec = { uid: String(obj.id) };
  const extra = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id' || LOCAL_ONLY.includes(key)) continue;
    if (cfg.columns[key]) rec[columnName(cfg, key)] = coerce(cfg.columns[key], value);
    else if (value !== undefined) extra[key] = value;
  }
  for (const [key, type] of Object.entries(cfg.columns)) {
    const col = columnName(cfg, key);
    if (!(col in rec)) rec[col] = coerce(type, undefined);
  }
  rec.extra = Object.keys(extra).length ? extra : null;
  return rec;
}

/** Record PocketBase -> objek frontend. `fileUrlFor(record)` opsional untuk kolom file. */
export function fromRecord(cfg, rec, fileUrlFor) {
  const obj = { ...(rec.extra || {}) };
  obj.id = rec.uid;
  for (const key of Object.keys(cfg.columns)) {
    const col = columnName(cfg, key);
    if (col in rec) obj[key] = rec[col];
  }
  if (cfg.file && rec[cfg.file.column] && fileUrlFor) {
    obj[cfg.file.url] = fileUrlFor(rec, rec[cfg.file.column]);
  }
  return obj;
}

/**
 * Bandingkan dua daftar objek frontend (berdasarkan `id`) dan hasilkan operasi sinkronisasi:
 *   { type: 'create', id, record, file? }
 *   { type: 'update', id, patch, deltas }   patch = kolom biasa yang berubah, deltas = { kolom: selisih }
 *   { type: 'remove', id }                  (soft delete)
 */
export function diffCollections(cfg, prevList, nextList) {
  const ops = [];
  const prevById = new Map(prevList.map((o) => [String(o.id), o]));
  const nextIds = new Set();
  const deltaCols = new Set((cfg.deltas || []).map((k) => columnName(cfg, k)));

  for (const item of nextList) {
    const id = String(item.id);
    nextIds.add(id);
    const before = prevById.get(id);
    if (!before) {
      const op = { type: 'create', id, record: toRecord(cfg, item) };
      if (cfg.file && item[cfg.file.input]) op.file = item[cfg.file.input];
      ops.push(op);
      continue;
    }
    if (before === item) continue;
    const a = toRecord(cfg, before);
    const b = toRecord(cfg, item);
    const patch = {};
    const deltas = {};
    for (const col of Object.keys(b)) {
      if (JSON.stringify(a[col]) === JSON.stringify(b[col])) continue;
      if (deltaCols.has(col)) deltas[col] = Number(b[col]) - Number(a[col]);
      else patch[col] = b[col];
    }
    const file = cfg.file && item[cfg.file.input] && item[cfg.file.input] !== before[cfg.file.input]
      ? item[cfg.file.input]
      : null;
    if (Object.keys(patch).length || Object.keys(deltas).length || file) {
      ops.push({ type: 'update', id, patch, deltas, ...(file ? { file } : {}) });
    }
  }

  if (!cfg.appendOnly) {
    for (const id of prevById.keys()) {
      if (!nextIds.has(id)) ops.push({ type: 'remove', id });
    }
  }
  return ops;
}

// ---------------------------------------------------------------------------
// Role & hak akses (PRD 6.7)
// ---------------------------------------------------------------------------
export const ROLE_LABEL = {
  owner: 'Owner',
  gudang: 'Admin Gudang & POS',
  finance: 'Keuangan',
};

export function userLabel(user) {
  if (!user) return '';
  const role = ROLE_LABEL[user.role];
  return role ? `${user.name || user.email} (${role})` : user.name || user.email;
}

/**
 * Tanggal jatuh tempo dari syarat bayar, mis. "Tempo 14 Hari" -> tanggal + 14 hari (format YYYY-MM-DD).
 * Syarat tanpa angka hari memakai default 14 hari.
 */
export function dueDateFromTerms(paymentType, fromDate = new Date(), defaultDays = 14) {
  const m = String(paymentType || '').match(/(\d+)\s*hari/i);
  const days = m ? Number(m[1]) : defaultDays;
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Nomor urut berikutnya: cari angka terbesar dari pola di daftar nomor lalu +1 */
export function nextSequence(numbers, pattern, start = 1) {
  let max = start - 1;
  for (const n of numbers) {
    const m = String(n || '').match(pattern);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}
