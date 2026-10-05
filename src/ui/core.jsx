// Komponen dasar yang dipakai semua modul.
import React, { useEffect, useId, useRef } from 'react';
import { Loader2, Paperclip, X } from 'lucide-react';
import { href } from '../lib/router';
import { num } from '../lib/format';

export function Button({ variant, size, busy, icon: Icon, children, className = '', type = 'button', ...rest }) {
  const cls = ['btn', variant && `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={busy || rest.disabled} aria-busy={busy || undefined} {...rest}>
      {busy ? <Loader2 className="spin" /> : Icon ? <Icon /> : null}
      {children}
    </button>
  );
}

export function LinkButton({ to, query, variant, icon: Icon, children, className = '' }) {
  return (
    <a className={['btn', variant && `btn-${variant}`, className].filter(Boolean).join(' ')} href={href(to, query)}>
      {Icon ? <Icon /> : null}
      {children}
    </a>
  );
}

export const Badge = ({ tone = 'neutral', children }) => <span className={`badge ${tone}`}>{children}</span>;

/** Badge dari peta status { key: {label, tone} } */
export const StatusBadge = ({ map, value }) => {
  const s = map[value] || { label: value || '-', tone: 'neutral' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

/** Penanda langkah alur dokumen (statusbar ala Odoo) */
export function Steps({ steps, current, exception }) {
  if (exception) {
    return (
      <div className="steps" aria-label="Status">
        <span className="exception">{exception}</span>
      </div>
    );
  }
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="steps" aria-label="Status">
      {steps.map((s, i) => (
        <span key={s.key} className={i === idx ? 'current' : i < idx ? 'done' : ''} aria-current={i === idx ? 'step' : undefined}>
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function PageHeader({ crumbs = [], title, sub, actions }) {
  return (
    <header className="page-header">
      {crumbs.length > 0 && (
        <nav className="breadcrumb" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              {c.to ? <a href={href(c.to, c.query)}>{c.label}</a> : <span>{c.label}</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="page-title-row">
        <h1 className="page-title">
          {title}
          {sub && <small>{sub}</small>}
        </h1>
        {actions && <div className="actions">{actions}</div>}
      </div>
    </header>
  );
}

export function Field({ label, required, hint, error, className = '', children, htmlFor }) {
  const auto = useId();
  const id = htmlFor || auto;
  const child = React.isValidElement(children) && !children.props.id ? React.cloneElement(children, { id }) : children;
  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="req"> *</span>}
        </label>
      )}
      {child}
      {error ? <span className="error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`input ${className}`} {...rest} />;
});

export const Select = ({ className = '', options, children, ...rest }) => (
  <select className={`select ${className}`} {...rest}>
    {options
      ? options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          )
        )
      : children}
  </select>
);

export const Textarea = ({ className = '', ...rest }) => <textarea className={`textarea ${className}`} {...rest} />;

/**
 * Input angka/uang: tampil berformat "1.250.000" sejak diketik, terima juga tempelan "1250000".
 * value: number | '' ; onChange(number | '')
 */
export const MoneyInput = React.forwardRef(function MoneyInput({ value, onChange, className = '', ...rest }, ref) {
  const shown = value === '' || value === null || value === undefined || Number.isNaN(value) ? '' : num(value);
  return (
    <input
      ref={ref}
      className={`input num ${className}`}
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        onChange(digits === '' ? '' : Number(digits));
      }}
      {...rest}
    />
  );
});

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} className={value === t.key ? 'on' : ''} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && <span className="count">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, actions, children, bodyClass = 'panel-body' }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          <h3>{title}</h3>
          {actions}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
      {action && <div>{action}</div>}
    </div>
  );
}

export function Loading({ text = 'Memuat data...' }) {
  return (
    <div className="empty">
      <Loader2 className="spin" size={20} /> <div>{text}</div>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="empty">
      <b>Data gagal dimuat</b>
      <div>{error?.status === 0 ? 'Tidak bisa terhubung ke server.' : error?.message || 'Terjadi kesalahan.'}</div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

/** Kotak pilih file (foto dari kamera HP atau PDF), maks 5MB. */
export function FilePick({ value, onChange, accept = 'image/*,.pdf', label = 'Pilih foto / PDF', maxMB = 5, onError }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!value && ref.current) ref.current.value = '';
  }, [value]);
  return (
    <div className="file-pick">
      <Paperclip size={18} className="muted" />
      <span className="name grow">{value ? `${value.name} (${(value.size / 1048576).toFixed(2)} MB)` : <span className="muted">Belum ada file</span>}</span>
      {value && (
        <Button size="sm" variant="ghost" icon={X} onClick={() => onChange(null)} aria-label="Hapus file" />
      )}
      <Button size="sm" onClick={() => ref.current?.click()}>
        {value ? 'Ganti' : label}
      </Button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > maxMB * 1048576) {
            e.target.value = '';
            onError?.(`Ukuran file ${(f.size / 1048576).toFixed(1)} MB. Maksimal ${maxMB} MB.`);
            return;
          }
          onChange(f);
        }}
      />
    </div>
  );
}

export function DescList({ items }) {
  return (
    <dl className="dl">
      {items
        .filter((x) => x && x[1] !== undefined && x[1] !== null && x[1] !== '')
        .map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </React.Fragment>
        ))}
    </dl>
  );
}

export const Kpi = ({ label, value, to, query, tone }) => {
  const body = (
    <>
      <div className="label">{label}</div>
      <div className={`value ${tone ? `text-${tone}` : ''}`}>{value}</div>
    </>
  );
  return to ? (
    <a className="kpi" href={href(to, query)}>
      {body}
    </a>
  ) : (
    <div className="kpi">{body}</div>
  );
};
