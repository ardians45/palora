/// <reference path="../pb_data/types.d.ts" />
// Hasil wawancara:
// - 1 pesanan bisa keluar dalam beberapa surat jalan (mobil tidak muat): items[].sentQty (dihitung server)
// - Barang rusak/retur setelah dikirim: uang dikembalikan atau barang diganti -> sales_orders.returns + payments kind "refund"
// - Barang PO bisa langsung dikirim ke customer (tidak mampir gudang): purchase_orders.for_orders
migrate(
  (app) => {
    const pay = app.findCollectionByNameOrId("payments");
    const kind = pay.fields.getByName("kind");
    if (kind.values.indexOf("refund") === -1) kind.values = [...kind.values, "refund"];
    app.save(pay);

    const so = app.findCollectionByNameOrId("sales_orders");
    if (!so.fields.getByName("returns")) so.fields.add(new JSONField({ name: "returns", maxSize: 2000000 }));
    app.save(so);

    const po = app.findCollectionByNameOrId("purchase_orders");
    if (!po.fields.getByName("for_orders")) po.fields.add(new JSONField({ name: "for_orders", maxSize: 200000 }));
    app.save(po);
  },
  (app) => {
    const so = app.findCollectionByNameOrId("sales_orders");
    so.fields.removeByName("returns");
    app.save(so);
    const po = app.findCollectionByNameOrId("purchase_orders");
    po.fields.removeByName("for_orders");
    app.save(po);
  }
);
