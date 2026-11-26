// Bike brands from assets/bike-brands/brands.jsonl, one {"name": …} per line.
// Metro can't import .jsonl, so the file is embedded in bikeBrandsJsonl.ts. Regenerate after editing it:
// node -e "const fs=require('fs');const t=fs.readFileSync('assets/bike-brands/brands.jsonl','utf8');fs.writeFileSync('lib/bikeBrandsJsonl.ts','// Auto-generated from assets/bike-brands/brands.jsonl — regenerate with the snippet in lib/bikeBrands.ts\nexport const BIKE_BRANDS_JSONL = '+JSON.stringify(t)+';\n')"
import { BIKE_BRANDS_JSONL } from './bikeBrandsJsonl';

export const BIKE_BRANDS: string[] = BIKE_BRANDS_JSONL.split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line).name);
