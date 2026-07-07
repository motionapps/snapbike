export type InspectionStatus = 'ok' | 'issue' | 'skip';

export type InspectionItem = {
  id: string;
  title: string;
  hint: string;
};

export type InspectionSection = {
  key: string;
  title: string;
  icon: string;
  items: InspectionItem[];
};

/**
 * Verkstadens besiktningsmall (Bak → Fram). Speglar dokumentet
 * "Besiktningsmall" – ordningen är tänkt att följas med kunden på plats.
 */
export const INSPECTION_TEMPLATE: InspectionSection[] = [
  {
    key: 'ground',
    title: 'På marken',
    icon: 'bicycle-outline',
    items: [
      { id: 'ground-headset', title: 'Headset', hint: 'glapp/tröghet' },
      { id: 'ground-stem', title: 'Styre & styrstam', hint: 'riktning, bultar' },
      {
        id: 'ground-saddle',
        title: 'Sadel & sadelstolpe',
        hint: 'höjd, lutning, fastsättning',
      },
    ],
  },
  {
    key: 'rear',
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
    title: 'Mitten / Ram',
    icon: 'git-commit-outline',
    items: [
      { id: 'mid-cables', title: 'Vajrar & höljen', hint: 'skick' },
      { id: 'mid-hoses', title: 'Hydraulslangar', hint: 'läckage/skador' },
      { id: 'mid-frame', title: 'Ram & gaffel', hint: 'sprickor, bucklor' },
      { id: 'mid-accessories', title: 'Tillbehör', hint: 'sitter fast' },
      { id: 'mid-kickstand', title: 'Stöd', hint: 'fjädring, rörlighet' },
    ],
  },
  {
    key: 'front',
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
