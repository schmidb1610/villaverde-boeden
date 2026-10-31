/* graphen.js – Graphen-Oberfläche mit Plotly.js 4.1.2.
   Alle Panels folgen derselben Steuerleiste (Messgröße, Gruppierung, Filter, Ausblenden).
   Keine Tests, keine Trendlinien: Jeder Plot kommt dreimal vor, die Proben sind nicht unabhängig. */

// Kategoriale Farben: batlowS, Scientific Colour Maps 8.0.1 (Crameri 2018, doi:10.5281/zenodo.1243862),
// Datei batlow/CategoricalPalettes/batlowS_HEX.txt, in der Originalreihenfolge. Ausgelassen sind
// batlow-256 #FACCFA und batlow-224 #FDB4B4 (Kontrast unter 2 : 1 auf Weiß, als Punkt kaum sichtbar).
const FARBEN_KATEGORIAL = ["#011959", "#828231", "#226061", "#F29D6D", "#4D734D"];
// Zweites Unterscheidungsmerkmal neben der Farbe
const SYMBOLE = ["circle", "square", "diamond", "triangle-up", "cross"];

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
  let alleGruppen = [];      // Gruppen im ganzen Datensatz: Farbe bleibt beim Filtern gleich
  let alleKampagnen = [];
  const farbNr = (g) => Math.max(0, alleGruppen.indexOf(g));
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Hilfen ---------- */

  const name = (m) => I18N.t("spalte." + m);
  const einheit = (m) => { const e = I18N.t("einheit." + m); return e === "einheit." + m ? "" : e; };
  const achse = (m) => (einheit(m) ? `${name(m)} (${einheit(m)})` : name(m));
  const dez = (m) => Daten.spalte(m).dezimalen ?? 0;

  function gruppenText(key, w) {
    if (key === "date") return I18N.kampagne(w);
    if (key === "sown_richness") return I18N.t(w === 1 ? "art.eins" : "art.mehr", { n: w });
    return String(w);
  }

  // Fester, wiederholbarer Streuwert je Probe (keine Zufallszahlen, damit Bilder gleich bleiben)
  function streu(id) {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 9973;
    return h / 9973 - 0.5;
  }

  function layout(extra) {
    const basis = {
      font: { family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif", size: 12, color: "#1d1d1f" },
      separators: I18N.sprache === "de" ? ",." : ".,",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#ffffff",
      margin: { l: 64, r: 16, t: 36, b: 56 },
      hoverlabel: { bgcolor: "#ffffff", bordercolor: "#d2d2d7", font: { color: "#1d1d1f" } },
      legend: { orientation: "h", x: 0, y: 1.02, yanchor: "bottom", font: { size: 12 } },
      xaxis: { gridcolor: "#e8e8ed", zerolinecolor: "#d2d2d7", linecolor: "#d2d2d7", automargin: true },
      yaxis: { gridcolor: "#e8e8ed", zerolinecolor: "#d2d2d7", linecolor: "#d2d2d7", automargin: true }
    };
    return Object.assign(basis, extra, {
      xaxis: Object.assign({}, basis.xaxis, extra && extra.xaxis),
      yaxis: Object.assign({}, basis.yaxis, extra && extra.yaxis)
    });
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
    if (!el) return;
    const hatWerte = spuren.some((s) => (s.y || s.z || s.x || []).some((v) => v !== null && v !== undefined));
    if (!hatWerte) {
      Plotly.purge(el);
      el.innerHTML = `<p class="leer">${esc(I18N.t("graph.keine"))}</p>`;
      return;
    }
    if (el.querySelector(".leer")) el.innerHTML = "";
    Plotly.react(el, spuren, lay, konfig());
  }

  const hoverPunkt = (m, yFeld) =>
    `${I18N.t("hover.probe")} %{customdata[0]}<br>${I18N.t("hover.plot")} %{customdata[1]}<br>` +
    `${name(m)}: %{${yFeld}:.${dez(m)}f} ${einheit(m)}<extra>%{fullData.name}</extra>`;

  /* ---------- Steuerleiste ---------- */

  function fuelleAuswahl(id, werte, aktuell, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = werte.map((w) => `<option value="${esc(w)}">${esc(text(w))}</option>`).join("");
    el.value = aktuell;
  }

  function steuerung(zustand) {
    fuelleAuswahl("wahl-messgroesse", MESSGROESSEN, zustand.messgroesse, name);
    fuelleAuswahl("wahl-gruppe", GRUPPEN, zustand.gruppe, (g) => I18N.t("gruppe." + g));
    fuelleAuswahl("wahl-x", MESSGROESSEN, zustand.x, name);
    fuelleAuswahl("wahl-y", MESSGROESSEN, zustand.y, name);
    const kipp = $("#wahl-ausblenden");
    if (kipp) kipp.checked = zustand.ausblenden;
    document.querySelectorAll("[data-setze='korr']").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wert === zustand.korr)));
  }

  /* ---------- Panels ---------- */

  function verteilung(daten, z, gruppen) {
    const m = z.messgroesse;
    const hist = gruppen.map((g) => {
      const i = farbNr(g);
      const t = daten.filter((d) => d[z.gruppe] === g);
      return {
        type: "histogram", name: gruppenText(z.gruppe, g), x: t.map((d) => d[m]),
        marker: { color: FARBEN_KATEGORIAL[i % 5], line: { color: "#ffffff", width: 0.5 } },
        nbinsx: 24, legendgroup: String(g),
        hovertemplate: `%{fullData.name}<br>${name(m)}: %{x}<br>${I18N.t("achse.anzahl")}: %{y}<extra></extra>`
      };
    });
    zeichnePlot("graph-hist", hist, layout({
      barmode: "stack",
      xaxis: { title: { text: achse(m) } },
      yaxis: { title: { text: I18N.t("achse.anzahl") } }
    }));

    const box = gruppen.map((g) => {
      const i = farbNr(g);
      const t = daten.filter((d) => d[z.gruppe] === g && d[m] !== null);
      const farbe = FARBEN_KATEGORIAL[i % 5];
      return {
        type: "box", name: gruppenText(z.gruppe, g), y: t.map((d) => d[m]),
        customdata: t.map((d) => [d.sample_id, d.plot_id]),
        boxpoints: "all", jitter: 0.45, pointpos: 0, hoveron: "points",
        marker: { color: farbe, symbol: SYMBOLE[i % 5], size: 6, opacity: 0.85, line: { color: "#ffffff", width: 0.5 } },
        line: { color: farbe, width: 1.5 }, fillcolor: "rgba(0, 0, 0, 0)",
        showlegend: false, hovertemplate: hoverPunkt(m, "y")
      };
    });
    zeichnePlot("graph-box", box, layout({
      xaxis: { title: { text: I18N.t("gruppe." + z.gruppe) }, type: "category" },
      yaxis: { title: { text: achse(m) } }
    }));
  }

  function artenzahl(daten, z, kampagnen) {
    const m = z.messgroesse;
    const spuren = kampagnen.map((k) => {
      const i = Math.max(0, alleKampagnen.indexOf(k));
      const t = daten.filter((d) => d.date === k && d[m] !== null && d.sown_richness !== null);
      return {
        type: "scatter", mode: "markers", name: I18N.kampagne(k),
        x: t.map((d) => d.sown_richness * Math.pow(2, streu(d.sample_id) * 0.5)),
        y: t.map((d) => d[m]),
        customdata: t.map((d) => [d.sample_id, d.plot_id]),
        marker: { color: FARBEN_KATEGORIAL[i % 5], symbol: SYMBOLE[i % 5], size: 7, opacity: 0.85, line: { color: "#ffffff", width: 0.5 } },
        hovertemplate: hoverPunkt(m, "y")
      };
    });
    const stufen = Daten.auspraegungen(daten, "sown_richness");
    const mediane = stufen.map((s) => Daten.median(daten.filter((d) => d.sown_richness === s).map((d) => d[m])));
    const anzahl = stufen.map((s) => daten.filter((d) => d.sown_richness === s && d[m] !== null).length);
    spuren.push({
      type: "scatter", mode: "markers", name: I18N.t("legende.median"),
      x: stufen, y: mediane, customdata: anzahl,
      marker: { symbol: "line-ew", size: 34, line: { color: "#1d1d1f", width: 3 } },
      hovertemplate: `${I18N.t("hover.median")}: %{y:.${dez(m)}f} ${einheit(m)}<br>${I18N.t("hover.n")} = %{customdata}<extra></extra>`
    });
    zeichnePlot("graph-arten", spuren, layout({
      xaxis: {
        title: { text: I18N.t("achse.artenzahl") }, type: "log",
        tickvals: [1, 2, 4, 8, 16], ticktext: ["1", "2", "4", "8", "16"],
        range: [Math.log10(0.7), Math.log10(23)], zeroline: false
      },
      yaxis: { title: { text: achse(m) } }
    }));
  }

  function zeitverlauf(daten, z, gruppen, kampagnen) {
    const m = z.messgroesse;
    const xText = (k) => `${I18N.kampagne(k)}<br>${I18N.datum(k)}`;
    // Alle Plot-Linien in einer Spur, getrennt durch Lücken
    const x = [], y = [], cd = [];
    const plots = Daten.auspraegungen(daten, "plot_id");
    for (const p of plots) {
      const t = daten.filter((d) => d.plot_id === p).sort((a, b) => a.date.localeCompare(b.date));
      t.forEach((d) => { x.push(xText(d.date)); y.push(d[m]); cd.push([d.sample_id, d.plot_id]); });
      x.push(null); y.push(null); cd.push(["", ""]);
    }
    const spuren = [{
      type: "scatter", mode: "lines+markers", name: I18N.t("legende.plots"), x, y, customdata: cd,
      connectgaps: false,
      line: { color: "rgba(110, 110, 115, 0.28)", width: 1 },
      marker: { color: "rgba(110, 110, 115, 0.45)", size: 4 },
      hovertemplate: hoverPunkt(m, "y")
    }];
    const mitGruppen = z.gruppe !== "date";
    (mitGruppen ? gruppen : [null]).forEach((g) => {
      const i = g === null ? 0 : farbNr(g);
      const t = g === null ? daten : daten.filter((d) => d[z.gruppe] === g);
      const med = kampagnen.map((k) => Daten.median(t.filter((d) => d.date === k).map((d) => d[m])));
      const n = kampagnen.map((k) => t.filter((d) => d.date === k && d[m] !== null).length);
      spuren.push({
        type: "scatter", mode: "lines+markers",
        name: g === null ? I18N.t("legende.median") : `${I18N.t("legende.median")} ${gruppenText(z.gruppe, g)}`,
        x: kampagnen.map(xText), y: med, customdata: n,
        line: { color: g === null ? "#1d1d1f" : FARBEN_KATEGORIAL[i % 5], width: 3 },
        marker: { color: g === null ? "#1d1d1f" : FARBEN_KATEGORIAL[i % 5], symbol: g === null ? "circle" : SYMBOLE[i % 5], size: 9, line: { color: "#ffffff", width: 1 } },
        hovertemplate: `%{fullData.name}: %{y:.${dez(m)}f} ${einheit(m)}<br>${I18N.t("hover.n")} = %{customdata}<extra></extra>`
      });
    });
    zeichnePlot("graph-zeit", spuren, layout({
      xaxis: { title: { text: I18N.t("achse.kampagne") }, type: "category", categoryorder: "array", categoryarray: kampagnen.map(xText) },
      yaxis: { title: { text: achse(m) } }
    }));
  }

  function zweiGroessen(daten, z, gruppen) {
    const spuren = gruppen.map((g) => {
      const i = farbNr(g);
      const t = daten.filter((d) => d[z.gruppe] === g && d[z.x] !== null && d[z.y] !== null);
      return {
        type: "scatter", mode: "markers", name: gruppenText(z.gruppe, g),
        x: t.map((d) => d[z.x]), y: t.map((d) => d[z.y]),
        customdata: t.map((d) => [d.sample_id, d.plot_id]),
        marker: { color: FARBEN_KATEGORIAL[i % 5], symbol: SYMBOLE[i % 5], size: 7, opacity: 0.85, line: { color: "#ffffff", width: 0.5 } },
        hovertemplate: `${I18N.t("hover.probe")} %{customdata[0]}<br>${I18N.t("hover.plot")} %{customdata[1]}<br>` +
          `${name(z.x)}: %{x:.${dez(z.x)}f} ${einheit(z.x)}<br>${name(z.y)}: %{y:.${dez(z.y)}f} ${einheit(z.y)}<extra>%{fullData.name}</extra>`
      };
    });
    zeichnePlot("graph-zwei", spuren, layout({
      xaxis: { title: { text: achse(z.x) } },
      yaxis: { title: { text: achse(z.y) } }
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

  function matrix(daten) {
    const z = [], n = [];
    for (const a of MESSGROESSEN) {
      const zeileZ = [], zeileN = [];
      for (const b of MESSGROESSEN) {
        const r = spearman(daten.map((d) => d[a]), daten.map((d) => d[b]));
        zeileZ.push(r.rho); zeileN.push(r.n);
      }
      z.push(zeileZ); n.push(zeileN);
    }
    return { z, n };
  }

  function heatmap(id, daten, titel, mitSkala) {
    const { z, n } = matrix(daten);
    const namen = MESSGROESSEN.map((m) => I18N.t("kurz." + m));
    const el = document.getElementById(id);
    const schmal = el && el.clientWidth < 520;
    zeichnePlot(id, [{
      type: "heatmap", z, x: namen, y: namen, customdata: n,
      zmin: -1, zmax: 1, zmid: 0, colorscale: FARBEN_VIK, showscale: mitSkala,
      colorbar: { title: { text: "ρ" }, thickness: 12, len: 0.9 },
      texttemplate: "%{z:.2f}", textfont: { size: schmal ? 10 : 12 }, xgap: 2, ygap: 2,
      hovertemplate: `%{y} – %{x}<br>${I18N.t("hover.rho")} = %{z:.2f}<br>${I18N.t("hover.n")} = %{customdata}<extra></extra>`
    }], layout({
      title: titel ? { text: titel, font: { size: 13 }, x: 0, xanchor: "left" } : undefined,
      margin: { l: 70, r: 10, t: titel ? 40 : 16, b: 60 },
      xaxis: { tickangle: -35, gridcolor: "rgba(0, 0, 0, 0)", linecolor: "rgba(0, 0, 0, 0)" },
      yaxis: { autorange: "reversed", gridcolor: "rgba(0, 0, 0, 0)", linecolor: "rgba(0, 0, 0, 0)" }
    }));
  }

  function korrelation(daten, z, kampagnen) {
    const alle = $("#korr-alle"), je = $("#korr-je");
    if (z.korr === "je") {
      alle.hidden = true; je.hidden = false;
      je.innerHTML = kampagnen.map((k, i) => `<div class="graph graph-klein" id="graph-korr-${i}"></div>`).join("");
      kampagnen.forEach((k, i) => heatmap(`graph-korr-${i}`, daten.filter((d) => d.date === k), `${I18N.kampagne(k)} (${I18N.datum(k)})`, i === kampagnen.length - 1));
    } else {
      je.hidden = true; alle.hidden = false;
      je.querySelectorAll(".graph").forEach((el) => Plotly.purge(el));
      je.innerHTML = "";
      heatmap("graph-korr", daten, "", true);
    }
  }

  /* ---------- Einstieg ---------- */

  function zeichne(zeilen, befunde, zustand) {
    steuerung(zustand);
    const panels = $("#panels");
    if (typeof Plotly === "undefined") {
      panels.innerHTML = `<p class="hinweis">${esc(I18N.t("graph.ohne"))}</p>`;
      return;
    }
    if (!registriert) { Plotly.register(PLOTLY_DE); registriert = true; }

    const bereinigt = Daten.bereinigt(zeilen, befunde, zustand.ausblenden);
    const daten = Daten.filtere(bereinigt.zeilen, zustand.filter);
    const ausgeblendet = bereinigt.ausgeblendet.filter((id) => daten.some((d) => d.sample_id === id.split("|")[0])).length;
    $("#graphen-zaehler").innerHTML = I18N.t("leiste.zaehler", { x: daten.length, n: zeilen.length }) +
      (zustand.ausblenden && ausgeblendet ? "<br>" + esc(I18N.t("leiste.ausgeblendet", { n: ausgeblendet })) : "");

    alleGruppen = Daten.auspraegungen(bereinigt.zeilen, zustand.gruppe);
    alleKampagnen = Daten.auspraegungen(bereinigt.zeilen, "date");
    const gruppen = alleGruppen.filter((g) => daten.some((d) => d[zustand.gruppe] === g));
    const kampagnen = alleKampagnen.filter((k) => daten.some((d) => d.date === k));

    verteilung(daten, zustand, gruppen);
    artenzahl(daten, zustand, kampagnen);
    zeitverlauf(daten, zustand, gruppen, kampagnen);
    zweiGroessen(daten, zustand, gruppen);
    korrelation(daten, zustand, kampagnen);
  }

  return { zeichne, spearman };
})();
