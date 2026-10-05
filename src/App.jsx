import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AppLauncher from './components/AppLauncher';
import PrintModal from './components/PrintModal';
import LoginScreen from './components/LoginScreen';

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
import UsersModule from './components/modules/UsersModule';

import { APP_MODULES } from './data/mockData';
import { useAuth } from './lib/useAuth';
import { usePbCollection, onSyncStatus } from './lib/usePbCollection';
import { userLabel } from './lib/schema';

// Indikator kecil di pojok kanan bawah saat ada data yang sedang disimpan ke server
function SyncIndicator() {
  const [pending, setPending] = useState(0);
  useEffect(() => onSyncStatus(setPending), []);
  if (!pending) return null;
  return <div className="sync-indicator">Menyimpan {pending} perubahan...</div>;
}

export default function App() {
  const { user, login, logout } = useAuth();
  if (!user) return <LoginScreen onLogin={login} />;
  // key = id user -> semua state di-reset bersih saat ganti akun
  return <AuthenticatedApp key={user.id} user={user} onLogout={logout} />;
}

function AuthenticatedApp({ user, onLogout }) {
  const [activeModule, setActiveModule] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const currentRole = userLabel(user);
  const role = user.role;
  const isOwner = role === 'owner';

  // Modul yang boleh dibuka sesuai role (PRD 6.7)
  const allowedModules = useMemo(
    () => APP_MODULES.filter(m => m.roleAccess.includes('all') || m.roleAccess.includes(role)),
    [role]
  );
  const allowedModuleIds = useMemo(() => allowedModules.map(m => m.id), [allowedModules]);

  // Data utama: tersimpan di server PocketBase & tersinkron realtime antar perangkat
  const [products, setProducts, productsMeta] = usePbCollection('products');
  const [customers, setCustomers] = usePbCollection('customers');
  const [suppliers, setSuppliers] = usePbCollection('suppliers');
  const [orders, setOrders] = usePbCollection('orders');
  const [purchaseOrders, setPurchaseOrders] = usePbCollection('purchaseOrders');
  const [deliveries, setDeliveries] = usePbCollection('deliveries');
  const [documents, setDocuments] = usePbCollection('documents');
  const [stockMovements, setStockMovements] = usePbCollection('stockMovements');
  const [systemLogs, setSystemLogs] = usePbCollection('systemLogs', isOwner);

  const addSystemLog = useCallback((module, action, detail) => {
    const nowStr = new Date().toLocaleString('id-ID', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\./g, ':').replace(',', '');

    setSystemLogs(prev => [{
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: nowStr,
      user: currentRole,
      module,
      action,
      detail
    }, ...prev]);
  }, [setSystemLogs, currentRole]);

  // Print Modal State
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    type: 'sj',
    data: null
  });

  const handleSelectModule = useCallback((mod) => {
    if (!mod) {
      if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '') {
        window.location.hash = '#/';
      }
      setActiveModule(null);
    } else if (allowedModuleIds.includes(mod.id)) {
      window.location.hash = `#/${mod.id}`;
      setActiveModule(mod);
    } else {
      window.alert(`Akun Anda (${currentRole}) tidak punya akses ke modul "${mod.title}".`);
    }
  }, [allowedModuleIds, currentRole]);

  // URL Hash Routing Support (e.g. #/inventory, #/sales, #/purchases, etc.)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (!hash) {
        setActiveModule(null);
        return;
      }
      const matched = allowedModules.find(m => m.id === hash);
      setActiveModule(matched || null);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [allowedModules]);

  // Keyboard shortcut: Press Escape to return to App Launcher
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !printModal.isOpen) {
        handleSelectModule(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [printModal.isOpen, handleSelectModule]);

  const handleLogout = async () => {
    if (!window.confirm('Keluar dari PALORA?')) return;
    window.location.hash = '#/';
    await onLogout();
  };

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

  if (!productsMeta.loaded) {
    return <div className="app-loading">Memuat data PALORA dari server...</div>;
  }

  return (
    <div className="app-viewport">
      {/* View Mode 1: Home Dashboard (App Launcher with Executive Metric Cards) */}
      {!activeModule ? (
        <div className="odoo-home-canvas">
          <Navbar
            activeModule={activeModule}
            setActiveModule={handleSelectModule}
            currentRole={currentRole}
            onLogout={handleLogout}
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
            allowedModuleIds={allowedModuleIds}
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
            onLogout={handleLogout}
            modules={allowedModules}
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
                  setStockMovements={setStockMovements}
                  onPrintDocument={handlePrintDocument}
                  currentUser={currentRole}
                  userRole={role}
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
                  readOnly={role === 'finance'}
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

              {activeModule.id === 'users' && (
                <UsersModule
                  currentUserId={user.id}
                  addSystemLog={addSystemLog}
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

      <SyncIndicator />
    </div>
  );
}
