/**
 * Illustrative product photos for workshop tasks and inspection items.
 *
 * Each image is a real product from the Bikeoffice product search, served from
 * the supplier image host. A task title is matched against JOB_RULES in order
 * (most specific first); the first hit decides the picture.
 */
const IMAGE_HOST = 'https://techlara.se/supplier_images/';

const IMAGES = {
  lock: 'merida_images/6010010_1.webp',
  headset: 'boove_images/WTECZS56L-G2-L-BLK-B_1.webp',
  chain: 'bosch_images/2123490_1.webp',
  pedals: 'duell_images/47-143_1.webp',
  tyre: 'shimano_images/11A00671_1.webp',
  rearTyre: 'csn_images/3528707664242_1.webp',
  studTyre: 'duell_images/0150091_1.webp',
  tube: 'duell_images/0182171_1.webp',
  tubeless: 'unicykel_images/FL2082501_1.webp',
  rim: 'unicykel_images/EL101910ROF_1.webp',
  rearRim: 'unicykel_images/W10224_1.webp',
  wheel: 'duell_images/59295_1.webp',
  spoke: 'duell_images/GNLE1427200ZOI_1.webp',
  hub: 'csn_images/710845884597_1.webp',
  rearHub: 'shimano_images/EFHM8110BC_1.webp',
  quickRelease: 'csn_images/840840013033_1.webp',
  thruAxle: 'shimano_images/EAXMT70014812_1.webp',
  hubGear: 'hartje_images/03455169_1.webp',
  discPads: 'hartje_images/03171824_1.webp',
  rimPads: 'hartje_images/07172596_1.webp',
  brakeCable: 'hartje_images/03079043_1.webp',
  bleed: 'boove_images/BK-80010_1.webp',
  caliper: 'hartje_images/08171910_1.webp',
  rearCaliper: 'shimano_images/EBRMT410MPRXL_1.webp',
  rotor: 'shimano_images/ESMRT66SSP_1.webp',
  cassette: 'hartje_images/07370778_1.webp',
  derailleur: 'sportimport_images/406100194_1.webp',
  frontDerailleur: 'trek_images/5297047OEM_1.webp',
  shifter: 'shimano_images/ISLU800011IRAP_1.webp',
  shiftCable: 'trek_images/566869_1.webp',
  hanger: 'duell_images/GH-218_1.webp',
  pulleys: 'csn_images/710845604171_1.webp',
  bottomBracket: 'hartje_images/08338840_1.webp',
  crankset: 'unicykel_images/EFC4700DX04_1.webp',
  crankArm: 'shimano_images/Y0KW98070_1.webp',
  chainring: 'shimano_images/ISMCRM91A4_1.webp',
  handlebar: 'hartje_images/03164977_1.webp',
  dropBar: 'hartje_images/08164452_1.webp',
  barTape: 'csn_images/8021890579652_1.webp',
  grips: 'unicykel_images/CSG6SS0A01000_1.webp',
  stem: 'sportimport_images/704000015_1.webp',
  saddle: 'duell_images/42-109_1.webp',
  dropperPost: 'hartje_images/07289649_1.webp',
  display: 'bosch_images/2100593_1.webp',
  ebikeMotor: 'bosch_images/2123062_1.webp',
  frontLight: 'unicykel_images/1-LED-25F-V337_1.webp',
  dynamoLight: 'bosch_images/2124346_1.webp',
  mudguard: 'trek_images/5332869_1.webp',
  kickstand: 'hartje_images/03402901_1.webp',
  rack: 'unicykel_images/6120003_1.webp',
  basket: 'hoj24_images/18-827-02_1.webp',
  childSeat: 'duell_images/8408300002_1.webp',
  chainGuard: 'hartje_images/03350667_1.webp',
  skirtGuard: 'hoj24_images/18-621-09_1.webp',
  chainLube: 'shimano_images/MOT310216_1.webp',
  fork: 'hartje_images/08052938_1.webp',
  frame: 'trek_images/5321427_1.webp',
  threadInsert: 'csn_images/3838909165516_1.webp',
  tools: 'duell_images/62467_1.webp',
} as const;

type ImageKey = keyof typeof IMAGES;

/** Swedish keywords in task titles → picture. Order matters: specific before generic. */
const JOB_RULES: [RegExp, ImageKey][] = [
  [/\blås\b/, 'lock'],
  [/dubbdäck/, 'studTyre'],
  [/tubeless/, 'tubeless'],
  [/byte bakhjul/, 'wheel'],
  [/punktering|\bslang/, 'tube'],
  [/däck/, 'tyre'],
  [/styrlager|headset/, 'headset'],
  [/styrlinda/, 'barTape'],
  [/styrstam/, 'stem'],
  [/styre - racer|intern dragning och hydraulik/, 'dropBar'],
  [/styre/, 'handlebar'],
  [/växel-\/bromsreglage|växelreglage/, 'shifter'],
  [/bromsklossar|fälgbroms\)/, 'rimPads'],
  [/bromsbelägg/, 'discPads'],
  [/bromsvajer/, 'brakeCable'],
  [/luftning|hydraulslang/, 'bleed'],
  [/bromsskiva/, 'rotor'],
  [/(?<!fot)broms/, 'caliper'],
  [/handtag/, 'grips'],
  [/display/, 'display'],
  [/elcykel|eldrift/, 'ebikeMotor'],
  [/kjolskydd/, 'skirtGuard'],
  [/kedjeskydd/, 'chainGuard'],
  [/olja kedja/, 'chainLube'],
  [/vevparti|drivlina/, 'crankset'],
  [/rulltrissor/, 'pulleys'],
  [/vevarm/, 'crankArm'],
  [/vevlager/, 'bottomBracket'],
  [/framdrev|klinga|klingor/, 'chainring'],
  [/kedja/, 'chain'],
  [/kassett|krans/, 'cassette'],
  [/pedal/, 'pedals'],
  [/dropper/, 'dropperPost'],
  [/sadel/, 'saddle'],
  [/navväxel|navvxl|navinsats|nexus/, 'hubGear'],
  [/växelöra/, 'hanger'],
  [/växelvajer|växelwire|vajr/, 'shiftCable'],
  [/bakväxel/, 'derailleur'],
  [/framväxel/, 'frontDerailleur'],
  [/växel/, 'derailleur'],
  [/ekrar/, 'spoke'],
  [/snabbkoppling/, 'quickRelease'],
  [/thru-axel/, 'thruAxle'],
  [/baknav/, 'rearHub'],
  [/hjullager|body|\bnav\b|framnav/, 'hub'],
  [/gaffel|bakdämpare|\bram\b/, 'fork'],
  [/hjul/, 'wheel'],
  [/fälg/, 'rim'],
  [/dynamo|belysning/, 'dynamoLight'],
  [/lampa/, 'frontLight'],
  [/stänkskärm/, 'mudguard'],
  [/stöd/, 'kickstand'],
  [/pakethållare|tillbehör/, 'rack'],
  [/korg/, 'basket'],
  [/barnstol/, 'childSeat'],
  [/gänginsats|gänginstats/, 'threadInsert'],
];

/** Price model part (assets/price-model/parts.csv) → picture. Parts left out use the title. */
const PART_IMAGES: Record<string, ImageKey> = {
  wheel: 'wheel',
  tire: 'tyre',
  tubeless: 'tubeless',
  tube: 'tube',
  spokes: 'spoke',
  hub: 'hub',
  brake: 'caliper',
  brake_disc: 'rotor',
  brake_cable: 'brakeCable',
  brake_lever: 'caliper',
  drivetrain: 'crankset',
  chain: 'chain',
  cassette: 'cassette',
  jockey_wheels: 'pulleys',
  chainring: 'chainring',
  crankset: 'crankset',
  crank_arm: 'crankArm',
  bottom_bracket: 'bottomBracket',
  pedals: 'pedals',
  derailleur: 'derailleur',
  derailleur_hanger: 'hanger',
  hub_gear: 'hubGear',
  shifter: 'shifter',
  shift_cable: 'shiftCable',
  cockpit: 'handlebar',
  handlebar: 'handlebar',
  bar_tape: 'barTape',
  stem: 'stem',
  headset: 'headset',
  grips: 'grips',
  frame: 'frame',
  saddle: 'saddle',
  kickstand: 'kickstand',
  accessories: 'rack',
  fender: 'mudguard',
  rack: 'rack',
  light: 'frontLight',
  chain_guard: 'chainGuard',
  skirt_guard: 'skirtGuard',
  basket: 'basket',
  child_seat: 'childSeat',
  lock: 'lock',
  electric: 'ebikeMotor',
  display: 'display',
};

/**
 * The picture for a task: its price model part when known (brake pads are left
 * to the title, which tells disc from rim), otherwise the title, falling back
 * to a tool kit.
 */
export function taskImageUrl(title: string, partId?: string): string {
  const partKey = partId ? PART_IMAGES[partId] : undefined;
  if (partKey) return IMAGE_HOST + IMAGES[partKey];
  const text = title.toLowerCase();
  const hit = JOB_RULES.find(([pattern]) => pattern.test(text));
  return IMAGE_HOST + IMAGES[hit ? hit[1] : 'tools'];
}

/**
 * One picture per inspection item, keyed by item id. Every item has its own
 * picture (front and rear parts included), so no two cards look the same.
 */
const INSPECTION_IMAGES: Record<string, ImageKey> = {
  'ground-headset': 'headset',
  'rear-tire': 'rearTyre',
  'rear-rim': 'rearRim',
  'rear-hub': 'rearHub',
  'rear-axle': 'thruAxle',
  'rear-brake': 'rearCaliper',
  'drive-cassette': 'cassette',
  'drive-chain': 'chain',
  'drive-derailleur': 'derailleur',
  'drive-bb': 'bottomBracket',
  'drive-chainrings': 'chainring',
  'drive-pedals': 'pedals',
  'mid-cables': 'shiftCable',
  'mid-hoses': 'bleed',
  'mid-frame': 'frame',
  'mid-stem': 'stem',
  'mid-bartape': 'barTape',
  'mid-saddle': 'saddle',
  'mid-accessories': 'rack',
  'mid-kickstand': 'kickstand',
  'front-tire': 'tyre',
  'front-rim': 'rim',
  'front-hub': 'hub',
  'front-axle': 'quickRelease',
  'front-brake': 'caliper',
  'extra-suspension': 'fork',
  'extra-dropper': 'dropperPost',
};

/** The picture for an inspection item, falling back to its title match. */
export function inspectionImageUrl(itemId: string, title: string): string {
  const key = INSPECTION_IMAGES[itemId];
  return key ? IMAGE_HOST + IMAGES[key] : taskImageUrl(title);
}

/** The picture on a category chip: a top part id, or 'packages' / 'add_ons'. */
export function categoryImageUrl(id: string): string {
  if (id === 'packages') return IMAGE_HOST + IMAGES.chainLube;
  const key = PART_IMAGES[id];
  return IMAGE_HOST + IMAGES[key ?? 'tools'];
}
