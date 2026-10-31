/* tour.js – Ansicht „Hintergrund": geführte Tour in sechs Stationen über dem 3D-Gelände.
   Das Gelände läuft als ../startseite_3d/index.html#tour im Rahmen; diese Datei schickt je Station Kamera,
   Beschriftungen und Sichtbarkeit der Nadeln dorthin. Die Bühne folgt dem Thema (Gelände Relief oder Dunkel). Unter 700 px oder ohne WebGL: Standbild je Station.
   Texte in texte_hintergrund.js. Lage der Mesa Redonda geschätzt aus Abb. 1 des Kurzberichts, von Ben in QGIS geprüft (31.10.2026). */

const Tour = (function () {
  // Kamera in Szenenkoordinaten (km, Mitte = 0); Marken in ETRS89 / UTM 30N
  const MESA = { e: 244720, n: 4168440, punkt: true };
  const STATIONEN = [
    { key: "frage", kamera: [11.81, 5.25, 12.72], ziel: [3.6, 0, 4.46], nadeln: false, zeit: 3, marken: [] },
    { key: "gebiet", kamera: [9, 10.5, 19], ziel: [0.8, 0, 3.2], nadeln: false, zeit: 3, marken: [
      { text: "tour.m.sierra", e: 243000, n: 4172000 }, Object.assign({ text: "tour.m.mesa" }, MESA),
      { text: "tour.m.aue", e: 246500, n: 4160300 }, { text: "tour.m.fluss", e: 249000, n: 4164400 }] },
    { key: "beprobung", kamera: [1.5, 19, 9], ziel: [0, 0, 0], nadeln: true, zeit: 1, marken: [] },
    { key: "spektrum", kamera: [-9.5, 7, 11.5], ziel: [2, 0, 1], nadeln: true, zeit: 0, marken: [
      { text: "tour.m.lora", e: 251900, n: 4167500, pfeil: true }] },
    { key: "ergebnis", kamera: [8.5, 3.2, 9.5], ziel: [3.2, 0, 3.2], nadeln: true, zeit: 3, marken: [] },
    { key: "bewertung", kamera: [8, 7.5, 3], ziel: [-1.5, 0, -5], nadeln: true, zeit: 2, marken: [
      { text: "tour.m.norden", e: 244000, n: 4173900 }] }
  ];
  const ZEIT = ["tour.z.2018", "tour.z.2023", "tour.z.2024", "tour.z.2026"];

  let nr = 0, rahmen = null, geladen = false, gebaut = false, daten = null;
  const $ = (s) => document.querySelector(s);
  const t = (k, w) => I18N.t(k, w);
  const hell = () => document.documentElement.dataset.thema !== "dunkel";
  const standbild = () => matchMedia("(max-width: 700px)").matches || !window.WebGLRenderingContext;
  const marke = (art) => `<span class="art-marke" data-art="${art}" title="${t("art." + art)}">${t("art.kurz." + art)}</span>`;

  // Station 5: je Profil ein Punkt auf der Skala 1–5, Werte aus den Daten (Oberboden)
  function streifen() {
    const werte = daten.zeilen.modell.filter((r) => r.oben === 0 && r.sqr !== null).map((r) => r.sqr);
    const med = Daten.median(werte);
    const pos = (w) => ((w - 1) / 4) * 100;
    return `<div class="streifen" role="img" aria-label="${t("tour.5.spanne", { min: I18N.zahl(Math.min(...werte), 1), max: I18N.zahl(Math.max(...werte), 1), med: I18N.zahl(med, 1) })}">
        <div class="streifen-achse">${werte.map((w) => `<i style="left:${pos(w)}%"></i>`).join("")}<b style="left:${pos(med)}%"></b></div>
        <div class="streifen-skala">${[1, 2, 3, 4, 5].map((z) => `<span>${z}</span>`).join("")}</div>
      </div>
      <p class="tour-klein">${marke("index")} ${t("tour.5.spanne", { min: I18N.zahl(Math.min(...werte), 1), max: I18N.zahl(Math.max(...werte), 1), med: I18N.zahl(med, 1) })}</p>`;
  }

  const INHALT = {
    frage: () => `<p>${t("tour.1.text")}</p><p class="tour-klein">${t("tour.1.klein")}</p>`,
    gebiet: () => `<p>${t("tour.2.text")}</p><p class="tour-zahl">${t("tour.2.zahl")}</p>`,
    beprobung: () => `<p>${t("tour.3.text")}</p><div class="tour-stufen">${["0–10", "10–20", "20–30", "40–60", "70–100"].map((s) => `<span>${s}</span>`).join("")}<small>cm</small></div>`,
    spektrum: () => `<ol class="tour-kette">
        <li><b>${t("tour.4.a")}</b><span>${t("tour.4.a.text")}</span></li>
        <li><b>${t("tour.4.b")} ${marke("gemessen")}</b><span>${t("tour.4.b.text")}</span></li>
        <li><b>${t("tour.4.c")} ${marke("modelliert")}</b><span>${t("tour.4.c.text")}</span></li>
        <li><b>${t("tour.4.d")} ${marke("abgeleitet")}${marke("index")}</b><span>${t("tour.4.d.text")}</span></li>
      </ol><p class="tour-klein">${t("tour.4.fuss")}</p>
      <p class="tour-klein">${herkunftLegende(["gemessen", "modelliert", "abgeleitet", "index"])}</p>`,
    ergebnis: () => `<p>${t("tour.5.text")}</p>${streifen()}
      <div class="tour-deutung"><strong>${t("tour.5.deutung")}</strong><p>${t("tour.5.deutung.text")}</p></div>
      <p class="tour-klein">${t("tour.5.klein")} ${herkunftLegende(["index"])}</p>`,
    bewertung: () => `<div class="tour-spalten">
        <div><strong>${t("tour.6.dafuer")}</strong><ul>${[1, 2, 3].map((i) => `<li>${t("tour.6.d" + i)}</li>`).join("")}</ul></div>
        <div><strong>${t("tour.6.vorsicht")}</strong><ul>${[1, 2, 3, 4].map((i) => `<li>${t("tour.6.v" + i)}</li>`).join("")}</ul></div>
      </div><a class="tour-link" href="#info">${t("tour.6.link")}</a>`
  };

  function sende(sofort) {
    if (!rahmen || !geladen) return;
    const s = STATIONEN[nr];
    rahmen.contentWindow.postMessage({ tourStation: {
      kamera: s.kamera, ziel: s.ziel, nadeln: s.nadeln, sofort, stil: hell() ? "relief" : "dunkel",
      marken: s.marken.map((m) => Object.assign({}, m, { text: t(m.text) }))
    } }, location.origin);
  }

  function baue() {
    gebaut = true;
    $("#tour-stationen").innerHTML = STATIONEN.map((s, i) =>
      `<button type="button" data-station="${i}"><i>${i + 1}</i><span data-i18n="tour.${i + 1}.name"></span></button>`).join("");
    $("#tour-zeit").innerHTML = ZEIT.map((k) => `<span data-i18n="${k}"></span>`).join("");
    I18N.anwenden($(".tour"));
    $("#tour-stationen").addEventListener("click", (e) => {
      const b = e.target.closest("[data-station]");
      if (b) gehe(Number(b.dataset.station));
    });
    $("#tour-karte").addEventListener("click", (e) => {
      if (e.target.closest("[data-tour-weiter]")) gehe(nr + 1);
      if (e.target.closest("[data-tour-zurueck]")) gehe(nr - 1);
    });
    document.addEventListener("keydown", (e) => {
      if ($("#ansicht-hintergrund").hidden || e.target.closest?.("input, select, textarea")) return;
      if (e.key === "ArrowRight") gehe(nr + 1);
      if (e.key === "ArrowLeft") gehe(nr - 1);
    });
    addEventListener("message", (e) => {
      if (e.origin === location.origin && e.data && e.data.tourBereit) { geladen = true; sende(true); }
    });
    if (!standbild()) {
      rahmen = document.createElement("iframe");
      rahmen.title = t("nav.hintergrund");
      rahmen.tabIndex = -1;
      rahmen.src = "../startseite_3d/index.html#tour";
      $("#tour-buehne").prepend(rahmen);
      $("#tour-bild").hidden = true;
    }
  }

  function karte() {
    const s = STATIONEN[nr], n = nr + 1;
    $("#tour-karte").innerHTML = `<p class="tour-nummer">${n} / ${STATIONEN.length}</p>
      <h1>${t(`tour.${n}.titel`)}</h1>${INHALT[s.key]()}
      <div class="tour-knoepfe">
        ${nr ? `<button type="button" class="tour-zurueck" data-tour-zurueck>${t("tour.zurueck")}</button>` : ""}
        ${nr < STATIONEN.length - 1 ? `<button type="button" class="tour-weiter" data-tour-weiter>${t(nr ? "tour.weiter" : "tour.start")}</button>` : ""}
      </div>`;
    document.querySelectorAll("#tour-stationen button").forEach((b, i) => {
      if (i === nr) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    document.querySelectorAll("#tour-zeit span").forEach((z, i) => { z.classList.toggle("an", i === s.zeit); });
    $("#tour-bild").src = `bilder/station_${n}${hell() ? "_relief" : ""}.webp`;
  }

  function gehe(i) {
    if (i < 0 || i >= STATIONEN.length || i === nr) return;
    nr = i;
    const k = $("#tour-karte");
    k.classList.remove("neu");
    void k.offsetWidth;                    // Einblendung neu starten
    k.classList.add("neu");
    karte();
    sende(false);
  }

  function zeichne(d) {
    daten = d;
    if (!gebaut) baue();
    I18N.anwenden($(".tour"));
    karte();
    sende(true);
  }

  return { zeichne };
})();
