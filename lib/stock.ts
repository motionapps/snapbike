export type StockItem = {
  articleNumber: string;
  ean: string;
  name: string;
  sellPrice: number;
  stock: number;
  supplier: string;
};

type RawItem = {
  articleNumber?: string | number;
  ean?: string | number;
  name?: string;
  sellPrice?: number;
  stock?: number;
  supplier?: string;
};

let items: StockItem[] | null = null;

/**
 * En del artikelnamn i källdatat är dubbel-kodade (UTF-8 läst som Latin-1),
 * t.ex. "DÃ¤ck" i stället för "Däck". Reparerar de vanliga svenska fallen.
 */
const MOJIBAKE: [RegExp, string][] = [
  [/Ã¥/g, 'å'],
  [/Ã¤/g, 'ä'],
  [/Ã¶/g, 'ö'],
  [/Ã…/g, 'Å'],
  [/Ã„/g, 'Ä'],
  [/Ã–/g, 'Ö'],
  [/Ã©/g, 'é'],
  [/Ã¼/g, 'ü'],
];

function fixEncoding(name: string): string {
  let fixed = name;
  for (const [pattern, replacement] of MOJIBAKE) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
}

/**
 * Lagerlistan blandar svenska och engelska produktnamn (Shimano skriver
 * "Kedja", SRAM/CSN skriver "Chain"). Sökningen expanderar därför varje
 * sökord med kända motsvarigheter åt båda hållen.
 */
const SYNONYMS: Record<string, string[]> = {
  kedja: ['chain'],
  chain: ['kedja'],
  däck: ['tyre', 'tire'],
  tyre: ['däck', 'tire'],
  tire: ['däck', 'tyre'],
  slang: ['tube'],
  tube: ['slang'],
  fälg: ['rim'],
  rim: ['fälg'],
  nav: ['hub'],
  hub: ['nav'],
  broms: ['brake'],
  brake: ['broms'],
  bromsbelägg: ['pad', 'pads', 'skivbromsbelägg', 'bromskloss'],
  belägg: ['pad', 'pads'],
  bakväxel: ['derailleur', 'växel'],
  växel: ['derailleur', 'shifter'],
  derailleur: ['bakväxel', 'växel'],
  kassett: ['cassette'],
  cassette: ['kassett'],
  styre: ['handlebar'],
  handlebar: ['styre'],
  sadel: ['saddle'],
  saddle: ['sadel'],
  pedaler: ['pedal', 'pedals'],
  pedal: ['pedals', 'pedaler'],
  vevlager: ['bottom bracket', 'bb'],
  vevparti: ['crankset', 'crank'],
  klinga: ['chainring'],
  klingor: ['chainring'],
  ekrar: ['spokes', 'eker'],
  eker: ['spokes', 'spoke'],
  vajer: ['cable', 'wire'],
  hölje: ['housing'],
  headset: ['styrlager'],
  styrlager: ['headset'],
};

/**
 * Laddar lagerlistan (cykel_o_natur_alla_artiklar.json, ~67 000 artiklar)
 * först när den behövs – JSON:en är stor och ska inte parsas vid appstart.
 */
function loadStock(): StockItem[] {
  if (!items) {
    const raw = require('../cykel_o_natur_alla_artiklar.json') as {
      mappedItems: RawItem[];
    };
    items = raw.mappedItems
      .filter((item) => item.name)
      .map((item) => ({
        articleNumber: String(item.articleNumber ?? ''),
        ean: String(item.ean ?? ''),
        // Vissa namn har en inbakad BOM från käll-CSV:n.
        name: fixEncoding(String(item.name).replace(/\uFEFF/g, '').trim()),
        sellPrice: Number(item.sellPrice) || 0,
        stock: Number(item.stock) || 0,
        supplier: String(item.supplier ?? ''),
      }));
  }
  return items;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[/,()"-]/g, ' ');
}

/** Alla varianter av ett sökord: ordet självt, synonymer och enkel stam. */
function variants(token: string): string[] {
  const list = [token, ...(SYNONYMS[token] ?? [])];
  if (token.length > 5 && /(ar|er|or|en)$/.test(token)) {
    list.push(token.slice(0, -2));
  }
  return list;
}

/**
 * Enkel tokenbaserad sökning i lagerlistan. Poängsätter på hur många av
 * sökorden (eller deras synonymer) som förekommer i artikelnamnet och lyfter
 * varor som finns i lager och har pris. Minst hälften av sökorden måste träffa.
 */
export function searchStock(query: string, limit = 12): StockItem[] {
  const tokens = normalize(query)
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .map((token) => variants(token));
  if (tokens.length === 0) return [];

  const minMatches = Math.ceil(tokens.length / 2);
  const scored: { item: StockItem; score: number }[] = [];

  for (const item of loadStock()) {
    const name = ` ${normalize(item.name)} `;
    let matches = 0;
    let score = 0;
    for (const tokenVariants of tokens) {
      const hit = tokenVariants.find((variant) => name.includes(variant));
      if (hit) {
        matches++;
        score += tokenVariants[0].length;
        if (name.includes(` ${hit} `)) score += 2;
      }
    }
    if (matches < minMatches) continue;
    score = score * (matches / tokens.length);
    if (matches === tokens.length) score += 8;
    if (item.stock > 0) score += 5;
    if (item.sellPrice > 0) score += 2;
    scored.push({ item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
