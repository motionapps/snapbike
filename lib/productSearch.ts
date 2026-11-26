import { firstProductImageUrl } from '@hermodex/shared/shared-helpers/supplier-helpers/supplier_image_url';
import { supabase } from './supabase';
import type { NewProduct, Product } from './types';

/**
 * BikeOffice backend for the same Supabase project the app signs in to:
 * staging.api.bikeoffice.se for staging, api.backoffice.techlara.se for production.
 */
const API_URL = process.env.EXPO_PUBLIC_BIKEOFFICE_API_URL ?? 'https://staging.api.bikeoffice.se';

export type SearchProduct = {
  articleNumber: string;
  ean: string;
  name: string;
  sellPrice: number;
  supplier: { name?: string };
  /** The image host holds a photo for it (set by /flex and /in-stock). */
  hasImage?: boolean;
};

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Inte inloggad.');
  const res = await fetch(`${API_URL}/api/suppliersearch/search${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) throw new Error(`Produktsök misslyckades (${res.status}).`);
  return (await res.json()) as T;
}

/** A search hit as a task product; stock 1 = from the in-stock list, 0 = order item. */
export function productFromSearch(product: SearchProduct, stock: number): NewProduct {
  return {
    name: product.name,
    price: product.sellPrice > 0 ? product.sellPrice : 0,
    articleNumber: product.articleNumber,
    ean: product.ean || undefined,
    supplier: product.supplier?.name || undefined,
    stock,
    hasImage: product.hasImage,
  };
}

/** The product's photo on techlara.se, only when the image host has one. */
export function productImageUrl(product: Product): string | undefined {
  if (!product.hasImage || !product.supplier) return undefined;
  return firstProductImageUrl(product.supplier, product.articleNumber, product.ean);
}

/** BikeOffice product search across all suppliers (name, article number or EAN). */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<SearchProduct[]> {
  const body = await getJson<{ products: SearchProduct[] }>(
    `/flex/${encodeURIComponent(query)}`,
    signal
  );
  return body.products;
}

/** Every catalogue product the store's cashier has in stock (cached by lib/inStockCache). */
export async function fetchInStockProducts(): Promise<SearchProduct[]> {
  const body = await getJson<{ products: SearchProduct[] }>('/in-stock');
  return body.products;
}
