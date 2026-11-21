import { supabase } from './supabase';

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
