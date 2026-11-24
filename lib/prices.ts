import { BikeData } from './bikeAnalysis';
import { PRICE_MODEL_CSV } from './priceModelCsv';
import { ItemKind, PriceItem, Product, StandardProduct, Task, uid } from './types';

// The price model lives in assets/price-model/*.csv (see README). No field is quoted.

type CsvRow = Record<string, string>;

function parseCsv(csv: string): CsvRow[] {
  const [header, ...lines] = csv.split('\n');
  const columns = header.split(',').map((column) => column.trim());
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = line.split(',');
      return Object.fromEntries(columns.map((column, i) => [column, (cells[i] ?? '').trim()]));
    });
}

/** "gears=hub;electric=yes" → { gears: 'hub', electric: 'yes' }. */
function parseConditions(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split(';')
      .filter(Boolean)
      .map((pair) => pair.split('=').map((part) => part.trim()) as [string, string])
  );
}

export type PricePart = {
  id: string;
  parentId: string | null;
  name: string;
  /** "front:front-rim|rear:rear-rim" → side-tagged inspection checklist ids. */
  inspectionItems: { side: string | null; id: string }[];
};

export const PARTS: PricePart[] = parseCsv(PRICE_MODEL_CSV.parts).map((row) => ({
  id: row.part_id,
  parentId: row.parent_id || null,
  name: row.name,
  inspectionItems: row.inspection_items
    .split('|')
    .filter(Boolean)
    .map((item) => {
      const [side, id] = item.includes(':') ? item.split(':') : [null, item];
      return { side, id };
    }),
}));

const PART_BY_ID = new Map(PARTS.map((part) => [part.id, part]));

export const ACTION_NAMES = new Map(
  parseCsv(PRICE_MODEL_CSV.actions).map((row) => [row.action_id, row.name])
);

/** "brake_type=disc" → "skivbroms". */
export const CONDITION_LABELS = new Map(
  parseCsv(PRICE_MODEL_CSV.conditions).map((row) => [row.condition, row.label])
);

/** The part's top-level ancestor (or the part itself). */
export function topPart(partId: string): PricePart | undefined {
  let part = PART_BY_ID.get(partId);
  while (part?.parentId) part = PART_BY_ID.get(part.parentId);
  return part;
}

function conditionLabels(conditions: Record<string, string>): string[] {
  return Object.entries(conditions).map(
    ([key, value]) => CONDITION_LABELS.get(`${key}=${value}`) ?? `${key}=${value}`
  );
}

const conditionKey = (text: string) => text.split(';').filter(Boolean).sort().join(';');

const STANDARD_PRODUCTS = new Map<string, StandardProduct[]>();
parseCsv(PRICE_MODEL_CSV.standardProducts).forEach((row) => {
  const key = `${row.part_id}|${row.action_id}|${conditionKey(row.conditions)}`;
  const list = STANDARD_PRODUCTS.get(key) ?? [];
  list.push({
    name: row.product,
    quantity: Number(row.quantity) || 1,
    price: row.price ? Number(row.price) : undefined,
    auto: row.auto === 'true',
  });
  STANDARD_PRODUCTS.set(key, list);
});

const JOB_ITEMS: PriceItem[] = parseCsv(PRICE_MODEL_CSV.prices).map((row) => {
  const part = PART_BY_ID.get(row.part_id);
  const partName = part?.name ?? row.part_id;
  const conditions = parseConditions(row.conditions);
  // A label already in the part's name ("Navväxel (navväxel)") is left out.
  const extras = [
    ...conditionLabels(conditions).filter((label) => !partName.toLowerCase().includes(label)),
    ...(row.label ? [row.label] : []),
  ];
  const action = ACTION_NAMES.get(row.action_id) ?? row.action_id;
  return {
    kind: 'job',
    category: topPart(row.part_id)?.name ?? '',
    title: `${action} ${partName.toLowerCase()}${extras.length ? ` (${extras.join(', ')})` : ''}`,
    price: Number(row.price),
    partId: row.part_id,
    actionId: row.action_id,
    conditions,
    label: row.label || undefined,
    hasProduct: row.has_product === 'true',
    standardProducts:
      STANDARD_PRODUCTS.get(`${row.part_id}|${row.action_id}|${conditionKey(row.conditions)}`) ?? [],
  };
});

export type ServicePackage = PriceItem & { covers: string[] };

export const PACKAGES: ServicePackage[] = parseCsv(PRICE_MODEL_CSV.packages).map((row) => ({
  kind: 'package',
  category: 'Service',
  title: row.name,
  price: Number(row.price),
  conditions: parseConditions(row.conditions),
  hasProduct: true,
  standardProducts: [],
  // "chain.replace" → "Byt kedja"
  covers: row.covers
    .split('|')
    .filter(Boolean)
    .map((ref) => {
      const [partId, actionId] = ref.split('.');
      const partName = PART_BY_ID.get(partId)?.name ?? partId;
      return `${ACTION_NAMES.get(actionId) ?? actionId} ${partName.toLowerCase()}`;
    }),
}));

export type AddOn = PriceItem & { note: string };

export const ADD_ONS: AddOn[] = parseCsv(PRICE_MODEL_CSV.addOns).map((row) => ({
  kind: 'add_on',
  category: 'Tillägg',
  title: row.name,
  price: Number(row.price),
  conditions: parseConditions(row.conditions),
  hasProduct: false,
  standardProducts: [],
  note: row.note,
}));

export const PRICE_LIST: PriceItem[] = [...JOB_ITEMS, ...PACKAGES, ...ADD_ONS];

const PRICE_BY_TITLE = new Map(PRICE_LIST.map((item) => [item.title, item]));

/** The standard products of the price row a task was made from (none if it has no row). */
export const standardProductsFor = (title: string): StandardProduct[] =>
  PRICE_BY_TITLE.get(title)?.standardProducts ?? [];

/** Conditions that describe the whole bike; a known bike hides rows that don't fit. */
const BIKE_CONDITIONS = ['gears', 'electric', 'bike_type'];

function fitsBike(item: PriceItem, bike: BikeData['bike']): boolean {
  const { gears, electric, bike_type } = item.conditions;
  if (gears && gears !== bike.gears.back) return false;
  if (electric === 'yes' && !bike.electric) return false;
  if (bike_type === 'racer' && bike.bike_type !== 'road bike') return false;
  if (bike_type === 'cargo' && bike.bike_type !== 'cargo bike') return false;
  return true;
}

/** A bike type picked by hand; unset fields don't filter. */
export type BikeProfile = {
  gears?: 'hub' | 'external';
  electric?: boolean;
  bikeType?: 'standard' | 'racer' | 'cargo';
};

function fitsProfile(item: PriceItem, profile: BikeProfile): boolean {
  const { gears, electric, bike_type } = item.conditions;
  if (gears && profile.gears && gears !== profile.gears) return false;
  if (electric === 'yes' && profile.electric === false) return false;
  if (bike_type && profile.bikeType && bike_type !== profile.bikeType) return false;
  return true;
}

/** The Priser page's bike filter: label → which rows it shows. */
export const PRICE_FILTERS: { label: string; rows: () => PriceItem[] }[] = [
  { label: 'Visa utan filter', rows: () => PRICE_LIST },
  ...(
    [
      ['Elcykel', { electric: true }],
      ['Lådcykel', { bikeType: 'cargo' }],
      ['Utanpåliggande växel', { gears: 'external', electric: false, bikeType: 'standard' }],
      ['Racer / landsvägscykel', { gears: 'external', electric: false, bikeType: 'racer' }],
      ['Navväxlad cykel (ett kugg bak)', { gears: 'hub', electric: false, bikeType: 'standard' }],
    ] as [string, BikeProfile][]
  ).map(([label, profile]) => ({
    label,
    rows: () => PRICE_LIST.filter((item) => !item.conditions.item && fitsProfile(item, profile)),
  })),
  { label: 'Barnvagn', rows: () => pricesFor('trolley', null) },
  { label: 'Lös del', rows: () => pricesFor('part', null) },
  { label: 'Övrigt', rows: () => pricesFor('other', null) },
];

/**
 * The price rows that apply to what the photo shows. Nothing known yet → every
 * row. Bike: rows for other items (pram, loose part) are hidden, and a known
 * bike also hides rows whose bike conditions don't fit. Part conditions (brake
 * type, side, loose wheel …) are always shown; the mechanic or AI picks.
 */
export function pricesFor(kind: ItemKind | null, bike: BikeData['bike'] | null): PriceItem[] {
  const effectiveKind = kind ?? (bike ? 'bike' : null);
  if (!effectiveKind) return PRICE_LIST;
  switch (effectiveKind) {
    case 'trolley':
      return PRICE_LIST.filter((item) => item.conditions.item === 'trolley');
    case 'other':
      return PRICE_LIST.filter((item) => item.partId === 'other');
    case 'part':
      return PRICE_LIST.filter(
        (item) =>
          !item.conditions.item &&
          (item.conditions.mounting === 'loose' ||
            !BIKE_CONDITIONS.some((key) => key in item.conditions))
      );
    case 'bike':
      return PRICE_LIST.filter(
        (item) => !item.conditions.item && (!bike || fitsBike(item, bike))
      );
  }
}

/**
 * Price rows in the Servicetyp;Beskrivning;Pris;Produkter format the AI prompts
 * use. Produkter: "nej" = no products, "ja" = free suggestions, otherwise the
 * row's standard products ("2 st Schwalbe Marathon | ...").
 */
export function priceCsvFor(items: PriceItem[]): string {
  const productsCell = (item: PriceItem) => {
    if (!item.hasProduct) return 'nej';
    if (item.standardProducts.length === 0) return 'ja';
    return item.standardProducts
      .map((p) => {
        const notes = [
          ...(p.price !== undefined ? [`fast pris ${p.price} kr`] : []),
          p.auto ? 'läggs till automatiskt' : 'bara vid behov',
        ];
        return `${p.quantity} st ${p.name} (${notes.join(', ')})`;
      })
      .join(' | ');
  };
  return [
    'Servicetyp;Beskrivning;Pris;Produkter',
    ...items.map((item) => `${item.category};${item.title};${item.price};${productsCell(item)}`),
  ].join('\n');
}

const standardProduct = (std: StandardProduct): Product => ({
  id: uid(),
  name: std.name,
  price: std.price ?? 0,
  quantity: std.quantity > 1 ? std.quantity : undefined,
});

/**
 * The inspection checklist ids a row fixes, from its part (or nearest ancestor
 * with any). Side-tagged ids need the row's side: "fram+bak" takes both, no
 * side takes none rather than guess.
 */
function inspectionItemIdsFor(item: PriceItem): string[] {
  let part = item.partId ? PART_BY_ID.get(item.partId) : undefined;
  while (part && part.inspectionItems.length === 0 && part.parentId) {
    part = PART_BY_ID.get(part.parentId);
  }
  if (!part) return [];
  const position = item.conditions.position;
  return part.inspectionItems
    .filter(({ side }) => !side || side === position || position === 'both')
    .map(({ id }) => id);
}

const autoProducts = (item: PriceItem) => item.standardProducts.filter((p) => p.auto).map(standardProduct);

/** A new task for a price row picked by hand; its auto standard products come along. */
export function taskFromPriceItem(item: PriceItem): Task {
  return {
    id: uid(),
    title: item.title,
    category: item.category,
    price: item.price,
    partId: item.partId,
    inspectionItemIds: inspectionItemIdsFor(item),
    products: autoProducts(item),
  };
}

/**
 * Enforces the price model on an AI-made task: the row's price, label and part;
 * no products when has_product is false; auto standard products are always
 * added, and suggestions matching a standard product get its fixed price (and
 * its quantity, unless the AI set one). Inspection ids the AI didn't give come
 * from the part.
 */
export function applyProductRules(task: Task): Task {
  const item = PRICE_BY_TITLE.get(task.title);
  if (!item) return task;
  const base: Task = {
    ...task,
    category: item.category,
    price: item.price,
    partId: item.partId,
    inspectionItemIds: task.inspectionItemIds?.length
      ? task.inspectionItemIds
      : inspectionItemIdsFor(item),
  };
  if (!item.hasProduct) return { ...base, products: [] };
  const standard = item.standardProducts;
  if (standard.length === 0) return base;

  // Catalogue names vary ("Däck Schwalbe Marathon 42-622 svart"), so every word
  // of the standard name must appear in the product name.
  const words = (text: string) => text.toLowerCase().split(/[^a-z0-9åäö]+/).filter(Boolean);
  const match = (name: string) => {
    const nameWords = new Set(words(name));
    // Most specific first, so "Marathon Plus" wins over "Marathon".
    return [...standard]
      .sort((x, y) => words(y.name).length - words(x.name).length)
      .find((p) => words(p.name).every((w) => nameWords.has(w)));
  };
  const products = task.products.flatMap((product) => {
    const std = match(product.name);
    if (!std) return [product];
    // The auto ones are added below, so the AI's copy is dropped.
    if (std.auto) return [];
    return [
      {
        ...product,
        quantity: product.quantity ?? (std.quantity > 1 ? std.quantity : undefined),
        price: std.price ?? product.price,
      },
    ];
  });
  return { ...base, products: [...autoProducts(item), ...products] };
}
