/* startseite.js – 3D-Gelände der Mesa Redonda mit Gewässern, Straßen, Bahn, Orten und Bodenprofilen.
   Daten erzeugt von villaverde/skripte/baue_startseite_daten.py (Ordner daten/).
   Einheiten in der Szene: 1 = 1 km; x nach Osten, z nach Süden, y nach oben (Höhe × Überhöhung).
   Zwei Stile per Schalter: „dunkel" (Start, helle Textur im Shader umgefärbt) und „relief" (erdige Höhenfarben). */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { zeigeIntro } from "./intro.js";
import { t, LOCALE } from "./texte.js";

const DATEN = "daten/";
const WEBSITE = "../website/index.html";   // Daten-Website mit Karte, Tabelle, Graphen (andere Seite, gleicher Server)

// Linienarten: Breite in Pixeln (bei Gesamtansicht), Ebene, Rand (nur Stil „dunkel")
const LINIEN = {
  bach: { breite: 1.0, ebene: "gewaesser" },
  kanal: { breite: 1.4, ebene: "gewaesser" },
  fluss: { breite: 2.6, ebene: "gewaesser" },
  strasse: { breite: 1.4, ebene: "strassen", rand: true },
  strasse_haupt: { breite: 2.4, ebene: "strassen", rand: true },
  bahn: { breite: 1.6, ebene: "bahn", gestrichelt: true }
};
const STILE = {
  relief: {
    textur: "textur", hintergrund: "relief",
    farbe: { bach: 0x5f93ab, kanal: 0x4f88a4, fluss: 0x3f7896, strasse: 0xf4efe6, strasse_haupt: 0xf4efe6, bahn: 0x4a4038 },
    rand: null, wasser: 0x5c889e, wasserDeckung: 0.9,
    sockel: { color: 0x9a8670, transparent: false, opacity: 1, roughness: 0.9, metalness: 0 }
  },
  // Dunkel: helle Textur, im Shader auf dunkle Töne umgefärbt (Schummerung gestreckt, siehe DUNKEL_GLSL)
  dunkel: {
    textur: "textur_hell", hintergrund: "dunkel",
    farbe: { bach: 0x3f6f8c, kanal: 0x3f6f8c, fluss: 0x4f8db0, strasse: 0x6b737d, strasse_haupt: 0x8a929c, bahn: 0x9aa1a9 },
    rand: 0x14171b, wasser: 0x2b4b62, wasserDeckung: 0.88,
    sockel: { color: 0x2a323b, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0 }
  }
};
// Helle Textur → dunkel: Landhelligkeit 0,82–0,98 (Schummerung + Höhe) auf Schiefergrau strecken, Wasser dunkelblau
const DUNKEL_GLSL = `
  if (uDunkel > 0.5) {
    vec3 s = pow(max(diffuseColor.rgb, 0.0), vec3(1.0 / 2.2));
    float l = dot(s, vec3(0.2126, 0.7152, 0.0722));
    vec3 d = mix(vec3(0.105, 0.125, 0.15), vec3(0.34, 0.38, 0.43), smoothstep(0.82, 0.98, l));
    if (s.b - s.r > 0.12) d = vec3(0.15, 0.26, 0.35);
    diffuseColor.rgb = pow(d, vec3(2.2));
  }`;
const dunkelSchalter = { value: 0 };
function dunkelFaehig(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDunkel = dunkelSchalter;
    shader.fragmentShader = "uniform float uDunkel;\n" +
      shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n" + DUNKEL_GLSL);
  };
  return mat;
}
const GROESSEN = [   // Oberboden 0–30 cm
  ["o30_ph_kcl", t("g.ph"), "", 2],
  ["o30_soc", t("g.soc"), "%", 2],
  ["o30_sand", t("g.sand"), "%", 1],
  ["o30_silt", t("g.silt"), "%", 1],
  ["o30_clay", t("g.clay"), "%", 1],
  ["o30_cec", t("g.cec"), "cmol/kg", 1],
  ["o30_thetafc", t("g.thetafc"), "cm³/cm³", 2],
  ["o30_sqr", t("g.sqr"), "", 1]
];

const $ = (s) => document.querySelector(s);
const zahl = (w, d) => (w == null ? "–" : Number(w).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }));
const merke = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ohne Speicher weiter */ } };

let ueberhoehung = 3;
let stil = "dunkel";          // Startansicht immer gleich: dunkel, nur Bohrprofile, Bedienfeld zu (siehe START)
let gelaende, hoehen, breiteKm, tiefeKm;

// ---------- Höhe an beliebiger Stelle (bilinear, Meter) ----------
function hoeheBei(xm, ym) {
  const { breite, hoehe, zelle_m } = gelaende.hoehe;
  const sp = Math.min(Math.max(xm / zelle_m - 0.5, 0), breite - 1);
  const ze = Math.min(Math.max((tiefeKm * 1000 - ym) / zelle_m - 0.5, 0), hoehe - 1);
  const s0 = Math.floor(sp), z0 = Math.floor(ze);
  const s1 = Math.min(s0 + 1, breite - 1), z1 = Math.min(z0 + 1, hoehe - 1);
  const fs = sp - s0, fz = ze - z0;
  const h = (s, z) => hoehen[z * breite + s];
  return (h(s0, z0) * (1 - fs) + h(s1, z0) * fs) * (1 - fz) + (h(s0, z1) * (1 - fs) + h(s1, z1) * fs) * fz;
}
// Meter relativ zur Südwestecke → Szene (km, Mitte = 0)
const sx = (xm) => xm / 1000 - breiteKm / 2;
const sz = (ym) => tiefeKm / 2 - ym / 1000;

// ---------- Laden ----------
async function lade() {
  gelaende = await (await fetch(DATEN + "gelaende.json")).json();
  const roh = new Uint16Array(await (await fetch(DATEN + gelaende.hoehe.datei)).arrayBuffer());
  hoehen = Float32Array.from(roh, (v) => v * gelaende.hoehe.faktor);
  const a = gelaende.ausschnitt;
  breiteKm = (a.xmax - a.xmin) / 1000;
  tiefeKm = (a.ymax - a.ymin) / 1000;
  const lader = new THREE.TextureLoader();
  const [osm, profile, texturRelief, texturHell] = await Promise.all([
    fetch(DATEN + "osm.json").then((r) => r.json()),
    fetch(DATEN + "profile.json").then((r) => r.json()),
    lader.loadAsync(DATEN + gelaende.textur.datei),
    lader.loadAsync(DATEN + gelaende.textur_hell.datei)
  ]);
  return { osm, profile, texturen: { textur: texturRelief, textur_hell: texturHell } };
}

// ---------- Szene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
$("#szene").appendChild(renderer.domElement);

const szene = new THREE.Scene();             // Hintergrund kommt aus CSS (Verlauf je Stil)
szene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
szene.environmentIntensity = 0.6;
const kamera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.02, 200);
const steuerung = new OrbitControls(kamera, renderer.domElement);
steuerung.enableDamping = true;
steuerung.maxPolarAngle = THREE.MathUtils.degToRad(82);
steuerung.minDistance = 0.6;
steuerung.maxDistance = 45;

szene.add(new THREE.HemisphereLight(0xffffff, 0xb8ad9e, 1.2));
const sonne = new THREE.DirectionalLight(0xffffff, 1.6);
sonne.position.set(-10, 20, -10);   // aus Nordwesten, wie die Schummerung
szene.add(sonne);

const relief = new THREE.Group();          // wird in y mit der Überhöhung skaliert
szene.add(relief);
const ebenen = { gewaesser: new THREE.Group(), strassen: new THREE.Group(), bahn: new THREE.Group() };
relief.add(ebenen.gewaesser, ebenen.strassen, ebenen.bahn);

let gelaendeMat, sockelMesh, wasserMat, texturen;
const linienMat = {};        // art → { fuellung, rand }

// Regelmäßiges Gitter als Fläche: nx × ny Punkte ab (x0, y0) in Metern, Schritt dx/dy (y nach Norden)
function baueFlaeche(nx, ny, x0, y0, dx, dy, hoeheFn, uvFn) {
  const pos = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2);
  for (let r = 0; r < ny; r++) {                 // Zeile 0 = Norden
    for (let s = 0; s < nx; s++) {
      const i = r * nx + s, xm = x0 + s * dx, ym = y0 + (ny - 1 - r) * dy;
      pos.set([sx(xm), hoeheFn(s, r, xm, ym) / 1000, sz(ym)], i * 3);
      uv.set(uvFn(xm, ym), i * 2);
    }
  }
  const index = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let k = 0;
  for (let r = 0; r < ny - 1; r++) {
    for (let s = 0; s < nx - 1; s++) {
      const a = r * nx + s, b = a + 1, c = a + nx, d = c + 1;
      index.set([a, c, b, b, c, d], k); k += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  return geo;
}

function texturVorbereiten(t) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Gelände in Kacheln: grob (25 m, gemeinsames Übersichtsbild) und fein (10 m, 2-m-Bild, wird nachgeladen)
const kacheln = [];
const GROB_M = 25;
const FEIN_AB_KM = 6;          // Kameraabstand zur Kachelmitte, ab dem die feine Fassung geladen wird

function baueGelaende() {
  for (const t of Object.values(texturen)) texturVorbereiten(t);
  // Schummerung ist in der Textur enthalten → unbeleuchtetes Material
  gelaendeMat = dunkelFaehig(new THREE.MeshBasicMaterial({ toneMapped: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const K = gelaende.kacheln, W = breiteKm * 1000, T = tiefeKm * 1000;
  const nx = K ? K.x : 1, ny = K ? K.y : 1, bx = W / nx, by = T / ny;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x0 = i * bx, y0 = j * by;
      const geo = baueFlaeche(Math.round(bx / GROB_M) + 1, Math.round(by / GROB_M) + 1, x0, y0, bx / Math.round(bx / GROB_M),
        by / Math.round(by / GROB_M), (s, r, x, y) => hoeheBei(x, y), (x, y) => [x / W, y / T]);
      const grob = new THREE.Mesh(geo, gelaendeMat);
      relief.add(grob);
      kacheln.push({ name: `k${i}_${j}`, x0, y0, bx, by, grob, fein: null, laedt: false, texturen: {},
        mitte: new THREE.Vector3(sx(x0 + bx / 2), hoeheBei(x0 + bx / 2, y0 + by / 2) / 1000, sz(y0 + by / 2)) });
    }
  }
  sockelMesh = baueSockel();
  relief.add(sockelMesh);
}

async function ladeFein(k) {
  k.laedt = true;
  const K = gelaende.kacheln, [nx, ny] = K.punkte, g = K.gitter_m;
  const roh = new Uint16Array(await (await fetch(DATEN + K.ordner + k.name + "_hoehe.u16")).arrayBuffer());
  // Randpunkte bekommen die Höhe des groben Gitters → keine Spalten zu groben Nachbarkacheln
  const geo = baueFlaeche(nx, ny, k.x0, k.y0, g, g, (s, r, x, y) =>
    (s === 0 || r === 0 || s === nx - 1 || r === ny - 1) ? hoeheBei(x, y) : roh[r * nx + s] * 0.1,
    (x, y) => [(x - k.x0) / k.bx, (y - k.y0) / k.by]);
  const mat = dunkelFaehig(new THREE.MeshBasicMaterial({ toneMapped: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  k.fein = new THREE.Mesh(geo, mat);
  k.fein.visible = false;
  relief.add(k.fein);
  await setzeKachelTextur(k);
}

async function setzeKachelTextur(k) {
  const datei = STILE[stil].textur === "textur_hell" ? "hell" : "relief";
  if (!k.texturen[datei]) {
    k.texturen[datei] = texturVorbereiten(await new THREE.TextureLoader().loadAsync(
      DATEN + gelaende.kacheln.ordner + `${k.name}_${datei}.jpg`));
  }
  k.fein.material.map = k.texturen[datei];
  k.fein.material.needsUpdate = true;
  k.bereit = true;
}

// Je Kachel: nah → feine Fassung (sobald geladen), fern → grobe
function aktualisiereKacheln() {
  if (!gelaende.kacheln) return;
  for (const k of kacheln) {
    v.copy(k.mitte).setY(k.mitte.y * ueberhoehung);
    const nah = kamera.position.distanceTo(v) < FEIN_AB_KM;
    if (nah && !k.laedt) ladeFein(k).catch((e) => console.warn("Kachel", k.name, e));
    const fein = nah && k.bereit;
    k.grob.visible = !fein;
    if (k.fein) k.fein.visible = fein;
  }
}

// Seitenwände bis zu einer Grundfläche: das Gelände wirkt wie ein ausgeschnittener Block
function baueSockel() {
  const boden = (gelaende.hoehe.min - 120) / 1000, W = breiteKm * 1000, T = tiefeKm * 1000;
  const rand = [];
  for (let x = 0; x <= W; x += GROB_M) rand.push([x, T]);         // Nord
  for (let y = T; y >= 0; y -= GROB_M) rand.push([W, y]);         // Ost
  for (let x = W; x >= 0; x -= GROB_M) rand.push([x, 0]);         // Süd
  for (let y = 0; y <= T; y += GROB_M) rand.push([0, y]);         // West
  const p = [];
  for (let k = 0; k < rand.length - 1; k++) {
    const [a, b] = [rand[k], rand[k + 1]].map(([x, y]) => [sx(x), hoeheBei(x, y) / 1000, sz(y)]);
    p.push(...a, a[0], boden, a[2], ...b, ...b, a[0], boden, a[2], b[0], boden, b[2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, depthWrite: false }));
}

// Linie auf das Gelände legen: Abschnitte auf ≤ 20 m teilen, Höhe je Punkt + kleiner Abstand
function drapiere(koord) {
  const out = [];
  for (let k = 0; k < koord.length; k++) {
    const [x1, y1] = koord[k];
    if (k > 0) {
      const [x0, y0] = koord[k - 1];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 20);
      for (let t = 1; t < n; t++) {
        const x = x0 + ((x1 - x0) * t) / n, y = y0 + ((y1 - y0) * t) / n;
        out.push(sx(x), (hoeheBei(x, y) + 4) / 1000, sz(y));
      }
    }
    out.push(sx(x1), (hoeheBei(x1, y1) + 4) / 1000, sz(y1));
  }
  return out;
}

function baueLinien(osm) {
  // Reihenfolge = Zeichenreihenfolge: Ränder zuerst, Fluss obenauf
  const reihenfolge = ["bach", "kanal", "strasse", "strasse_haupt", "bahn", "fluss"];
  for (const art of reihenfolge) {
    const def = LINIEN[art];
    const m = {
      fuellung: new LineMaterial({ linewidth: def.breite, dashed: !!def.gestrichelt, dashSize: 0.1, gapSize: 0.06 }),
      // Rand schreibt keine Tiefe, sonst verdeckt er stellenweise die gleich tiefe Füllung („Reißverschluss")
      rand: def.rand ? new LineMaterial({ linewidth: def.breite + 1.6, depthWrite: false }) : null
    };
    linienMat[art] = m;
    for (const l of osm.linien.filter((l) => l.art === art)) {
      const geo = new LineGeometry();
      geo.setPositions(drapiere(l.koord));
      if (m.rand) {
        const r = new Line2(geo, m.rand);
        r.renderOrder = 1;
        ebenen[def.ebene].add(r);
      }
      const f = new Line2(geo, m.fuellung);
      f.renderOrder = 2;
      if (def.gestrichelt) f.computeLineDistances();
      ebenen[def.ebene].add(f);
    }
  }
}

// Wasserflächen (Guadalquivir, Stauseen) als eigene, leicht durchscheinende Fläche
function baueWasser(osm) {
  wasserMat = new THREE.MeshStandardMaterial({
    transparent: true, roughness: 0.18, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide
  });
  const teile = [];
  for (const ring of osm.wasserflaechen || []) {
    const geo = new THREE.ShapeGeometry(new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y))));
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setXYZ(i, sx(x), (hoeheBei(x, y) + 1.5) / 1000, sz(y));
    }
    geo.deleteAttribute("uv");
    geo.computeVertexNormals();
    teile.push(geo);
  }
  if (teile.length) ebenen.gewaesser.add(new THREE.Mesh(mergeGeometries(teile), wasserMat));
}

// ---------- Orte und Profile (HTML-Beschriftungen) ----------
const beschriftungen = [];   // { el, weltFn, ebene }
function beschrifte(text, klasse, weltFn, ebene) {
  const el = document.createElement("div");
  el.className = klasse;
  el.textContent = text;
  $("#beschriftungen").appendChild(el);
  const b = { el, weltFn, ebene };
  beschriftungen.push(b);
  return b;
}

function baueOrte(osm) {
  for (const o of osm.orte) {
    beschrifte(o.name, "ort " + o.art, () => new THREE.Vector3(sx(o.x), ((hoeheBei(o.x, o.y) + 30) / 1000) * ueberhoehung, sz(o.y)), "orte");
  }
}

// Bohrprofile als Glas-Nadeln (HTML, Entwurf Claude Design „2a"); Fußpunkt = Bohrpunkt auf dem Gelände.
// Hover zeigt die Pille mit Nummer, Klick die Karte mit Oberbodenwerten und das Panel.
const NADEL_K = 24;            // Größe = NADEL_K / Kameraabstand (km), begrenzt auf 0,55–1,3
let gewaehlt = null;           // Element der angeklickten Nadel

function baueProfile(daten) {
  for (const p of daten.profile) {
    const el = document.createElement("div");
    el.className = "nadel";
    el.innerHTML = `
      <div class="nadel-kopf"><div class="perle"><i></i></div>
        <div class="pille"><div class="zeile"><b>P${String(p.profil).padStart(2, "0")}</b><span>${t("profil")} ${p.profil}</span></div>
          <small>${t("g.ph")} ${zahl(p.o30_ph_kcl, 1)} · ${t("g.clay")} ${zahl(p.o30_clay, 0)} % · 0–30 cm</small></div></div>
      <div class="stab"></div><div class="ring"></div>`;
    el.addEventListener("click", () => waehleProfil(el, p));
    $("#beschriftungen").appendChild(el);
    beschriftungen.push({ el, nadel: true, ebene: "profile",
      weltFn: () => new THREE.Vector3(sx(p.x), (hoeheBei(p.x, p.y) / 1000) * ueberhoehung, sz(p.y)) });
  }
}
function waehleProfil(el, p) {
  gewaehlt?.classList.remove("gewaehlt");
  gewaehlt = el;
  el?.classList.add("gewaehlt");
  if (p) zeigeProfil(p, herkunftGlobal);
}

// ---------- Stil ----------
function setzeStil(name) {
  stil = name;
  const s = STILE[name];
  gelaendeMat.map = texturen[s.textur];
  gelaendeMat.needsUpdate = true;
  for (const k of kacheln) if (k.fein) setzeKachelTextur(k);
  const { color, ...sockel } = s.sockel;
  Object.assign(sockelMesh.material, sockel);
  sockelMesh.material.color.set(color);
  sockelMesh.material.needsUpdate = true;
  wasserMat.color.set(s.wasser);
  wasserMat.opacity = s.wasserDeckung;
  for (const [art, m] of Object.entries(linienMat)) {
    m.fuellung.color.set(s.farbe[art]);
    if (m.rand) { m.rand.color.set(s.rand ?? s.farbe[art]); m.rand.visible = s.rand != null; }
  }
  dunkelSchalter.value = name === "dunkel" ? 1 : 0;
  $("#hoehenlegende").hidden = name !== "relief";
  document.body.dataset.stil = s.hintergrund;
  for (const k of document.querySelectorAll("#stil button")) k.setAttribute("aria-pressed", String(k.dataset.stil === name));
}

// Höhenlegende zum Stil „relief": Farbe linear von hoehe.min bis hoehe.max (wie im Datenskript)
function baueHoehenlegende() {
  const { min, max } = gelaende.hoehe;
  const marke = (h, text) => `<span style="left:${((h - min) / (max - min)) * 100}%">${text}</span>`;
  $("#hoehenlegende .marken").innerHTML = marke(min, `${zahl(min, 0)}`) +
    [100, 200, 300].map((h) => marke(h, h)).join("") + marke(max, `${zahl(max, 0)} m`);
}

// ---------- Panel ----------
// Zuerst nur Titel, Höhe und drei Kernwerte; alle Werte nach Herkunft gebündelt im Aufklappbereich (Entwurf Claude Design 1a)
const KERNWERTE = [["o30_ph_kcl", t("g.ph")], ["o30_soc", t("kern.soc")], ["o30_clay", t("g.clay")]];
const HERKUNFT = {
  modelliert: { marke: t("m.modelliert"), name: t("h.modelliert") },
  abgeleitet: { marke: t("m.abgeleitet"), name: t("h.abgeleitet") },
  Index: { marke: t("m.index"), name: t("h.index") }
};
function zeigeProfil(p, herkunft) {
  const groesse = (k) => GROESSEN.find((g) => g[0] === k);
  const kern = KERNWERTE.map(([k, name]) => {
    const [, , einheit, d] = groesse(k);
    return `<div><span>${name}</span><b>${zahl(p[k], d)}<small>${einheit}</small></b></div>`;
  }).join("");
  const gruppen = Object.entries(HERKUNFT).map(([art, { marke, name }]) => {
    const zeilen = GROESSEN.filter(([k]) => herkunft[k] === art).map(([k, n, einheit, d]) =>
      `<tr><td>${n}</td><td class="wert">${zahl(p[k], d)} ${einheit}</td></tr>`).join("");
    return `<p class="gruppe"><i class="marke" data-art="${art}">${marke}</i>${name}</p><table>${zeilen}</table>`;
  }).join("");
  $("#panel-inhalt").innerHTML = `
    <div class="panel-rolle">
      <p class="eyebrow"><span class="profil-marke">P${String(p.profil).padStart(2, "0")}</span>${t("profil")}</p>
      <h2>${t("profil.kurz")} ${p.profil}</h2>
      <p class="hoehe">${t("hoehe")} ${zahl(p.hoehe_dgm_m, 0)} ${t("hoehe.einheit")} <i class="marke" data-art="abgeleitet" title="${t("hoehe.herkunft")}">${t("m.abgeleitet")}</i> ${t("w.abgeleitet")}</p>
      <div class="oberboden"><span class="eyebrow">${t("oberboden")}</span>
        <span class="klein"><i class="marke">${t("m.modelliert")}</i>${t("w.modelliert")}</span></div>
      <div class="kernwerte">${kern}</div>
      <button type="button" id="panel-mehr" aria-expanded="false" aria-controls="panel-alle">${t("mehr")}
        <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5 11 1.5"/></svg></button>
      <div id="panel-alle" hidden>
        ${gruppen}
        <dl><dt>ETRS89 / UTM 30N</dt><dd>${zahl(p.x_utm30n, 0)} E, ${zahl(p.y_utm30n, 0)} N</dd>
          <dt>${t("proben")}</dt><dd>${p.n_proben} ${t("proben.bis")} ${p.tiefe_max_cm} ${t("proben.tiefe")}</dd></dl>
      </div>
    </div>
    <a class="knopf-voll" href="${WEBSITE}#karte/${p.profil}"><b>${t("steckbrief")}</b><span>${t("steckbrief.klein")}</span></a>`;
  $("#panel-mehr").addEventListener("click", (ev) => {
    const offen = $("#panel-alle").hidden;
    $("#panel-alle").hidden = !offen;
    ev.currentTarget.setAttribute("aria-expanded", String(offen));
  });
  $("#panel").hidden = false;
  gibNadelFrei(p);
}

// ---------- Interaktion ----------
let herkunftGlobal = {};

let druck = null;
renderer.domElement.addEventListener("pointerdown", (ev) => (druck = [ev.clientX, ev.clientY]));
renderer.domElement.addEventListener("pointerup", (ev) => {
  if (!druck || Math.hypot(ev.clientX - druck[0], ev.clientY - druck[1]) > 5) return;   // war Drehen
  if (gewaehlt) { waehleProfil(null); $("#panel").hidden = true; }   // Klick ins Leere
});
$("#panel-zu").addEventListener("click", () => { $("#panel").hidden = true; waehleProfil(null); });

function zeigeLizenzen(an) {
  $("#lizenzen").hidden = !an;
  $("#lizenzen-knopf").setAttribute("aria-expanded", String(an));
}
$("#lizenzen-knopf").addEventListener("click", () => zeigeLizenzen($("#lizenzen").hidden));

$("#menue-knopf").addEventListener("click", () => {
  const offen = $("#menue").hidden;
  $("#menue").hidden = !offen;
  $("#menue-knopf").setAttribute("aria-expanded", String(offen));
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    $("#menue").hidden = true; $("#panel").hidden = true; $("#menue-knopf").setAttribute("aria-expanded", "false");
    waehleProfil(null); zeigeLizenzen(false);
  }
});

const sichtbareEbenen = { orte: true };
for (const box of document.querySelectorAll("#ebenen input[type=checkbox]")) {
  const wende = () => {
    const e = box.dataset.ebene;
    if (ebenen[e]) ebenen[e].visible = box.checked;
    sichtbareEbenen[e] = box.checked;
  };
  box.addEventListener("change", wende);
  box.checked = box.dataset.ebene === "profile";   // Start: nur Bodenprofile, auch wenn der Browser Häkchen wiederherstellt
  wende();
}
// Wahl des Nutzers gilt auch für die Daten-Website: Dunkel = dunkel, Relief = hell (gleicher Speicher)
for (const k of document.querySelectorAll("#stil button")) k.addEventListener("click", () => {
  setzeStil(k.dataset.stil);
  merke("villaverde.thema", k.dataset.stil === "dunkel" ? "dunkel" : "hell");
});

// Bedienfelder (Kartenansicht rechts oben, Steuerung links unten) ein-/ausklappen; beide starten eingeklappt
for (const feld of document.querySelectorAll("#ebenen, #steuerung")) {
  const knopf = feld.querySelector(".feld-knopf");
  knopf.addEventListener("click", () => {
    knopf.setAttribute("aria-expanded", String(feld.classList.toggle("zu") === false));
  });
}

const regler = $("#ueberhoehung");
$("#fuss-ueberhoehung").textContent = `${t("ueberhoehung")} 3×`;
regler.addEventListener("input", () => {
  ueberhoehung = Number(regler.value);
  relief.scale.y = ueberhoehung;
  const wert = `${zahl(ueberhoehung, ueberhoehung % 1 ? 1 : 0)}×`;
  $("#ueberhoehung-wert").textContent = wert;
  $("#fuss-ueberhoehung").textContent = `${t("ueberhoehung")} ${wert}`;
});

// ---------- Steuerung (Pult links unten) ----------
// Pfeile wirken, solange sie gedrückt sind; Tempo gilt auch für Maus und Trackpad
const ZOOM_NAH = steuerung.minDistance, ZOOM_FERN = steuerung.maxDistance;
const zoomRegler = $("#zoom"), kugel = new THREE.Spherical(), vorn = new THREE.Vector3(), schritt = new THREE.Vector3();
let tempo = 1, gehalten = null, zoomZieht = false, letztesBild = 0;

for (const k of document.querySelectorAll(".pad button")) {
  const an = () => { gehalten = k.dataset; };
  const aus = () => { gehalten = null; };
  k.addEventListener("pointerdown", (ev) => { k.setPointerCapture(ev.pointerId); an(); });
  k.addEventListener("pointerup", aus);
  k.addEventListener("pointercancel", aus);
  k.addEventListener("keydown", (ev) => { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); an(); } });
  k.addEventListener("keyup", aus);
  k.addEventListener("blur", aus);
}
$("#tempo").addEventListener("input", (ev) => {
  tempo = Number(ev.target.value);
  steuerung.rotateSpeed = steuerung.panSpeed = steuerung.zoomSpeed = tempo;
  $("#tempo-wert").textContent = `${zahl(tempo, tempo * 4 % 2 ? 2 : tempo % 1 ? 1 : 0)}×`;
});
// Reglerweg 0–1 logarithmisch auf den Abstand: rechts = näher
zoomRegler.addEventListener("pointerdown", () => (zoomZieht = true));
addEventListener("pointerup", () => (zoomZieht = false));
zoomRegler.addEventListener("input", () => {
  const abstand = ZOOM_FERN * (ZOOM_NAH / ZOOM_FERN) ** Number(zoomRegler.value);
  kamera.position.sub(steuerung.target).setLength(abstand).add(steuerung.target);
});
function aktualisierePult(dt) {
  if (!zoomZieht) {
    const abstand = kamera.position.distanceTo(steuerung.target);
    zoomRegler.value = Math.log(abstand / ZOOM_FERN) / Math.log(ZOOM_NAH / ZOOM_FERN);
  }
  if (!gehalten || flug) return;
  const x = Number(gehalten.x), y = Number(gehalten.y), s = tempo * dt;
  if (gehalten.art === "dreh") {
    kugel.setFromVector3(schritt.copy(kamera.position).sub(steuerung.target));
    kugel.theta += x * 0.9 * s;
    kugel.phi = THREE.MathUtils.clamp(kugel.phi - y * 0.6 * s, 0.05, steuerung.maxPolarAngle);
    kamera.position.setFromSpherical(kugel).add(steuerung.target);
  } else {
    quer.setFromMatrixColumn(kamera.matrixWorld, 0).setY(0).normalize();
    vorn.set(quer.z, 0, -quer.x);                 // waagerecht in Blickrichtung
    const weg = kamera.position.distanceTo(steuerung.target) * 0.5 * s;
    schritt.copy(steuerung.target).addScaledVector(quer, x * weg).addScaledVector(vorn, y * weg);
    schritt.x = THREE.MathUtils.clamp(schritt.x, -breiteKm / 2, breiteKm / 2);   // Ziel bleibt über dem Block
    schritt.z = THREE.MathUtils.clamp(schritt.z, -tiefeKm / 2, tiefeKm / 2);
    schritt.sub(steuerung.target);
    steuerung.target.add(schritt);
    kamera.position.add(schritt);
  }
}

// ---------- Schleife ----------
// Maßstab in der Bildmitte: 1 km quer zur Blickrichtung projizieren, auf runde Länge (1-2-5) bringen.
// Waagerechte Strecken sind nicht überhöht, nur die Höhen.
const MASSSTAB_MAX_PX = 120;
const quer = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
function aktualisiereMassstab() {
  quer.setFromMatrixColumn(kamera.matrixWorld, 0).setY(0).normalize();
  a.copy(steuerung.target).project(kamera);
  b.copy(steuerung.target).add(quer).project(kamera);
  const pxProKm = Math.hypot((b.x - a.x) * innerWidth / 2, (b.y - a.y) * innerHeight / 2);
  if (!pxProKm) return;
  const roh = (MASSSTAB_MAX_PX / pxProKm) * 1000;                 // Meter, die maximal passen
  const zehner = 10 ** Math.floor(Math.log10(roh));
  const rund = [5, 2, 1].map((f) => f * zehner).find((m) => m <= roh);
  $("#massstab-balken").style.width = `${(rund / 1000) * pxProKm}px`;
  $("#massstab-text").textContent = rund >= 1000 ? `${zahl(rund / 1000, 0)} km` : `${rund} m`;
}

const v = new THREE.Vector3();
let bildNr = 0;
function bild() {
  const jetzt = performance.now();
  aktualisierePult(Math.min(0.05, (jetzt - letztesBild) / 1000));
  letztesBild = jetzt;
  if (flug) fliege();
  if (tourFlug) fliegeTour();
  if (schwenk) schwenke();
  steuerung.update();
  if (bildNr++ % 15 === 0) aktualisiereKacheln();   // reicht ~4× pro Sekunde
  if (bildNr % 3 === 0 && !flug) aktualisiereMassstab();
  const abstand = kamera.position.distanceTo(steuerung.target);
  // Linien werden beim Hineinzoomen breiter
  const zoom = THREE.MathUtils.clamp(14 / abstand, 0.9, 4);
  for (const [art, m] of Object.entries(linienMat)) {
    m.fuellung.linewidth = LINIEN[art].breite * zoom;
    if (m.rand) m.rand.linewidth = (LINIEN[art].breite + 1.6) * zoom;
  }
  renderer.render(szene, kamera);
  for (const b of nadelnAn ? beschriftungen : []) {  // Einflug: erst nur das Gelände, Nadeln kommen zum Ende hin
    const an = sichtbareEbenen[b.ebene] !== false;
    v.copy(b.weltFn());
    const entfernung = kamera.position.distanceTo(v);
    v.project(kamera);
    const vorne = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    b.el.style.display = an && vorne ? "" : "none";
    if (an && vorne) b.el.style.left = `${(v.x + 1) * innerWidth / 2}px`, b.el.style.top = `${(1 - v.y) * innerHeight / 2}px`;
    if (b.nadel && an && vorne) {   // ferne Nadeln kleiner und weiter hinten
      b.el.style.transform = `translate(-50%, -100%) scale(${THREE.MathUtils.clamp(NADEL_K / entfernung, 0.55, 1.3)})`;
      b.el.style.zIndex = String(Math.max(1, Math.round(1000 - entfernung * 10)));
    }
  }
  $("#nordpfeil svg").style.transform = `rotate(${steuerung.getAzimuthalAngle()}rad)`;
  if (!pause) requestAnimationFrame(bild);
}

// ---------- Tour (Ansicht Hintergrund der Daten-Website, Rahmen mit #tour) ----------
// Die Website schickt je Station Kamera, Marken und ob die Nadeln stehen; Texte und Karte liegen dort
const TOUR = document.documentElement.classList.contains("tour");
const TOUR_FLUG_MS = 1500;
let tourFlug = null, tourMarken = [];

function setzeTourMarken(marken) {
  for (const m of tourMarken) { m.el.remove(); beschriftungen.splice(beschriftungen.indexOf(m), 1); }
  tourMarken = marken.map((m) => {
    const xm = m.e - gelaende.ausschnitt.xmin, ym = m.n - gelaende.ausschnitt.ymin;
    return beschrifte(m.text, `tour-marke${m.punkt ? " punkt" : ""}${m.pfeil ? " pfeil" : ""}`,
      () => new THREE.Vector3(sx(xm), (hoeheBei(xm, ym) / 1000) * ueberhoehung, sz(ym)), "tour");
  });
}
function zeigeTourStation(s) {
  if (s.stil !== stil) setzeStil(s.stil);       // folgt dem Hell/Dunkel-Schalter der Website
  const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ziel = new THREE.Vector3(...s.ziel);
  // Schmale Rahmen zeigen weniger Breite: Kamera rückt zurück wie bei der Startansicht
  const position = new THREE.Vector3(...s.kamera).sub(ziel).multiplyScalar(Math.max(1, 1.6 / kamera.aspect)).add(ziel);
  tourFlug = { start: null, dauer: s.sofort || ruhig ? 1 : TOUR_FLUG_MS, vonPos: kamera.position.clone(), vonZiel: steuerung.target.clone(), position, ziel };
  setzeTourMarken(s.marken);
  const standen = !document.body.classList.contains("tour-ohne-nadeln");
  document.body.classList.toggle("tour-ohne-nadeln", !s.nadeln);
  if (s.nadeln && !standen) zeigeNadeln(!s.sofort && !ruhig);
}
function fliegeTour() {
  tourFlug.start ??= performance.now();
  const t = Math.min(1, (performance.now() - tourFlug.start) / tourFlug.dauer);
  const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  kamera.position.lerpVectors(tourFlug.vonPos, tourFlug.position, e);
  steuerung.target.lerpVectors(tourFlug.vonZiel, tourFlug.ziel, e);
  if (t === 1) tourFlug = null;
}
addEventListener("message", (ev) => {
  if (TOUR && ev.origin === location.origin && ev.data?.tourStation) zeigeTourStation(ev.data.tourStation);
});

// Liegt die gewählte Nadel hinter dem Panel, schwenkt die Kamera ruhig zur Seite (400 ms, bei reduzierter Bewegung sofort)
let schwenk = null;
function gibNadelFrei(p) {
  if (innerWidth <= 700) return;                  // dort liegt das Panel als Blatt am unteren Rand
  const frei = $("#panel").getBoundingClientRect().right + 40;
  const welt = new THREE.Vector3(sx(p.x), (hoeheBei(p.x, p.y) / 1000) * ueberhoehung, sz(p.y));
  a.copy(welt).project(kamera);
  const px = (a.x + 1) * innerWidth / 2;
  if (px >= frei) return;
  quer.setFromMatrixColumn(kamera.matrixWorld, 0).setY(0).normalize();
  b.copy(welt).add(quer).project(kamera);
  const pxProKm = Math.hypot((b.x - a.x) * innerWidth / 2, (b.y - a.y) * innerHeight / 2);
  const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  schwenk = { start: performance.now(), dauer: ruhig ? 1 : 400, km: (frei - px) / pxProKm, gelaufen: 0, richtung: quer.clone().negate() };
}
function schwenke() {
  const t = Math.min(1, (performance.now() - schwenk.start) / schwenk.dauer);
  const weg = schwenk.km * (1 - (1 - t) ** 3);
  schritt.copy(schwenk.richtung).multiplyScalar(weg - schwenk.gelaufen);
  schwenk.gelaufen = weg;
  steuerung.target.add(schritt);
  kamera.position.add(schritt);
  if (t === 1) schwenk = null;
}

// Einflug nach dem Einstieg: von oben und weiter weg in die Startansicht, um dieselbe Mitte
let flug = null, pause = false, nadelnAn = false;
// Nadeln einblenden; mit welle = true nacheinander von vorn nach hinten (.nadel.erscheint in startseite.css)
function zeigeNadeln(welle) {
  nadelnAn = true;
  if (welle) {
    beschriftungen.filter((b) => b.nadel)
      .map((b) => [b.el, kamera.position.distanceTo(b.weltFn())])
      .sort((a, b) => a[1] - b[1])
      .forEach(([el], i) => { el.style.animationDelay = `${i * 70}ms`; el.classList.add("erscheint"); });
  }
  document.body.classList.add("nadeln");
  // Klasse danach entfernen: sonst startet die Animation neu, sobald eine Nadel aus dem Bild gerät und zurückkommt
  const nadeln = document.querySelectorAll(".nadel.erscheint");
  setTimeout(() => nadeln.forEach((el) => el.classList.remove("erscheint")), nadeln.length * 70 + 900);
}
function fliege() {
  flug.start ??= performance.now();          // Uhr erst mit dem ersten Flugbild starten, sonst springt die Kamera
  const t = Math.min(1, (performance.now() - flug.start) / flug.dauer);
  const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;   // sanft an, sanft aus
  const s = flug.ziel;
  kamera.position.setFromSphericalCoords(s.radius * (1 + 0.75 * (1 - e)), s.phi * (1 - 0.6 * (1 - e)), s.theta - 0.55 * (1 - e))
    .add(steuerung.target);
  if (t >= 0.7 && !nadelnAn) zeigeNadeln(true);   // die Kamera ist hier schon fast am Ziel
  if (t === 1) { flug = null; steuerung.enabled = true; document.body.classList.add("intro-vorbei"); }
}

addEventListener("resize", () => {
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  setzeAufloesung();
});
function setzeAufloesung() {
  for (const m of Object.values(linienMat)) for (const mat of [m.fuellung, m.rand]) mat?.resolution.set(innerWidth, innerHeight);
}

// ---------- Start ----------
// Startansicht: aus Bens Screenshot berechnet (Blockecken, Fehler rund 6 px)
const START = { kamera: [11.81, 5.25, 12.72], ziel: [3.6, 0, 4.46] };
const intro = document.documentElement.classList.contains("ohne-intro") ? null : zeigeIntro((ruhig) => {
  pause = false;
  if (ruhig) { zeigeNadeln(false); document.body.classList.add("intro-vorbei"); }
  else {
    steuerung.enabled = false;
    flug = { dauer: 2400, ziel: new THREE.Spherical().setFromVector3(kamera.position.clone().sub(steuerung.target)) };
  }
  bild();
}, (hell) => {
  // Das Gelände wechselt schon hinter dem Einstieg, damit es beim Einflug fertig ist
  stil = hell ? "relief" : "dunkel";
  merke("villaverde.thema", hell ? "hell" : "dunkel");
  if (gelaendeMat) { setzeStil(stil); if (pause) bild(); }
});
if (!intro) { zeigeNadeln(false); document.body.classList.add("intro-vorbei"); }
if (TOUR) { steuerung.enabled = false; document.body.classList.add("tour-ohne-nadeln"); }

lade().then(({ osm, profile, texturen: t }) => {
  texturen = t;
  herkunftGlobal = profile.herkunft;
  baueGelaende();
  baueLinien(osm);
  baueWasser(osm);
  baueOrte(osm);
  baueProfile(profile);
  baueHoehenlegende();
  setzeStil(stil);
  setzeAufloesung();
  relief.scale.y = ueberhoehung;
  // Blick von Südosten über den Guadalquivir nach Nordwesten; in schmaleren Fenstern als im Screenshot
  // (Seitenverhältnis 1,82) rückt die Kamera zurück, damit der Block seitlich ganz im Bild bleibt
  steuerung.target.set(...START.ziel);
  kamera.position.set(...START.kamera).sub(steuerung.target)
    .multiplyScalar(Math.max(1, 1.82 / kamera.aspect)).add(steuerung.target);
  // Nahansicht über die Adresse, z. B. ?blick=Villaverde (Kamera schräg über dem Ort)
  const blick = new URLSearchParams(location.search).get("blick");
  const ort = blick && osm.orte.find((o) => o.name.toLowerCase().includes(blick.toLowerCase()));
  if (ort) {
    const ziel = new THREE.Vector3(sx(ort.x), (hoeheBei(ort.x, ort.y) / 1000) * ueberhoehung, sz(ort.y));
    steuerung.target.copy(ziel);
    kamera.position.copy(ziel).add(new THREE.Vector3(-0.6, 1.1, 1.6));
  }
  $("#laden").hidden = true;
  if (!intro) {
    bild();
    if (TOUR) parent.postMessage({ tourBereit: true }, location.origin);
    return;
  }
  pause = true;                               // einmal zeichnen (Texturen hochladen), dann ruhen bis zum Einflug
  bild();
  intro.bereit();
}).catch((fehler) => {
  intro?.abbrechen();
  document.body.classList.add("intro-vorbei");
  $("#laden").textContent = `${t("laden.fehler")} (${fehler.message}).`;
  console.error(fehler);
});
