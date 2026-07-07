import { Platform } from 'react-native';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { PRICE_CSV } from './prices';
import { SERVICE_GUIDE } from './servicepaket';
import { searchStock } from './stock';
import { Job, uid } from './types';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

/** Sant när en riktig Whisper-nyckel finns (inte tom/platshållare). */
export const hasOpenAiKey = OPENAI_KEY.startsWith('sk-');

/**
 * Sends a recorded audio file to OpenAI Whisper and returns the Swedish
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
  form.append('model', 'whisper-1');
  form.append('language', 'sv');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Whisper-fel (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { text: string };
  return json.text;
}

const SEARCH_STOCK_TOOL = {
  name: 'search_stock',
  description:
    'Sök i butikens lagerlista (~67 000 artiklar) efter reservdelar. ' +
    'Returnerar namn, artikelnummer, pris (kr) och lagersaldo. Sök med få, ' +
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
            description: 'Exakt lagersaldo från lagerlistan.',
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
  },
  required: ['title', 'category', 'price', 'products'],
};

const JOB_LIST_TOOL = {
  name: 'create_job_list',
  description:
    'Registrera de cykelreparationsjobb som nämns i transkriptionen, matchade ' +
    'mot verkstadens prislista (CSV). Använd exakt Beskrivning och Pris från ' +
    'prislistan för varje jobb. Föreslå produkter (reservdelar) per jobb ' +
    'baserat på lagersökningarna.',
  input_schema: {
    type: 'object' as const,
    properties: {
      jobs: {
        type: 'array',
        description: 'Ett objekt per jobb som kunden behöver.',
        items: JOB_ITEM_SCHEMA,
      },
    },
    required: ['jobs'],
  },
};

const UPDATE_JOB_TOOL = {
  name: 'update_job',
  description:
    'Returnera jobbet i sin uppdaterade form enligt personalens instruktion.',
  input_schema: {
    type: 'object' as const,
    properties: {
      job: JOB_ITEM_SCHEMA,
    },
    required: ['job'],
  },
};

type ToolProduct = {
  name: string;
  price: number;
  articleNumber?: string;
  stock?: number;
  label?: 'samma' | 'likvärdig' | 'billigare';
};

type ToolJob = {
  title: string;
  category: string;
  price: number;
  severity?: 'kritisk' | 'normal';
  products: ToolProduct[];
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
  'DEBITERINGSREGEL HJUL: Punktering, slangbyte och däckbyte är samma ' +
  'arbetsmoment. Använd raden "Däckbyte - per hjul" som arbete (ett jobb per ' +
  'hjul) och lägg slang och/eller däck som produkter på det jobbet. Debitera ' +
  'ALDRIG två arbeten för samma hjul (t.ex. både "Punktering inkl. ' +
  'standardslang" och "Däckbyte - per hjul").';

const SYSTEM_PROMPT =
  'Du är assistent på en cykelverkstad. Du får en transkriberad röstanteckning ' +
  'från besiktningen av en kundcykel. Identifiera varje jobb som nämns och matcha ' +
  'det mot verkstadens prislista nedan (CSV, semikolonseparerad: ' +
  'Servicetyp;Beskrivning;Pris). Välj alltid den rad som bäst motsvarar jobbet ' +
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
  '\n\nNär du är klar: anropa create_job_list exakt en gång med hela jobblistan.\n\n' +
  SERVICE_GUIDE +
  '\n\nPRISLISTA:\n' +
  PRICE_CSV;

const REFINE_PROMPT =
  'Du är assistent på en cykelverkstad. Personalen har talat in en ändring av ' +
  'ETT jobb på en pågående arbetsorder. Du får jobbet som JSON tillsammans med ' +
  'instruktionen. Följ instruktionen: byt ut, lägg till eller ta bort ' +
  'produktförslag, eller byt arbetsrad om instruktionen kräver det (matcha då ' +
  'exakt mot prislistan nedan). När instruktionen gäller delar – t.ex. andra ' +
  'märken, en annan däckbredd, eller att kontrollera lagersaldo – använd ' +
  'search_stock och ange exakta namn, priser, artikelnummer och lagersaldon ' +
  'från sökresultaten. Behåll allt som instruktionen inte berör oförändrat.\n\n' +
  WHEEL_RULES +
  '\n\nNär du är klar: anropa update_job exakt en gång med hela det ' +
  'uppdaterade jobbet.\n\n' +
  SERVICE_GUIDE +
  '\n\nPRISLISTA:\n' +
  PRICE_CSV;

const MAX_TOOL_ROUNDS = 8;

/**
 * Runs a Claude tool loop: the model may call search_stock (answered locally
 * with the shop's stock list) any number of times before it must deliver its
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
    const forceFinal = round === MAX_TOOL_ROUNDS;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system,
        messages,
        tools: [SEARCH_STOCK_TOOL, finalTool],
        tool_choice: forceFinal
          ? { type: 'tool', name: finalTool.name }
          : { type: 'auto' },
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
      messages.push({
        role: 'user',
        content: searches.map((block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id ?? '',
          content: JSON.stringify(
            searchStock(String((block.input as { query?: string })?.query ?? ''))
          ),
        })),
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
export async function analyzeTranscript(transcript: string): Promise<Job[]> {
  const input = (await runToolLoop(
    SYSTEM_PROMPT,
    transcript,
    JOB_LIST_TOOL,
    'Claude returnerade ingen jobblista.'
  )) as { jobs?: ToolJob[] };

  if (!input.jobs) {
    throw new Error('Claude returnerade ingen jobblista.');
  }
  return input.jobs.map(mapJob);
}

/**
 * Uppdaterar ETT jobb utifrån en intalad instruktion, t.ex. "föreslå andra
 * Pirelli 28 mm däck" eller "byt till 32 mm och kolla saldot".
 */
export async function refineJob(job: Job, instruction: string): Promise<Job> {
  const payload = JSON.stringify({
    jobb: {
      title: job.title,
      category: job.category,
      price: job.price,
      severity: job.severity,
      products: job.products.map((product) => ({
        name: product.name,
        price: product.price,
        articleNumber: product.articleNumber,
        stock: product.stock,
        label: product.label,
      })),
    },
    instruktion: instruction,
  });

  const input = (await runToolLoop(
    REFINE_PROMPT,
    payload,
    UPDATE_JOB_TOOL,
    'Claude returnerade inget uppdaterat jobb.'
  )) as { job?: ToolJob };

  if (!input.job) {
    throw new Error('Claude returnerade inget uppdaterat jobb.');
  }
  return { ...mapJob(input.job), id: job.id };
}

function mapJob(job: ToolJob): Job {
  return {
    id: uid(),
    title: job.title,
    category: job.category,
    price: job.price,
    severity: job.severity,
    products: (job.products ?? []).map((product) => ({
      id: uid(),
      name: product.name,
      price: product.price,
      articleNumber: product.articleNumber,
      stock: product.stock,
      label: product.label,
    })),
  };
}
