/// <reference path="../pb_data/types.d.ts" />
// Aturan bisnis PALORA di sisi server.
// Catatan: tiap handler harus require() helper sendiri (handler PocketBase terisolasi).

// ---------------------------------------------------------------------------
// 1. Audit trail otomatis untuk semua perubahan data (PRD Modul 9, NFR 7.3)
// ---------------------------------------------------------------------------
onRecordCreateRequest(
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    e.next();
    u.writeAudit(e.app, e.collection.name, e.record, "create", e.auth, u.diff({}, u.toPlain(e.record)));
  },
  "products",
  "customers",
  "suppliers",
  "sales_orders",
  "purchase_orders",
  "deliveries",
  "documents",
  "stock_movements",
  "users"
);

onRecordUpdateRequest(
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    const before = u.toPlain(e.record.original());
    e.next();
    const changes = u.diff(before, u.toPlain(e.record));
    if (Object.keys(changes).length === 0) return;
    const action = changes.deleted && changes.deleted.to === true ? "soft_delete" : "update";
    u.writeAudit(e.app, e.collection.name, e.record, action, e.auth, changes);
  },
  "products",
  "customers",
  "suppliers",
  "sales_orders",
  "purchase_orders",
  "deliveries",
  "documents",
  "users"
);

onRecordDeleteRequest(
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    const before = u.toPlain(e.record);
    e.next();
    u.writeAudit(e.app, e.collection.name, e.record, "delete", e.auth, u.diff(before, {}));
  },
  "users"
);

// ---------------------------------------------------------------------------
// 2. Nama operator di log & mutasi stok diambil dari akun login (anti-spoofing)
// ---------------------------------------------------------------------------
onRecordCreateRequest(
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    if (e.auth && e.auth.collection().name === "users") {
      e.record.set(e.collection.name === "system_logs" ? "user" : "operator", u.actorLabel(e.auth));
    }
    e.next();
  },
  "system_logs",
  "stock_movements"
);

// ---------------------------------------------------------------------------
// 3. Surat jalan hanya boleh terbit untuk pesanan yang LUNAS
//    atau sudah diizinkan Owner (F-SO04, catatan "disetujui Pak De")
// ---------------------------------------------------------------------------
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const orderNo = e.record.getString("order_no");
  if (orderNo) {
    let order = null;
    try {
      order = e.app.findFirstRecordByFilter("sales_orders", "order_no = {:no} && deleted = false", { no: orderNo });
    } catch (_) {
      order = null;
    }
    if (order) {
      if (order.getString("delivery_status").indexOf("Ambil di Tempat") !== -1) {
        throw new BadRequestError(
          "Nota " + orderNo + " adalah penjualan kasir (ambil di tempat). Stoknya sudah dipotong saat bayar, " +
            "jadi tidak perlu surat jalan."
        );
      }
      const remaining = order.getFloat("remaining_amount");
      if (remaining > 0 && !order.getBool("release_approved")) {
        throw new BadRequestError(
          "Pesanan " + orderNo + " belum lunas (sisa " + u.formatRupiah(remaining) + "). " +
            "Surat jalan hanya bisa diterbitkan setelah lunas atau disetujui Owner."
        );
      }
    }
  }
  e.next();
}, "deliveries");

// ---------------------------------------------------------------------------
// 4. Perubahan stok & piutang secara atomik
//    POST /api/palora/increment  { collection, id, delta }
//    - products  -> field stock        (role: owner, gudang)  stok tidak boleh minus
//    - customers -> field current_debt (role: semua)          tidak boleh minus (dibulatkan ke 0)
// ---------------------------------------------------------------------------
routerAdd(
  "POST",
  "/api/palora/increment",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    const CONFIG = {
      products: { field: "stock", roles: ["owner", "gudang"] },
      customers: { field: "current_debt", roles: ["owner", "gudang", "finance"] },
    };

    const body = e.requestInfo().body || {};
    const cfg = CONFIG[body.collection];
    if (!cfg) throw new BadRequestError("Koleksi tidak didukung untuk perubahan atomik.");

    const delta = Number(body.delta);
    if (!isFinite(delta) || delta === 0) throw new BadRequestError("Nilai perubahan tidak valid.");

    const isSuperuser = e.auth.collection().name === "_superusers";
    if (!isSuperuser && cfg.roles.indexOf(e.auth.getString("role")) === -1) {
      throw new ForbiddenError("Akun Anda tidak punya akses untuk mengubah data ini.");
    }

    let result = null;
    e.app.runInTransaction((txApp) => {
      const rec = txApp.findRecordById(body.collection, String(body.id || ""));
      const before = rec.getFloat(cfg.field);
      let after = before + delta;

      if (body.collection === "products" && after < 0) {
        throw new BadRequestError(
          "Stok tidak cukup untuk " + rec.getString("name") + " (" + rec.getString("code") + "): " +
            "saat ini tersedia " + before + " " + (rec.getString("unit") || "pcs") + "."
        );
      }
      if (after < 0) after = 0;

      rec.set(cfg.field, after);
      txApp.save(rec);

      const changes = {};
      changes[cfg.field] = { from: before, to: after, delta: delta, reason: String(body.reason || "") };
      u.writeAudit(txApp, body.collection, rec, "increment", e.auth, changes);
      result = u.toPlain(rec);
    });

    return e.json(200, result);
  },
  $apis.requireAuth("users", "_superusers")
);

// ---------------------------------------------------------------------------
// 5. Endpoint kesehatan sederhana untuk cek server gudang / monitoring
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/palora/health", (e) => {
  return e.json(200, { ok: true, app: "PALORA", time: new Date().toISOString() });
});
