/* tabelle.js – Datentabelle: Sortieren, Markierungen, CSV-Download.
   Filter und Suche verwaltet app.js; hier kommen die gefilterten Zeilen an. */

const Tabelle = (function () {
  let sortKey = "sample_id";
  let sortRichtung = 1;           // 1 aufsteigend, -1 absteigend

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Fehlende Werte stehen in beiden Richtungen am Ende
  function sortiere(zeilen) {
    return [...zeilen].sort((a, b) => {
      const x = a[sortKey], y = b[sortKey];
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const v = typeof x === "number" ? x - y : String(x).localeCompare(String(y), I18N.locale());
      return v * sortRichtung || a.sample_id.localeCompare(b.sample_id);
    });
  }

  function kopfzelle(s) {
    const zahl = s.typ === "zahl" || s.typ === "ganzzahl";
    const einheit = I18N.t("einheit." + s.key);
    const mitEinheit = einheit !== "einheit." + s.key;
    const aktiv = s.key === sortKey;
    const aria = aktiv ? (sortRichtung === 1 ? "ascending" : "descending") : "none";
    const pfeil = aktiv ? (sortRichtung === 1 ? "▲" : "▼") : "";
    const zustand = aktiv ? I18N.t(sortRichtung === 1 ? "sort.auf" : "sort.ab") : "";
    return `<th scope="col" class="${zahl ? "zahl" : ""}" aria-sort="${aria}">
      <button type="button" class="sortier" data-sort="${s.key}" title="${esc(I18N.t("sort.hinweis", { spalte: I18N.t("spalte." + s.key) }))}">
        <span>${esc(I18N.t("spalte." + s.key))} <span class="pfeil" aria-hidden="true">${pfeil}</span></span>
        ${mitEinheit ? `<span class="einheit">${esc(einheit)}</span>` : ""}
        ${zustand ? `<span class="nur-sr">${esc(zustand)}</span>` : ""}
      </button></th>`;
  }

  function anzeigewert(s, w) {
    if (s.typ === "zahl") return I18N.zahl(w, s.dezimalen);
    if (s.typ === "ganzzahl") return I18N.zahl(w, 0);
    if (s.typ === "datum") return I18N.datum(w);
    return w;
  }

  function zelle(s, z, befunde) {
    const zahl = s.typ === "zahl" || s.typ === "ganzzahl";
    const klassen = [zahl ? "zahl" : "", s.typ === "notiz" ? "notiz" : ""];
    if (z._fehlt[s.key]) {
      klassen.push("fehlt");
      return `<td class="${klassen.join(" ")}" title="${esc(I18N.t("erkl.fehlt"))}">–<span class="marke-fehlt">${esc(I18N.t("fehlt"))}</span></td>`;
    }
    const wert = esc(anzeigewert(s, z[s.key]));
    if (befunde && befunde.length) {
      klassen.push("auffaellig");
      const grund = befunde.map((b) => Daten.erklaere(b)).join(" · ");
      return `<td class="${klassen.join(" ")}" title="${esc(grund)}"><span class="marke-auffaellig" aria-hidden="true">!</span>${wert}<span class="nur-sr"> (${esc(grund)})</span></td>`;
    }
    return `<td class="${klassen.join(" ")}">${wert}</td>`;
  }

  // zeilen: gefiltert · gesamt: Anzahl aller Proben · index: Befunde je Probe und Spalte
  function zeichne(el, zeilen, gesamt, index) {
    const sortiert = sortiere(zeilen);
    const kopf = SPALTEN.map(kopfzelle).join("");
    const koerper = sortiert.length
      ? sortiert.map((z) => `<tr>${SPALTEN.map((s) => zelle(s, z, (index[z.sample_id] || {})[s.key])).join("")}</tr>`).join("")
      : `<tr><td class="leer" colspan="${SPALTEN.length}">${esc(I18N.t("tabelle.leer"))}</td></tr>`;
    el.innerHTML = `<table class="daten">
      <caption class="nur-sr">${esc(I18N.t("tabelle.beschriftung", { x: zeilen.length, n: gesamt }))}</caption>
      <thead><tr>${kopf}</tr></thead><tbody>${koerper}</tbody></table>`;
  }

  function sortiereNach(key) {
    if (key === sortKey) sortRichtung = -sortRichtung;
    else { sortKey = key; sortRichtung = 1; }
  }

  // Download im Originalschema: Rohtexte, NA bleibt NA, nur Textspalten in Anführungszeichen
  function alsCsv(zeilen) {
    const daten = sortiere(zeilen).map((z) => SPALTEN.map((s) => z._roh[s.key]));
    const zitieren = SPALTEN.map((s) => !["zahl", "ganzzahl"].includes(s.typ));
    // Kopfzeile wie im Original komplett in Anführungszeichen (Papa Parse würde Zahlenspalten auslassen)
    const kopf = SPALTEN.map((s) => `"${s.key}"`).join(",");
    const text = kopf + "\n" + Papa.unparse(daten, { quotes: zitieren, quoteChar: '"', newline: "\n", header: false });
    const blob = new Blob([text + "\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "soil_samples_auswahl.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return {
    zeichne, sortiereNach, alsCsv, sortiere,
    get sortierung() { return { key: sortKey, richtung: sortRichtung }; }
  };
})();

/* Ansichten „Datenqualität" und „Über die Daten" */
const Qualitaet = (function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const VERSIONEN = { plotly: "4.1.2", papa: "5.7.0" };

  function wertText(spalte, w) {
    const s = Daten.spalte(spalte);
    if (w === null) return "–";
    if (s.typ === "zahl") return I18N.zahl(w, s.dezimalen);
    if (s.typ === "datum") return I18N.datum(w);
    return w;
  }

  function zeichne(zeilen, befunde) {
    // 1. Auffällige Werte, je Probe und Spalte zusammengefasst
    const gruppen = new Map();
    befunde.filter((b) => b.regel !== "fehlt").forEach((b) => {
      const k = b.sample_id + "|" + b.spalte;
      if (!gruppen.has(k)) gruppen.set(k, []);
      gruppen.get(k).push(b);
    });
    const zeilenHtml = [...gruppen.values()]
      .sort((a, b) => a[0].sample_id.localeCompare(b[0].sample_id))
      .map((bs) => {
        const b = bs[0];
        return `<tr><td>${esc(b.sample_id)}</td><td>${esc(b.plot_id)}</td>
          <td>${esc(I18N.t("spalte." + b.spalte))}</td>
          <td class="zahl"><span class="marke-auffaellig" aria-hidden="true">!</span>${esc(wertText(b.spalte, b.wert))}</td>
          <td>${bs.map((x) => `<span class="regel">${esc(I18N.t("regel." + x.regel))}</span>`).join(" ")}</td>
          <td>${bs.map((x) => esc(Daten.erklaere(x))).join("<br>")}</td></tr>`;
      }).join("");
    $("#q-liste").innerHTML = gruppen.size
      ? `<div class="liste-rahmen"><table class="liste"><thead><tr>
          <th>${esc(I18N.t("kopf.probe"))}</th><th>${esc(I18N.t("kopf.plot"))}</th><th>${esc(I18N.t("kopf.spalte"))}</th>
          <th class="zahl">${esc(I18N.t("kopf.wert"))}</th><th>${esc(I18N.t("kopf.regel"))}</th><th>${esc(I18N.t("kopf.erklaerung"))}</th>
        </tr></thead><tbody>${zeilenHtml}</tbody></table></div>`
      : `<p class="leer">${esc(I18N.t("qualitaet.keine"))}</p>`;

    // 2. Fehlende Werte je Spalte
    const fehlend = befunde.filter((b) => b.regel === "fehlt");
    const spalten = SPALTEN.filter((s) => s.typ !== "notiz");
    const max = Math.max(1, ...spalten.map((s) => fehlend.filter((b) => b.spalte === s.key).length));
    $("#q-fehlend").innerHTML = `<div class="balken-liste">${spalten.map((s) => {
      const n = fehlend.filter((b) => b.spalte === s.key).length;
      return `<span>${esc(I18N.t("spalte." + s.key))}</span>
        <span class="balken" role="img" aria-label="${n} / ${zeilen.length}"><span style="width:${(n / max) * 100}%"></span></span>
        <span class="balken-zahl">${n} / ${zeilen.length}</span>`;
    }).join("")}</div>
    <p class="klein" style="margin-top:12px">${esc(I18N.t("qualitaet.fehlend.proben", { liste: [...new Set(fehlend.map((b) => b.sample_id))].sort().join(", ") || "–" }))}</p>`;

    // 3. Schreibweisen der Beobachter
    const liste = Daten.spalte("observer").werte;
    const zaehlung = {};
    zeilen.forEach((z) => { if (z.observer !== null) zaehlung[z.observer] = (zaehlung[z.observer] || 0) + 1; });
    $("#q-beob").innerHTML = `<table class="liste"><thead><tr><th>${esc(I18N.t("kopf.schreibweise"))}</th>
      <th class="zahl">${esc(I18N.t("kopf.proben"))}</th><th>${esc(I18N.t("kopf.status"))}</th></tr></thead><tbody>${
      Object.keys(zaehlung).sort().map((w) => {
        const status = liste.includes(w) ? "ok" : liste.includes(w.toUpperCase()) ? "schreibweise" : "unbekannt";
        const klasse = status === "ok" ? "regel regel-ok" : "regel";
        return `<tr><td><code>${esc(w)}</code></td><td class="zahl">${zaehlung[w]}</td><td><span class="${klasse}">${esc(I18N.t("status." + status))}</span></td></tr>`;
      }).join("")}</tbody></table>`;

    // 4. Prüfregeln im Wortlaut
    $("#q-regeln").innerHTML = ["bereich", "plotmedian", "beobachter", "kategorie", "fehlt", "schalter"]
      .map((r) => `<li>${I18N.t("regel.text." + r, { schwelle: PLOT_FAKTOR_SCHWELLE })}</li>`).join("");
  }

  function zeichneInfo() {
    const bereich = (s) => {
      if (s.bereich) return `${I18N.zahl(s.bereich[0], s.bereich[0] % 1 ? 1 : 0)}–${I18N.zahl(s.bereich[1], 0)}`;
      if (s.typ === "datum") return s.werte.map(I18N.datum).join(", ");
      return "–";
    };
    $("#info-codebook").innerHTML = `<table class="liste"><thead><tr>
      <th>${esc(I18N.t("info.kopf.spalte"))}</th><th>${esc(I18N.t("info.kopf.bedeutung"))}</th>
      <th>${esc(I18N.t("info.kopf.format"))}</th><th>${esc(I18N.t("info.kopf.bereich"))}</th></tr></thead><tbody>${
      SPALTEN.map((s) => `<tr><td><code>${esc(s.key)}</code><br><span class="klein">${esc(I18N.t("spalte." + s.key))}</span></td>
        <td>${esc(I18N.t("cb." + s.key))}</td><td>${esc(I18N.t("fmt." + s.key))}</td><td>${esc(bereich(s))}</td></tr>`).join("")
      }</tbody></table>`;
    $("#info-technik").textContent = I18N.t("info.technik.text", VERSIONEN);
  }

  return { zeichne, zeichneInfo };
})();
