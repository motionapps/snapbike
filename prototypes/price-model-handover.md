# Price model prototype: handover

You are continuing design work on a new PRICE MODEL prototype for Snapbike, a React Native/Expo app used by bike-workshop staff. The repo is /Users/bo/Documents/ReactPages/snapbike and the current branch is `diverge`. Read CLAUDE.md and AGENTS.md in the repo, plus ~/.claude/CLAUDE.md, first. The user wants you to ask before building anything whose scope is unclear, and to keep changes minimal. Talk to the user in Swedish. Write code identifiers, CSV ids and condition values in English. Text that workshop staff see stays Swedish.

## Goal
Keep developing the hierarchical price-model prototype in /Users/bo/Documents/ReactPages/snapbike/prototypes/price-model/ and its interactive artifact page. Wait for the user's next instruction; there is no open coding task. The model has to be simple, easy to overview, and make prices easy to change. Later it will become Supabase tables, because prices may differ per customer (that is "option 3", which the user chose). The user decided to work on the HIERARCHICAL variant only. The flat variant is abandoned.

## How it fits together (no live link)
- The CSV files in prototypes/price-model/ are the source of truth.
- The artifact page embeds a snapshot of them as JSON on the line `const DATA = {...};` (around line 150) and does all calculations in the browser.
- The app does NOT read these files. It still uses /Users/bo/Documents/ReactPages/snapbike/assets/snapbike_prices.csv, which a node snippet in the README turns into lib/priceCsv.ts and lib/standardProductsCsv.ts.
- Price edits made in the page are local to the browser only and are never written back to the CSVs.

## Files (prototypes/price-model/)
- **actions.csv**: action_id,name,in_repair_set,needs_product,note.
  - Ids: replace (Byt), adjust, clean_lube, align (Rikta), bleed, build, service, mount, repair, troubleshoot, refill (Fyll på).
  - replace = remove an old part and fit a new one. mount = fit a part where none was.
- **parameters.csv**: parameter,name,values,note.
  - position front|rear|both; mounting on_bike|loose; motor no|yes; brake_type disc|rim; brake_system mechanical|hydraulic; dynamo no|yes; fender_type simple|complex|no_stays; routing external|internal.
- **hierarchical/parts.csv**: part_id,parent_id,name,parameters,has_repair,extra_actions,child_actions,requires,inspection_items,note.
  - A child inherits its parent's parameters and its child_actions (not its extra_actions).
  - has_repair=true gives the part replace|adjust|clean_lube.
  - The `requires` syntax is `prep[:actions][@side]`. Examples: wheel → `wheel_off`; brake_disc → `wheel_off:replace`; cassette → `wheel_off@rear`; hub_gear → `wheel_off:replace|service@rear`. A part's requirements come from its own entry plus every ancestor's (they accumulate, a child cannot override them).
  - inspection_items look like `front:front-rim|rear:rear-rim`.
  - `rim` was removed. `tubeless` is a part under `tire` with the actions mount|refill.
- **prices.csv**: part_id,action_id,conditions,price,has_product,source,note. About 89 rows.
  - `source` is the row name from the original price-list CSV.
  - wheel,replace = 399 (taken from "Byte bakhjul - däck och drev/kassett").
  - tubeless,mount 699; tubeless,refill 299.
  - There is no tire position=both row; a rule computes it.
- **standard_products.csv**: part_id,action_id,conditions,product,quantity,unit_price,note. The Routa stud tyres are rows on tire.replace position=both with fixed unit prices (W248 900, W124 750, W244 850, W122 699.5, ebike 1000/1050). Example: 499 + 2×900 = 2299.
- **rules.csv**: rule_id,scope,type,from_action,to_action,factor,second_side_percent,rounding,note.
  - The scope that is nearest wins: the part, then its ancestors, then `*`.
  - replace_from_mount (`*`): replace = mount × 1.5, rounded to …9.
  - both_sides (`*`): front+rear = one side + 67% for the other side, so 299 becomes 499.
  - brake_both_sides (brake): 50%.
- **preps.csv**: prep_id,name,conditions,value,note. wheel_off "Hjulet av": front 50, rear 100, rear+gears=hub 200. The values are made-up EXAMPLES; the user still has to set real ones.
- **packages.csv**: service packages. `covers` uses refs like `tire.replace[position=both]`. The rear_wheel_swap package was removed.
- **conditions.md**: the condition syntax, written in Swedish. Conditions are `;`-separated and all of them must match; the row with the most conditions wins. Besides the part parameters there are bike-level conditions: gears=hub|external, electric=yes, bike_type=racer|cargo, item=trolley|part.
- **flat/parts.csv**: OUTDATED and abandoned. It still has rim, tubeless as an action, and Swedish fram:/bak:. Ignore it unless the user asks.

## Combination discount (the latest design)
There is no list of job pairs. A part declares which preparation step (prep) it requires. On each side (front or rear), the most expensive job pays for the prep, and every further job on that side that needs the same prep gets the prep's value deducted. Jobs on different sides get no discount. Example: rear tire 299 + rear align 499 − 100 = 698.

## Artifact
- Hierarchical page: https://claude.ai/artifact/YB5EMkRFoxNVbgwgx9PHr4 (version 6, shared "anyone with link").
- Local source (from the previous session's scratchpad, which may have been cleared): /private/tmp/claude-501/-Users-bo-Documents-ReactPages-snapbike/3228c872-feb8-459b-b881-f7c4148ec9cc/scratchpad/price-ui/price-list-hier.html. The template is template.html in the same folder and uses the placeholders `__TITLE__ __EYEBROW__ __HEADING__ __LEDE__ __MODE__ __DATA__`. If the folder is missing, use the Artifact tool's `read` action on the URL to get the HTML back, then publish with that `url`.
- How the page is rebuilt (there is no saved script): with Python, load the CSVs via `csv.DictReader` into `{"actions","parameters","prices","std","rules","preps","parts"}`. Keep that key order; parts comes from hierarchical/parts.csv. Then replace the JSON on the `const DATA = ...;` line with `json.dumps(..., ensure_ascii=False)` and republish to the same URL.
- Page JS:
  - The `COND` map (around line 152) maps condition strings to Swedish labels. Every new condition value needs a label there.
  - Main functions: inheritedActions, allowedActions, scopeChain, nearestRule, roundPrice, computedBase, computedBoth, requirements, priceInContext, prepValue, comboCandidates, renderCombo, renderRules.
  - The combination calculator hardcodes its context to `SIDES [["front","Fram"],["rear","Bak"]]`, with motor "no", brake_type "disc" and brake_system "mechanical".
- The old flat artifact https://claude.ai/artifact/J6fpgb4EMNA5MaPTqeJC4S is outdated.

## Known limitations / open questions
- Requirements accumulate down the tree, so tubeless refill also gets the wheel_off discount even though refilling doesn't need the wheel off. The fix is not done. One option: let a part override or limit what it inherits.
- An order for "both" sides is not combined with jobs on each side, and loose wheels (mounting=loose) are ignored in the calculator.
- Questions the user has not answered yet:
  - Should the W248 standard product (900 kr) go into the real CSV in assets/?
  - Should prices added manually in the app apply the fixed prices?
  - Should the AI prompts in the app (lib/api.ts, which git status currently shows as deleted and possibly moved to lib/llm-communication/; not verified) be updated for the new front/rear puncture and brake-pad rows?
  - Should we look at BikeOffice's existing article/workshop tables (Supabase staging project id raicruyijawlflvqijtd) and propose a concrete table structure for the move to Supabase?
- Nothing in prototypes/ is committed (it is untracked). Commit only if the user asks.
