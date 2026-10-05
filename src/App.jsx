import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AppLauncher from './components/AppLauncher';
import PrintModal from './components/PrintModal';

// Modules
import SalesModule from './components/modules/SalesModule';
import PurchaseModule from './components/modules/PurchaseModule';
import InventoryModule from './components/modules/InventoryModule';
import DeliveryModule from './components/modules/DeliveryModule';
import ReceivablesModule from './components/modules/ReceivablesModule';
import DocumentModule from './components/modules/DocumentModule';
import MarketplaceModule from './components/modules/MarketplaceModule';
import MasterDataModule from './components/modules/MasterDataModule';
import ReportsModule from './components/modules/ReportsModule';
import SystemLogModule from './components/modules/SystemLogModule';

// Initial Mock Data
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_SUPPLIERS, 
  INITIAL_ORDERS, 
  INITIAL_PO, 
  INITIAL_DELIVERIES, 
  INITIAL_DOCUMENTS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SYSTEM_LOGS,
  APP_MODULES
} from './data/mockData';

export default function App() {
  const [activeModule, setActiveModule] = useState(null);
  const [currentRole, setCurrentRole] = useState('Mas Heri (Admin Gudang & POS)');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync authentic data from data paletindo if first time or version changed
  const DATA_VERSION = 'v9_numan_category';
  if (typeof window !== 'undefined' && localStorage.getItem('palora_data_version') !== DATA_VERSION) {
    localStorage.setItem('palora_data_version', DATA_VERSION);
    localStorage.setItem('palora_products', JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem('palora_customers', JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem('palora_suppliers', JSON.stringify(INITIAL_SUPPLIERS));
    localStorage.setItem('palora_orders', JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem('palora_po', JSON.stringify(INITIAL_PO));
    localStorage.setItem('palora_deliveries', JSON.stringify(INITIAL_DELIVERIES));
    localStorage.setItem('palora_documents', JSON.stringify(INITIAL_DOCUMENTS));
    localStorage.setItem('palora_stock_movements', JSON.stringify(INITIAL_STOCK_MOVEMENTS));
    localStorage.setItem('palora_system_logs', JSON.stringify(INITIAL_SYSTEM_LOGS));
  }

  // Main Persistent Data Stores
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('palora_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('palora_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [suppliers, setSuppliers] = useState(() => {
    const saved = localStorage.getItem('palora_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('palora_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    const saved = localStorage.getItem('palora_po');
    return saved ? JSON.parse(saved) : INITIAL_PO;
  });

  const [deliveries, setDeliveries] = useState(() => {
    const saved = localStorage.getItem('palora_deliveries');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
  });

  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('palora_documents');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  const [stockMovements, setStockMovements] = useState(() => {
    const saved = localStorage.getItem('palora_stock_movements');
    return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
  });

  const [systemLogs, setSystemLogs] = useState(() => {
    const saved = localStorage.getItem('palora_system_logs');
    return saved ? JSON.parse(saved) : INITIAL_SYSTEM_LOGS;
  });

  const addSystemLog = (module, action, detail) => {
    const nowStr = new Date().toLocaleString('id-ID', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\./g, ':').replace(',', '');
    
    setSystemLogs(prev => [{
      id: `LOG-${Date.now()}`,
      date: nowStr,
      user: currentRole,
      module,
      action,
      detail
    }, ...prev]);
  };

  // Print Modal State
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    type: 'sj',
    data: null
  });

  // Save to localStorage on state changes
  useEffect(() => {
    localStorage.setItem('palora_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('palora_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('palora_po', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem('palora_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem('palora_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('palora_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('palora_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('palora_stock_movements', JSON.stringify(stockMovements));
  }, [stockMovements]);

  useEffect(() => {
    localStorage.setItem('palora_system_logs', JSON.stringify(systemLogs));
  }, [systemLogs]);

  // URL Hash Routing Support (e.g. #/inventory, #/sales, #/purchases, etc.)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (!hash) {
        setActiveModule(null);
        return;
      }
      const matched = APP_MODULES.find(m => m.id === hash);
      if (matched) {
        setActiveModule(matched);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectModule = (mod) => {
    if (!mod) {
      if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '') {
        window.location.hash = '#/';
      }
      setActiveModule(null);
    } else {
      window.location.hash = `#/${mod.id}`;
      setActiveModule(mod);
    }
  };

  // Keyboard shortcut: Press Escape to return to App Launcher
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !printModal.isOpen) {
        handleSelectModule(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [printModal.isOpen]);

  // Open Document Print Preview
  const handlePrintDocument = (type, data) => {
    setPrintModal({
      isOpen: true,
      type,
      data
    });
  };

  // Close Print Modal
  const handleClosePrint = () => {
    setPrintModal({
      isOpen: false,
      type: 'sj',
      data: null
    });
  };

  return (
    <div className="app-viewport">
      {/* View Mode 1: Home Dashboard (App Launcher with Executive Metric Cards) */}
      {!activeModule ? (
        <div className="odoo-home-canvas">
          <Navbar 
            activeModule={activeModule}
            setActiveModule={handleSelectModule}
            currentRole={currentRole}
            setCurrentRole={setCurrentRole}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <AppLauncher 
            onSelectModule={(mod) => handleSelectModule(mod)}
            orders={orders}
            products={products}
            purchaseOrders={purchaseOrders}
            deliveries={deliveries}
            customers={customers}
            suppliers={suppliers}
            documents={documents}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentUser={currentRole}
          />
        </div>
      ) : (
        /* View Mode 2: In-Module View with Left Sidebar & Main Content */
        <div className="app-shell">
          {/* Left In-Module Sidebar */}
          <Sidebar 
            activeModule={activeModule}
            setActiveModule={handleSelectModule}
            currentRole={currentRole}
            setCurrentRole={setCurrentRole}
          />

          {/* Right Main Content Area */}
          <div className="app-main-content">
            <main>
              {activeModule.id === 'sales' && (
                <SalesModule 
                  orders={orders}
                  setOrders={setOrders}
                  products={products}
                  setProducts={setProducts}
                  customers={customers}
                  setCustomers={setCustomers}
                  onPrintDocument={handlePrintDocument}
                  currentUser={currentRole}
                  addSystemLog={addSystemLog}
                />
              )}

              {activeModule.id === 'purchases' && (
                <PurchaseModule 
                  purchaseOrders={purchaseOrders}
                  setPurchaseOrders={setPurchaseOrders}
                  suppliers={suppliers}
                  products={products}
                  setProducts={setProducts}
                  stockMovements={stockMovements}
                  setStockMovements={setStockMovements}
                  documents={documents}
                  setDocuments={setDocuments}
                  onPrintDocument={handlePrintDocument}
                  currentUser={currentRole}
                  addSystemLog={addSystemLog}
                />
              )}

              {activeModule.id === 'inventory' && (
                <InventoryModule 
                  products={products}
                  setProducts={setProducts}
                  suppliers={suppliers}
                  orders={orders}
                  stockMovements={stockMovements}
                  setStockMovements={setStockMovements}
                  currentUser={currentRole}
                  initialTab={activeModule.initialTab}
                  initialFilter={activeModule.initialFilter}
                  addSystemLog={addSystemLog}
                />
              )}

              {activeModule.id === 'deliveries' && (
                <DeliveryModule 
                  deliveries={deliveries}
                  setDeliveries={setDeliveries}
                  orders={orders}
                  setOrders={setOrders}
                  products={products}
                  setProducts={setProducts}
                  stockMovements={stockMovements}
                  setStockMovements={setStockMovements}
                  documents={documents}
                  setDocuments={setDocuments}
                  onPrintDocument={handlePrintDocument}
                  currentUser={currentRole}
                  addSystemLog={addSystemLog}
                />
              )}

              {activeModule.id === 'receivables' && (
                <ReceivablesModule 
                  orders={orders}
                  setOrders={setOrders}
                  customers={customers}
                  setCustomers={setCustomers}
                  currentUser={currentRole}
                  addSystemLog={addSystemLog}
                />
              )}

              {activeModule.id === 'documents' && (
                <DocumentModule 
                  documents={documents}
                  setDocuments={setDocuments}
                  purchaseOrders={purchaseOrders}
                  setPurchaseOrders={setPurchaseOrders}
                  addSystemLog={addSystemLog}
                  currentUser={currentRole}
                  initialFilter={activeModule.initialFilter}
                />
              )}

              {activeModule.id === 'systemlogs' && (
                <SystemLogModule 
                  systemLogs={systemLogs}
                  currentUser={currentRole}
                />
              )}

              {activeModule.id === 'marketplace' && (
                <MarketplaceModule 
                  products={products}
                  setProducts={setProducts}
                  stockMovements={stockMovements}
                  setStockMovements={setStockMovements}
                  currentUser={currentRole}
                  addSystemLog={addSystemLog}
                />
              )}

              {activeModule.id === 'masterdata' && (
                <MasterDataModule 
                  customers={customers}
                  setCustomers={setCustomers}
                  suppliers={suppliers}
                  setSuppliers={setSuppliers}
                  orders={orders}
                  currentUser={currentRole}
                  initialTab={activeModule.initialTab}
                />
              )}

              {activeModule.id === 'reports' && (
                <ReportsModule 
                  orders={orders}
                  products={products}
                  purchaseOrders={purchaseOrders}
                  currentUser={currentRole}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Official PT Paletindo Document Print Preview Modal */}
      <PrintModal 
        isOpen={printModal.isOpen}
        onClose={handleClosePrint}
        documentType={printModal.type}
        data={printModal.data}
      />
    </div>
  );
}
