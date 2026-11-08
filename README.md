# Julelys-beregner

Beregn og tegn ophæng af en lyskæde på loftet. Indtast rummets mål, kædens længde og antal LED, vælg et mønster (zigzag, diamant, slange eller spiral — på væggen juletræ, stjerne, zigzag eller gardin) — så tegnes plantegningen og nøgletallene (kroge, afstande, kæde brugt), inklusive hvor meget ekstra kæde nedhænget mellem krogene koster.

**Åbn:** https://ebersbachdk.github.io/julelys/

- Virker på computer, iPad og telefon
- Kan lægges på hjemmeskærmen (Android: menu → Føj til startskærm · iPhone: Del → Føj til hjemmeskærm) og bruges offline
- "Gem plan som PDF"-knap (browserens egen Gem som PDF)
- **Tegn selv:** tegn et loft med fri form (L-rum, skrå vægge …) — træk i hjørnerne, tryk + for nye hjørner, ret væglængder. Mønstre: Zigzag, Slange (Langs/På tværs — rummet deles i zoner, kæden følger væggen imellem), Spiral og *Følg væggene* (vælg selv hvilke vægge kæden følger)

## Udvikling

- Hele appen er `index.html`. Versionen står kun i `APP_VERSION` — hæv den ved hver udgivelse, så service workeren henter den nye udgave.
- Ikoner: `py tools/make_icons.py` (kræver Pillow) → `icons/`
- Skrifttyper (Fraunces + Hanken Grotesk) hentes fra Google Fonts og caches af service workeren, så de virker offline efter første besøg.
- Test: `node test/harness.js` (ingen afhængigheder, forventet "ALT OK") — geometri, kædepasning og røgtest af hele `update()`.
- Design for "Tegn selv": `docs/plans/2026-11-08-tegn-selv-rum-design.md`
- Lokal test: `py -m http.server 8765` og åbn http://127.0.0.1:8765/ (service workeren kræver http/https, ikke `file://`).
