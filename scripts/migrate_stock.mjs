import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

// Using dynamic import for the ES module
const currentDataUrl = new URL('../src/data/paletindoInventory.js', import.meta.url);
const currentData = await import(currentDataUrl);

const jsonFile = path.join(process.cwd(), 'data paletindo/stok_paletindo_lengkap.json');
const rawData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

const excelPath = path.join(process.cwd(), 'data paletindo/Stok Stok.xlsx');
const wb = xlsx.readFile(excelPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const excelData = xlsx.utils.sheet_to_json(ws, {header: 1});

const excelMap = new Map();
excelData.forEach(row => {
  const name = row[1];
  const ket = row[5];
  if (name && typeof name === 'string' && ket) {
    excelMap.set(name.trim().toLowerCase(), ket.toString());
  }
});

const getColorCategory = (rawColor = '') => {
  const c = String(rawColor).toLowerCase();
  if (c.includes('multi') || c.includes('mix') || c.includes('campur')) return 'Multi Warna';
  if (c.includes('merah') || c.includes('red')) return 'Merah';
  if (c.includes('biru') || c.includes('blue') || c.includes('navy')) return 'Biru';
  if (c.includes('hijau') || c.includes('green')) return 'Hijau';
  if (c.includes('kuning') || c.includes('yellow')) return 'Kuning';
  if (c.includes('orange')) return 'Orange';
  if (c.includes('pink') || c.includes('ungu') || c.includes('violet') || c.includes('magenta') || c.includes('peach')) return 'Pink / Ungu';
  if (c.includes('coklat') || c.includes('cream') || c.includes('krem')) return 'Coklat';
  if (c.includes('grey') || c.includes('abu')) return 'Abu-abu';
  if (c.includes('hitam') || c.includes('black') || c.includes('smoke')) return 'Hitam';
  if (c.includes('putih') || c.includes('clear') || c.includes('white')) return 'Putih / Transparan';
  return 'Standar Pabrik';
};

const getBroadCategory = (jsonCat) => {
  const c = jsonCat.toLowerCase();
  if (c.includes('palet') || c.includes('keranjang')) return 'Palet Plastik';
  if (c.includes('part case')) return 'Part Case';
  if (c.includes('lure') || c.includes('tackle')) return 'Lure & Tackle Box';
  if (c.includes('rabbit')) return 'Krat Industri Rabbit';
  if (c.includes('numan')) return 'Perlengkapan Numan';
  if (c.includes('lunch') || c.includes('food') || c.includes('makan') || c.includes('rantang') || c.includes('sendok') || c.includes('garpu') || c.includes('kacamata')) return 'Food Box & Lunch Box';
  if (c.includes('linhui')) return 'Pabrik Linhui';
  if (c.includes('maspion') || c.includes('gbu') || c.includes('kimplast') || c.includes('mak cook') || c.includes('teko') || c.includes('golden') || c.includes('greenleaf')) return 'Maspion & GBU';
  if (c.includes('bioplast') || c.includes('ember') || c.includes('mizu') || c.includes('asia plast') || c.includes('folding container')) return 'Ember & Toples Bioplast';
  if (c.includes('bekas')) return 'Barang Bekas & Rekondisi';
  return 'Lain-lain';
};

const getFactory = (cat) => {
  const c = cat.toLowerCase();
  if (c.includes('futari') || c.includes('part case')) return 'PT FUTARI PLASTIK INDONESIA';
  if (c.includes('numan')) return 'PT NUMAN INDONESIA';
  if (c.includes('maspion')) return 'PT MASPION KENCANA';
  if (c.includes('rabbit')) return 'RABBIT PLASTIK INDONESIA';
  if (c.includes('bioplast')) return 'PT BIOPLAST UNGGUL';
  if (c.includes('greenleaf')) return 'GREENLEAF';
  if (c.includes('golden')) return 'GOLDEN PLASTIC';
  if (c.includes('asia plast')) return 'ASIA PLAST';
  if (c.includes('linhui')) return 'PT LINHUI';
  if (c.includes('kimplast')) return 'KIMPLAST';
  if (c.includes('gbu')) return 'GBU';
  if (c.includes('mizu')) return 'MIZU';
  if (c.includes('bekas')) return 'Gudang Paletindo (Bekas)';
  return 'TBA';
};

let newStock = [];
let skuCounter = 1;

rawData.kategori_stok.forEach(cat => {
  const categoryName = cat.category;
  const broadCategory = getBroadCategory(categoryName);
  
  cat.items.forEach(item => {
    // If it's a generic item that is just a color (e.g. "Merah"), we prepend category
    const isColorOnly = ['merah', 'hijau', 'kuning', 'biru', 'putih', 'hitam', 'coklat', 'orange', 'grey', 'abu', 'pink', 'ungu', 'krem', 'cream', 'clear', 'smoke', 'campur', 'multi', 'mix', 'light', 'dark', 'chilli red'].some(c => item.nama_barang.toLowerCase().includes(c)) && item.nama_barang.split(' ').length <= 2;
    
    // We try to make a clean name. 
    let cleanName = item.nama_barang;
    if (isColorOnly || item.nama_barang.toLowerCase() === 'standar pabrik') {
        cleanName = `${categoryName} ${item.nama_barang}`;
    }

    const color = item.nama_barang || 'Standar Pabrik';
    
    const skuId = `PRD-${skuCounter.toString().padStart(4, '0')}`;
    let codePrefix = 'SKU';
    if (broadCategory === 'Palet Plastik') codePrefix = 'PLT';
    if (broadCategory === 'Part Case') codePrefix = 'PRT';
    if (broadCategory === 'Lure & Tackle Box') codePrefix = 'BOX';
    if (broadCategory === 'Krat Industri Rabbit') codePrefix = 'RBT';
    if (broadCategory === 'Perlengkapan Numan') codePrefix = 'NUM';
    if (broadCategory === 'Ember & Toples Bioplast') codePrefix = 'BIO';
    if (broadCategory === 'Barang Bekas & Rekondisi') codePrefix = 'BKS';
    
    const code = `${codePrefix}-${skuCounter.toString().padStart(4, '0')}`;
    skuCounter++;

    let notes = "";
    let buyPrice = item.harga_jual * 0.8;
    const excelKet = excelMap.get(item.nama_barang.trim().toLowerCase());
    
    if (excelKet) {
      notes = excelKet;
      const modalMatch = excelKet.match(/modal\s*([\d,\.]+)/i);
      if (modalMatch) {
         buyPrice = Number(modalMatch[1].replace(/[,\.]/g, ''));
      }
    }

    newStock.push({
      id: skuId,
      code: code,
      name: cleanName,
      cleanName: cleanName,
      category: broadCategory,
      jsonCategory: categoryName,
      factory: getFactory(categoryName),
      stock: item.qty,
      unit: "pcs",
      minStock: 5,
      buyPrice: buyPrice, // Extracted from Excel or estimated
      sellPrice: item.harga_jual,
      modalLama: null,
      modalBaru: null,
      pricelistPabrik: null,
      location: "Gudang Utama",
      color: color,
      colorCategory: getColorCategory(color),
      notes: notes
    });
  });
});

console.log(`Generated ${newStock.length} SKUs`);

const output = `// Master Data Stok & Pricelist PT Paletindo Prakarsa Unggul
// Sumber Data: 'data paletindo/stok_paletindo_lengkap.json' (Update: 12 April 2025)

export const PALETINDO_METADATA = ${JSON.stringify(currentData.PALETINDO_METADATA, null, 2)};

export const PALETINDO_CATEGORIES = ${JSON.stringify(currentData.PALETINDO_CATEGORIES, null, 2)};

export const MASTER_PRICELIST_MODAL = ${JSON.stringify(currentData.MASTER_PRICELIST_MODAL, null, 2)};

export const PALETINDO_FULL_STOCK = ${JSON.stringify(newStock, null, 2)};
`;

fs.writeFileSync(new URL('../src/data/paletindoInventory.js', import.meta.url), output);
console.log('Successfully updated src/data/paletindoInventory.js');
