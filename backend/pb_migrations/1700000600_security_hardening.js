/// <reference path="../pb_data/types.d.ts" />
// Pengamanan: rate limit login, nama aplikasi, akun nonaktif langsung ditolak (walau token lama masih ada),
// file dokumen/bukti bayar dilindungi (butuh file token), harga modal hanya boleh ditulis Owner.
// Semua ada di migrasi supaya ikut tersalin saat folder backend/ dipindah ke PC gudang.
const ACTIVE = "@request.auth.active = true";
const RULES = ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"];

migrate(
  (app) => {
    // 1. Rate limit + proxy tepercaya (Cloudflare Tunnel mengirim IP asli klien di CF-Connecting-IP)
    const settings = app.settings();
    settings.meta.appName = "PALORA";
    settings.trustedProxy.headers = ["CF-Connecting-IP"];
    settings.trustedProxy.useLeftmostIP = false;
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      { label: "users:authWithPassword", maxRequests: 10, duration: 60 },
      { label: "_superusers:authWithPassword", maxRequests: 5, duration: 60 },
      { label: "*:auth", maxRequests: 30, duration: 60 },
      { label: "/api/", maxRequests: 1200, duration: 60 },
    ];
    app.save(settings);

    // 2 & 3. Semua aturan API yang mensyaratkan login sekarang juga mensyaratkan akun masih aktif
    //        + 4. file dilindungi (kecuali foto produk) + 5. harga modal hanya Owner
    const collections = app.findAllCollections();
    collections.forEach((c) => {
      if (String(c.name).indexOf("_") === 0) return;
      let changed = false;

      RULES.forEach((k) => {
        const r = c[k];
        if (r === null || r === undefined || r === "") return;
        if (r.indexOf("@request.auth") === -1 || r.indexOf(ACTIVE) !== -1) return;
        c[k] = "(" + r + ") && " + ACTIVE;
        changed = true;
      });

      for (let i = 0; i < c.fields.length; i++) {
        const f = c.fields[i];
        if (f.type() !== "file") continue;
        if (c.name === "products" && f.name === "photo") continue;
        if (!f.protected) {
          f.protected = true;
          changed = true;
        }
      }

      if (c.name === "products") {
        const lock = '(@request.body.buy_price:isset = false || @request.auth.role = "owner")';
        ["createRule", "updateRule"].forEach((k) => {
          if (c[k] && c[k].indexOf("@request.body.buy_price") === -1) {
            c[k] = c[k] + " && " + lock;
            changed = true;
          }
        });
      }

      if (changed) app.save(c);
    });
  },
  (app) => {
    // Sengaja kosong: pengamanan tidak dicabut otomatis.
  }
);
