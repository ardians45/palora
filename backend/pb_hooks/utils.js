// Helper bersama untuk pb_hooks. Handler PocketBase berjalan di konteks terisolasi,
// jadi helper harus di-require() di dalam masing-masing handler.

const ROLE_LABEL = {
  owner: "Owner",
  gudang: "Admin Gudang & POS",
  finance: "Keuangan",
};

// Koleksi yang perubahan datanya dicatat ke audit_trail.
const AUDITED = [
  "products",
  "customers",
  "suppliers",
  "sales_orders",
  "purchase_orders",
  "deliveries",
  "documents",
  "stock_movements",
  "users",
];

// Field yang tidak perlu masuk catatan perubahan.
const SKIP_FIELDS = ["created", "updated", "collectionId", "collectionName", "password", "tokenKey"];

function actorLabel(auth) {
  if (!auth) return "Sistem";
  if (auth.collection().name === "_superusers") return "Superuser (" + auth.email() + ")";
  const name = auth.getString("name") || auth.email();
  const role = ROLE_LABEL[auth.getString("role")];
  return role ? name + " (" + role + ")" : name;
}

function toPlain(record) {
  return record ? JSON.parse(JSON.stringify(record)) : {};
}

// Selisih field antara dua snapshot record -> { field: { from, to } }
function diff(before, after) {
  const out = {};
  const keys = {};
  Object.keys(before || {}).forEach((k) => (keys[k] = true));
  Object.keys(after || {}).forEach((k) => (keys[k] = true));
  Object.keys(keys).forEach((k) => {
    if (SKIP_FIELDS.indexOf(k) !== -1) return;
    const a = JSON.stringify(before ? before[k] : undefined);
    const b = JSON.stringify(after ? after[k] : undefined);
    if (a !== b) out[k] = { from: before ? before[k] : null, to: after ? after[k] : null };
  });
  return out;
}

function writeAudit(app, collectionName, record, action, auth, changes) {
  const coll = app.findCollectionByNameOrId("audit_trail");
  const rec = new Record(coll);
  rec.set("collection_name", collectionName);
  rec.set("record_id", record ? record.id : "");
  rec.set("record_uid", record && record.collection().fields.getByName("uid") ? record.getString("uid") : "");
  rec.set("action", action);
  if (auth && auth.collection().name === "users") rec.set("actor", auth.id);
  rec.set("actor_name", actorLabel(auth));
  rec.set("changes", changes || {});
  app.save(rec);
}

function formatRupiah(n) {
  return "Rp " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

module.exports = { ROLE_LABEL, AUDITED, actorLabel, toPlain, diff, writeAudit, formatRupiah };
