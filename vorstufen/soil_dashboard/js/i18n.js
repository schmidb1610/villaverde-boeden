/* i18n.js – alle sichtbaren Texte (DE und EN) an einer Stelle.
   Platzhalter in geschweiften Klammern, z. B. {n}, werden von t() ersetzt.
   Statische Texte im HTML tragen data-i18n="schluessel". */

const TEXTE = {
  de: {
    "seite.titel": "Bodenproben – fiktiver Grünland-Versuch",
    "marke": "Bodenproben",
    "sprache": "Sprache",
    "nav.label": "Ansichten",
    "nav.start": "Übersicht",
    "nav.tabelle": "Tabelle",
    "nav.graphen": "Graphen",
    "nav.qualitaet": "Datenqualität",
    "nav.info": "Über die Daten",
    "fuss": "Fiktive Daten · Kursprojekt „AI-supported Coding with GitHub Copilot“ · Ben Schmidt, 2026",

    /* Laden */
    "laden.lade": "Daten werden geladen …",
    "laden.titel": "Daten konnten nicht geladen werden",
    "laden.text": "Die Seite liest data/soil_samples_dummy.csv. Das klappt nicht, wenn index.html direkt als Datei (file://) geöffnet wird. Entweder im Terminal einen lokalen Server starten und http://localhost:8000 öffnen:",
    "laden.oder": "oder die CSV-Datei hier auswählen (gleiches Spaltenschema wie soil_samples_dummy.csv):",
    "laden.knopf": "CSV-Datei wählen",
    "laden.schema": "Die Datei hat nicht das erwartete Spaltenschema. Es fehlen: {spalten}",
    "laden.leer": "Die Datei enthält keine Datenzeilen.",

    /* Übersicht */
    "start.eyebrow": "Kursprojekt · AI-supported Coding with GitHub Copilot",
    "start.titel": "Bodenproben aus einem Grünland-Versuch",
    "start.lead": "{proben} Bodenproben von {plots} Versuchsflächen (Plots) in {bloecke} Blöcken, jede Fläche in {kampagnen} Kampagnen 2025 beprobt. Gemessen wurden Bodenfeuchte, Bodentemperatur, pH, organischer Kohlenstoff und oberirdische Biomasse.",
    "fiktiv.titel": "Fiktive Daten",
    "fiktiv.text": "Alle Werte sind synthetisch erzeugt (R-Skript generate_soil_samples.R, set.seed(42)). Es handelt sich nicht um echte Messungen.",
    "kachel.proben": "Proben",
    "kachel.plots": "Plots",
    "kachel.bloecke": "Blöcke",
    "kachel.kampagnen": "Kampagnen",
    "kachel.beobachter": "Beobachter",
    "kachel.fehlend": "Fehlende Werte",
    "kachel.auffaellig": "Auffällige Werte",
    "zusatz.plots": "je {n}× beprobt",
    "zusatz.bloecke": "je {n} Plots",
    "zusatz.kampagnen": "{liste}",
    "zusatz.beobachter": "{n} Schreibweisen im Datensatz",
    "zusatz.fehlend": "NA-Zellen in {n} Proben",
    "zusatz.auffaellig": "in {n} Proben · Liste ansehen",
    "start.weiter": "Ansichten",
    "weg.tabelle": "Alle Rohwerte, sortier- und filterbar, als CSV herunterladen.",
    "weg.graphen": "Verteilungen, Artenzahl, Zeitverlauf, zwei Größen und Korrelationen.",
    "weg.qualitaet": "Was die Prüfregeln markieren: fehlende Werte, Ausreißer, Schreibweisen.",
    "weg.info": "Codebook mit Einheiten und Bereichen, Herkunft des Datensatzes.",

    /* Spalten */
    "spalte.sample_id": "Probe",
    "spalte.plot_id": "Plot",
    "spalte.block": "Block",
    "spalte.sown_richness": "Artenzahl",
    "spalte.date": "Datum",
    "spalte.observer": "Beobachter",
    "spalte.soil_moisture_pct": "Bodenfeuchte",
    "spalte.soil_temp_c": "Bodentemperatur",
    "spalte.ph": "pH",
    "spalte.organic_carbon_pct": "Org. Kohlenstoff",
    "spalte.biomass_g_m2": "Biomasse",
    "spalte.notes": "Notiz",
    "einheit.soil_moisture_pct": "Vol.-%",
    "einheit.soil_temp_c": "°C",
    "einheit.ph": "CaCl₂",
    "einheit.organic_carbon_pct": "% TM",
    "einheit.biomass_g_m2": "g/m²",
    "einheit.sown_richness": "Arten",
    "art.eins": "{n} Art",
    "art.mehr": "{n} Arten",
    "kurz.soil_moisture_pct": "Feuchte",
    "kurz.soil_temp_c": "Temp.",
    "kurz.ph": "pH",
    "kurz.organic_carbon_pct": "Org. C",
    "kurz.biomass_g_m2": "Biomasse",

    /* Kampagnen und Monate */
    "kampagne.2025-05-20": "Mai",
    "kampagne.2025-07-15": "Juli",
    "kampagne.2025-09-10": "September",
    "monate": "Januar,Februar,März,April,Mai,Juni,Juli,August,September,Oktober,November,Dezember",

    /* Tabelle */
    "tabelle.titel": "Tabelle",
    "tabelle.lead": "Alle Proben mit ihren Rohwerten. Spaltenkopf anklicken sortiert, ein zweiter Klick kehrt die Richtung um.",
    "filter.alle": "Alle",
    "filter.zuruecksetzen": "Filter zurücksetzen",
    "suche.label": "Suche",
    "suche.platzhalter": "Proben- oder Plot-ID, z. B. P07",
    "zaehler": "<strong>{x}</strong> von {n} Proben",
    "knopf.download": "Gefilterte Zeilen als CSV",
    "tabelle.leer": "Keine Probe passt zu Filter und Suche.",
    "tabelle.beschriftung": "Bodenproben, {x} von {n} Zeilen",
    "legende.auffaellig": "auffällig, Grund im Tooltip",
    "legende.fehlt": "fehlender Wert (NA)",
    "fehlt": "fehlt",
    "sort.auf": "aufsteigend sortiert",
    "sort.ab": "absteigend sortiert",
    "sort.hinweis": "sortieren nach {spalte}",

    /* Graphen */
    "graphen.titel": "Graphen",
    "graphen.lead": "Messgröße, Gruppierung und Filter in der Leiste wählen. Die Einstellungen gelten für alle Panels; die Filter sind dieselben wie in der Tabelle.",
    "leiste.messgroesse": "Messgröße",
    "leiste.gruppe": "Gruppierung",
    "leiste.ausblenden": "Auffällige Werte ausblenden",
    "leiste.ausblenden.info": "Blendet markierte Messwerte aus und zählt die Schreibweise „ak“ als „AK“. Die Rohdaten bleiben unverändert.",
    "leiste.zaehler": "<strong>{x}</strong> von {n} Proben im Filter",
    "leiste.ausgeblendet": "{n} auffällige Werte ausgeblendet",
    "gruppe.block": "Block",
    "gruppe.sown_richness": "Artenzahl",
    "gruppe.date": "Kampagne",
    "gruppe.observer": "Beobachter",
    "panel.verteilung": "Verteilung",
    "panel.verteilung.text": "Histogramm (gestapelt nach Gruppe) und Boxplot je Gruppe. Jeder Punkt ist eine Probe.",
    "panel.artenzahl": "Messgröße und Artenzahl",
    "panel.artenzahl.text": "Gesäte Artenzahl auf log2-Achse (1, 2, 4, 8, 16: das Versuchsdesign verdoppelt). Punkte seitlich leicht gestreut, Farbe nach Kampagne; waagerechte Striche zeigen den Median je Stufe.",
    "panel.zeit": "Zeitverlauf",
    "panel.zeit.text": "Jede helle Linie ist ein Plot über die drei Kampagnen (jeder Plot kommt dreimal vor). Kräftige Linien: Median je Gruppe.",
    "panel.zwei": "Zwei Größen",
    "panel.zwei.text": "Streudiagramm zweier Messgrößen, Farbe und Form nach Gruppierung.",
    "panel.korr": "Korrelationsmatrix (Spearman)",
    "panel.korr.text": "Rangkorrelation ρ zwischen den Messgrößen, Werte in den Zellen. Farbskala vik, Mitte bei 0.",
    "korr.alle": "Alle Kampagnen",
    "korr.je": "Je Kampagne",
    "korr.hinweis": "<strong>Jahreszeiteneffekt:</strong> Korrelationen über alle Kampagnen enthalten den Jahreszeiteneffekt. Bodenfeuchte und Bodentemperatur ändern sich beide mit der Jahreszeit; ein hoher Wert über alle Kampagnen beschreibt deshalb gemeinsames Auftreten, keinen Zusammenhang zwischen den beiden Größen. Die Ansicht „Je Kampagne“ hält die Jahreszeit fest. Jeder Plot kommt dreimal vor, die Proben sind nicht unabhängig; Tests sind hier deshalb nicht angegeben.",
    "achse.x": "x-Achse",
    "achse.y": "y-Achse",
    "achse.anzahl": "Anzahl Proben",
    "achse.artenzahl": "Gesäte Artenzahl (log2-Achse)",
    "achse.kampagne": "Kampagne",
    "legende.median": "Median",
    "legende.plots": "einzelne Plots",
    "hover.probe": "Probe",
    "hover.plot": "Plot",
    "hover.median": "Median",
    "hover.n": "n",
    "hover.rho": "ρ",
    "graph.keine": "Keine Werte für diese Auswahl.",
    "graph.laden": "Graphen werden gezeichnet …",
    "graph.ohne": "Plotly.js konnte nicht geladen werden (keine Internetverbindung?). Die Graphen brauchen die Bibliothek vom CDN.",

    /* Datenqualität */
    "qualitaet.titel": "Datenqualität",
    "qualitaet.lead": "Was die Prüfregeln finden. Markiert heißt „auffällig“, nicht „falsch“: Die Seite korrigiert nichts automatisch, die Tabelle zeigt immer die Rohwerte.",
    "qualitaet.liste": "Auffällige Werte",
    "qualitaet.keine": "Keine Auffälligkeiten gefunden.",
    "qualitaet.fehlend": "Fehlende Werte je Spalte",
    "qualitaet.fehlend.text": "Zellen mit NA. Leere Notizen zählen nicht als fehlend.",
    "qualitaet.fehlend.proben": "Fehlende Werte stehen in den Proben: {liste}",
    "qualitaet.beob": "Schreibweisen der Beobachter",
    "qualitaet.beob.text": "Laut Codebook gibt es die Kürzel AK, BM und CS.",
    "qualitaet.regeln": "Prüfregeln",
    "kopf.probe": "Probe",
    "kopf.plot": "Plot",
    "kopf.spalte": "Spalte",
    "kopf.wert": "Wert",
    "kopf.regel": "Regel",
    "kopf.erklaerung": "Erklärung",
    "kopf.schreibweise": "Schreibweise",
    "kopf.proben": "Proben",
    "kopf.status": "Status",
    "status.ok": "im Codebook",
    "status.schreibweise": "abweichende Groß-/Kleinschreibung",
    "status.unbekannt": "nicht im Codebook",
    "regel.bereich": "außerhalb des Bereichs",
    "regel.plotmedian": "weicht vom Plot-Median ab",
    "regel.beobachter": "Schreibweise",
    "regel.kategorie": "nicht im Codebook",
    "regel.fehlt": "fehlt",
    "erkl.bereich": "{wert} {einheit} liegt außerhalb des Codebook-Bereichs {min}–{max} {einheit}.",
    "erkl.plotmedian": "{wert} {einheit} weicht um den Faktor {faktor} vom Median der Kampagnen dieses Plots ab ({median} {einheit}; Schwelle: Faktor {schwelle}).",
    "erkl.beobachter.schreibweise": "„{wert}“ steht nicht in der Codebook-Liste {liste}; entspricht bis auf die Groß-/Kleinschreibung „{gross}“.",
    "erkl.beobachter.unbekannt": "„{wert}“ steht nicht in der Codebook-Liste {liste}.",
    "erkl.kategorie": "„{wert}“ ist kein im Codebook genannter Wert ({liste}).",
    "erkl.fehlt": "Der Wert fehlt (NA).",
    "regel.text.bereich": "<strong>Bereich:</strong> Messwert außerhalb des plausiblen Bereichs aus dem Codebook (Feuchte 5–60 %, Temperatur 5–30 °C, pH 4,5–8, org. C 1–4 %, Biomasse 20–800 g/m²).",
    "regel.text.plotmedian": "<strong>Plot-Median (Biomasse):</strong> Wert weicht um Faktor ≥ {schwelle} vom Median der drei Kampagnen desselben Plots ab. Findet Tippfehler um eine Zehnerpotenz, die noch im Bereich liegen.",
    "regel.text.beobachter": "<strong>Beobachter:</strong> Kürzel nicht in der Codebook-Liste AK, BM, CS, auch bei abweichender Groß-/Kleinschreibung.",
    "regel.text.kategorie": "<strong>Kategorien:</strong> Block, Artenzahl und Datum müssen zu den im Codebook genannten Werten gehören.",
    "regel.text.fehlt": "<strong>Fehlend:</strong> NA zählt als fehlender Wert, nicht als 0.",
    "regel.text.schalter": "Der Schalter „Auffällige Werte ausblenden“ in den Graphen nimmt markierte Messwerte heraus und zählt nur die Schreibweise „ak“ als „AK“.",

    /* Über die Daten */
    "info.titel": "Über die Daten",
    "info.lead": "Ein synthetischer Datensatz für Übungen zur Datenanalyse: ein erfundener Grünland-Biodiversitätsversuch.",
    "info.codebook": "Codebook",
    "info.kopf.spalte": "Spalte",
    "info.kopf.bedeutung": "Bedeutung",
    "info.kopf.format": "Einheit / Format",
    "info.kopf.bereich": "Plausibler Bereich",
    "cb.sample_id": "eindeutige Proben-ID",
    "cb.plot_id": "Plot-ID (Versuchsfläche)",
    "cb.block": "räumlicher Block",
    "cb.sown_richness": "Anzahl gesäter Pflanzenarten",
    "cb.date": "Probenahmedatum",
    "cb.observer": "Person, die beprobt hat",
    "cb.soil_moisture_pct": "volumetrische Bodenfeuchte",
    "cb.soil_temp_c": "Bodentemperatur in 5 cm Tiefe",
    "cb.ph": "Boden-pH (CaCl₂)",
    "cb.organic_carbon_pct": "organischer Kohlenstoff im Boden",
    "cb.biomass_g_m2": "oberirdische Pflanzenbiomasse",
    "cb.notes": "Feldnotiz",
    "fmt.sample_id": "S001–S120",
    "fmt.plot_id": "P01–P40",
    "fmt.block": "B1–B4 (je 10 Plots)",
    "fmt.sown_richness": "1, 2, 4, 8, 16",
    "fmt.date": "ISO 8601 (JJJJ-MM-TT)",
    "fmt.observer": "Kürzel AK, BM, CS",
    "fmt.soil_moisture_pct": "%",
    "fmt.soil_temp_c": "°C",
    "fmt.ph": "–",
    "fmt.organic_carbon_pct": "% der Trockenmasse",
    "fmt.biomass_g_m2": "g Trockenmasse pro m²",
    "fmt.notes": "Freitext, meist leer",
    "info.herkunft": "Herkunft",
    "info.herkunft.text": "Alle Werte sind erfunden. Erzeugt hat sie das R-Skript <code>generate_soil_samples.R</code> mit <code>set.seed(42)</code>: 120 Zeilen = 40 Plots × 3 Probenahmen 2025. Die Datei ist kommagetrennt, mit Kopfzeile, fehlende Werte stehen als <code>NA</code>, Dezimalzeichen ist der Punkt. Der Generator baut absichtlich einige Datenfehler ein; die Seite findet sie über die Prüfregeln, nicht über eine Liste.",
    "info.herkunft.notiz": "Die Feldnotizen bleiben im Original (Englisch), sie gehören zu den Daten.",
    "info.technik": "Technik und Farben",
    "info.technik.text": "Statische Seite aus HTML, CSS und JavaScript ohne Build-Schritt. Graphen mit Plotly.js {plotly}, CSV-Einlesen mit Papa Parse {papa}.",
    "info.farben.text": "Datenfarben aus den Scientific Colour Maps 8.0.1 von Fabio Crameri: kategorial batlowS, divergierend vik. Sie sind wahrnehmungstreu und für Farbfehlsichtigkeit geeignet; Gruppen unterscheiden sich zusätzlich in der Punktform.",
    "info.zitat": "Crameri, F. (2018): Scientific colour maps. Zenodo. doi:10.5281/zenodo.1243862 · Crameri, F., Shephard, G. E. & Heron, P. J. (2020): The misuse of colour in science communication. Nature Communications 11, 5444. doi:10.1038/s41467-020-19160-7"
  },

  en: {
    "seite.titel": "Soil samples – fictional grassland experiment",
    "marke": "Soil samples",
    "sprache": "Language",
    "nav.label": "Views",
    "nav.start": "Overview",
    "nav.tabelle": "Table",
    "nav.graphen": "Charts",
    "nav.qualitaet": "Data quality",
    "nav.info": "About the data",
    "fuss": "Fictional data · Course project “AI-supported Coding with GitHub Copilot” · Ben Schmidt, 2026",

    /* Loading */
    "laden.lade": "Loading data …",
    "laden.titel": "The data could not be loaded",
    "laden.text": "The page reads data/soil_samples_dummy.csv. This does not work when index.html is opened directly as a file (file://). Either start a local server in the terminal and open http://localhost:8000:",
    "laden.oder": "or choose the CSV file here (same column schema as soil_samples_dummy.csv):",
    "laden.knopf": "Choose CSV file",
    "laden.schema": "The file does not have the expected column schema. Missing: {spalten}",
    "laden.leer": "The file contains no data rows.",

    /* Overview */
    "start.eyebrow": "Course project · AI-supported Coding with GitHub Copilot",
    "start.titel": "Soil samples from a grassland experiment",
    "start.lead": "{proben} soil samples from {plots} experimental plots in {bloecke} blocks, each plot sampled in {kampagnen} campaigns in 2025. Measured: soil moisture, soil temperature, pH, organic carbon and aboveground biomass.",
    "fiktiv.titel": "Fictional data",
    "fiktiv.text": "All values are synthetic (R script generate_soil_samples.R, set.seed(42)). These are not real measurements.",
    "kachel.proben": "Samples",
    "kachel.plots": "Plots",
    "kachel.bloecke": "Blocks",
    "kachel.kampagnen": "Campaigns",
    "kachel.beobachter": "Observers",
    "kachel.fehlend": "Missing values",
    "kachel.auffaellig": "Flagged values",
    "zusatz.plots": "each sampled {n}×",
    "zusatz.bloecke": "{n} plots each",
    "zusatz.kampagnen": "{liste}",
    "zusatz.beobachter": "{n} spellings in the data",
    "zusatz.fehlend": "NA cells in {n} samples",
    "zusatz.auffaellig": "in {n} samples · see list",
    "start.weiter": "Views",
    "weg.tabelle": "All raw values, sortable and filterable, downloadable as CSV.",
    "weg.graphen": "Distributions, species richness, time course, two variables and correlations.",
    "weg.qualitaet": "What the checks flag: missing values, outliers, spellings.",
    "weg.info": "Codebook with units and ranges, origin of the data set.",

    /* Columns */
    "spalte.sample_id": "Sample",
    "spalte.plot_id": "Plot",
    "spalte.block": "Block",
    "spalte.sown_richness": "Species richness",
    "spalte.date": "Date",
    "spalte.observer": "Observer",
    "spalte.soil_moisture_pct": "Soil moisture",
    "spalte.soil_temp_c": "Soil temperature",
    "spalte.ph": "pH",
    "spalte.organic_carbon_pct": "Organic carbon",
    "spalte.biomass_g_m2": "Biomass",
    "spalte.notes": "Note",
    "einheit.soil_moisture_pct": "vol. %",
    "einheit.soil_temp_c": "°C",
    "einheit.ph": "CaCl₂",
    "einheit.organic_carbon_pct": "% DM",
    "einheit.biomass_g_m2": "g/m²",
    "einheit.sown_richness": "species",
    "art.eins": "{n} species",
    "art.mehr": "{n} species",
    "kurz.soil_moisture_pct": "Moisture",
    "kurz.soil_temp_c": "Temp.",
    "kurz.ph": "pH",
    "kurz.organic_carbon_pct": "Org. C",
    "kurz.biomass_g_m2": "Biomass",

    /* Campaigns and months */
    "kampagne.2025-05-20": "May",
    "kampagne.2025-07-15": "July",
    "kampagne.2025-09-10": "September",
    "monate": "January,February,March,April,May,June,July,August,September,October,November,December",

    /* Table */
    "tabelle.titel": "Table",
    "tabelle.lead": "All samples with their raw values. Click a column header to sort, click again to reverse.",
    "filter.alle": "All",
    "filter.zuruecksetzen": "Reset filters",
    "suche.label": "Search",
    "suche.platzhalter": "Sample or plot ID, e.g. P07",
    "zaehler": "<strong>{x}</strong> of {n} samples",
    "knopf.download": "Filtered rows as CSV",
    "tabelle.leer": "No sample matches the filters and search.",
    "tabelle.beschriftung": "Soil samples, {x} of {n} rows",
    "legende.auffaellig": "flagged, reason in tooltip",
    "legende.fehlt": "missing value (NA)",
    "fehlt": "missing",
    "sort.auf": "sorted ascending",
    "sort.ab": "sorted descending",
    "sort.hinweis": "sort by {spalte}",

    /* Charts */
    "graphen.titel": "Charts",
    "graphen.lead": "Choose variable, grouping and filters in the sidebar. The settings apply to all panels; the filters are the same as in the table.",
    "leiste.messgroesse": "Variable",
    "leiste.gruppe": "Grouping",
    "leiste.ausblenden": "Hide flagged values",
    "leiste.ausblenden.info": "Removes flagged measurements and counts the spelling “ak” as “AK”. The raw data stay unchanged.",
    "leiste.zaehler": "<strong>{x}</strong> of {n} samples in filter",
    "leiste.ausgeblendet": "{n} flagged values hidden",
    "gruppe.block": "Block",
    "gruppe.sown_richness": "Species richness",
    "gruppe.date": "Campaign",
    "gruppe.observer": "Observer",
    "panel.verteilung": "Distribution",
    "panel.verteilung.text": "Histogram (stacked by group) and box plot per group. Each point is one sample.",
    "panel.artenzahl": "Variable and species richness",
    "panel.artenzahl.text": "Sown species richness on a log2 axis (1, 2, 4, 8, 16: the design doubles). Points slightly jittered sideways, colour by campaign; horizontal bars show the median per level.",
    "panel.zeit": "Time course",
    "panel.zeit.text": "Each light line is one plot across the three campaigns (every plot appears three times). Bold lines: median per group.",
    "panel.zwei": "Two variables",
    "panel.zwei.text": "Scatter plot of two variables, colour and shape by grouping.",
    "panel.korr": "Correlation matrix (Spearman)",
    "panel.korr.text": "Rank correlation ρ between the variables, values in the cells. Colour scale vik, centred at 0.",
    "korr.alle": "All campaigns",
    "korr.je": "Per campaign",
    "korr.hinweis": "<strong>Seasonal effect:</strong> correlations across all campaigns include the seasonal effect. Soil moisture and soil temperature both change with the season, so a strong value across all campaigns describes co-occurrence, not a relationship between the two variables. The “Per campaign” view holds the season fixed. Every plot appears three times and the samples are not independent; therefore no tests are reported here.",
    "achse.x": "x axis",
    "achse.y": "y axis",
    "achse.anzahl": "Number of samples",
    "achse.artenzahl": "Sown species richness (log2 axis)",
    "achse.kampagne": "Campaign",
    "legende.median": "Median",
    "legende.plots": "individual plots",
    "hover.probe": "Sample",
    "hover.plot": "Plot",
    "hover.median": "Median",
    "hover.n": "n",
    "hover.rho": "ρ",
    "graph.keine": "No values for this selection.",
    "graph.laden": "Drawing charts …",
    "graph.ohne": "Plotly.js could not be loaded (no internet connection?). The charts need the library from the CDN.",

    /* Data quality */
    "qualitaet.titel": "Data quality",
    "qualitaet.lead": "What the checks find. Flagged means “conspicuous”, not “wrong”: the page corrects nothing automatically, and the table always shows the raw values.",
    "qualitaet.liste": "Flagged values",
    "qualitaet.keine": "No issues found.",
    "qualitaet.fehlend": "Missing values per column",
    "qualitaet.fehlend.text": "Cells with NA. Empty notes do not count as missing.",
    "qualitaet.fehlend.proben": "Missing values occur in samples: {liste}",
    "qualitaet.beob": "Observer spellings",
    "qualitaet.beob.text": "According to the codebook, the initials are AK, BM and CS.",
    "qualitaet.regeln": "Checks",
    "kopf.probe": "Sample",
    "kopf.plot": "Plot",
    "kopf.spalte": "Column",
    "kopf.wert": "Value",
    "kopf.regel": "Check",
    "kopf.erklaerung": "Explanation",
    "kopf.schreibweise": "Spelling",
    "kopf.proben": "Samples",
    "kopf.status": "Status",
    "status.ok": "in codebook",
    "status.schreibweise": "different letter case",
    "status.unbekannt": "not in codebook",
    "regel.bereich": "out of range",
    "regel.plotmedian": "deviates from plot median",
    "regel.beobachter": "spelling",
    "regel.kategorie": "not in codebook",
    "regel.fehlt": "missing",
    "erkl.bereich": "{wert} {einheit} lies outside the codebook range {min}–{max} {einheit}.",
    "erkl.plotmedian": "{wert} {einheit} deviates by a factor of {faktor} from the median of this plot’s campaigns ({median} {einheit}; threshold: factor {schwelle}).",
    "erkl.beobachter.schreibweise": "“{wert}” is not in the codebook list {liste}; matches “{gross}” except for letter case.",
    "erkl.beobachter.unbekannt": "“{wert}” is not in the codebook list {liste}.",
    "erkl.kategorie": "“{wert}” is not a value listed in the codebook ({liste}).",
    "erkl.fehlt": "The value is missing (NA).",
    "regel.text.bereich": "<strong>Range:</strong> measurement outside the plausible range from the codebook (moisture 5–60 %, temperature 5–30 °C, pH 4.5–8, org. C 1–4 %, biomass 20–800 g/m²).",
    "regel.text.plotmedian": "<strong>Plot median (biomass):</strong> value deviates by a factor ≥ {schwelle} from the median of the three campaigns of the same plot. Finds typos by a power of ten that still lie within the range.",
    "regel.text.beobachter": "<strong>Observer:</strong> initials not in the codebook list AK, BM, CS, including different letter case.",
    "regel.text.kategorie": "<strong>Categories:</strong> block, species richness and date must be among the values listed in the codebook.",
    "regel.text.fehlt": "<strong>Missing:</strong> NA counts as a missing value, not as 0.",
    "regel.text.schalter": "The switch “Hide flagged values” in the charts removes flagged measurements and only counts the spelling “ak” as “AK”.",

    /* About the data */
    "info.titel": "About the data",
    "info.lead": "A synthetic data set for data-analysis exercises: an invented grassland biodiversity experiment.",
    "info.codebook": "Codebook",
    "info.kopf.spalte": "Column",
    "info.kopf.bedeutung": "Meaning",
    "info.kopf.format": "Unit / format",
    "info.kopf.bereich": "Plausible range",
    "cb.sample_id": "unique sample ID",
    "cb.plot_id": "plot ID",
    "cb.block": "spatial block",
    "cb.sown_richness": "number of sown plant species",
    "cb.date": "sampling date",
    "cb.observer": "person who sampled",
    "cb.soil_moisture_pct": "volumetric soil moisture",
    "cb.soil_temp_c": "soil temperature at 5 cm",
    "cb.ph": "soil pH (CaCl₂)",
    "cb.organic_carbon_pct": "soil organic carbon",
    "cb.biomass_g_m2": "aboveground plant biomass",
    "cb.notes": "field comment",
    "fmt.sample_id": "S001–S120",
    "fmt.plot_id": "P01–P40",
    "fmt.block": "B1–B4 (10 plots each)",
    "fmt.sown_richness": "1, 2, 4, 8, 16",
    "fmt.date": "ISO 8601 (YYYY-MM-DD)",
    "fmt.observer": "initials AK, BM, CS",
    "fmt.soil_moisture_pct": "%",
    "fmt.soil_temp_c": "°C",
    "fmt.ph": "–",
    "fmt.organic_carbon_pct": "% of dry mass",
    "fmt.biomass_g_m2": "g dry mass per m²",
    "fmt.notes": "free text, mostly empty",
    "info.herkunft": "Origin",
    "info.herkunft.text": "All values are invented. They were generated by the R script <code>generate_soil_samples.R</code> with <code>set.seed(42)</code>: 120 rows = 40 plots × 3 sampling campaigns in 2025. The file is comma-separated with a header row, missing values are written as <code>NA</code>, decimal separator is the point. The generator deliberately builds in some data errors; the page finds them through the checks, not through a list.",
    "info.herkunft.notiz": "Field notes stay in their original language (English); they are part of the data.",
    "info.technik": "Technology and colours",
    "info.technik.text": "Static page made of HTML, CSS and JavaScript without a build step. Charts with Plotly.js {plotly}, CSV parsing with Papa Parse {papa}.",
    "info.farben.text": "Data colours from the Scientific Colour Maps 8.0.1 by Fabio Crameri: categorical batlowS, diverging vik. They are perceptually uniform and readable with colour-vision deficiencies; groups also differ in marker shape.",
    "info.zitat": "Crameri, F. (2018): Scientific colour maps. Zenodo. doi:10.5281/zenodo.1243862 · Crameri, F., Shephard, G. E. & Heron, P. J. (2020): The misuse of colour in science communication. Nature Communications 11, 5444. doi:10.1038/s41467-020-19160-7"
  }
};

const I18N = (function () {
  let sprache = "de";

  function t(schluessel, werte) {
    let text = TEXTE[sprache][schluessel];
    if (text === undefined) text = TEXTE.de[schluessel];
    if (text === undefined) return schluessel;
    if (werte) {
      text = text.replace(/\{(\w+)\}/g, (m, k) => (k in werte ? String(werte[k]) : m));
    }
    return text;
  }

  function locale() {
    return sprache === "de" ? "de-DE" : "en-GB";
  }

  // Zahl mit fester Nachkommazahl im Format der Sprache (DE 5,71 · EN 5.71)
  function zahl(x, dezimalen) {
    if (x === null || x === undefined || Number.isNaN(x)) return "–";
    const d = dezimalen === undefined ? 0 : dezimalen;
    return new Intl.NumberFormat(locale(), {
      minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: true
    }).format(x);
  }

  // ISO-Datum → DE 20.05.2025 · EN 20 May 2025
  function datum(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "–";
    if (sprache === "de") return `${m[3]}.${m[2]}.${m[1]}`;
    const monate = t("monate").split(",");
    return `${Number(m[3])} ${monate[Number(m[2]) - 1]} ${m[1]}`;
  }

  // Kampagne als Monatsname; unbekannte Daten erscheinen als Datum
  function kampagne(iso) {
    const k = "kampagne." + iso;
    const text = t(k);
    return text === k ? datum(iso) : text;
  }

  // Statische Texte im HTML setzen
  function anwenden(wurzel) {
    const w = wurzel || document;
    w.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    w.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    w.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    w.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    w.querySelectorAll("[data-i18n-platzhalter]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlatzhalter); });
    document.documentElement.lang = sprache;
    document.title = t("seite.titel");
  }

  return {
    t, zahl, datum, kampagne, anwenden, locale,
    get sprache() { return sprache; },
    setzeSprache(s) { if (TEXTE[s]) sprache = s; }
  };
})();
