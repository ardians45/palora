# Skema Database PALORA

Backend: **PocketBase 0.40** (SQLite). Definisi lengkap ada di
[`backend/pb_migrations/1700000000_palora_schema.js`](../backend/pb_migrations/1700000000_palora_schema.js),
aturan bisnis server di [`backend/pb_hooks/palora.pb.js`](../backend/pb_hooks/palora.pb.js).

## Prinsip desain

| Prinsip | Penerapan |
|---|---|
| Mengikuti alur kerja yang ada (PRD §10) | Nomor dokumen, status, dan format tetap seperti kebiasaan Paletindo (PO-037/PIM/2026, 0062/DO/PIM/V/2026). |
| Tidak ada hapus permanen (NFR 7.3) | `deleteRule = null` di semua tabel bisnis. Hapus = `deleted = true` (soft delete). |
| Stok selalu benar walau dipakai banyak perangkat | `products.stock` **tidak bisa** diubah lewat update biasa. Perubahan stok wajib lewat endpoint atomik `POST /api/palora/increment` (transaksi database, menolak stok minus). |
| Audit trail (Modul 9) | Setiap create/update/increment otomatis dicatat ke `audit_trail` oleh server, lengkap dengan nama pelaku & nilai sebelum/sesudah. |
| Detail baris disimpan bersama dokumennya | `items`, `payments`, `receipts`, `invoice` berupa kolom JSON: selalu dibaca/ditulis bersama induknya, jadi tidak perlu tabel detail terpisah. |
| Kolom `uid` | ID yang dipakai aplikasi (mis. `PRD-0001`, `ORD-...`). `id` adalah ID internal PocketBase. |
| Kolom `extra` (JSON) | Menampung atribut tambahan dari UI yang belum punya kolom sendiri, supaya tidak ada data yang hilang. |

## Diagram relasi (ERD)

Relasi antar dokumen bisnis memakai **nomor dokumen** (bukan foreign key), sama seperti
dokumen fisik Paletindo yang saling merujuk lewat nomor.

```mermaid
erDiagram
    users ||--o{ audit_trail : "pelaku (actor)"
    suppliers ||--o{ purchase_orders : "supplier = name"
    purchase_orders ||--o{ documents : "ref_no = po_no / no. SJ"
    customers ||--o{ sales_orders : "customer = name"
    sales_orders ||--o{ deliveries : "order_no"
    products ||--o{ stock_movements : "product_code"
    products }o--o{ purchase_orders : "items[].productCode"
    products }o--o{ sales_orders : "items[].productCode"

    users {
        text id PK
        email email
        text name
        select role "owner | gudang | finance"
        bool active
    }
    products {
        text uid UK
        text code UK "SKU, unik selama belum dihapus"
        text name
        text category
        text factory
        number stock "min 0, hanya via increment"
        number min_stock
        number buy_price
        number sell_price
        text location
        text color
        bool deleted
    }
    customers {
        text uid UK
        text name
        text contact_person
        text phone
        text address
        text npwp
        text type "Korporat / Grosir"
        number credit_limit
        number current_debt "hanya via increment"
        bool deleted
    }
    suppliers {
        text uid UK
        text name
        text sales_person
        text phone
        text email
        text terms "Tempo 30 Hari, dll"
        json categories
        bool deleted
    }
    purchase_orders {
        text uid UK
        text po_no UK
        text date
        text supplier
        json items "productCode, qty, buyPrice, receivedQty"
        number total_amount
        text status
        json receipts "penerimaan bertahap per surat jalan"
        json invoice "invoice supplier + pembayaran"
        bool deleted
    }
    sales_orders {
        text uid UK
        text order_no UK
        text date
        text customer
        json items "productCode, qty, price (bisa nego)"
        number total_amount
        number dp_amount
        number remaining_amount
        text payment_status
        text delivery_status
        text due_date
        json payments "riwayat cicilan"
        bool release_approved "izin kirim sebelum lunas (Owner)"
        bool deleted
    }
    deliveries {
        text uid UK
        text sj_no UK
        text order_no
        text customer
        text driver_name
        text vehicle_plate
        text status
        json items
        bool deleted
    }
    documents {
        text uid UK
        text title
        text type
        text ref_no
        text partner
        file file "jpg/png/webp/heic/pdf maks 5MB"
        text uploaded_by
        text category
        bool deleted
    }
    stock_movements {
        text uid UK
        text date
        text type "IN | OUT | OPNAME | ADJUSTMENT"
        text product_code
        number qty
        text ref_no
        number before_stock
        number after_stock
        text operator "diisi server dari akun login"
    }
    system_logs {
        text uid UK
        text date
        text user "diisi server dari akun login"
        text module
        text action
        text detail
    }
    audit_trail {
        text collection_name
        text record_id
        text action "create | update | soft_delete | increment"
        relation actor FK
        text actor_name
        json changes "field: {from, to}"
    }
```

Semua tabel juga punya kolom otomatis `created` dan `updated`.

## Hak akses per tabel (PRD 6.7)

| Tabel | Lihat | Tambah | Ubah | Hapus |
|---|---|---|---|---|
| products | semua | Owner, Gudang | Owner, Gudang (kecuali `stock`) | — |
| customers | semua | semua | semua (kecuali `current_debt`) | — |
| suppliers | semua | semua | semua | — |
| sales_orders | semua | Owner, Gudang | semua (Keuangan mencatat pembayaran); `release_approved` hanya Owner | — |
| purchase_orders | semua | Owner, Gudang | semua (Keuangan mencatat invoice & bayar supplier) | — |
| deliveries | semua | Owner, Gudang | Owner, Gudang | — |
| documents | semua | semua | semua | — |
| stock_movements | semua | Owner, Gudang | — (tidak bisa diubah) | — |
| system_logs | Owner | semua | — | — |
| audit_trail | Owner | hanya server | — | — |
| users | diri sendiri / Owner | Owner | Owner (user biasa hanya nama & password sendiri) | Owner |

Endpoint `POST /api/palora/increment`:
- `products.stock`: Owner & Gudang, ditolak bila hasilnya minus (*"Stok tidak cukup ... tersedia X pcs"*).
- `customers.current_debt`: semua role, dibulatkan ke 0 bila minus.

## Aturan bisnis di server

1. **Surat jalan hanya untuk pesanan lunas** (F-SO04). Kalau masih ada sisa tagihan, server menolak, kecuali Owner menyalakan `release_approved` (tombol *Izinkan Kirim* di modul Penjualan).
2. **Nama operator tidak bisa dipalsukan**: kolom `user` di `system_logs` dan `operator` di `stock_movements` ditimpa server dengan nama akun yang login.
3. **Login hanya untuk akun aktif** (`authRule: active = true`), dengan sesi berakhir otomatis setelah 8 jam.
4. **Nomor dokumen unik** (PO, nota, surat jalan, kode SKU) selama belum dihapus.
