/* tabelle.js – Datentabelle nach Claude Design Runde 4 (Variante 4a): Größen-Leiste mit Verteilung, Fokus-Spalte,
   Bereichsfilter, Zahl/Balken, Spaltengruppen, Dichte, Fußzeilen Median und Spanne; Sortieren, Markierungen, CSV.
   Quelle, Tiefe, Suche und Auswahl verwaltet app.js; hier kommen die gefilterten Zeilen an. */

// Spalten vor den Messgrößen; Koordinaten der Laborproben stammen aus dem Profil
const KOPFSPALTEN = [
  { key: "id", typ: "text", csv: "ID" },
  { key: "profil", typ: "profil", csv: "profile" },
  { key: "tiefe", typ: "tiefe", csv: "depth_cm" },
  { key: "x", typ: "koord", csv: "x_utm30n" },
  { key: "y", typ: "koord", csv: "y_utm30n" },
  { key: "hoehe", typ: "hoehe", csv: "elevation_dem_m" }
];

// Erklärung der Herkunftsmarken, überall dort, wo die Buchstaben stehen (auch Steckbrief und Tour)
function herkunftLegende(arten) {
  return `<span class="marken-legende">${arten.map((a) =>
    `<span><span class="art-marke" data-art="${a}">${I18N.t("art.kurz." + a)}</span>${I18N.t("art.wort." + a)}</span>`).join("")}</span>`;
}

// Spaltengruppen zum Ein- und Ausblenden; je Quelle gelten nur die vorhandenen Größen
const SPALTENGRUPPEN = [
  { key: "lage", name: "tab.lage", spalten: ["x", "y", "hoehe"] },
  { key: "chemie", name: "tab.chemie", spalten: ["ph", "soc", "nt", "ct", "caco3"] },
  { key: "koernung", name: "panel.koernung", spalten: ["sand", "silt", "clay"] },
  { key: "abgel", name: "tab.abgeleitet", spalten: ["cec", "thetafc", "sqr"] }
];
const KLASSEN = 14;               // Säulen im Mini-Histogramm der Größen-Leiste

const Tabelle = (function () {
  let sortKey = "profil";
  let sortRichtung = 1;           // 1 aufsteigend, -1 absteigend
  const ansicht = {
    zellen: "balken", dicht: false, leiste: true, faerben: true, abw: false, fokus: "soc",
    gruppen: { lage: true, chemie: true, koernung: true, abgel: true }, bereich: {}
  };
  let statistikStand = null, statistik = {};

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function spalten(quelle) {
    return KOPFSPALTEN.concat(Daten.messgroessen(quelle).map((key) => ({ key, typ: "zahl" })));
  }

  // Fehlende Werte stehen in beiden Richtungen am Ende; Tiefe sortiert nach Oberkante
  function sortiere(zeilen) {
    const wert = (z) => (sortKey === "tiefe" ? z.oben : sortKey === "id" ? Number(z.id) : z[sortKey]);
    return [...zeilen].sort((a, b) => {
      const x = wert(a), y = wert(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const v = typeof x === "number" ? x - y : String(x).localeCompare(String(y), I18N.locale());
      return v * sortRichtung || a.profil - b.profil || a.oben - b.oben;
    });
  }

  function kopfzelle(s, quelle) {
    const zahl = s.typ !== "text";
    const einheit = I18N.einheit(s.key);
    const aktiv = s.key === sortKey;
    const aria = aktiv ? (sortRichtung === 1 ? "ascending" : "descending") : "none";
    const pfeil = aktiv ? (sortRichtung === 1 ? "▲" : "▼") : "";
    const zustand = aktiv ? I18N.t(sortRichtung === 1 ? "sort.auf" : "sort.ab") : "";
    const art = s.typ === "zahl" ? Daten.art(quelle, s.key) : null;
    return `<th scope="col" class="${zahl ? "zahl" : ""}${ansicht.leiste && s.key === fokus(quelle) ? " fokus-kopf" : ""}" aria-sort="${aria}">
      <button type="button" class="sortier" data-sort="${s.key}" title="${esc(I18N.t("sort.hinweis", { spalte: I18N.t("spalte." + s.key) }))}">
        <span>${esc(I18N.t("spalte." + s.key))} <span class="pfeil" aria-hidden="true">${pfeil}</span></span>
        ${einheit ? `<span class="einheit">${esc(einheit)}</span>` : ""}
        ${art ? `<span class="einheit"><span class="art-marke" data-art="${art}" title="${esc(I18N.t("art." + art))}">${esc(I18N.t("art.kurz." + art))}</span><span class="nur-sr">${esc(I18N.t("art." + art))}</span></span>` : ""}
        ${zustand ? `<span class="nur-sr">${esc(zustand)}</span>` : ""}
      </button></th>`;
  }

  const groessen = (quelle) => Daten.messgroessen(quelle);
  const fokus = (quelle) => (groessen(quelle).includes(ansicht.fokus) ? ansicht.fokus : "soc");
  const dez = (k) => (k === "hoehe" ? 1 : Daten.groesse(k).dez);

  // Median, Bereich und Verteilung je Größe über alle Zeilen der Quelle, Median zusätzlich je Tiefe
  function rechne(zeilen, quelle) {
    if (statistikStand === zeilen) return;
    statistikStand = zeilen;
    statistik = {};
    for (const k of groessen(quelle)) {
      const werte = zeilen.map((z) => z[k]).filter((v) => v !== null && Number.isFinite(v));
      const min = Math.min(...werte), max = Math.max(...werte), bins = new Array(KLASSEN).fill(0);
      werte.forEach((v) => { bins[Math.min(KLASSEN - 1, Math.floor(((v - min) / (max - min || 1)) * KLASSEN))]++; });
      const med = {};
      for (const t of Daten.tiefen(zeilen)) med[t] = Daten.median(zeilen.filter((z) => z.tiefe === t).map((z) => z[k]));
      statistik[k] = { min, max, bins, bmax: Math.max(...bins), median: Daten.median(werte), med };
    }
  }
  const lage = (k, v) => (v - statistik[k].min) / (statistik[k].max - statistik[k].min || 1);

  // Farbe aus den Stützstellen einer Skala; Schrift nach Helligkeit des Grunds
  function heat(stufen, t) {
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const f = Math.max(0, Math.min(1, t)) * (stufen.length - 1), i = Math.min(stufen.length - 2, Math.floor(f));
    const a = hex(stufen[i][1]), b = hex(stufen[i + 1][1]);
    const c = a.map((v, j) => Math.round(v + (b[j] - v) * (f - i)));
    const [r, g, bl] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return { grund: `rgb(${c.join(",")})`, schrift: 0.2126 * r + 0.7152 * g + 0.0722 * bl > 0.2 ? "#1d1d1f" : "#ffffff" };
  }

  function zelle(s, z, befunde, quelle) {
    const klassen = [s.typ !== "text" ? "zahl" : ""];
    if (s.typ === "zahl" && z._nichtErhoben[s.key]) {
      return `<td class="zahl fehlt" title="${esc(I18N.t("erkl.nicht"))}">–<span class="nur-sr"> (${esc(I18N.t("erkl.nicht"))})</span></td>`;
    }
    if (s.typ === "zahl" && z._fehlt[s.key]) {
      return `<td class="zahl fehlt" title="${esc(I18N.t("erkl.fehlt"))}">–<span class="marke-fehlt">${esc(I18N.t("fehlt"))}</span></td>`;
    }
    let wert;
    if (s.typ === "zahl") wert = esc(I18N.roh(z._roh[s.key]));
    else if (s.typ === "tiefe") wert = esc(I18N.tiefe(z.tiefe));
    else if (s.typ === "koord") wert = z[s.key] === null ? "–" : esc(String(z[s.key]));
    else if (s.typ === "hoehe") wert = esc(I18N.zahl(z.hoehe, 1));
    else if (s.typ === "profil") wert = `<a href="#karte/${z.profil}">${esc(z.profil)}</a>`;
    else wert = esc(z[s.key]);
    if (befunde && befunde.length) {
      klassen.push("auffaellig");
      const grund = befunde.map((b) => Daten.erklaere(b)).join(" · ");
      return `<td class="${klassen.join(" ")}" title="${esc(grund)}"><span class="marke-auffaellig" aria-hidden="true">!</span>${wert}<span class="nur-sr"> (${esc(grund)})</span></td>`;
    }
    if (s.typ !== "zahl" || z[s.key] === null) return `<td class="${klassen.join(" ")}">${wert}</td>`;
    // Fokus-Spalte: Wert (batlow) oder Abweichung vom Median der Tiefe (vik); Rohwert bleibt im Tooltip
    if (ansicht.faerben && ansicht.leiste && s.key === fokus(quelle)) {
      const st = statistik[s.key];
      if (ansicht.abw) {
        const m = st.med[z.tiefe], spanne = Math.max(st.max - m, m - st.min) || 1, d = z[s.key] - m;
        const h = heat(FARBEN_VIK, 0.5 + d / spanne / 2);
        const text = (d > 0 ? "+" : d < 0 ? "−" : "±") + I18N.zahl(Math.abs(d), dez(s.key));
        return `<td class="zahl fokus" style="background:${h.grund};color:${h.schrift}" title="${wert} · ${esc(I18N.t("legende.median"))} ${esc(I18N.tiefe(z.tiefe))}: ${esc(I18N.zahl(m, dez(s.key)))}">${text}</td>`;
      }
      const h = heat(FARBEN_BATLOW, lage(s.key, z[s.key]));
      return `<td class="zahl fokus" style="background:${h.grund};color:${h.schrift}">${wert}</td>`;
    }
    if (ansicht.zellen === "balken") {
      return `<td class="zahl"><span class="wert-balken">${wert}<i aria-hidden="true"><b style="width:${Math.round(lage(s.key, z[s.key]) * 100)}%"></b></i></span></td>`;
    }
    return `<td class="zahl">${wert}</td>`;
  }

  // Sichtbare Spalten: Kennung, Tiefe und die eingeblendeten Gruppen; die Fokus-Gruppe bleibt immer sichtbar
  function sichtbar(quelle) {
    const vorhanden = groessen(quelle), f = fokus(quelle);
    const namen = SPALTENGRUPPEN.flatMap((g) =>
      ansicht.gruppen[g.key] || (ansicht.leiste && g.spalten.includes(f)) ? g.spalten : []);
    return spalten(quelle).filter((s) => ["id", "profil", "tiefe"].includes(s.key) || (namen.includes(s.key) && (s.typ !== "zahl" || vorhanden.includes(s.key))));
  }

  // Fußzeilen: Median und Spanne der gefilterten Zeilen
  function fuss(sp, zeilen) {
    const stat = (s, f) => {
      if (s.typ !== "zahl" && s.typ !== "hoehe") return "";
      const w = zeilen.map((z) => z[s.key]).filter((v) => v !== null && v !== undefined && Number.isFinite(v));
      return w.length ? f(w, dez(s.key)) : "–";
    };
    const zeile = (name, f) => `<tr><td>${esc(name)}</td><td></td>${sp.slice(2).map((s) => `<td class="zahl">${stat(s, f)}</td>`).join("")}</tr>`;
    return zeile(I18N.t("legende.median"), (w, d) => esc(I18N.zahl(Daten.median(w), d))) +
      zeile(I18N.t("tab.spanne"), (w, d) => `${esc(I18N.zahl(Math.min(...w), d))}–${esc(I18N.zahl(Math.max(...w), d))}`);
  }

  function leiste(quelle, gesamt) {
    const el = $("#tabelle-leiste"), f = fokus(quelle), st = statistik[f];
    const liste = groessen(quelle).map((k) => {
      const an = k === f, s = statistik[k], art = Daten.art(quelle, k), b = ansicht.bereich[k] || {};
      const von = zahlAus(b.von), bis = zahlAus(b.bis);
      const saeulen = s.bins.map((n, i) => {
        const lo = s.min + (i / KLASSEN) * (s.max - s.min), hi = s.min + ((i + 1) / KLASSEN) * (s.max - s.min);
        const drin = !an || ((von === null || hi >= von) && (bis === null || lo <= bis));
        const farbe = an ? heat(FARBEN_BATLOW, (i + 0.5) / KLASSEN).grund : "var(--text-2)";
        return `<i style="height:${Math.max(4, Math.round((n / s.bmax) * 100))}%;background:${farbe};opacity:${an ? (drin ? 1 : 0.22) : 0.35}"></i>`;
      }).join("");
      return `<button type="button" class="groesse" data-tab-fokus="${k}" aria-pressed="${an}" title="${esc(I18N.t("spalte." + k))}">
        <span><span class="groesse-name">${esc(I18N.t("kurz." + k))}<span class="art-marke" data-art="${art}" title="${esc(I18N.t("art." + art))}">${esc(I18N.t("art.kurz." + art))}</span></span>
          <small>${esc(I18N.t("legende.median"))} ${esc(I18N.zahl(s.median, dez(k)))} ${esc(I18N.einheit(k) || "")}</small></span>
        <span class="groesse-hist" aria-hidden="true">${saeulen}</span></button>`;
    }).join("");
    const b = ansicht.bereich[f] || {}, stufen = (ansicht.abw ? FARBEN_VIK : FARBEN_BATLOW).map((s) => s[1]).join(", ");
    el.innerHTML = `<div class="leiste-kopf"><span>${esc(I18N.t("tab.groessen"))}</span><small>${esc(I18N.t("tab.alle", { n: gesamt }))}</small>
        <label class="schalter" title="${esc(I18N.t("tab.einfaerben"))}"><input type="checkbox" id="tab-faerben"${ansicht.faerben ? " checked" : ""} aria-label="${esc(I18N.t("tab.einfaerben"))}"><span class="schalter-spur"></span></label></div>
      <div class="groessen">${liste}</div>
      <div class="fokus-feld">
        <strong>${esc(I18N.t("spalte." + f))}${I18N.einheit(f) ? ` (${esc(I18N.einheit(f))})` : ""}</strong>
        <div class="fokus-bereich">
          <label>${esc(I18N.t("tab.von"))}<input type="text" inputmode="decimal" data-tab-bereich="von" value="${esc(b.von || "")}" placeholder="${esc(I18N.zahl(st.min, dez(f)))}"></label>
          <label>${esc(I18N.t("tab.bis"))}<input type="text" inputmode="decimal" data-tab-bereich="bis" value="${esc(b.bis || "")}" placeholder="${esc(I18N.zahl(st.max, dez(f)))}"></label>
        </div>
        <div class="fokus-faerbung"><span>${esc(I18N.t("tab.faerbung"))}</span>
          <div class="segment" role="group" aria-label="${esc(I18N.t("tab.faerbung"))}">
            <button type="button" data-tab-abw="0" aria-pressed="${!ansicht.abw}">${esc(I18N.t("tab.wert"))}</button>
            <button type="button" data-tab-abw="1" aria-pressed="${ansicht.abw}">${esc(I18N.t("tab.abw"))}</button>
          </div></div>
        <div class="fokus-skala" aria-hidden="true" style="background:linear-gradient(90deg, ${stufen})"></div>
        <div class="fokus-grenzen"><span>${ansicht.abw ? "−" : esc(I18N.zahl(st.min, dez(f)))}</span><span>${ansicht.abw ? "+" : esc(I18N.zahl(st.max, dez(f)))}</span></div>
      </div>`;
  }

  const zahlAus = (text) => { const v = parseFloat(String(text ?? "").replace(",", ".")); return Number.isFinite(v) ? v : null; };

  // Bereichsfilter der Fokus-Größe, gilt nur bei eingeblendeter Leiste
  function filtere(zeilen, quelle) {
    if (!ansicht.leiste) return zeilen;
    const f = fokus(quelle), b = ansicht.bereich[f] || {}, von = zahlAus(b.von), bis = zahlAus(b.bis);
    if (von === null && bis === null) return zeilen;
    return zeilen.filter((z) => z[f] !== null && (von === null || z[f] >= von) && (bis === null || z[f] <= bis));
  }

  function bedienung() {
    document.querySelectorAll("[data-tab-zellen]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tabZellen === ansicht.zellen)));
    document.querySelectorAll("[data-tab-dicht]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.tabDicht === "1") === ansicht.dicht)));
    document.querySelectorAll("[data-tab-gruppe]").forEach((b) => b.setAttribute("aria-pressed", String(ansicht.gruppen[b.dataset.tabGruppe])));
    $("#tab-leiste").checked = ansicht.leiste;
    $("#tabelle-leiste").hidden = !ansicht.leiste;
    $(".tabelle-layout").classList.toggle("ohne-leiste", !ansicht.leiste);
  }

  // zeilen: gefiltert · alle: alle Zeilen der Quelle · index: Befunde je Zeile und Spalte
  function zeichne(el, zeilen, alle, index, quelle) {
    rechne(alle, quelle);
    ansicht.fokus = fokus(quelle);        // Laborwerte haben z. B. keine KAK
    const sp = sichtbar(quelle);
    if (!spalten(quelle).some((s) => s.key === sortKey)) { sortKey = "profil"; sortRichtung = 1; }
    const sortiert = sortiere(zeilen);
    const kopf = sp.map((s) => kopfzelle(s, quelle)).join("");
    const koerper = sortiert.length
      // Nach Profil sortiert: Linie nur zwischen den Profilen, sonst zwischen allen Zeilen
      ? sortiert.map((z, i) => `<tr${i && (sortKey !== "profil" || sortiert[i - 1].profil !== z.profil) ? ` class="trenn"` : ""}>${sp.map((s) => zelle(s, z, (index[z.quelle + "|" + z.id] || {})[s.key], quelle)).join("")}</tr>`).join("")
      : `<tr><td class="leer" colspan="${sp.length}">${esc(I18N.t("tabelle.leer"))}</td></tr>`;
    const links = el.scrollLeft, oben = el.scrollTop;
    el.innerHTML = `<table class="daten${ansicht.dicht ? " dicht" : ""}">
      <caption class="nur-sr">${esc(I18N.t("tabelle.beschriftung", { x: zeilen.length, n: alle.length }))}</caption>
      <thead><tr>${kopf}</tr></thead><tbody>${koerper}</tbody>${zeilen.length ? `<tfoot>${fuss(sp, zeilen)}</tfoot>` : ""}</table>`;
    el.scrollLeft = links;
    el.scrollTop = oben;
    if (ansicht.leiste) leiste(quelle, alle.length);
    $("#tabelle-marken").innerHTML = herkunftLegende(["modelliert", "abgeleitet", "index", "gemessen", "unklar"]);
    bedienung();
  }

  // Bedienung der Ansicht; neuZeichnen zeichnet die Tabelle neu (app.js)
  function binde(neuZeichnen) {
    const wurzel = $("#ansicht-tabelle");
    wurzel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab-zellen], [data-tab-dicht], [data-tab-gruppe], [data-tab-fokus], [data-tab-abw]");
      if (!b) return;
      const d = b.dataset;
      if (d.tabZellen) ansicht.zellen = d.tabZellen;
      if (d.tabDicht) ansicht.dicht = d.tabDicht === "1";
      if (d.tabGruppe) ansicht.gruppen[d.tabGruppe] = !ansicht.gruppen[d.tabGruppe];
      if (d.tabAbw) ansicht.abw = d.tabAbw === "1";
      if (d.tabFokus) { ansicht.fokus = d.tabFokus; sortKey = d.tabFokus; sortRichtung = -1; }
      neuZeichnen();
    });
    wurzel.addEventListener("change", (e) => {
      if (e.target.id === "tab-leiste") ansicht.leiste = e.target.checked;
      else if (e.target.id === "tab-faerben") ansicht.faerben = e.target.checked;
      else if (e.target.dataset.tabBereich) {
        const f = ansicht.fokus;
        ansicht.bereich[f] = Object.assign({}, ansicht.bereich[f], { [e.target.dataset.tabBereich]: e.target.value });
      } else return;
      neuZeichnen();
    });
  }

  const leereBereich = () => { ansicht.bereich = {}; };

  function sortiereNach(key) {
    if (key === sortKey) sortRichtung = -sortRichtung;
    else { sortKey = key; sortRichtung = 1; }
    if (Daten.groesse(key)) ansicht.fokus = key;   // Klick auf den Spaltenkopf wählt auch die Fokus-Größe
  }

  // Download: Originalspaltennamen der Messgrößen und Rohtexte, dazu Profil-Koordinaten und Höhe
  function alsCsv(zeilen, quelle) {
    const sp = spalten(quelle);
    const kopf = sp.map((s) => s.csv || [].concat(Daten.groesse(s.key)[quelle])[0]);
    const daten = sortiere(zeilen).map((z) => sp.map((s) => {
      if (s.typ === "zahl") return z._roh[s.key];
      if (s.key === "tiefe") return z.tiefe;
      return z[s.key] === null ? "NA" : z[s.key];
    }));
    // IGN-Nennung wandert mit den Höhen in die Datei (villaverde/quellen_lizenzen.md, D3)
    const nennung = DGM_NENNUNG.replace(/<[^>]+>/g, "");
    const text = Papa.unparse({ fields: [...kopf, "elevation_attribution"], data: daten.map((d) => [...d, nennung]) }, { newline: "\n" });
    const blob = new Blob([text + "\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `villaverde_${quelle}_auswahl.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return { zeichne, sortiereNach, alsCsv, sortiere, filtere, binde, leereBereich, heat };
})();
