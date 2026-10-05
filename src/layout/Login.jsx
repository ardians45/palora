import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { errorMessage } from '../lib/pb';
import { Button, Field, Input } from '../ui/core';

const MODULES = ['Stok gudang & opname', 'Pesanan, kasir & surat jalan', 'PO supplier & arsip dokumen', 'Piutang, hutang & laporan'];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError([400, 403].includes(err?.status) ? 'Email atau password salah, atau akun belum diaktifkan Owner.' : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const checkCaps = (e) => setCaps(!!e.getModifierState?.('CapsLock'));

  return (
    <main className="login">
      <div className="login-shell">
        <aside className="login-side" aria-hidden="true">
          <div className="login-side-brand">
            <img src="/palora-mark.svg" alt="" />
            <b>PALORA</b>
          </div>
          <div>
            <p className="login-side-title">Satu tempat untuk pekerjaan gudang &amp; kantor.</p>
            <ul>
              {MODULES.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <p className="login-side-foot">PT Paletindo Prakarsa Unggul · Jelupang, Serpong Utara, Tangerang Selatan</p>
        </aside>

        <form className="login-form" onSubmit={submit}>
          <div className="login-brand">
            <img src="/palora-mark.svg" alt="" />
            <div>
              <b>PALORA</b>
              <span>PT Paletindo Prakarsa Unggul</span>
            </div>
          </div>
          <div>
            <h1>Masuk</h1>
            <p className="muted">Gunakan akun yang dibuat Owner.</p>
          </div>
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="nama@palora.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Password" htmlFor="login-password" error={caps ? 'Caps Lock menyala' : undefined}>
            <div className="password-wrap">
              <Input
                id="login-password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={checkCaps}
                onKeyDown={checkCaps}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
                aria-pressed={show}
                title={show ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <Button type="submit" variant="primary" size="lg" busy={busy}>
            Masuk
          </Button>
          <p className="login-help">
            <LockKeyhole size={14} aria-hidden="true" /> Lupa password? Minta Owner mengatur ulang dari menu Pengguna.
          </p>
        </form>
      </div>
    </main>
  );
}
