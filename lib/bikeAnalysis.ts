import { fetch } from 'expo/fetch';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

/** OpenAI's newest flagship model. */
const VISION_MODEL = 'gpt-6.2-astra';

// Same bike data model and options as the prototype (prototype_booking/src/types/bike.ts).
export const BIKE_TYPE_OPTIONS = [
  'road bike',
  'mountain bike',
  'hybrid bike',
  'city bike',
  'kids bike',
  'cargo bike',
] as const;
export const COMMON_COLORS = [
  'black',
  'white',
  'red',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'brown',
  'gray',
  'silver',
  'gold',
  'navy',
  'maroon',
  'teal',
  'lime',
  'cyan',
  'magenta',
  'beige',
] as const;
export const GEAR_FRONT_OPTIONS = ['none', 'external'] as const;
export const GEAR_BACK_OPTIONS = ['hub', 'external'] as const;
export const BRAKE_FRONT_OPTIONS = [
  'mechanical disc',
  'hydraulic disc',
  'roller brake',
  'mechanical rim',
] as const;
export const BRAKE_BACK_OPTIONS = [...BRAKE_FRONT_OPTIONS, 'foot brake'] as const;

export type BikeData = {
  bike: {
    brand: string;
    bike_type: (typeof BIKE_TYPE_OPTIONS)[number];
    color: (typeof COMMON_COLORS)[number];
    gears: {
      front: (typeof GEAR_FRONT_OPTIONS)[number];
      back: (typeof GEAR_BACK_OPTIONS)[number];
    };
    brakes: {
      front: (typeof BRAKE_FRONT_OPTIONS)[number];
      back: (typeof BRAKE_BACK_OPTIONS)[number];
    };
    dampers: { front: boolean; back: boolean };
    electric: boolean;
  };
};

const pair = (front: object, back: object) => ({
  type: 'object',
  additionalProperties: false,
  required: ['front', 'back'],
  properties: { front, back },
});

const BIKE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['bike'],
  properties: {
    bike: {
      type: 'object',
      additionalProperties: false,
      required: ['brand', 'bike_type', 'color', 'gears', 'brakes', 'dampers', 'electric'],
      properties: {
        brand: { type: 'string' },
        bike_type: { type: 'string', enum: BIKE_TYPE_OPTIONS },
        color: { type: 'string', enum: COMMON_COLORS },
        gears: pair(
          { type: 'string', enum: GEAR_FRONT_OPTIONS },
          { type: 'string', enum: GEAR_BACK_OPTIONS }
        ),
        brakes: pair(
          { type: 'string', enum: BRAKE_FRONT_OPTIONS },
          { type: 'string', enum: BRAKE_BACK_OPTIONS }
        ),
        dampers: pair({ type: 'boolean' }, { type: 'boolean' }),
        electric: { type: 'boolean' },
      },
    },
  },
};

const PROMPT =
  'Analyze this bicycle image. brand = bike brand name. color = the color that ' +
  'covers most of the bike. dampers = suspension fork (front) / rear shock (back).';

type ResponsesOutput = {
  output?: { type: string; content?: { type: string; text?: string }[] }[];
};

/**
 * Sends a photo of the bike to OpenAI and returns the prototype's BikeData.
 *
 * @param imageBase64 JPEG data as base64 (no data: prefix).
 */
export async function analyzeBikePhoto(imageBase64: string): Promise<BikeData> {
  if (!OPENAI_KEY) {
    throw new Error('EXPO_PUBLIC_OPENAI_API_KEY saknas i .env');
  }

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      reasoning: { effort: 'low' },
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: PROMPT },
            {
              type: 'input_image',
              image_url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'auto',
            },
          ],
        },
      ],
      text: {
        format: { type: 'json_schema', name: 'bike_data', strict: true, schema: BIKE_SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI-fel (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as ResponsesOutput;
  const text = json.output
    ?.filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .find((part) => part.type === 'output_text')?.text;
  if (!text) {
    throw new Error('OpenAI kunde inte analysera bilden.');
  }
  return JSON.parse(text) as BikeData;
}
