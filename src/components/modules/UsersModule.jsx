import React, { useCallback, useEffect, useState } from 'react';
import { UserCog, Plus, KeyRound, Save, X } from 'lucide-react';
import { pb, errorMessage } from '../../lib/pb';
import { ROLE_LABEL } from '../../lib/schema';

const EMPTY_FORM = { id: null, name: '', email: '', role: 'gudang', active: true, password: '' };

// Manajemen akun login (PRD 6.7: "Kelola user" hanya Owner).
// Tidak ada hapus akun: karyawan yang keluar cukup dinonaktifkan supaya riwayat audit tetap utuh.
export default function UsersModule({ currentUserId, addSystemLog }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await pb.collection('users').getFullList({ sort: 'name' }));
    } catch (err) {
      window.alert(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { name: form.name, role: form.role, active: form.active };
      if (form.password) {
        if (form.password.length < 8) throw new Error('Password minimal 8 karakter.');
        body.password = form.password;
        body.passwordConfirm = form.password;
      }
      if (form.id) {
        if (form.id === currentUserId && (!form.active || form.role !== 'owner')) {
          throw new Error('Anda tidak bisa menonaktifkan atau menurunkan role akun Anda sendiri.');
        }
        await pb.collection('users').update(form.id, body);
        addSystemLog?.('Pengguna', 'Ubah Akun', `Mengubah akun ${form.email} (role: ${ROLE_LABEL[form.role]}, ${form.active ? 'aktif' : 'nonaktif'}${form.password ? ', password direset' : ''})`);
      } else {
        if (!form.password) throw new Error('Password wajib diisi untuk akun baru.');
        await pb.collection('users').create({ ...body, email: form.email, emailVisibility: true });
        addSystemLog?.('Pengguna', 'Tambah Akun', `Membuat akun ${form.email} sebagai ${ROLE_LABEL[form.role]}`);
      }
      setForm(null);
      await load();
    } catch (err) {
      window.alert(err.status !== undefined ? errorMessage(err) : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="module-workspace">
      <div className="module-header">
        <div className="module-info-left">
          <div className="module-header-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: '#fff' }}>
            <UserCog size={22} />
          </div>
          <div>
            <h2 className="module-title-main">Pengguna & Hak Akses</h2>
            <p className="module-desc">Akun login tim Paletindo. Karyawan yang keluar cukup dinonaktifkan.</p>
          </div>
        </div>
        <div className="module-actions-right">
          <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY_FORM })}>
            <Plus size={16} /> Tambah Akun
          </button>
        </div>
      </div>

      <div className="data-table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name || '-'}</strong>{u.id === currentUserId && <span className="badge-info" style={{ marginLeft: 8 }}>Anda</span>}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABEL[u.role] || u.role}</td>
                <td>
                  <span className={u.active ? 'badge-success' : 'badge-slate'}>{u.active ? 'Aktif' : 'Nonaktif'}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setForm({ ...EMPTY_FORM, ...u, password: '' })}>
                    <KeyRound size={14} /> Ubah / Reset
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data akun...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <form className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <div className="modal-header">
              <h3 className="modal-title">{form.id ? 'Ubah Akun' : 'Tambah Akun Baru'}</h3>
              <button type="button" className="btn-icon" onClick={() => setForm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nama</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email (untuk login)</label>
                <input className="form-input" type="email" value={form.email} disabled={!!form.id} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {Object.entries(ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{form.id ? 'Password baru (kosongkan jika tidak diganti)' : 'Password'}</label>
                <input className="form-input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Akun aktif (bisa login)
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={busy}><Save size={16} /> {busy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
