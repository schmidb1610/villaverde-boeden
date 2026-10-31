/* auswahl.js – Dropdown unter der Suche: einzelne Profile oder Labor-IDs ankreuzen, auch mehrere.
   Getrennt je Quelle, weil Modell- und Laborzeilen verschiedene IDs haben. Leere Auswahl = alle Zeilen.
   Gilt wie Tiefe und Suche in Tabelle und Graphen; die Häkchen bleiben beim Neuzeichnen stehen. */

const Auswahl = (function () {
  const gewaehlt = { modell: new Set(), labor: new Set() };
  let art = "profil";          // Liste nach „profil" oder „id"
  let quelle = "modell";
  let zeilen = [];
  let aktualisiere = () => {};

  const $$ = (s, w) => [...(w || document).querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const idsVon = (profil) => zeilen.filter((z) => String(z.profil) === profil).map((z) => z.id);

  function eintraege() {
    if (art === "id") {
      return [...zeilen].sort((a, b) => a.profil - b.profil || a.oben - b.oben).map((z) =>
        `<label><input type="checkbox" value="${esc(z.id)}"><span class="auswahl-id">${esc(z.id)}</span>
          <span class="klein">P${String(z.profil).padStart(2, "0")} · ${esc(I18N.tiefe(z.tiefe))}</span></label>`);
    }
    return [...new Set(zeilen.map((z) => z.profil))].sort((a, b) => a - b).map((p) =>
      `<label><input type="checkbox" value="${p}"><span>${esc(I18N.t("auswahl.profil", { n: p }))}</span></label>`);
  }

  function baue(ort, stand) {
    const offen = ort.dataset.offen === "1";
    ort.dataset.stand = stand;
    ort.innerHTML = `<button type="button" class="auswahl-knopf" aria-haspopup="true" aria-expanded="${offen}">
        <span class="auswahl-text"></span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5 11 1.5"/></svg></button>
      <div class="auswahl-menue"${offen ? "" : " hidden"}>
        <div class="segment" role="group" aria-label="${esc(I18N.t("quelle.label"))}">
          <button type="button" data-setze="quelle" data-wert="modell">${esc(I18N.t("quelle.modell"))}</button>
          <button type="button" data-setze="quelle" data-wert="labor">${esc(I18N.t("quelle.labor"))}</button>
        </div>
        <div class="segment" role="group" aria-label="${esc(I18N.t("auswahl.art"))}">
          <button type="button" data-auswahl-art="profil" aria-pressed="${art === "profil"}">${esc(I18N.t("auswahl.profile"))}</button>
          <button type="button" data-auswahl-art="id" aria-pressed="${art === "id"}">${esc(I18N.t("spalte.id"))}</button>
        </div>
        <div class="auswahl-liste">${eintraege().join("")}</div>
        <button type="button" class="link-knopf" data-auswahl-leeren>${esc(I18N.t("auswahl.leeren"))}</button>
      </div>`;
  }

  // Häkchen und Knopftext aus dem Zustand; ein Profil gilt als gewählt, wenn alle seine Zeilen gewählt sind
  function synchronisiere() {
    const satz = gewaehlt[quelle];
    $$(".auswahl-ort").forEach((ort) => {
      $$(".auswahl-liste input", ort).forEach((box) => {
        const ids = art === "id" ? [box.value] : idsVon(box.value);
        const treffer = ids.filter((i) => satz.has(i)).length;
        box.checked = treffer === ids.length;
        box.indeterminate = treffer > 0 && treffer < ids.length;
      });
      $$(".auswahl-text", ort)[0].textContent = satz.size
        ? I18N.t("auswahl.gewaehlt", { z: satz.size, n: zeilen.length }) : I18N.t("auswahl.alle");
    });
  }

  function zeichne(alleZeilen, neueQuelle) {
    zeilen = alleZeilen;
    quelle = neueQuelle;
    const stand = [quelle, art, I18N.sprache].join("|");
    $$(".auswahl-ort").forEach((ort) => { if (ort.dataset.stand !== stand) baue(ort, stand); });
    synchronisiere();
  }

  function klappe(ort, offen) {
    ort.dataset.offen = offen ? "1" : "";
    $$(".auswahl-menue", ort)[0].hidden = !offen;
    $$(".auswahl-knopf", ort)[0].setAttribute("aria-expanded", String(offen));
  }
  const schliesseAlle = (ausser) => $$(".auswahl-ort").forEach((o) => { if (o !== ausser && o.dataset.offen === "1") klappe(o, false); });

  function binde(neuZeichnen) {
    aktualisiere = neuZeichnen;
    document.addEventListener("click", (e) => {
      const ort = e.target.closest(".auswahl-ort");
      schliesseAlle(ort);
      if (!ort) return;
      if (e.target.closest(".auswahl-knopf")) klappe(ort, ort.dataset.offen !== "1");
      const neu = e.target.closest("[data-auswahl-art]");
      if (neu) { art = neu.dataset.auswahlArt; aktualisiere(); }
      if (e.target.closest("[data-auswahl-leeren]")) { gewaehlt[quelle].clear(); aktualisiere(); }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") schliesseAlle(null); });
    document.addEventListener("change", (e) => {
      if (!e.target.closest(".auswahl-liste")) return;
      const box = e.target;
      (art === "id" ? [box.value] : idsVon(box.value)).forEach((i) => gewaehlt[quelle][box.checked ? "add" : "delete"](i));
      aktualisiere();
    });
  }

  return { zeichne, binde, leeren: () => gewaehlt[quelle].clear(), satz: (q) => gewaehlt[q] };
})();
