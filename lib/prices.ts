import { BikeData } from './bikeAnalysis';
import { PRICE_CSV } from './priceCsv';
import { STANDARD_PRODUCTS_CSV } from './standardProductsCsv';
import { ItemKind, PriceItem, Task } from './types';

// Columns: section, Servicetyp, Beskrivning, Pris, bikeType, EAN, has_product,
// has_standard_products. No field is quoted.
export const PRICE_LIST: PriceItem[] = PRICE_CSV.split('\n')
  .slice(1)
  .map((line) => line.split(','))
  .filter((parts) => parts.length >= 6 && !Number.isNaN(Number(parts[3])))
  .map(([, category, title, price, bikeType, , hasProduct, hasStandardProducts]) => ({
    category: category.trim(),
    title: title.trim(),
    price: Number(price),
    bikeType: bikeType.trim(),
    hasProduct: hasProduct?.trim() === 'true',
    hasStandardProducts: hasStandardProducts?.trim() === 'true',
  }));

export type StandardProduct = {
  name: string;
  quantity: number;
  /** Fixed unit price; replaces the stock price and is taken out of the job's price. */
  price?: number;
  articleNumber?: string;
};

// Columns: Beskrivning, Produkt, Antal, Pris, Artikelnummer. No field is quoted.
const STANDARD_PRODUCTS = new Map<string, StandardProduct[]>();
STANDARD_PRODUCTS_CSV.split('\n')
  .slice(1)
  .map((line) => line.split(','))
  .filter((parts) => parts.length >= 3 && parts[0].trim() && parts[1].trim())
  .forEach(([title, name, quantity, price, articleNumber]) => {
    const list = STANDARD_PRODUCTS.get(title.trim()) ?? [];
    list.push({
      name: name.trim(),
      quantity: Number(quantity) || 1,
      price: price?.trim() ? Number(price) : undefined,
      articleNumber: articleNumber?.trim() || undefined,
    });
    STANDARD_PRODUCTS.set(title.trim(), list);
  });

/** A price row's standard products, or [] if it has none. */
export function standardProductsFor(item: PriceItem): StandardProduct[] {
  return item.hasStandardProducts ? (STANDARD_PRODUCTS.get(item.title) ?? []) : [];
}

/** bikeType tags that only apply to a bike with that property. */
const BIKE_TAGS = ['all_bikes', 'electric', 'racer', 'cargo', 'hub', 'external'];

/** The tags that fit this bike: all_bikes plus whatever matches type, motor and rear gear. */
function bikeTags(bike: BikeData['bike'] | null): string[] {
  if (!bike) return BIKE_TAGS;
  const tags = ['all_bikes', bike.gears.back];
  if (bike.electric) tags.push('electric');
  if (bike.bike_type === 'road bike') tags.push('racer');
  if (bike.bike_type === 'cargo bike') tags.push('cargo');
  return tags;
}

/**
 * The price rows that apply to what the photo shows. Nothing known yet (no
 * kind, no bike) → every row. A bike whose details aren't known yet → every
 * bike row.
 */
export function pricesFor(kind: ItemKind | null, bike: BikeData['bike'] | null): PriceItem[] {
  const effectiveKind = kind ?? (bike ? 'bike' : null);
  if (!effectiveKind) return PRICE_LIST;
  const tags = effectiveKind === 'bike' ? bikeTags(bike) : [effectiveKind];
  return PRICE_LIST.filter((item) => tags.includes(item.bikeType));
}

/**
 * Price rows in the Servicetyp;Beskrivning;Pris;Produkter format the AI prompts
 * use. Produkter: "nej" = no products, "ja" = free suggestions, otherwise the
 * row's standard products ("2 st Routa W244 35-622 | ...").
 */
export function priceCsvFor(items: PriceItem[]): string {
  const productsCell = (item: PriceItem) => {
    if (!item.hasProduct) return 'nej';
    const standard = standardProductsFor(item);
    if (standard.length === 0) return 'ja';
    return standard
      .map((p) => `${p.quantity} st ${p.name}${p.articleNumber ? ` (art.nr ${p.articleNumber})` : ''}`)
      .join(' | ');
  };
  return [
    'Servicetyp;Beskrivning;Pris;Produkter',
    ...items.map((item) => `${item.category};${item.title};${item.price};${productsCell(item)}`),
  ].join('\n');
}

/**
 * Enforces the price list's product columns on an AI-made task: no products
 * when has_product is false; standard products get their quantity, and a fixed
 * unit price moves that amount from the job's price to the product.
 */
export function applyProductRules(task: Task): Task {
  const item = PRICE_LIST.find((row) => row.title === task.title);
  if (!item) return task;
  if (!item.hasProduct) return { ...task, products: [] };
  const standard = standardProductsFor(item);
  if (standard.length === 0) return task;

  // Catalogue names vary ("Däck Routa W244 35-622 svart"), so every word of
  // the standard name must appear in the product name.
  const words = (text: string) => text.toLowerCase().split(/[^a-z0-9åäö]+/).filter(Boolean);
  const match = (name: string, articleNumber?: string) => {
    const nameWords = new Set(words(name));
    // Most specific first, so "Marathon Plus" wins over "Marathon".
    return [...standard].sort((x, y) => words(y.name).length - words(x.name).length).find(
      (p) =>
        (p.articleNumber && p.articleNumber === articleNumber) ||
        words(p.name).every((w) => nameWords.has(w))
    );
  };

  // Standard products are alternatives, so only one fixed price comes off the job.
  let fixedSum = 0;
  const products = task.products.map((product) => {
    const std = match(product.name, product.articleNumber);
    if (!std) return product;
    if (std.price !== undefined) fixedSum = Math.max(fixedSum, std.price * std.quantity);
    return {
      ...product,
      quantity: std.quantity > 1 ? std.quantity : undefined,
      price: std.price ?? product.price,
    };
  });
  return { ...task, products, price: item.price - fixedSum };
}
