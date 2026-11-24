import { Platform } from 'react-native';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import {
  INSPECTION_TEMPLATE,
  InspectionState,
  InspectionStatus,
} from '../inspection';
import { applyProductRules, priceCsvFor } from '../prices';
import { SERVICE_GUIDE } from '../servicePackage';
import { searchInStock } from '../inStockCache';
import { searchProducts } from '../productSearch';
import { Task, PriceItem, uid } from '../types';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

/** Sant när en riktig Whisper-nyckel finns (inte tom/platshållare). */
export const hasOpenAiKey = OPENAI_KEY.startsWith('sk-');

/**
 * Sends a recorded audio file to OpenAI gpt-transcribe and returns the Swedish
 * transcript.
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!OPENAI_KEY) {
    throw new Error('EXPO_PUBLIC_OPENAI_API_KEY saknas i .env');
  }

  const form = new FormData();
  if (Platform.OS === 'web') {
    // expo-file-system's File class is native-only; on web the recorder
    // yields a blob: URL that we can read with plain fetch.
    const blob = await (await globalThis.fetch(audioUri)).blob();
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    form.append('file', blob, `recording.${ext}`);
  } else {
    form.append('file', new File(audioUri) as unknown as Blob, 'recording.m4a');
  }
  form.append('model', 'gpt-transcribe');
  // gpt-transcribe takes a `languages` array instead of whisper-1's `language`.
  form.append('languages[]', 'sv');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Transkriberingsfel (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { text: string };
  return json.text;
}

const SEARCH_STOCK_TOOL = {
  name: 'search_stock',
  description:
    'Sök reservdelar: först bland butikens lagervaror, och om inget finns i ' +
    'lager i leverantörernas katalog (beställningsvaror). Returnerar namn, ' +
    'artikelnummer, pris (kr) och lagersaldo (1 = i lager, 0 = beställningsvara). Sök med få, ' +
    'centrala ord (t.ex. "kedja sram force", "gp5000 25", "bromsbelägg shimano"). ' +
    'Gör gärna flera sökningar med olika ord om första inte ger bra träffar.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Sökord, t.ex. produkttyp + märke + modell/dimension.',
      },
    },
    required: ['query'],
  },
};

const JOB_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description:
        'Exakt "Beskrivning" från prislistan för det matchade jobbet.',
    },
    category: {
      type: 'string',
      description: 'Exakt "Servicetyp" från prislistan.',
    },
    price: {
      type: 'number',
      description: 'Exakt "Pris" från prislistan i kr.',
    },
    severity: {
      type: 'string',
      enum: ['kritisk', 'normal'],
      description:
        '"kritisk" om felet gör cykeln trafikfarlig/oanvändbar ' +
        '(måste åtgärdas), annars "normal".',
    },
    products: {
      type: 'array',
      description:
        'Produktförslag för jobbet, från lagersökningarna. Först ' +
        'samma märke/modell som kundens del, därefter 1–2 alternativ.',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Exakt namn från lagerlistan.',
          },
          price: {
            type: 'number',
            description: 'Exakt pris (kr) från lagerlistan, 0 om okänt.',
          },
          articleNumber: {
            type: 'string',
            description: 'Exakt artikelnummer från lagerlistan.',
          },
          stock: {
            type: 'number',
            description: 'Lagersaldo från sökresultatet (1 = i lager, 0 = beställningsvara).',
          },
          quantity: {
            type: 'number',
            description: 'Antal enligt prislistans Produkter-kolumn (t.ex. 2 för "2 st"), annars 1.',
          },
          label: {
            type: 'string',
            enum: ['samma', 'likvärdig', 'billigare'],
            description:
              '"samma" = samma märke/modell som kundens del, ' +
              '"likvärdig" = likvärdigt alternativ från annat märke, ' +
              '"billigare" = enklare/billigare alternativ.',
          },
        },
        required: ['name', 'price'],
      },
    },
    inspectionItemIds: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Id:n (inom hakparentes, t.ex. "drive-cassette") för de ' +
        'besiktningsanmärkningar som jobbet åtgärdar. Tom lista om inga.',
    },
  },
  required: ['title', 'category', 'price', 'products'],
};

const JOB_LIST_TOOL = {
  name: 'create_task_list',
  description:
    'Registrera de cykelreparationsjobb som nämns i transkriptionen, matchade ' +
    'mot verkstadens prislista (CSV). Använd exakt Beskrivning och Pris från ' +
    'prislistan för varje jobb. Föreslå produkter (reservdelar) per jobb ' +
    'baserat på lagersökningarna.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tasks: {
        type: 'array',
        description: 'Ett objekt per jobb som kunden behöver.',
        items: JOB_ITEM_SCHEMA,
      },
    },
    required: ['tasks'],
  },
};

const UPDATE_JOB_TOOL = {
  name: 'update_task',
  description:
    'Returnera jobbet i sin uppdaterade form enligt personalens instruktion.',
  input_schema: {
    type: 'object' as const,
    properties: {
      task: JOB_ITEM_SCHEMA,
    },
    required: ['task'],
  },
};

type ToolProduct = {
  name: string;
  price: number;
  articleNumber?: string;
  stock?: number;
  label?: 'samma' | 'likvärdig' | 'billigare';
  quantity?: number;
};

type ToolTask = {
  title: string;
  category: string;
  price: number;
  severity?: 'kritisk' | 'normal';
  products: ToolProduct[];
  inspectionItemIds?: string[];
};

type ContentBlock = {
  type: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  text?: string;
};

type MessageParam = {
  role: 'user' | 'assistant';
  content:
  | string
  | (
    | ContentBlock
    | { type: 'tool_result'; tool_use_id: string; content: string }
  )[];
};

const WHEEL_RULES =
  'DEBITERINGSREGEL HJUL: Punktering eller slangbyte → raden "Byt slang" ' +
  '(standardslangen läggs till som produkt). Däckbyte, med eller utan ny ' +
  'slang → "Byt däck" (ett jobb per hjul), eller "Byt däck (fram+bak)" när ' +
  'båda hjulen byts, med däck och vid behov slang som produkter. För löst ' +
  'hjul eller barnvagn: motsvarande rad "(löst hjul)" eller "(barnvagn)". ' +
  'Debitera ALDRIG både "Byt slang" och "Byt däck" för samma hjul.';

const PRODUCT_RULES =
  'PRODUKTREGEL: Prislistans kolumn Produkter styr produktförslagen. "nej" = ' +
  'föreslå INGA produkter för jobbet (tom lista). "ja" = föreslå produkter ' +
  'fritt enligt reglerna ovan. Annars listar kolumnen jobbets standardprodukter ' +
  '(t.ex. "2 st Schwalbe Marathon | ..."): föreslå då ENDAST dem och ange antalet ' +
  'som quantity. "läggs till automatiskt" = ta alltid med den. "bara vid behov" ' +
  '= ta bara med den när jobbet kräver det (t.ex. Eker när ekrar behöver bytas ' +
  'vid hjulriktning) och ange då antalet som nämns. En standardprodukt med ' +
  '"fast pris" får exakt det priset och behöver ingen lagersökning; övriga söker ' +
  'du upp med search_stock för exakt namn, artikelnummer, pris och lagersaldo.';

const CONDITION_RULES =
  'VILLKOR: Text i parentes efter en rad (t.ex. "(skivbroms)", "(navväxel)", ' +
  '"(fram)", "(löst hjul)") är villkor för när raden gäller. Välj den mest ' +
  'specifika rad vars villkor stämmer med cykeln och jobbet; finns ingen ' +
  'sådan, välj raden utan parentes.';

const systemPrompt = (prices: PriceItem[]) =>
  'Du är assistent på en cykelverkstad. Du får en transkriberad röstanteckning ' +
  'från besiktningen av en kundcykel. Identifiera varje jobb som nämns och matcha ' +
  'det mot verkstadens prislista nedan (CSV, semikolonseparerad: ' +
  'Servicetyp;Beskrivning;Pris;Produkter). Välj alltid den rad som bäst motsvarar jobbet ' +
  'och använd dess exakta Beskrivning och Pris.\n\n' +
  'Markera jobb som "kritisk" när felet gör cykeln trafikfarlig eller ' +
  'oanvändbar (t.ex. "går inte att cykla på", trasig broms), annars "normal".\n\n' +
  'För varje jobb som kräver en reservdel: sök i lagret med search_stock och ' +
  'föreslå verkliga produkter med exakta namn, priser, artikelnummer och ' +
  'lagersaldon från sökresultaten. Prioritera samma märke och modell som ' +
  'kundens nuvarande del (Shimano → Shimano, SRAM → SRAM, GP5000 → GP5000) och ' +
  'ta hänsyn till det som nämns om cykeln (t.ex. växelsystem, antal växlar, ' +
  'däckdimension). Lägg därefter till 1–2 alternativ: ett likvärdigt från annat ' +
  'märke och/eller ett billigare. Föreslå i första hand varor med lagersaldo > 0; ' +
  'om inget passande finns i lager, ta med bästa träffen ändå (lagersaldo 0 ' +
  'visas som beställningsvara). Hittar du ingen rimlig produkt alls: lägg med ' +
  'delen med pris 0 och utan artikelnummer.\n\n' +
  WHEEL_RULES +
  '\n\n' +
  PRODUCT_RULES +
  '\n\n' +
  CONDITION_RULES +
  '\n\nNär du är klar: anropa create_task_list exakt en gång med hela jobblistan.\n\n' +
  SERVICE_GUIDE +
  '\n\nPRISLISTA:\n' +
  priceCsvFor(prices);

const refinePrompt = (prices: PriceItem[]) =>
  'Du är assistent på en cykelverkstad. Personalen har talat in en ändring av ' +
  'ETT jobb på en pågående arbetsorder. Du får jobbet som JSON tillsammans med ' +
  'instruktionen. Följ instruktionen: byt ut, lägg till eller ta bort ' +
  'produktförslag, eller byt arbetsrad om instruktionen kräver det (matcha då ' +
  'exakt mot prislistan nedan). När instruktionen gäller delar – t.ex. andra ' +
  'märken, en annan däckbredd, eller att kontrollera lagersaldo – använd ' +
  'search_stock och ange exakta namn, priser, artikelnummer och lagersaldon ' +
  'från sökresultaten. Behåll allt som instruktionen inte berör oförändrat.\n\n' +
  WHEEL_RULES +
  '\n\n' +
  PRODUCT_RULES +
  '\n\n' +
  CONDITION_RULES +
  '\n\nNär du är klar: anropa update_task exakt en gång med hela det ' +
  'uppdaterade jobbet.\n\n' +
  SERVICE_GUIDE +
  '\n\nPRISLISTA:\n' +
  priceCsvFor(prices);

const MAX_TOOL_ROUNDS = 8;

/**
 * search_stock: the store's in-stock products (cached on the phone) first; if
 * none match, BikeOffice product search, whose hits are order items.
 */
async function searchStock(query: string): Promise<string> {
  const toResult = (stock: number) => (p: { name: string; articleNumber: string; sellPrice: number }) => ({
    name: p.name,
    articleNumber: p.articleNumber,
    price: p.sellPrice > 0 ? p.sellPrice : 0,
    stock,
  });
  const inStock = searchInStock(query, 12);
  if (inStock.length > 0) return JSON.stringify(inStock.map(toResult(1)));
  try {
    const products = await searchProducts(query);
    return JSON.stringify(products.slice(0, 12).map(toResult(0)));
  } catch (err) {
    return `Sökningen misslyckades: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Runs a Claude tool loop: the model may call search_stock (in-stock cache,
 * then BikeOffice product search) any number of times before it must deliver its
 * structured answer via the given final tool.
 */
async function runToolLoop(
  system: string,
  userContent: string,
  finalTool: { name: string },
  errorText: string
): Promise<Record<string, unknown>> {
  if (!ANTHROPIC_KEY) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY saknas i .env');
  }

  const messages: MessageParam[] = [{ role: 'user', content: userContent }];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const lastRoundNext = round + 1 === MAX_TOOL_ROUNDS;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 4096,
        // Promptcache på den statiska systemprompten (prislista + regler):
        // sökrundorna och efterföljande analyser återanvänder cachen, vilket
        // kapar både svarstid och kostnad rejält.
        system: [
          { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
        ],
        // Strukturerad matchning behöver inget "tänkande" – att stänga av det
        // halverar nästan svarstiden utan kvalitetstapp (benchmarkat).
        // Sonnet 5.5 avvisar 'disabled'; 'between_tools' är dess avstängda läge.
        thinking: { type: 'between_tools' },
        messages,
        tools: [SEARCH_STOCK_TOOL, finalTool],
        // Sonnet 5.5 tillåter inte tvingad tool_choice; sista rundan styrs
        // i stället med en instruktion i föregående meddelande.
        tool_choice: { type: 'auto' },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude-fel (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { content: ContentBlock[] };

    const final = json.content.find(
      (block) => block.type === 'tool_use' && block.name === finalTool.name
    );
    if (final?.input) {
      return final.input;
    }

    const searches = json.content.filter(
      (block) => block.type === 'tool_use' && block.name === 'search_stock'
    );
    messages.push({ role: 'assistant', content: json.content });

    if (searches.length > 0) {
      const results = await Promise.all(
        searches.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id ?? '',
          content: await searchStock(String((block.input as { query?: string })?.query ?? '')),
        }))
      );
      messages.push({
        role: 'user',
        content: lastRoundNext
          ? [...results, { type: 'text' as const, text: `Inga fler sökningar. Anropa ${finalTool.name} nu.` }]
          : results,
      });
    } else {
      // Inget verktygsanrop alls – be om svaret explicit.
      messages.push({
        role: 'user',
        content: `Anropa ${finalTool.name} nu.`,
      });
    }
  }

  throw new Error(errorText);
}

/**
 * Analyserar besiktningstranskriptet och returnerar en prissatt jobblista
 * med lagermatchade produktförslag.
 */
export async function analyzeTranscript(
  transcript: string,
  prices: PriceItem[]
): Promise<Task[]> {
  const input = (await runToolLoop(
    systemPrompt(prices),
    transcript,
    JOB_LIST_TOOL,
    'Claude returnerade ingen jobblista.'
  )) as { tasks?: ToolTask[] };

  if (!input.tasks) {
    throw new Error('Claude returnerade ingen jobblista.');
  }
  return input.tasks.map((task) => applyProductRules(mapTask(task)));
}

/**
 * Skapar en prissatt jobblista utifrån besiktningens anmärkningar. Återanvänder
 * samma matchning (prislista, servicepaket, hjulregel, lagerförslag) som den
 * intalade jobblistan – så personalen bara behöver prata igenom besiktningen.
 */
export async function tasksFromInspection(
  issues: { itemId: string; section: string; title: string; note: string }[],
  transcript: string,
  prices: PriceItem[],
  /** Tasks already agreed at Mottagning; remarks they cover are skipped. */
  intakeTasks: Task[] = []
): Promise<Task[]> {
  if (issues.length === 0) return [];
  const parts = [
    'Skapa en prissatt jobblista som åtgärdar följande anmärkningar från ' +
    'besiktningen:',
    ...issues.map(
      (issue) =>
        `- [${issue.itemId}] ${issue.title} (${issue.section})${issue.note ? `: ${issue.note}` : ''}`
    ),
  ];
  if (intakeTasks.length > 0) {
    parts.push(
      '',
      'Följande åtgärder är redan överenskomna med kunden vid mottagningen. ' +
      'Ta INTE med dem igen, och hoppa över anmärkningar som de redan åtgärdar:',
      ...intakeTasks.map((task) => `- ${task.title}`)
    );
  }
  if (transcript.trim()) {
    parts.push(
      '',
      'Mekanikerns hela inspelning (använd för detaljer om delar – märke, ' +
      'modell och mått – när du söker i lagret):',
      transcript.trim()
    );
  }
  return analyzeTranscript(parts.join('\n'), prices);
}

/**
 * Uppdaterar ETT jobb utifrån en intalad instruktion, t.ex. "föreslå andra
 * Pirelli 28 mm däck" eller "byt till 32 mm och kolla saldot".
 */
export async function refineTask(
  task: Task,
  instruction: string,
  prices: PriceItem[]
): Promise<Task> {
  const payload = JSON.stringify({
    jobb: {
      title: task.title,
      category: task.category,
      price: task.price,
      severity: task.severity,
      products: task.products.map((product) => ({
        name: product.name,
        price: product.price,
        articleNumber: product.articleNumber,
        stock: product.stock,
        label: product.label,
        quantity: product.quantity,
      })),
    },
    instruktion: instruction,
  });

  const input = (await runToolLoop(
    refinePrompt(prices),
    payload,
    UPDATE_JOB_TOOL,
    'Claude returnerade inget uppdaterat jobb.'
  )) as { task?: ToolTask };

  if (!input.task) {
    throw new Error('Claude returnerade inget uppdaterat jobb.');
  }
  return {
    ...applyProductRules(mapTask(input.task)),
    id: task.id,
    inspectionItemIds: task.inspectionItemIds,
  };
}

function mapTask(task: ToolTask): Task {
  return {
    id: uid(),
    title: task.title,
    category: task.category,
    price: task.price,
    severity: task.severity,
    inspectionItemIds: (task.inspectionItemIds ?? []).filter((id) =>
      VALID_ITEM_IDS.has(id)
    ),
    products: (task.products ?? []).map((product) => ({
      id: uid(),
      name: product.name,
      price: product.price,
      articleNumber: product.articleNumber,
      stock: product.stock,
      label: product.label,
      quantity: product.quantity && product.quantity > 1 ? product.quantity : undefined,
    })),
  };
}

// --- Besiktning via röst -------------------------------------------------

/** Kontrollpunkterna som text till prompten: "- <id>: <titel> (<hint>)". */
const INSPECTION_ITEMS_TEXT = INSPECTION_TEMPLATE.map(
  (section) =>
    `${section.title}:\n` +
    section.items.map((i) => `- ${i.id}: ${i.title} (${i.hint})`).join('\n')
).join('\n\n');

const SET_INSPECTION_TOOL = {
  name: 'set_inspection',
  description:
    'Registrera besiktningens kontrollpunkter utifrån vad personalen sagt.',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array',
        description: 'En post per kontrollpunkt som nämns i inspelningen.',
        items: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Exakt id för kontrollpunkten (ur listan).',
            },
            status: {
              type: 'string',
              enum: ['ok', 'issue'],
              description:
                '"ok" om punkten är bra/utan anmärkning, "issue" om det finns ' +
                'en anmärkning.',
            },
            note: {
              type: 'string',
              description:
                'Kort anteckning på svenska för anmärkningar (issue), t.ex. ' +
                '"glapp, behöver justeras". Utelämna för ok.',
            },
          },
          required: ['itemId', 'status'],
        },
      },
    },
    required: ['items'],
  },
};

const INSPECTION_PROMPT =
  'Du är assistent på en cykelverkstad. Personalen går igenom en kundcykel och ' +
  'pratar in vad de ser, punkt för punkt. Mappa det som sägs mot besiktningens ' +
  'kontrollpunkter nedan. För varje punkt som NÄMNS: ange dess exakta itemId, ' +
  'status "ok" om den är bra/utan anmärkning eller "issue" om det finns en ' +
  'anmärkning, och en kort note på svenska för anmärkningar. Ta bara med punkter ' +
  'som faktiskt nämns – hitta inte på, gissa inte. Om något sägs allmänt (t.ex. ' +
  '"resten ser bra ut") ska du INTE fylla i alla punkter, bara de som nämnts ' +
  'specifikt. Använd bara itemId som finns i listan. Anropa set_inspection ' +
  'exakt en gång.\n\nKONTROLLPUNKTER:\n' +
  INSPECTION_ITEMS_TEXT;

type ToolInspection = {
  items?: { itemId: string; status: InspectionStatus; note?: string }[];
};

/** Alla giltiga item-id, för att filtrera bort ev. påhittade id. */
const VALID_ITEM_IDS = new Set(
  INSPECTION_TEMPLATE.flatMap((section) => section.items.map((i) => i.id))
);

/**
 * Mappar en intalad besiktningsgenomgång mot checklistan. Returnerar bara de
 * punkter som nämnts, som en delmängd av InspectionState att slå ihop med det
 * som redan är ifyllt.
 */
export async function analyzeInspection(
  transcript: string
): Promise<InspectionState> {
  if (!ANTHROPIC_KEY) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY saknas i .env');
  }

  // Sonnet 5.5 tillåter inte tvingad tool_choice: be om verktyget i prompten
  // och försök en gång till om modellen svarade utan att anropa det.
  const messages: MessageParam[] = [{ role: 'user', content: transcript }];
  let items: ToolInspection['items'];
  for (let attempt = 0; attempt < 2 && !items; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 1024,
        thinking: { type: 'between_tools' },
        system: [
          {
            type: 'text',
            text: INSPECTION_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
        tools: [SET_INSPECTION_TOOL],
        tool_choice: { type: 'auto' },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude-fel (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { content: ContentBlock[] };
    const toolUse = json.content.find(
      (block) => block.type === 'tool_use' && block.name === 'set_inspection'
    );
    items = (toolUse?.input as ToolInspection | undefined)?.items;
    messages.push(
      { role: 'assistant', content: json.content },
      { role: 'user', content: 'Anropa set_inspection nu.' }
    );
  }
  if (!items) {
    throw new Error('Claude returnerade ingen besiktning.');
  }

  const state: InspectionState = {};
  for (const item of items) {
    if (!VALID_ITEM_IDS.has(item.itemId)) continue;
    state[item.itemId] = {
      status: item.status === 'issue' ? 'issue' : 'ok',
      note: item.status === 'issue' ? item.note?.trim() ?? '' : '',
    };
  }
  return state;
}
