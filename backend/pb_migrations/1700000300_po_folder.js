/// <reference path="../pb_data/types.d.ts" />
// "Map PO": invoice & faktur supplier bisa dicatat Mas Heri (gudang) saat dokumen datang,
// ditautkan ke PO dan ke surat jalan mana saja yang ditagih. Pembayaran tetap hanya Owner/Keuangan.
const ROLE_ANY = '(@request.auth.role = "owner" || @request.auth.role = "gudang" || @request.auth.role = "finance")';
const OWNER_FINANCE = '(@request.auth.role = "owner" || @request.auth.role = "finance")';

migrate(
  (app) => {
    const inv = app.findCollectionByNameOrId("supplier_invoices");
    if (!inv.fields.getByName("sj_nos")) inv.fields.add(new JSONField({ name: "sj_nos", maxSize: 100000 }));
    if (!inv.fields.getByName("received_date")) inv.fields.add(new TextField({ name: "received_date", max: 30 }));
    if (!inv.fields.getByName("received_by")) inv.fields.add(new TextField({ name: "received_by", max: 200 }));
    inv.listRule = ROLE_ANY;
    inv.viewRule = ROLE_ANY;
    inv.createRule = ROLE_ANY;
    // gudang boleh melengkapi foto/no. faktur; nilai bayar hanya lewat endpoint pembayaran
    inv.updateRule = `${ROLE_ANY} && @request.body.paid_amount:isset = false && (${OWNER_FINANCE} || @request.body.total_amount:isset = false)`;
    inv.indexes = [...inv.indexes, "CREATE INDEX idx_supinv_supplier ON supplier_invoices (supplier)"];
    app.save(inv);
  },
  (app) => {
    const inv = app.findCollectionByNameOrId("supplier_invoices");
    inv.fields.removeByName("sj_nos");
    inv.fields.removeByName("received_date");
    inv.fields.removeByName("received_by");
    app.save(inv);
  }
);
