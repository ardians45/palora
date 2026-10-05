// Tabel standar: header sticky, angka rata kanan, sort per kolom, total, kelompok, paginasi 50 baris.
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { num } from '../lib/format';
import { Empty, ErrorBox, Loading } from './core';

/**
 * columns: [{
 *   key, label, align: 'right'|'center', width,
 *   render?(row) -> node, value?(row) -> nilai untuk sort/total,
 *   total?: true | (rows) => node,     // tampil di baris total
 *   sortable?: boolean (default true)
 * }]
 * groupBy?(row) -> label kelompok (baris judul tebal seperti Excel), groupTotal?: key kolom yang dijumlah
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (r) => r.id,
  onRowClick,
  loading,
  error,
  onRetry,
  empty,
  pageSize = 50,
  groupBy,
  groupTotal,
  totalLabel = 'Total',
  initialSort,
  autoHeight,
  rowClassName,
}) {
  const [sort, setSort] = useState(initialSort || null); // { key, dir: 1|-1 }
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [rows, sort]);

  const getVal = (col, row) => (col.value ? col.value(row) : row[col.key]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const x = getVal(col, a);
      const y = getVal(col, b);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir;
      return String(x ?? '').localeCompare(String(y ?? ''), 'id', { numeric: true }) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shown = groupBy ? sorted : sorted.slice(current * pageSize, current * pageSize + pageSize);
  const hasTotals = columns.some((c) => c.total);

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    setSort((s) => (!s || s.key !== col.key ? { key: col.key, dir: 1 } : s.dir === 1 ? { key: col.key, dir: -1 } : null));
  };

  const cell = (col, row) => {
    const v = col.render ? col.render(row) : getVal(col, row);
    return v === undefined || v === null || v === '' ? <span className="muted">-</span> : v;
  };

  const renderRow = (row) => (
    <tr
      key={rowKey(row)}
      className={[onRowClick ? 'clickable' : '', rowClassName ? rowClassName(row) : ''].join(' ')}
      onClick={onRowClick ? (e) => !e.target.closest('a,button,input,select,label') && onRowClick(row) : undefined}
      tabIndex={onRowClick ? 0 : undefined}
      onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
    >
      {columns.map((c) => (
        <td key={c.key} data-label={c.label} className={[c.align, c.cellClass].filter(Boolean).join(' ')}>
          {cell(c, row)}
        </td>
      ))}
    </tr>
  );

  let body;
  if (groupBy) {
    const groups = [];
    const index = new Map();
    for (const r of shown) {
      const g = groupBy(r) || 'Lainnya';
      if (!index.has(g)) {
        index.set(g, groups.length);
        groups.push({ name: g, rows: [] });
      }
      groups[index.get(g)].rows.push(r);
    }
    body = groups.map((g) => (
      <React.Fragment key={`g-${g.name}`}>
        <tr className="group">
          <td colSpan={columns.length}>{g.name}</td>
        </tr>
        {g.rows.map(renderRow)}
        {groupTotal && (
          <tr className="subtotal">
            {columns.map((c, i) => (
              <td key={c.key} className={c.align || ''}>
                {i === 0 ? 'Subtotal' : c.key === groupTotal ? num(g.rows.reduce((s, r) => s + (Number(getVal(c, r)) || 0), 0)) : ''}
              </td>
            ))}
          </tr>
        )}
      </React.Fragment>
    ));
  } else {
    body = shown.map(renderRow);
  }

  if (loading && rows.length === 0) return <div className="table-wrap auto-h"><Loading /></div>;
  if (error) return <div className="table-wrap auto-h"><ErrorBox error={error} onRetry={onRetry} /></div>;
  if (rows.length === 0) return <div className="table-wrap auto-h">{empty || <Empty title="Belum ada data" />}</div>;

  return (
    <>
      <div className={`table-wrap ${autoHeight ? 'auto-h' : ''}`}>
        <table className="dt cards">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={[c.align || '', c.sortable === false ? '' : 'sortable'].join(' ')}
                  style={c.width ? { width: c.width } : undefined}
                  onClick={() => toggleSort(c)}
                  aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
                >
                  {c.label}
                  {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{body}</tbody>
          {hasTotals && (
            <tfoot>
              <tr>
                {columns.map((c, i) => (
                  <td key={c.key} className={c.align || ''}>
                    {i === 0
                      ? totalLabel
                      : typeof c.total === 'function'
                        ? c.total(sorted)
                        : c.total
                          ? num(sorted.reduce((s, r) => s + (Number(getVal(c, r)) || 0), 0))
                          : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="table-footer">
        <span>
          {groupBy || pages === 1
            ? `${sorted.length} baris`
            : `${current * pageSize + 1}–${Math.min(sorted.length, (current + 1) * pageSize)} dari ${sorted.length}`}
        </span>
        {!groupBy && pages > 1 && (
          <div className="pager">
            <button type="button" className="btn btn-sm btn-icon" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Halaman sebelumnya">
              <ChevronLeft size={16} />
            </button>
            <span>
              {current + 1} / {pages}
            </span>
            <button type="button" className="btn btn-sm btn-icon" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Halaman berikutnya">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/** Saring baris berdasarkan teks bebas di beberapa kolom. */
export function matchText(row, query, fields) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  return fields.some((f) => String(typeof f === 'function' ? f(row) : row[f] ?? '').toLowerCase().includes(q));
}
