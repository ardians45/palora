/// <reference path="../pb_data/types.d.ts" />
// Draft pesanan: disimpan dulu walau belum lengkap. Belum punya nomor invoice (nomor INV baru dibuat
// saat pesanan disimpan final), belum dihitung omzet/piutang, dan belum memesan stok.
migrate(
  (app) => {
    const so = app.findCollectionByNameOrId("sales_orders");
    const status = so.fields.getByName("status");
    if (status.values.indexOf("draft") === -1) status.values = ["draft", ...status.values];
    app.save(so);
  },
  (app) => {
    const so = app.findCollectionByNameOrId("sales_orders");
    const status = so.fields.getByName("status");
    status.values = status.values.filter((v) => v !== "draft");
    app.save(so);
  }
);
