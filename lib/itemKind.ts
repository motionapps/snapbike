import { fetch } from 'expo/fetch';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ItemKind } from './types';

const TYPESAFE_KEY = process.env.EXPO_PUBLIC_TYPESAFE_API_KEY ?? '';
const JEV_URL = 'https://api.typesafe.ai/v1/systemone';

const CRITERIA: Record<ItemKind, string> = {
  bike: 'A whole bicycle of any kind (city, road, mountain, kids, cargo or electric bike).',
  part: 'A loose bicycle part that is not mounted on a whole bike, e.g. a loose wheel, tyre, derailleur or saddle.',
  trolley: 'A pram, stroller, child bike trailer or similar wheeled carrier that is not a bicycle.',
  other: 'Anything else.',
};

/** Jev reads 280–1568 px a side; 1024 px wide keeps a 3:4 photo under that. */
async function jevJpeg(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1024, height: null });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!result.base64) throw new Error('Kunde inte förbereda bilden för Jev.');
  return result.base64;
}

/** Asks Jev whether the photo shows a bike, a loose part, a trolley/pram or something else. */
export async function classifyItemKind(photoUri: string): Promise<ItemKind> {
  if (!TYPESAFE_KEY) {
    throw new Error('EXPO_PUBLIC_TYPESAFE_API_KEY saknas i .env');
  }
  const res = await fetch(JEV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TYPESAFE_KEY}`,
      'Content-Type': 'application/json',
      'TypeSafe-Danger-Zone-Images': 'true',
    },
    body: JSON.stringify({
      model: 'jev-latest',
      state: { photo: 'photo-1' },
      assets: { 'photo-1': { type: 'image', format: 'jpg', data_base64: await jevJpeg(photoUri) } },
      questions: {
        kind: {
          type: 'choice',
          instructions: 'What does the photo in `photo` mainly show, as an item brought to a bike workshop?',
          criteria: CRITERIA,
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Jev-fel (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { answers: { kind: { choice: ItemKind } } };
  return data.answers.kind.choice;
}
