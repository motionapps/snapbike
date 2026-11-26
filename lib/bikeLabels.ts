// Swedish display labels for the prototype's English option values.
const LABELS: Record<string, string> = {
  'road bike': 'Racercykel',
  'mountain bike': 'Mountainbike',
  'hybrid bike': 'Hybridcykel',
  'city bike': 'Stadscykel',
  'kids bike': 'Barncykel',
  'cargo bike': 'Lastcykel',
  black: 'Svart', white: 'Vit', red: 'Röd', blue: 'Blå', green: 'Grön',
  yellow: 'Gul', orange: 'Orange', purple: 'Lila', pink: 'Rosa', brown: 'Brun',
  gray: 'Grå', silver: 'Silver', gold: 'Guld', navy: 'Marinblå',
  maroon: 'Vinröd', teal: 'Blågrön', lime: 'Limegrön', cyan: 'Cyan',
  magenta: 'Magenta', beige: 'Beige',
  none: 'Ingen',
  external: 'Utvändig',
  hub: 'Nav',
  'mechanical disc': 'Mekanisk skivbroms',
  'hydraulic disc': 'Hydraulisk skivbroms',
  'roller brake': 'Rullbroms',
  'mechanical rim': 'Fälgbroms',
  'foot brake': 'Fotbroms',
};

/** The Swedish label of a bike option value; unknown values are shown as is. */
export const bikeLabel = (value: string) => LABELS[value] ?? value;
