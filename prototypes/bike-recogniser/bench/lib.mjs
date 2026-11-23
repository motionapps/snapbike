import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, '../../../.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
);
export const OPENAI_KEY = env.EXPO_PUBLIC_OPENAI_API_KEY;
export const TYPESAFE_KEY = env.EXPO_PUBLIC_TYPESAFE_API_KEY;

// OpenAI gpt-6.2-astra list price, USD per token (standard tier, Nov 2026).
export const OPENAI_IN = 8 / 1e6, OPENAI_OUT = 40 / 1e6;
// Jev: $0.042 per Mtok input, output free.
export const JEV_IN = 0.042 / 1e6;

export async function callJev(body) {
  const t0 = performance.now();
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TYPESAFE_KEY}`,
      'Content-Type': 'application/json',
      'TypeSafe-Danger-Zone-Images': 'true',
    },
    body: JSON.stringify({ model: 'jev-1.14.0', ...body }),
  });
  const ms = performance.now() - t0;
  const json = await res.json();
  if (!res.ok) throw new Error(`Jev ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return { json, ms, cost: json.usage.input_tokens * JEV_IN };
}

export async function callOpenAI(body) {
  const t0 = performance.now();
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ms = performance.now() - t0;
  const json = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  const u = json.usage;
  return { json, ms, cost: u.input_tokens * OPENAI_IN + u.output_tokens * OPENAI_OUT };
}

export const asset = (b64) => {
  const ref = randomUUID();
  return { ref, entry: { type: 'image', format: 'jpg', data_base64: b64 } };
};

