import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchInStockProducts, SearchProduct } from './productSearch';

/**
 * The store's in-stock products, kept on the phone so the "Bara i lager"
 * search is instant and works without network. Refreshed at most once an hour.
 */
const REFRESH_MS = 60 * 60 * 1000;
const keyFor = (userId: string) => `inStockProducts:${userId}`;

type Stored = { fetchedAt: number; products: SearchProduct[] };

/** In-memory copy of what's stored; one lowercase search string per product. */
let cache: { userId: string; products: SearchProduct[]; haystack: string[] } | null = null;

function setCache(userId: string, products: SearchProduct[]) {
  cache = {
    userId,
    products,
    haystack: products.map((p) => `${p.name} ${p.articleNumber} ${p.ean}`.toLowerCase()),
  };
}

async function refresh(userId: string) {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  const stored = raw ? (JSON.parse(raw) as Stored) : null;
  if (stored && cache?.userId !== userId) setCache(userId, stored.products);
  if (stored && Date.now() - stored.fetchedAt < REFRESH_MS) return;

  const products = await fetchInStockProducts();
  setCache(userId, products);
  await AsyncStorage.setItem(
    keyFor(userId),
    JSON.stringify({ fetchedAt: Date.now(), products } satisfies Stored)
  );
}

/** Loads the cache now and refreshes it hourly while signed in. Returns a stop function. */
export function startInStockSync(userId: string): () => void {
  const run = () =>
    refresh(userId).catch((err) =>
      console.warn('In-stock cache:', err instanceof Error ? err.message : err)
    );
  void run();
  const timer = setInterval(run, REFRESH_MS);
  return () => clearInterval(timer);
}

/** Whether the in-stock list has been loaded yet. */
export function hasInStockCache(): boolean {
  return cache !== null;
}

/**
 * Local search in the cached in-stock products: every word must appear in the
 * name, article number or EAN. Exact article number / EAN hits come first.
 */
export function searchInStock(query: string, limit = 50): SearchProduct[] {
  if (!cache) return [];
  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const exact: SearchProduct[] = [];
  const rest: SearchProduct[] = [];
  cache.products.forEach((product, i) => {
    if (!words.every((word) => cache!.haystack[i].includes(word))) return;
    const isExact = product.articleNumber.toLowerCase() === q || product.ean === q;
    (isExact ? exact : rest).push(product);
  });
  return [...exact, ...rest].slice(0, limit);
}
