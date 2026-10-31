/* daten.js – Originaldateien einlesen, zusammenführen, prüfen.
   Grundlage: „Meta data.md“ des Datensatzes und villaverde/daten_inventar.md.
   Die Dateien in data/ sind unveränderte Kopien (nur umbenannt); alles Weitere passiert hier. */

// Dateien: Pfad auf der Website und Originalname im FDAT-Datensatz (für den Datei-Wähler)
const DATEIEN = {
  standorte: { pfad: "data/standorte.csv", original: "Soil profile ids and locations.csv" },
  labor: { pfad: "data/laborchemie.tsv", original: "Wet chemistry analysis.csv" },
  m030: { pfad: "data/modell_0-30cm.csv", original: "Model predictions and soil quality estimation - 0-30 cm.csv", oben: 0, unten: 30, stufe: 1 },
  m4060: { pfad: "data/modell_40-60cm.csv", original: "Model predictions and soil quality estimation - 40-60 cm.csv", oben: 40, unten: 60, stufe: 4 },
  m70100: { pfad: "data/modell_70-100cm.csv", original: "Model predictions and soil quality estimation - 70-100 cm.csv", oben: 70, unten: 100, stufe: 5 },
  hoehe: { pfad: "data/hoehe_dgm.csv", original: "hoehe_dgm.csv", optional: true }
};
const MODELL_DATEIEN = ["m030", "m4060", "m70100"];

// Messgrößen: Spaltenname in der Modell- bzw. Laborchemie-Datei, Nachkommastellen in Graphen
const GROESSEN = [
  { key: "ph", modell: "pH_KCl", labor: "pH_KCl", dez: 2 },
  { key: "soc", modell: "SOC", labor: "SOC", dez: 2 },
  { key: "nt", modell: "Nt", labor: "Nt", dez: 2 },
  { key: "ct", labor: "Ct", dez: 2 },
  { key: "caco3", labor: "CaCO3", dez: 1 },
  { key: "sand", modell: "Sand", labor: "Sand", dez: 1 },
  { key: "silt", modell: "Silt", labor: "Silt", dez: 1 },
  { key: "clay", modell: "Clay", labor: "Clay", dez: 1 },
  { key: "cec", modell: "CEC", dez: 1 },
  { key: "thetafc", modell: "thetaFC", dez: 2 },
  { key: "sqr", modell: ["SQR", "soil_quality_rating"], dez: 1 }
];
const QUELLEN = ["modell", "labor"];

// Prüfregel Körnung: Sand + Schluff + Ton sollen 100 % ergeben (Toleranz für Rundung)
const KOERNUNG_TOLERANZ = 1;
const FEHLWERTE = ["", "NA", "NaN"];

const Daten = (function () {
  const groesse = (key) => GROESSEN.find((g) => g.key === key);
  const messgroessen = (quelle) => GROESSEN.filter((g) => g[quelle]).map((g) => g.key);

  // Herkunft eines Werts (daten_inventar.md, Abschnitt 4)
  function art(quelle, key) {
    if (quelle === "labor") return "gemessen";
    if (key === "cec" || key === "thetafc") return "abgeleitet";
    if (key === "sqr") return "index";
    if (key === "nt") return "unklar";        // Nt in den Modelldateien: Herkunft in den Quellen nicht beschrieben
    return "modelliert";
  }

  // Feld unabhängig von Groß-/Kleinschreibung (profile/Profile, depth_increment/Depth_increment)
  function feld(roh, namen) {
    const liste = Array.isArray(namen) ? namen : [namen];
    for (const n of liste) {
      const k = Object.keys(roh).find((x) => x.toLowerCase() === n.toLowerCase());
      if (k !== undefined) return { name: k, text: String(roh[k] ?? "").trim() };
    }
    return null;
  }
  const zahlAus = (text) => (FEHLWERTE.includes(text) ? null : (Number.isFinite(Number(text)) ? Number(text) : null));

  function parse(text) {
    // Trennzeichen erkennt Papa Parse selbst (Komma, Tab, Semikolon kommen alle vor)
    return Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false, transformHeader: (h) => h.trim() });
  }

  function pruefeKopf(erg, name, noetig) {
    const kopf = (erg.meta.fields || []).map((f) => f.toLowerCase());
    const fehlt = noetig.filter((n) => !(Array.isArray(n) ? n : [n]).some((x) => kopf.includes(x.toLowerCase())));
    return fehlt.length ? I18N.t("laden.schema", { datei: name, spalten: fehlt.map((n) => [].concat(n).join("/")).join(", ") }) : null;
  }

  // Messwerte einer Rohzeile auf die Zeile übertragen
  function uebernimmWerte(z, roh, quelle) {
    for (const g of GROESSEN) {
      if (!g[quelle]) continue;
      const f = feld(roh, g[quelle]);
      if (!f) { z[g.key] = null; z._nichtErhoben[g.key] = true; z._roh[g.key] = ""; continue; }
      z._roh[g.key] = f.text;
      z[g.key] = zahlAus(f.text);
      if (z[g.key] === null) z._fehlt[g.key] = true;
    }
  }

  function neueZeile(quelle, id, profil, stufe, oben, unten) {
    return {
      quelle, id, profil, stufe, oben, unten, mitte: (oben + unten) / 2, tiefe: `${oben}-${unten}`,
      x: null, y: null, hoehe: null, _roh: {}, _fehlt: {}, _nichtErhoben: {}
    };
  }

  /* texte: { standorte: "…", labor: "…", m030: "…", … } → Ergebnis oder { fehler } */
  function lese(texte) {
    for (const [k, d] of Object.entries(DATEIEN)) {
      if (!d.optional && !texte[k]) return { fehler: I18N.t("laden.datei", { datei: d.pfad }) };
    }
    const p = {};
    for (const k of Object.keys(DATEIEN)) if (texte[k]) p[k] = parse(texte[k]);

    const fehler = pruefeKopf(p.standorte, DATEIEN.standorte.pfad, ["ID", "x", "y", "sample", "profile", "depth_increment"]) ||
      pruefeKopf(p.labor, DATEIEN.labor.pfad, ["ID", "Profile", "Depth_increment", "Depth", "pH_KCl", "SOC", "Sand", "Silt", "Clay"]) ||
      MODELL_DATEIEN.map((k) => pruefeKopf(p[k], DATEIEN[k].pfad, ["ID", "x", "y", "profile", "pH_KCl", "SOC", "Sand", "Silt", "Clay", "CEC", "thetaFC", ["SQR", "soil_quality_rating"]])).find(Boolean);
    if (fehler) return { fehler };

    // 1. Standorte: Probe → Profil, Tiefenstufe, Koordinaten; Profile mit Koordinaten
    const standorte = new Map();
    const profile = new Map();
    for (const r of p.standorte.data) {
      const s = {
        id: feld(r, "ID").text, sample: feld(r, "sample").text,
        profil: zahlAus(feld(r, "profile").text), stufe: zahlAus(feld(r, "depth_increment").text),
        x: zahlAus(feld(r, "x").text), y: zahlAus(feld(r, "y").text)
      };
      standorte.set(s.id, s);
      if (!profile.has(s.profil)) profile.set(s.profil, { profil: s.profil, x: s.x, y: s.y, hoehe: null, stufen: [], proben: 0, koordinaten: new Set() });
      const pr = profile.get(s.profil);
      pr.proben++;
      pr.stufen.push(s.stufe);
      pr.koordinaten.add(s.x + "|" + s.y);
    }

    // 2. Höhe je Profil (aus dem DGM abgeleitet, optional)
    if (p.hoehe) {
      for (const r of p.hoehe.data) {
        const pr = profile.get(zahlAus(feld(r, "profil").text));
        if (pr) pr.hoehe = zahlAus(feld(r, "hoehe_dgm_m").text);
      }
    }

    // 3. Modellvorhersagen: je Datei eine Tiefe
    const modell = [];
    for (const k of MODELL_DATEIEN) {
      const d = DATEIEN[k];
      for (const r of p[k].data) {
        const z = neueZeile("modell", feld(r, "ID").text, zahlAus(feld(r, "profile").text), d.stufe, d.oben, d.unten);
        z.x = zahlAus(feld(r, "x").text);
        z.y = zahlAus(feld(r, "y").text);
        uebernehmeProfil(z, profile);
        uebernimmWerte(z, r, "modell");
        z._datei = k;
        modell.push(z);
      }
    }

    // 4. Laborchemie: nur Proben aus dem Standortverzeichnis (die übrigen stammen aus Lora del Río).
    //    Profil und Tiefe stammen aus der Laborchemie selbst; zu Abweichungen siehe Prüfregel „id-versatz“.
    const labor = [];
    let fremd = 0;
    for (const r of p.labor.data) {
      const id = feld(r, "ID").text;
      if (!standorte.has(id)) { fremd++; continue; }
      const t = /^(\d+)\s*-\s*(\d+)$/.exec(feld(r, "Depth").text);
      const z = neueZeile("labor", id, zahlAus(feld(r, "Profile").text), zahlAus(feld(r, "Depth_increment").text),
        t ? Number(t[1]) : null, t ? Number(t[2]) : null);
      z._roh.depth = feld(r, "Depth").text;
      const pr = profile.get(z.profil);
      if (pr) { z.x = pr.x; z.y = pr.y; }
      uebernehmeProfil(z, profile);
      uebernimmWerte(z, r, "labor");
      labor.push(z);
    }

    const liste = [...profile.values()].sort((a, b) => a.profil - b.profil);
    liste.forEach((pr) => {
      pr.laborProben = labor.filter((z) => z.profil === pr.profil).length;
      pr.modellTiefen = modell.filter((z) => z.profil === pr.profil).map((z) => z.tiefe);
    });

    const zeilen = { modell, labor };
    const befunde = pruefe(zeilen, standorte, profile);
    return { zeilen, profile: liste, standorte, befunde, fremd, paare: paare(zeilen) };
  }

  function uebernehmeProfil(z, profile) {
    const pr = profile.get(z.profil);
    z.hoehe = pr ? pr.hoehe : null;
  }

  /* ---------- Auswahl ---------- */

  // Tiefen einer Quelle, nach Oberkante sortiert
  function tiefen(zeilen) {
    const m = new Map();
    zeilen.forEach((z) => { if (!m.has(z.tiefe)) m.set(z.tiefe, z); });
    return [...m.values()].sort((a, b) => a.oben - b.oben).map((z) => z.tiefe);
  }

  // Filter: leere Angabe = alle; Suche trifft Profilnummer (genau) oder Labor-ID (Teil)
  function filtere(zeilen, filter) {
    const suche = (filter.suche || "").trim().toLowerCase().replace(/^p(rofil|rofile)?\s*/, "");
    return zeilen.filter((z) => {
      if (filter.tiefe && z.tiefe !== filter.tiefe) return false;
      if (filter.ids && filter.ids.size && !filter.ids.has(z.id)) return false;
      if (suche && String(z.profil) !== suche && !String(z.id).includes(suche)) return false;
      return true;
    });
  }

  function median(werte) {
    const w = werte.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
    if (!w.length) return null;
    const m = Math.floor(w.length / 2);
    return w.length % 2 ? w[m] : (w[m - 1] + w[m]) / 2;
  }

  // Kennzahlen für die Übersicht, alles aus den Daten berechnet
  function kennzahlen(d) {
    const nummern = d.profile.map((p) => p.profil);
    const max = Math.max(...nummern);
    const luecken = [];
    for (let i = 1; i <= max; i++) if (!nummern.includes(i)) luecken.push(i);
    const hoehen = d.profile.map((p) => p.hoehe).filter((h) => h !== null);
    const stufen = new Set([...d.standorte.values()].map((s) => s.stufe));
    return {
      profile: d.profile.length, max, luecken,
      proben: d.standorte.size, stufen: stufen.size,
      tiefeMax: Math.max(...d.zeilen.modell.map((z) => z.unten), ...d.zeilen.labor.map((z) => z.unten)),
      modell: d.zeilen.modell.length, modellTiefen: tiefen(d.zeilen.modell),
      labor: d.zeilen.labor.length, laborProfile: new Set(d.zeilen.labor.map((z) => z.profil)).size,
      fremd: d.fremd,
      hoeheMin: hoehen.length ? Math.min(...hoehen) : null, hoeheMax: hoehen.length ? Math.max(...hoehen) : null,
      jeTiefe: tiefen(d.zeilen.modell).map((t) => ({ tiefe: t, n: d.zeilen.modell.filter((z) => z.tiefe === t).length }))
    };
  }

  /* ---------- Messung und Modell ----------
     Paare über Profil + Tiefenstufe (40–60 cm = Stufe 4, 70–100 cm = Stufe 5). Die 0–30-cm-Werte
     haben kein gleich tiefes Labor-Gegenstück (Labor: 0–10, 10–20, 20–30 cm). */
  function paare(zeilen) {
    const erg = [];
    for (const l of zeilen.labor) {
      const m = zeilen.modell.find((z) => z.profil === l.profil && z.oben === l.oben && z.unten === l.unten);
      if (m) erg.push({ labor: l, modell: m });
    }
    return erg.sort((a, b) => a.labor.profil - b.labor.profil || a.labor.oben - b.labor.oben);
  }

  /* ---------- Prüfregeln ----------
     Befund: { quelle, id, profil, tiefe, spalten: [...], regel, details }. Nichts wird korrigiert. */
  function pruefe(zeilen, standorte) {
    const befunde = [];
    const melde = (z, spalten, regel, details) =>
      befunde.push({ quelle: z.quelle, id: z.id, profil: z.profil, tiefe: z.tiefe, spalten, regel, details: details || {} });

    for (const quelle of QUELLEN) for (const z of zeilen[quelle]) {
      // 1. Fehlende Werte
      for (const k of Object.keys(z._fehlt)) melde(z, [k], "fehlt");

      // 2. Körnungssumme
      if (z.sand !== null && z.silt !== null && z.clay !== null) {
        const summe = z.sand + z.silt + z.clay;
        if (Math.abs(summe - 100) > KOERNUNG_TOLERANZ) melde(z, ["sand", "silt", "clay"], "koernung", { summe });
      }
    }

    // 3. Laborchemie: Profil/Tiefenstufe weichen vom Standortverzeichnis derselben ID ab
    for (const z of zeilen.labor) {
      const s = standorte.get(z.id);
      if (s.profil === z.profil && s.stufe === z.stufe) continue;
      const vor = standorte.get(String(Number(z.id) - 1));
      const passtVor = !!vor && vor.profil === z.profil && vor.stufe === z.stufe;
      melde(z, ["id"], "id-versatz", { stSample: s.sample, stProfil: s.profil, stStufe: s.stufe, passtVor, vorId: vor ? vor.id : null });
    }

    // 4. Modelldateien: ID muss im Standortverzeichnis mit Profil, Stufe und Koordinaten übereinstimmen
    for (const z of zeilen.modell) {
      const s = standorte.get(z.id);
      const ok = s && s.profil === z.profil && s.stufe === DATEIEN[z._datei].stufe && s.x === z.x && s.y === z.y;
      if (!ok) melde(z, ["id"], "modell-zuordnung", { stSample: s ? s.sample : null });
    }
    return befunde;
  }

  // Lesbare Begründung eines Befunds in der aktuellen Sprache
  function erklaere(b) {
    switch (b.regel) {
      case "fehlt": return I18N.t("erkl.fehlt");
      case "koernung": return I18N.t("erkl.koernung", { summe: I18N.zahl(b.details.summe, 1), tol: KOERNUNG_TOLERANZ });
      case "id-versatz": return I18N.t(b.details.passtVor ? "erkl.versatz.vor" : "erkl.versatz", {
        id: b.id, sample: b.details.stSample, profil: b.profil, stufe: I18N.tiefe(b.tiefe), vor: b.details.vorId
      });
      case "modell-zuordnung": return I18N.t("erkl.modell", { id: b.id });
      default: return b.regel;
    }
  }

  return { groesse, messgroessen, art, lese, tiefen, filtere, median, kennzahlen, erklaere };
})();
