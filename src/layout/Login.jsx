import React, { useState } from 'react';
import { errorMessage } from '../lib/pb';
import { Button, Field, Input } from '../ui/core';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError([400, 403].includes(err?.status) ? 'Email atau password salah, atau akun belum diaktifkan Owner.' : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <img src="/palora-mark.svg" alt="" />
          <div>
            <b>PALORA</b>
            <span className="muted small">Sistem internal PT Paletindo Prakarsa Unggul</span>
          </div>
        </div>
        <Field label="Email">
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <Button type="submit" variant="primary" size="lg" busy={busy}>
          Masuk
        </Button>
        <p className="small muted">Lupa password? Minta Owner mengatur ulang dari menu Pengguna.</p>
      </form>
    </main>
  );
}
