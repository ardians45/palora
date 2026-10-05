// Konteks sesi: user login, role, pengaturan perusahaan, dan daftar barang (dipakai banyak modul).
import React, { createContext, useContext, useMemo } from 'react';
import { useRecords } from './data';
import { ROLE_LABEL } from './status';

const Ctx = createContext(null);

export function SessionProvider({ user, onLogout, children }) {
  const settings = useRecords('settings', { sort: 'created', limit: 1 });
  const products = useRecords('products', { filter: 'deleted = false', sort: 'code' });

  const value = useMemo(
    () => ({
      user,
      role: user.role,
      label: `${user.name || user.email} (${ROLE_LABEL[user.role] || user.role})`,
      can: (...roles) => roles.includes(user.role),
      onLogout,
      settings: settings.items[0] || null,
      reloadSettings: settings.reload,
      products: products.items,
      productsLoading: products.loading,
      productsError: products.error,
      reloadProducts: products.reload,
    }),
    [user, onLogout, settings.items, settings.reload, products.items, products.loading, products.error, products.reload]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
