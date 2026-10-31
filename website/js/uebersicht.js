/* uebersicht.js – Startansicht nach Claude Design 5a: Gelände als Bühne, Kennzahlen als Band.
   Die Ansichten sind nach der Frage geordnet, die sie beantworten; jede zeigt eine kleine Vorschau aus den echten Daten. */

const Uebersicht = (function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function kachel(wert, name, zusatz, link) {
    const tag = link ? `a class="kachel" href="${link}"` : `div class="kachel"`;
    return `<${tag}><span class="kachel-wert">${esc(wert)}</span>
      <span class="kachel-name">${esc(I18N.t(name))}${link ? `<span class="kachel-pfeil" aria-hidden="true">›</span>` : ""}</span>
      <span class="kachel-zusatz">${esc(zusatz)}</span></${link ? "a" : "div"}>`;
  }

  // Lage der Profile, Farbe nach Höhe (batlow)
  function vorschauKarte(d) {
    const p = d.profile.filter((q) => q.x !== null && q.hoehe !== null);
    const achse = (w) => [Math.min(...w), Math.max(...w)];
    const [x0, x1] = achse(p.map((q) => q.x)), [y0, y1] = achse(p.map((q) => q.y)), [h0, h1] = achse(p.map((q) => q.hoehe));
    return p.map((q) => `<i style="left:${6 + ((q.x - x0) / (x1 - x0)) * 88}%;top:${8 + ((y1 - q.y) / (y1 - y0)) * 84}%;background:${Tabelle.heat(FARBEN_BATLOW, (q.hoehe - h0) / (h1 - h0)).grund}"></i>`).join("");
  }

  // Verteilung des Kohlenstoffs über alle Modellzeilen
  function vorschauGraph(d) {
    const w = d.zeilen.modell.map((z) => z.soc).filter((v) => v !== null);
    const min = Math.min(...w), max = Math.max(...w), bins = new Array(16).fill(0);
    w.forEach((v) => { bins[Math.min(15, Math.floor(((v - min) / (max - min)) * 16))]++; });
    return bins.map((n) => `<i style="height:${Math.max(6, (n / Math.max(...bins)) * 100)}%"></i>`).join("");
  }

  const vorschauTabelle = (d) => d.zeilen.modell.slice(0, 4).map((z) =>
    `<span><b>${esc(z.id)}</b><span>${esc(I18N.tiefe(z.tiefe))}</span><span>${esc(I18N.roh(z._roh.ph))}</span><span>${esc(I18N.roh(z._roh.soc))}</span></span>`).join("");

  const vorschauTour = () => [1, 2, 3, 4, 5, 6].map((n) => `<i>${n}</i>`).join("");

  const vorschauMarken = () => ["modelliert", "abgeleitet", "index", "gemessen", "unklar"].map((a) =>
    `<span class="art-marke" data-art="${a}" title="${esc(I18N.t("art." + a))}">${esc(I18N.t("art.kurz." + a))}</span>`).join("");

  function zeichne(d) {
    const k = Daten.kennzahlen(d);
    $("#start-lead").textContent = I18N.t("start.lead", { profile: k.profile, proben: k.proben, tiefe: k.tiefeMax });
    const hoehe = k.hoeheMin === null ? "–" : `${I18N.zahl(k.hoeheMin)}–${I18N.zahl(k.hoeheMax)}`;
    $("#kacheln").innerHTML = [
      kachel(I18N.zahl(k.profile), "kachel.profile", I18N.t(k.luecken.length ? "zusatz.profile" : "zusatz.profile.voll", { max: k.max, luecken: k.luecken.join(", ") }), "#karte"),
      kachel(I18N.zahl(k.proben), "kachel.proben", I18N.t("zusatz.proben", { n: k.stufen, tiefe: k.tiefeMax })),
      kachel(I18N.zahl(k.modell), "kachel.modell", k.modellTiefen.map(I18N.tiefe).join(" · "), "#tabelle"),
      kachel(I18N.zahl(k.labor), "kachel.labor", I18N.t("zusatz.labor", { n: k.laborProfile })),
      kachel(hoehe, "kachel.hoehe", I18N.t("zusatz.hoehe"), "#graphen")
    ].join("");
    $("#vorschau-karte").innerHTML = vorschauKarte(d);
    $("#vorschau-graph").innerHTML = vorschauGraph(d);
    $("#vorschau-tabelle").innerHTML = vorschauTabelle(d);
    $("#vorschau-tour").innerHTML = vorschauTour();
    $("#vorschau-marken").innerHTML = vorschauMarken();
    $("#start-marken").innerHTML = herkunftLegende(["gemessen", "modelliert", "abgeleitet", "index", "unklar"]);
  }

  return { zeichne };
})();
