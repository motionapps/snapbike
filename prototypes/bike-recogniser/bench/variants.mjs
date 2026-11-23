import { callJev, callOpenAI, asset } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CROP_DIR = process.env.CROP_DIR ?? mkdtempSync(join(tmpdir(), 'bikecrop-'));
const dims = (file) => {
  const o = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]).toString();
  return { w: +o.match(/pixelWidth: (\d+)/)[1], h: +o.match(/pixelHeight: (\d+)/)[1] };
};
/** Crops a padded box out of the image and scales it so the longest side is `size` px. */
function crop(file, box, name, pad = 0.04, size = 900) {
  const { w, h } = dims(file);
  const l = Math.max(0, box.left - pad), r = Math.min(1, box.right + pad);
  const t = Math.max(0, box.top - pad), b = Math.min(1, box.bottom + pad);
  const cw = Math.max(40, Math.round((r - l) * w)), ch = Math.max(40, Math.round((b - t) * h));
  const out = join(CROP_DIR, `${name}.jpg`);
  execFileSync('sips', ['-c', String(ch), String(cw), '--cropOffset', String(Math.round(t * h)), String(Math.round(l * w)), file, '--out', out]);
  execFileSync('sips', ['-Z', String(size), out]);
  const d = dims(out);
  if (Math.min(d.w, d.h) < 280) execFileSync('sips', ['-z', String(Math.max(280, Math.round(d.h * 280 / Math.min(d.w, d.h)))), String(Math.max(280, Math.round(d.w * 280 / Math.min(d.w, d.h)))), out]);
  return readFileSync(out).toString('base64');
}

// ---------- OpenAI: exact copy of lib/bikeAnalysis.ts ----------
const BIKE_TYPES = ['road bike', 'mountain bike', 'hybrid bike', 'city bike', 'kids bike', 'cargo bike'];
const COLORS = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'silver', 'gold', 'navy', 'maroon', 'teal', 'lime', 'cyan', 'magenta', 'beige'];
const BRAKE_FRONT = ['mechanical disc', 'hydraulic disc', 'roller brake', 'mechanical rim'];
const BRAKE_BACK = [...BRAKE_FRONT, 'foot brake'];
const pair = (front, back) => ({ type: 'object', additionalProperties: false, required: ['front', 'back'], properties: { front, back } });
const BIKE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['bike'],
  properties: {
    bike: {
      type: 'object', additionalProperties: false,
      required: ['brand', 'bike_type', 'color', 'gears', 'brakes', 'dampers', 'electric'],
      properties: {
        brand: { type: 'string' },
        bike_type: { type: 'string', enum: BIKE_TYPES },
        color: { type: 'string', enum: COLORS },
        gears: pair({ type: 'string', enum: ['none', 'external'] }, { type: 'string', enum: ['hub', 'external'] }),
        brakes: pair({ type: 'string', enum: BRAKE_FRONT }, { type: 'string', enum: BRAKE_BACK }),
        dampers: pair({ type: 'boolean' }, { type: 'boolean' }),
        electric: { type: 'boolean' },
      },
    },
  },
};
const PROMPT = 'Analyze this bicycle image. brand = bike brand name. color = the color that covers most of the bike. dampers = suspension fork (front) / rear shock (back).';

async function openai(b64, _ctx, model = 'gpt-6.2-astra') {
  const { json, ms, cost: astraCost } = await callOpenAI({
    model,
    reasoning: { effort: 'low' },
    input: [{ role: 'user', content: [
      { type: 'input_text', text: PROMPT },
      { type: 'input_image', image_url: `data:image/jpeg;base64,${b64}`, detail: 'auto' },
    ] }],
    text: { format: { type: 'json_schema', name: 'bike_data', strict: true, schema: BIKE_SCHEMA } },
  });
  const text = json.output.filter((o) => o.type === 'message').flatMap((o) => o.content).find((c) => c.type === 'output_text').text;
  const b = JSON.parse(text).bike;
  // gpt-6.2-sol: $2 in / $10 out per Mtok (astra cost is computed in lib at $8/$40).
  const cost = model === 'gpt-6.2-sol' ? json.usage.input_tokens * 2e-6 + json.usage.output_tokens * 10e-6 : astraCost;
  return {
    ms, cost, extra: json.usage,
    pred: { color: b.color, brand: b.brand, bike_type: b.bike_type, gear_front: b.gears.front, gear_back: b.gears.back, brake_front: b.brakes.front, brake_back: b.brakes.back, damper_front: b.dampers.front, damper_back: b.dampers.back, electric: b.electric },
  };
}

// ---------- Jev ----------
// Brand candidates. In production this list would come from BikeOffice's brand table.
export const BRANDS = ['Crescent', 'Monark', 'Skeppshult', 'Kildemoes', 'Pilen', 'Sjösala', 'Ecoride', 'Lynx', 'Nishiki', 'Bianchi', 'Trek', 'Specialized', 'Cannondale', 'Giant', 'Liv', 'Scott', 'Cube', 'Merida', 'Kona', 'Canyon', 'Rose', 'Orbea', 'Cervélo', 'Pinarello', 'BMC', 'Ridley', 'Felt', 'GT', 'Marin', 'Santa Cruz', 'Norco', 'Focus', 'Ghost', 'Haibike', 'Bergamont', 'Stevens', 'Kalkhoff', 'Riese & Müller', 'Gazelle', 'Batavus', 'Cortina', 'Babboe', 'Christiania', 'Bullitt', 'Omnium', 'Tern', 'Brompton', 'Kross', 'Polygon', 'Electra', 'Raleigh', 'Puch', 'Husqvarna', 'Winther', 'Centurion', 'Mustang', 'Rex', 'Biltema', 'Superior', 'Corratec', 'Diamant', 'Victoria', 'Kettler', 'Velo de Ville', 'MATE', 'Vanmoof', 'Cowboy'];

const yes = (a) => a.noul ?? a.probability ?? a.value;

/** v1: straightforward English questions, one request, image in state. */
function v1Questions(extra = {}) {
  const brandCriteria = Object.fromEntries(BRANDS.map((b) => [b, null]));
  brandCriteria.unknown = 'No brand name or logo can be read on the bike, or it is a brand not in this list.';
  return {
    color: { type: 'choice', instructions: 'What is the main color of the frame of the bicycle in `photo`?', criteria: Object.fromEntries(COLORS.map((c) => [c, null])) },
    brand: { type: 'choice', instructions: 'Which brand is the bicycle in `photo`? Read the name or logo printed on the frame.', criteria: brandCriteria },
    bike_type: { type: 'choice', instructions: 'What type of bicycle is in `photo`?', criteria: {
      'road bike': 'Drop handlebars, thin tires, racing frame.',
      'mountain bike': 'Wide knobby tires, flat wide handlebar, built for off-road.',
      'hybrid bike': 'Flat handlebar, medium tires, sporty frame; trekking or commuter bike, often with derailleur gears.',
      'city bike': 'Upright riding position, swept-back handlebar, often fenders, chain guard, basket or rack; classic Dutch/Nordic style.',
      'kids bike': 'Small bicycle for children.',
      'cargo bike': 'Built to carry loads: a box, long rear or front platform.',
    } },
    gear_front: { type: 'choice', instructions: 'Does the bicycle in `photo` have a front derailleur?', criteria: {
      none: 'Single chainring at the pedals, no front derailleur.',
      external: 'Two or three chainrings at the pedals with a front derailleur.',
    } },
    gear_back: { type: 'choice', instructions: 'What kind of rear gears does the bicycle in `photo` have?', criteria: {
      hub: 'Internal hub gears or single speed: a fat rear hub, one rear sprocket, no rear derailleur.',
      external: 'A rear derailleur and a cassette of several sprockets on the rear wheel.',
    } },
    brake_front: { type: 'choice', instructions: 'What kind of brake is on the front wheel of the bicycle in `photo`?', criteria: {
      'mechanical disc': 'A brake disc rotor at the front hub with a cable-operated caliper.',
      'hydraulic disc': 'A brake disc rotor at the front hub with a hydraulic caliper and hose.',
      'roller brake': 'A drum or roller brake housing at the front hub, no rotor, no rim brake.',
      'mechanical rim': 'Rim brake: V-brake or caliper pads that squeeze the wheel rim.',
    } },
    brake_back: { type: 'choice', instructions: 'What kind of brake is on the rear wheel of the bicycle in `photo`?', criteria: {
      'mechanical disc': 'A brake disc rotor at the rear hub with a cable-operated caliper.',
      'hydraulic disc': 'A brake disc rotor at the rear hub with a hydraulic caliper and hose.',
      'roller brake': 'A drum or roller brake housing at the rear hub with a cable.',
      'mechanical rim': 'Rim brake: V-brake or caliper pads that squeeze the rear rim.',
      'foot brake': 'Coaster brake: no rotor and no rim brake at the rear, braking by pedalling backwards; often a brake arm clamped to the chainstay.',
    } },
    damper_front: { type: 'noul', instructions: 'Does the bicycle in `photo` have a suspension fork (telescopic front fork with stanchions)?' },
    damper_back: { type: 'noul', instructions: 'Does the bicycle in `photo` have rear suspension (a rear shock absorber in the frame)?' },
    electric: { type: 'noul', instructions: 'Is the bicycle in `photo` an electric bike (it has a battery pack and an electric motor)?' },
    ...extra,
  };
}

function readJev(answers, t = 0.5) {
  const pred = {};
  for (const [k, a] of Object.entries(answers)) {
    if (a.type === 'choice') pred[k] = a.choice;
    else if (a.type === 'noul') pred[k] = yes(a) > t;
  }
  return pred;
}

async function jevV1(b64) {
  const img = asset(b64);
  const { json, ms, cost } = await callJev({ state: { photo: img.ref }, assets: { [img.ref]: img.entry }, questions: v1Questions() });
  return { ms, cost, pred: readJev(json.answers), extra: { usage: json.usage, answers: json.answers } };
}


// ---------- v2: option-order debiasing + focus on foreground bike ----------
const FOCUS = 'the bicycle in the foreground of `photo` that the photo is focused on';
const reverse = (q) => ({ ...q, criteria: Object.fromEntries(Object.entries(q.criteria).reverse()) });

function v2Questions() {
  const q = v1Questions();
  for (const v of Object.values(q)) v.instructions = v.instructions.replace(/the bicycle in `photo`/g, FOCUS);
  // Merge disc types; hydraulic vs mechanical asked separately.
  const disc = (where) => `A brake disc rotor (metal disc) mounted at the ${where} hub with a caliper.`;
  q.brake_front.criteria = { disc: disc('front'), 'roller brake': q.brake_front.criteria['roller brake'], 'mechanical rim': q.brake_front.criteria['mechanical rim'] };
  q.brake_back.criteria = { disc: disc('rear'), 'roller brake': q.brake_back.criteria['roller brake'], 'mechanical rim': q.brake_back.criteria['mechanical rim'], 'foot brake': q.brake_back.criteria['foot brake'] };
  q.disc_hydraulic = { type: 'noul', instructions: `Are the disc brakes on ${FOCUS} hydraulic (thick hydraulic hoses, hydraulic levers)?` };
  const out = {};
  for (const [k, v] of Object.entries(q)) {
    out[k] = v;
    if (v.type === 'choice') out[`${k}__rev`] = reverse(v);
  }
  return out;
}

function readDebiased(answers, t = 0.5) {
  const pred = {}, probs = {};
  for (const [k, a] of Object.entries(answers)) {
    if (k.endsWith('__rev') || a.type === 'box') continue;
    if (a.type === 'noul') { pred[k] = yes(a) > t; probs[k] = yes(a); continue; }
    const rev = answers[`${k}__rev`];
    const p = Object.fromEntries(Object.keys(a.probabilities).map((o) => [o, (a.probabilities[o] + (rev?.probabilities[o] ?? a.probabilities[o])) / 2]));
    pred[k] = Object.entries(p).sort((x, y) => y[1] - x[1])[0][0];
    probs[k] = p;
  }
  for (const side of ['brake_front', 'brake_back'])
    if (pred[side] === 'disc') pred[side] = pred.disc_hydraulic ? 'hydraulic disc' : 'mechanical disc';
  return { pred, probs };
}

async function jevV2(b64) {
  const img = asset(b64);
  const { json, ms, cost } = await callJev({ state: { photo: img.ref }, assets: { [img.ref]: img.entry }, questions: v2Questions() });
  const { pred, probs } = readDebiased(json.answers);
  return { ms, cost, pred, extra: { usage: json.usage, probs } };
}

// ---------- v3: v2 + atomic yes/no evidence for brakes and front gears ----------
function v3Questions() {
  return {
    ...v2Questions(),
    front_rotor: { type: 'noul', instructions: `Is a metal brake disc rotor visible at the center of the front wheel of ${FOCUS}?` },
    rear_rotor: { type: 'noul', instructions: `Is a metal brake disc rotor visible at the center of the rear wheel of ${FOCUS}?` },
    front_rim: { type: 'noul', instructions: `Does the front wheel of ${FOCUS} have a rim brake (V-brake arms or caliper with pads touching the rim)?` },
    rear_rim: { type: 'noul', instructions: `Does the rear wheel of ${FOCUS} have a rim brake (V-brake arms or caliper with pads touching the rim)?` },
    front_derailleur: { type: 'noul', instructions: `Does ${FOCUS} have a front derailleur, a small cage mechanism next to the chainrings that moves the chain between two or more chainrings?` },
    rear_derailleur: { type: 'noul', instructions: `Does ${FOCUS} have a rear derailleur hanging below the rear sprockets?` },
    drive_side_visible: { type: 'noul', instructions: `Is the chain side (drive side) of ${FOCUS} facing the camera, so the chain and chainring are clearly visible?` },
  };
}

async function jevV3(b64) {
  const img = asset(b64);
  const { json, ms, cost } = await callJev({ state: { photo: img.ref }, assets: { [img.ref]: img.entry }, questions: v3Questions() });
  const { pred, probs } = readDebiased(json.answers);
  const P = (k) => yes(json.answers[k]);
  // Code owns the combination rules.
  const hyd = pred.disc_hydraulic ? 'hydraulic disc' : 'mechanical disc';
  if (P('front_rotor') > 0.5) pred.brake_front = hyd;
  else if (P('front_rim') > 0.5) pred.brake_front = 'mechanical rim';
  else if (pred.brake_front.includes('disc')) pred.brake_front = 'roller brake';
  if (P('rear_rotor') > 0.5) pred.brake_back = hyd;
  else if (P('rear_rim') > 0.5) pred.brake_back = 'mechanical rim';
  else if (pred.brake_back.includes('disc') || pred.brake_back === 'mechanical rim') pred.brake_back = 'foot brake';
  pred.gear_front = P('front_derailleur') > 0.5 ? 'external' : 'none';
  pred.gear_back = P('rear_derailleur') > 0.5 ? 'external' : 'hub';
  const atomic = Object.fromEntries(['front_rotor', 'rear_rotor', 'front_rim', 'rear_rim', 'front_derailleur', 'rear_derailleur', 'drive_side_visible'].map((k) => [k, +P(k).toFixed(2)]));
  return { ms, cost, pred, extra: { usage: json.usage, probs, atomic } };
}


// ---------- v4: look closer. Request 1 = v2 questions + Boxes; request 2 = detail questions on crops ----------
async function jevV4(b64, { imgDir, id }) {
  const file = join(imgDir, `${id}.jpg`);
  const img = asset(b64);
  const boxes = {
    box_front_wheel: { type: 'box', instructions: `the whole front wheel, including the fork and the top of the tire, of ${FOCUS}` },
    box_rear_wheel: { type: 'box', instructions: `the whole rear wheel, including the hub and sprockets, of ${FOCUS}` },
    box_crank: { type: 'box', instructions: `the pedal crank and chainrings area (bottom bracket) of ${FOCUS}` },
  };
  const r1 = await callJev({ state: { photo: img.ref }, assets: { [img.ref]: img.entry }, questions: { ...v2Questions(), ...boxes } });
  const { pred, probs } = readDebiased(r1.json.answers);

  const front = asset(crop(file, r1.json.answers.box_front_wheel.box, `${id}-front`));
  const rear = asset(crop(file, r1.json.answers.box_rear_wheel.box, `${id}-rear`));
  const crank = asset(crop(file, r1.json.answers.box_crank.box, `${id}-crank`));
  const disc = 'A metal brake disc rotor at the wheel hub with a caliper clamping it.';
  const rim = 'Rim brake: V-brake arms or a caliper with pads that squeeze the wheel rim.';
  const roller = 'A closed drum/roller brake housing at the hub, with a cable, and no rotor.';
  const q2 = {
    front_brake: { type: 'choice', instructions: 'What brake does the front wheel in `front_wheel` have?', criteria: { disc, 'mechanical rim': rim, 'roller brake': roller } },
    rear_brake: { type: 'choice', instructions: 'What brake does the rear wheel in `rear_wheel` have?', criteria: { disc, 'mechanical rim': rim, 'roller brake': roller, 'foot brake': 'Coaster brake: none of the others; a plain hub with a short brake arm clamped to the frame.' } },
    rear_derailleur: { type: 'noul', instructions: 'Is there a rear derailleur with a cassette of several sprockets in `rear_wheel`?' },
    front_derailleur: { type: 'noul', instructions: 'Is there a front derailleur in `crank`: a cage mechanism above the chainrings, or two or more chainrings side by side?' },
  };
  for (const k of ['front_brake', 'rear_brake']) q2[`${k}__rev`] = reverse(q2[k]);
  const r2 = await callJev({
    state: { front_wheel: front.ref, rear_wheel: rear.ref, crank: crank.ref },
    assets: { [front.ref]: front.entry, [rear.ref]: rear.entry, [crank.ref]: crank.entry },
    questions: q2,
  });
  const d = readDebiased(r2.json.answers);
  const hyd = pred.disc_hydraulic ? 'hydraulic disc' : 'mechanical disc';
  pred.brake_front = d.pred.front_brake === 'disc' ? hyd : d.pred.front_brake;
  pred.brake_back = d.pred.rear_brake === 'disc' ? hyd : d.pred.rear_brake;
  pred.gear_back = d.pred.rear_derailleur ? 'external' : 'hub';
  pred.gear_front = d.pred.front_derailleur ? 'external' : 'none';
  return { ms: r1.ms + r2.ms, cost: r1.cost + r2.cost, pred, extra: { usage: [r1.json.usage, r2.json.usage], probs, detail: d.probs, boxes: Object.fromEntries(Object.keys(boxes).map((k) => [k, r1.json.answers[k]])) } };
}

const openaiSol = (b64, ctx) => openai(b64, ctx, 'gpt-6.2-sol');
export const VARIANTS = { openai, openaiSol, jevV1, jevV2, jevV3, jevV4 };
