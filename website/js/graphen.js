/* graphen.js – Graphen-Oberfläche mit Plotly.js 4.1.2.
   Alle Panels folgen derselben Steuerleiste (Quelle, Messgröße, Tiefe, Suche).
   Keine Tests, keine Trendlinien: Ein Profil kommt in mehreren Tiefen vor, die Proben sind nicht unabhängig. */

// Kategoriale Farben: batlowS, Scientific Colour Maps 8.0.1 (Crameri 2018, doi:10.5281/zenodo.1243862),
// Datei batlow/CategoricalPalettes/batlowS_HEX.txt, in der Originalreihenfolge. Ausgelassen sind
// batlow-256 #FACCFA und batlow-224 #FDB4B4 (Kontrast unter 2 : 1 auf Weiß, als Punkt kaum sichtbar).
const FARBEN_KATEGORIAL = ["#011959", "#828231", "#226061", "#F29D6D", "#4D734D"];
// Dunkles Thema: dieselbe Datei, Originalreihenfolge, ausgelassen sind Töne unter 3 : 1 auf #1c1c1e
// (batlow-1 #011959, batlow-65 #226061); batlow-224 und -256 hier zugelassen, batlow-161 rückt nach.
const FARBEN_KATEGORIAL_DUNKEL = ["#FACCFA", "#828231", "#F29D6D", "#4D734D", "#C09036"];
const istDunkel = () => document.documentElement.dataset.thema === "dunkel";
const kategorial = (i) => (istDunkel() ? FARBEN_KATEGORIAL_DUNKEL : FARBEN_KATEGORIAL)[i % 5];
// Grundfarben der Graphen kommen aus den CSS-Variablen (style.css), damit sie dem Thema folgen
const cssFarbe = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// Zweites Unterscheidungsmerkmal neben der Farbe
const SYMBOLE = ["circle", "square", "diamond", "triangle-up", "cross"];

// Sequenziell: batlow, Scientific Colour Maps 8.0.1, Datei batlow/batlow.txt (256 Stufen),
// 11 Stützstellen bei den Indizes 0, 26, 51, … 255
const FARBEN_BATLOW = [
  [0.0, "#011959"], [0.1, "#103D5F"], [0.2, "#185562"], [0.3, "#31695B"], [0.4, "#577647"],
  [0.5, "#828231"], [0.6, "#B38E2F"], [0.7, "#E19752"], [0.8, "#FBA689"], [0.9, "#FDB9C2"], [1.0, "#FACCFA"]
];

// Divergierend: vik, Scientific Colour Maps 8.0.1, Datei vik/vik.txt (256 Stufen),
// 11 Stützstellen bei den Indizes 0, 26, 51, … 255; Mitte (Index 128) liegt bei ρ = 0.
const FARBEN_VIK = [
  [0.0, "#001261"], [0.1, "#023A7B"], [0.2, "#116496"], [0.3, "#5496B7"], [0.4, "#A7C9DA"],
  [0.5, "#ECE5E0"], [0.6, "#E1B8A0"], [0.7, "#CD8961"], [0.8, "#B75A26"], [0.9, "#852206"], [1.0, "#590008"]
];

// Deutsche Bedienbegriffe der Plotly-Werkzeugleiste, wörtlich aus plotly.js-locales 4.1.2 (de.js)
const PLOTLY_DE = {
  moduleType: "locale",
  name: "de",
  dictionary: {
    "Autoscale": "Automatische Skalierung",
    "Double-click to zoom back out": "Herauszoomen durch Doppelklick",
    "Download plot as a PNG": "Graphen als PNG herunterladen",
    "Download plot": "Graphen herunterladen",
    "Pan": "Verschieben",
    "Produced with Plotly.js": "Erstellt mit Plotly.js",
    "Reset axes": "Achsen zurücksetzen",
    "Zoom": "Zoom",
    "Zoom in": "Hineinzoomen",
    "Zoom out": "Herauszoomen"
  },
  format: { decimal: ",", thousands: "." }
};

const Graphen = (function () {
  let registriert = false;
  let alleTiefen = [];       // Tiefen der ganzen Quelle: Farbe bleibt beim Filtern gleich
  const farbNr = (t) => Math.max(0, alleTiefen.indexOf(t));
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Hilfen (auch von karte.js genutzt) ---------- */

  const name = (m) => I18N.t("spalte." + m);
  const einheit = (m) => I18N.einheit(m);
  const achse = (m) => (einheit(m) ? `${name(m)} (${einheit(m)})` : name(m));
  const dez = (m) => (Daten.groesse(m) || {}).dez ?? 0;

  function registriere() {
    if (typeof Plotly === "undefined") return false;
    if (!registriert) { Plotly.register(PLOTLY_DE); registriert = true; }
    return true;
  }

  function layout(extra) {
    const basis = {
      font: { family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif", size: 12, color: cssFarbe("--text") },
      separators: I18N.sprache === "de" ? ",." : ".,",
      paper_bgcolor: cssFarbe("--flaeche"),
      plot_bgcolor: cssFarbe("--flaeche"),
      margin: { l: 64, r: 16, t: 36, b: 56 },
      hoverlabel: { bgcolor: cssFarbe("--flaeche"), bordercolor: cssFarbe("--linie"), font: { color: cssFarbe("--text") } },
      modebar: { bgcolor: "rgba(0, 0, 0, 0)", color: cssFarbe("--text-2"), activecolor: cssFarbe("--text") },
      legend: { orientation: "h", x: 0, y: 1.02, yanchor: "bottom", font: { size: 12 } },
      xaxis: { gridcolor: cssFarbe("--linie-2"), zerolinecolor: cssFarbe("--linie"), linecolor: cssFarbe("--linie"), automargin: true },
      yaxis: { gridcolor: cssFarbe("--linie-2"), zerolinecolor: cssFarbe("--linie"), linecolor: cssFarbe("--linie"), automargin: true }
    };
    // Achsentitel mit festem Abstand zu den Werten, damit nichts gequetscht wirkt
    const achsen = (schluessel) => {
      const a = Object.assign({}, basis[schluessel], extra && extra[schluessel]);
      if (a.title) a.title = Object.assign({ standoff: 16 }, a.title);
      return a;
    };
    return Object.assign(basis, extra, { xaxis: achsen("xaxis"), yaxis: achsen("yaxis") });
  }

  function konfig() {
    return {
      responsive: true,
      displaylogo: false,
      showSendToCloud: false,                 // seit Plotly 4.0 standardmäßig an
      locale: I18N.sprache === "de" ? "de" : "en",
      modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d", "zoomIn2d", "zoomOut2d", "toggleSpikelines", "hoverClosestCartesian", "hoverCompareCartesian"],
      toImageButtonOptions: { format: "png", scale: 2 }
    };
  }

  function zeichnePlot(id, spuren, lay) {
    const el = document.getElementById(id);
    if (!el) return null;
    const hatWerte = spuren.some((s) => (s.y || s.z || s.x || s.a || []).some((v) => v !== null && v !== undefined));
    if (!hatWerte) {
      Plotly.purge(el);
      el.innerHTML = `<p class="leer">${esc(I18N.t("graph.keine"))}</p>`;
      return null;
    }
    if (el.querySelector(".leer")) el.innerHTML = "";
    Plotly.react(el, spuren, lay, konfig());
    return el;
  }

  const hoverPunkt = (m, feld) =>
    `${I18N.t("hover.profil")} %{customdata[0]} · %{customdata[1]}<br>` +
    `${name(m)}: %{${feld}:.${dez(m)}f} ${einheit(m)}<extra></extra>`;
  const cd = (t) => t.map((d) => [d.profil, I18N.tiefe(d.tiefe)]);
  const marker = (i, extra) => Object.assign({
    color: kategorial(i), symbol: SYMBOLE[i % 5], size: 7, opacity: 0.85, line: { color: cssFarbe("--flaeche"), width: 0.5 }
  }, extra);

  /* ---------- Steuerleiste ---------- */

  function fuelleAuswahl(id, werte, aktuell, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = werte.map((w) => `<option value="${esc(w)}">${esc(text(w))}</option>`).join("");
    el.value = aktuell;
  }

  /* ---------- Panels ---------- */

  function verteilung(daten, z, tiefen) {
    const m = z.messgroesse;
    const hist = tiefen.map((t) => ({
      type: "histogram", name: I18N.tiefe(t), x: daten.filter((d) => d.tiefe === t).map((d) => d[m]),
      marker: { color: kategorial(farbNr(t)), line: { color: cssFarbe("--flaeche"), width: 0.5 } },
      nbinsx: 16, legendgroup: t,
      hovertemplate: `%{fullData.name}<br>${name(m)}: %{x}<br>${I18N.t("achse.anzahl")}: %{y}<extra></extra>`
    }));
    zeichnePlot("graph-hist", hist, layout({
      barmode: "stack",
      xaxis: { title: { text: achse(m) } },
      yaxis: { title: { text: I18N.t("achse.anzahl") } }
    }));

    const box = tiefen.map((t) => {
      const i = farbNr(t);
      const s = daten.filter((d) => d.tiefe === t && d[m] !== null);
      return {
        type: "box", name: I18N.tiefe(t), y: s.map((d) => d[m]), customdata: cd(s),
        boxpoints: "all", jitter: 0.45, pointpos: 0, hoveron: "points",
        marker: marker(i, { size: 6 }), line: { color: kategorial(i), width: 1.5 }, fillcolor: "rgba(0, 0, 0, 0)",
        showlegend: false, hovertemplate: hoverPunkt(m, "y")
      };
    });
    zeichnePlot("graph-box", box, layout({
      xaxis: { title: { text: I18N.t("spalte.tiefe") + " (cm)" }, type: "category" },
      yaxis: { title: { text: achse(m) } }
    }));
  }

  // Tiefenprofile: Wert gegen Tiefenmitte, eine helle Linie je Profil, Median je Tiefe kräftig
  function tiefenprofile(daten, z, tiefen) {
    const m = z.messgroesse;
    const x = [], y = [], c = [];
    const profile = [...new Set(daten.map((d) => d.profil))].sort((a, b) => a - b);
    for (const p of profile) {
      daten.filter((d) => d.profil === p && d[m] !== null).sort((a, b) => a.oben - b.oben)
        .forEach((d) => { x.push(d[m]); y.push(d.mitte); c.push([d.profil, I18N.tiefe(d.tiefe)]); });
      x.push(null); y.push(null); c.push(["", ""]);
    }
    const mitten = tiefen.map((t) => daten.find((d) => d.tiefe === t).mitte);
    const spuren = [{
      type: "scatter", mode: "lines+markers", name: I18N.t("legende.profile"), x, y, customdata: c, connectgaps: false,
      line: { color: "rgba(110, 110, 115, 0.3)", width: 1 }, marker: { color: "rgba(110, 110, 115, 0.5)", size: 5 },
      hovertemplate: hoverPunkt(m, "x")
    }, {
      type: "scatter", mode: "lines+markers", name: I18N.t("legende.median"),
      x: tiefen.map((t) => Daten.median(daten.filter((d) => d.tiefe === t).map((d) => d[m]))), y: mitten,
      customdata: tiefen.map((t) => [I18N.tiefe(t), daten.filter((d) => d.tiefe === t && d[m] !== null).length]),
      line: { color: cssFarbe("--text"), width: 3 }, marker: { color: cssFarbe("--text"), size: 9, line: { color: cssFarbe("--flaeche"), width: 1 } },
      hovertemplate: `${I18N.t("hover.median")} %{customdata[0]}: %{x:.${dez(m)}f} ${einheit(m)}<br>${I18N.t("hover.n")} = %{customdata[1]}<extra></extra>`
    }];
    zeichnePlot("graph-tiefe", spuren, layout({
      xaxis: { title: { text: achse(m) } },
      yaxis: { title: { text: I18N.t("achse.tiefe") }, autorange: "reversed", tickvals: mitten, ticktext: tiefen.map(I18N.tiefe) }
    }));
  }

  function hoehe(daten, z, tiefen) {
    const m = z.messgroesse;
    const spuren = tiefen.map((t) => {
      const s = daten.filter((d) => d.tiefe === t && d[m] !== null && d.hoehe !== null);
      return {
        type: "scatter", mode: "markers", name: I18N.tiefe(t), x: s.map((d) => d.hoehe), y: s.map((d) => d[m]),
        customdata: cd(s), marker: marker(farbNr(t)),
        hovertemplate: `${I18N.t("hover.profil")} %{customdata[0]} · %{customdata[1]}<br>${I18N.t("spalte.hoehe")}: %{x:.0f} m<br>` +
          `${name(m)}: %{y:.${dez(m)}f} ${einheit(m)}<extra></extra>`
      };
    });
    zeichnePlot("graph-hoehe", spuren, layout({
      xaxis: { title: { text: I18N.t("achse.hoehe") } },
      yaxis: { title: { text: achse(m) } }
    }));
  }

  function zweiGroessen(daten, z, tiefen) {
    const spuren = tiefen.map((t) => {
      const s = daten.filter((d) => d.tiefe === t && d[z.x] !== null && d[z.y] !== null);
      return {
        type: "scatter", mode: "markers", name: I18N.tiefe(t), x: s.map((d) => d[z.x]), y: s.map((d) => d[z.y]),
        customdata: cd(s), marker: marker(farbNr(t)),
        hovertemplate: `${I18N.t("hover.profil")} %{customdata[0]} · %{customdata[1]}<br>` +
          `${name(z.x)}: %{x:.${dez(z.x)}f} ${einheit(z.x)}<br>${name(z.y)}: %{y:.${dez(z.y)}f} ${einheit(z.y)}<extra></extra>`
      };
    });
    zeichnePlot("graph-zwei", spuren, layout({
      xaxis: { title: { text: achse(z.x) } },
      yaxis: { title: { text: achse(z.y) } }
    }));
  }

  // Körnungsdreieck: Ton oben, Sand links, Schluff rechts; Plotly normiert jeden Punkt auf 100 %
  function koernung(daten, tiefen) {
    const spuren = tiefen.map((t) => {
      const s = daten.filter((d) => d.tiefe === t && d.sand !== null && d.silt !== null && d.clay !== null);
      return {
        type: "scatterternary", mode: "markers", name: I18N.tiefe(t),
        a: s.map((d) => d.clay), b: s.map((d) => d.sand), c: s.map((d) => d.silt), customdata: cd(s),
        marker: marker(farbNr(t), { size: 8 }),
        hovertemplate: `${I18N.t("hover.profil")} %{customdata[0]} · %{customdata[1]}<br>` +
          `${name("clay")}: %{a:.1f} %<br>${name("sand")}: %{b:.1f} %<br>${name("silt")}: %{c:.1f} %<extra></extra>`
      };
    });
    // Eckwerte 0 und 100 weglassen: sie stoßen an die Achsentitel
    const ax = (key) => ({ title: { text: name(key) + " (%)" }, min: 0, tickmode: "array", tickvals: [20, 40, 60, 80], gridcolor: cssFarbe("--linie-2"), linecolor: cssFarbe("--linie"), ticksuffix: "" });
    zeichnePlot("graph-koernung", spuren, layout({
      margin: { l: 56, r: 56, t: 56, b: 56 },
      ternary: { domain: { x: [0, 1], y: [0, 0.9] }, sum: 100, aaxis: ax("clay"), baxis: ax("sand"), caxis: ax("silt"), bgcolor: cssFarbe("--flaeche") }
    }));
  }

  /* Spearman: Pearson-Korrelation der Ränge, Bindungen mit mittlerem Rang,
     paarweise nur Proben mit beiden Werten */
  function raenge(werte) {
    const idx = werte.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(werte.length);
    for (let i = 0; i < idx.length;) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const mittel = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = mittel;
      i = j + 1;
    }
    return r;
  }
  function spearman(a, b) {
    const paare = a.map((v, i) => [v, b[i]]).filter(([u, w]) => u !== null && w !== null);
    const n = paare.length;
    if (n < 3) return { rho: null, n };
    const ra = raenge(paare.map((p) => p[0]));
    const rb = raenge(paare.map((p) => p[1]));
    const ma = ra.reduce((s, v) => s + v, 0) / n;
    const mb = rb.reduce((s, v) => s + v, 0) / n;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { const da = ra[i] - ma, db = rb[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
    return { rho: saa && sbb ? sab / Math.sqrt(saa * sbb) : null, n };
  }

  function heatmap(id, daten, groessen, titel, mitSkala) {
    const z = [], n = [];
    for (const a of groessen) {
      const zeileZ = [], zeileN = [];
      for (const b of groessen) {
        const r = spearman(daten.map((d) => d[a]), daten.map((d) => d[b]));
        zeileZ.push(r.rho); zeileN.push(r.n);
      }
      z.push(zeileZ); n.push(zeileN);
    }
    const namen = groessen.map((m) => I18N.t("kurz." + m));
    const el = document.getElementById(id);
    const schmal = el && el.clientWidth < 520;
    zeichnePlot(id, [{
      type: "heatmap", z, x: namen, y: namen, customdata: n,
      zmin: -1, zmax: 1, zmid: 0, colorscale: FARBEN_VIK, showscale: mitSkala,
      colorbar: { title: { text: "ρ" }, thickness: 12, len: 0.9 },
      texttemplate: "%{z:.2f}", textfont: { size: schmal ? 9 : 11 }, xgap: 2, ygap: 2,
      hovertemplate: `%{y} – %{x}<br>${I18N.t("hover.rho")} = %{z:.2f}<br>${I18N.t("hover.n")} = %{customdata}<extra></extra>`
    }], layout({
      title: titel ? { text: titel, font: { size: 13 }, x: 0, xanchor: "left" } : undefined,
      margin: { l: 70, r: 10, t: titel ? 40 : 16, b: 60 },
      xaxis: { tickangle: -35, gridcolor: "rgba(0, 0, 0, 0)", linecolor: "rgba(0, 0, 0, 0)" },
      yaxis: { autorange: "reversed", gridcolor: "rgba(0, 0, 0, 0)", linecolor: "rgba(0, 0, 0, 0)" }
    }));
  }

  function korrelation(daten, z, tiefen) {
    const alle = $("#korr-alle"), je = $("#korr-je");
    // Größen ohne Werte in der Auswahl weglassen (z. B. Nt, wenn nur 0–30 cm gewählt ist)
    const groessen = Daten.messgroessen(z.quelle).filter((m) => daten.some((d) => d[m] !== null));
    if (z.korr === "je") {
      alle.hidden = true; je.hidden = false;
      je.innerHTML = tiefen.map((t, i) => `<div class="graph graph-klein" id="graph-korr-${i}"></div>`).join("");
      tiefen.forEach((t, i) => {
        const s = daten.filter((d) => d.tiefe === t);
        heatmap(`graph-korr-${i}`, s, groessen.filter((m) => s.some((d) => d[m] !== null)), `${I18N.tiefe(t)} (n = ${s.length})`, i === tiefen.length - 1);
      });
    } else {
      je.hidden = true; alle.hidden = false;
      je.querySelectorAll(".graph").forEach((el) => Plotly.purge(el));
      je.innerHTML = "";
      heatmap("graph-korr", daten, groessen, "", true);
    }
  }

  /* ---------- Einstieg ---------- */

  function zeichne(zeilen, zustand) {
    const m = Daten.messgroessen(zustand.quelle);
    fuelleAuswahl("wahl-x", m, zustand.x, name);
    fuelleAuswahl("wahl-y", m, zustand.y, name);
    $("#graphen-art").textContent = I18N.t("leiste.art", { art: I18N.t("art." + Daten.art(zustand.quelle, zustand.messgroesse)) });
    const panels = $("#panels");
    if (!registriere()) {
      panels.innerHTML = `<p class="hinweis">${esc(I18N.t("graph.ohne"))}</p>`;
      return;
    }

    const daten = Daten.filtere(zeilen, zustand.filter);
    $("#graphen-zaehler").innerHTML = I18N.t("leiste.zaehler", { x: daten.length, n: zeilen.length });
    alleTiefen = Daten.tiefen(zeilen);
    const tiefen = alleTiefen.filter((t) => daten.some((d) => d.tiefe === t));

    // Nur der sichtbare Tab wird gezeichnet: Plotly misst seine Größe, verdeckte Flächen hätten keine
    document.querySelectorAll("#panels [data-tab]").forEach((a) => { a.hidden = a.dataset.tab !== zustand.tab; });
    document.querySelectorAll("#graph-tabs [role=tab]").forEach((b) => {
      const an = b.dataset.wert === zustand.tab;
      b.setAttribute("aria-selected", String(an));
      b.tabIndex = an ? 0 : -1;
    });
    ({
      verteilung: () => verteilung(daten, zustand, tiefen),
      tiefe: () => tiefenprofile(daten, zustand, tiefen),
      hoehe: () => hoehe(daten, zustand, tiefen),
      zwei: () => zweiGroessen(daten, zustand, tiefen),
      koernung: () => koernung(daten, tiefen),
      korr: () => korrelation(daten, zustand, tiefen)
    })[zustand.tab]();
  }

  return { zeichne, spearman, registriere, layout, konfig, zeichnePlot, name, einheit, achse, dez };
})();
