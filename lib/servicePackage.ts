import { ADD_ONS, CONDITION_LABELS, PACKAGES } from './prices';

/** "gears=hub" → "navväxel", for the package and add-on lists below. */
const whenText = (conditions: Record<string, string>) => {
  const labels = Object.entries(conditions).map(([k, v]) => CONDITION_LABELS.get(`${k}=${v}`) ?? `${k}=${v}`);
  return labels.length ? ` – gäller ${labels.join(', ')}` : '';
};

const PACKAGE_LINES = PACKAGES.map(
  (p) => `- "${p.title}" ${p.price} kr${whenText(p.conditions)}. Ingår: ${p.covers.join(', ')}`
).join('\n');

const ADD_ON_LINES = ADD_ONS.map(
  (a) => `- "${a.title}" ${a.price} kr${whenText(a.conditions)}${a.note ? ` – ${a.note}` : ''}`
).join('\n');

/**
 * Verkstadens servicepaket: vad som ingår och när de ska föreslås.
 * Bäddas in i AI-analysens systemprompt så att moment som ingår i ett
 * paket inte debiteras separat. Paket- och tilläggslistorna byggs från
 * assets/price-model/packages.csv och add_ons.csv.
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

Paket (exakta rader i prislistan, Servicetyp "Service"):
${PACKAGE_LINES}
- Elcykel med mittmotor tar "Grundservice – Elcykel"; elcykel med NAVMOTOR
  fram/bak tar i stället vanlig grundservice + "Elcykel - tillägg".

Tillägg (exakta rader i prislistan, Servicetyp "Tillägg"):
${ADD_ON_LINES}

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
   "Expresstillägg (klart inom 1 tim)" läggs BARA till när personalen
   uttryckligen säger express, klart inom en timme eller liknande.
6. Om personalen uttryckligen ber om service/grundservice i inspelningen:
   använd alltid paketet.
7. Om det är tveksamt om ett paket lönar sig (bara en ingående åtgärd
   behövs): lista åtgärderna separat i stället.
8. Vi tar inte emot elsparkcyklar.`;
