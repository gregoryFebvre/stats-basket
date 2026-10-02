import { describe, expect, it } from "vitest";
import {
  bilanJoueuses, bilanMatch, bilanSaison, cleJoueuse, comparerMatchs, filtrerParType, formatTemps,
  pairesAllerRetour, parseTemps, pointsJoueuse, pointsPerformance, repartitionPoints, titulairesVsBanc,
  validerSaisie, type MatchSaisie,
} from "../src/domain";
import { joueuses, matchs, performances, pointsAncienneColonne } from "./fixtures";

describe("temps", () => {
  it("parse mm:ss et h:mm:ss", () => {
    expect(parseTemps("22:50")).toBe(1370);
    expect(parseTemps("00:22:50")).toBe(1370);
    expect(parseTemps("7:05")).toBe(425);
  });
  it("refuse les formats invalides", () => {
    for (const s of ["", "22", "22:60", "ab:cd", "22:5"]) expect(parseTemps(s)).toBeNull();
  });
  it("formate en mm:ss", () => {
    expect(formatTemps(1370)).toBe("22:50");
    expect(formatTemps(0)).toBe("00:00");
  });
});

describe("points (affichage dynamique)", () => {
  it("calcule 3*p3 + 2*p2 + lf", () => expect(pointsJoueuse({ p3: 2, p2: 4, lfReussis: 3 })).toBe(17));
  it("tolère une saisie partielle ou vide", () => {
    expect(pointsJoueuse({})).toBe(0);
    expect(pointsJoueuse({ p3: "", p2: "3", lfReussis: undefined })).toBe(6);
    expect(pointsJoueuse({ p3: "abc", p2: -2, lfReussis: NaN })).toBe(0);
  });
  it("recoupe la colonne « points » de l'ancienne feuille (remplace « ctl pts »)", () => {
    for (const p of performances) expect(pointsPerformance(p)).toBe(pointsAncienneColonne.get(p.id));
  });
});

describe("joueuses", () => {
  it("normalise accents et casse", () => {
    expect(cleJoueuse("Zoé", "ROUX")).toBe(cleJoueuse(" zoe ", "roux"));
  });
  it("dédoublonne les 10 joueuses de l'extrait", () => expect(joueuses).toHaveLength(10));
});

describe("match", () => {
  const m1 = matchs[0]!;
  it("score d'équipe ASTRO = 85, LF réussis = 23", () => {
    const b = bilanMatch(m1, performances);
    expect(b.score).toBe(85);
    expect(b.lfReussis).toBe(23);
  });
  it("marque le match « à compléter » sans résultat ni % LF", () => {
    const b = bilanMatch(m1, performances);
    expect(b).toMatchObject({ aCompleter: true, resultat: null, diff: null, pctLf: null, lfManques: null });
  });
  it("calcule résultat, diff et % LF une fois complété", () => {
    const b = bilanMatch({ ...m1, lfObtenus: 30, scoreAdverse: 70 }, performances);
    expect(b).toMatchObject({ resultat: "gagne", diff: 15, pctLf: 76.67, lfManques: 7, aCompleter: false });
  });
  it("titulaires vs banc", () => {
    const p = performances.filter((x) => x.matchId === "m1");
    expect(titulairesVsBanc(p)).toEqual({ titulaires: 57, banc: 28 });
  });
  it("répartition des points", () => {
    const r = repartitionPoints(performances.filter((x) => x.matchId === "m1"));
    expect(r.total).toBe(85);
    expect(r.pts3 + r.pts2 + r.lf).toBe(85);
  });
});

describe("bilan joueuses", () => {
  const bilans = bilanJoueuses(joueuses, performances);
  it("trie par points décroissants", () => expect(bilans[0]).toMatchObject({ prenom: "Alix", pointsTotal: 17 }));
  it("points par minute basés sur les secondes", () => {
    const alix = bilans.find((b) => b.prenom === "Alix")!;
    expect(alix.pointsParMinute).toBe(0.74); // 17 / (1370/60)
    expect(alix.dependanceLf).toBe(17.6); // 3/17
  });
  it("gère une joueuse à 0 point sans diviser par zéro", () => {
    expect(bilans.find((b) => b.prenom === "Zoé")!.dependanceLf).toBeNull();
  });
});

describe("saison", () => {
  it("compte les matchs à compléter et ne fausse pas le % LF", () => {
    const s = bilanSaison(matchs, performances);
    expect(s.nbACompleter).toBe(2);
    expect(s.pctLf).toBeNull();
    expect(s.pointsMarques).toBe(85);
  });
  it("agrège V/D et % LF", () => {
    const completes = [
      { ...matchs[0]!, lfObtenus: 30, scoreAdverse: 70 },
      { ...matchs[1]!, lfObtenus: 0, scoreAdverse: 40 },
    ];
    const s = bilanSaison(completes, performances);
    expect(s).toMatchObject({ victoires: 1, defaites: 1, lfObtenus: 30, lfReussis: 23, pctLf: 76.67 });
  });
  it("filtre par type", () => {
    expect(filtrerParType(matchs, performances, ["championnat"]).matchs).toHaveLength(0);
    expect(filtrerParType(matchs, performances, ["brassage"]).perfs).toHaveLength(10);
  });
});

describe("comparaison", () => {
  it("détecte les paires aller/retour", () => {
    const retour = { ...matchs[0]!, id: "m3", date: "2027-01-16" };
    expect(pairesAllerRetour([...matchs, retour])).toHaveLength(1);
  });
  it("compare les joueuses présentes aux deux matchs", () => {
    const retour = { ...matchs[0]!, id: "m3", date: "2027-01-16" };
    const alix = joueuses[0]!;
    const perfs = [...performances, { id: "x", matchId: "m3", joueuseId: alix.id, titulaire: true, tempsJeuSec: 1200, p3: 1, p2: 1, lfReussis: 0, fautes: 0 }];
    const c = comparerMatchs(matchs[0]!, retour, joueuses, perfs);
    expect(c.joueuses).toEqual([expect.objectContaining({ prenom: "Alix", aller: 17, retour: 5, evolution: -12 })]);
  });
});

describe("validation de saisie", () => {
  const saisie: MatchSaisie = { ...matchs[0]!, lfObtenus: 30, scoreAdverse: 70 };
  const perfsM1 = performances.filter((p) => p.matchId === "m1");
  it("accepte la saisie ASTRO sans erreur ni avertissement (200 min, 5 titulaires)", () => {
    expect(validerSaisie(saisie, perfsM1)).toEqual({ erreurs: [], avertissements: [] });
  });
  it("bloque si Σ LF réussis > LF obtenus", () => {
    expect(validerSaisie({ ...saisie, lfObtenus: 20 }, perfsM1).erreurs.join()).toContain("Lancers francs");
  });
  it("bloque une joueuse en double", () => {
    const dbl = [...perfsM1, { ...perfsM1[0]!, id: "dup" }];
    expect(validerSaisie(saisie, dbl).erreurs.join()).toContain("plusieurs fois");
  });
  it("avertit sur titulaires et temps total", () => {
    const [a, ...reste] = perfsM1;
    const w = validerSaisie(saisie, [{ ...a!, titulaire: false }, ...reste]).avertissements.join();
    expect(w).toContain("4 titulaire");
  });
});
