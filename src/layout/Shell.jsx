// Kerangka halaman modul: topbar (logo PALORA = ke menu utama, nama modul, sub-menu, user).
import React, { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { pb } from '../lib/pb';
import { href } from '../lib/router';
import { useSession } from '../lib/session';
import { Button, Field, Input } from '../ui/core';
import { Dialog, useToast } from '../ui/feedback';
import { navFor } from '../modules/registry';
import { ROLE_LABEL } from '../lib/status';

/** Ganti password akun sendiri (wajib password lama). Setelah berhasil langsung login ulang otomatis. */
function PasswordDialog({ user, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ old: '', next: '', again: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (f.next.length < 8) return setErr('Password baru minimal 8 karakter.');
    if (f.next !== f.again) return setErr('Ulangi password baru: belum sama.');
    if (f.next === f.old) return setErr('Password baru harus berbeda dari yang lama.');
    setBusy(true);
    try {
      await pb.collection('users').update(user.id, { oldPassword: f.old, password: f.next, passwordConfirm: f.next });
      await pb.collection('users').authWithPassword(user.email, f.next); // token lama hangus setelah ganti password
      toast.ok('Password berhasil diganti');
      onClose();
    } catch (ex) {
      setErr(ex?.response?.data?.oldPassword ? 'Password lama salah.' : ex?.response?.message || ex.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="Ganti Password" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-body stack">
          <Field label="Password sekarang" required>
            <Input type="password" autoComplete="current-password" value={f.old} onChange={(e) => set({ old: e.target.value })} autoFocus />
          </Field>
          <Field label="Password baru" required hint="Minimal 8 karakter. Jangan pakai password yang mudah ditebak.">
            <Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => set({ next: e.target.value })} />
          </Field>
          <Field label="Ulangi password baru" required>
            <Input type="password" autoComplete="new-password" value={f.again} onChange={(e) => set({ again: e.target.value })} />
          </Field>
          {err && <div className="alert error" role="alert">{err}</div>}
        </div>
        <div className="dialog-foot">
          <Button onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" busy={busy}>
            Ganti Password
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Topbar({ moduleId, path }) {
  const { user, role, onLogout } = useSession();
  const [changePw, setChangePw] = useState(false);
  const { title, nav } = navFor(moduleId, role);
  const current = path.join('/');
  // link paling spesifik yang cocok dengan path aktif
  const activeTo = nav
    .map((n) => n.to.join('/'))
    .filter((t) => current === t || current.startsWith(`${t}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <header className="topbar">
      <a className="topbar-home" href="#/" title="Menu utama">
        <img src="/palora-mark.svg" alt="" />
        <span>PALORA</span>
      </a>
      {moduleId && (
        <>
          <span className="topbar-sep" />
          <span className="topbar-module">{title}</span>
          <nav className="topbar-nav" aria-label="Menu modul">
            {nav.map((n) => (
              <a key={n.label} href={href(n.to)} className={n.to.join('/') === activeTo ? 'active' : ''}>
                {n.label}
              </a>
            ))}
          </nav>
        </>
      )}
      <div className="topbar-user">
        <div className="who">
          <b>{user.name || user.email}</b>
          <span>{ROLE_LABEL[role]}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setChangePw(true)} title="Ganti password" aria-label="Ganti password">
          <KeyRound size={16} />
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onLogout} title="Keluar" aria-label="Keluar">
          <LogOut size={16} />
        </button>
      </div>
      {changePw && <PasswordDialog user={user} onClose={() => setChangePw(false)} />}
    </header>
  );
}

export default function Shell({ moduleId, path, children }) {
  return (
    <>
      <Topbar moduleId={moduleId} path={path} />
      <main className="page">{children}</main>
    </>
  );
}
