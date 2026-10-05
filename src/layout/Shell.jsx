// Kerangka halaman modul: topbar (logo PALORA = ke menu utama, nama modul, sub-menu, user).
import React from 'react';
import { LogOut } from 'lucide-react';
import { href } from '../lib/router';
import { useSession } from '../lib/session';
import { navFor } from '../modules/registry';
import { ROLE_LABEL } from '../lib/status';

export function Topbar({ moduleId, path }) {
  const { user, role, onLogout } = useSession();
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
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onLogout} title="Keluar" aria-label="Keluar">
          <LogOut size={16} />
        </button>
      </div>
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
