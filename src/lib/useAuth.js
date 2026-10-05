import { useCallback, useEffect, useState } from 'react';
import { pb } from './pb';

const currentUser = () => (pb.authStore.isValid ? pb.authStore.record : null);

export function useAuth() {
  const [user, setUser] = useState(currentUser);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const unsub = pb.authStore.onChange(() => setUser(currentUser()));

    // Perbarui token & data user (role bisa saja diubah Owner) saat aplikasi dibuka
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch((err) => {
          if (err?.status !== 0) pb.authStore.clear(); // offline: tetap pakai sesi lama
        });
    }

    // NFR 7.3: sesi otomatis berakhir saat token kedaluwarsa
    const timer = setInterval(() => {
      if (pb.authStore.token && !pb.authStore.isValid) {
        pb.authStore.clear();
        setExpired(true);
      }
    }, 60 * 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    await pb.collection('users').authWithPassword(email.trim(), password);
    setExpired(false);
  }, []);

  const logout = useCallback(() => {
    pb.realtime.unsubscribe().catch(() => {});
    pb.authStore.clear();
  }, []);

  return { user, login, logout, expired };
}
