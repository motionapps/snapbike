import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchInStockProducts, SearchProduct } from './productSearch';

/**
 * The store's in-stock products, kept on the phone so the "Bara i lager"
 * search is instant and works without network. Refreshed at most once an hour.
 */
const REFRESH_MS = 60 * 60 * 1000;
// v2: products carry hasImage; a list stored before that is fetched again.
const keyFor = (userId: string) => `inStockProducts:v2:${userId}`;

type Stored = { fetchedAt: number; products: SearchProduct[] };

/** In-memory copy of what's stored; one lowercase search string per product. */
let cache: { userId: string; products: SearchProduct[]; haystack: string[] } | null = null;

/** Where the list stands, so the product search can show loading or the error. */
export type InStockStatus = { state: 'idle' | 'loading' | 'ready' | 'error'; error?: string };
let status: InStockStatus = { state: 'idle' };
let currentUserId: string | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setStatus(next: InStockStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}

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
  // An empty stored list counts as missing and is fetched again.
  const usable = stored && stored.products.length > 0 ? stored : null;
  if (usable && cache?.userId !== userId) setCache(userId, usable.products);
  if (usable && Date.now() - usable.fetchedAt < REFRESH_MS) {
    setStatus({ state: 'ready' });
    return;
  }

  if (!cache) setStatus({ state: 'loading' });
  const products = await fetchInStockProducts();
  setCache(userId, products);
  setStatus({ state: 'ready' });
  await AsyncStorage.setItem(
    keyFor(userId),
    JSON.stringify({ fetchedAt: Date.now(), products } satisfies Stored)
  );
}

function run(userId: string): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = refresh(userId)
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('In-stock cache:', message);
      // Keep showing an older list if there is one; otherwise show the error.
      setStatus(cache ? { state: 'ready' } : { state: 'error', error: message });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Loads the cache now and refreshes it hourly while signed in. Returns a stop function. */
export function startInStockSync(userId: string): () => void {
  currentUserId = userId;
  void run(userId);
  const timer = setInterval(() => void run(userId), REFRESH_MS);
  return () => {
    clearInterval(timer);
    if (currentUserId === userId) currentUserId = null;
  };
}

/** Fetches the list if it isn't loaded, e.g. after a failed attempt. */
export function ensureInStock() {
  if (currentUserId && !cache) void run(currentUserId);
}

/** Subscribe to status changes (for useSyncExternalStore). */
export function subscribeInStock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInStockStatus(): InStockStatus {
  return status;
}

/** The cached in-stock product with this article number, if any. */
export function findInStock(articleNumber: string): SearchProduct | undefined {
  return cache?.products.find((product) => product.articleNumber === articleNumber);
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
