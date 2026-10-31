# Böden rund um die Mesa Redonda

Stand: 2026-10-31

Abschlussprojekt im Kurs „AI-supported Coding with GitHub Copilot": eine statische Website zu
echten, offenen Bodendaten aus Villaverde del Río bei Sevilla. Ein 3D-Gelände zeigt die 33
Bodenprofile im Relief, die Daten-Website ergänzt Tour, Karte, Tabelle, Graphen sowie Methoden
und Quellen auf Deutsch und Englisch.

- **Website:** <https://schmidb1610.github.io/villaverde-boeden/>
- **Autor:** Ben Schmidt

## Start

Die Seite läuft ohne Installation im Browser, braucht aber einen Webserver, weil sie ihre Daten
nachlädt. Ein Doppelklick auf `index.html` genügt deshalb nicht. Lokal im Ordner dieses Repos:

```bash
python3 -m http.server 8000
```

Danach `http://localhost:8000` öffnen und mit `Ctrl + C` beenden. Die Internetverbindung wird
für die Bibliotheken unten gebraucht.

## Struktur

| Pfad | Inhalt |
|---|---|
| `index.html` | leitet zum 3D-Gelände weiter |
| `startseite_3d/` | 3D-Gelände mit Einstieg und Bodenprofilen |
| `startseite_3d/daten/` | Höhenraster, Texturen, Kacheln, OSM-Auszug, Profile |
| `startseite_3d/schrift/` | Schriftdateien Geist und Geist Mono mit Lizenztexten |
| `startseite_3d/index.html`, `startseite.css`, `startseite.js`, `intro.js`, `texte.js` | Seite, Gestaltung und Logik |
| `website/` | Daten-Website, eigene Beschreibung in `website/README.md` |
| `website/index.html`, `website/README.md` | Seite und technische Beschreibung |
| `website/bilder/`, `website/css/`, `website/data/`, `website/js/` | Bilder, Gestaltung, Daten, Logik |
| `vorstufen/` | zwei frühere Fassungen zu einem erfundenen Datensatz |
| `vorstufen/soil_dashboard/` | interaktives Dashboard, **fiktive Daten** |
| `vorstufen/soil_tabelle_statisch/` | statische Tabelle, **fiktive Daten** |
| `docs/` | Projektdokumentation `KI-Coding_Schmidt_Abschlussprojekt_villaverde_v1.pdf` |
| `LICENSE` | MIT-Lizenz für den Code |
| `.nojekyll` | GitHub Pages liefert die Dateien unverändert aus |

## Datenquellen

- **Bodendaten:** Rentschler, T., Rau, K., & Scholten, T. (2024). *Soil quality data from Mesa
  Redonda at Villaverde del Río (ES-SE), field campaign 2023-03* (Version 1.0.0) [Data set].
  University of Tübingen. <https://doi.org/10.57754/FDAT.cmgnm-1ra17>
- **Laborwerte Lora del Río:** Die Laborchemie in `website/data/laborchemie.tsv` enthält
  zusätzlich 93 Proben aus Rentschler et al. (2021), <https://doi.org/10.1594/PANGAEA.938522>.
  Die Website zeigt sie nicht.
- **Geländemodell:** Instituto Geográfico Nacional, *Modelo Digital del Terreno MDT02, 2ª
  cobertura*. Obra derivada de MDT02-cob2 2015-2021 CC-BY 4.0 scne.es
- **Karte:** Gewässer, Straßen, Bahn und Ortsnamen © OpenStreetMap-Mitwirkende.

Alle Quellen und Literaturangaben stehen auf der Website unter „Methoden und Quellen".

## Lizenzen

| Bestandteil | Lizenz |
|---|---|
| Code dieses Repos | MIT (`LICENSE`) |
| Bodendaten in `website/data/` | CC BY 4.0; unveränderte Kopien, nur umbenannt |
| `website/data/hoehe_dgm.csv`, Höhenraster, Texturen und Kacheln | abgeleitet aus MDT02, CC BY 4.0; gemittelt, Schummerung und Höhenfarben berechnet |
| `startseite_3d/daten/osm.json`, eingebrannte Wasserflächen der Texturen | ODbL 1.0, © OpenStreetMap-Mitwirkende |
| Plotly.js, Papa Parse, Three.js | MIT, per CDN geladen |
| Schrift Geist, Geist Mono | SIL OFL 1.1, Lizenztexte in `startseite_3d/schrift/` |
| Farben: Scientific Colour Maps (Crameri) | MIT |

## Technik

Statisches HTML, CSS und JavaScript ohne Build-Schritt. Über jsDelivr geladen werden Plotly.js
4.1.2, Papa Parse 5.7.0 und Three.js 0.186.1. Die Schrift Geist liegt in `startseite_3d/schrift/`.

## KI-Nutzung

Der Code entstand per Vibecoding: Claude Code setzte um, Ben Schmidt gab die Ziele vor, prüfte
und entschied. Für die Gestaltung wurde Claude Design genutzt. Inhalte und Kennzahlen wurden
gegen die Originalquellen geprüft. Einzelheiten stehen in der Projektdokumentation in `docs/`.
