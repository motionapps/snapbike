import { Platform } from 'react-native';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { PRICE_CSV } from './prices';
import { Job, uid } from './types';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

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

const JOB_LIST_TOOL = {
  name: 'create_job_list',
  description:
    'Registrera de cykelreparationsjobb som nämns i transkriptionen, matchade mot verkstadens prislista (CSV). Använd exakt Beskrivning och Pris från prislistan för varje jobb. Föreslå även produkter (reservdelar) som behövs för varje jobb; sätt pris 0 om priset är okänt.',
  input_schema: {
    type: 'object' as const,
    properties: {
      jobs: {
        type: 'array',
        description: 'Ett objekt per jobb som kunden behöver.',
        items: {
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
            products: {
              type: 'array',
              description:
                'Produkter/reservdelar som behövs för jobbet, t.ex. däck, pedaler, bromsbelägg.',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: {
                    type: 'number',
                    description: 'Produktpris i kr, 0 om okänt.',
                  },
                },
                required: ['name', 'price'],
              },
            },
          },
          required: ['title', 'category', 'price', 'products'],
        },
      },
    },
    required: ['jobs'],
  },
};

type ToolJobs = {
  jobs: {
    title: string;
    category: string;
    price: number;
    products: { name: string; price: number }[];
  }[];
};

/**
 * Sends the transcript plus the CSV price list to Claude (claude-sonnet-5)
 * and forces the create_job_list tool so the response is structured.
 */
export async function analyzeTranscript(transcript: string): Promise<Job[]> {
  if (!ANTHROPIC_KEY) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY saknas i .env');
  }

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
      system:
        'Du är assistent på en cykelverkstad. Du får en transkriberad röstanteckning ' +
        'om vad en kundcykel behöver. Identifiera varje jobb som nämns och matcha det ' +
        'mot verkstadens prislista nedan (CSV, semikolonseparerad: Servicetyp;Beskrivning;Pris). ' +
        'Välj alltid den rad som bäst motsvarar jobbet och använd dess exakta Beskrivning och Pris. ' +
        'Lägg till de produkter/reservdelar som rimligen behövs för varje jobb med pris 0 om okänt. ' +
        'Anropa verktyget create_job_list exakt en gång.\n\nPRISLISTA:\n' +
        PRICE_CSV,
      messages: [{ role: 'user', content: transcript }],
      tools: [JOB_LIST_TOOL],
      tool_choice: { type: 'tool', name: 'create_job_list' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude-fel (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    content: { type: string; name?: string; input?: ToolJobs }[];
  };

  const toolUse = json.content.find(
    (block) => block.type === 'tool_use' && block.name === 'create_job_list'
  );
  if (!toolUse?.input?.jobs) {
    throw new Error('Claude returnerade ingen jobblista.');
  }

  return toolUse.input.jobs.map((job) => ({
    id: uid(),
    title: job.title,
    category: job.category,
    price: job.price,
    products: (job.products ?? []).map((product) => ({
      id: uid(),
      name: product.name,
      price: product.price,
    })),
  }));
}
