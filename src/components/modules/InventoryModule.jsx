import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ClipboardCheck, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers, 
  MapPin, 
  X, 
  FileSpreadsheet,
  Pencil,
  Trash2,
  TrendingUp,
  PackageCheck,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  User,
  FileText,
  Filter,
  Image as ImageIcon,
  Tag,
  Banknote,
  Archive
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function InventoryModule({ 
  products = [], 
  setProducts, 
  suppliers = [], 
  orders = [],
  stockMovements = [],
  setStockMovements,
  currentUser,
  initialTab = 'inventory',
  initialFilter = 'all',
  addSystemLog
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'inventory'); // 'inventory' | 'opname' | 'movements'
  const [categoryFilter, setCategoryFilter] = useState(initialFilter || 'all');
  const [colorFilter, setColorFilter] = useState('all'); // 'all' | 'Merah' | 'Biru' | etc.
  const [statusQuickFilter, setStatusQuickFilter] = useState('all'); // 'all' | 'low' | 'safe'
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Sorting State
  const [sortKey, setSortKey] = useState('code');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 25, 50, 100, 'all'

  // Mutasi Filter State
  const [movementTypeFilter, setMovementTypeFilter] = useState('all'); // 'all' | 'IN' | 'OUT' | 'OPNAME' | 'ADJUSTMENT'
  const [movementSearch, setMovementSearch] = useState('');

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    if (initialFilter) setCategoryFilter(initialFilter);
  }, [initialFilter]);

  // Reset pagination on search or filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, colorFilter, statusQuickFilter, sortKey, sortDirection, pageSize]);

  // Helper: Normalize broad color category
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

  // Color counts for filter options
  const colorCounts = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      const cat = p.colorCategory || getColorCategory(p.color || 'Standar Pabrik');
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Category counts for filter options
  const categoryCounts = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      const cat = p.jsonCategory || p.category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return Object.keys(counts).sort().map(cat => ({
      name: cat,
      count: counts[cat]
    }));
  }, [products]);

  // Visual Color Badge Component
  const renderColorBadge = (prod) => {
    const color = prod.color || 'Standar';
    const cat = prod.colorCategory || getColorCategory(color);

    let dotBg = '#94a3b8';
    let badgeBg = '#f8fafc';
    let badgeColor = '#334155';
    let border = '#e2e8f0';

    switch (cat) {
      case 'Merah':
        dotBg = '#ef4444';
        badgeBg = '#fef2f2';
        badgeColor = '#991b1b';
        border = '#fecaca';
        break;
      case 'Biru':
        dotBg = '#2563eb';
        badgeBg = '#eff6ff';
        badgeColor = '#1e40af';
        border = '#bfdbfe';
        break;
      case 'Hijau':
        dotBg = '#10b981';
        badgeBg = '#ecfdf5';
        badgeColor = '#065f46';
        border = '#a7f3d0';
        break;
      case 'Kuning':
        dotBg = '#eab308';
        badgeBg = '#fefce8';
        badgeColor = '#854d0e';
        border = '#fef08a';
        break;
      case 'Orange':
        dotBg = '#f97316';
        badgeBg = '#fff7ed';
        badgeColor = '#9a3412';
        border = '#fed7aa';
        break;
      case 'Pink / Ungu':
        dotBg = '#ec4899';
        badgeBg = '#fdf2f8';
        badgeColor = '#9d174d';
        border = '#fbcfe8';
        break;
      case 'Coklat':
        dotBg = '#854d0e';
        badgeBg = '#fefce8';
        badgeColor = '#713f12';
        border = '#fde68a';
        break;
      case 'Abu-abu':
        dotBg = '#64748b';
        badgeBg = '#f8fafc';
        badgeColor = '#334155';
        border = '#cbd5e1';
        break;
      case 'Hitam':
        dotBg = '#0f172a';
        badgeBg = '#f1f5f9';
        badgeColor = '#0f172a';
        border = '#cbd5e1';
        break;
      case 'Putih / Transparan':
        dotBg = '#ffffff';
        badgeBg = '#f8fafc';
        badgeColor = '#475569';
        border = '#cbd5e1';
        break;
      case 'Multi Warna':
        dotBg = 'linear-gradient(135deg, #ef4444 0%, #3b82f6 33%, #10b981 66%, #eab308 100%)';
        badgeBg = '#f5f3ff';
        badgeColor = '#5b21b6';
        border = '#ddd6fe';
        break;
      default:
        dotBg = '#94a3b8';
        badgeBg = '#f8fafc';
        badgeColor = '#64748b';
        border = '#e2e8f0';
    }

    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 9px',
          borderRadius: '6px',
          background: badgeBg,
          border: `1px solid ${border}`,
          color: badgeColor,
          fontSize: '0.78rem',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}
      >
        <span 
          style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: dotBg,
            display: 'inline-block',
            flexShrink: 0,
            border: cat === 'Putih / Transparan' ? '1px solid #94a3b8' : 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
          }}
        />
        <span>{color}</span>
      </div>
    );
  };

  // Form State New Product
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productColor, setProductColor] = useState('Standar');
  const [productCategory, setProductCategory] = useState('Palet Plastik');
  const [factory, setFactory] = useState(suppliers[0]?.name || 'PT FUTARI PLASTIK INDONESIA');
  const [initialStock, setInitialStock] = useState(50);
  const [unit, setUnit] = useState('pcs');
  const [minStock, setMinStock] = useState(20);
  const [buyPrice, setBuyPrice] = useState(30000);
  const [sellPrice, setSellPrice] = useState(40000);
  const [location, setLocation] = useState('Gudang A - Rak 02');
  const [notes, setNotes] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');

  // Opname temporary edits
  const [opnameData, setOpnameData] = useState(
    products.reduce((acc, p) => ({ ...acc, [p.id]: p.stock }), {})
  );

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Helper: Calculate reserved stock from active orders (not yet delivered)
  const getReservedStock = (prod) => {
    if (!orders || orders.length === 0) return 0;
    return orders
      .filter(o => !o.deliveryStatus?.includes('Terkirim') && !o.deliveryStatus?.includes('Batal'))
      .flatMap(o => o.items || [])
      .filter(it => it.productCode === prod.code || it.productId === prod.id)
      .reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  };

  // Filter products based on category, search, color, and status
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(q) ||
                            (p.cleanName && p.cleanName.toLowerCase().includes(q)) ||
                            (p.color && p.color.toLowerCase().includes(q)) ||
                            p.code.toLowerCase().includes(q) ||
                            (p.factory && p.factory.toLowerCase().includes(q)) ||
                            (p.notes && p.notes.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      
      // Category filter
      if (categoryFilter !== 'all') {
        const isLegacyGroup = ['Palet Plastik', 'Part Case', 'Lure & Tackle Box', 'Krat Industri Rabbit', 'Food Box & Lunch Box', 'Perlengkapan Numan', 'Pabrik Linhui', 'Maspion & GBU', 'Ember & Toples Bioplast', 'Barang Bekas & Rekondisi'].includes(categoryFilter);
        
        if (isLegacyGroup) {
          if (categoryFilter === 'Palet Plastik' && !p.category.includes('Palet')) return false;
          if (categoryFilter === 'Part Case' && !p.category.includes('Part Case')) return false;
          if (categoryFilter === 'Lure & Tackle Box' && !(p.category.includes('Lure') || p.category.includes('Tackle') || p.name.includes('Lure') || p.name.includes('Tackle') || p.name.includes('SS -') || p.name.includes('TB -'))) return false;
          if (categoryFilter === 'Krat Industri Rabbit' && !(p.category.includes('Krat') || p.category.includes('Rabbit') || p.factory?.includes('RABBIT'))) return false;
          if (categoryFilter === 'Food Box & Lunch Box' && !(p.category.includes('Food') || p.category.includes('Lunch') || p.name.includes('Victory') || p.name.includes('Melva') || p.name.includes('Harper') || p.name.includes('Tori'))) return false;
          if (categoryFilter === 'Perlengkapan Numan' && !(p.category.includes('Numan') || (p.factory && p.factory.includes('NUMAN')) || p.name.includes('Numan'))) return false;
          if (categoryFilter === 'Pabrik Linhui' && !(p.category.includes('Linhui') || (p.factory && p.factory.includes('LINHUI')))) return false;
          if (categoryFilter === 'Maspion & GBU' && !(p.category.includes('Maspion') || p.category.includes('GBU') || (p.factory && (p.factory.includes('MASPION') || p.factory.includes('GBU'))))) return false;
          if (categoryFilter === 'Ember & Toples Bioplast' && !(p.category.includes('Bioplast') || (p.factory && p.factory.includes('BIOPLAST')))) return false;
          if (categoryFilter === 'Barang Bekas & Rekondisi' && !(p.category.includes('Bekas') || p.category.includes('Rekondisi'))) return false;
        } else {
          // Specific detailed category
          if (p.jsonCategory !== categoryFilter && p.category !== categoryFilter) return false;
        }
      }

      // Color filter
      if (colorFilter !== 'all') {
        const pCat = p.colorCategory || getColorCategory(p.color || '');
        if (pCat !== colorFilter) return false;
      }

      // Quick Status Filter
      if (statusQuickFilter === 'low' && p.stock > p.minStock) return false;
      if (statusQuickFilter === 'safe' && p.stock <= p.minStock) return false;

      return true;
    });
  }, [products, searchTerm, categoryFilter, colorFilter, statusQuickFilter]);

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal, bVal;

      if (sortKey === 'name') {
        aVal = (a.cleanName || a.name).toLowerCase();
        bVal = (b.cleanName || b.name).toLowerCase();
      } else if (sortKey === 'color') {
        aVal = (a.color || 'Standar').toLowerCase();
        bVal = (b.color || 'Standar').toLowerCase();
      } else if (sortKey === 'code') {
        aVal = a.code.toLowerCase();
        bVal = b.code.toLowerCase();
      } else if (sortKey === 'category') {
        aVal = a.category.toLowerCase();
        bVal = b.category.toLowerCase();
      } else if (sortKey === 'stock') {
        aVal = a.stock;
        bVal = b.stock;
      } else if (sortKey === 'buyPrice') {
        aVal = a.buyPrice;
        bVal = b.buyPrice;
      } else if (sortKey === 'sellPrice') {
        aVal = a.sellPrice;
        bVal = b.sellPrice;
      } else if (sortKey === 'margin') {
        aVal = a.sellPrice - a.buyPrice;
        bVal = b.sellPrice - b.buyPrice;
      } else {
        aVal = a.code;
        bVal = b.code;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortKey, sortDirection]);

  // Paginate products
  const paginatedProducts = useMemo(() => {
    if (pageSize === 'all') return sortedProducts;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedProducts.slice(startIndex, startIndex + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(sortedProducts.length / pageSize) || 1;

  // Handle Sort Toggle
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (key) => {
    if (sortKey !== key) return <ArrowUpDown size={11} color="#94a3b8" />;
    return sortDirection === 'asc' ? <ArrowUp size={11} color="#5c59f7" /> : <ArrowDown size={11} color="#5c59f7" />;
  };

  const handleExportExcel = () => {
    try {
      const exportData = sortedProducts.map((p, idx) => {
        const reserved = getReservedStock(p);
        const available = Math.max(0, p.stock - reserved);
        return {
          'No': idx + 1,
          'Kode Barang': p.code,
          'Nama Produk': p.cleanName || p.name,
          'Warna': p.color || 'Standar',
          'Kategori': p.category,
          'Pabrik / Brand': p.factory,
          'Stok Fisik Gudang': p.stock,
          'Stok Dipesan': reserved,
          'Stok Bebas Order': available,
          'Satuan': p.unit || 'pcs',
          'Harga Modal Beli': p.buyPrice,
          'Harga Jual Pricelist': p.sellPrice,
          'Margin Nominal': p.sellPrice - p.buyPrice,
          'Total Nilai Aset': p.stock * p.sellPrice,
          'Lokasi Rak': p.location,
          'Catatan': p.notes || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stok Paletindo');
      XLSX.writeFile(wb, `Stok_Paletindo_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor file Excel: ' + err.message);
    }
  };

  const fileInputRef = React.useRef(null);
  
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let importedCount = 0;
        let updatedCount = 0;
        
        setProducts(prevProducts => {
          const newProducts = [...prevProducts];
          
          data.forEach(row => {
            const code = row['Kode Barang'];
            const name = row['Nama Produk'] || row['Nama Barang'];
            if (!code) return; // Skip invalid rows
            
            const existingIdx = newProducts.findIndex(p => p.code === code);
            const stock = Number(row['Stok Fisik Gudang'] || row['Stok'] || 0);
            const sellPrice = Number(row['Harga Jual Pricelist'] || row['Harga Jual'] || 0);
            const buyPrice = Number(row['Harga Modal Beli'] || row['Harga Modal'] || 0);
            
            if (existingIdx >= 0) {
              // Update existing product
              newProducts[existingIdx] = {
                ...newProducts[existingIdx],
                stock: !isNaN(stock) ? stock : newProducts[existingIdx].stock,
                sellPrice: !isNaN(sellPrice) && sellPrice > 0 ? sellPrice : newProducts[existingIdx].sellPrice,
                buyPrice: !isNaN(buyPrice) && buyPrice > 0 ? buyPrice : newProducts[existingIdx].buyPrice,
                color: row['Warna'] || newProducts[existingIdx].color
              };
              updatedCount++;
            } else {
              // Add new product
              newProducts.push({
                id: `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                code: String(code),
                name: String(name || code),
                cleanName: String(name || code),
                stock: !isNaN(stock) ? stock : 0,
                sellPrice: !isNaN(sellPrice) ? sellPrice : 0,
                buyPrice: !isNaN(buyPrice) ? buyPrice : 0,
                color: String(row['Warna'] || 'Standar'),
                category: String(row['Kategori'] || 'Lainnya'),
                factory: String(row['Pabrik / Brand'] || '-'),
                unit: String(row['Satuan'] || 'pcs'),
                minStock: 20
              });
              importedCount++;
            }
          });
          
          return newProducts;
        });
        
        if (addSystemLog && (importedCount > 0 || updatedCount > 0)) {
          addSystemLog('Gudang & Stok', 'Import Excel', `Melakukan import Excel: ${importedCount} barang baru ditambahkan, ${updatedCount} diperbarui`);
        }
        
        alert(`Import berhasil!\n\n${importedCount} barang baru ditambahkan.\n${updatedCount} barang lama diperbarui harganya/stoknya.`);
        
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file Excel. Pastikan format sesuai dengan template hasil export.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalValuation = products.reduce((acc, p) => acc + (p.stock * p.sellPrice), 0);

  // Form Add Product Submission with Duplicate SKU Check and Reset
  const handleAddProduct = (e) => {
    e.preventDefault();
    const cleanCode = productCode.trim().toUpperCase();
    const cleanName = productName.trim();

    if (!cleanName || !cleanCode) {
      return alert('Nama dan kode barang wajib diisi.');
    }

    const isDuplicate = products.some(p => p.code.trim().toUpperCase() === cleanCode);
    if (isDuplicate) {
      return alert(`Gagal: Kode Barang "${cleanCode}" sudah digunakan oleh produk lain di sistem!\n\nHarap gunakan kode yang unik.`);
    }

    const newProd = {
      id: `PRD-${Date.now()}`,
      code: cleanCode,
      name: cleanName,
      cleanName: cleanName,
      color: productColor || 'Standar',
      colorCategory: getColorCategory(productColor || 'Standar'),
      category: productCategory,
      factory: factory,
      stock: Number(initialStock),
      unit: unit,
      minStock: Number(minStock),
      buyPrice: Number(buyPrice),
      sellPrice: Number(sellPrice),
      location: location,
      notes: notes,
      imageUrl: productImageUrl
    };

    setProducts([newProd, ...products]);
    setOpnameData(prev => ({ ...prev, [newProd.id]: newProd.stock }));

    if (Number(initialStock) > 0 && setStockMovements) {
      const nowTimeStr = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setStockMovements(prev => [{
        id: `MV-${Date.now()}`,
        date: nowTimeStr,
        type: 'ADJUSTMENT',
        productId: newProd.id,
        productCode: newProd.code,
        productName: newProd.name,
        qty: Number(initialStock),
        refNo: 'PRODUK-BARU',
        reason: 'Input produk baru ke sistem master stok',
        beforeStock: 0,
        afterStock: Number(initialStock),
        operator: currentUser || 'Mas Heri'
      }, ...(prev || [])]);
    }

    // Reset Form Fields
    setProductCode('');
    setProductName('');
    setProductColor('Standar');
    setProductCategory('Palet Plastik');
    setFactory(suppliers[0]?.name || 'PT FUTARI PLASTIK INDONESIA');
    setInitialStock(50);
    setUnit('pcs');
    setMinStock(20);
    setBuyPrice(30000);
    setSellPrice(40000);
    setLocation('Gudang A - Rak 02');
    setNotes('');
    setProductImageUrl('');

    if (addSystemLog) {
      addSystemLog('Gudang & Stok', 'Tambah Produk Baru', `Menambahkan produk baru ${cleanName} (${cleanCode}) dengan stok awal ${initialStock}`);
    }

    setIsAddModalOpen(false);
    alert(`Produk "${cleanName}" (${cleanCode}) berhasil ditambahkan ke Master Stok Gudang!`);
  };

  // Save manual edit & log adjustment if stock changed
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const originalProduct = products.find(p => p.id === editingProduct.id);
    const stockDiff = Number(editingProduct.stock) - (originalProduct?.stock || 0);

    if (stockDiff !== 0 && setStockMovements && originalProduct) {
      const nowTimeStr = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setStockMovements(prev => [{
        id: `MV-${Date.now()}`,
        date: nowTimeStr,
        type: 'ADJUSTMENT',
        productId: editingProduct.id,
        productCode: editingProduct.code,
        productName: editingProduct.name,
        qty: stockDiff,
        refNo: 'EDIT-MANUAL',
        reason: `Koreksi stok manual via Edit Produk (${stockDiff > 0 ? '+' : ''}${stockDiff} ${editingProduct.unit})`,
        beforeStock: originalProduct.stock,
        afterStock: Number(editingProduct.stock),
        operator: currentUser || 'Mas Heri'
      }, ...(prev || [])]);
    }

    const updatedProd = {
      ...editingProduct,
      color: editingProduct.color || 'Standar',
      colorCategory: getColorCategory(editingProduct.color || 'Standar')
    };

    setProducts(products.map(p => p.id === editingProduct.id ? updatedProd : p));
    setEditingProduct(null);
    
    if (addSystemLog) {
      addSystemLog('Gudang & Stok', 'Edit Produk', `Mengedit data produk ${editingProduct.name} (${editingProduct.code})`);
    }
    
    alert(`Data & Harga Produk "${editingProduct.name}" berhasil diperbarui!`);
  };

  // Delete product with confirmation
  const handleDeleteProduct = (product) => {
    if (!confirm(`Konfirmasi Hapus Barang:\n\nApakah Anda yakin ingin menghapus "${product.name}" (${product.code}) dari master data?\n\nPerhatian: Produk ini akan dihapus permanen.`)) {
      return;
    }

    if (setStockMovements && product.stock > 0) {
      const nowTimeStr = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setStockMovements(prev => [{
        id: `MV-${Date.now()}`,
        date: nowTimeStr,
        type: 'ADJUSTMENT',
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        qty: -product.stock,
        refNo: 'HAPUS-PRODUK',
        reason: `Penghapusan produk "${product.name}" dari master data oleh ${currentUser || 'Mas Heri'}`,
        beforeStock: product.stock,
        afterStock: 0,
        operator: currentUser || 'Mas Heri'
      }, ...(prev || [])]);
    }

    setProducts(products.filter(p => p.id !== product.id));
    
    if (addSystemLog) {
      addSystemLog('Gudang & Stok', 'Hapus Produk', `Menghapus permanen produk ${product.name} (${product.code}) dari master data`);
    }
    
    alert(`Produk "${product.name}" (${product.code}) telah dihapus dari sistem.`);
  };

  // Stock Opname: Apply and create OPNAME movement logs for any changed items
  const handleApplyOpname = () => {
    if (!confirm('Simpan hasil Stock Opname ini? Stok sistem akan disesuaikan dengan hitungan fisik riil Mas Heri.')) return;

    const nowTimeStr = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const opnameMovements = [];

    const updatedProducts = products.map(p => {
      const countedStock = Number(opnameData[p.id] ?? p.stock);
      const diff = countedStock - p.stock;

      if (diff !== 0) {
        opnameMovements.push({
          id: `MV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: nowTimeStr,
          type: 'OPNAME',
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          qty: diff,
          refNo: `SO-${new Date().toISOString().split('T')[0]}`,
          reason: diff > 0 ? `Temuan fisik lebih ${diff} ${p.unit} saat opname` : `Selisih fisik kurang ${Math.abs(diff)} ${p.unit} saat opname`,
          beforeStock: p.stock,
          afterStock: countedStock,
          operator: currentUser || 'Mas Heri'
        });
      }

      return {
        ...p,
        stock: countedStock
      };
    });

    setProducts(updatedProducts);

    if (opnameMovements.length > 0 && setStockMovements) {
      setStockMovements(prev => [...opnameMovements, ...(prev || [])]);
    }

    if (addSystemLog) {
      addSystemLog('Gudang & Stok', 'Stock Opname', `Menyimpan hasil Stock Opname. Terdapat penyesuaian pada ${opnameMovements.length} produk.`);
    }

    alert(`Stock Opname berhasil disimpan!\n\n✓ ${opnameMovements.length} item mengalami penyesuaian selisih dan telah dicatat ke Riwayat Mutasi Gudang.`);
    setActiveTab('inventory');
  };

  // Filtered Stock Movements for Movements Tab
  const filteredMovements = useMemo(() => {
    return (stockMovements || []).filter(mv => {
      const q = movementSearch.toLowerCase();
      const matchesSearch = mv.productCode?.toLowerCase().includes(q) ||
                            mv.productName?.toLowerCase().includes(q) ||
                            mv.refNo?.toLowerCase().includes(q) ||
                            mv.reason?.toLowerCase().includes(q) ||
                            mv.operator?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (movementTypeFilter !== 'all') {
        return mv.type === movementTypeFilter;
      }
      return true;
    });
  }, [stockMovements, movementSearch, movementTypeFilter]);

  const handleExportMovementsExcel = () => {
    try {
      const exportData = filteredMovements.map((m, idx) => ({
        'No': idx + 1,
        'Waktu / Tanggal': m.date,
        'Jenis Mutasi': m.type,
        'Kode Barang': m.productCode,
        'Nama Produk': m.productName,
        'Perubahan Qty': m.qty,
        'No Dokumen Ref': m.refNo,
        'Stok Sebelum': m.beforeStock,
        'Stok Sesudah': m.afterStock,
        'Alasan / Keterangan': m.reason,
        'Operator': m.operator
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mutasi Gudang');
      XLSX.writeFile(wb, `Mutasi_Gudang_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor file Excel mutasi: ' + err.message);
    }
  };

  return (
    <div className="module-workspace">
      {/* Modern, Clean Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="module-header-tile" style={{ width: '42px', height: '42px', borderRadius: '12px' }}>
            <Boxes size={22} color="#5c59f7" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Gudang & Master Stok
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Kontrol stok fisik barang, harga jual, dan mutasi keluar-masuk
            </p>
          </div>
        </div>

        <div>
          <button 
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {/* Modern Underline Tab Bar */}
      <div className="module-tab-strip">
        <button 
          className={`module-tab-item ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Boxes size={16} />
          <span>Katalog Barang</span>
          <span className="module-tab-count">{products.length}</span>
        </button>

        <button 
          className={`module-tab-item ${activeTab === 'opname' ? 'active' : ''}`}
          onClick={() => setActiveTab('opname')}
        >
          <ClipboardCheck size={16} />
          <span>Stock Opname Fisik</span>
        </button>

        <button 
          className={`module-tab-item ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          <History size={16} />
          <span>Riwayat Mutasi</span>
          <span className="module-tab-count">{stockMovements.length}</span>
        </button>
      </div>

      {/* Sleek, Compact Summary Strip (Takes minimal vertical space) */}
      <div className="inventory-summary-strip">
        <div className="summary-stat-box">
          <div className="summary-stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <Boxes size={20} />
          </div>
          <div>
            <div className="summary-stat-val" style={{ color: '#0f172a' }}>{products.length}</div>
            <div className="summary-stat-label">Total Varian Barang</div>
          </div>
        </div>

        <div className="summary-stat-box">
          <div className="summary-stat-icon" style={{ background: '#eef0fe', color: '#5c59f7' }}>
            <Layers size={20} />
          </div>
          <div>
            <div className="summary-stat-val" style={{ color: '#5c59f7' }}>{totalUnits.toLocaleString('id-ID')} Pcs</div>
            <div className="summary-stat-label">Total Unit Fisik di Gudang</div>
          </div>
        </div>

        <div className="summary-stat-box">
          <div className="summary-stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="summary-stat-val" style={{ color: '#b45309' }}>{formatRupiah(totalValuation)}</div>
            <div className="summary-stat-label">Total Nilai Aset Stok</div>
          </div>
        </div>

        <div className="summary-stat-box">
          <div className="summary-stat-icon" style={{ background: lowStockCount > 0 ? '#fee2e2' : '#f8fafc', color: lowStockCount > 0 ? '#dc2626' : '#64748b' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="summary-stat-val" style={{ color: lowStockCount > 0 ? '#dc2626' : '#16a34a' }}>
              {lowStockCount} Barang
            </div>
            <div className="summary-stat-label">{lowStockCount > 0 ? 'Stok Menipis (Butuh PO)' : 'Semua Stok Aman'}</div>
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: KATALOG STOK */}
      {activeTab === 'inventory' && (
        <>
          {/* Unified, Tidy Filter Bar (1 Clean Row) */}
          <div className="inventory-unified-toolbar">
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                className="unified-search-input"
                placeholder="Cari nama barang, kode (PLT-0001, BIO-0420), atau pabrik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Dropdown Selector */}
            <select 
              className="unified-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              title="Pilih Kategori Barang"
            >
              <option value="all">Semua Kategori ({products.length})</option>
              <optgroup label="Kategori Master (Spesifik)">
                {categoryCounts.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Grup Global (Bawaan)">
                <option value="Palet Plastik">Palet Plastik</option>
                <option value="Part Case">Part Case Futari</option>
                <option value="Lure & Tackle Box">Lure & Tackle Box</option>
                <option value="Krat Industri Rabbit">Krat Rabbit</option>
                <option value="Food Box & Lunch Box">Food & Lunch Box</option>
                <option value="Perlengkapan Numan">Perlengkapan Numan</option>
                <option value="Pabrik Linhui">Pabrik Linhui</option>
                <option value="Maspion & GBU">Maspion & GBU</option>
                <option value="Ember & Toples Bioplast">Bioplast</option>
                <option value="Barang Bekas & Rekondisi">Bekas / Rekondisi</option>
              </optgroup>
            </select>

            {/* Color Filter Dropdown Selector */}
            <select 
              className="unified-select"
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              title="Filter Berdasarkan Warna Barang"
              style={{ minWidth: '150px' }}
            >
              <option value="all">Semua Warna ({products.length})</option>
              <option value="Biru">🔵 Biru ({colorCounts['Biru'] || 0})</option>
              <option value="Hijau">🟢 Hijau ({colorCounts['Hijau'] || 0})</option>
              <option value="Merah">🔴 Merah ({colorCounts['Merah'] || 0})</option>
              <option value="Kuning">🟡 Kuning ({colorCounts['Kuning'] || 0})</option>
              <option value="Orange">🟠 Orange ({colorCounts['Orange'] || 0})</option>
              <option value="Abu-abu">🔘 Abu-abu ({colorCounts['Abu-abu'] || 0})</option>
              <option value="Pink / Ungu">🟣 Pink & Ungu ({colorCounts['Pink / Ungu'] || 0})</option>
              <option value="Hitam">⚫ Hitam ({colorCounts['Hitam'] || 0})</option>
              <option value="Putih / Transparan">⚪ Putih / Bening ({colorCounts['Putih / Transparan'] || 0})</option>
              <option value="Coklat">🟤 Coklat ({colorCounts['Coklat'] || 0})</option>
              <option value="Multi Warna">🎨 Multi Warna ({colorCounts['Multi Warna'] || 0})</option>
              <option value="Standar Pabrik">🏷️ Standar Pabrik ({colorCounts['Standar Pabrik'] || 0})</option>
            </select>

            {/* Quick Status Filter Pills */}
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
              <button
                type="button"
                onClick={() => setStatusQuickFilter('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusQuickFilter === 'all' ? '#ffffff' : 'transparent',
                  color: statusQuickFilter === 'all' ? '#0f172a' : '#64748b',
                  fontWeight: statusQuickFilter === 'all' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: statusQuickFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusQuickFilter('low')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusQuickFilter === 'low' ? '#fee2e2' : 'transparent',
                  color: statusQuickFilter === 'low' ? '#dc2626' : '#64748b',
                  fontWeight: statusQuickFilter === 'low' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Menipis ({lowStockCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusQuickFilter('safe')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusQuickFilter === 'safe' ? '#ecfdf5' : 'transparent',
                  color: statusQuickFilter === 'safe' ? '#065f46' : '#64748b',
                  fontWeight: statusQuickFilter === 'safe' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Aman
              </button>
            </div>

            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleImportExcel} 
            />
            
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              title="Import format Excel (.xlsx)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '0.8rem', marginRight: '8px' }}
            >
              <FileSpreadsheet size={15} color="#0ea5e9" />
              <span>Import Excel</span>
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleExportExcel}
              title="Download format Excel (.xlsx)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '0.8rem' }}
            >
              <FileSpreadsheet size={15} color="#16a34a" />
              <span>Ekspor Excel</span>
            </button>
          </div>

          {/* Clean, Readable Table Card (8 Columns with dedicated Warna) */}
          <div className="data-table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="th-sortable" onClick={() => handleSort('name')} style={{ minWidth: '340px' }}>
                    <div className="th-sort-inner">
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>INFO PRODUK</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th className="th-sortable" onClick={() => handleSort('color')} style={{ minWidth: '120px' }}>
                    <div className="th-sort-inner">
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>VARIAN</span>
                      {renderSortIcon('color')}
                    </div>
                  </th>
                  <th className="th-sortable" onClick={() => handleSort('stock')} style={{ minWidth: '160px', textAlign: 'center' }}>
                    <div className="th-sort-inner" style={{ justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>KETERSEDIAAN STOK</span>
                      {renderSortIcon('stock')}
                    </div>
                  </th>
                  <th className="th-sortable" onClick={() => handleSort('sellPrice')} style={{ minWidth: '200px', textAlign: 'right' }}>
                    <div className="th-sort-inner" style={{ justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>INFORMASI HARGA</span>
                      {renderSortIcon('sellPrice')}
                    </div>
                  </th>
                  <th className="th-sticky-action" style={{ textAlign: 'center', minWidth: '85px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>AKSI</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => {
                  const isCritical = p.stock <= p.minStock;
                  const margin = p.sellPrice - p.buyPrice;
                  const marginPct = p.sellPrice > 0 ? Math.round((margin / p.sellPrice) * 100) : 0;
                  const reserved = getReservedStock(p);
                  const available = Math.max(0, p.stock - reserved);

                  return (
                    <tr key={p.id}>
                      {/* 1. INFO PRODUK */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '6px 0' }}>
                          <div 
                            style={{ 
                              width: '60px', 
                              height: '60px', 
                              borderRadius: '12px', 
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <ImageIcon size={24} color="#cbd5e1" />
                            )}
                          </div>
                          <div>
                            <div 
                              style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: '6px', cursor: 'pointer', lineHeight: '1.3' }}
                              onClick={() => setEditingProduct({ ...p })}
                              title={`Klik untuk Edit: ${p.name}`}
                            >
                              {p.cleanName || p.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                                {p.code}
                              </span>
                              <span style={{ color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                {p.category}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#64748b' }}>
                                <MapPin size={12} color="#94a3b8" />
                                {p.location || 'Gudang Utama'}
                              </span>
                            </div>
                            {(p.factory || p.notes) && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {p.factory && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Archive size={12} color="#94a3b8" /> {p.factory}</span>}
                                {p.notes && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706' }}><FileText size={12} /> {p.notes}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. VARIAN WARNA */}
                      <td>
                        {renderColorBadge(p)}
                      </td>

                      {/* 3. KETERSEDIAAN STOK */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: isCritical ? '#dc2626' : '#0f172a' }}>
                              {p.stock.toLocaleString('id-ID')}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{p.unit || 'pcs'}</span>
                          </div>
                          
                          {isCritical ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700, background: '#fee2e2', padding: '3px 8px', borderRadius: '12px' }}>
                              <AlertTriangle size={12} /> Stok Menipis
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.7rem', fontWeight: 700, background: '#d1fae5', padding: '3px 8px', borderRadius: '12px' }}>
                              <CheckCircle2 size={12} /> Stok Aman
                            </span>
                          )}

                          {reserved > 0 && (
                            <div style={{ fontSize: '0.7rem', color: '#c2410c', fontWeight: 600, marginTop: '2px' }}>
                              {reserved} dipesan
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. INFORMASI HARGA */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: '#4f46e5', fontSize: '1.1rem', marginBottom: '6px' }}>
                          {formatRupiah(p.sellPrice)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', fontSize: '0.75rem' }}>
                          <div style={{ color: '#64748b' }}>
                            Modal: <span style={{ fontWeight: 700, color: '#334155' }}>{formatRupiah(p.buyPrice)}</span>
                          </div>
                          <div style={{ color: margin >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, background: margin >= 0 ? '#dcfce7' : '#fee2e2', padding: '2px 8px', borderRadius: '6px' }}>
                            Margin +{marginPct}% ({formatRupiah(margin)})
                          </div>
                        </div>
                      </td>

                      {/* 5. AKSI */}
                      <td className="td-sticky-action" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          <button 
                            className="btn btn-primary"
                            onClick={() => setEditingProduct({ ...p })}
                            style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', boxShadow: '0 2px 4px rgba(92,89,247,0.2)' }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(p)}
                            title="Hapus Produk"
                            style={{ 
                              padding: '4px 8px', 
                              background: 'transparent', 
                              color: '#94a3b8', 
                              border: 'none', 
                              width: '100%',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              borderRadius: '6px',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sortedProducts.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <PackageCheck size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155' }}>Tidak ada produk yang cocok</h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px' }}>
                  Coba periksa kata kunci pencarian atau pilih kategori yang berbeda.
                </p>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setStatusQuickFilter('all'); }}
                  style={{ marginTop: '14px' }}
                >
                  Reset Filter & Pencarian
                </button>
              </div>
            )}

            {/* Clean Pagination Bar */}
            {sortedProducts.length > 0 && (
              <div className="pagination-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>
                    Menampilkan <strong>{pageSize === 'all' ? 1 : (currentPage - 1) * pageSize + 1}</strong> - <strong>{pageSize === 'all' ? sortedProducts.length : Math.min(currentPage * pageSize, sortedProducts.length)}</strong> dari <strong>{sortedProducts.length}</strong> Barang
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem' }}>Baris per halaman:</span>
                    <select 
                      className="page-size-select"
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                        setPageSize(val);
                        setCurrentPage(1);
                      }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="all">Semua ({sortedProducts.length})</option>
                    </select>
                  </div>
                </div>

                {pageSize !== 'all' && totalPages > 1 && (
                  <div className="pagination-controls">
                    <button 
                      className="page-btn" 
                      onClick={() => setCurrentPage(1)} 
                      disabled={currentPage === 1}
                      title="Halaman Pertama"
                    >
                      <ChevronsLeft size={14} />
                    </button>
                    <button 
                      className="page-btn" 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                      disabled={currentPage === 1}
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <span style={{ padding: '0 8px', fontWeight: 600, color: '#334155' }}>
                      Hal. {currentPage} dari {totalPages}
                    </span>

                    <button 
                      className="page-btn" 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                      disabled={currentPage === totalPages}
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button 
                      className="page-btn" 
                      onClick={() => setCurrentPage(totalPages)} 
                      disabled={currentPage === totalPages}
                      title="Halaman Terakhir"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW TAB 2: STOCK OPNAME CEPAT (SOP MAS HERI) */}
      {activeTab === 'opname' && (
        <div className="data-table-card" style={{ border: '2px solid #10b981' }}>
          <div style={{
            padding: '16px 20px',
            background: '#ecfdf5',
            borderBottom: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <strong style={{ color: '#065f46', fontSize: '1rem' }}>Mode Stock Opname Cepat (SOP Mas Heri)</strong>
              <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                Ketik jumlah fisik riil di gudang. Sistem otomatis menghitung selisih (+/- pcs) dan mencatat mutasi riwayat opname.
              </div>
            </div>
            <button 
              className="btn btn-primary"
              style={{ background: '#059669', borderColor: '#059669' }}
              onClick={handleApplyOpname}
            >
              <CheckCircle2 size={16} />
              <span>Simpan Hasil Stock Opname</span>
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Warna</th>
                <th>Lokasi</th>
                <th style={{ textAlign: 'center' }}>Stok Sistem</th>
                <th style={{ textAlign: 'center', width: '160px' }}>Hitungan Fisik Nyata</th>
                <th style={{ textAlign: 'center' }}>Selisih</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const physicalCount = Number(opnameData[p.id] ?? p.stock);
                const diff = physicalCount - p.stock;

                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.cleanName || p.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.code}</div>
                    </td>
                    <td>
                      {renderColorBadge(p)}
                    </td>
                    <td>{p.location}</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>
                      {p.stock} {p.unit}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="number"
                        min="0"
                        className="form-input"
                        style={{ textAlign: 'center', fontWeight: '800', width: '120px', margin: '0 auto' }}
                        value={opnameData[p.id] ?? p.stock}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOpnameData(prev => ({
                            ...prev,
                            [p.id]: val
                          }));
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {diff === 0 ? (
                        <span className="status-pill badge-slate">Cocok (0)</span>
                      ) : diff > 0 ? (
                        <span className="status-pill badge-success">+{diff} {p.unit} (Lebih)</span>
                      ) : (
                        <span className="status-pill badge-danger">{diff} {p.unit} (Kurang)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW TAB 3: RIWAYAT MUTASI GUDANG */}
      {activeTab === 'movements' && (
        <div className="data-table-card">
          <div style={{
            padding: '16px 20px',
            background: '#ffffff',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <strong style={{ color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={18} color="#5c59f7" />
                Log Riwayat Mutasi Stok Gudang
              </strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Catatan resmi setiap transaksi stok fisik: Penerimaan PO pabrik, Surat Jalan keluar, Opname, dan Koreksi.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn-export-excel"
                onClick={handleExportMovementsExcel}
                title="Download Log Mutasi ke Excel (.xlsx)"
              >
                <FileSpreadsheet size={16} />
                <span>Ekspor Mutasi Excel</span>
              </button>
            </div>
          </div>

          {/* Filter Bar for Movements */}
          <div style={{ padding: '12px 20px', background: '#fafbfc', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter Jenis:</span>
              {[
                { id: 'all', label: 'Semua' },
                { id: 'IN', label: 'Masuk (PO Pabrik)' },
                { id: 'OUT', label: 'Keluar (Surat Jalan)' },
                { id: 'OPNAME', label: 'Stock Opname' },
                { id: 'ADJUSTMENT', label: 'Koreksi / Manual' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setMovementTypeFilter(tf.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: movementTypeFilter === tf.id ? '1px solid #5c59f7' : '1px solid #e2e8f0',
                    background: movementTypeFilter === tf.id ? '#5c59f7' : '#ffffff',
                    color: movementTypeFilter === tf.id ? '#ffffff' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <input 
                type="text"
                className="form-input"
                placeholder="Cari Kode, Ref Dokumen, Alasan..."
                style={{ padding: '6px 10px 6px 28px', fontSize: '0.8rem' }}
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
              />
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '140px' }}>Tanggal & Waktu</th>
                <th style={{ minWidth: '220px' }}>Produk & Kode</th>
                <th style={{ textAlign: 'center', minWidth: '110px' }}>Jenis Mutasi</th>
                <th style={{ minWidth: '160px' }}>No. Referensi Dokumen</th>
                <th style={{ textAlign: 'center', minWidth: '100px' }}>Perubahan Qty</th>
                <th style={{ textAlign: 'center', minWidth: '120px' }}>Sebelum → Sesudah</th>
                <th style={{ minWidth: '220px' }}>Keterangan / Alasan</th>
                <th style={{ minWidth: '110px' }}>Operator</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((m) => {
                let badgeClass = 'badge-movement-in';
                if (m.type === 'OUT') badgeClass = 'badge-movement-out';
                else if (m.type === 'OPNAME') badgeClass = 'badge-movement-opname';
                else if (m.type === 'ADJUSTMENT') badgeClass = 'badge-movement-adj';

                return (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} color="#94a3b8" />
                        <span>{m.date}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{m.productName}</div>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem', color: '#475569', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                        {m.productCode}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span className={`status-pill ${badgeClass}`} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        {m.type === 'IN' ? 'MASUK (IN)' : m.type === 'OUT' ? 'KELUAR (OUT)' : m.type === 'OPNAME' ? 'OPNAME' : 'KOREKSI'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={12} color="#6366f1" />
                        <span>{m.refNo || '-'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        fontSize: '0.92rem', 
                        fontWeight: 800, 
                        color: m.qty > 0 ? '#16a34a' : m.qty < 0 ? '#dc2626' : '#64748b' 
                      }}>
                        {m.qty > 0 ? `+${m.qty.toLocaleString('id-ID')}` : m.qty.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                      <span style={{ color: '#475569' }}>{m.beforeStock?.toLocaleString('id-ID')}</span>
                      <span style={{ margin: '0 4px', color: '#94a3b8' }}>→</span>
                      <strong style={{ color: '#0f172a' }}>{m.afterStock?.toLocaleString('id-ID')}</strong>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {m.reason}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} color="#94a3b8" />
                        <span>{m.operator || 'Mas Heri'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredMovements.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <History size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>Belum ada log mutasi yang sesuai</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Mutasi stok akan otomatis dicatat setiap kali ada penerimaan PO atau penerbitan Surat Jalan.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL EDIT PRODUK & HARGA */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Data: {editingProduct.name}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setEditingProduct(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ padding: '24px' }}>
                
                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon" style={{ color: '#3b82f6' }}><Tag size={18} /></div>
                    <div>
                      <h4 className="form-section-title">Informasi Utama</h4>
                      <p className="form-section-desc">Identitas dan spesifikasi dasar barang</p>
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Nama Barang / Tipe Lengkap</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    />
                  </div>

                  <div className="form-grid-3" style={{ marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Kategori</label>
                      <select 
                        className="form-select"
                        value={editingProduct.category}
                        onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      >
                        <option value="Palet Plastik">Palet Plastik</option>
                        <option value="Part Case">Part Case Futari</option>
                        <option value="Lure & Tackle Box">Lure & Tackle Box</option>
                        <option value="Krat Industri Rabbit">Krat Industri Rabbit</option>
                        <option value="Food Box & Lunch Box">Food Box & Lunch Box</option>
                        <option value="Pabrik Linhui">Pabrik Linhui</option>
                        <option value="Maspion & GBU">Maspion & GBU</option>
                        <option value="Ember & Toples Bioplast">Ember & Toples Bioplast</option>
                        <option value="Barang Bekas & Rekondisi">Barang Bekas & Rekondisi</option>
                        <option value="Keranjang Solid">Keranjang Solid</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Warna Barang</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="Merah, Biru..."
                        value={editingProduct.color || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Pabrik / Supplier</label>
                      <input 
                        type="text" 
                        className="form-input"
                        value={editingProduct.factory}
                        onChange={(e) => setEditingProduct({ ...editingProduct, factory: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon" style={{ color: '#10b981' }}><Banknote size={18} /></div>
                    <div>
                      <h4 className="form-section-title">Harga & Keuangan</h4>
                      <p className="form-section-desc">Pengaturan harga modal dan harga jual</p>
                    </div>
                  </div>
                  
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Harga Modal (Beli Pabrik)</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={editingProduct.buyPrice}
                        onChange={(e) => setEditingProduct({ ...editingProduct, buyPrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Harga Jual (Pricelist Paletindo)</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={editingProduct.sellPrice}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sellPrice: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon" style={{ color: '#8b5cf6' }}><Archive size={18} /></div>
                    <div>
                      <h4 className="form-section-title">Stok & Penyimpanan</h4>
                      <p className="form-section-desc">Kuantitas fisik, lokasi, dan peringatan batas stok</p>
                    </div>
                  </div>
                  
                  <div className="form-grid-3" style={{ marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Stok Fisik Gudang</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Batas Alert Stok</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={editingProduct.minStock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, minStock: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Satuan</label>
                      <select 
                        className="form-select"
                        value={editingProduct.unit}
                        onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                      >
                        <option value="pcs">pcs</option>
                        <option value="pack">pack</option>
                        <option value="unit">unit</option>
                        <option value="set">set</option>
                        <option value="dus">dus</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lokasi Rak di Gudang</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={editingProduct.location}
                      onChange={(e) => setEditingProduct({ ...editingProduct, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-section" style={{ marginBottom: 0 }}>
                  <div className="form-section-header">
                    <div className="form-section-icon" style={{ color: '#f59e0b' }}><ImageIcon size={18} /></div>
                    <div>
                      <h4 className="form-section-title">Media & Catatan Tambahan</h4>
                      <p className="form-section-desc">Foto barang dan informasi tambahan lainnya</p>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Link Gambar Barang (URL)</label>
                    <input 
                      type="url" 
                      className="form-input"
                      placeholder="https://example.com/image.jpg"
                      value={editingProduct.imageUrl || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Catatan Tambahan</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: Barang cacat 2 pcs, dus rusak..."
                      value={editingProduct.notes || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, notes: e.target.value })}
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProduct(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Produk Baru */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tambah Produk Baru ke Master Stok</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAddProduct}>
              <div className="modal-body" style={{ padding: '24px' }}>
                
                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon" style={{ color: '#3b82f6' }}><Tag size={18} /></div>
                    <div>
                      <h4 className="form-section-title">Informasi Utama</h4>
                      <p className="form-section-desc">Identitas dan spesifikasi dasar barang</p>
                    </div>
                  </div>
                  
                  <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Kode Barang / Tipe *</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="Contoh: PLT-9999 atau BIO-0500"
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        required
                      />
                      <span className="form-help">Kode unik, tidak boleh sama</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Kategori Master</label>
                      <select 
                        className="form-select"
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}
                      >
                        <option value="Palet Plastik">Palet Plastik</option>
                        <option value="Part Case">Part Case Futari</option>
                        <option value="Lure & Tackle Box">Lure & Tackle Box</option>
                        <option value="Krat Industri Rabbit">Krat Industri Rabbit</option>
                        <option value="Food Box & Lunch Box">Food Box & Lunch Box</option>
                        <option value="Pabrik Linhui">Pabrik Linhui</option>
                        <option value="Maspion & GBU">Maspion & GBU</option>
                        <option value="Ember & Toples Bioplast">Ember & Toples Bioplast</option>
                        <option value="Barang Bekas & Rekondisi">Barang Bekas & Rekondisi</option>
                        <option value="Keranjang Solid">Keranjang Solid</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Nama Barang / Tipe Lengkap *</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: Tackle Box SS - 270 ( met blue )"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Pabrik / Supplier Asal</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="Contoh: PT FUTARI PLASTIK"
                        value={factory}
                        onChange={(e) => setFactory(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Warna Barang</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="Contoh: Merah, Hijau, Biru..."
                        value={productColor}
                        onChange={(e) => setProductColor(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon" style={{ color: '#10b981' }}><Banknote size={18} /></div>
                    <div>
                      <h4 className="form-section-title">Harga & Keuangan</h4>
                      <p className="form-section-desc">Pengaturan harga modal dan harga jual</p>
                    </div>
                  </div>
                  
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Harga Modal (Beli Pabrik)</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Harga Jual (Pricelist Paletindo)</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon" style={{ color: '#8b5cf6' }}><Archive size={18} /></div>
                    <div>
                      <h4 className="form-section-title">Stok & Penyimpanan</h4>
                      <p className="form-section-desc">Kuantitas fisik awal dan lokasi rak</p>
                    </div>
                  </div>
                  
                  <div className="form-grid-3" style={{ marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Stok Fisik Awal</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={initialStock}
                        onChange={(e) => setInitialStock(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Batas Alert Stok</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Satuan</label>
                      <select 
                        className="form-select"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      >
                        <option value="pcs">pcs</option>
                        <option value="pack">pack</option>
                        <option value="unit">unit</option>
                        <option value="set">set</option>
                        <option value="dus">dus</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lokasi Rak di Gudang</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: Gudang Utama - Rak Lure"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-section" style={{ marginBottom: 0 }}>
                  <div className="form-section-header">
                    <div className="form-section-icon" style={{ color: '#f59e0b' }}><ImageIcon size={18} /></div>
                    <div>
                      <h4 className="form-section-title">Media & Catatan Tambahan</h4>
                      <p className="form-section-desc">Foto barang dan informasi tambahan lainnya</p>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Link Gambar Barang (URL)</label>
                    <input 
                      type="url" 
                      className="form-input"
                      placeholder="https://example.com/image.jpg"
                      value={productImageUrl}
                      onChange={(e) => setProductImageUrl(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Catatan Tambahan</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: Stok pesanan, dus warna biru..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Produk Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
