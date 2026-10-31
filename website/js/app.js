/* app.js – Steuerung: Daten laden, Ansichten per Hash, Zustand, Sprache. */

// Pflicht-Namensnennung des IGN für alles, was aus dem Geländemodell abgeleitet ist (hier: Höhen).
// Wortlaut fest, nicht übersetzen (villaverde/quellen_lizenzen.md, D3).
const DGM_NENNUNG = 'Obra derivada de MDT02-cob2 2015-2021 CC-BY 4.0 <a href="http://www.scne.es" rel="noopener">scne.es</a>';

const App = (function () {
  const SPEICHER_SPRACHE = "villaverde.sprache";   // auch von der 3D-Startseite gelesen und geschrieben
  const SPEICHER_THEMA = "villaverde.thema";   // auch von der 3D-Startseite gelesen und geschrieben

  // Ein Zustand für alle Ansichten: Quelle und Filter gelten in Karte, Tabelle und Graphen gleich
  const zustand = {
    ansicht: "start",
    quelle: "modell",
    filter: { tiefe: "", suche: "" },
    messgroesse: "soc",
    x: "clay",
    y: "cec",
    korr: "alle",
    karteTiefe: "",
    tab: "verteilung",
    profil: null
  };
  let d = null;          // Ergebnis von Daten.lese
  let index = {};        // Befunde je Quelle, ID und Spalte: index[quelle|id][spalte] = [befund, …]

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
    if (param.get("lang")) schreibe(SPEICHER_SPRACHE, I18N.sprache);   // das 3D-Gelände liest denselben Speicher
    if (param.get("akzent") === "moos") document.documentElement.dataset.akzent = "moos";
    I18N.anwenden();
    setzeSprachknoepfe();
    $("#thema").setAttribute("aria-pressed", String(document.documentElement.dataset.thema === "dunkel"));
    $$(".kartenfuss-dgm").forEach((el) => { el.innerHTML = DGM_NENNUNG; });
    bindeEreignisse();
    laden();
  }

  async function laden() {
    try {
      if (typeof Papa === "undefined") throw new Error("Papa Parse fehlt");
      const texte = {};
      await Promise.all(Object.entries(DATEIEN).map(async ([k, datei]) => {
        // Ein zweiter Versuch, falls die Verbindung einmal abreißt
        const antwort = await fetch(datei.pfad, { cache: "no-cache" })
          .catch(() => new Promise((r) => setTimeout(r, 400)).then(() => fetch(datei.pfad, { cache: "no-cache" })));
        if (!antwort.ok) { if (datei.optional) return; throw new Error("HTTP " + antwort.status); }
        texte[k] = await antwort.text();
      }));
      uebernehme(texte);
    } catch (e) {
      console.error(e);
      zeigeLadefehler(location.protocol === "file:" ? "" : String(e));
    }
  }

  function zeigeLadefehler(meldung) {
    $("#laden").hidden = true;
    $("#ladefehler").hidden = false;
    $$("section.ansicht").forEach((s) => { s.hidden = true; });
    // Bei file:// lässt sich der Ordner aus der Adresse ablesen
    let ordner = "<Pfad>/villaverde/website";
    if (location.protocol === "file:") ordner = decodeURIComponent(location.pathname).replace(/\/[^/]*$/, "");
    $("#startbefehl").textContent = `cd "${ordner}" && python3 -m http.server 8000`;
    $("#dateifehler").textContent = meldung || "";
  }

  // Datei-Wähler: Dateien über ihren Namen auf der Website oder im Original zuordnen
  async function ausDateien(dateien) {
    const texte = {};
    for (const f of dateien) {
      const k = Object.keys(DATEIEN).find((key) => [DATEIEN[key].pfad.split("/").pop(), DATEIEN[key].original].includes(f.name));
      if (k) texte[k] = await f.text();
    }
    return uebernehme(texte);
  }

  function uebernehme(texte) {
    const erg = Daten.lese(texte);
    if (erg.fehler) { zeigeLadefehler(erg.fehler); return false; }
    d = erg;
    index = {};
    for (const b of d.befunde) {
      const proZeile = (index[b.quelle + "|" + b.id] = index[b.quelle + "|" + b.id] || {});
      for (const s of b.spalten) (proZeile[s] = proZeile[s] || []).push(b);
    }
    $("#laden").hidden = true;
    $("#ladefehler").hidden = true;
    route();
    return true;
  }

  /* ---------- Ansichten ---------- */

  function route() {
    if (!d) return;
    const [ziel, arg] = location.hash.replace("#", "").split("/");
    zustand.ansicht = ansichten().includes(ziel) ? ziel : "start";
    if (zustand.ansicht === "karte" && arg && d.profile.some((p) => String(p.profil) === arg)) zustand.profil = Number(arg);
    $$("section.ansicht").forEach((s) => { s.hidden = s.dataset.ansicht !== zustand.ansicht; });
    $$(".nav a, #menue a").forEach((a) => {
      if (a.dataset.ansicht === zustand.ansicht) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    zeichneAnsicht();
  }

  // Auswahl gültig halten, wenn die Quelle wechselt (Labor hat z. B. keine KAK)
  function pruefeZustand() {
    const m = Daten.messgroessen(zustand.quelle);
    if (!m.includes(zustand.messgroesse)) zustand.messgroesse = "soc";
    if (!m.includes(zustand.x)) zustand.x = "clay";
    if (!m.includes(zustand.y)) zustand.y = zustand.quelle === "labor" ? "caco3" : "cec";
    const t = Daten.tiefen(zeilen());
    if (zustand.filter.tiefe && !t.includes(zustand.filter.tiefe)) zustand.filter.tiefe = "";
    if (!t.includes(zustand.karteTiefe)) zustand.karteTiefe = t[0];
  }

  function zeichneAnsicht() {
    pruefeZustand();
    baueFilter();
    Auswahl.zeichne(zeilen(), zustand.quelle);
    zustand.filter.ids = Auswahl.satz(zustand.quelle);
    $$("[data-setze]:not([role=tab])").forEach((b) => b.setAttribute("aria-pressed", String(zustand[b.dataset.setze] === b.dataset.wert)));
    $$(".wahl-messgroesse").forEach((el) => {
      el.innerHTML = Daten.messgroessen(zustand.quelle).map((m) => `<option value="${m}">${esc(I18N.t("spalte." + m))}</option>`).join("");
      el.value = zustand.messgroesse;
    });
    const a = zustand.ansicht;
    if (a === "start") Uebersicht.zeichne(d);
    else if (a === "hintergrund") Tour.zeichne(d);
    else if (a === "karte") Karte.zeichne(d, zustand);
    else if (a === "tabelle") zeichneTabelle();
    else if (a === "graphen") Graphen.zeichne(zeilen(), zustand);
  }

  function zeilen() { return d.zeilen[zustand.quelle]; }
  function gefiltert() { return Tabelle.filtere(Daten.filtere(zeilen(), zustand.filter), zustand.quelle); }

  function zeichneTabelle() {
    const auswahl = gefiltert();
    $("#tabelle-quelle").innerHTML = I18N.t("tabelle.quelle." + zustand.quelle);
    $("#tabelle-zaehler").innerHTML = I18N.t("zaehler", { x: auswahl.length, n: zeilen().length });
    Tabelle.zeichne($("#tabelle"), auswahl, zeilen(), index, zustand.quelle);
  }

  /* ---------- Filter ---------- */

  // Tiefen-Auswahl in jeden Ort (Tabelle, Graphen-Leiste) und in die Karte bauen
  function baueFilter() {
    const t = Daten.tiefen(zeilen());
    const optionen = t.map((w) => `<option value="${esc(w)}">${esc(I18N.tiefe(w))}</option>`).join("");
    $$(".filter-ort").forEach((ort) => {
      ort.innerHTML = `<label class="feld"><span>${esc(I18N.t("filter.tiefe"))}</span>
        <select data-filter="tiefe"><option value="">${esc(I18N.t("filter.alle"))}</option>${optionen}</select></label>`;
    });
    const kt = $("#wahl-karte-tiefe");
    if (kt) { kt.innerHTML = optionen; kt.value = zustand.karteTiefe; }
    synchronisiereFilter();
  }

  function synchronisiereFilter() {
    $$("select[data-filter]").forEach((s) => { s.value = zustand.filter[s.dataset.filter]; });
    $$("input.suche").forEach((i) => { if (i.value !== zustand.filter.suche) i.value = zustand.filter.suche; });
  }

  /* ---------- Profil wählen (Karte, Tabelle) ---------- */

  function waehleProfil(p) {
    zustand.profil = p;
    if (location.hash !== "#karte/" + p) history.replaceState(null, "", "#karte/" + p);
    Karte.zeichne(d, zustand);
    const el = $("#steckbrief");
    if (el && window.innerWidth < 900) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (d) zeichneAnsicht();
  }

  /* ---------- Farbthema ---------- */

  // Graphen lesen ihre Farben beim Zeichnen aus den CSS-Variablen → nach dem Wechsel neu zeichnen
  function wechsleThema() {
    const t = document.documentElement.dataset.thema === "dunkel" ? "hell" : "dunkel";
    document.documentElement.dataset.thema = t;
    schreibe(SPEICHER_THEMA, t);
    $("#thema").setAttribute("aria-pressed", String(t === "dunkel"));
    if (d) zeichneAnsicht();
  }

  /* ---------- Ereignisse ---------- */

  function bindeEreignisse() {
    window.addEventListener("hashchange", () => {
      const vorher = zustand.ansicht;
      route();
      if (zustand.ansicht !== vorher) window.scrollTo(0, 0);
    });

    $$("[data-sprache]").forEach((b) => b.addEventListener("click", () => wechsleSprache(b.dataset.sprache)));
    $("#thema").addEventListener("click", wechsleThema);
    const klappeMenue = (offen) => { $("#menue").hidden = !offen; $("#menue-knopf").setAttribute("aria-expanded", String(offen)); };
    document.addEventListener("click", (e) => {
      if (e.target.closest("#menue-knopf")) klappeMenue($("#menue").hidden);
      else klappeMenue(false);                 // Klick auf einen Eintrag oder daneben schließt
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") klappeMenue(false); });
    Auswahl.binde(() => zeichneAnsicht());
    Tabelle.binde(() => zeichneAnsicht());

    // Tabs der Graphen: Pfeiltasten, Pos1 und Ende wechseln den Tab (Muster ARIA Tabs)
    $("#graph-tabs").addEventListener("keydown", (e) => {
      const tabs = $$("[role=tab]", e.currentTarget);
      const i = tabs.findIndex((b) => b.dataset.wert === zustand.tab);
      const ziel = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
      if (ziel === undefined) return;
      e.preventDefault();
      zustand.tab = tabs[ziel].dataset.wert;
      zeichneAnsicht();
      tabs[ziel].focus();
    });

    document.addEventListener("change", (e) => {
      const el = e.target;
      if (el.matches("select[data-filter]")) {
        zustand.filter[el.dataset.filter] = el.value;
        synchronisiereFilter();
        zeichneAnsicht();
      } else if (el.matches("[data-zustand]")) {
        zustand[el.dataset.zustand] = el.type === "checkbox" ? el.checked : el.value;
        zeichneAnsicht();
      } else if (el.id === "datei" && el.files.length) {
        ausDateien([...el.files]).then((ok) => { if (ok) el.value = ""; });
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
      const sprung = e.target.closest("[data-sprung]");
      if (sprung) {
        const ziel = document.getElementById(sprung.dataset.sprung);
        if (ziel) ziel.scrollIntoView({ behavior: "smooth", block: "start" });
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
        Auswahl.leeren();
        Tabelle.leereBereich();
        synchronisiereFilter();
        zeichneAnsicht();
        return;
      }
      if (e.target.closest("#download")) Tabelle.alsCsv(gefiltert(), zustand.quelle);
    });
  }

  return {
    start, waehleProfil,
    get zustand() { return zustand; },
    get daten() { return d; },
    get index() { return index; }
  };
})();

document.addEventListener("DOMContentLoaded", App.start);
