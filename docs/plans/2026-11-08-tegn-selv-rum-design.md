# Design: "Tegn selv"-rum i Julelys-beregneren

Dato: 2026-11-08 · Status: godkendt, v1.7.0 under implementering

## Formål
Brugeren skal kunne tegne et loft med fri form (L/T/U-rum, skrå vægge) i stedet for kun bredde × længde, og få kæden beregnet til det rum.

## Beslutninger (fra brainstorm)
- **Rumform:** frie polygoner (hjørnepunkter med vilkårlige vinkler).
- **Indtastning:** tegn på gitter (snap 10 cm + fang lige linje til nabohjørne) **og** ret væglængder i tal-felter.
- **Mønstre i frie rum:** Zigzag, Slange, Spiral + nyt mønster **Følg væggene** (vælg selv hvilke vægge). Diamant kun i rektangel-tilstand.
- **Følg væggene:** de valgte vægge **skal hænge sammen** (én sammenhængende kæde). Alle valgt = lukket ring.
- **Indadgående hjørner (zigzag/slange):** kæden følger væggen rundt til næste zone (længden tæller med).

## Brugerflade
- Under *Loft*: vælger **Rumform: Rektangel / Tegn selv**. Væg-fladen er uændret.
- Tegne-tilstand starter med rektanglet fra de indtastede mål.
- Træk i hjørne = flyt (snap). Tryk "+" midt på væg = nyt hjørne. Tryk hjørne = vælg → "Slet hjørne".
- Vægliste (A, B, C …) med redigerbar længde. Ændres væg *i*, flyttes de to næste hjørner med samme forskydning langs væggens retning (næste væg beholder sin vinkel; rektangler forbliver rektangler).
- Ugyldig form (krydsende vægge, < 3 hjørner, for lille areal) → rød kant + besked, ingen beregning.
- Følg væggene: flueben pr. væg i listen + tryk på væggen i tegningen. Indstillelig afstand fra væggen (cm).

## Datamodel
`S.shape = 'rect' | 'poly'`, `S.room = [[x,y], …]` (meter, x = længderetning, y = breddeetning som i loft-plantegningen), `S.sel = [bool pr. væg]`, `S.E` = afstand fra væg (cm). Rummet huskes lokalt i browseren (localStorage, bekvemmelighed). Areal/lysstyrke bruger polygonens areal.

## Beregning
- **Spiral:** omridset skrumpes ind (offset af væglinjer) med fast ringafstand d. D = største gyldige indrykning (bisektion); d = D/k. Kæde-tilstand: største k hvor sum af omkredse ≤ kæde. Afstands-tilstand: k = round(D/afstand). Stopper, når formen ville dele sig/vende (smalle arme begrænser D).
- **Følg væggene:** valgte vægges linjer forskudt indad med afstand e, samlet i hjørner (skæring af naboliniers offset; endepunkter afsluttes mod nabovæggens offset). Krog i hvert knæk + ca. hver meter (afstands-tilstand: valgt krogafstand).
- **Zigzag/slange (v1.8.0):** rummet drejes så længste væg ligger vandret ("Langs/På tværs" drejer 90°), opdeles i zoner ved indadgående hjørner (boustrophedon), hver zone fyldes, kæden følger væggen mellem zoner.
- Kædepasning, nedhæng (to-pas), nøgletal og krog-prikker genbruges uændret — alle mønstre returnerer punkter + stræk.

## Test
`test/harness.js` (Node, ingen afhængigheder) med faste rum (rektangel, L, T, skrå væg, smal U):
- alle kroge inde i rummet / på væggen
- kæde ≤ budget i kæde-tilstand
- sammenhængende kæde
- tegnet rektangel giver samme spiral som rektangel-tilstanden
- ugyldige former afvises; væg-redigering holder rektangler rektangulære
- røgtest af hele `update()` i alle tilstande med DOM-stub
Manuelt: træk/tryk på touch (iPad/mobil).

## Leverance
- **v1.7.0:** tegne-tilstand + Følg væggene + Spiral.
- **v1.8.0:** Zigzag + Slange med zoner.

## Bevidst udeladt
Diamant i frie rum, flere/gemte rum-skabeloner, buede vægge, forhindringer (lamper/ovenlys), tegning af væg-fladen.
