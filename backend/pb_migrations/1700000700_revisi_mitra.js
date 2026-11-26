/// <reference path="../pb_data/types.d.ts" />
// Revisi dari mitra (lihat docs/PLAN_REVISI_MITRA.md):
// - supplier PPN (PKP) / non-PPN, PO ikut: subtotal (DPP) + PPN + total
// - barang produksi sendiri: batch produksi dengan HPP per unit, masuk stok tanpa PO/hutang
// (order online manual memakai kolom store + marketplace_order_no yang sudah ada)
const AUTH = '@request.auth.id != "" && @request.auth.active = true';

function addFields(app, name, fields) {
  const c = app.findCollectionByNameOrId(name);
  for (const f of fields) {
    if (!c.fields.getByName(f.name)) c.fields.add(new Field(f));
  }
  return c;
}

migrate(
  (app) => {
    app.save(addFields(app, "suppliers", [{ type: "bool", name: "pkp" }]));
    app.save(addFields(app, "purchase_orders", [{ type: "bool", name: "ppn" }, { type: "number", name: "subtotal" }, { type: "number", name: "tax_amount" }]));
    app.save(addFields(app, "products", [{ type: "bool", name: "produced" }]));

    const text = (name, max) => ({ type: "text", name, max });
    const num = (name) => ({ type: "number", name });
    app.save(
      new Collection({
        type: "base",
        name: "productions",
        listRule: AUTH,
        viewRule: AUTH,
        createRule: null, // hanya lewat /api/palora/production
        updateRule: null,
        deleteRule: null,
        fields: [
          text("batch_no", 60),
          text("date", 30),
          { type: "select", name: "status", values: ["selesai", "batal"], maxSelect: 1 },
          text("product_id", 30),
          text("product_code", 80),
          text("product_name", 300),
          text("unit", 30),
          num("qty"),
          num("material_cost"),
          num("service_cost"),
          num("other_cost"),
          num("total_cost"),
          num("unit_cost"),
          num("sell_price"),
          num("cost_before"),
          num("cost_after"),
          text("source", 200),
          text("notes", 2000),
          text("cancel_reason", 500),
          text("created_by", 200),
          { type: "autodate", name: "created", onCreate: true, onUpdate: false },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_productions_no ON productions (batch_no)", "CREATE INDEX idx_productions_product ON productions (product_code)"],
      })
    );
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("productions"));
    } catch (_) {}
    [
      ["suppliers", ["pkp"]],
      ["purchase_orders", ["ppn", "subtotal", "tax_amount"]],
      ["products", ["produced"]],
    ].forEach(([name, fields]) => {
      const c = app.findCollectionByNameOrId(name);
      fields.forEach((f) => c.fields.removeByName(f));
      app.save(c);
    });
  }
);
