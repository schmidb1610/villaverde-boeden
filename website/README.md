# Website – Böden der Mesa Redonda (Villaverde del Río)

Stand: 2026-10-31

Statische Website zu den echten Bodendaten der Mesa Redonda (Rentschler, Rau & Scholten 2024,
CC BY 4.0). Nachfolger des Dummy-Dashboards aus Session 3
(`vorstufen/soil_dashboard/` im Repo): gleicher Aufbau und
Stil, aber neues Datenmodell, neue Ansichten und neue Prüfregeln. Die 3D-Startseite liegt
daneben in `../startseite_3d/`.

## Was die Seite zeigt

| Ansicht | Inhalt |
|---|---|
| Übersicht (`#start`) | Nach Claude Design 5a: Gelände als Bühne (Dunkel/Relief je Thema), Kennzahlen als Band, Ansichten nach der Frage geordnet, die sie beantworten (Verstehen, Erkunden, Nachschlagen), mit Vorschau aus den echten Daten (`js/uebersicht.js`) |
| Hintergrund (`#hintergrund`) | Geführte Tour in sechs Stationen über dem 3D-Gelände (Frage, Gebiet, Beprobung, Vom Spektrum zum Wert, Ergebnis, Bewertung); Gelände im Rahmen `../startseite_3d/index.html#tour`, unter 700 px Standbild aus `bilder/` |
| Karte (`#karte`, `#karte/21`) | Profile in UTM 30N, Farbe = gewählte Größe in gewählter Tiefe (batlow); Klick öffnet den Steckbrief mit allen Werten und einem Tiefenprofil |
| Tabelle (`#tabelle`) | Modell- oder Laborwerte nach Claude Design 4a: Größen-Leiste mit Verteilung, Fokus-Spalte (Wert oder Δ Median), Bereichsfilter, Zahl/Balken, Spaltengruppen, Dichte, Fußzeilen Median und Spanne; Filter nach Tiefe, Suche und Auswahl von Profilen/IDs; CSV-Download; Herkunft je Spalte (M/A/I/G) |
| Graphen (`#graphen`) | Sechs Tabs, gezeichnet wird nur der sichtbare: Verteilung, Tiefenprofile, Größe gegen Höhe, zwei Größen, Körnungsdreieck, Spearman-Matrix (alle Tiefen / je Tiefe) |
| Methoden und Quellen (`#info`) | Methoden, Quellen und Lizenzen, Hinweis zum Qualitätsindex, Literatur (APA 7) |

Unter der Suche (Tabelle, Graphen) lassen sich im Dropdown einzelne Profile oder Labor-IDs ankreuzen, auch mehrere, getrennt je Quelle (`js/auswahl.js`).

`DE | EN` oben rechts; `?lang=en` startet auf Englisch. Die Wahl liegt in `villaverde.sprache`; das 3D-Gelände liest denselben Speicher (`../startseite_3d/texte.js`).

**Farbthema:** Mond/Sonne oben rechts schaltet Hell/Dunkel. Gespeichert als `villaverde.thema`; ein Klick
auf den Stil im 3D-Bedienfeld setzt denselben Schlüssel. Die 3D-Seite selbst startet immer dunkel. Ohne
gespeicherte Wahl folgt die Website der Systemeinstellung. Der Link „3D-Gelände" führt mit `#gelaende`
am Einstieg (`startseite_3d/intro.js`) vorbei direkt ins Gelände. Farben stehen als Variablen in `css/style.css`
(`:root[data-thema="dunkel"]`); die Plotly-Graphen lesen sie beim Zeichnen (`cssFarbe` in `js/graphen.js`),
Kategorienfarben im Dunkeln: batlowS ohne Töne unter 3 : 1 auf #1c1c1e.

**Gestaltung:** Übersicht, Karte, Tabelle, Graphen, Kopf und Fuß nach Claude Design Runde 2 (Arbeitsmaterial, nicht im Repo, 30.10.2026). Die Ansicht Datenqualität ist seit 30.10.2026 entfernt (Ben); Prüfregeln und Marken ! in Tabelle und Steckbrief bleiben.

## Daten (`data/`)

Unveränderte Kopien der FDAT-Dateien, nur umbenannt (MD5 geprüft am 29.10.2026):

| Datei hier | Original | Trennzeichen |
|---|---|---|
| `standorte.csv` | `Soil profile ids and locations.csv` | Komma |
| `laborchemie.tsv` | `Wet chemistry analysis.csv` | Tab |
| `modell_0-30cm.csv` | `Model predictions and soil quality estimation - 0-30 cm.csv` | Komma |
| `modell_40-60cm.csv` | `… - 40-60 cm.csv` | Semikolon |
| `modell_70-100cm.csv` | `… - 70-100 cm.csv` | Semikolon |
| `hoehe_dgm.csv` | eigene Abfrage: Feld `hoehe_dgm_m` aus `verarbeitet/bohrpunkte_villaverde.gpkg` (nicht im Repo) | Komma |

`hoehe_dgm.csv` ist aus dem MDT02 abgeleitet. Deshalb steht die IGN-Nennung
„Obra derivada de MDT02-cob2 2015-2021 CC-BY 4.0 scne.es“ überall dort, wo Höhen erscheinen
(Kartenfuß, Höhen-Graph, Tabelle, Seitenfuß). Konstante `DGM_NENNUNG` in `js/app.js`.

## Entscheidungen im Code

- **Laborzeilen:** Nur IDs aus dem Standortverzeichnis (39), die übrigen 93 gehören zu Lora del Río.
  **Profil und Tiefe kommen aus der Laborchemie selbst**, nicht über die ID aus dem
  Standortverzeichnis: Bei 20 Zeilen (Profile 19, 21, 23, 28, 29, 32) ist die ID dort um 1 verschoben,
  die Laborchemie ist in sich stimmig. Welche Datei recht hat, ist offen (Prüfregel `id-versatz`).
- **Messung ↔ Modell** über Profil + Tiefe (nur 40–60 und 70–100 cm), nicht über die ID.
- Nichts wird korrigiert; Tabelle und Steckbrief zeigen Rohtexte (Dezimalzeichen je Sprache).
- 2D-Karte ohne Hintergrundkarte. OSM ist inzwischen als Quelle D4 geklärt (3D-Startseite); ob die
  2D-Karte sie auch nutzt, entscheidet Ben.

## Lokal starten

Im Ordner `website/`:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen, beenden mit `Ctrl + C`.

**Zusammen mit der 3D-Startseite** (Menüpunkt „3D-Gelände“ verlinkt auf `../startseite_3d/`): Server eine
Ebene höher starten und `http://localhost:8000/website/` bzw. `http://localhost:8000/startseite_3d/` öffnen:

```bash
python3 -m http.server 8000
```

Die 3D-Seite verlinkt auf die Hashes `#start`, `#hintergrund`, `#karte`, `#karte/<Nr>`, `#tabelle`, `#graphen`,
`#info` – diese Namen nicht ändern. Ohne Server bietet die Seite einen
Datei-Wähler (alle Dateien aus `data/` auf einmal wählen). Karte und Graphen brauchen Internet
(Plotly.js vom CDN).

## Aufbau

```
index.html        eine Seite, Ansichten per Hash
css/style.css     Gestaltung (vom Dashboard übernommen, unten Ergänzungen Villaverde)
js/i18n.js        alle Texte DE/EN, Zahlen- und Tiefenformat
js/texte_hintergrund.js  Texte der Ansicht Hintergrund (DE/EN), mit Belegliste im Kopf
js/tour.js        Geführte Tour Hintergrund: Stationen, Kamera, Marken
js/daten.js       Dateien einlesen, zusammenführen, Prüfregeln, Paare Messung/Modell
js/tabelle.js     Tabelle
js/graphen.js     Graphen (Plotly), Farben (Crameri), Spearman
js/karte.js       Karte und Profil-Steckbrief
js/app.js         Steuerung: Laden, Ansichten, Zustand, Sprache
data/             siehe oben
```

Bilder in `bilder/`: `start_dunkel.webp` `start_relief.webp` `station_1.webp` `station_1_relief.webp` `station_2.webp` `station_2_relief.webp` `station_3.webp` `station_3_relief.webp` `station_4.webp` `station_4_relief.webp` `station_5.webp` `station_5_relief.webp` `station_6.webp` `station_6_relief.webp`.

Bibliotheken per CDN mit fester Version und Integritäts-Hash: Plotly.js 4.1.2, Papa Parse 5.7.0.
Farben: Scientific Colour Maps 8.0.1 (batlow, batlowS, vik); Stützstellen von batlow aus der
lokalen Ablage `batlow/batlow.txt` gelesen (Indizes 0, 26, … 255).

## Geprüft (29.10.2026, Claude Code)

- Kennzahlen in Node gegen Python-Nachrechnung und `daten_inventar.md`: 33 Profile, 147 Proben,
  85 Modell-, 39 Laborzeilen, 93 fremde; Mediane SOC 0,74 / 0,69 / 0,70 %, pH 6,39 / 7,03 / 7,21.
- Alle Ansichten in Chrome (headless, 1440 px, DE und EN) angesehen.
- Ansicht Hintergrund (29.10.2026): jede Aussage gegen Kurzbericht, FDAT-Seite und Rentschler et al. (2022)
  gelesen; Literatur mit Crossref abgeglichen; 1440/390 px, DE/EN, keine offenen Textschlüssel.
- Nt in den Modelldateien als Herkunft „unklar“ (?) markiert: keine Quelle beschreibt ihn.
- Noch nicht: Klick-Verhalten der Karte von Hand (Ben).
