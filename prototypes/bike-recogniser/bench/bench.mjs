// Benchmark: OpenAI (current app prompt) vs TypeSafe Jev on the reference images.
// Usage: node bench.mjs <imgDir> <variant[,variant...]> [runs]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIANTS } from './variants.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// Ground truth from reference-images/*/*.md. null = not scored.
const TRUTH = {
  skeppshult: { color: 'gray', brand: 'skeppshult', bike_type: 'city bike', gear_front: 'none', gear_back: 'hub', brake_front: 'roller brake', brake_back: 'foot brake', damper_front: false, damper_back: false, electric: false },
  temp1: { color: 'black', brand: 'unknown', bike_type: 'city bike', gear_front: 'none', gear_back: 'hub', brake_front: 'mechanical rim', brake_back: null, damper_front: false, damper_back: false, electric: false },
  temp2: { color: 'green', brand: 'kildemoes', bike_type: 'hybrid bike', gear_front: 'external', gear_back: 'external', brake_front: 'disc', brake_back: 'disc', damper_front: false, damper_back: false, electric: true },
  temp3: { color: 'white', brand: 'bianchi', bike_type: 'hybrid bike', gear_front: 'external', gear_back: 'external', brake_front: 'disc', brake_back: 'disc', damper_front: false, damper_back: false, electric: false },
  temp4: { color: 'black', brand: 'trek', bike_type: 'road bike', gear_front: 'external', gear_back: 'external', brake_front: 'disc', brake_back: 'disc', damper_front: false, damper_back: false, electric: false },
  temp5: { color: 'black', brand: 'pilen', bike_type: 'city bike', gear_front: 'none', gear_back: 'hub', brake_front: 'disc', brake_back: 'foot brake', damper_front: false, damper_back: false, electric: true },
};
export const FIELDS = Object.keys(TRUTH.temp1);

function match(field, got, want) {
  if (want === null) return null;
  if (got === undefined || got === null) return false;
  if (field === 'brand') {
    const g = String(got).toLowerCase().trim();
    if (want === 'unknown') return ['', 'unknown', 'okänd', 'none', 'other'].includes(g);
    return g.includes(want);
  }
  if (want === 'disc') return String(got).includes('disc');
  return got === want;
}

const [imgDir, variantArg, runsArg] = process.argv.slice(2);
const runs = Number(runsArg ?? 1);
const results = [];
for (const name of variantArg.split(',')) {
  const variant = VARIANTS[name];
  for (const [id, truth] of Object.entries(TRUTH)) {
    const b64 = readFileSync(join(imgDir, `${id}.jpg`)).toString('base64');
    for (let r = 0; r < runs; r++) {
      try {
        const out = await variant(b64, { imgDir, id });
        const fields = Object.fromEntries(FIELDS.map((f) => [f, match(f, out.pred[f], truth[f])]));
        results.push({ variant: name, id, run: r, ms: out.ms, cost: out.cost, pred: out.pred, fields, extra: out.extra });
        const wrong = FIELDS.filter((f) => fields[f] === false).map((f) => `${f}=${out.pred[f]}`);
        console.log(`${name.padEnd(12)} ${id.padEnd(11)} ${String(Math.round(out.ms)).padStart(6)}ms $${out.cost.toFixed(5)}  wrong: ${wrong.join(', ') || '-'}`);
      } catch (e) {
        console.log(`${name} ${id} ERROR ${e.message}`);
      }
    }
  }
}

console.log('\nvariant        acc     avg ms    avg $/img');
for (const name of variantArg.split(',')) {
  const rs = results.filter((r) => r.variant === name);
  const scored = rs.flatMap((r) => Object.values(r.fields).filter((v) => v !== null));
  const acc = scored.filter(Boolean).length / scored.length;
  const ms = rs.reduce((a, r) => a + r.ms, 0) / rs.length;
  const cost = rs.reduce((a, r) => a + r.cost, 0) / rs.length;
  console.log(`${name.padEnd(12)} ${(acc * 100).toFixed(1).padStart(5)}%  ${String(Math.round(ms)).padStart(7)}  ${cost.toFixed(5)}`);
  const perField = FIELDS.map((f) => {
    const v = rs.map((r) => r.fields[f]).filter((x) => x !== null);
    return `${f}:${v.filter(Boolean).length}/${v.length}`;
  });
  console.log('   ' + perField.join('  '));
}
writeFileSync(join(here, `results-${variantArg.replace(/,/g, '_')}.json`), JSON.stringify(results, null, 2));
