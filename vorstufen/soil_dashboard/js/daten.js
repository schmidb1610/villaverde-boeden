/* daten.js – CSV einlesen, Typen setzen, filtern.
   Spalten, Einheiten und Bereiche stammen aus codebook.md (Session 2). */

// Prüfregel Plot-Median: Biomasse gilt als auffällig, wenn sie um diesen Faktor (oder mehr)
// vom Median der Kampagnen desselben Plots abweicht. Findet Tippfehler ×10 und ÷10 im Bereich.
const PLOT_FAKTOR_SCHWELLE = 4;
const PLOT_REGEL_SPALTE = "biomass_g_m2";

const SPALTEN = [
  { key: "sample_id", typ: "text" },
  { key: "plot_id", typ: "text" },
  { key: "block", typ: "kategorie", werte: ["B1", "B2", "B3", "B4"] },
  { key: "sown_richness", typ: "ganzzahl", werte: [1, 2, 4, 8, 16] },
  { key: "date", typ: "datum", werte: ["2025-05-20", "2025-07-15", "2025-09-10"] },
  { key: "observer", typ: "beobachter", werte: ["AK", "BM", "CS"] },
  { key: "soil_moisture_pct", typ: "zahl", bereich: [5, 60], dezimalen: 1 },
  { key: "soil_temp_c", typ: "zahl", bereich: [5, 30], dezimalen: 1 },
  { key: "ph", typ: "zahl", bereich: [4.5, 8], dezimalen: 2 },
  { key: "organic_carbon_pct", typ: "zahl", bereich: [1, 4], dezimalen: 2 },
  { key: "biomass_g_m2", typ: "zahl", bereich: [20, 800], dezimalen: 1 },
  { key: "notes", typ: "notiz" }
];

const MESSGROESSEN = SPALTEN.filter((s) => s.typ === "zahl").map((s) => s.key);
const GRUPPEN = ["block", "sown_richness", "date", "observer"];
const FEHLWERT = "NA";

const Daten = (function () {
  const spalte = (key) => SPALTEN.find((s) => s.key === key);

  // Text einer CSV → { zeilen } oder { fehler }
  function lese(text) {
    const erg = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    const kopf = erg.meta.fields || [];
    const fehlend = SPALTEN.map((s) => s.key).filter((k) => !kopf.includes(k));
    if (fehlend.length) return { fehler: I18N.t("laden.schema", { spalten: fehlend.join(", ") }) };
    if (!erg.data.length) return { fehler: I18N.t("laden.leer") };
    return { zeilen: erg.data.map(typisiere) };
  }

  // Ein Datensatz mit getypten Werten; _roh behält die Originaltexte (für Download)
  function typisiere(roh) {
    const z = { _roh: {}, _fehlt: {} };
    for (const s of SPALTEN) {
      const text = (roh[s.key] ?? "").trim();
      z._roh[s.key] = roh[s.key] ?? "";
      if (s.typ === "notiz") { z[s.key] = text; continue; }      // leere Notiz ist kein fehlender Wert
      if (text === FEHLWERT || text === "") { z[s.key] = null; z._fehlt[s.key] = true; continue; }
      if (s.typ === "zahl" || s.typ === "ganzzahl") {
        const x = Number(text);
        z[s.key] = Number.isFinite(x) ? x : null;
        if (!Number.isFinite(x)) z._fehlt[s.key] = true;
      } else {
        z[s.key] = text;
      }
    }
    return z;
  }

  // Werte einer Spalte, die im Datensatz vorkommen (Artenzahl numerisch sortiert)
  function auspraegungen(zeilen, key) {
    const werte = [...new Set(zeilen.map((z) => z[key]).filter((w) => w !== null))];
    const s = spalte(key);
    return s.typ === "ganzzahl" ? werte.sort((a, b) => a - b) : werte.sort();
  }

  // Filter: leere Angabe = alle; Suche trifft Proben- oder Plot-ID
  function filtere(zeilen, filter) {
    const suche = (filter.suche || "").trim().toLowerCase();
    return zeilen.filter((z) => {
      for (const k of GRUPPEN) {
        if (filter[k] !== "" && filter[k] !== undefined && String(z[k]) !== String(filter[k])) return false;
      }
      if (suche && !String(z.sample_id).toLowerCase().includes(suche) && !String(z.plot_id).toLowerCase().includes(suche)) return false;
      return true;
    });
  }

  function median(werte) {
    const w = werte.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
    if (!w.length) return null;
    const m = Math.floor(w.length / 2);
    return w.length % 2 ? w[m] : (w[m - 1] + w[m]) / 2;
  }

  // Kennzahlen für die Übersicht, alles aus den Zeilen berechnet
  function kennzahlen(zeilen) {
    const zaehle = (key) => new Set(zeilen.map((z) => z[key]).filter((w) => w !== null)).size;
    const plots = zaehle("plot_id");
    const bloecke = zaehle("block");
    const beobRoh = new Set(zeilen.map((z) => z.observer).filter((w) => w !== null));
    const beobGross = new Set([...beobRoh].map((w) => w.toUpperCase()));
    let fehlZellen = 0;
    const fehlProben = new Set();
    for (const z of zeilen) {
      const n = Object.keys(z._fehlt).length;
      if (n) { fehlZellen += n; fehlProben.add(z.sample_id); }
    }
    const jePlot = {};
    zeilen.forEach((z) => { jePlot[z.plot_id] = (jePlot[z.plot_id] || 0) + 1; });
    const jeBlock = {};
    const plotsJeBlock = {};
    zeilen.forEach((z) => { (plotsJeBlock[z.block] = plotsJeBlock[z.block] || new Set()).add(z.plot_id); });
    Object.keys(plotsJeBlock).forEach((b) => { jeBlock[b] = plotsJeBlock[b].size; });
    const einheitlich = (obj) => { const v = [...new Set(Object.values(obj))]; return v.length === 1 ? v[0] : null; };
    return {
      proben: zeilen.length,
      plots,
      bloecke,
      kampagnen: auspraegungen(zeilen, "date"),
      beobachter: beobGross.size,
      beobachterSchreibweisen: beobRoh.size,
      fehlZellen,
      fehlProben: [...fehlProben].sort(),
      probenJePlot: einheitlich(jePlot),
      plotsJeBlock: einheitlich(jeBlock)
    };
  }

  // Nur für die Graphen: auffällige Messwerte ausblenden und die Schreibweise eines
  // Codebook-Kürzels (z. B. „ak“) als Kürzel zählen. Die Rohzeilen bleiben unverändert.
  function bereinigt(zeilen, befunde, aktiv) {
    if (!aktiv) return { zeilen, ausgeblendet: [] };
    const weg = new Set(befunde.filter((b) => b.regel === "bereich" || b.regel === "plotmedian").map((b) => b.sample_id + "|" + b.spalte));
    const schreibweise = new Map(befunde.filter((b) => b.regel === "beobachter" && b.details.gross).map((b) => [b.sample_id, b.details.gross]));
    const neu = zeilen.map((z) => {
      const betroffen = MESSGROESSEN.filter((m) => weg.has(z.sample_id + "|" + m));
      if (!betroffen.length && !schreibweise.has(z.sample_id)) return z;
      const k = Object.assign({}, z);
      betroffen.forEach((m) => { k[m] = null; });
      if (schreibweise.has(z.sample_id)) k.observer = schreibweise.get(z.sample_id);
      return k;
    });
    return { zeilen: neu, ausgeblendet: [...weg] };
  }

  /* ---------- Prüfregeln ----------
     Jede Regel stammt aus codebook.md. Ergebnis: Liste von Befunden
     { sample_id, plot_id, spalte, wert, regel, details }. Nichts wird korrigiert. */
  function pruefe(zeilen) {
    const befunde = [];
    const melde = (z, spalte, regel, details) =>
      befunde.push({ sample_id: z.sample_id, plot_id: z.plot_id, spalte, wert: z[spalte], regel, details: details || {} });

    // 1. Fehlende Werte (NA); leere Notizen zählen nicht
    for (const z of zeilen) for (const s of SPALTEN) if (z._fehlt[s.key]) melde(z, s.key, "fehlt");

    // 2. Messwert außerhalb des Codebook-Bereichs
    for (const z of zeilen) for (const s of SPALTEN.filter((x) => x.bereich)) {
      const w = z[s.key];
      if (w !== null && (w < s.bereich[0] || w > s.bereich[1])) melde(z, s.key, "bereich", { min: s.bereich[0], max: s.bereich[1] });
    }

    // 3. Biomasse weicht stark vom Median der Kampagnen desselben Plots ab
    const jePlot = {};
    zeilen.forEach((z) => { (jePlot[z.plot_id] = jePlot[z.plot_id] || []).push(z); });
    for (const gruppe of Object.values(jePlot)) {
      const med = median(gruppe.map((z) => z[PLOT_REGEL_SPALTE]));
      if (med === null || med <= 0) continue;
      for (const z of gruppe) {
        const w = z[PLOT_REGEL_SPALTE];
        if (w === null || w <= 0) continue;
        const faktor = Math.max(w / med, med / w);
        if (faktor >= PLOT_FAKTOR_SCHWELLE) melde(z, PLOT_REGEL_SPALTE, "plotmedian", { median: med, faktor });
      }
    }

    // 4. Beobachter nicht in der Codebook-Liste (auch abweichende Groß-/Kleinschreibung)
    const liste = spalte("observer").werte;
    for (const z of zeilen) {
      const w = z.observer;
      if (w === null || liste.includes(w)) continue;
      const gross = liste.includes(w.toUpperCase()) ? w.toUpperCase() : null;
      melde(z, "observer", "beobachter", { gross });
    }

    // 5. Kategorien, die das Codebook vorgibt (Block, Artenzahl, Datum)
    for (const z of zeilen) for (const s of SPALTEN.filter((x) => x.werte && x.typ !== "beobachter")) {
      if (z[s.key] !== null && !s.werte.includes(z[s.key])) melde(z, s.key, "kategorie");
    }
    return befunde;
  }

  // Lesbare Begründung eines Befunds in der aktuellen Sprache
  function erklaere(b) {
    const s = spalte(b.spalte);
    const frei = (x) => new Intl.NumberFormat(I18N.locale(), { maximumFractionDigits: 2 }).format(x);
    const einheit = I18N.t("einheit." + b.spalte);
    const e = einheit === "einheit." + b.spalte ? "" : einheit;
    const wert = s.typ === "zahl" ? I18N.zahl(b.wert, s.dezimalen) : b.wert;
    const liste = (s.werte || []).map((w) => (s.typ === "datum" ? I18N.datum(w) : w)).join(", ");
    switch (b.regel) {
      case "fehlt": return I18N.t("erkl.fehlt");
      case "bereich": return I18N.t("erkl.bereich", { wert, einheit: e, min: frei(b.details.min), max: frei(b.details.max) });
      case "plotmedian": return I18N.t("erkl.plotmedian", {
        wert, einheit: e, faktor: I18N.zahl(b.details.faktor, 1), median: I18N.zahl(b.details.median, s.dezimalen), schwelle: PLOT_FAKTOR_SCHWELLE
      });
      case "beobachter": return b.details.gross
        ? I18N.t("erkl.beobachter.schreibweise", { wert, liste, gross: b.details.gross })
        : I18N.t("erkl.beobachter.unbekannt", { wert, liste });
      case "kategorie": return I18N.t("erkl.kategorie", { wert, liste });
      default: return b.regel;
    }
  }

  return { spalte, lese, auspraegungen, filtere, median, kennzahlen, bereinigt, pruefe, erklaere };
})();
