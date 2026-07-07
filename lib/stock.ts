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
 * Poängsätter en lista mot sökorden. Returnerar sorterade träffar och om
 * någon artikel var en FULLTRÄFF (matchade samtliga sökord) – det senare
 * avgör om kassan "täcker" sökningen eller om vi måste beställa.
 */
function scoreList(
  list: StockItem[],
  tokens: string[][],
  minMatches: number,
  stockBonus = 0
): { results: StockItem[]; hasFullMatch: boolean } {
  const scored: { item: StockItem; score: number }[] = [];
  let hasFullMatch = false;
  for (const item of list) {
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
    if (matches === tokens.length) {
      hasFullMatch = true;
      score += 8;
    }
    score = score * (matches / tokens.length);
    if (item.sellPrice > 0) score += 2;
    // Lager-bonus lyfter varor vi har hemma vid ungefär lika relevans, men
    // låter en betydligt starkare katalogträff (t.ex. rätt GP5000) gå före.
    if (item.stock > 0) score += stockBonus;
    scored.push({ item, score });
  }
  return {
    results: scored.sort((a, b) => b.score - a.score).map((e) => e.item),
    hasFullMatch,
  };
}

/**
 * Tvåstegssökning: butikens kassa (~1500 lagerförda artiklar) i FÖRSTA hand,
 * och först när vi INTE har varan i lager fylls resten på med beställningsvaror
 * ur hela katalogen (~67 000). "Har i lager" = minst en lagervara är fullträff
 * på alla sökord; då visas bara lagervaror. Annars kompletteras med bästa
 * beställningsvarorna (lager 0) så att t.ex. ett specifikt GP5000 kan föreslås
 * även om det inte finns hemma. Minst hälften av sökorden (eller deras
 * synonymer) måste förekomma i artikelnamnet.
 */
export function searchStock(query: string, limit = 12): StockItem[] {
  const tokens = normalize(query)
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .map((token) => variants(token));
  if (tokens.length === 0) return [];

  const minMatches = Math.ceil(tokens.length / 2);
  const all = loadStock();

  const inStock = scoreList(
    all.filter((item) => item.stock > 0),
    tokens,
    minMatches
  );

  // Har vi en riktig träff i kassan? Visa bara lagervaror.
  if (inStock.hasFullMatch) {
    return inStock.results.slice(0, limit);
  }

  // Annars: sök hela katalogen (lagervaror + beställningsvaror) med lager-bonus,
  // så att en specifik vara vi inte har hemma (t.ex. rätt GP5000) kan föreslås
  // som beställningsvara utan att svaga lagervaror tränger undan den.
  return scoreList(all, tokens, minMatches, 5).results.slice(0, limit);
}
