/* intro.js – Einstiegsseite vor dem 3D-Gelände: Überschrift als Feld aus Halbton-Punkten.
   Die Punkte weichen dem Zeiger auf Federn aus und hellen sich dabei blau auf, ein Klick schickt einen Ring
   hindurch. Nach unten wischen, scrollen oder der Pfeil führt ins Gelände: Die Punkte sinken ab, die
   Kamera fliegt ein. Der Abgang läuft als CSS-Animation auf vorgezeichneten Ebenen: Die Grafikkarte bewegt
   sie allein, das Punktfeld wird dafür nicht mehr je Bild neu gezeichnet. Punktlogik nach „Halftone Wordmark Footer" (21st.dev), ohne React neu geschrieben. */

import { t } from "./texte.js";

const ZEILEN = [t("intro.zeile1"), t("intro.zeile2")];
const SCHRIFT = '"Geist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
// Punkte in Ruhe und verschoben: Akzent der Website und Wasserblau, je nach Thema
const FARBEN = { dunkel: { tinte: [169, 189, 208], warm: [127, 180, 210] }, hell: { tinte: [74, 97, 120], warm: [47, 122, 160] } };
const RADIUS = 80;                   // Reichweite des Zeigers in px
const ABGANG_MS = 1300;
const SCHICHTEN = 6;                 // Ebenen beim Abgang; versetzt gestartet (siehe .intro-schicht)

const feder = (x, y, vx, vy, hx, hy, px, py) => {
  const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
  if (d2 < RADIUS * RADIUS) {
    const d = Math.sqrt(d2) + 0.001, f = (1 - d / RADIUS) * 2.6;
    vx += (dx / d) * f; vy += (dy / d) * f;
  }
  vx = (vx + (hx - x) * 0.05) * 0.84;
  vy = (vy + (hy - y) * 0.05) * 0.84;
  return [x + vx, y + vy, vx, vy];
};

// beiAbgang(ruhig): wird beim Verlassen gerufen, sobald das Gelände bereit ist. ruhig = reduzierte Bewegung.
// beiThema(hell): Schalter oben rechts; das Gelände dahinter wechselt mit (hell = Relief). Start ist immer dunkel.
export function zeigeIntro(beiAbgang, beiThema) {
  const wurzel = document.querySelector("#intro");
  const canvas = wurzel.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, dpr = 1, punkte = new Float32Array(0), anzahl = 0;   // x, y, vx, vy, hx, hy, r, verzug
  let px = -1e5, py = -1e5, ring = { x: 0, y: 0, t: -1 };
  let thema = "dunkel";
  let raf = 0, wach = true, gewuenscht = false, bereit = false, abgang = -1, fertig = false;

  function auslegen() {
    const b = wurzel.getBoundingClientRect();
    w = Math.max(1, Math.round(b.width)); h = Math.max(1, Math.round(b.height));
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);

    // Schrift einmal auf eine Maske setzen, Zeilen mittig, Größe nach Breite und Höhe begrenzt
    const maske = document.createElement("canvas");
    maske.width = w; maske.height = h;
    const m = maske.getContext("2d", { willReadFrequently: true });
    m.font = `800 100px ${SCHRIFT}`;
    const breiteste = Math.max(...ZEILEN.map((z) => m.measureText(z).width));
    const groesse = Math.min((w * 0.9 / breiteste) * 100, (h * 0.56) / (ZEILEN.length * 1.08));
    m.font = `800 ${groesse}px ${SCHRIFT}`;
    m.textAlign = "center"; m.textBaseline = "middle"; m.fillStyle = "#000";
    ZEILEN.forEach((z, i) => m.fillText(z, w / 2, h * 0.47 + (i - (ZEILEN.length - 1) / 2) * groesse * 1.08));
    const bild = m.getImageData(0, 0, w, h).data;

    const gap = Math.max(3, Math.min(6, w / 288));
    const tmp = [];
    for (let gy = 0; gy < Math.ceil(h / gap); gy++) {
      for (let gx = 0; gx < Math.ceil(w / gap); gx++) {
        let summe = 0;                                // Deckung: Mittel aus 3 × 3 Stichproben der Zelle
        for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
          const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
          const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
          summe += bild[(y * w + x) * 4 + 3];
        }
        const deckung = summe / (9 * 255);
        if (deckung < 0.06) continue;
        const hx = gx * gap + gap / 2, hy = gy * gap + gap / 2;
        // Verzug beim Abgang: von der Mitte nach außen, leicht gestreut
        const verzug = (Math.abs(hx - w / 2) / w) * 500 + Math.random() * 220;
        tmp.push(hx, hy, 0, 0, hx, hy, Math.sqrt(deckung) * gap * 0.56, verzug);
      }
    }
    punkte = new Float32Array(tmp);
    anzahl = tmp.length / 8;
    wach = true;
  }

  function zeichne(jetzt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ringAlter = ring.t < 0 ? 1e9 : jetzt - ring.t, ringR = ringAlter * 0.9;
    let bewegt = false;
    for (let i = 0; i < anzahl; i++) {
      const j = i * 8;
      let x = punkte[j], y = punkte[j + 1], vx = punkte[j + 2], vy = punkte[j + 3];
      const hx = punkte[j + 4], hy = punkte[j + 5];
      if (!ruhig) {
        if (ringAlter < 900) {
          const dx = hx - ring.x, dy = hy - ring.y, d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
          if (band > 0) { const f = band * 3.2 * (1 - ringAlter / 900); vx += (dx / d) * f; vy += (dy / d) * f; }
        }
        [x, y, vx, vy] = feder(x, y, vx, vy, hx, hy, px, py);
        if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) bewegt = true;
        else { x = hx; y = hy; vx = 0; vy = 0; }
        punkte[j] = x; punkte[j + 1] = y; punkte[j + 2] = vx; punkte[j + 3] = vy;
      }
      const warm = Math.min(1, Math.hypot(x - hx, y - hy) / 28);
      const { tinte, warm: warmton } = FARBEN[thema];
      ctx.fillStyle = `rgb(${tinte.map((c, k) => Math.round(c + (warmton[k] - c) * warm)).join(",")})`;
      ctx.beginPath();
      ctx.arc(x, y, punkte[j + 6], 0, 6.2832);
      ctx.fill();
    }
    wach = bewegt || ringAlter < 900 || px > -1e4;   // schläft, wenn alle Punkte ruhen
  }

  function schleife(jetzt) {
    raf = 0;
    if (fertig || abgang >= 0) return;
    zeichne(jetzt);
    if (wach) raf = requestAnimationFrame(schleife);
  }
  const wecke = () => { wach = true; if (!raf && !fertig) raf = requestAnimationFrame(schleife); };

  function schliessen() {
    fertig = true;
    cancelAnimationFrame(raf);
    removeEventListener("wheel", beimRad);
    removeEventListener("keydown", beiTaste);
    wurzel.remove();
  }

  // Punkte nach Verzug auf Ebenen verteilen und einmal zeichnen; bewegt werden danach nur noch die Ebenen
  function zeichneSchichten() {
    const pfade = Array.from({ length: SCHICHTEN }, () => new Path2D());
    for (let i = 0; i < anzahl; i++) {
      const j = i * 8, x = punkte[j], y = punkte[j + 1], r = punkte[j + 6];
      const pfad = pfade[Math.min(SCHICHTEN - 1, Math.floor((punkte[j + 7] / 720) * SCHICHTEN))];
      pfad.moveTo(x + r, y);
      pfad.arc(x, y, r, 0, 6.2832);
    }
    pfade.forEach((pfad, i) => {
      const ebene = document.createElement("canvas");
      ebene.width = canvas.width; ebene.height = canvas.height;
      ebene.className = "intro-schicht";
      ebene.style.setProperty("--i", i);
      const c = ebene.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = `rgb(${FARBEN[thema].tinte.join(",")})`;
      c.fill(pfad);
      wurzel.insertBefore(ebene, canvas);
    });
    canvas.remove();
    wurzel.getBoundingClientRect();                 // Ausgangslage festhalten, sonst startet die Animation nicht
  }

  function losgehen() {
    if (abgang >= 0) return;
    abgang = performance.now();
    cancelAnimationFrame(raf);
    if (!ruhig) zeichneSchichten();
    wurzel.classList.add("geht");
    // Erst wenn die Ebenen laufen, belastet das Gelände den Hauptfaden
    requestAnimationFrame(() => beiAbgang(ruhig));
    setTimeout(schliessen, ruhig ? 400 : ABGANG_MS + 150);
  }
  // Ziel: erst losfliegen, wenn das Gelände geladen ist
  function weiter() {
    gewuenscht = true;
    wurzel.classList.add("wartet");
    if (bereit) losgehen();
  }

  const beimRad = (e) => { if (e.deltaY > 12) weiter(); };
  const beiTaste = (e) => { if (e.target.closest?.("#intro-thema, #intro-sprache")) return; if (["ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); weiter(); } };
  addEventListener("wheel", beimRad, { passive: true });
  addEventListener("keydown", beiTaste);
  wurzel.querySelector("#intro-weiter").addEventListener("click", weiter);
  wurzel.querySelector("#intro-thema").addEventListener("click", (e) => {
    thema = thema === "dunkel" ? "hell" : "dunkel";
    wurzel.classList.toggle("hell", thema === "hell");
    e.currentTarget.setAttribute("aria-pressed", String(thema === "dunkel"));
    beiThema(thema === "hell");
    wecke();
  });

  let fingerY = null;
  wurzel.addEventListener("touchstart", (e) => { fingerY = e.touches[0].clientY; }, { passive: true });
  wurzel.addEventListener("touchmove", (e) => {
    if (fingerY !== null && fingerY - e.touches[0].clientY > 40) { fingerY = null; weiter(); }
  }, { passive: true });

  const lokal = (e) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  wurzel.addEventListener("pointermove", (e) => { [px, py] = lokal(e); wecke(); });
  wurzel.addEventListener("pointerleave", () => { px = py = -1e5; wecke(); });
  wurzel.addEventListener("pointerdown", (e) => {
    if (ruhig || e.target.closest("button")) return;
    const [x, y] = lokal(e);
    ring = { x, y, t: performance.now() };
    wecke();
  });

  new ResizeObserver(() => { if (abgang < 0) { auslegen(); wecke(); } }).observe(wurzel);
  auslegen();
  wecke();
  // Geist wird nachgeladen und kann später eintreffen → Wort dann in der echten Schrift neu setzen
  document.fonts?.load(`800 100px "Geist"`).then(() => { if (abgang < 0) { auslegen(); wecke(); } }).catch(() => {});

  return {
    bereit() { bereit = true; wurzel.classList.add("bereit"); if (gewuenscht) losgehen(); },
    abbrechen: schliessen
  };
}
