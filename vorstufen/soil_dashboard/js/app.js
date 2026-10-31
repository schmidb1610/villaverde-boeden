/* app.js – Steuerung: Daten laden, Ansichten per Hash, Filterzustand, Sprache. */

const App = (function () {
  const SPEICHER_SPRACHE = "soil_dashboard.sprache";
  const DATEN_URL = "data/soil_samples_dummy.csv";

  // Ein Zustand für alle Ansichten: Filter gelten in Tabelle und Graphen gleich
  const zustand = {
    ansicht: "start",
    filter: { block: "", sown_richness: "", date: "", observer: "", suche: "" },
    ausblenden: false,
    messgroesse: "biomass_g_m2",
    gruppe: "sown_richness",
    x: "soil_moisture_pct",
    y: "soil_temp_c",
    korr: "alle"
  };
  let zeilen = [];
  let befunde = [];
  let index = {};     // Befunde je Probe und Spalte: index[sample_id][spalte] = [befund, …]

  const $ = (s, w) => (w || document).querySelector(s);
  const $$ = (s, w) => [...(w || document).querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function lies(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function schreibe(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ohne Speicher weiter */ } }

  function ansichten() { return $$("section.ansicht").map((s) => s.dataset.ansicht); }

  /* ---------- Start und Laden ---------- */

  function start() {
    const param = new URLSearchParams(location.search);
    I18N.setzeSprache(param.get("lang") || lies(SPEICHER_SPRACHE) || "de");
    if (param.get("akzent") === "moos") document.documentElement.dataset.akzent = "moos";
    I18N.anwenden();
    setzeSprachknoepfe();
    bindeEreignisse();
    laden();
  }

  async function laden() {
    try {
      if (typeof Papa === "undefined") throw new Error("Papa Parse fehlt");
      const antwort = await fetch(DATEN_URL, { cache: "no-cache" });
      if (!antwort.ok) throw new Error("HTTP " + antwort.status);
      uebernehme(await antwort.text());
    } catch (e) {
      zeigeLadefehler();
    }
  }

  function zeigeLadefehler(meldung) {
    $("#laden").hidden = true;
    $("#ladefehler").hidden = false;
    $$("section.ansicht").forEach((s) => { s.hidden = true; });
    // Bei file:// lässt sich der Ordner aus der Adresse ablesen
    let ordner = "<Pfad>/website/soil_dashboard";
    if (location.protocol === "file:") ordner = decodeURIComponent(location.pathname).replace(/\/[^/]*$/, "");
    $("#startbefehl").textContent = `cd "${ordner}" && python3 -m http.server 8000`;
    $("#dateifehler").textContent = meldung || "";
  }

  function uebernehme(text) {
    const erg = Daten.lese(text);
    if (erg.fehler) { zeigeLadefehler(erg.fehler); return false; }
    zeilen = erg.zeilen;
    befunde = typeof Daten.pruefe === "function" ? Daten.pruefe(zeilen) : [];
    index = {};
    for (const b of befunde) {
      if (b.regel === "fehlt") continue;            // fehlende Werte zeigt die Tabelle eigens
      const proZeile = (index[b.sample_id] = index[b.sample_id] || {});
      (proZeile[b.spalte] = proZeile[b.spalte] || []).push(b);
    }
    $("#laden").hidden = true;
    $("#ladefehler").hidden = true;
    baueFilter();
    route();
    return true;
  }

  /* ---------- Ansichten ---------- */

  function route() {
    if (!zeilen.length) return;
    const ziel = location.hash.replace("#", "") || "start";
    zustand.ansicht = ansichten().includes(ziel) ? ziel : "start";
    $$("section.ansicht").forEach((s) => { s.hidden = s.dataset.ansicht !== zustand.ansicht; });
    $$(".nav a").forEach((a) => {
      if (a.dataset.ansicht === zustand.ansicht) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    zeichneAnsicht();
  }

  function zeichneAnsicht() {
    const a = zustand.ansicht;
    if (a === "start") zeichneStart();
    else if (a === "tabelle") zeichneTabelle();
    else if (a === "graphen") Graphen.zeichne(zeilen, befunde, zustand);
    else if (a === "qualitaet" && typeof Qualitaet !== "undefined") Qualitaet.zeichne(zeilen, befunde);
    else if (a === "info" && typeof Qualitaet !== "undefined") Qualitaet.zeichneInfo();
  }

  function zeichneStart() {
    const k = Daten.kennzahlen(zeilen);
    const werte = befunde.filter((b) => b.regel !== "fehlt");
    const auffProben = new Set(werte.map((b) => b.sample_id)).size;
    const auffZellen = new Set(werte.map((b) => b.sample_id + "|" + b.spalte)).size;
    $("#start-lead").textContent = I18N.t("start.lead", {
      proben: k.proben, plots: k.plots, bloecke: k.bloecke, kampagnen: k.kampagnen.length
    });
    const kachel = (wert, name, zusatz, link) => {
      const tag = link ? `a class="kachel" href="${link}"` : `div class="kachel"`;
      return `<${tag}><div class="kachel-wert">${esc(I18N.zahl(wert))}</div>
        <div class="kachel-name">${esc(I18N.t(name))}</div>
        ${zusatz ? `<div class="kachel-zusatz">${esc(zusatz)}</div>` : ""}</${link ? "a" : "div"}>`;
    };
    $("#kacheln").innerHTML = [
      kachel(k.proben, "kachel.proben", "", "#tabelle"),
      kachel(k.plots, "kachel.plots", k.probenJePlot ? I18N.t("zusatz.plots", { n: k.probenJePlot }) : ""),
      kachel(k.bloecke, "kachel.bloecke", k.plotsJeBlock ? I18N.t("zusatz.bloecke", { n: k.plotsJeBlock }) : ""),
      kachel(k.kampagnen.length, "kachel.kampagnen", k.kampagnen.map(I18N.kampagne).join(" · ")),
      kachel(k.beobachter, "kachel.beobachter", I18N.t("zusatz.beobachter", { n: k.beobachterSchreibweisen })),
      kachel(k.fehlZellen, "kachel.fehlend", I18N.t("zusatz.fehlend", { n: k.fehlProben.length }), "#qualitaet"),
      kachel(auffZellen, "kachel.auffaellig", I18N.t("zusatz.auffaellig", { n: auffProben }), "#qualitaet")
    ].join("");
  }

  function gefiltert() { return Daten.filtere(zeilen, zustand.filter); }

  function zeichneTabelle() {
    const auswahl = gefiltert();
    $("#tabelle-zaehler").innerHTML = I18N.t("zaehler", { x: auswahl.length, n: zeilen.length });
    Tabelle.zeichne($("#tabelle"), auswahl, zeilen.length, index);
  }

  /* ---------- Filter ---------- */

  function filterText(key, wert) {
    if (key === "date") return `${I18N.kampagne(wert)} (${I18N.datum(wert)})`;
    if (key === "sown_richness") return I18N.zahl(wert);
    return wert;
  }

  // Filter-Auswahlfelder in jeden Ort (Tabelle, Graphen-Leiste) bauen
  function baueFilter() {
    $$(".filter-ort").forEach((ort) => {
      ort.innerHTML = GRUPPEN.map((key) => {
        const optionen = Daten.auspraegungen(zeilen, key)
          .map((w) => `<option value="${esc(w)}">${esc(filterText(key, w))}</option>`).join("");
        return `<label class="feld"><span>${esc(I18N.t("gruppe." + key))}</span>
          <select data-filter="${key}"><option value="">${esc(I18N.t("filter.alle"))}</option>${optionen}</select></label>`;
      }).join("");
    });
    synchronisiereFilter();
  }

  function synchronisiereFilter() {
    $$("select[data-filter]").forEach((s) => { s.value = zustand.filter[s.dataset.filter]; });
    $$("input.suche").forEach((i) => { if (i.value !== zustand.filter.suche) i.value = zustand.filter.suche; });
  }

  /* ---------- Sprache ---------- */

  function setzeSprachknoepfe() {
    $$("[data-sprache]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sprache === I18N.sprache)));
  }

  function wechsleSprache(s) {
    if (s === I18N.sprache) return;
    I18N.setzeSprache(s);
    schreibe(SPEICHER_SPRACHE, s);
    I18N.anwenden();
    setzeSprachknoepfe();
    if (zeilen.length) { baueFilter(); zeichneAnsicht(); }
  }

  /* ---------- Ereignisse ---------- */

  function bindeEreignisse() {
    window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });

    $$("[data-sprache]").forEach((b) => b.addEventListener("click", () => wechsleSprache(b.dataset.sprache)));

    document.addEventListener("change", (e) => {
      const el = e.target;
      if (el.matches("select[data-filter]")) {
        zustand.filter[el.dataset.filter] = el.value;
        synchronisiereFilter();
        zeichneAnsicht();
      } else if (el.matches("[data-zustand]")) {
        zustand[el.dataset.zustand] = el.type === "checkbox" ? el.checked : el.value;
        zeichneAnsicht();
      } else if (el.id === "datei" && el.files[0]) {
        el.files[0].text().then((text) => { if (uebernehme(text)) el.value = ""; });
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target.matches("input.suche")) {
        zustand.filter.suche = e.target.value;
        synchronisiereFilter();
        zeichneAnsicht();
      }
    });

    document.addEventListener("click", (e) => {
      const sort = e.target.closest(".sortier");
      if (sort) {
        Tabelle.sortiereNach(sort.dataset.sort);
        zeichneTabelle();
        const neu = $(`.sortier[data-sort="${sort.dataset.sort}"]`);
        if (neu) neu.focus();
        return;
      }
      const setze = e.target.closest("[data-setze]");
      if (setze) {
        zustand[setze.dataset.setze] = setze.dataset.wert;
        zeichneAnsicht();
        return;
      }
      if (e.target.closest(".zuruecksetzen")) {
        Object.keys(zustand.filter).forEach((k) => { zustand.filter[k] = ""; });
        synchronisiereFilter();
        zeichneAnsicht();
        return;
      }
      if (e.target.closest("#download")) Tabelle.alsCsv(gefiltert());
    });
  }

  return {
    start,
    get zustand() { return zustand; },
    get zeilen() { return zeilen; },
    get befunde() { return befunde; },
    gefiltert
  };
})();

document.addEventListener("DOMContentLoaded", App.start);
