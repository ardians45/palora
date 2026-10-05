import React, { useState } from 'react';
import { LogIn, Lock, Mail } from 'lucide-react';
import { errorMessage } from '../lib/pb';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(
        err?.status === 400
          ? 'Email atau password salah, atau akun belum diaktifkan Owner.'
          : errorMessage(err)
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-canvas">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src="/logo-paletindo.png" alt="Paletindo" className="login-logo" />
          <div>
            <div className="login-title">PALORA</div>
            <div className="login-sub">Sistem Internal PT Paletindo Prakarsa Unggul</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email</label>
          <div className="login-input-wrap">
            <Mail size={16} />
            <input
              id="login-email"
              type="email"
              className="form-input"
              autoComplete="username"
              placeholder="nama@palora.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">Password</label>
          <div className="login-input-wrap">
            <Lock size={16} />
            <input
              id="login-password"
              type="password"
              className="form-input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <div className="login-error" role="alert">{error}</div>}

        <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
          <LogIn size={16} />
          {busy ? 'Memeriksa...' : 'Masuk'}
        </button>

        <p className="login-help">Lupa password? Minta Owner untuk mengatur ulang dari menu Pengguna.</p>
      </form>
    </div>
  );
}
