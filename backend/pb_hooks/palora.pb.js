/// <reference path="../pb_data/types.d.ts" />
// Aturan bisnis PALORA di sisi server.
// - Audit trail otomatis untuk perubahan lewat API standar.
// - Semua aksi yang menyentuh stok / uang / nomor dokumen = endpoint /api/palora/* dalam SATU transaksi:
//   kalau satu langkah gagal (mis. stok kurang), semuanya dibatalkan.
// Catatan: tiap handler harus require() helper sendiri (handler PocketBase terisolasi).

// ===========================================================================
// 1. Audit trail untuk perubahan lewat API standar
// ===========================================================================
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
  "documents",
  "supplier_invoices",
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
  "supplier_invoices",
  "settings",
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

// Nama pengguna di log diambil dari akun login (anti-spoofing)
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  if (e.auth && e.auth.collection().name === "users") e.record.set("user", u.actorLabel(e.auth));
  e.next();
}, "system_logs");

// ===========================================================================
// 2. Produk: uid otomatis, stok awal tercatat sebagai mutasi
// ===========================================================================
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  if (!e.record.getString("uid")) e.record.set("uid", u.uid("PRD"));
  const initial = e.record.getInt("stock");
  e.record.set("stock", 0);
  e.next();
  if (initial > 0) {
    u.moveStock(e.app, e.record, initial, { type: "ADJUSTMENT", refNo: "STOK-AWAL", reason: "Stok awal barang baru" }, e.auth);
  }
}, "products");

// Invoice supplier: pencatat & nilai bayar awal diisi server
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const r = e.record;
  r.set("created_by", u.actorName(e.auth));
  r.set("received_by", u.actorName(e.auth));
  r.set("paid_amount", 0);
  if (!r.getString("received_date")) r.set("received_date", u.parseDate("").iso);
  if (!(r.getFloat("total_amount") > 0)) throw new BadRequestError("Total tagihan invoice wajib diisi.");

  // Map PO: invoice menempel ke PO; supplier & no. PO diambil dari PO, surat jalan harus milik PO itu
  const poId = r.getString("po_id");
  if (poId) {
    const po = e.app.findRecordById("purchase_orders", poId);
    r.set("po_no", po.getString("po_no"));
    r.set("supplier", po.getString("supplier"));
    const own = (u.getJSON(po, "receipts") || []).map((x) => String(x.sjNo).toLowerCase());
    const sjs = u.getJSON(r, "sj_nos") || [];
    sjs.forEach((s) => {
      if (own.indexOf(String(s).toLowerCase()) === -1) {
        throw new BadRequestError("Surat jalan " + s + " bukan milik " + po.getString("po_no") + ".");
      }
    });
  }
  if (!r.getString("supplier").trim()) throw new BadRequestError("Supplier wajib diisi.");

  // no. invoice yang sama dari supplier yang sama = dobel
  try {
    e.app.findFirstRecordByFilter("supplier_invoices", "supplier = {:s} && invoice_no = {:n} && deleted = false", {
      s: r.getString("supplier"),
      n: r.getString("invoice_no"),
    });
    throw new BadRequestError("Invoice " + r.getString("invoice_no") + " dari " + r.getString("supplier") + " sudah pernah dicatat.");
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
  }
  e.next();
}, "supplier_invoices");

// Ubah invoice supplier: nilai bayar & tautan PO dikunci, aturan dobel & surat jalan dicek ulang
onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const r = e.record;
  const orig = r.original();
  const body = e.requestInfo().body || {};
  const myRole = u.role(e.auth);
  ["paid_amount", "created_by", "received_by", "po_id", "po_no"].forEach((k) => r.set(k, orig.get(k)));
  const poId = orig.getString("po_id");
  if (poId) r.set("supplier", orig.getString("supplier"));

  if (body.deleted !== undefined && r.getBool("deleted") !== orig.getBool("deleted")) {
    if (myRole !== "owner" && myRole !== "finance") throw new ForbiddenError("Invoice hanya bisa diarsipkan Owner atau Keuangan.");
    if (orig.getFloat("paid_amount") > 0) throw new BadRequestError("Invoice yang sudah dibayar tidak bisa diarsipkan.");
  }
  if (!(r.getFloat("total_amount") > 0)) throw new BadRequestError("Total tagihan invoice wajib diisi.");
  if (r.getFloat("total_amount") < orig.getFloat("paid_amount")) {
    throw new BadRequestError("Total invoice tidak boleh lebih kecil dari yang sudah dibayar " + u.rupiah(orig.getFloat("paid_amount")) + ".");
  }
  if (!r.getString("supplier").trim()) throw new BadRequestError("Supplier wajib diisi.");

  if (poId && body.sj_nos !== undefined) {
    const po = e.app.findRecordById("purchase_orders", poId);
    const own = (u.getJSON(po, "receipts") || []).map((x) => String(x.sjNo).toLowerCase());
    (u.getJSON(r, "sj_nos") || []).forEach((s) => {
      if (own.indexOf(String(s).toLowerCase()) === -1) throw new BadRequestError("Surat jalan " + s + " bukan milik " + po.getString("po_no") + ".");
    });
  }
  if (r.getString("invoice_no") !== orig.getString("invoice_no") || r.getString("supplier") !== orig.getString("supplier")) {
    try {
      e.app.findFirstRecordByFilter("supplier_invoices", "supplier = {:s} && invoice_no = {:n} && deleted = false && id != {:id}", {
        s: r.getString("supplier"),
        n: r.getString("invoice_no"),
        id: r.id,
      });
      throw new BadRequestError("Invoice " + r.getString("invoice_no") + " dari " + r.getString("supplier") + " sudah pernah dicatat.");
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
    }
  }
  e.next();
}, "supplier_invoices");

// Pengiriman (surat jalan): status hanya berubah lewat endpoint
onRecordUpdateRequest((e) => {
  const orig = e.record.original();
  ["sj_no", "uid", "order_id", "order_no", "status", "items", "received_by", "received_date", "signed_by", "customer"].forEach((k) =>
    e.record.set(k, orig.get(k))
  );
  e.next();
}, "deliveries");

// Barang: kode tidak boleh diganti (dipakai di pesanan, PO & kartu stok); stok hanya lewat endpoint;
// tidak bisa diarsipkan selama masih ada di pesanan/PO yang berjalan.
onRecordUpdateRequest((e) => {
  const r = e.record;
  const orig = r.original();
  const body = e.requestInfo().body || {};
  r.set("stock", orig.getInt("stock"));
  r.set("uid", orig.getString("uid"));
  if (body.code !== undefined && String(body.code).trim() !== orig.getString("code")) {
    throw new BadRequestError("Kode barang tidak bisa diganti karena dipakai di riwayat stok, pesanan dan PO. Buat barang baru bila perlu.");
  }
  r.set("code", orig.getString("code"));
  if (r.getBool("deleted") && !orig.getBool("deleted")) {
    const code = orig.getString("code");
    const like = '"productCode":"' + code + '"';
    const busy = [];
    try {
      e.app
        .findRecordsByFilter("sales_orders", "(status = 'baru' || status = 'dp' || status = 'lunas') && items ~ {:c}", "", 5, 0, { c: like })
        .forEach((o) => busy.push(o.getString("order_no")));
      e.app
        .findRecordsByFilter("purchase_orders", "(state = 'draft' || state = 'dikirim' || state = 'sebagian') && items ~ {:c}", "", 5, 0, { c: like })
        .forEach((o) => busy.push(o.getString("po_no")));
    } catch (_) {}
    if (busy.length) throw new BadRequestError("Barang " + code + " masih dipakai di " + busy.join(", ") + ". Selesaikan dulu sebelum diarsipkan.");
    if (orig.getInt("stock") > 0) throw new BadRequestError("Barang " + code + " masih ada stok " + orig.getInt("stock") + ". Koreksi stok ke 0 dulu sebelum diarsipkan.");
  }
  e.next();
}, "products");

// Dokumen arsip: uid & pengunggah diisi server
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  if (!e.record.getString("uid")) e.record.set("uid", u.uid("DOC"));
  if (e.auth && e.auth.collection().name === "users") e.record.set("uploaded_by", u.actorName(e.auth));
  e.next();
}, "documents");

// ===========================================================================
// 3. Pesanan customer: nomor, total, status dihitung server
// ===========================================================================
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const r = e.record;
  const s = u.getSettings(e.app);
  const items = u.cleanItems(u.getJSON(r, "items"), { requireCode: true });
  const taxMode = r.getString("tax_mode") || "none";
  const t = u.computeTotals(items, taxMode, s ? s.getFloat("ppn_rate") : 11);
  const date = u.parseDate(r.getString("date")).iso;

  if (!r.getString("customer").trim()) throw new BadRequestError("Nama customer wajib diisi.");
  r.set("date", date);
  // jatuh tempo default dari syarat bayar ("Tempo 14 Hari"), selain itu 14 hari
  if (!r.getString("due_date")) {
    const m = /(\d+)\s*hari/i.exec(r.getString("payment_type"));
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + (m ? Number(m[1]) : 14));
    r.set("due_date", d.toISOString().slice(0, 10));
  }
  r.set("items", items);
  r.set("tax_mode", taxMode);
  r.set("subtotal", t.subtotal);
  r.set("tax_amount", t.tax);
  r.set("total_amount", t.total);
  r.set("paid_amount", 0);
  r.set("dp_amount", 0);
  r.set("remaining_amount", t.total);
  r.set("status", "baru");
  r.set("channel", "pesanan");
  r.set("release_approved", false);
  r.set("created_by", u.actorName(e.auth));
  if (!r.getString("uid")) r.set("uid", u.uid("ORD"));

  e.app.runInTransaction((tx) => {
    r.set("order_no", u.docNumber(tx, "INV", date));
  });
  e.next();
}, "sales_orders");

onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const r = e.record;
  const orig = e.record.original();
  const status = orig.getString("status");
  const reqBody = e.requestInfo().body || {};
  const itemsChanged = reqBody.items !== undefined;
  const taxChanged = reqBody.tax_mode !== undefined && reqBody.tax_mode !== orig.getString("tax_mode");

  // Kolom milik server: selalu dikembalikan ke nilai lama (hanya endpoint /api/palora/* yang mengubahnya).
  // Endpoint memakai tx.save() sehingga hook request ini tidak ikut berjalan di sana.
  [
    "order_no", "channel", "uid", "status", "paid_amount", "dp_amount", "remaining_amount", "subtotal", "tax_amount",
    "total_amount", "release_approved", "dp_override_by", "store", "marketplace_order_no", "created_by", "cancel_reason", "items", "tax_mode", "returns",
  ].forEach((k) => r.set(k, orig.get(k)));
  if (reqBody.deleted !== undefined) {
    if (u.role(e.auth) !== "owner" || ["baru", "batal"].indexOf(status) === -1 || orig.getFloat("paid_amount") > 0) {
      throw new ForbiddenError("Pesanan tidak bisa diarsipkan. Gunakan Batalkan.");
    }
  }
  const open = status === "baru" || status === "dp";
  if (!open && orig.getString("channel") === "pesanan") {
    // setelah lunas/keluar: data customer & tanggal ikut terkunci (sudah tercetak di nota/surat jalan)
    ["customer", "date", "payment_type", "po_customer_ref"].forEach((k) => {
      if (reqBody[k] !== undefined && String(reqBody[k]) !== orig.getString(k)) {
        throw new BadRequestError("Data pesanan tidak bisa diubah setelah lunas atau barang keluar.");
      }
    });
  }

  if (itemsChanged || taxChanged) {
    if (!open || (u.getJSON(orig, "items") || []).some((it) => Number(it.sentQty) > 0)) {
      throw new BadRequestError("Barang/harga tidak bisa diubah setelah pesanan lunas atau dikirim.");
    }
    if (reqBody.items !== undefined) r.set("items", typeof reqBody.items === "string" ? JSON.parse(reqBody.items) : reqBody.items);
    if (reqBody.tax_mode !== undefined) r.set("tax_mode", reqBody.tax_mode);
    const s = u.getSettings(e.app);
    const items = u.cleanItems(u.getJSON(r, "items"), { requireCode: true });
    const t = u.computeTotals(items, r.getString("tax_mode") || "none", s ? s.getFloat("ppn_rate") : 11);
    const paid = orig.getFloat("paid_amount");
    if (t.total < paid) {
      throw new BadRequestError("Total baru " + u.rupiah(t.total) + " lebih kecil dari yang sudah dibayar " + u.rupiah(paid) + ".");
    }
    r.set("items", items);
    r.set("subtotal", t.subtotal);
    r.set("tax_amount", t.tax);
    r.set("total_amount", t.total);
    r.set("remaining_amount", t.total - paid);
    r.set("status", u.statusAfterPayment(r, s ? s.getFloat("min_dp_percent") : 25));
  }
  e.next();
}, "sales_orders");

// ===========================================================================
// 4. PO supplier: nomor, total, status draft
// ===========================================================================
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const r = e.record;
  if (!r.getString("supplier").trim()) throw new BadRequestError("Supplier wajib dipilih.");
  const items = u.cleanItems(u.getJSON(r, "items")).map((it) => {
    it.receivedQty = 0;
    return it;
  });
  const date = u.parseDate(r.getString("date")).iso;
  r.set("date", date);
  r.set("items", items);
  r.set("total_amount", items.reduce((s, it) => s + it.total, 0));
  r.set("state", "draft");
  r.set("status", "Draft");
  r.set("receipts", []);
  u.normalizeForOrders(e.app, r);
  r.set("created_by", u.actorName(e.auth));
  if (!r.getString("uid")) r.set("uid", u.uid("PO"));
  e.app.runInTransaction((tx) => {
    r.set("po_no", u.docNumber(tx, "PO", date));
  });
  e.next();
}, "purchase_orders");

onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const r = e.record;
  const orig = e.record.original();
  const reqBody = e.requestInfo().body || {};
  const state = orig.getString("state");
  // kolom milik server (penerimaan, status, total) hanya berubah lewat endpoint
  ["po_no", "uid", "state", "status", "receipts", "total_amount", "created_by", "items"].forEach((k) => r.set(k, orig.get(k)));
  const editable = state === "draft" || state === "dikirim";
  if (!editable) {
    ["supplier", "date"].forEach((k) => {
      if (reqBody[k] !== undefined && String(reqBody[k]) !== orig.getString(k)) {
        throw new BadRequestError("Supplier/tanggal PO tidak bisa diubah setelah ada penerimaan barang.");
      }
    });
  }
  if (reqBody.deleted !== undefined && reqBody.deleted !== orig.getBool("deleted") && !(state === "draft" || state === "batal")) {
    throw new BadRequestError("Hanya PO draft atau batal yang bisa diarsipkan.");
  }
  if (reqBody.for_orders !== undefined) u.normalizeForOrders(e.app, r);
  const itemsChanged = reqBody.items !== undefined;
  if (itemsChanged) {
    if (!editable) {
      throw new BadRequestError("Barang PO tidak bisa diubah setelah ada penerimaan.");
    }
    r.set("items", typeof reqBody.items === "string" ? JSON.parse(reqBody.items) : reqBody.items);
    const items = u.cleanItems(u.getJSON(r, "items")).map((it) => {
      it.receivedQty = 0;
      return it;
    });
    r.set("items", items);
    r.set("total_amount", items.reduce((s, it) => s + it.total, 0));
  }
  e.next();
}, "purchase_orders");

// ===========================================================================
// 5. Endpoint aksi bisnis
// ===========================================================================

// --- PO: ubah status (kirim ke supplier / batalkan) ---
routerAdd(
  "POST",
  "/api/palora/po/state",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "mengubah PO");
    const body = e.requestInfo().body || {};
    let out;
    e.app.runInTransaction((tx) => {
      const po = tx.findRecordById("purchase_orders", String(body.po_id || ""));
      const from = po.getString("state");
      const to = String(body.state || "");
      // selesai dari "sebagian" = tutup PO walau barang kurang (supplier tidak mengirim sisanya)
      const allowed = { dikirim: ["draft"], batal: ["draft", "dikirim"], selesai: ["sebagian"] };
      if (!allowed[to] || allowed[to].indexOf(from) === -1) {
        throw new BadRequestError("PO " + po.getString("po_no") + " tidak bisa diubah dari '" + from + "' ke '" + to + "'.");
      }
      if (to === "batal" && (u.getJSON(po, "receipts") || []).length > 0) {
        throw new BadRequestError("PO yang sudah ada penerimaan barang tidak bisa dibatalkan.");
      }
      const reason = String(body.reason || "").trim();
      if (to === "selesai" && !reason) throw new BadRequestError("Alasan menutup PO wajib diisi (mis. sisa tidak dikirim supplier).");
      po.set("state", to);
      po.set("status", to === "dikirim" ? "Dikirim ke Supplier" : to === "selesai" ? "Selesai (ditutup kurang)" : "Dibatalkan");
      if (to === "batal") po.set("notes", (po.getString("notes") + "\nDibatalkan: " + (reason || "-")).trim());
      if (to === "selesai") {
        const short = (u.getJSON(po, "items") || [])
          .filter((it) => (Number(it.receivedQty) || 0) < Number(it.qty))
          .map((it) => it.name + " kurang " + (Number(it.qty) - (Number(it.receivedQty) || 0)));
        po.set("notes", (po.getString("notes") + "\nDitutup kurang: " + reason + (short.length ? " (" + short.join(", ") + ")" : "")).trim());
      }
      tx.save(po);
      u.writeAudit(tx, "purchase_orders", po, to === "batal" ? "cancel" : to === "selesai" ? "close_short" : "state", e.auth, {
        state: { from: from, to: to },
        reason: reason ? { from: null, to: reason } : undefined,
      });
      out = u.toPlain(po);
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- PO: terima barang (bisa bertahap, foto SJ supplier opsional) ---
routerAdd(
  "POST",
  "/api/palora/po/receive",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "menerima barang");
    const body = e.requestInfo().body || {};
    const lines = typeof body.lines === "string" ? JSON.parse(body.lines) : body.lines || [];
    const sjNo = String(body.sj_no || "").trim();
    if (!sjNo) throw new BadRequestError("No. surat jalan supplier wajib diisi.");
    const files = u.uploadedFiles(e, "photo");
    let out;

    e.app.runInTransaction((tx) => {
      const po = tx.findRecordById("purchase_orders", String(body.po_id || ""));
      const state = po.getString("state");
      if (state === "batal" || state === "selesai") {
        throw new BadRequestError("PO " + po.getString("po_no") + " sudah " + (state === "batal" ? "dibatalkan" : "selesai") + ".");
      }
      const receipts = u.getJSON(po, "receipts") || [];
      if (receipts.some((r) => String(r.sjNo).toLowerCase() === sjNo.toLowerCase())) {
        throw new BadRequestError("Surat jalan " + sjNo + " sudah pernah diterima untuk PO ini.");
      }
      const date = u.parseDate(body.date).iso;
      const items = u.getJSON(po, "items") || [];
      const received = [];
      const over = [];
      const overReason = String(body.over_reason || "").trim();
      let any = false;

      lines.forEach((ln) => {
        const idx = Number(ln.index);
        const it = items[idx];
        if (!it) throw new BadRequestError("Baris PO tidak ditemukan.");
        const good = Number(ln.good) || 0;
        const bad = Number(ln.bad) || 0;
        if (good < 0 || bad < 0) throw new BadRequestError("Qty tidak boleh minus.");
        if (good === 0 && bad === 0) return;
        if (Math.floor(good) !== good || Math.floor(bad) !== bad) throw new BadRequestError("Qty harus bilangan bulat.");
        const remaining = Math.max(0, Number(it.qty) - (Number(it.receivedQty) || 0));
        if (good > remaining && !overReason) {
          throw new BadRequestError(
            it.name + ": diterima " + good + " melebihi sisa PO " + remaining + " " + (it.unit || "pcs") +
              ". Bila supplier memang mengirim lebih, isi alasan kelebihan."
          );
        }
        if (good > remaining) over.push(it.name + " +" + (good - remaining));
        any = true;
        if (good > 0) {
          const product = u.findProductByCode(tx, it.productCode);
          if (!product) throw new BadRequestError("Kode " + it.productCode + " (" + it.name + ") belum ada di master barang.");
          // harga modal master mengikuti harga PO terakhir yang benar-benar diterima
          const price = Number(it.price) || 0;
          const oldPrice = product.getFloat("buy_price");
          if (price > 0 && price !== oldPrice) {
            product.set("buy_price", price);
            u.writeAudit(tx, "products", product, "cost_update", e.auth, {
              buy_price: { from: oldPrice, to: price, ref: po.getString("po_no") },
            });
          }
          u.moveStock(
            tx,
            product,
            good,
            {
              type: "IN",
              refNo: po.getString("po_no") + " / SJ " + sjNo,
              refType: "po",
              refId: po.id,
              reason: "Terima barang dari " + po.getString("supplier"),
              date: date,
            },
            e.auth
          );
        }
        it.receivedQty = (Number(it.receivedQty) || 0) + good;
        received.push({ index: idx, productCode: it.productCode, name: it.name, qty: good, badQty: bad });
      });
      if (!any) throw new BadRequestError("Isi qty yang diterima minimal satu barang.");

      let docId = "";
      if (files.length) {
        const doc = new Record(tx.findCollectionByNameOrId("documents"));
        doc.set("uid", u.uid("DOC"));
        doc.set("title", "Surat Jalan Supplier " + sjNo);
        doc.set("type", "Surat Jalan Supplier");
        doc.set("category", "Surat Jalan");
        doc.set("ref_no", po.getString("po_no"));
        doc.set("date", date);
        doc.set("partner", po.getString("supplier"));
        doc.set("file_name", files[0].originalName);
        doc.set("file", files[0]);
        doc.set("uploaded_by", u.actorName(e.auth));
        tx.save(doc);
        docId = doc.id;
      }

      const complete = items.every((it) => (Number(it.receivedQty) || 0) >= Number(it.qty));
      receipts.push({
        sjNo: sjNo,
        date: date,
        driver: String(body.driver || ""),
        note: [String(body.note || "").trim(), over.length ? "Kelebihan " + over.join(", ") + ": " + overReason : ""].filter(Boolean).join(" · "),
        items: received,
        docId: docId,
        by: u.actorName(e.auth),
      });
      const before = po.getString("state");
      po.set("items", items);
      po.set("receipts", receipts);
      po.set("state", complete ? "selesai" : "sebagian");
      po.set("status", complete ? "Selesai" : "Diterima Sebagian");
      tx.save(po);
      u.writeAudit(tx, "purchase_orders", po, "receive", e.auth, {
        state: { from: before, to: po.getString("state") },
        receipt: { from: null, to: sjNo },
      });
      out = u.toPlain(po);
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Pembayaran (customer: DP / pelunasan / cicilan; supplier: bayar invoice) ---
routerAdd(
  "POST",
  "/api/palora/payment",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    const body = e.requestInfo().body || {};
    const kind = String(body.kind || "");
    const amount = Math.round(Number(body.amount));
    if (!isFinite(amount) || amount <= 0) throw new BadRequestError("Jumlah pembayaran harus lebih dari 0.");
    const files = u.uploadedFiles(e, "proof");
    const myRole = u.role(e.auth);
    let out;

    e.app.runInTransaction((tx) => {
      const pay = new Record(tx.findCollectionByNameOrId("payments"));
      pay.set("kind", kind);
      pay.set("date", u.parseDate(body.date).iso);
      pay.set("amount", amount);
      pay.set("method", String(body.method || "Transfer"));
      pay.set("note", String(body.note || ""));
      pay.set("recorded_by", u.actorLabel(e.auth));
      if (files.length) pay.set("proof", files[0]);

      if (kind === "customer") {
        const order = tx.findRecordById("sales_orders", String(body.order_id || ""));
        const status = order.getString("status");
        if (status === "batal") throw new BadRequestError("Pesanan sudah dibatalkan.");
        // DP & pelunasan sebelum barang keluar boleh dicatat gudang; piutang setelah barang keluar hanya Owner/Keuangan
        const preDispatch = status === "baru" || status === "dp";
        if (!(myRole === "owner" || myRole === "finance" || (myRole === "gudang" && preDispatch))) {
          throw new ForbiddenError("Pembayaran piutang dicatat oleh Owner atau Keuangan.");
        }
        const total = order.getFloat("total_amount");
        const paidBefore = order.getFloat("paid_amount");
        const remaining = total - paidBefore;
        if (amount > remaining) {
          throw new BadRequestError("Pembayaran " + u.rupiah(amount) + " melebihi sisa tagihan " + u.rupiah(remaining) + ".");
        }
        pay.set("order_id", order.id);
        pay.set("ref_no", order.getString("order_no"));
        pay.set("partner", order.getString("customer"));
        tx.save(pay);

        const s = u.getSettings(tx);
        order.set("paid_amount", paidBefore + amount);
        order.set("dp_amount", paidBefore + amount);
        order.set("remaining_amount", total - paidBefore - amount);
        const before = status;
        order.set("status", u.statusAfterPayment(order, s ? s.getFloat("min_dp_percent") : 25));
        // pelanggan tempo: barang sudah dikirim & surat jalan sudah diterima, pelunasan datang belakangan -> selesai
        if (order.getString("status") === "dikirim" || order.getString("status") === "diambil") {
          order.set("status", u.statusAfterOut(tx, order));
        }
        tx.save(order);
        u.writeAudit(tx, "sales_orders", order, "payment", e.auth, {
          paid_amount: { from: paidBefore, to: paidBefore + amount },
          status: { from: before, to: order.getString("status") },
        });
        out = { payment: u.toPlain(pay), order: u.toPlain(order) };
      } else if (kind === "supplier") {
        u.requireRole(e.auth, ["owner", "finance"], "mencatat pembayaran ke supplier");
        const inv = tx.findRecordById("supplier_invoices", String(body.invoice_id || ""));
        const total = inv.getFloat("total_amount");
        const paidBefore = inv.getFloat("paid_amount");
        if (amount > total - paidBefore) {
          throw new BadRequestError("Pembayaran " + u.rupiah(amount) + " melebihi sisa hutang " + u.rupiah(total - paidBefore) + ".");
        }
        pay.set("invoice_id", inv.id);
        pay.set("ref_no", inv.getString("invoice_no"));
        pay.set("partner", inv.getString("supplier"));
        tx.save(pay);
        inv.set("paid_amount", paidBefore + amount);
        tx.save(inv);
        u.writeAudit(tx, "supplier_invoices", inv, "payment", e.auth, {
          paid_amount: { from: paidBefore, to: paidBefore + amount },
        });
        out = { payment: u.toPlain(pay), invoice: u.toPlain(inv) };
      } else {
        throw new BadRequestError("Jenis pembayaran tidak dikenal.");
      }
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Owner mengizinkan barang keluar sebelum lunas (pelanggan tempo) ---
routerAdd(
  "POST",
  "/api/palora/orders/release",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner"], "mengizinkan kirim sebelum lunas");
    const body = e.requestInfo().body || {};
    let out;
    e.app.runInTransaction((tx) => {
      const order = tx.findRecordById("sales_orders", String(body.order_id || ""));
      if (["baru", "dp"].indexOf(order.getString("status")) === -1) {
        throw new BadRequestError("Izin hanya untuk pesanan yang belum lunas dan belum keluar.");
      }
      order.set("release_approved", true);
      order.set("dp_override_by", u.actorName(e.auth));
      tx.save(order);
      u.writeAudit(tx, "sales_orders", order, "release", e.auth, { release_approved: { from: false, to: true } });
      out = u.toPlain(order);
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Barang keluar: kirim (buat surat jalan) atau diambil sendiri ---
routerAdd(
  "POST",
  "/api/palora/orders/dispatch",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "mengeluarkan barang");
    const body = e.requestInfo().body || {};
    const mode = String(body.mode || "");
    if (mode !== "kirim" && mode !== "ambil") throw new BadRequestError("Pilih: dikirim atau diambil sendiri.");
    let out;

    e.app.runInTransaction((tx) => {
      const order = tx.findRecordById("sales_orders", String(body.order_id || ""));
      const status = order.getString("status");
      const no = order.getString("order_no");
      if (status === "batal") throw new BadRequestError("Pesanan " + no + " sudah dibatalkan.");
      const items = u.getJSON(order, "items") || [];
      if (["dikirim", "diambil", "selesai"].indexOf(status) !== -1 || u.allSent(status, items)) {
        throw new BadRequestError("Barang pesanan " + no + " sudah keluar semua.");
      }
      if (status !== "lunas" && !order.getBool("release_approved")) {
        throw new BadRequestError(
          "Pesanan " + no + " belum lunas (sisa " + u.rupiah(order.getFloat("remaining_amount")) +
            "). Barang hanya boleh keluar setelah lunas atau diizinkan Owner."
        );
      }
      const date = u.parseDate(body.date).iso;

      // Barang yang keluar kali ini: lines [{index, qty}] (kirim bertahap) atau semua sisa bila tidak diisi
      const lines = Array.isArray(body.lines) ? body.lines : typeof body.lines === "string" ? JSON.parse(body.lines) : null;
      const outLines = [];
      if (lines) {
        lines.forEach((ln) => {
          const idx = Number(ln.index);
          const it = items[idx];
          const qty = Number(ln.qty) || 0;
          if (!it) throw new BadRequestError("Baris pesanan tidak ditemukan.");
          if (qty === 0) return;
          const left = Number(it.qty) - u.sentQty(status, it);
          if (qty < 0 || Math.floor(qty) !== qty) throw new BadRequestError("Qty keluar " + it.name + " harus bilangan bulat.");
          if (qty > left) throw new BadRequestError(it.name + ": keluar " + qty + " melebihi sisa pesanan " + left + " " + (it.unit || "pcs") + ".");
          outLines.push({ it: it, qty: qty });
        });
      } else {
        items.forEach((it) => {
          const left = Number(it.qty) - u.sentQty(status, it);
          if (left > 0) outLines.push({ it: it, qty: left });
        });
      }
      if (outLines.length === 0) throw new BadRequestError("Isi qty barang yang keluar minimal satu barang.");

      let sjNo = "";
      let delivery = null;
      if (mode === "kirim") sjNo = u.docNumber(tx, "SJ", date);
      const ref = mode === "kirim" ? sjNo : no;

      outLines.forEach((x) => {
        const it = x.it;
        const product = u.findProductByCode(tx, it.productCode);
        if (!product) throw new BadRequestError("Kode " + it.productCode + " (" + it.name + ") tidak ada di master barang.");
        it.sentQty = u.sentQty(status, it) + x.qty;
        u.moveStock(
          tx,
          product,
          -x.qty,
          {
            type: "OUT",
            refNo: ref,
            refType: "order",
            refId: order.id,
            reason: (mode === "kirim" ? "Dikirim ke " : "Diambil sendiri oleh ") + order.getString("customer") + " (" + no + ")",
            date: date,
          },
          e.auth
        );
      });

      if (mode === "kirim") {
        delivery = new Record(tx.findCollectionByNameOrId("deliveries"));
        delivery.set("uid", u.uid("SJ"));
        delivery.set("sj_no", sjNo);
        delivery.set("date", date);
        delivery.set("order_id", order.id);
        delivery.set("order_no", no);
        delivery.set("customer", order.getString("customer"));
        delivery.set("po_customer_ref", String(body.po_customer_ref || order.getString("po_customer_ref")));
        delivery.set("up_person", String(body.up_person || order.getString("up_person")));
        delivery.set("destination", String(body.destination || order.getString("destination")));
        delivery.set("driver_name", String(body.driver_name || ""));
        delivery.set("vehicle_plate", String(body.vehicle_plate || ""));
        delivery.set("status", "dikirim");
        delivery.set(
          "items",
          outLines.map((x) => ({ productCode: x.it.productCode, name: x.it.name, color: x.it.color, size: x.it.size, qty: x.qty, unit: x.it.unit }))
        );
        tx.save(delivery);
        u.writeAudit(tx, "deliveries", delivery, "create", e.auth, { sj_no: { from: null, to: sjNo } });
      }

      const before = status;
      order.set("items", items);
      const complete = u.allSent(status, items);
      // belum semua keluar: status tetap (masih "siap keluar" untuk sisa barangnya)
      if (complete) order.set("status", u.statusAfterOut(tx, order));
      if (body.destination) order.set("destination", String(body.destination));
      tx.save(order);
      u.writeAudit(tx, "sales_orders", order, mode === "kirim" ? "dispatch" : "pickup", e.auth, {
        status: before !== order.getString("status") ? { from: before, to: order.getString("status") } : undefined,
        sj_no: sjNo ? { from: null, to: sjNo } : undefined,
        items: { from: null, to: outLines.map((x) => x.it.name + " " + x.qty).join(", ") },
      });
      out = { order: u.toPlain(order), delivery: delivery ? u.toPlain(delivery) : null, complete: u.allSent(status, items) };
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Surat jalan sudah diterima customer (+ foto SJ bertanda tangan) ---
routerAdd(
  "POST",
  "/api/palora/deliveries/received",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "mengonfirmasi penerimaan");
    const body = e.requestInfo().body || {};
    const receivedBy = String(body.received_by || "").trim();
    if (!receivedBy) throw new BadRequestError("Nama penerima wajib diisi.");
    const files = u.uploadedFiles(e, "signed_file");
    let out;
    e.app.runInTransaction((tx) => {
      const d = tx.findRecordById("deliveries", String(body.delivery_id || ""));
      if (d.getString("status") === "diterima") throw new BadRequestError("Surat jalan ini sudah dikonfirmasi diterima.");
      d.set("status", "diterima");
      d.set("received_by", receivedBy);
      d.set("signed_by", receivedBy);
      d.set("received_date", u.parseDate(body.date).iso);
      if (files.length) d.set("signed_file", files[0]);
      tx.save(d);
      u.writeAudit(tx, "deliveries", d, "received", e.auth, { status: { from: "dikirim", to: "diterima" } });

      const orderId = d.getString("order_id");
      if (orderId) {
        const order = tx.findRecordById("sales_orders", orderId);
        const st = order.getString("status");
        // selesai hanya bila semua barang sudah keluar, semua surat jalan diterima, dan lunas
        if (st !== "batal" && u.allSent(st, u.getJSON(order, "items") || [])) {
          const next = u.statusAfterOut(tx, order);
          if (next !== st) {
            order.set("status", next);
            tx.save(order);
            u.writeAudit(tx, "sales_orders", order, "state", e.auth, { status: { from: st, to: next } });
          }
        }
      }
      out = u.toPlain(d);
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Batalkan pesanan (sebelum barang keluar) ---
routerAdd(
  "POST",
  "/api/palora/orders/cancel",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "membatalkan pesanan");
    const body = e.requestInfo().body || {};
    const reason = String(body.reason || "").trim();
    if (!reason) throw new BadRequestError("Alasan pembatalan wajib diisi.");
    let out;
    e.app.runInTransaction((tx) => {
      const order = tx.findRecordById("sales_orders", String(body.order_id || ""));
      const status = order.getString("status");
      const anySent = (u.getJSON(order, "items") || []).some((it) => u.sentQty(status, it) > 0);
      if (["baru", "dp", "lunas"].indexOf(status) === -1 || anySent) {
        throw new BadRequestError("Pesanan yang barangnya sudah keluar (sebagian/semua) tidak bisa dibatalkan. Gunakan Retur.");
      }
      if (order.getFloat("paid_amount") > 0 && u.role(e.auth) !== "owner") {
        throw new ForbiddenError("Pesanan yang sudah dibayar hanya bisa dibatalkan Owner (urus pengembalian dana).");
      }
      order.set("status", "batal");
      order.set("cancel_reason", reason);
      tx.save(order);
      u.writeAudit(tx, "sales_orders", order, "cancel", e.auth, { status: { from: status, to: "batal" }, reason: { from: null, to: reason } });
      out = u.toPlain(order);
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Retur barang dari customer (rusak / salah kirim) ---
// mode "refund": tagihan berkurang, kelebihan bayar dikembalikan (dicatat Owner/Keuangan)
// mode "ganti" : barang diganti, tagihan tetap; baris dibuka lagi untuk dikirim ulang
routerAdd(
  "POST",
  "/api/palora/orders/return",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang", "finance"], "mencatat retur");
    const body = e.requestInfo().body || {};
    const mode = String(body.mode || "");
    const reason = String(body.reason || "").trim();
    if (mode !== "refund" && mode !== "ganti") throw new BadRequestError("Pilih: uang dikembalikan atau barang diganti.");
    if (!reason) throw new BadRequestError("Alasan retur wajib diisi.");
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const myRole = u.role(e.auth);
    let out;

    e.app.runInTransaction((tx) => {
      const order = tx.findRecordById("sales_orders", String(body.order_id || ""));
      const status = order.getString("status");
      const no = order.getString("order_no");
      if (status === "batal") throw new BadRequestError("Pesanan " + no + " sudah dibatalkan.");
      const items = u.getJSON(order, "items") || [];
      const date = u.parseDate(body.date).iso;
      const done = [];

      lines.forEach((ln) => {
        const it = items[Number(ln.index)];
        const qty = Number(ln.qty) || 0;
        if (!it) throw new BadRequestError("Baris pesanan tidak ditemukan.");
        if (qty === 0) return;
        if (qty < 0 || Math.floor(qty) !== qty) throw new BadRequestError("Qty retur " + it.name + " harus bilangan bulat.");
        const sent = u.sentQty(status, it);
        const returned = Number(it.returnedQty) || 0;
        const can = sent - returned;
        if (qty > can) throw new BadRequestError(it.name + ": retur " + qty + " melebihi barang yang sudah keluar (" + can + ").");
        const good = String(ln.condition || "baik") === "baik";
        if (good) {
          const product = u.findProductByCode(tx, it.productCode);
          if (!product) throw new BadRequestError("Kode " + it.productCode + " tidak ada di master barang.");
          u.moveStock(
            tx,
            product,
            qty,
            { type: "RETUR", refNo: no, refType: "order", refId: order.id, reason: "Retur " + order.getString("customer") + ": " + reason, date: date },
            e.auth
          );
        }
        it.sentQty = sent - (mode === "ganti" ? qty : 0);
        if (mode === "refund") {
          it.returnedQty = returned + qty;
          it.sentQty = sent;
        }
        done.push({ index: Number(ln.index), name: it.name, qty: qty, condition: good ? "baik" : "rusak" });
      });
      if (done.length === 0) throw new BadRequestError("Isi qty barang yang diretur.");

      const before = { status: status, total: order.getFloat("total_amount"), paid: order.getFloat("paid_amount") };
      let refund = 0;
      if (mode === "refund") {
        // tagihan dihitung ulang dari qty bersih (dipesan - diretur)
        const s = u.getSettings(tx);
        const net = items.map((it) => {
          const q = Number(it.qty) - (Number(it.returnedQty) || 0);
          return { total: Math.round(q * Number(it.price)) };
        });
        const t = u.computeTotals(net, order.getString("tax_mode") || "none", s ? s.getFloat("ppn_rate") : 11);
        const paid = order.getFloat("paid_amount");
        refund = Math.max(0, paid - t.total);
        if (refund > 0 && myRole !== "owner" && myRole !== "finance") {
          throw new ForbiddenError("Retur ini perlu pengembalian dana " + u.rupiah(refund) + ": dicatat oleh Owner atau Keuangan.");
        }
        order.set("subtotal", t.subtotal);
        order.set("tax_amount", t.tax);
        order.set("total_amount", t.total);
        order.set("paid_amount", paid - refund);
        order.set("dp_amount", paid - refund);
        order.set("remaining_amount", t.total - (paid - refund));
        if (refund > 0) {
          const pay = new Record(tx.findCollectionByNameOrId("payments"));
          pay.set("kind", "refund");
          pay.set("order_id", order.id);
          pay.set("ref_no", no);
          pay.set("partner", order.getString("customer"));
          pay.set("date", date);
          pay.set("amount", refund);
          pay.set("method", String(body.method || "Transfer"));
          pay.set("note", "Pengembalian dana retur: " + reason);
          pay.set("recorded_by", u.actorLabel(e.auth));
          tx.save(pay);
        }
      }

      order.set("items", items);
      // status: barang ganti dibuka lagi untuk dikirim ulang; selain itu dihitung dari pengiriman & pembayaran
      if (!u.allSent(status, items)) {
        const s = u.getSettings(tx);
        order.set("status", "baru");
        order.set("status", u.statusAfterPayment(order, s ? s.getFloat("min_dp_percent") : 25));
        if (order.getString("status") !== "lunas") order.set("release_approved", true); // sudah pernah diizinkan keluar
      } else if (["dikirim", "diambil", "selesai"].indexOf(status) !== -1) {
        order.set("status", u.statusAfterOut(tx, order));
      }
      const log = u.getJSON(order, "returns") || [];
      log.push({ date: date, mode: mode, reason: reason, lines: done, refund: refund, by: u.actorName(e.auth) });
      order.set("returns", log);
      tx.save(order);
      u.writeAudit(tx, "sales_orders", order, "return", e.auth, {
        items: { from: null, to: done.map((d) => d.name + " " + d.qty + " (" + d.condition + ")").join(", ") },
        reason: { from: null, to: reason },
        total_amount: before.total !== order.getFloat("total_amount") ? { from: before.total, to: order.getFloat("total_amount") } : undefined,
        paid_amount: refund > 0 ? { from: before.paid, to: before.paid - refund } : undefined,
        status: before.status !== order.getString("status") ? { from: before.status, to: order.getString("status") } : undefined,
      });
      out = { order: u.toPlain(order), refund: refund };
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Catat dokumen yang dicetak (riwayat cetak) ---
routerAdd(
  "POST",
  "/api/palora/printed",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang", "finance"], "mencetak");
    const body = e.requestInfo().body || {};
    const coll = String(body.collection || "");
    if (["sales_orders", "deliveries", "purchase_orders"].indexOf(coll) === -1) throw new BadRequestError("Dokumen tidak dikenal.");
    const rec = e.app.findRecordById(coll, String(body.id || ""));
    u.writeAudit(e.app, coll, rec, "print", e.auth, { doc: { from: null, to: String(body.doc || "").slice(0, 60) } });
    return e.json(200, { ok: true });
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Kasir: penjualan langsung, bayar, stok terpotong, selesai ---
routerAdd(
  "POST",
  "/api/palora/kasir/checkout",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "transaksi kasir");
    const body = e.requestInfo().body || {};
    let out;
    e.app.runInTransaction((tx) => {
      const s = u.getSettings(tx);
      const items = u.cleanItems(body.items, { requireCode: true });
      const taxMode = String(body.tax_mode || "none");
      const t = u.computeTotals(items, taxMode, s ? s.getFloat("ppn_rate") : 11);
      const received = Math.round(Number(body.received_amount));
      const method = String(body.method || "Tunai");
      if (!isFinite(received) || received < t.total) {
        throw new BadRequestError("Uang diterima " + u.rupiah(received || 0) + " kurang dari total " + u.rupiah(t.total) + ".");
      }
      const date = u.parseDate(body.date).iso;
      const no = u.docNumber(tx, "NT", date);

      const order = new Record(tx.findCollectionByNameOrId("sales_orders"));
      order.set("uid", u.uid("NT"));
      order.set("order_no", no);
      order.set("date", date);
      order.set("customer", String(body.customer || "").trim() || "Pelanggan Umum");
      order.set("customer_phone", String(body.customer_phone || ""));
      order.set("items", items);
      order.set("tax_mode", taxMode);
      order.set("subtotal", t.subtotal);
      order.set("tax_amount", t.tax);
      order.set("total_amount", t.total);
      order.set("paid_amount", t.total);
      order.set("dp_amount", t.total);
      order.set("remaining_amount", 0);
      order.set("payment_type", method);
      order.set("status", "selesai");
      order.set("channel", "kasir");
      order.set("notes", String(body.notes || ""));
      order.set("created_by", u.actorName(e.auth));
      tx.save(order);

      items.forEach((it) => {
        const product = u.findProductByCode(tx, it.productCode);
        if (!product) throw new BadRequestError("Kode " + it.productCode + " tidak ada di master barang.");
        u.moveStock(
          tx,
          product,
          -it.qty,
          { type: "OUT", refNo: no, refType: "order", refId: order.id, reason: "Penjualan kasir", date: date },
          e.auth
        );
      });

      const pay = new Record(tx.findCollectionByNameOrId("payments"));
      pay.set("kind", "customer");
      pay.set("order_id", order.id);
      pay.set("ref_no", no);
      pay.set("partner", order.getString("customer"));
      pay.set("date", date);
      pay.set("amount", t.total);
      pay.set("method", method);
      pay.set("recorded_by", u.actorLabel(e.auth));
      tx.save(pay);

      const changed = items.filter((it) => it.originalPrice !== undefined && it.originalPrice !== it.price);
      u.writeAudit(tx, "sales_orders", order, "create", e.auth, {
        order_no: { from: null, to: no },
        total_amount: { from: null, to: t.total },
        price_override: changed.length ? { from: null, to: changed.map((it) => it.productCode + ": " + it.originalPrice + " -> " + it.price) } : undefined,
      });
      out = { order: u.toPlain(order), change: received - t.total };
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Koreksi stok manual satu barang ---
routerAdd(
  "POST",
  "/api/palora/stock/adjust",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "mengoreksi stok");
    const body = e.requestInfo().body || {};
    const target = Number(body.new_stock);
    const reason = String(body.reason || "").trim();
    if (!isFinite(target) || target < 0 || Math.floor(target) !== target) throw new BadRequestError("Stok baru harus bilangan bulat 0 atau lebih.");
    if (!reason) throw new BadRequestError("Alasan koreksi wajib diisi.");
    let out;
    e.app.runInTransaction((tx) => {
      const p = tx.findRecordById("products", String(body.product_id || ""));
      const delta = target - p.getInt("stock");
      if (delta !== 0) u.moveStock(tx, p, delta, { type: "ADJUSTMENT", refNo: "KOREKSI", reason: reason, date: body.date }, e.auth);
      out = u.toPlain(p);
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Stok opname: hanya baris yang dihitung yang disesuaikan ---
routerAdd(
  "POST",
  "/api/palora/opname/apply",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "menyimpan stok opname");
    const body = e.requestInfo().body || {};
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) throw new BadRequestError("Belum ada barang yang dihitung.");
    let out;
    e.app.runInTransaction((tx) => {
      const date = u.parseDate(body.date).iso;
      const code = u.docNumber(tx, "OP", date);
      const result = [];
      let adjusted = 0;
      lines.forEach((ln) => {
        if (ln.counted === "" || ln.counted === null || ln.counted === undefined) {
          throw new BadRequestError("Ada baris hitung yang masih kosong.");
        }
        const counted = Number(ln.counted);
        if (!isFinite(counted) || counted < 0 || Math.floor(counted) !== counted) {
          throw new BadRequestError("Hasil hitung harus bilangan bulat 0 atau lebih.");
        }
        const p = tx.findRecordById("products", String(ln.product_id || ""));
        // Selisih dihitung terhadap stok sistem SAAT lembar dihitung (system_at_count), supaya penjualan/penerimaan
        // yang terjadi antara menghitung dan menyimpan tidak ikut "dikoreksi".
        const snap = ln.system_at_count;
        const hasSnap = snap !== undefined && snap !== null && snap !== "" && isFinite(Number(snap));
        const system = hasSnap ? Number(snap) : p.getInt("stock");
        const delta = counted - system;
        if (delta !== 0) {
          u.moveStock(
            tx,
            p,
            delta,
            {
              type: "OPNAME",
              refNo: code,
              refType: "opname",
              reason: delta > 0 ? "Fisik lebih " + delta + " dari sistem" : "Fisik kurang " + -delta + " dari sistem",
              date: date,
            },
            e.auth
          );
          adjusted++;
        }
        result.push({ product_id: p.id, code: p.getString("code"), name: p.getString("name"), system: system, counted: counted, diff: delta });
      });
      const sess = new Record(tx.findCollectionByNameOrId("opname_sessions"));
      sess.set("code", code);
      sess.set("date", date);
      sess.set("scope", String(body.scope || "Semua barang"));
      sess.set("lines", result);
      sess.set("adjusted_count", adjusted);
      sess.set("note", String(body.note || ""));
      sess.set("created_by", u.actorLabel(e.auth));
      tx.save(sess);
      out = u.toPlain(sess);
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Import / update master barang dari Excel ---
routerAdd(
  "POST",
  "/api/palora/products/import",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "import barang");
    const body = e.requestInfo().body || {};
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) throw new BadRequestError("File tidak berisi baris barang.");
    let created = 0;
    let updated = 0;
    e.app.runInTransaction((tx) => {
      const coll = tx.findCollectionByNameOrId("products");
      rows.forEach((row, i) => {
        const code = String(row.code === undefined || row.code === null ? "" : row.code).trim();
        if (!code) throw new BadRequestError("Baris " + (i + 2) + ": Kode barang kosong.");
        let p = u.findProductByCode(tx, code);
        const isNew = !p;
        if (isNew) {
          if (!String(row.name || "").trim()) throw new BadRequestError("Baris " + (i + 2) + ": Nama barang kosong.");
          p = new Record(coll);
          p.set("uid", u.uid("PRD"));
          p.set("code", code);
          p.set("stock", 0);
          p.set("unit", "pcs");
        }
        const setText = (k, col) => {
          if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") p.set(col, String(row[k]).trim());
        };
        const setNum = (k, col) => {
          if (row[k] === undefined || row[k] === null || String(row[k]).trim() === "") return;
          const n = Number(row[k]);
          if (!isFinite(n) || n < 0) throw new BadRequestError("Baris " + (i + 2) + ": " + col + " tidak valid.");
          p.set(col, n);
        };
        setText("name", "name");
        if (row.name) p.set("clean_name", String(row.name).trim());
        setText("group_name", "group_name");
        setText("category", "category");
        setText("color", "color");
        setText("size", "size");
        setText("unit", "unit");
        setText("factory", "factory");
        setText("notes", "notes");
        setNum("buy_price", "buy_price");
        setNum("sell_price", "sell_price");
        setNum("min_stock", "min_stock");
        tx.save(p);
        u.writeAudit(tx, "products", p, isNew ? "create" : "import", e.auth, {});
        if (row.stock !== undefined && row.stock !== null && String(row.stock).trim() !== "") {
          const target = Number(row.stock);
          if (!isFinite(target) || target < 0) throw new BadRequestError("Baris " + (i + 2) + ": stok tidak valid.");
          const delta = Math.round(target) - p.getInt("stock");
          if (delta !== 0) u.moveStock(tx, p, delta, { type: "ADJUSTMENT", refNo: "IMPORT-EXCEL", reason: "Import Excel stok", date: body.date }, e.auth);
        }
        if (isNew) created++;
        else updated++;
      });
    });
    return e.json(200, { created: created, updated: updated });
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Import laporan penjualan marketplace ---
routerAdd(
  "POST",
  "/api/palora/marketplace/import",
  (e) => {
    const u = require(`${__hooks}/utils.js`);
    u.requireRole(e.auth, ["owner", "gudang"], "import marketplace");
    const body = e.requestInfo().body || {};
    const store = String(body.store || "").trim();
    if (!store) throw new BadRequestError("Pilih toko marketplace dulu.");
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const mappings = body.mappings || {};
    const dryRun = !!body.dry_run;
    if (rows.length === 0) throw new BadRequestError("File tidak berisi pesanan.");

    let out;
    e.app.runInTransaction((tx) => {
      // simpan pemetaan SKU baru
      const mapColl = tx.findCollectionByNameOrId("sku_mappings");
      const resolveSku = (sku) => {
        const key = String(sku || "").trim();
        if (mappings[key]) return String(mappings[key]);
        try {
          return tx.findFirstRecordByFilter("sku_mappings", "store = {:s} && sku = {:k}", { s: store, k: key }).getString("product_code");
        } catch (_) {
          return key;
        }
      };

      // kelompokkan per no. pesanan marketplace
      const orders = {};
      const orderList = [];
      rows.forEach((r) => {
        const no = String(r.order_no || "").trim();
        if (!no) return;
        if (!orders[no]) {
          orders[no] = { no: no, date: r.date, items: [] };
          orderList.push(orders[no]);
        }
        orders[no].items.push(r);
      });

      const skipped = [];
      const unknown = [];
      const toCreate = [];
      orderList.forEach((o) => {
        try {
          tx.findFirstRecordByFilter("sales_orders", "store = {:s} && marketplace_order_no = {:n}", { s: store, n: o.no });
          skipped.push(o.no);
          return;
        } catch (_) {}
        const items = o.items.map((r) => {
          const code = resolveSku(r.sku);
          const p = u.findProductByCode(tx, code);
          if (!p) unknown.push({ sku: String(r.sku || ""), name: String(r.name || ""), order_no: o.no });
          return { product: p, row: r, code: code };
        });
        toCreate.push({ o: o, items: items });
      });

      if (unknown.length) {
        out = { ok: false, unknown: unknown, skipped: skipped };
        if (!dryRun) throw new BadRequestError("Ada " + unknown.length + " SKU yang belum dicocokkan dengan kode barang.");
        return;
      }
      if (dryRun) {
        out = { ok: true, skipped: skipped, orders: toCreate.length, unknown: [] };
        return;
      }

      Object.keys(mappings).forEach((sku) => {
        let m;
        try {
          m = tx.findFirstRecordByFilter("sku_mappings", "store = {:s} && sku = {:k}", { s: store, k: sku });
        } catch (_) {
          m = new Record(mapColl);
          m.set("store", store);
          m.set("sku", sku);
        }
        m.set("product_code", String(mappings[sku]));
        tx.save(m);
      });

      let itemCount = 0;
      let totalAmount = 0;
      toCreate.forEach((entry) => {
        const date = u.parseDate(entry.o.date).iso;
        const items = u.cleanItems(
          entry.items.map((x) => ({
            productCode: x.product.getString("code"),
            name: x.product.getString("name"),
            color: x.product.getString("color"),
            unit: x.product.getString("unit"),
            qty: x.row.qty,
            price: x.row.price || 0,
          }))
        );
        const total = items.reduce((s, it) => s + it.total, 0);
        const no = u.docNumber(tx, "MP", date);
        const order = new Record(tx.findCollectionByNameOrId("sales_orders"));
        order.set("uid", u.uid("MP"));
        order.set("order_no", no);
        order.set("date", date);
        order.set("customer", store);
        order.set("store", store);
        order.set("marketplace_order_no", entry.o.no);
        order.set("items", items);
        order.set("tax_mode", "none");
        order.set("subtotal", total);
        order.set("total_amount", total);
        order.set("paid_amount", total);
        order.set("dp_amount", total);
        order.set("remaining_amount", 0);
        order.set("payment_type", "Marketplace");
        order.set("status", "selesai");
        order.set("channel", "marketplace");
        order.set("created_by", u.actorName(e.auth));
        tx.save(order);
        items.forEach((it) => {
          const p = u.findProductByCode(tx, it.productCode);
          u.moveStock(
            tx,
            p,
            -it.qty,
            { type: "OUT", refNo: store + " #" + entry.o.no, refType: "order", refId: order.id, reason: "Penjualan " + store, date: date },
            e.auth
          );
          itemCount += it.qty;
        });
        totalAmount += total;
      });

      const log = new Record(tx.findCollectionByNameOrId("marketplace_imports"));
      log.set("store", store);
      log.set("file_name", String(body.file_name || ""));
      log.set("order_count", toCreate.length);
      log.set("item_count", itemCount);
      log.set("total_amount", totalAmount);
      log.set("imported_by", u.actorLabel(e.auth));
      tx.save(log);
      out = { ok: true, created: toCreate.length, skipped: skipped, item_count: itemCount, total_amount: totalAmount };
    });
    return e.json(200, out);
  },
  $apis.requireAuth("users", "_superusers")
);

// --- Endpoint kesehatan ---
routerAdd("GET", "/api/palora/health", (e) => {
  return e.json(200, { ok: true, app: "PALORA", time: new Date().toISOString() });
});
