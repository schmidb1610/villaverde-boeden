/* karte.js – Lage der Profile (UTM 30N, ohne Hintergrundkarte) und Profil-Steckbrief.
   Punktfarbe = gewählte Messgröße in der gewählten Tiefe (batlow); ein Klick öffnet den Steckbrief.
   Eine Hintergrundkarte fehlt bewusst, bis Quelle und Lizenz geklärt sind (quellen_lizenzen.md, Abschnitt 5). */

const Karte = (function () {
  let balken = false;       // Wertebalken im Steckbrief, Schalter über der Tabelle
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const km = (m) => (m === null ? null : m / 1000);

  function karte(d, z) {
    const el = document.getElementById("graph-karte");
    if (!Graphen.registriere()) { el.innerHTML = `<p class="hinweis">${esc(I18N.t("graph.ohne"))}</p>`; return; }
    const m = z.messgroesse;
    const zeilen = d.zeilen[z.quelle].filter((r) => r.tiefe === z.karteTiefe);
    const wert = new Map(zeilen.map((r) => [r.profil, r[m]]));
    const mit = d.profile.filter((p) => wert.has(p.profil) && wert.get(p.profil) !== null);
    const ohne = d.profile.filter((p) => !mit.includes(p));
    const gewaehlt = d.profile.find((p) => p.profil === z.profil);
    const hover = (p) => `${I18N.t("hover.profil")} ${p.profil}<br>` +
      (wert.has(p.profil) && wert.get(p.profil) !== null
        ? `${Graphen.name(m)}: ${I18N.zahl(wert.get(p.profil), Graphen.dez(m))} ${Graphen.einheit(m)}`
        : I18N.t("karte.ohnewert", { tiefe: I18N.tiefe(z.karteTiefe) })) +
      (p.hoehe !== null ? `<br>${I18N.t("spalte.hoehe")}: ${I18N.zahl(p.hoehe)} m` : "");

    const spuren = [{
      type: "scatter", mode: "markers+text", name: I18N.t("karte.ohne"),
      x: ohne.map((p) => km(p.x)), y: ohne.map((p) => km(p.y)), text: ohne.map((p) => String(p.profil)),
      customdata: ohne.map((p) => p.profil), hovertext: ohne.map(hover), hoverinfo: "text",
      textposition: "top center", textfont: { size: 10, color: cssFarbe("--text-2") },
      marker: { size: 9, color: cssFarbe("--flaeche"), line: { color: cssFarbe("--text-2"), width: 1.5 } }
    }, {
      type: "scatter", mode: "markers+text", name: Graphen.name(m),
      x: mit.map((p) => km(p.x)), y: mit.map((p) => km(p.y)), text: mit.map((p) => String(p.profil)),
      customdata: mit.map((p) => p.profil), hovertext: mit.map(hover), hoverinfo: "text",
      textposition: "top center", textfont: { size: 11, color: cssFarbe("--text") },
      marker: {
        size: 14, color: mit.map((p) => wert.get(p.profil)), colorscale: FARBEN_BATLOW, showscale: true,
        line: { color: cssFarbe("--text"), width: 0.8 },
        // Schmal: Farbleiste unter die Karte, damit die Karte die ganze Breite bekommt
        colorbar: el.clientWidth < 600
          ? { orientation: "h", y: -0.22, yanchor: "top", thickness: 10, len: 0.9, title: { text: Graphen.achse(m), side: "top" } }
          : { title: { text: Graphen.achse(m), side: "right" }, thickness: 12, len: 0.85 }
      }
    }];
    if (gewaehlt) spuren.push({
      type: "scatter", mode: "markers", name: I18N.t("karte.gewaehlt"), hoverinfo: "skip",
      x: [km(gewaehlt.x)], y: [km(gewaehlt.y)],
      marker: { size: 26, color: "rgba(0, 0, 0, 0)", line: { color: cssFarbe("--akzent"), width: 2.5 } }
    });
    const plot = Graphen.zeichnePlot("graph-karte", spuren, Graphen.layout({
      margin: { l: 64, r: 16, t: 36, b: 56 },
      showlegend: true,
      xaxis: { title: { text: I18N.t("achse.ost") }, tickformat: ".0f", dtick: 2 },
      yaxis: { title: { text: I18N.t("achse.nord") }, tickformat: ".0f", dtick: 2, scaleanchor: "x", scaleratio: 1 }
    }));
    if (plot && !plot.dataset.klick) {
      plot.dataset.klick = "1";
      plot.on("plotly_click", (e) => {
        const p = e.points && e.points[0] && e.points[0].customdata;
        if (p !== undefined && p !== null) App.waehleProfil(Number(p));
      });
    }
  }

  document.addEventListener("change", (e) => {
    if (e.target.id !== "steckbrief-balken") return;
    balken = e.target.checked;
    steckbrief(App.daten, App.zustand);
  });

  // Wert-Spalten des Steckbriefs: alle Größen beider Quellen
  function steckbrief(d, z) {
    const el = $("#steckbrief");
    const p = d.profile.find((x) => x.profil === z.profil);
    if (!p) { el.innerHTML = `<p class="leer">${esc(I18N.t("steckbrief.leer"))}</p>`; return; }
    const nachOben = (a, b) => a.oben - b.oben;
    const modell = d.zeilen.modell.filter((r) => r.profil === p.profil).sort(nachOben);
    const labor = d.zeilen.labor.filter((r) => r.profil === p.profil).sort(nachOben);
    const zeilen = [...modell, ...labor];
    const groessen = GROESSEN.map((g) => g.key).filter((k) => zeilen.some((r) => r[k] !== null));
    const index = App.index;
    // Balken wie in der Tabelle: Lage im Bereich aller Zeilen dieser Quelle
    const bereich = (quelle, k) => {
      const w = d.zeilen[quelle].map((r) => r[k]).filter((v) => v !== null && Number.isFinite(v));
      return [Math.min(...w), Math.max(...w)];
    };
    const zelle = (r, k, erste) => {
      const rand = erste ? " spalte-labor" : "";
      if (!Daten.groesse(k)[r.quelle] || r._nichtErhoben[k]) return `<td class="zahl fehlt${rand}" title="${esc(I18N.t("erkl.nicht"))}">–</td>`;
      const b = (index[r.quelle + "|" + r.id] || {})[k];
      const text = esc(I18N.roh(r._roh[k]));
      if (b) return `<td class="zahl auffaellig-text${rand}" title="${esc(b.map(Daten.erklaere).join(" · "))}"><span class="marke-auffaellig" aria-hidden="true">!</span>${text}</td>`;
      if (r[k] === null || !balken) return `<td class="zahl${rand}">${text}</td>`;
      const [min, max] = bereich(r.quelle, k);
      return `<td class="zahl${rand}"><span class="wert-balken">${text}<i aria-hidden="true"><b style="width:${Math.round(((r[k] - min) / (max - min || 1)) * 100)}%"></b></i></span></td>`;
    };
    // Eine Größe je Zeile, eine Tiefe je Spalte; die Marke nennt die Herkunft der Modellzeile (nur Labor: gemessen)
    const marke = (k) => {
      const art = Daten.art(Daten.groesse(k).modell ? "modell" : "labor", k);
      return `<span class="art-marke" data-art="${art}" title="${esc(I18N.t("art." + art))}">${esc(I18N.t("art.kurz." + art))}</span><span class="nur-sr">${esc(I18N.t("art." + art))}</span>`;
    };
    // Klick auf eine Größe wählt sie aus (gilt für Karte und Graph), sofern die gewählte Quelle sie enthält
    const groessenName = (k) => {
      const name = `${esc(I18N.t("kurz." + k))} <span class="klein">${esc(Graphen.einheit(k) || "")}</span>`;
      return Daten.messgroessen(z.quelle).includes(k)
        ? `<button type="button" class="groesse-wahl" data-setze="messgroesse" data-wert="${k}">${name}</button>` : name;
    };
    // Ruhige Zeilen: Linie nur zwischen den Gruppen wie in der Tabelle
    const neueGruppe = (k, i) => i > 0 && SPALTENGRUPPEN.find((g) => g.spalten.includes(k)) !== SPALTENGRUPPEN.find((g) => g.spalten.includes(groessen[i - 1]));
    // ID-Versatz betrifft die ganze Laborzeile → steht am Spaltenkopf der Tiefe
    const laborKopf = (r, i) => {
      const versatz = (index[r.quelle + "|" + r.id] || {}).id;
      return `<th scope="col" class="zahl${i ? "" : " spalte-labor"}">${versatz ? `<span class="marke-auffaellig" title="${esc(versatz.map(Daten.erklaere).join(" · "))}">!</span>` : ""}${esc(I18N.tiefe(r.tiefe))}</th>`;
    };
    const tabelle = `<div class="steckbrief-rahmen" tabindex="0"><table class="steckbrief-tabelle"><thead><tr>
        <th scope="col" rowspan="2">${esc(I18N.t("hg.kopf.groesse"))}</th>
        <th scope="colgroup" colspan="${modell.length}">${esc(I18N.t("quelle.modell"))}</th>
        ${labor.length ? `<th scope="colgroup" colspan="${labor.length}" class="spalte-labor">${esc(I18N.t("quelle.labor"))} <span class="art-marke" data-art="gemessen" title="${esc(I18N.t("art.gemessen"))}">${esc(I18N.t("art.kurz.gemessen"))}</span></th>` : ""}
      </tr><tr>
        ${modell.map((r) => `<th scope="col" class="zahl">${esc(I18N.tiefe(r.tiefe))}</th>`).join("")}
        ${labor.map(laborKopf).join("")}
      </tr></thead><tbody>${groessen.map((k, i) => `<tr class="${k === z.messgroesse ? "gewaehlt " : ""}${neueGruppe(k, i) ? "trenn" : ""}">
        <th scope="row">${marke(k)}${groessenName(k)}</th>
        ${modell.map((r) => zelle(r, k)).join("")}${labor.map((r, i) => zelle(r, k, i === 0)).join("")}
      </tr>`).join("")}</tbody></table></div>`;

    el.innerHTML = `<div class="steckbrief-kopf">
        <div><p class="eyebrow">${esc(I18N.t("steckbrief.eyebrow"))}</p>
          <h2><span class="profil-marke">P${String(p.profil).padStart(2, "0")}</span>${esc(I18N.t("steckbrief.titel", { n: p.profil }))}</h2></div>
        <dl class="eckdaten">
          <div><dt>${esc(I18N.t("steckbrief.lage"))}</dt><dd>${esc(I18N.t("steckbrief.lage.wert", { x: p.x, y: p.y }))}</dd></div>
          <div><dt>${esc(I18N.t("spalte.hoehe"))}</dt><dd>${p.hoehe === null ? "–" : esc(I18N.zahl(p.hoehe, 1)) + " m"}</dd></div>
          <div><dt>${esc(I18N.t("steckbrief.proben"))}</dt><dd>${esc(I18N.t("steckbrief.proben.wert", { n: p.proben, stufen: [...p.stufen].sort().join(", ") }))}</dd></div>
          <div><dt>${esc(I18N.t("steckbrief.labor"))}</dt><dd>${esc(I18N.zahl(p.laborProben))}</dd></div>
        </dl>
      </div>
      <p class="kartenfuss steckbrief-nennung">${DGM_NENNUNG}</p>
      <div class="steckbrief-inhalt">
        <div class="graph graph-profil" id="graph-profil"></div>
        <div><label class="kipper steckbrief-schalter"><input type="checkbox" id="steckbrief-balken"${balken ? " checked" : ""}><span>${esc(I18N.t("steckbrief.balken"))}</span></label>
          ${tabelle}<p class="klein">${esc(I18N.t("steckbrief.legende"))}</p>
          <p class="klein">${herkunftLegende(["modelliert", "abgeleitet", "index", "gemessen", "unklar"])}</p></div>
      </div>`;
    profilGraph(zeilen, z.messgroesse);
  }

  // Tiefenprofil eines Standorts: senkrechte Balken über die beprobte Tiefe, Modell und Labor getrennt
  function profilGraph(zeilen, m) {
    if (!Graphen.registriere()) return;
    const spur = (quelle, i) => {
      const s = zeilen.filter((r) => r.quelle === quelle && r[m] !== null && r[m] !== undefined);
      const x = [], y = [], text = [];
      s.forEach((r) => { x.push(r[m], r[m], null); y.push(r.oben, r.unten, null); text.push("", "", ""); });
      return [{
        type: "scatter", mode: "lines", name: I18N.t("quelle." + quelle), x, y, hoverinfo: "skip", showlegend: false,
        line: { color: kategorial(i), width: 5 }
      }, {
        type: "scatter", mode: "markers", name: I18N.t("quelle." + quelle), x: s.map((r) => r[m]), y: s.map((r) => r.mitte),
        customdata: s.map((r) => I18N.tiefe(r.tiefe)),
        marker: { color: kategorial(i), symbol: SYMBOLE[i], size: 9, line: { color: cssFarbe("--flaeche"), width: 1 } },
        hovertemplate: `%{fullData.name} · %{customdata}<br>${Graphen.name(m)}: %{x:.${Graphen.dez(m)}f} ${Graphen.einheit(m)}<extra></extra>`
      }];
    };
    Graphen.zeichnePlot("graph-profil", [...spur("modell", 0), ...spur("labor", 1)], Graphen.layout({
      margin: { l: 56, r: 12, t: 40, b: 52 },
      paper_bgcolor: cssFarbe("--flaeche-2"), plot_bgcolor: cssFarbe("--flaeche-2"),
      xaxis: { title: { text: Graphen.achse(m) } },
      yaxis: { title: { text: I18N.t("achse.tiefe.cm") }, autorange: "reversed", rangemode: "tozero", zeroline: false }
    }));
  }

  function zeichne(d, z) {
    if (z.profil === null) z.profil = d.profile[0].profil;
    karte(d, z);
    steckbrief(d, z);
  }

  return { zeichne };
})();
