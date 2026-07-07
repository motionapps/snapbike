export type InspectionStatus = 'ok' | 'issue' | 'skip';

export type InspectionItem = {
  id: string;
  title: string;
  hint: string;
};

export type InspectionSection = {
  key: string;
  title: string;
  /** Kort etikett för kompakta vyer (chips i besiktningsguiden). */
  short: string;
  icon: string;
  items: InspectionItem[];
};

/**
 * Verkstadens besiktningsmall. Headset kontrolleras på marken innan cykeln
 * lyfts upp i stativet; därefter gås cykeln igenom Bak → Fram med kunden
 * på plats. Bromsfunktion kan testas även med cykeln upphängd.
 */
export const INSPECTION_TEMPLATE: InspectionSection[] = [
  {
    key: 'ground',
    short: 'Marken',
    title: 'På marken – innan cykeln lyfts',
    icon: 'bicycle-outline',
    items: [
      { id: 'ground-headset', title: 'Headset', hint: 'glapp/tröghet' },
    ],
  },
  {
    key: 'rear',
    short: 'Bak',
    title: 'Bakre delen',
    icon: 'arrow-back-circle-outline',
    items: [
      { id: 'rear-tire', title: 'Däck', hint: 'tryck, mönster, skador' },
      { id: 'rear-rim', title: 'Fälg', hint: 'rakhet' },
      { id: 'rear-hub', title: 'Nav', hint: 'glapp, hack' },
      { id: 'rear-axle', title: 'Snabbkoppling/thru-axel', hint: 'åtdragen' },
      {
        id: 'rear-brake',
        title: 'Broms bak',
        hint: 'belägg, skiva/fälg, vajer/slang, funktion',
      },
    ],
  },
  {
    key: 'drivetrain',
    short: 'Drivlina',
    title: 'Drivlina',
    icon: 'cog-outline',
    items: [
      { id: 'drive-cassette', title: 'Kassett', hint: 'slitage' },
      { id: 'drive-chain', title: 'Kedja', hint: 'mät slitage' },
      {
        id: 'drive-derailleur',
        title: 'Bakväxel',
        hint: 'glapp, växelöra, funktion',
      },
      { id: 'drive-bb', title: 'Vevlager', hint: 'glapp' },
      { id: 'drive-chainrings', title: 'Klingor', hint: 'slitage' },
      { id: 'drive-pedals', title: 'Pedaler', hint: 'glapp, snurr' },
    ],
  },
  {
    key: 'mid',
    short: 'Ram',
    title: 'Mitten / Ram',
    icon: 'git-commit-outline',
    items: [
      { id: 'mid-cables', title: 'Vajrar & höljen', hint: 'skick' },
      { id: 'mid-hoses', title: 'Hydraulslangar', hint: 'läckage/skador' },
      { id: 'mid-frame', title: 'Ram & gaffel', hint: 'sprickor, bucklor' },
      { id: 'mid-stem', title: 'Styre & styrstam', hint: 'riktning, bultar' },
      {
        id: 'mid-saddle',
        title: 'Sadel & sadelstolpe',
        hint: 'höjd, lutning, fastsättning',
      },
      { id: 'mid-accessories', title: 'Tillbehör', hint: 'sitter fast' },
      { id: 'mid-kickstand', title: 'Stöd', hint: 'fjädring, rörlighet' },
    ],
  },
  {
    key: 'front',
    short: 'Fram',
    title: 'Främre delen',
    icon: 'arrow-forward-circle-outline',
    items: [
      { id: 'front-tire', title: 'Däck', hint: 'tryck, mönster, skador' },
      { id: 'front-rim', title: 'Fälg', hint: 'rakhet' },
      { id: 'front-hub', title: 'Nav', hint: 'glapp, hack' },
      { id: 'front-axle', title: 'Snabbkoppling/thru-axel', hint: 'åtdragen' },
      {
        id: 'front-brake',
        title: 'Broms fram',
        hint: 'belägg, skiva/fälg, vajer/slang, funktion',
      },
    ],
  },
  {
    key: 'extra',
    short: 'Extra',
    title: 'Extra (om finns)',
    icon: 'options-outline',
    items: [
      {
        id: 'extra-suspension',
        title: 'Framgaffel/bakdämpare',
        hint: 'läckage, funktion',
      },
      { id: 'extra-dropper', title: 'Dropper post', hint: 'funktion, retur' },
    ],
  },
];

export type InspectionResult = {
  status: InspectionStatus;
  note: string;
};

export type InspectionState = Record<string, InspectionResult>;

export const INSPECTION_ITEM_COUNT = INSPECTION_TEMPLATE.reduce(
  (sum, section) => sum + section.items.length,
  0
);

/** All issues in template order, with section/item titles for display. */
export function inspectionIssues(
  state: InspectionState
): { section: string; title: string; note: string }[] {
  const issues: { section: string; title: string; note: string }[] = [];
  for (const section of INSPECTION_TEMPLATE) {
    for (const item of section.items) {
      const result = state[item.id];
      if (result?.status === 'issue') {
        issues.push({
          section: section.title,
          title: item.title,
          note: result.note.trim(),
        });
      }
    }
  }
  return issues;
}

// --- Live-matchning medan man pratar (lokalt, utan API) -------------------

/** Nyckelord per kontrollpunkt. Fram/bak-punkter kräver riktningsord. */
const ITEM_KEYWORDS: Record<string, { words: string[]; needsSide?: 'fram' | 'bak' }> = {
  'ground-headset': { words: ['headset', 'styrlag'] },
  'rear-tire': { words: ['däck', 'punktering', 'punka', 'slang', 'ringen'], needsSide: 'bak' },
  'rear-rim': { words: ['fälg', 'hjul'], needsSide: 'bak' },
  'rear-hub': { words: ['nav'], needsSide: 'bak' },
  'rear-axle': { words: ['snabbkoppling', 'thru', 'genomgående axel'], needsSide: 'bak' },
  'rear-brake': { words: ['broms', 'bromsbelägg', 'bromsklossar', 'bromsskiva'], needsSide: 'bak' },
  'drive-cassette': { words: ['kassett', 'drev', 'frikrans'] },
  'drive-chain': { words: ['kedja', 'kedjan'] },
  'drive-derailleur': { words: ['bakväxel', 'växeln', 'växelöra', 'växlar'] },
  'drive-bb': { words: ['vevlag', 'vevpart'] },
  'drive-chainrings': { words: ['kling', 'framdrev'] },
  'drive-pedals': { words: ['pedal', 'pedaler'] },
  'mid-cables': { words: ['vajrar', 'vajer', 'hölj'] },
  'mid-hoses': { words: ['hydraulslang', 'slangar', 'bromsslang'] },
  'mid-frame': { words: ['ram', 'ramen', 'gaffel', 'gaffeln'] },
  'mid-stem': { words: ['styre', 'styrstam', 'stam'] },
  'mid-saddle': { words: ['sadel', 'sadeln', 'sadelstolpe'] },
  'mid-accessories': { words: ['tillbehör', 'stänkskärm', 'pakethållare', 'ringklocka'] },
  'mid-kickstand': { words: ['stöd', 'ställ', 'benstöd'] },
  'front-tire': { words: ['däck', 'punktering', 'punka', 'slang', 'ringen'], needsSide: 'fram' },
  'front-rim': { words: ['fälg', 'hjul'], needsSide: 'fram' },
  'front-hub': { words: ['nav'], needsSide: 'fram' },
  'front-axle': { words: ['snabbkoppling', 'thru', 'genomgående axel'], needsSide: 'fram' },
  'front-brake': { words: ['broms', 'bromsbelägg', 'bromsklossar', 'bromsskiva'], needsSide: 'fram' },
  'extra-suspension': { words: ['framgaffel', 'bakdämpare', 'dämpare', 'fjädring'] },
  'extra-dropper': { words: ['dropper', 'teleskopstolpe'] },
};

const ISSUE_CUES = [
  'glapp', 'glappar', 'trasig', 'trasigt', 'byt', 'byta', 'byte', 'sliten',
  'slitet', 'slitna', 'punktering', 'punka', 'läck', 'skev', 'rikta', 'riktas',
  'dålig', 'dåligt', 'behöver', 'kärvar', 'gnissl', 'sprick', 'bucklig', 'bucklor',
  'lös', 'löst', 'saknas', 'går inte', 'funkar inte', 'trög', 'skad',
];

const OK_CUES = [
  'fin', 'fint', 'fina', 'bra', 'okej', 'hel', 'helt', 'inga', 'ingen anmärkning',
];

const FRONT_WORDS = ['fram', 'främre', 'framhjul', 'framdäck', 'frambroms', 'framnav'];
const BACK_WORDS = ['bak', 'bakre', 'bakhjul', 'bakdäck', 'bakbroms', 'baknav'];

/**
 * Snabb lokal gissning: vilka kontrollpunkter en talad fras handlar om och om
 * de verkar OK eller ha en anmärkning. Används för live-avbockning medan
 * mekanikern pratar; AI:n gör sedan en exakt slutkontroll. Fram/bak-punkter
 * matchas bara om frasen nämner riktning.
 */
export function matchInspectionPhrase(
  phrase: string
): { itemId: string; status: InspectionStatus; note: string }[] {
  const p = ` ${phrase.toLowerCase()} `;
  // Ord för ord, så korta nyckelord (ram/nav) inte matchar inuti andra ord
  // (t.ex. "ram" i "fram"). Långa nyckelord (>=4) tillåts som delsträng i
  // ett ord för att fånga svenska sammansättningar ("däck" i "framdäcket").
  const words = p.split(/[^a-zåäö]+/).filter(Boolean);
  const wordHit = (kw: string) =>
    kw.length >= 4
      ? words.some((w) => w.includes(kw))
      : words.some((w) => w === kw || w.startsWith(kw));

  const hasFront = FRONT_WORDS.some((w) => p.includes(w));
  const hasBack = BACK_WORDS.some((w) => p.includes(w));
  const isIssue = ISSUE_CUES.some((w) => p.includes(w));
  const status: InspectionStatus = isIssue ? 'issue' : 'ok';

  const hits: { itemId: string; status: InspectionStatus; note: string }[] = [];
  for (const [itemId, def] of Object.entries(ITEM_KEYWORDS)) {
    if (!def.words.some(wordHit)) continue;
    if (def.needsSide === 'fram' && !hasFront) continue;
    if (def.needsSide === 'bak' && !hasBack) continue;
    hits.push({ itemId, status, note: isIssue ? phrase.trim() : '' });
  }
  return hits;
}

/** Plain-text summary of the inspection, e.g. to paste into a message. */
export function inspectionSummaryText(state: InspectionState): string {
  const issues = inspectionIssues(state);
  const checked = Object.values(state).filter((r) => r.status !== 'skip').length;
  const lines = [`Besiktning: ${checked} punkter kontrollerade.`];
  if (issues.length === 0) {
    lines.push('Inga anmärkningar.');
  } else {
    lines.push(
      issues.length === 1 ? '1 anmärkning:' : `${issues.length} anmärkningar:`
    );
    for (const issue of issues) {
      lines.push(
        `- ${issue.title} (${issue.section})${issue.note ? `: ${issue.note}` : ''}`
      );
    }
  }
  return lines.join('\n');
}
