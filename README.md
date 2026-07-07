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

`lib/prices.ts` är genererad från `assets/prices.csv`. Om CSV:n ändras,
regenerera med:

```bash
node -e "
const fs = require('fs');
const csv = fs.readFileSync('assets/prices.csv', 'utf8').trim();
fs.writeFileSync('lib/prices.ts', \`// Auto-generated from assets/prices.csv
import { PriceItem } from './types';

export const PRICE_CSV = \\\`\${csv}\\\`;

export const PRICE_LIST: PriceItem[] = PRICE_CSV.split('\\\\n')
  .slice(1)
  .map((line) => line.split(';'))
  .filter((parts) => parts.length === 3 && !Number.isNaN(Number(parts[2])))
  .map(([category, title, price]) => ({
    category: category.trim(),
    title: title.trim(),
    price: Number(price),
  }));
\`);
"
```

## Obs: API-nycklar i klienten

`EXPO_PUBLIC_`-nycklarna bäddas in i appbundeln. Det är okej för prototyp/eget
bruk, men inför produktion bör Whisper- och Claude-anropen flyttas till en
backend (t.ex. en Supabase Edge Function) så att nycklarna inte skeppas i appen.
