# Produktsök och AI-förslag – sammanfattning

Sammanfattning av genomgången 2026-11-26. Inget i koden är ändrat ännu.

## Utgångspunkt

Prompt: byt pedaler, runt 250 kr. Förslag från appen:

- Byt pedaler – 169 kr
- TWS Pedal VP 9/16" – 189 kr · Samma modell · Beställningsvara
- TWS Pedal Citybike Alum 9/16" – 299 kr · Likvärdigt alternativ · Beställningsvara

Frågan var om "Beställningsvara" betyder att det inte finns pedaler i lager för runt 250 kr. Svaret är nej.

## Hur det fungerar idag

### Flödet med Claude (`lib/llm-communication/api.ts`)

1. Röstanteckningen transkriberas (OpenAI `gpt-transcribe`).
2. `runToolLoop` skickar transkriptet till Claude (`claude-sonnet-5-5`) med en systemprompt som innehåller prislistan, regler (hjul, produkter, villkor) och servicepaket.
3. Claude kan anropa verktyget `search_stock` upp till 8 rundor och måste till sist anropa `create_task_list` (eller `update_task` när ett jobb ändras med röst).
4. Claude väljer själv sökord, vilka träffar som blir förslag (bästa + 1–2 alternativ) och etiketterna `samma` / `likvärdig` / `billigare`.
5. `applyProductRules` (`lib/prices.ts`) lägger på prislistans regler: inga produkter, standardprodukter med fast pris och antal, och produkter som läggs till automatiskt.

### Sökningen `search_stock` (`searchStock` i `api.ts`)

1. Den söker först i butikens lagerlista, som cachas på telefonen (`lib/inStockCache.ts`, uppdateras högst en gång i timmen från backendens `GET /api/suppliersearch/search/in-stock`).
2. **Varje sökord måste finnas i produktnamnet** (eller i artikelnumret/EAN).
3. **Om lagret ger noll träffar** går sökningen automatiskt vidare till BikeOffice-katalogen (`/flex/:query`), och alla katalogträffar får `stock: 0`, som visas som "Beställningsvara".
4. Pris ingår inte i sökningen. "Runt 250 kr" påverkar bara vad Claude väljer bland träffarna.
5. Claude kan inte välja "bara lager". Katalogfallbacken sitter i koden.

### Lagerlistan

- Backenden matchar katalogen (`flexindex_existing_articles.min.json`, cirka 112 000 rader) mot tabellen `customer_stock` (stock > 0) på artikelnummer eller EAN.
- På staging: 1 884 lagerrader för en butik, som ger 2 242 katalogprodukter. Det blir fler produkter än lagerrader eftersom samma vara kan finnas hos flera leverantörer.
- Svaret innehåller redan varje produkts Bidex-kategori (`category`), men appens typ `SearchProduct` tar inte med den och den används inte.
- 97,7 % av lagerprodukterna har en Bidex-kod.
- En komplett återskapad lagerlista finns i `/private/tmp/claude-501/-Users-bo-Documents-ReactPages-snapbike/5a44d742-be6b-44ab-9b28-7b20940d2c14/scratchpad/in_stock_list.csv`. Den ligger i en tillfällig mapp och kan försvinna.

## Varför pedalerna inte föreslogs

Butiken har pedaler i lager i rätt prisklass, till exempel:

| Pris | Produkt |
|---|---|
| 149 kr | BBB Pedal SteadyRider |
| 207 kr | Pedal CAVO 1/2" comfort alu, silver |
| 234 kr | Pedal UNION 1/2" SP-687H |
| 299 kr | BBB Pedal BigFeet 2.0 |
| 299 kr | Shimano PD-EF102 Explorer flat |
| 399 kr | BBB Pedal MountainHigh |

Claude sökte troligen med ord som "citybike", "vp" eller "9/16". Inga lagerpedaler i den prisklassen har alla de orden i namnet, så lagersökningen gav noll träffar och föll tillbaka till katalogen. Exakt vilka sökord Claude använde loggas inte. En sökning på bara "pedal" hade hittat dem.

Det går inte att lösa pålitligt med prompten. Fallbacken till katalogen och kravet på att alla ord ska matcha sitter i koden.

## Bidex-kategorier för pedaler

| Kod | Namn |
|---|---|
| `2023` | Pedaler (huvudgrupp) |
| `202310` | Standardpedaler |
| `202320` | Klickpedaler |
| `202330` | Klickpedaler (kombi) |
| `202340` | Plattformspedaler |
| `202390` | Pedaltillbehör (klossar m.m.) |

Många pedaler (BBB, Union, CAVO, Crankbrothers) ligger bara på huvudnivån `2023`. Ett filter på undergrupp skulle missa dem.

Etikettabellen finns i `hermodex-shared/shared-customer-handlers/productsearch/productsearch_categories_final_prod.csv`.

## Ny riktning (beslutat)

Målet är att sökningen ska vara algoritmisk, inte promptbaserad:

- Sökningen gäller **bara lagret**. Ingen fallback till katalogen.
- **Claude fyller bara i sökfält** (Bidex-kategori, pris och eventuella ord). Algoritmen söker själv i telefonens lagercache och Claude väljer inte bland träffarna.
- **Pris:** "runt X" betyder ±25 %, närmast X först. "Under X" betyder 0–X. "X–Y" används exakt.
- Sökningen returnerar **högst 5 produkter**.
- **Bästa träffen** läggs på jobbet (och räknas in i priset). De andra 4 visas som alternativ som man kan trycka på för att byta in.

## Öppna frågor (föreslagna svar, inte bekräftade)

1. **Standardprodukter** (t.ex. "2 st Schwalbe Marathon"): använd samma lageralgoritm och ta bort Claudes sökverktyg helt?
2. **Kategorinivå:** filtrera alltid på huvudgruppen med fyra siffror, och låt Claude välja bara bland kategorier som finns i lager?
3. Lämna produkter **utan Bidex-kod** utanför kategorisökningar?
4. Låt **extra ord** ("9/16", "shimano") bara påverka sorteringen, inte filtrera bort produkter?
5. **Inget pris angivet:** billigast först?
6. **Dubbletter** (samma EAN från flera leverantörer, t.ex. PD-M324 för 789 och 1 111 kr): slå ihop dem och behåll lägsta priset?
7. **Noll träffar:** visa en rad som "Inget i lager: Pedaler 188–313 kr" på jobbet?
8. **Spara alternativen** på jobbet (nytt fält per produkt) så att de finns kvar när arbetsordern öppnas igen?
9. **Flera delar per jobb** (t.ex. däck + slang): en egen sökning med egna alternativ per del?
10. **Röständringar** av ett jobb ("billigare pedaler"): Claude justerar sökfälten och algoritmen körs igen?
11. **Ta bort etiketterna** "Samma modell / Likvärdigt / Billigare" för algoritmens förslag?

## Relaterat i koden

- `lib/llm-communication/api.ts`: prompter, `SEARCH_STOCK_TOOL`, `searchStock` och `runToolLoop`
- `lib/inStockCache.ts`: lagercachen på telefonen och `searchInStock`
- `lib/productSearch.ts`: anrop till backendens produktsök och `/in-stock`
- `lib/prices.ts`: `applyProductRules`
- `components/TaskCard.tsx`: visar "I lager" / "Beställningsvara"
- `components/AddProductModal.tsx`: manuell sökning med kryssrutan "Bara i lager"
- Backend: `../bikeoffice-sf-be/server/api/product-search/productsearch-routes/productsearch_search_routes.ts` (`/in-stock`) och `server/api/customer-stock/customer_stock_service.ts`
