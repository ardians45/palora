/// <reference path="../pb_data/types.d.ts" />
// PALORA v2: status baku, pembayaran, hutang supplier, penomoran server, pengaturan perusahaan,
// marketplace, stok opname. Aksi bisnis yang menyentuh stok/uang hanya lewat endpoint
// /api/palora/* (lihat pb_hooks/palora.pb.js) supaya selalu dalam satu transaksi.

const AUTH = '@request.auth.id != ""';
const OWNER = '@request.auth.role = "owner"';
const OWNER_GUDANG = '(@request.auth.role = "owner" || @request.auth.role = "gudang")';
const OWNER_FINANCE = '(@request.auth.role = "owner" || @request.auth.role = "finance")';

const text = (name, opts = {}) => ({ type: "text", name, max: 0, ...opts });
const num = (name, opts = {}) => ({ type: "number", name, ...opts });
const bool = (name) => ({ type: "bool", name });
const json = (name) => ({ type: "json", name, maxSize: 5000000 });
const file = (name, opts = {}) => ({
  type: "file",
  name,
  maxSelect: 1,
  maxSize: 5 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
  ...opts,
});
const timestamps = () => [
  { type: "autodate", name: "created", onCreate: true, onUpdate: false },
  { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
];

function addFields(app, name, fields) {
  const c = app.findCollectionByNameOrId(name);
  for (const f of fields) {
    if (!c.fields.getByName(f.name)) c.fields.add(new Field(f));
  }
  return c;
}

migrate(
  (app) => {
    // ---------------- kolom tambahan ----------------
    const products = addFields(app, "products", [text("size", { max: 120 }), text("group_name", { max: 120 })]);
    // stok hanya berubah lewat endpoint server
    products.updateRule = `${OWNER_GUDANG} && @request.body.stock:isset = false`;
    app.save(products);

    const customers = addFields(app, "customers", [text("default_terms", { max: 60 }), text("whatsapp", { max: 40 })]);
    // piutang dihitung dari pesanan, bukan diubah manual
    customers.updateRule = `${AUTH} && @request.body.current_debt:isset = false`;
    app.save(customers);

    const suppliers = addFields(app, "suppliers", [text("whatsapp", { max: 40 }), text("discount_rule", { max: 200 })]);
    app.save(suppliers);

    const so = addFields(app, "sales_orders", [
      {
        type: "select",
        name: "status",
        values: ["baru", "dp", "lunas", "dikirim", "diambil", "selesai", "batal"],
        maxSelect: 1,
      },
      { type: "select", name: "channel", values: ["pesanan", "kasir", "marketplace"], maxSelect: 1 },
      { type: "select", name: "tax_mode", values: ["none", "include", "exclude"], maxSelect: 1 },
      num("paid_amount"),
      num("subtotal"),
      num("tax_amount"),
      text("store", { max: 60 }),
      text("marketplace_order_no", { max: 120 }),
      text("customer_phone", { max: 60 }),
      text("cancel_reason", { max: 500 }),
      text("dp_override_by", { max: 200 }),
    ]);
    // pembuatan & perubahan nilai uang/status hanya lewat endpoint server
    so.createRule = OWNER_GUDANG;
    so.updateRule =
      `${OWNER_GUDANG} && @request.body.status:isset = false && @request.body.paid_amount:isset = false` +
      ` && @request.body.total_amount:isset = false && @request.body.release_approved:isset = false`;
    so.indexes = [
      ...so.indexes,
      "CREATE UNIQUE INDEX idx_sales_orders_mp ON sales_orders (store, marketplace_order_no) WHERE marketplace_order_no != ''",
    ];
    app.save(so);

    const po = addFields(app, "purchase_orders", [
      {
        type: "select",
        name: "state",
        values: ["draft", "dikirim", "sebagian", "selesai", "batal"],
        maxSelect: 1,
      },
      text("supplier_phone", { max: 60 }),
      text("supplier_email", { max: 200 }),
    ]);
    po.updateRule = `${OWNER_GUDANG} && @request.body.receipts:isset = false && @request.body.state:isset = false`;
    app.save(po);

    const dlv = addFields(app, "deliveries", [
      text("order_id", { max: 30 }),
      text("received_by", { max: 200 }),
      text("received_date", { max: 30 }),
      file("signed_file"),
    ]);
    dlv.createRule = null; // hanya lewat /api/palora/sales/dispatch
    app.save(dlv);

    const mv = addFields(app, "stock_movements", [text("ref_type", { max: 30 }), text("ref_id", { max: 30 })]);
    mv.createRule = null; // hanya server
    app.save(mv);

    // riwayat dokumen bisa dilihat semua pengguna (panel "Riwayat" di tiap dokumen);
    // riwayat akun & pengaturan tetap khusus Owner
    const audit = app.findCollectionByNameOrId("audit_trail");
    const auditRule = `${AUTH} && (${OWNER} || (collection_name != "users" && collection_name != "settings"))`;
    audit.listRule = auditRule;
    audit.viewRule = auditRule;
    app.save(audit);

    // ---------------- tabel baru ----------------
    const settings = new Collection({
      type: "base",
      name: "settings",
      listRule: AUTH,
      viewRule: AUTH,
      createRule: null,
      updateRule: OWNER,
      deleteRule: null,
      fields: [
        text("company_name", { max: 200 }),
        text("tagline", { max: 300 }),
        text("address", { max: 500 }),
        text("city", { max: 100 }),
        text("phone", { max: 200 }),
        text("fax", { max: 100 }),
        text("email", { max: 200 }),
        text("npwp", { max: 40 }),
        json("bank_accounts"),
        text("signer_name", { max: 200 }),
        text("doc_code", { max: 10 }),
        num("ppn_rate"),
        num("min_dp_percent"),
        ...timestamps(),
      ],
    });
    app.save(settings);
    const s = new Record(settings);
    s.set("company_name", "PT Paletindo Prakarsa Unggul");
    s.set("tagline", "Palet Plastik, Box Logistik, Krat Industri & Perabot Plastik");
    s.set("address", "Jelupang, Kec. Serpong Utara, Kota Tangerang Selatan, Banten 15323");
    s.set("city", "Tangerang Selatan");
    s.set("phone", "0878-7766-2097 / 0812-8819-7597");
    s.set("email", "marketing@paletindo.com");
    s.set("bank_accounts", []);
    s.set("signer_name", "");
    s.set("doc_code", "PPU");
    s.set("ppn_rate", 11);
    s.set("min_dp_percent", 25);
    app.save(s);

    const counters = new Collection({
      type: "base",
      name: "counters",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [text("key", { required: true, max: 60 }), num("value", { onlyInt: true }), ...timestamps()],
      indexes: ["CREATE UNIQUE INDEX idx_counters_key ON counters (key)"],
    });
    app.save(counters);
    // melanjutkan nomor dokumen kertas yang terakhir (SJ 0062, PO 37)
    for (const [key, value] of [
      ["SJ", 62],
      ["PO", 37],
    ]) {
      const r = new Record(counters);
      r.set("key", key);
      r.set("value", value);
      app.save(r);
    }

    const supInv = new Collection({
      type: "base",
      name: "supplier_invoices",
      listRule: OWNER_FINANCE,
      viewRule: OWNER_FINANCE,
      createRule: OWNER_FINANCE,
      updateRule: `${OWNER_FINANCE} && @request.body.paid_amount:isset = false`,
      deleteRule: null,
      fields: [
        text("invoice_no", { required: true, max: 120 }),
        text("po_id", { max: 30 }),
        text("po_no", { max: 80 }),
        text("supplier", { required: true, max: 200 }),
        text("date", { max: 30 }),
        text("due_date", { max: 30 }),
        num("total_amount", { min: 0 }),
        num("paid_amount", { min: 0 }),
        text("tax_invoice_no", { max: 60 }),
        file("file"),
        file("tax_file"),
        text("notes", { max: 2000 }),
        text("created_by", { max: 200 }),
        bool("deleted"),
        ...timestamps(),
      ],
      indexes: ["CREATE INDEX idx_supinv_po ON supplier_invoices (po_id)"],
    });
    app.save(supInv);

    const payments = new Collection({
      type: "base",
      name: "payments",
      listRule: AUTH,
      viewRule: AUTH,
      createRule: null, // hanya lewat /api/palora/payment
      updateRule: null,
      deleteRule: null,
      fields: [
        { type: "select", name: "kind", values: ["customer", "supplier"], maxSelect: 1, required: true },
        text("order_id", { max: 30 }),
        text("invoice_id", { max: 30 }),
        text("ref_no", { max: 120 }),
        text("partner", { max: 200 }),
        text("date", { max: 30 }),
        num("amount", { min: 0 }),
        text("method", { max: 60 }),
        text("note", { max: 1000 }),
        file("proof"),
        text("recorded_by", { max: 200 }),
        ...timestamps(),
      ],
      indexes: [
        "CREATE INDEX idx_payments_order ON payments (order_id)",
        "CREATE INDEX idx_payments_invoice ON payments (invoice_id)",
      ],
    });
    app.save(payments);

    const mapping = new Collection({
      type: "base",
      name: "sku_mappings",
      listRule: AUTH,
      viewRule: AUTH,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [text("store", { max: 60 }), text("sku", { required: true, max: 200 }), text("product_code", { max: 60 }), ...timestamps()],
      indexes: ["CREATE UNIQUE INDEX idx_sku_map ON sku_mappings (store, sku)"],
    });
    app.save(mapping);

    const mpImports = new Collection({
      type: "base",
      name: "marketplace_imports",
      listRule: AUTH,
      viewRule: AUTH,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        text("store", { max: 60 }),
        text("file_name", { max: 300 }),
        num("order_count"),
        num("item_count"),
        num("total_amount"),
        text("imported_by", { max: 200 }),
        ...timestamps(),
      ],
    });
    app.save(mpImports);

    const opname = new Collection({
      type: "base",
      name: "opname_sessions",
      listRule: AUTH,
      viewRule: AUTH,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        text("code", { max: 60 }),
        text("date", { max: 30 }),
        text("scope", { max: 200 }),
        json("lines"),
        num("adjusted_count"),
        text("note", { max: 1000 }),
        text("created_by", { max: 200 }),
        ...timestamps(),
      ],
    });
    app.save(opname);
  },
  (app) => {
    for (const name of ["opname_sessions", "marketplace_imports", "sku_mappings", "payments", "supplier_invoices", "counters", "settings"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
  }
);
