import { BikeData } from './bikeAnalysis';
import { PRICE_CSV } from './priceCsv';
import { ItemKind, PriceItem } from './types';

// Columns: section, Servicetyp, Beskrivning, Pris, bikeType, EAN. No field is quoted.
export const PRICE_LIST: PriceItem[] = PRICE_CSV.split('\n')
  .slice(1)
  .map((line) => line.split(','))
  .filter((parts) => parts.length === 6 && !Number.isNaN(Number(parts[3])))
  .map(([, category, title, price, bikeType]) => ({
    category: category.trim(),
    title: title.trim(),
    price: Number(price),
    bikeType: bikeType.trim(),
  }));

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

/** Price rows in the Servicetyp;Beskrivning;Pris format the AI prompts use. */
export function priceCsvFor(items: PriceItem[]): string {
  return [
    'Servicetyp;Beskrivning;Pris',
    ...items.map((item) => `${item.category};${item.title};${item.price}`),
  ].join('\n');
}
