// Toast & dialog konfirmasi: pengganti alert()/confirm() browser.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '../lib/pb';

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, { type = 'info', action, duration } = {}) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-3), { id, message, type, action }]);
      const ms = duration ?? (type === 'error' ? 8000 : 4000);
      if (ms > 0) setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () =>
      Object.assign((m, o) => push(m, o), {
        ok: (m, o) => push(m, { ...o, type: 'info' }),
        error: (errOrMsg, o) => push(typeof errOrMsg === 'string' ? errOrMsg : errorMessage(errOrMsg), { ...o, type: 'error' }),
      }),
    [push]
  );

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    []
  );

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type === 'error' ? 'error' : ''}`}>
              <span className="msg">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" aria-label="Tutup" onClick={() => dismiss(t.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
        {confirmState && (
          <ConfirmDialog
            {...confirmState}
            onClose={(ok) => {
              confirmState.resolve(ok);
              setConfirmState(null);
            }}
          />
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
export const useConfirm = () => useContext(ConfirmCtx);

function ConfirmDialog({ title, message, confirmLabel = 'Lanjutkan', cancelLabel = 'Batal', danger, onClose }) {
  return (
    <Dialog title={title} onClose={() => onClose(false)}>
      <div className="dialog-body">{typeof message === 'string' ? <p>{message}</p> : message}</div>
      <div className="dialog-foot">
        <button type="button" className="btn" onClick={() => onClose(false)}>
          {cancelLabel}
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger solid' : 'btn-primary'}`} onClick={() => onClose(true)}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

/** Kerangka dialog: Esc menutup, fokus pindah ke dialog, klik luar TIDAK menutup (isian tidak hilang). */
export function Dialog({ title, onClose, wide, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    const first = el?.querySelector('input:not([type=hidden]), select, textarea, button.btn-primary, button');
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="overlay">
      <div ref={ref} className={`dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-head">
          <h2>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Jalankan aksi async dengan status sibuk + pesan.
 * const [run, busy] = useAction(); run(() => action(...), 'Tersimpan')
 */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, successMessage) => {
      if (busy) return undefined;
      setBusy(true);
      try {
        const res = await fn();
        if (successMessage) toast.ok(typeof successMessage === 'function' ? successMessage(res) : successMessage);
        return res;
      } catch (err) {
        toast.error(err);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [busy, toast]
  );
  return [run, busy];
}
