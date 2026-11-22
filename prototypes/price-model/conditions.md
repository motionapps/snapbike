Villkor i prices.csv och standard_products.csv (kolumnen conditions, `;`-separerade, alla måste stämma):

- Delens parametrar: position=rear, mounting=loose, motor=yes, brake_type=disc …
- Cykelns egenskaper (från bildanalysen): gears=hub|external, electric=yes, bike_type=racer|cargo
- Typ av sak på bilden: item=trolley|part

Tom conditions = grundpriset. Den rad med flest uppfyllda villkor vinner.
