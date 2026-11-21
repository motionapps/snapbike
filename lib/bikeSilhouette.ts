import type { BikeData } from './bikeAnalysis';

export type SilhouetteVariant = 'cassette' | 'hub';

export const SILHOUETTE_IMAGES = {
  cassette: require('../assets/silhouettes/bike-cassette.png'),
  hub: require('../assets/silhouettes/bike-hub.png'),
} as const;

/** Silhouette image aspect ratio (width / height). */
export const SILHOUETTE_ASPECT = 1000 / 600;

/** Hub gears get the hub silhouette; everything else (or unknown) gets the cassette. */
export function silhouetteVariant(bike: BikeData | null): SilhouetteVariant {
  return bike?.bike.gears.back === 'hub' ? 'hub' : 'cassette';
}

type Point = { x: number; y: number };

/**
 * Marker position per inspection item id, in the silhouette's 1000x600
 * coordinates (see scripts/generate-silhouettes.js).
 */
const POSITIONS: Record<string, Point> = {
  'ground-headset': { x: 708, y: 232 },
  'rear-tire': { x: 250, y: 240 },
  'rear-rim': { x: 110, y: 400 },
  'rear-hub': { x: 225, y: 385 },
  'rear-axle': { x: 205, y: 425 },
  'rear-brake': { x: 305, y: 255 },
  'drive-cassette': { x: 272, y: 405 },
  'drive-chain': { x: 360, y: 470 },
  'drive-derailleur': { x: 265, y: 478 },
  'drive-bb': { x: 470, y: 420 },
  'drive-chainrings': { x: 505, y: 395 },
  'drive-pedals': { x: 532, y: 484 },
  'mid-cables': { x: 560, y: 205 },
  'mid-hoses': { x: 600, y: 335 },
  'mid-frame': { x: 445, y: 320 },
  'mid-stem': { x: 690, y: 152 },
  'mid-saddle': { x: 400, y: 150 },
  'mid-accessories': { x: 750, y: 175 },
  'mid-kickstand': { x: 422, y: 525 },
  'front-tire': { x: 760, y: 240 },
  'front-rim': { x: 900, y: 400 },
  'front-hub': { x: 760, y: 400 },
  'front-axle': { x: 792, y: 425 },
  'front-brake': { x: 736, y: 250 },
  'extra-suspension': { x: 738, y: 330 },
  'extra-dropper': { x: 412, y: 182 },
};

/** Hub bikes have no derailleur or cassette: put those on the rear hub. */
const HUB_OVERRIDES: Record<string, Point> = {
  'drive-cassette': { x: 262, y: 410 },
  'drive-derailleur': { x: 262, y: 410 },
};

/** Marker position as percentages of the image, or null if the item has no spot. */
export function markerPosition(
  itemId: string,
  variant: SilhouetteVariant
): { left: `${number}%`; top: `${number}%` } | null {
  const point = (variant === 'hub' && HUB_OVERRIDES[itemId]) || POSITIONS[itemId];
  if (!point) return null;
  return { left: `${point.x / 10}%`, top: `${(point.y / 600) * 100}%` };
}
