/**
 * Verkstadens servicepaket: vad som ingår och när de ska föreslås.
 * Bäddas in i AI-analysens systemprompt så att moment som ingår i ett
 * paket inte debiteras separat. Paketnamn och priser måste matcha
 * raderna i assets/prices.csv (Servicetyp "Servicepaket"/"Tillägg").
 */
export const SERVICE_GUIDE = `SERVICEPAKET – INNEHÅLL OCH REGLER

I grundservice ingår följande ARBETSMOMENT (justeringar/smörjning – inte byten av delar):
- Växeljustering
- Bromsjustering
- Smörjning av kedja
- Kontroll av hjul och lager
- Smörjning av rörliga delar
- Justering av styrlager
- Byte av batteri/lampa i belysningen (arbetet; material tillkommer som produkt)
- Byte av handtag (arbetet; handtagen tillkommer som produkt)
- Åtdragning av skruvar

Paketvarianter (exakta rader i prislistan, Servicetyp "Servicepaket"):
- "Grundservice Fotbromsade cyklar" 599 kr – fotbromsad/oväxlad cykel
- "Grundservice Utanpåliggande växlar" 699 kr – flerväxlad cykel
- "Grundservice – Elcykel" 1299 kr – elcykel med mittmotor
  (elcykel med NAVMOTOR fram/bak tar i stället vanlig grundservice
  + "Elcykel - tillägg")
- "Lådcykelservice" 1899 kr – låd-/lastcykel; innehåller grundservicen samt
  smörjning av kulleder och luftning av bromsar (Shimano, Tektro)
- Kombopaket med däckbyte finns: "Grundservice fotbromsad & däckbyte" 1099 kr,
  "Grundservice och däckbyte utanpåliggande växlar" 1199 kr,
  "Grundservice & däckbyte elcykel" 1699 kr
- "Utökad Grundservice för Tävlings/Träningscyklar" 1199 kr

Tillägg vid grundservice (Servicetyp "Tillägg"):
- "Elcykel - tillägg" – elcykel med motor fram/bak (navmotor)
- "Heltäckande kedjeskydd - tillägg" – cykel med heltäckande kedjeskydd
- "Lådcykeltillägg" och "Tillägg – eldrift på låd-/lastcykel" för låd-/lastcyklar

REGLER FÖR JOBBLISTAN:
1. Om två eller fler av de åtgärder som behövs ingår i ett servicepaket
   (t.ex. växeljustering + bromsjustering + smörjning av kedja): föreslå
   paketet som ETT jobb i stället för de separata momenten. Välj den
   paketvariant som matchar cykeltypen.
2. Lägg ALDRIG separata debiterade jobb för moment som ingår i det valda
   paketet – de ingår i paketpriset.
3. Åtgärder som INTE ingår i paketet läggs som egna jobb precis som
   vanligt (t.ex. hjulriktning, punktering, byte av kedja/kassett/däck/
   bromsbelägg eller andra BYTEN av delar – paketen täcker bara
   justering/smörjning, inte byten, förutom handtag och lampbatteri).
4. Reservdelar/material (kedja, handtag, batteri, däck m.m.) tillkommer
   alltid som produkter, även vid paket.
5. Lägg till rätt tillägg som eget jobb: navmotor fram/bak → "Elcykel -
   tillägg"; heltäckande kedjeskydd → "Heltäckande kedjeskydd - tillägg".
6. Om personalen uttryckligen ber om service/grundservice i inspelningen:
   använd alltid paketet.
7. Om det är tveksamt om ett paket lönar sig (bara en ingående åtgärd
   behövs): lista åtgärderna separat i stället.
8. Vi tar inte emot elsparkcyklar.`;
