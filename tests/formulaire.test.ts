import { describe, expect, it } from "vitest";
import { depuisMatch, formulaireVide, ligneVide, normaliserTemps, totauxForm, versDomaine, type FormulaireMatch } from "../src/features/saisie/formulaire";
import { joueuses as joueusesFx } from "./fixtures";

const compteur = () => { let n = 0; return () => `id${++n}`; };
const ligne = (prenom: string, nom: string, temps: string, p3: string, p2: string, lf: string, fautes = "0", titulaire = false) =>
  ({ ...ligneVide(), prenom, nom, temps, p3, p2, lf, fautes, titulaire });

function formValide(): FormulaireMatch {
  const f = formulaireVide();
  f.date = "2026-10-03"; f.type = "championnat"; f.adversaire = "LOURDES"; f.lieu = "Lourdes"; f.lfObtenus = "10"; f.scoreAdverse = "40";
  f.lignes[0] = ligne("Alix", "MARTIN", "22:50", "2", "4", "3", "1", true);
  f.lignes[1] = ligne("Zoé", "ROUX", "13:07", "", "1", "", "", false);
  return f;
}
const ctx = { joueuses: joueusesFx, saisonId: "s1", genererId: compteur() };

describe("normaliserTemps", () => {
  it("insère les deux points", () => {
    expect(normaliserTemps("2250")).toBe("22:50");
    expect(normaliserTemps("705")).toBe("7:05");
    expect(normaliserTemps("22:50")).toBe("22:50");
    expect(normaliserTemps(" abc ")).toBe("abc");
  });
});

describe("totauxForm", () => {
  it("calcule points, LF et temps en tolérant les champs vides", () => {
    expect(totauxForm(formValide())).toMatchObject({ nbJoueuses: 2, points: 17 + 2, lfSaisis: 3, tempsSec: 1370 + 787, titulaires: 1 });
  });
});

describe("versDomaine", () => {
  it("convertit un formulaire valide, rattache les joueuses connues et crée les nouvelles", () => {
    const f = formValide();
    f.lignes[2] = ligne("Nouvelle", "JOUEUSE", "05:00", "0", "0", "0");
    const r = versDomaine(f, { ...ctx, genererId: compteur() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.match).toMatchObject({ date: "2026-10-03", type: "championnat", adversaire: "LOURDES", lfObtenus: 10, scoreAdverse: 40, saisonId: "s1" });
    expect(r.performances).toHaveLength(3);
    expect(r.performances[0]).toMatchObject({ joueuseId: joueusesFx.find((j) => j.prenom === "Alix")!.id, tempsJeuSec: 1370, p3: 2, p2: 4, lfReussis: 3, titulaire: true });
    expect(r.performances[1]).toMatchObject({ p3: 0, p2: 1, lfReussis: 0, fautes: 0 }); // vides = 0
    expect(r.nouvellesJoueuses).toEqual([expect.objectContaining({ prenom: "Nouvelle", nom: "JOUEUSE" })]);
    expect(r.avertissements.join()).toContain("1 titulaire"); // 1 titulaire au lieu de 5
  });

  it("garde l'identifiant du match en mode édition", () => {
    const r = versDomaine(formValide(), { ...ctx, matchId: "m-existant" });
    expect(r.ok && r.match.id === "m-existant" && r.performances.every((p) => p.matchId === "m-existant")).toBe(true);
  });

  it("signale chaque champ obligatoire manquant", () => {
    const r = versDomaine(formulaireVide(), ctx);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.champs).sort()).toEqual(["adversaire", "date", "lfObtenus", "scoreAdverse", "type"]);
  });

  it("signale les erreurs de ligne avec leur position", () => {
    const f = formValide();
    f.lignes[3] = ligne("Zoé", "", "12h", "x", "1", "");
    const r = versDomaine(f, ctx);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.champs).toMatchObject({ "lignes.3.nom": expect.any(String), "lignes.3.temps": "Format mm:ss", "lignes.3.p3": "Entier ≥ 0" });
  });

  it("bloque LF saisis > LF obtenus et nomme la joueuse en doublon", () => {
    const f = formValide();
    f.lfObtenus = "2";
    const r1 = versDomaine(f, ctx);
    expect(!r1.ok && r1.globales.join()).toContain("Lancers francs");
    const g = formValide();
    g.lignes[2] = ligne("alix", "martin", "01:00", "0", "0", "0");
    const r2 = versDomaine(g, ctx);
    expect(!r2.ok && r2.globales.join()).toContain("Alix MARTIN apparaît plusieurs fois");
  });

  it("ignore les lignes entièrement vides", () => {
    const r = versDomaine(formValide(), ctx);
    expect(r.ok && r.performances.length).toBe(2);
  });
});

describe("depuisMatch", () => {
  it("reconstitue le formulaire d'édition (temps en mm:ss, au moins 10 lignes)", () => {
    const r = versDomaine(formValide(), { ...ctx, genererId: compteur() });
    if (!r.ok) throw new Error("attendu valide");
    const f = depuisMatch(r.match, r.performances, joueusesFx);
    expect(f.lignes).toHaveLength(10);
    expect(f.lignes[0]).toMatchObject({ prenom: "Alix", nom: "MARTIN", temps: "22:50", p3: "2", p2: "4", lf: "3", titulaire: true });
    expect(f.lfObtenus).toBe("10");
  });
});
