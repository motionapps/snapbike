# SnapBike

Röststyrd verkstadsanteckning för cykelverkstad: fota cykeln, prata in vad som
behöver göras, och få en prissatt jobblista matchad mot verkstadens prislista.

## Flöde

1. **Foto** – tryck på bildkortet (25 % av skärmen) för att öppna kameran.
2. **Röst** – tryck på mikrofonknappen (eller håll den intryckt) och beskriv
   jobben på svenska. Inspelningen skickas till OpenAI Whisper (`whisper-1`,
   `language=sv`) och transkriberas.
3. **Analys** – transkriptet skickas till Claude (`claude-sonnet-5`) tillsammans
   med prislistan (`assets/prices.csv`, inbäddad i systemprompten). Ett
   verktygsanrop (`create_job_list`, forcerat via `tool_choice`) returnerar en
   strukturerad jobblista med exakta priser ur CSV:n samt produktförslag.
4. **Redigera** – ta bort jobb, lägg till jobb ur prislistan (sökbar lista),
   lägg till/ta bort produkter per jobb. Totalsumma räknas ut löpande.
5. **Spara** – bilden laddas upp till Supabase Storage (bucket `snapbike`) och
   listan sparas som en rad i tabellen `snapbike_estimates`.

## Kom igång

```bash
npm install
# Fyll i .env (se .env.example) — Supabase-värdena är redan ifyllda,
# lägg in dina OpenAI- och Anthropic-nycklar.
npx expo start
```

Kamera och mikrofon kräver en riktig enhet (Expo Go fungerar).

## Supabase

Projektet **cykelnatur** (`diwlgaiijdclojyeuvle`, eu-north-1) används:

- Tabell `public.snapbike_estimates` (id, created_at, transcript, jobs jsonb,
  image_path, total) med RLS: anon får insert + select.
- Publik storage-bucket `snapbike` (anon insert, publik läsning).

## Prislistan

Prismodellen ligger i `assets/price-model/` (en kopia av
`prototypes/price-model/` där modellen utvecklas). Den paketeras i appen som
`lib/priceModelCsv.ts` och visas skrivskyddad under Inställningar → Priser.
Inga fält är citerade, så använd inga kommatecken i värdena.

- `parts.csv` – delträdet: `part_id, parent_id, name, inspection_items`.
  Toppdelarna (Hjul, Broms, Drivlina …) blir jobbets kategori/etikett.
  `inspection_items` (`front:front-rim|rear:rear-rim`) placerar jobbet på
  besiktningens kontrollpunkter; en del utan egna ärver närmaste förälders.
- `actions.csv` – åtgärderna (Byt, Justera, Rikta …).
- `prices.csv` – `part_id, action_id, conditions, label, price, has_product`.
  Jobbnamnet byggs som åtgärd + del + villkorens etiketter + `label`, t.ex.
  "Byt bromsbelägg (skivbroms)". `has_product=false` = inga produktförslag.
- `conditions.csv` – svensk etikett per villkor (`brake_type=disc` → skivbroms).
  Cykelvillkor (`gears`, `electric`, `bike_type`) döljer rader som inte passar
  den analyserade cykeln; `item=trolley` gäller barnvagnar.
- `standard_products.csv` – produkter som hör till en prisrad (samma part,
  action och conditions). `price` är ett valfritt fast styckpris.
  `auto=true` läggs alltid till (Standardslang); `auto=false` föreslås bara vid
  behov (Eker vid hjulriktning).
- `packages.csv` – servicepaket; `covers` listar `part.action` som ingår.
- `add_ons.csv` – tillägg (Elcykel, Lådcykel, Express …).

Om någon av CSV:erna ändras, regenerera med:

```bash
node -e "
const fs = require('fs');
const dir = 'assets/price-model/';
const files = { parts: 'parts', actions: 'actions', prices: 'prices', standardProducts: 'standard_products', packages: 'packages', addOns: 'add_ons', conditions: 'conditions' };
const body = Object.entries(files).map(([key, f]) => '  ' + key + ': \\\`' + fs.readFileSync(dir + f + '.csv', 'utf8').trim() + '\\\`,').join('\\n');
fs.writeFileSync('lib/priceModelCsv.ts', '// Auto-generated from assets/price-model/*.csv — regenerate with the snippet in README\\nexport const PRICE_MODEL_CSV = {\\n' + body + '\\n};\\n');
"
```

## Obs: API-nycklar i klienten

`EXPO_PUBLIC_`-nycklarna bäddas in i appbundeln. Det är okej för prototyp/eget
bruk, men inför produktion bör Whisper- och Claude-anropen flyttas till en
backend (t.ex. en Supabase Edge Function) så att nycklarna inte skeppas i appen.
