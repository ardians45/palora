/// <reference path="../pb_data/types.d.ts" />
// Foto barang untuk layar Stok & Kasir. PocketBase membuat thumbnail otomatis (?thumb=96x96 / 400x0).
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId("products");
    if (!products.fields.getByName("photo")) {
      products.fields.add(
        new FileField({
          name: "photo",
          maxSelect: 1,
          maxSize: 3 * 1024 * 1024,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
          thumbs: ["96x96", "400x0"],
        })
      );
    }
    products.fields.add(new TextField({ name: "photo_source", max: 500 }));
    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId("products");
    products.fields.removeByName("photo");
    products.fields.removeByName("photo_source");
    app.save(products);
  }
);
