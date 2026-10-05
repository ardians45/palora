// Master data awal yang berasal dari dokumen asli Paletindo
// (Stok Stok.xlsx Sheet2, PO 37.xlsx, SURAT JALAN.pdf, FAKTUR PAJAK.pdf).
// Kontak yang tidak ada di dokumen dibiarkan kosong supaya diisi tim, bukan dikarang.

export const INITIAL_SUPPLIERS = [
  { id: 'SUP-FUTARI', name: 'PT FUTARI PLASTIK INDONESIA', terms: 'Tempo 30 Hari' },
  { id: 'SUP-LINHUI', name: 'PT LINHUI', salesPerson: 'Ibu Fitri', terms: 'Tempo 30 Hari' },
  { id: 'SUP-RABBIT', name: 'RABBIT', discountRule: 'Pricelist - 20%, + PPN 11%' },
  { id: 'SUP-GOLDEN', name: 'GOLDEN', discountRule: 'Disc 10% + 2,5%' },
  { id: 'SUP-KOTAMAS', name: 'KOTAMAS' },
  { id: 'SUP-MASPION', name: 'MASPION' },
  { id: 'SUP-GBU', name: 'GBU' },
  { id: 'SUP-SUNLIFE', name: 'SUNLIFE' },
  { id: 'SUP-BIOPLAST', name: 'BIOPLAST' },
  { id: 'SUP-NUMAN', name: 'NUMAN' },
  { id: 'SUP-ASIAPLAST', name: 'PT ASIA PLAST' },
  { id: 'SUP-ATARI', name: 'ATARI' },
  { id: 'SUP-GREENLIFE', name: 'GREENLIFE' },
  { id: 'SUP-KIMPLAST', name: 'KIMPLAST', discountRule: 'Disc 15% + 5%' },
];

export const INITIAL_CUSTOMERS = [
  {
    id: 'CUST-ASTRO',
    name: 'PT ASTRO TECHNOLOGIES INDONESIA',
    contactPerson: 'Ibu Syafina Nur Fauzia',
    address: 'Graha Antero Lt. 5-6, Jl. Tomang Raya No. 27, Tomang, Grogol Petamburan, Jakarta Barat 11440',
    shippingAddress: 'Storage Asset Hub PSG, Jl. Raya Cirendeu No. 6 Pisangan, Tangerang Selatan',
    npwp: '0430305466086000',
    type: 'Korporat',
  },
];

// Hanya untuk mode demo (npm run setup -- --demo)
export const DEMO_CUSTOMERS = [
  {
    id: 'CUST-DEMO-1',
    name: 'Toko Plastik Berkah Jaya',
    contactPerson: 'Pak Haji Rohman',
    phone: '0812-0000-0001',
    address: 'Pasar Induk Kramat Jati Blok C No. 12, Jakarta Timur',
    shippingAddress: 'Pasar Induk Kramat Jati Blok C No. 12, Jakarta Timur',
    type: 'Grosir',
    defaultTerms: 'Tempo 14 Hari',
  },
];
