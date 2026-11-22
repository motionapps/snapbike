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

`lib/priceCsv.ts` är genererad från `assets/snapbike_prices.csv`. Kolumnen
`bikeType` styr vilka rader som visas (se `pricesFor` i `lib/prices.ts`):
`all_bikes`, `electric`, `racer`, `cargo`, `hub`, `external` för cyklar,
`part` för lösa delar, `trolley` för barnvagnar, `other` för övrigt.

`has_product` (true/false): om AI:n ska föreslå produkter för jobbet alls.
`has_standard_products` (true/false): då föreslås bara jobbets standardprodukter
från `assets/snapbike_standard_products.csv`, en rad per produkt:

- `Beskrivning` – exakt som i prislistan
- `Produkt` – produktnamnet AI:n söker på i lagret
- `Antal` – hur många (t.ex. 2 däck)
- `Pris` – valfritt styckpris. Om satt används det i stället för lagerpriset,
  och arbetet blir prislistans pris minus produkterna (t.ex. 2499 − 2×1000 = 499)
- `Artikelnummer` – valfritt; om satt söker AI:n på det i stället för namnet

Om någon av CSV:erna ändras, regenerera med:

```bash
node -e "
const fs = require('fs');
const gen = (src, out, name) => fs.writeFileSync(out, '// Auto-generated from ' + src + ' — regenerate with the snippet in README\\nexport const ' + name + ' = \\\`' + fs.readFileSync(src, 'utf8').trim() + '\\\`;\\n');
gen('assets/snapbike_prices.csv', 'lib/priceCsv.ts', 'PRICE_CSV');
gen('assets/snapbike_standard_products.csv', 'lib/standardProductsCsv.ts', 'STANDARD_PRODUCTS_CSV');
"
```

## Obs: API-nycklar i klienten

`EXPO_PUBLIC_`-nycklarna bäddas in i appbundeln. Det är okej för prototyp/eget
bruk, men inför produktion bör Whisper- och Claude-anropen flyttas till en
backend (t.ex. en Supabase Edge Function) så att nycklarna inte skeppas i appen.
