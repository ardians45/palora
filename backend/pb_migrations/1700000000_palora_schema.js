/// <reference path="../pb_data/types.d.ts" />
// Skema database PALORA (PT Paletindo Prakarsa Unggul).
//
// Prinsip:
// - Tiap tabel bisnis punya kolom `uid` = ID yang dipakai frontend (mis. "PRD-0001", "ORD-...").
// - Kolom penting jadi kolom asli (bisa difilter/di-query); detail baris (items, payments,
//   receipts) disimpan sebagai JSON karena selalu dibaca bersama dokumen induknya.
// - Kolom `extra` (JSON) menampung atribut tambahan dari UI yang belum punya kolom sendiri.
// - Tidak ada hapus permanen lewat API (deleteRule = null) -> soft delete via kolom `deleted`.
// - `stock` produk & `current_debt` customer hanya bisa berubah lewat endpoint
//   /api/palora/increment (atomik + tercatat di audit trail), lihat pb_hooks/palora.pb.js.

const AUTH = '@request.auth.id != ""';
const OWNER = '@request.auth.role = "owner"';
const OWNER_GUDANG = '(@request.auth.role = "owner" || @request.auth.role = "gudang")';

const text = (name, opts = {}) => ({ type: "text", name, max: 0, ...opts });
const num = (name, opts = {}) => ({ type: "number", name, ...opts });
const bool = (name) => ({ type: "bool", name });
const json = (name) => ({ type: "json", name, maxSize: 5000000 });
const timestamps = () => [
  { type: "autodate", name: "created", onCreate: true, onUpdate: false },
  { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
];
const base = (name) => [text("uid", { required: true, max: 120 })];

const collections = [
  {
    name: "products",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: OWNER_GUDANG,
    updateRule: `${OWNER_GUDANG} && @request.body.stock:isset = false`,
    deleteRule: null,
    fields: [
      ...base(),
      text("code", { required: true, max: 60 }),
      text("name", { required: true, max: 300 }),
      text("clean_name", { max: 300 }),
      text("category", { max: 120 }),
      text("json_category", { max: 120 }),
      text("factory", { max: 200 }),
      num("stock", { min: 0, onlyInt: true }),
      text("unit", { max: 20 }),
      num("min_stock", { min: 0 }),
      num("buy_price", { min: 0 }),
      num("sell_price", { min: 0 }),
      text("location", { max: 120 }),
      text("color", { max: 60 }),
      text("color_category", { max: 60 }),
      text("notes", { max: 2000 }),
      text("image_url", { max: 2000 }),
      bool("deleted"),
      json("extra"),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_products_uid ON products (uid)",
      "CREATE UNIQUE INDEX idx_products_code ON products (code) WHERE deleted = FALSE",
      "CREATE INDEX idx_products_category ON products (category)",
    ],
  },
  {
    name: "customers",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: AUTH,
    updateRule: `${AUTH} && @request.body.current_debt:isset = false`,
    deleteRule: null,
    fields: [
      ...base(),
      text("name", { required: true, max: 200 }),
      text("contact_person", { max: 200 }),
      text("phone", { max: 100 }),
      text("email", { max: 200 }),
      text("address", { max: 1000 }),
      text("shipping_address", { max: 1000 }),
      text("npwp", { max: 40 }),
      text("type", { max: 60 }),
      num("credit_limit", { min: 0 }),
      num("current_debt", { min: 0 }),
      bool("deleted"),
      json("extra"),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_customers_uid ON customers (uid)"],
  },
  {
    name: "suppliers",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: AUTH,
    updateRule: AUTH,
    deleteRule: null,
    fields: [
      ...base(),
      text("name", { required: true, max: 200 }),
      text("sales_person", { max: 200 }),
      text("phone", { max: 100 }),
      text("email", { max: 200 }),
      text("address", { max: 1000 }),
      text("terms", { max: 200 }),
      json("categories"),
      bool("deleted"),
      json("extra"),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_suppliers_uid ON suppliers (uid)"],
  },
  {
    name: "sales_orders",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: OWNER_GUDANG,
    // Finance boleh update (rekam pembayaran). Izin kirim sebelum lunas hanya Owner.
    updateRule: `${AUTH} && (@request.body.release_approved:isset = false || ${OWNER})`,
    deleteRule: null,
    fields: [
      ...base(),
      text("order_no", { required: true, max: 80 }),
      text("date", { max: 30 }),
      text("customer", { max: 200 }),
      text("po_customer_ref", { max: 120 }),
      text("up_person", { max: 200 }),
      text("destination", { max: 1000 }),
      json("items"),
      num("total_amount"),
      num("dp_amount"),
      num("remaining_amount"),
      text("payment_type", { max: 120 }),
      text("payment_status", { max: 120 }),
      text("delivery_status", { max: 200 }),
      text("due_date", { max: 30 }),
      text("tax_invoice_no", { max: 60 }),
      json("payments"),
      text("notes", { max: 5000 }),
      text("created_by", { max: 200 }),
      bool("release_approved"),
      bool("deleted"),
      json("extra"),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_sales_orders_uid ON sales_orders (uid)",
      "CREATE UNIQUE INDEX idx_sales_orders_no ON sales_orders (order_no) WHERE deleted = FALSE",
      "CREATE INDEX idx_sales_orders_customer ON sales_orders (customer)",
    ],
  },
  {
    name: "purchase_orders",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: OWNER_GUDANG,
    updateRule: AUTH, // finance mencatat invoice & pembayaran ke supplier
    deleteRule: null,
    fields: [
      ...base(),
      text("po_no", { required: true, max: 80 }),
      text("date", { max: 30 }),
      text("supplier", { max: 200 }),
      text("up_person", { max: 200 }),
      json("items"),
      num("total_amount"),
      text("status", { max: 120 }),
      text("expected_date", { max: 30 }),
      json("receipts"),
      json("invoice"),
      text("notes", { max: 5000 }),
      bool("is_direct_ship"),
      text("created_by", { max: 200 }),
      bool("deleted"),
      json("extra"),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_purchase_orders_uid ON purchase_orders (uid)",
      "CREATE UNIQUE INDEX idx_purchase_orders_no ON purchase_orders (po_no) WHERE deleted = FALSE",
    ],
  },
  {
    name: "deliveries",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: OWNER_GUDANG,
    updateRule: OWNER_GUDANG,
    deleteRule: null,
    fields: [
      ...base(),
      text("sj_no", { required: true, max: 80 }),
      text("date", { max: 30 }),
      text("order_no", { max: 80 }),
      text("customer", { max: 200 }),
      text("po_customer_ref", { max: 120 }),
      text("up_person", { max: 200 }),
      text("destination", { max: 1000 }),
      text("driver_name", { max: 200 }),
      text("vehicle_plate", { max: 100 }),
      text("status", { max: 200 }),
      text("tax_invoice_no", { max: 60 }),
      json("items"),
      text("signed_by", { max: 300 }),
      bool("deleted"),
      json("extra"),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_deliveries_uid ON deliveries (uid)",
      "CREATE UNIQUE INDEX idx_deliveries_no ON deliveries (sj_no) WHERE deleted = FALSE",
    ],
  },
  {
    name: "documents",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: AUTH,
    updateRule: AUTH,
    deleteRule: null,
    fields: [
      ...base(),
      text("title", { max: 300 }),
      text("type", { max: 120 }),
      text("ref_no", { max: 120 }),
      text("date", { max: 30 }),
      text("partner", { max: 200 }),
      text("file_name", { max: 300 }),
      {
        type: "file",
        name: "file",
        maxSelect: 1,
        maxSize: 5 * 1024 * 1024, // F-GR02: maks 5MB
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
        protected: false,
      },
      text("uploaded_by", { max: 200 }),
      text("category", { max: 120 }),
      bool("deleted"),
      json("extra"),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_documents_uid ON documents (uid)",
      "CREATE INDEX idx_documents_ref ON documents (ref_no)",
    ],
  },
  {
    name: "stock_movements",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: OWNER_GUDANG,
    updateRule: null, // riwayat mutasi tidak boleh diubah
    deleteRule: null,
    fields: [
      ...base(),
      text("date", { max: 30 }),
      text("type", { max: 30 }),
      text("product_uid", { max: 120 }),
      text("product_code", { max: 60 }),
      text("product_name", { max: 300 }),
      num("qty"),
      text("ref_no", { max: 200 }),
      text("reason", { max: 1000 }),
      num("before_stock"),
      num("after_stock"),
      text("operator", { max: 200 }),
      json("extra"),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_stock_movements_uid ON stock_movements (uid)",
      "CREATE INDEX idx_stock_movements_code ON stock_movements (product_code)",
    ],
  },
  {
    name: "system_logs",
    listRule: OWNER,
    viewRule: OWNER,
    createRule: AUTH, // kolom `user` di-stempel server dari akun login
    updateRule: null,
    deleteRule: null,
    fields: [
      ...base(),
      text("date", { max: 30 }),
      text("user", { max: 200 }),
      text("module", { max: 120 }),
      text("action", { max: 200 }),
      text("detail", { max: 5000 }),
      json("extra"),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_system_logs_uid ON system_logs (uid)"],
  },
];

migrate(
  (app) => {
    // --- users: tambah role + aturan akses (PRD 6.7) ---
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(
      new SelectField({
        name: "role",
        values: ["owner", "gudang", "finance"],
        maxSelect: 1,
        required: true,
      })
    );
    users.fields.add(new BoolField({ name: "active" }));
    users.listRule = `id = @request.auth.id || ${OWNER}`;
    users.viewRule = `id = @request.auth.id || ${OWNER}`;
    users.createRule = OWNER;
    // user biasa boleh ganti nama/password sendiri, tapi tidak boleh ganti role / status aktif
    users.updateRule = `${OWNER} || (id = @request.auth.id && @request.body.role:isset = false && @request.body.active:isset = false)`;
    users.deleteRule = OWNER;
    // hanya user aktif yang bisa login
    users.authRule = "active = true";
    // NFR 7.3: session login dengan timeout (8 jam = 1 shift kerja)
    users.authToken.duration = 8 * 60 * 60;
    app.save(users);

    for (const def of collections) {
      const c = new Collection({
        type: "base",
        name: def.name,
        listRule: def.listRule,
        viewRule: def.viewRule,
        createRule: def.createRule,
        updateRule: def.updateRule,
        deleteRule: def.deleteRule,
        fields: [...def.fields, ...timestamps()],
        indexes: def.indexes,
      });
      app.save(c);
    }

    // --- audit_trail: diisi otomatis oleh hooks, read-only untuk Owner ---
    const audit = new Collection({
      type: "base",
      name: "audit_trail",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        text("collection_name", { required: true, max: 60 }),
        text("record_id", { max: 30 }),
        text("record_uid", { max: 120 }),
        text("action", { required: true, max: 30 }),
        { type: "relation", name: "actor", collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        text("actor_name", { max: 200 }),
        json("changes"),
        ...timestamps(),
      ],
      indexes: [
        "CREATE INDEX idx_audit_collection ON audit_trail (collection_name, record_id)",
        "CREATE INDEX idx_audit_created ON audit_trail (created)",
      ],
    });
    app.save(audit);
  },
  (app) => {
    for (const name of ["audit_trail", ...collections.map((c) => c.name).reverse()]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("role");
    users.fields.removeByName("active");
    app.save(users);
  }
);
