# Prismodellen

Beskriver hur prismodellen fungerar. Filen är för utvecklare och kodagenten och
skickas **aldrig** till Claude API:t (regenereringen nedan läser bara `*.csv`).
Uppdatera den vid varje ändring i modellen.

Modellen är en kopia av `prototypes/price-model/` där den utvecklas. Den
paketeras i appen som `lib/priceModelCsv.ts` och visas skrivskyddad under
Inställningar → Priser. Inga fält är citerade, så använd inga kommatecken i
värdena. Målet är en liten modell utan upprepningar: det AI:n får ska vara
kort och entydigt.

## Filerna

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
- `standard_products.csv` – `part_id, action_id, product, quantity, price, auto`.
  Produkterna hör till del + åtgärd och gäller alla dess prisrader (även löst
  hjul, barnvagn osv.). `price` är ett valfritt fast styckpris. `auto=true`
  läggs alltid till (Standardslang vid Byt slang); `auto=false` föreslås bara
  vid behov (däck och slang vid Byt däck, Eker vid hjulriktning).
- `packages.csv` – servicepaket; `covers` listar `part.action` som ingår.
- `add_ons.csv` – tillägg (Elcykel, Lådcykel, Express …).
- `requirements.csv` – `part_id, action_id, requires, message`. Krav som del +
  åtgärd ställer på cykeln (alla dess prisrader). `requires` är villkor
  separerade med `|`; minst ett ska stämma. Stämmer inget visar jobbkortet
  (Mottagning och Jobblista) en röd varning med `message`; `{brake}` och
  `{side}` fylls i. Varningen stoppar ingenting. Bara bromsar kollas nu, per
  jobbets sida mot cykelns broms fram/bak (fotbroms = `brake_type=coaster`,
  hydraulisk skiva = `brake_type=disc` + `brake_system=hydraulic` osv., se
  `taskWarnings` i `lib/prices.ts`). Okänd broms eller sida → ingen varning.
  Skickas inte till AI:n.

## Sidor (fram / bak / fram+bak)

Sidan står inte i prislistan utan härleds från `parts.csv`:

- En prisrad **har sidor** när dess del (eller närmaste förälder med
  kontrollpunkter) har `front:`/`rear:` i `inspection_items` – hjul, däck,
  slang, nav, broms och deras underdelar. Undantag: rader som själva anger
  `position=…`, och löst hjul (`mounting=loose`) eller lös del (`item=part`),
  som är en enda del. Barnvagn har sidor.
- Jobbet får `side` (fram, bak eller fram+bak) och namnet byggs av appen:
  "Byt slang (bak)", "Byt slang (barnvagn, fram+bak)". Sidan väljer
  kontrollpunkterna.
- **fram+bak = 2 × priset**, ett jobb. En rad med `position=both` för samma
  del, åtgärd och villkor ersätter det priset (Byt däck/Byt slang: 499).
  Den raden visas inte som egen rad.
- Produkter med `auto=true` dubbleras för fram+bak (2 × Standardslang);
  vid-behov-produkter gör det inte.
- AI:n ser en rad med pris "299 (fram+bak 499)" och anger `side`. Framgår
  inte sidan utelämnar den `side`; jobbet visar då knapparna fram / bak /
  fram+bak på kortet. Samma knappar visas när ett sido-jobb läggs till för
  hand.
- `position=…` på delar utan sidor (växeljustering, stänkskärmar) är vanliga
  villkor och påverkas inte.

## Regenerera

Om någon CSV ändras, regenerera `lib/priceModelCsv.ts` från projektroten:

```bash
node -e "
const fs = require('fs');
const dir = 'assets/price-model/';
const files = { parts: 'parts', actions: 'actions', prices: 'prices', standardProducts: 'standard_products', packages: 'packages', addOns: 'add_ons', conditions: 'conditions', requirements: 'requirements' };
const body = Object.entries(files).map(([key, f]) => '  ' + key + ': \\\`' + fs.readFileSync(dir + f + '.csv', 'utf8').trim() + '\\\`,').join('\\n');
fs.writeFileSync('lib/priceModelCsv.ts', '// Auto-generated from assets/price-model/*.csv — regenerate with the snippet in assets/price-model/README.md\\nexport const PRICE_MODEL_CSV = {\\n' + body + '\\n};\\n');
"
```
