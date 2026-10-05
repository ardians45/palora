// Helper bersama untuk pb_hooks. Handler PocketBase berjalan di konteks terisolasi,
// jadi helper harus di-require() di dalam masing-masing handler.

const ROLE_LABEL = {
  owner: "Owner",
  gudang: "Admin Gudang & Kasir",
  finance: "Keuangan",
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// Field yang tidak perlu masuk catatan perubahan.
const SKIP_FIELDS = ["created", "updated", "collectionId", "collectionName", "password", "tokenKey"];

function actorLabel(auth) {
  if (!auth) return "Sistem";
  if (auth.collection().name === "_superusers") return "Admin Sistem";
  const name = auth.getString("name") || auth.email();
  const role = ROLE_LABEL[auth.getString("role")];
  return role ? name + " (" + role + ")" : name;
}

function actorName(auth) {
  if (!auth) return "Sistem";
  if (auth.collection().name === "_superusers") return "Admin Sistem";
  return auth.getString("name") || auth.email();
}

function requireRole(auth, roles, what) {
  if (!auth) throw new UnauthorizedError("Silakan login dulu.");
  if (auth.collection().name === "_superusers") return;
  if (roles.indexOf(auth.getString("role")) === -1) {
    throw new ForbiddenError("Akun Anda tidak punya akses untuk " + (what || "aksi ini") + ".");
  }
}

function role(auth) {
  if (!auth) return "";
  if (auth.collection().name === "_superusers") return "owner";
  return auth.getString("role");
}

function toPlain(record) {
  return record ? JSON.parse(JSON.stringify(record)) : {};
}

// Selisih field antara dua snapshot record -> { field: { from, to } }
function diff(before, after) {
  const out = {};
  const keys = {};
  Object.keys(before || {}).forEach((k) => (keys[k] = true));
  Object.keys(after || {}).forEach((k) => (keys[k] = true));
  Object.keys(keys).forEach((k) => {
    if (SKIP_FIELDS.indexOf(k) !== -1) return;
    const a = JSON.stringify(before ? before[k] : undefined);
    const b = JSON.stringify(after ? after[k] : undefined);
    if (a !== b) out[k] = { from: before ? before[k] : null, to: after ? after[k] : null };
  });
  return out;
}

function writeAudit(app, collectionName, record, action, auth, changes) {
  const coll = app.findCollectionByNameOrId("audit_trail");
  const rec = new Record(coll);
  rec.set("collection_name", collectionName);
  rec.set("record_id", record ? record.id : "");
  rec.set("record_uid", record && record.collection().fields.getByName("uid") ? record.getString("uid") : "");
  rec.set("action", action);
  if (auth && auth.collection().name === "users") rec.set("actor", auth.id);
  rec.set("actor_name", actorLabel(auth));
  rec.set("changes", changes || {});
  app.save(rec);
}

/** Baca kolom JSON record sebagai objek JS (kolom JSON PocketBase berupa raw bytes di JSVM). */
function getJSON(record, field) {
  const raw = record.getString(field);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/** File upload dari request multipart; request JSON biasa = tidak ada file. */
function uploadedFiles(e, key) {
  try {
    return e.findUploadedFiles(key) || [];
  } catch (_) {
    return [];
  }
}

function rupiah(n) {
  const v = Math.round(Number(n) || 0);
  const s = Math.abs(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (v < 0 ? "-Rp " : "Rp ") + s;
}

function uid(prefix) {
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

function getSettings(app) {
  try {
    return app.findFirstRecordByFilter("settings", "id != ''");
  } catch (_) {
    return null;
  }
}

function docCode(app) {
  const s = getSettings(app);
  return (s && s.getString("doc_code")) || "PPU";
}

/** Nomor urut atomik (dipanggil di dalam transaksi). */
function nextNumber(txApp, key) {
  let rec;
  try {
    rec = txApp.findFirstRecordByFilter("counters", "key = {:k}", { k: key });
  } catch (_) {
    rec = new Record(txApp.findCollectionByNameOrId("counters"));
    rec.set("key", key);
    rec.set("value", 0);
  }
  const value = rec.getInt("value") + 1;
  rec.set("value", value);
  txApp.save(rec);
  return value;
}

function pad(n, len) {
  let s = String(n);
  while (s.length < len) s = "0" + s;
  return s;
}

/** "2026-10-05" -> {y:"2026", m:"10", d:"05", month:10}; tanggal kosong/salah -> hari ini (WIB). */
function parseDate(str) {
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str || ""));
  if (!m) {
    const now = new Date(Date.now() + 7 * 3600 * 1000); // WIB
    const iso = now.toISOString();
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  }
  return { y: m[1], m: m[2], d: m[3], month: Number(m[2]), iso: m[1] + "-" + m[2] + "-" + m[3] };
}

function docNumber(txApp, type, dateStr) {
  const code = docCode(txApp);
  const d = parseDate(dateStr);
  if (type === "PO") return "PO-" + pad(nextNumber(txApp, "PO"), 3) + "/" + code + "/" + d.y;
  if (type === "SJ") return pad(nextNumber(txApp, "SJ"), 4) + "/DO/" + code + "/" + ROMAN[d.month - 1] + "/" + d.y;
  if (type === "INV") return "INV/" + code + "/" + d.y + d.m + "/" + pad(nextNumber(txApp, "INV-" + d.y + d.m), 4);
  if (type === "NT") return "NT/" + code + "/" + d.y + d.m + "/" + pad(nextNumber(txApp, "NT-" + d.y + d.m), 4);
  if (type === "MP") return "MP/" + code + "/" + d.y + d.m + "/" + pad(nextNumber(txApp, "MP-" + d.y + d.m), 4);
  if (type === "OP") return "OP/" + code + "/" + d.y + d.m + d.d + "/" + pad(nextNumber(txApp, "OP-" + d.y + d.m + d.d), 2);
  throw new Error("Jenis nomor tidak dikenal: " + type);
}

/**
 * Normalisasi baris barang dari input pengguna.
 * Format baris: { productCode, name, size, color, unit, qty, price, total, receivedQty? }
 */
function cleanItems(items, opts) {
  opts = opts || {};
  if (!Array.isArray(items) || items.length === 0) throw new BadRequestError("Minimal harus ada 1 barang.");
  return items.map((it, i) => {
    const qty = Number(it.qty);
    const price = Number(it.price);
    const label = it.name || it.productCode || "baris " + (i + 1);
    if (!isFinite(qty) || qty <= 0) throw new BadRequestError("Qty " + label + " harus lebih dari 0.");
    if (Math.floor(qty) !== qty) throw new BadRequestError("Qty " + label + " harus bilangan bulat (tanpa koma).");
    if (!isFinite(price) || price < 0) throw new BadRequestError("Harga " + label + " tidak valid.");
    if (opts.requireCode && !it.productCode) throw new BadRequestError("Kode barang " + label + " belum dipilih.");
    const out = {
      productCode: String(it.productCode || ""),
      name: String(it.name || ""),
      size: String(it.size || ""),
      color: String(it.color || ""),
      unit: String(it.unit || "pcs"),
      qty: qty,
      price: price,
      total: Math.round(qty * price),
    };
    if (it.receivedQty !== undefined) out.receivedQty = Number(it.receivedQty) || 0;
    if (it.originalPrice !== undefined) out.originalPrice = Number(it.originalPrice) || 0;
    return out;
  });
}

/** Hitung subtotal/PPN/total. tax_mode: none | exclude (PPN ditambahkan) | include (harga sudah termasuk PPN) */
function computeTotals(items, taxMode, rate) {
  const subtotal = items.reduce((s, it) => s + it.total, 0);
  rate = Number(rate) || 11;
  let tax = 0;
  let total = subtotal;
  if (taxMode === "exclude") {
    tax = Math.round((subtotal * rate) / 100);
    total = subtotal + tax;
  } else if (taxMode === "include") {
    tax = Math.round((subtotal * rate) / (100 + rate));
  }
  return { subtotal: subtotal, tax: tax, total: total };
}

function findProductByCode(app, code) {
  try {
    return app.findFirstRecordByFilter("products", "code = {:c} && deleted = false", { c: String(code) });
  } catch (_) {
    return null;
  }
}

/**
 * Ubah stok satu produk + catat mutasi + audit, di dalam transaksi.
 * info: { type: IN|OUT|OPNAME|ADJUSTMENT, refNo, refType, refId, reason, date }
 */
function moveStock(txApp, product, delta, info, auth) {
  const before = product.getInt("stock");
  const after = before + delta;
  if (after < 0) {
    throw new BadRequestError(
      "Stok " + product.getString("name") + " (" + product.getString("code") + ") tidak cukup: tersedia " +
        before + " " + (product.getString("unit") || "pcs") + ", dibutuhkan " + -delta + "."
    );
  }
  product.set("stock", after);
  txApp.save(product);

  const mv = new Record(txApp.findCollectionByNameOrId("stock_movements"));
  mv.set("uid", uid("MV"));
  mv.set("date", parseDate(info.date).iso);
  mv.set("type", info.type);
  mv.set("product_uid", product.getString("uid"));
  mv.set("product_code", product.getString("code"));
  mv.set("product_name", product.getString("name"));
  mv.set("qty", delta);
  mv.set("ref_no", info.refNo || "");
  mv.set("ref_type", info.refType || "");
  mv.set("ref_id", info.refId || "");
  mv.set("reason", info.reason || "");
  mv.set("before_stock", before);
  mv.set("after_stock", after);
  mv.set("operator", actorLabel(auth));
  txApp.save(mv);

  writeAudit(txApp, "products", product, "stock", auth, {
    stock: { from: before, to: after, delta: delta, ref: info.refNo || "" },
  });
  return after;
}

/** Status pesanan setelah pembayaran berubah. */
function statusAfterPayment(order, minDpPercent) {
  const status = order.getString("status");
  const total = order.getFloat("total_amount");
  const paid = order.getFloat("paid_amount");
  if (status === "batal") return status;
  if (status === "dikirim" || status === "diambil") {
    return paid >= total ? (status === "diambil" ? "selesai" : status) : status;
  }
  if (status === "selesai") return status;
  if (paid >= total) return "lunas";
  if (paid >= (total * (minDpPercent || 25)) / 100) return "dp";
  return "baru";
}

/** Qty barang yang sudah keluar untuk satu baris pesanan (data lama tanpa sentQty: semua keluar bila status sudah keluar). */
function sentQty(status, it) {
  if (it.sentQty !== undefined && it.sentQty !== null) return Number(it.sentQty) || 0;
  return ["dikirim", "diambil", "selesai"].indexOf(status) !== -1 ? Number(it.qty) || 0 : 0;
}

function allSent(status, items) {
  return items.every((it) => sentQty(status, it) >= Number(it.qty));
}

/**
 * Status pesanan setelah barang keluar / surat jalan diterima / pembayaran, untuk pesanan yang semua barangnya sudah keluar:
 * - masih ada surat jalan belum diterima -> dikirim
 * - semua diterima/diambil & lunas -> selesai
 * - belum lunas -> dikirim (ada surat jalan) atau diambil (semua diambil sendiri)
 */
function statusAfterOut(txApp, order) {
  const deliveries = txApp.findRecordsByFilter("deliveries", "order_id = {:o}", "", 0, 0, { o: order.id });
  const pending = deliveries.some((d) => d.getString("status") !== "diterima");
  const paid = order.getFloat("paid_amount") >= order.getFloat("total_amount");
  if (pending) return "dikirim";
  if (paid) return "selesai";
  return deliveries.length > 0 ? "dikirim" : "diambil";
}

/** PO untuk pesanan customer: [{id}] -> [{id, order_no, customer}] dari data pesanan asli. */
function normalizeForOrders(app, record) {
  const list = getJSON(record, "for_orders") || [];
  const seen = {};
  const out = [];
  list.forEach((x) => {
    const id = String((x && x.id) || x || "");
    if (!id || seen[id]) return;
    seen[id] = true;
    let o;
    try {
      o = app.findRecordById("sales_orders", id);
    } catch (_) {
      throw new BadRequestError("Pesanan customer yang dipilih tidak ditemukan.");
    }
    out.push({ id: o.id, order_no: o.getString("order_no"), customer: o.getString("customer") });
  });
  record.set("for_orders", out);
}

module.exports = {
  normalizeForOrders,
  sentQty,
  allSent,
  statusAfterOut,
  ROLE_LABEL,
  actorLabel,
  actorName,
  requireRole,
  role,
  toPlain,
  diff,
  writeAudit,
  rupiah,
  getJSON,
  uploadedFiles,
  uid,
  getSettings,
  nextNumber,
  docNumber,
  parseDate,
  cleanItems,
  computeTotals,
  findProductByCode,
  moveStock,
  statusAfterPayment,
};
