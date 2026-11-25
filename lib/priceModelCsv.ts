// Auto-generated from assets/price-model/*.csv — regenerate with the snippet in assets/price-model/README.md
export const PRICE_MODEL_CSV = {
  parts: `part_id,parent_id,name,inspection_items
wheel,,Hjul,front:front-rim|rear:rear-rim
tire,wheel,Däck,front:front-tire|rear:rear-tire
tubeless,tire,Tubeless,
tube,wheel,Slang,front:front-tire|rear:rear-tire
spokes,wheel,Ekrar,
hub,wheel,Nav/hjullager,front:front-hub|rear:rear-hub
brake,,Broms,front:front-brake|rear:rear-brake
brake_pads,brake,Bromsbelägg,
brake_disc,brake,Bromsskiva,
brake_cable,brake,Bromsvajer,mid-cables
brake_lever,brake,Bromsok/handtag/reglage,
drivetrain,,Drivlina,
chain,drivetrain,Kedja,drive-chain
cassette,drivetrain,Kassett/frikrans,drive-cassette
jockey_wheels,drivetrain,Rulltrissor,drive-derailleur
chainring,drivetrain,Framdrev/klinga,drive-chainrings
crankset,drivetrain,Vevparti,drive-chainrings
crank_arm,crankset,Vevarm,
bottom_bracket,drivetrain,Vevlager,drive-bb
pedals,drivetrain,Pedaler,drive-pedals
derailleur,drivetrain,Växel,drive-derailleur
derailleur_hanger,derailleur,Växelöra,
hub_gear,drivetrain,Navväxel,rear-hub
shifter,drivetrain,Växelreglage,mid-cables
shift_cable,drivetrain,Växelvajer,mid-cables
cockpit,,Styrdel,mid-stem
handlebar,cockpit,Styre,
bar_tape,cockpit,Styrlinda,mid-bartape
stem,cockpit,Styrstam,
headset,cockpit,Styrlager,ground-headset
grips,cockpit,Handtag,
frame,,Ram,mid-frame
saddle,frame,Sadel/sadelstolpe,mid-saddle
kickstand,frame,Stöd,mid-kickstand
accessories,,Tillbehör,mid-accessories
fender,accessories,Stänkskärm,
rack,accessories,Pakethållare,
light,accessories,Belysning,
chain_guard,accessories,Kedjeskydd,
skirt_guard,accessories,Kjolskydd,
basket,accessories,Korg,
child_seat,accessories,Barnstol,
lock,accessories,Lås,
electric,,Elsystem,
display,electric,Display,
other,,Övrigt,`,
  actions: `action_id,name
replace,Byt
adjust,Justera
clean_lube,Rengör/Smörj
align,Rikta
bleed,Lufta
build,Bygg
service,Service
mount,Montera
repair,Reparera
troubleshoot,Felsök
refill,Fyll på
open,Öppna`,
  prices: `part_id,action_id,conditions,label,price,has_product
tire,replace,,,299,true
tire,replace,position=both,,499,true
tire,replace,mounting=loose,,329,true
tubeless,mount,,,699,false
tubeless,refill,,,299,false
tube,replace,,,299,true
tube,replace,position=both,,499,true
tube,replace,mounting=loose,,229,true
tube,replace,item=trolley,,199,true
wheel,align,,,499,true
wheel,align,mounting=loose,,449,true
wheel,align,hub_motor=yes,,899,true
wheel,replace,,,399,true
wheel,build,,,1299,true
wheel,build,hub_motor=yes,,1599,false
hub,adjust,,,199,false
hub,replace,,,399,true
hub,service,position=front,,349,false
hub,service,position=rear;gears=external,,499,false
hub,service,position=rear;gears=hub,,499,false
brake,adjust,,,169,false
brake,bleed,,,399,false
brake_pads,replace,brake_type=disc,,249,true
brake_pads,replace,brake_type=rim,,169,true
brake_disc,replace,,,299,true
brake_disc,align,,,169,false
brake_cable,replace,position=front,,279,false
brake_cable,replace,position=rear,,329,false
brake_lever,replace,,,299,true
brake_lever,replace,brake_system=hydraulic,inkl. luftning,499,true
chain,replace,,,449,true
chain,replace,gears=external,,349,true
chain,replace,gears=hub,,399,false
chain,adjust,gears=hub,,199,true
chain,clean_lube,,,59,false
cassette,replace,gears=external,,359,true
jockey_wheels,replace,gears=external,,249,true
chainring,replace,,,329,true
crankset,replace,,,499,true
crank_arm,replace,,vänster sida,229,true
crank_arm,repair,,helsmidd fauber,799,true
bottom_bracket,replace,,,699,true
pedals,replace,,,169,true
derailleur,replace,gears=external,,429,true
derailleur,adjust,position=both;gears=external,,349,false
derailleur_hanger,replace,gears=external,,299,true
derailleur_hanger,align,gears=external,,259,false
hub_gear,adjust,gears=hub,,169,false
hub_gear,service,gears=hub,,699,false
hub_gear,replace,gears=hub,navinsats,599,true
shift_cable,replace,gears=hub,,299,true
shift_cable,replace,gears=external,,299,true
shift_cable,replace,bike_type=racer,,499,true
shifter,replace,,,369,true
shifter,replace,gears=hub,,399,true
shifter,replace,bike_type=racer,,599,true
shifter,replace,routing=internal,,549,true
handlebar,replace,,,499,true
handlebar,replace,bike_type=racer,,799,true
handlebar,replace,bike_type=racer;routing=internal,inkl. hydraulik,1699,true
bar_tape,replace,bike_type=racer,,329,true
stem,replace,,,249,true
headset,replace,,,349,true
headset,adjust,,,179,false
grips,replace,,,139,true
saddle,replace,,,149,true
kickstand,replace,,,249,true
kickstand,mount,,,159,true
fender,mount,fender_type=simple,,299,true
fender,mount,fender_type=complex,,399,true
fender,mount,fender_type=complex;position=both,inkl. demontering,449,true
fender,mount,fender_type=no_stays,,329,true
rack,mount,,,249,true
rack,mount,,inkl. demontering,349,true
light,mount,,,199,true
light,mount,dynamo=yes,,249,true
light,repair,,,299,false
light,troubleshoot,dynamo=yes,,229,false
chain_guard,mount,,utanpå,299,true
chain_guard,mount,,innanför vevlager,399,true
skirt_guard,mount,,,149,true
basket,mount,,,299,true
child_seat,mount,,,249,true
lock,mount,,,199,true
display,replace,electric=yes,,599,true
electric,troubleshoot,electric=yes,,999,false
lock,open,,+ 100 kr per klinga,449,false
other,repair,,gänginsats,400,false
other,mount,,kr per min minst 20 min,25,true
other,troubleshoot,,besiktning skadad cykel inkl. offert till försäkringsbolag,499,false`,
  standardProducts: `part_id,action_id,product,quantity,price,auto
tire,replace,Schwalbe Road Cruiser,1,,false
tire,replace,Schwalbe Marathon,1,,false
tire,replace,Schwalbe Marathon Plus,1,,false
tire,replace,Routa W248 42-622,1,,false
tire,replace,Routa W124 42-622,1,,false
tire,replace,Routa W244 35-622,1,,false
tire,replace,Routa W122 35-622,1,,false
tire,replace,Routa W244 Ebike 35-622,1,,false
tire,replace,Routa W248 E-Bike 42-622,1,,false
tube,replace,Standardslang,1,100,true
wheel,align,Eker,1,33,false
tire,replace,Standardslang,1,100,false`,
  packages: `package_id,name,conditions,price,covers
basic_hub,Grundservice Fotbromsade cyklar,gears=hub,599,derailleur.adjust|brake.adjust|chain.clean_lube|hub.adjust|headset.adjust
basic_external,Grundservice Utanpåliggande växlar,gears=external,699,derailleur.adjust|brake.adjust|chain.clean_lube|hub.adjust|headset.adjust
basic_electric,Grundservice – Elcykel,electric=yes,1299,derailleur.adjust|brake.adjust|chain.clean_lube|hub.adjust|headset.adjust
extended_racer,Utökad Grundservice för Tävlings/Träningscyklar,bike_type=racer,1199,derailleur.adjust|brake.adjust|chain.clean_lube|hub.adjust|headset.adjust
cargo,Lådcykelservice,bike_type=cargo,1899,derailleur.adjust|brake.adjust|brake.bleed|chain.clean_lube|hub.adjust|headset.adjust
chain_cassette,Byte Kedja & kassett/frikrans,gears=external,599,chain.replace|cassette.replace
drivetrain,Byte drivlina (vevparti - kedja - kassett - rulltrissor och justering),gears=external,999,crankset.replace|chain.replace|cassette.replace|jockey_wheels.replace|derailleur.adjust`,
  addOns: `add_on_id,name,conditions,price,note
electric,Elcykel - tillägg,electric=yes,99,Grundservice på elcykel med navmotor fram/bak
full_chain_guard,Heltäckande kedjeskydd - tillägg,gears=hub,119,Cykel med heltäckande kedjeskydd
cargo,Lådcykeltillägg,bike_type=cargo,199,Låd-/lastcykel
cargo_electric,Tillägg – eldrift på låd-/lastcykel,bike_type=cargo,399,Låd-/lastcykel med eldrift
express,Expresstillägg (klart inom 1 tim),,99,Bara när personalen säger express eller klart inom en timme`,
  conditions: `condition,label
position=front,fram
position=rear,bak
position=both,fram+bak
mounting=loose,löst hjul
hub_motor=yes,navmotor
brake_type=disc,skivbroms
brake_type=rim,fälgbroms
brake_system=hydraulic,hydraulisk
dynamo=yes,dynamo
fender_type=simple,enkla
fender_type=complex,svårare
fender_type=no_stays,utan stag
routing=internal,intern dragning
gears=hub,navväxel
gears=external,utanpåliggande växlar
electric=yes,elcykel
bike_type=racer,racer
bike_type=cargo,lådcykel
item=trolley,barnvagn
item=part,lös del`,
};
