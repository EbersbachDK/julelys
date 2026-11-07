# Julelys-beregner

Beregn og tegn ophæng af en lyskæde på loftet. Indtast rummets mål, kædens længde og antal LED, vælg et mønster (zigzag, diamant, slange eller spiral) — så tegnes plantegningen og nøgletallene (kroge, afstande, kæde brugt), inklusive hvor meget ekstra kæde nedhænget mellem krogene koster.

**Åbn:** https://ebersbachdk.github.io/julelys/

- Virker på computer, iPad og telefon
- Kan lægges på hjemmeskærmen (Android: menu → Føj til startskærm · iPhone: Del → Føj til hjemmeskærm) og bruges offline
- "Gem plan som PDF"-knap (browserens egen Gem som PDF)

## Udvikling

- Hele appen er `index.html`. Versionen står kun i `APP_VERSION` — hæv den ved hver udgivelse, så service workeren henter den nye udgave.
- Ikoner: `py tools/make_icons.py` (kræver Pillow) → `icons/`
- Skrifttyper (Fraunces + Hanken Grotesk) hentes fra Google Fonts og caches af service workeren, så de virker offline efter første besøg.
- Lokal test: `py -m http.server 8765` og åbn http://127.0.0.1:8765/ (service workeren kræver http/https, ikke `file://`).
