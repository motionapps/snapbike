# Cykelanalys på mottagningen: OpenAI vs Jev

*Benchmark genomförd 2026-11-23. Skript och rådata: [`bench/`](bench/).*

## Sammanfattning

- **Byt till `gpt-6.2-sol`.** Den använder samma prompt och samma enda anrop som i dag. Den träffade lika bra eller bättre än nuvarande `gpt-6.2-astra` (91 % mot 88 %), var **ungefär 4 gånger billigare** och **ungefär 1,7 gånger snabbare**. Bytet är en rad i `lib/bikeAnalysis.ts` (`VISION_MODEL`).
- **Jev (TypeSafe) är ungefär 100 gånger billigare och 20 gånger snabbare än astra, men träffar sämre: 75–78 % rätt.** Den klarar färg, cykeltyp, dämpare, elcykel och bakväxel, men missar små mekaniska detaljer: bromstyp och fram-växel.
- **Jev går inte att träna.** Det finns ingen fine-tuning eller LoRA, och samma vikter används för alla kunder. Man kan bara styra den genom frågorna, beskrivningarna av svarsalternativen och exempelbilder i dem. TypeSafe kallar dessutom själva bildstödet experimentellt och inte redo för produktion.

## Resultat

Testet gäller 6 referensbilder, 10 fält per bild och 1–2 körningar per bild och variant.

| Variant | Anrop | Rätt | Tid/bild | Kostnad/bild | Kostnad per 1 000 cyklar |
|---|---|---|---|---|---|
| OpenAI `gpt-6.2-astra` (dagens app) | 1 | 88,1 % | ~4,7 s | $0.0157 | ~$15.70 |
| **OpenAI `gpt-6.2-sol`** (samma prompt) | 1 | **90,7 %** | **~2,9 s** | **$0.0037** | **~$3.70** |
| Jev v1: enkla engelska frågor | 1 | 74,6 % | ~0,24 s | $0.00016 | ~$0.16 |
| Jev v2: frågor i båda ordningarna + fokus på cykeln i förgrunden | 1 | 78,0 % | ~0,29 s | $0.00022 | ~$0.22 |
| Jev v3: v2 + ja/nej-frågor om broms och växel | 1 | 74,6 % | ~0,24 s | $0.00024 | ~$0.24 |
| Jev v4: beskurna närbilder (Box + beskärning) | 2 | 74,6 % | ~0,55 s | $0.00049 | ~$0.49 |

Kostnaderna är räknade på listpriser i november 2026:

| Modell | Input per Mtok | Output per Mtok |
|---|---|---|
| astra | $8 | $40 |
| sol | $2 | $10 |
| Jev 1.14 | $0.042 | gratis |

Tiderna är uppmätta från en dator i Sverige mot respektive API.

### Träffsäkerhet per fält

| Fält | astra | sol | Jev v1 | Jev v2 | Jev v3 | Jev v4 |
|---|---|---|---|---|---|---|
| Färg | 4/6 | 8/12 | 10/12 | 5/6 | 10/12 | 5/6 |
| Märke | 5/6 | 11/12 | 6/12 | 4/6 | 8/12 | 4/6 |
| Cykeltyp | 5/6 | 10/12 | 10/12 | 5/6 | 10/12 | 5/6 |
| Växel fram | 5/6 | 10/12 | 6/12 | 3/6 | 6/12 | 3/6 |
| Växel bak | 6/6 | 12/12 | 10/12 | 5/6 | 8/12 | 5/6 |
| Broms fram | 4/6 | 10/12 | 8/12 | 4/6 | 8/12 | 4/6 |
| Broms bak | 5/5 | 10/10 | 4/10 | 3/5 | 4/10 | 1/5 |
| Dämpning fram | 6/6 | 12/12 | 12/12 | 6/6 | 12/12 | 6/6 |
| Dämpning bak | 6/6 | 12/12 | 12/12 | 6/6 | 12/12 | 6/6 |
| Elcykel | 6/6 | 12/12 | 10/12 | 5/6 | 10/12 | 5/6 |

### Typiska fel per bild

| Bild | OpenAI (astra/sol) | Jev |
|---|---|---|
| Skeppshult (stökig butik, fel håll) | Gissar märket (Helkama/okänt) och ibland skivbroms; sol säger grön i stället för grå | Märket okänt, skivbroms i stället för rullbroms, ibland elcykel |
| temp 1 (stökig miljö, fel håll) | Rullbroms i stället för V-broms | Skivbroms i stället för V-broms |
| temp 2 (Kildemoes, bra bild) | Turkos, stadscykel, ingen fram-växel (alla modeller överens, se facit nedan) | Samma, plus rullbroms bak |
| temp 3 (Bianchi, mycket lågupplöst) | astra gissade Nishiki; sol hade allt rätt | Fel märke, missar kedjeväxlarna, rullbroms bak |
| temp 4 (Trek racer) | Allt rätt | Missar fram-växeln |
| temp 5 (Pilen elcykel, bra bild) | Allt rätt | Rullbroms i stället för fotbroms |

## Vad vi provade med Jev

1. **v1: enkla frågor.** Ett anrop med bilden i `state`. Varje fält blev en Choice- eller ja/nej-fråga (Noul) på engelska, och märket valdes ur en lista med cirka 65 vanliga märken plus "unknown".
2. **v2: frågor i båda ordningarna + fokus.** Enligt TypeSafes dokumentation föredrar Jev det första alternativet i en Choice. Därför ställdes varje Choice även med omvänd ordning, och sannolikheterna medelvärdesbildades. Frågorna pekar ut "cykeln i förgrunden" för att hantera stökiga bilder. Ger några procentenheter.
3. **v3: ja/nej-frågor om detaljer.** Separata frågor om bromsskiva, fälgbroms och fram- och bakväxel, kombinerade med regler i koden. Ingen förbättring.
4. **v4: närbilder.** Jev hittade framhjul, bakhjul och vevparti med Box-frågor. Koden beskar och förstorade de delarna, och ett andra anrop frågade om dem. Beskärningarna träffade rätt, men Jev tolkade ändå detaljerna fel. **Slutsats: det är modellens syn som begränsar, inte hur frågorna är formulerade.**
5. **Kaskad: Jev först, OpenAI vid osäkerhet (simulerad).** Jevs konfidens skiljer i regel rätt från fel. Men Jev är osäker på bakbromsen på nästan varje bild, så 5 av 6 bilder skulle ändå behöva gå till OpenAI. Ingen besparing. Fram-växeln är dessutom ofta fel trots hög konfidens.

## Facit som kan behöva ses över

- **temp 2 (Kildemoes):** Alla modeller svarar turkos, stadscykel och ingen fram-växel. Cykeln har ett enda drev fram med mittmotor, så "Växel fram: Utvändig" kan vara fel i facit.
- **Skeppshult:** Färgen ligger på gränsen mellan grå och grön.
- **temp 1:** "Broms bak: bakbrom" är otydligt, så det fältet räknades inte.
- Med bara 6 bilder är skillnaderna på några procentenheter inte statistiskt säkra. De stora skillnaderna i kostnad och tid är däremot tydliga.

## Rekommendation och möjliga nästa steg

1. **Nu:** Byt `VISION_MODEL` till `gpt-6.2-sol`. Det är fortfarande ett anrop, ger ungefär 4 gånger lägre kostnad och ungefär 1,7 gånger snabbare svar, utan att tappa träffsäkerhet.
2. **Möjligt hybridflöde:** Jev fyller direkt i färg, typ, dämpare, elcykel och bakväxel (under 0,3 s). Personalen bekräftar bromsar och fram-växel, eller så hämtas de från sol.
3. **Testa Jev igen** när bildstödet blir produktionsklart, eller med exempelbilder per bromstyp och växeltyp i svarsalternativen. Det kräver en egen uppsättning exempelbilder och fler testbilder än sex.

## Köra benchmarken

```bash
cd prototypes/bike-recogniser/bench
# Bilderna måste vara JPEG med namnen skeppshult.jpg, temp1.jpg … temp5.jpg i <imgDir>
node bench.mjs <imgDir> openai,openaiSol,jevV1,jevV2,jevV3,jevV4 2
```

Nycklarna läses från `.env` i projektroten (`EXPO_PUBLIC_OPENAI_API_KEY`, `EXPO_PUBLIC_TYPESAFE_API_KEY`). Facit finns i `bench.mjs` (`TRUTH`), och varianterna finns i `variants.mjs`.

## Källor

- [TypeSafe: Models (pris, ingen fine-tuning)](https://docs.typesafe.ai/models.md)
- [TypeSafe: Images (experimentellt bildstöd, gränser)](https://docs.typesafe.ai/images.md)
- [TypeSafe: Model jaggedness (svagheter, t.ex. alternativordning)](https://docs.typesafe.ai/model-jaggedness.md)
- [GPT-6.2 Astra pricing (eesel)](https://www.eesel.ai/blog/gpt-6-2-astra-pricing)
- [GPT-6.2 Astra/Sol pricing (SmartScope)](https://smartscope.blog/en/blog/gpt-6-2-astra-sol-official-openai-pricing-2026/)
