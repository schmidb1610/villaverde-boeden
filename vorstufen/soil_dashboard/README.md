# Bodenproben-Dashboard

Statische Website zum fiktiven Datensatz `soil_samples_dummy.csv` aus Session 2 des Kurses
„AI-supported Coding with GitHub Copilot“. **Alle Werte sind erfunden** (R-Skript
`generate_soil_samples.R`, `set.seed(42)`).

## Was die Seite zeigt

| Ansicht | Inhalt |
|---|---|
| Übersicht (`#start`) | Hinweis „Fiktive Daten“, Kennzahlen: Proben, Plots, Blöcke, Kampagnen, Beobachter, fehlende und auffällige Werte |
| Tabelle (`#tabelle`) | alle 120 Proben mit Rohwerten; Sortieren per Klick auf den Spaltenkopf, Filter (Block, Artenzahl, Kampagne, Beobachter), Suche nach Proben- oder Plot-ID, Download der gefilterten Zeilen als CSV |
| Graphen (`#graphen`) | Verteilung (Histogramm, Boxplot), Messgröße gegen Artenzahl (log2-Achse), Zeitverlauf je Plot, zwei Größen, Spearman-Korrelationsmatrix (alle Kampagnen / je Kampagne) |
| Datenqualität (`#qualitaet`) | auffällige Werte mit Regel und Erklärung, fehlende Werte je Spalte, Schreibweisen der Beobachter |
| Über die Daten (`#info`) | Codebook, Herkunft, Technik und Farben |

Oben rechts wechselt `DE | EN` die Sprache ohne Neuladen; die Wahl merkt sich der Browser.

**Auffällig heißt nicht falsch.** Die Prüfregeln stehen in `js/daten.js` und leiten sich nur aus
dem Codebook ab (Wertebereiche, Beobachterliste, Kategorien, `NA`) plus einer Regel für die
Biomasse: Abweichung um Faktor ≥ 4 (Konstante `PLOT_FAKTOR_SCHWELLE`) vom Median der Kampagnen
desselben Plots. Nichts wird korrigiert. Der Schalter „Auffällige Werte ausblenden“ wirkt nur in
den Graphen.

## Lokal starten

Die Seite lädt die CSV per `fetch`. Das funktioniert nicht, wenn man `index.html` per Doppelklick
öffnet (`file://`). Deshalb im Ordner dieser README einen kleinen lokalen Server starten:

```bash
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen. Beenden mit `Ctrl + C` im Terminal.

Ohne Server zeigt die Seite einen Hinweis und die Schaltfläche „CSV-Datei wählen“: Damit lässt
sich die CSV (oder eine Datei mit demselben Spaltenschema) direkt laden.

Nützliche Adresszusätze:
- `?lang=en` startet auf Englisch.
- `?akzent=moos` zeigt den zweiten Akzentvorschlag (Moosgrün statt Terrakotta).

Die Graphen brauchen eine Internetverbindung, weil Plotly.js vom CDN geladen wird.

## Aufbau

```
index.html            eine Seite, Ansichten per Hash (#start, #tabelle, …)
css/style.css         Gestaltung; alle Farben als CSS-Variablen in :root
js/i18n.js            alle Texte Deutsch und Englisch, Zahlen- und Datumsformat
js/daten.js           CSV einlesen, Typen, Filter, Prüfregeln
js/tabelle.js         Tabelle, Ansichten Datenqualität und Über die Daten
js/graphen.js         Graphen (Plotly), Farben, Spearman-Korrelation
js/app.js             Steuerung: Laden, Ansichten, Filterzustand, Sprache
data/soil_samples_dummy.csv   Kopie der Original-CSV (unverändert)
```

Kein npm, kein Build-Schritt. Bibliotheken per CDN mit fester Version und Integritäts-Hash:
Plotly.js 4.1.2 und Papa Parse 5.7.0 (geprüft am 29.10.2026).

**Akzentfarbe ändern:** in `css/style.css` die Zeile `--akzent: var(--akzent-terrakotta);` auf
`var(--akzent-moos)` setzen (oder einen eigenen Hex-Wert mit Kontrast ≥ 4,5 : 1 auf Weiß).

**Farben der Daten:** Scientific Colour Maps 8.0.1 (Crameri): kategorial `batlowS`, divergierend
`vik`. Zitieren: Crameri, F. (2018), *Scientific colour maps*, Zenodo, doi:10.5281/zenodo.1243862;
Crameri, Shephard & Heron (2020), *Nature Communications* 11, 5444, doi:10.1038/s41467-020-19160-7.

## Später auf GitHub Pages stellen

Noch nicht geschehen; Push und neues Repository nur nach Bens Ansage.

1. Auf GitHub ein neues, öffentliches Repository anlegen (z. B. `soil-dashboard`).
2. Den Inhalt dieses Ordners (`soil_dashboard/`) als Wurzel des Repositorys hochladen,
   sodass `index.html` ganz oben liegt.
3. Im Repository unter *Settings → Pages* als Quelle „Deploy from a branch“, Branch `main`,
   Ordner `/ (root)` wählen.
4. Nach ein bis zwei Minuten ist die Seite unter `https://<nutzername>.github.io/soil-dashboard/`
   erreichbar. Dort funktioniert `fetch` ohne lokalen Server.
