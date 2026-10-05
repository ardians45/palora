// Foto barang (thumbnail otomatis dari PocketBase). Tanpa foto -> kotak polos dengan ikon.
import React from 'react';
import { Package } from 'lucide-react';
import { pb } from '../lib/pb';

export function photoUrl(product, thumb = '96x96') {
  if (!product?.photo) return '';
  return pb.files.getURL(product, product.photo, thumb ? { thumb } : undefined);
}

export default function ProductPhoto({ product, size = 'sm', className = '' }) {
  const url = photoUrl(product, size === 'lg' ? '400x0' : '96x96');
  if (!url) {
    return (
      <span className={`thumb ${size} empty ${className}`} aria-hidden="true">
        <Package size={size === 'lg' ? 40 : 16} />
      </span>
    );
  }
  return <img className={`thumb ${size} ${className}`} src={url} alt={product.name} loading="lazy" />;
}
