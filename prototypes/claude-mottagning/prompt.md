# Uppgift: Benchmarka mottagningens Claude Sonnet 5.5-flöde mot Jev (TypeSafe)

## Mål
Ta reda på vilka delar av mottagningens LLM-flöde som kan ersättas eller kompletteras med Jev för att det ska gå snabbare och bli billigare, med i stort sett samma kvalitet. Bygg en benchmark som jämför dagens Claude Sonnet 5.5 med olika Jev-upplägg. Utvärdera också om det hjälper att översätta svensk input till engelska innan den går till Jev; Jev är bättre på engelska, men översättningen kostar tid och kan förvanska. Leverera siffror (träffsäkerhet, tid, kostnad) och en rekommendation. Ändra INTE produktionskoden utan att fråga användaren först.

## Läs först
- /Users/bo/Documents/ReactPages/snapbike/CLAUDE.md och AGENTS.md: identifierare på engelska, svensk copy är okej, staging-miljö.
- Användarens arbetsregler: fråga om scope är oklart, håll det minimalt, bygg bara det som efterfrågas.
- Läs skillen `typesafe-ai` och TypeSafes aktuella dokumentation (index: https://docs.typesafe.ai/llms.txt). Börja med concepts/how-to-build-with-system-one, primitives (choice/noul/score), confidence, model-jaggedness och cookbooks som function_calling, cart_from_primitives, sde_cascade och pre_parsed_value_extraction_cookbook. Mintlify-sidor hämtas som markdown genom att lägga till `.md` på adressen, t.ex. med curl.

## Nuvarande flöde (kort kartlagt, ej djupläst)
Fil: /Users/bo/Documents/ReactPages/snapbike/lib/llm-communication/api.ts
- `transcribeAudio` (rad ~26): tal till text via OpenAI.
- `runToolLoop` (rad ~310): Claude-verktygsloop med modellen `claude-sonnet-5-5`, högst 8 rundor (`MAX_TOOL_ROUNDS`). Modellen får anropa `search_stock` (lagercache, se lib/inStockCache.ts och lib/productSearch.ts) och avslutar med ett slutverktyg.
- `analyzeTranscript` (rad ~402): transkript till jobblista via verktyget `create_task_list`.
- `tasksFromInspection` (rad ~424) och `refineTask` (rad ~463, verktyget `update_task`).
- `analyzeInspection` (rad ~599): besiktning via verktyget `set_inspection`, med INSPECTION_TEMPLATE och VALID_ITEM_IDS.
- Regler i prompten: `WHEEL_RULES` och `PRODUCT_RULES` (rad ~223–280).
- Sonnet 5.5-egenheter som redan är hanterade i koden: `thinking: {type:'between_tools'}` och ingen tvingad `tool_choice`.
- Används från App.tsx och components/InspectionScreen.tsx. Se även lib/speech.ts, lib/prices.ts och lib/servicePackage.ts.
- Nycklar finns i /Users/bo/Documents/ReactPages/snapbike/.env: EXPO_PUBLIC_ANTHROPIC_API_KEY, EXPO_PUBLIC_TYPESAFE_API_KEY och EXPO_PUBLIC_OPENAI_API_KEY.
- OVERIFIERAT: exakt hur stegen hänger ihop och vilka som är långsammast. Mät och kartlägg det först.

## Tankar om var Jev kan passa (hypoteser att testa, inte beslut)
Jev genererar inte text. Den svarar på Choice-, Noul- och Score-frågor med sannolikheter och konfidens. Den passar därför när svaret ska väljas ur en känd mängd:
- vilka standardjobb eller servicepaket ett transkript nämner (en Noul per kandidat, eller Choice),
- att välja rätt lagerartikel bland kandidater från `search_stock` i stället för att låta Claude loopa,
- besiktningspunkter med status (Choice per punkt i INSPECTION_TEMPLATE, alla ställda parallellt i ett anrop),
- en kaskad där Jev tar det säkra och Claude bara anropas för låg konfidens eller för fritext.
Fritext som kommentarer och beskrivningar behöver troligen fortfarande en generativ modell.

## Lärdomar från bildbenchmarken (samma session)
- Rapport: /Users/bo/Documents/ReactPages/snapbike/prototypes/bike-recogniser/BENCHMARK-REPORT.md
- Kod att återanvända: /Users/bo/Documents/ReactPages/snapbike/prototypes/bike-recogniser/bench/ (bench.mjs = facit, poängsättning och sammanfattning; variants.mjs = varianter; lib.mjs = .env-läsning, callJev/callOpenAI, kostnad). Körs med `node bench.mjs <dataDir> <variant,...> <runs>`.
- Jev-anrop: POST https://api.typesafe.ai/v1/systemone, model `jev-1.14.0`, `Authorization: Bearer <key>`. Pris $0.042 per miljon input-tokens, output gratis. Bildheadern behövs bara för bilder.
- Jev kan inte fine-tunas. Domänkunskap läggs i `state`, instruktioner och beskrivningar av svarsalternativ.
- Jev föredrar ofta det första alternativet i en Choice. Att ställa frågan även med omvänd ordning och medelvärdesbilda sannolikheterna gav några procentenheter.
- Ställ alla frågor i SAMMA anrop. De körs parallellt, och ett Jev-anrop tog ~0,2–0,3 s.
- Kolla om konfidensen faktiskt skiljer rätt från fel innan du bygger en kaskad. I bildfallet var Jev osäker på samma fält i nästan alla bilder, så kaskaden sparade inget.
- Användaren uppskattade en enkel tabell (träffsäkerhet, tid, kostnad per anrop och per 1 000) plus träffsäkerhet per fält.
- Användaren vill ha snabbhet. Även en billigare eller snabbare Claude-modell kan vara värd att ha med som jämförelse. Kontrollera aktuella priser och modell-ID med skillen claude-api innan du räknar.

## Öppet / att göra
1. Kartlägg flödet och mät dagens latens och kostnad per steg med Sonnet 5.5.
2. Testdata: det finns inget facit för mottagningen än. Fråga användaren efter riktiga transkript eller besiktningar med rätt svar, eller föreslå hur ett litet facit kan tas fram. Hitta inte på facit själv utan att stämma av.
3. Bygg benchmarken i en ny mapp, t.ex. /Users/bo/Documents/ReactPages/snapbike/prototypes/reception-bench/, så att den inte blandas med appkoden.
4. Testa Jev-upplägg med svensk input och med engelsk översättning först. Räkna in översättningens tid och kostnad.
5. Skriv en rapport i samma stil som BENCHMARK-REPORT.md och lägg den i mappen.