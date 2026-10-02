import { beforeEach, describe, expect, it } from "vitest";
import {
  DonneesCorrompuesError, LocalStorageRepository, MemoryStore, StockageError, SCHEMA_VERSION,
  analyserCsvHistorique, exporterJson, importerCsvHistorique, importerJson, migrer, parseCsv, lireSauvegarde,
} from "../src/data";
import { bilanMatch } from "../src/domain";
import { CSV_EXTRAIT } from "./csvFixture";
import { matchs as matchsFx, performances as perfsFx, joueuses as joueusesFx } from "./fixtures";

const P = "test";
const compteur = () => { let n = 0; return () => `id${++n}`; };
const nouveauRepo = (store = new MemoryStore()) => new LocalStorageRepository(store, P, compteur());

describe("repository localStorage", () => {
  let store: MemoryStore;
  let repo: LocalStorageRepository;
  beforeEach(() => { store = new MemoryStore(); repo = nouveauRepo(store); });

  it("écrit la version du schéma au premier démarrage", () => {
    expect(store.getItem(`${P}:schema`)).toBe(String(SCHEMA_VERSION));
  });

  it("enregistre et relit un match avec ses performances", async () => {
    const m = { ...matchsFx[0]!, lfObtenus: 30, scoreAdverse: 70 };
    const ps = perfsFx.filter((p) => p.matchId === "m1");
    await repo.saveMatch(m, ps);
    expect(await repo.getMatch("m1")).toEqual(m);
    expect(await repo.getPerformances("m1")).toEqual(ps);
    expect(bilanMatch(m, await repo.getToutesPerformances()).score).toBe(85);
  });

  it("remplace un match existant au lieu de le dupliquer (mode édition)", async () => {
    await repo.saveMatch(matchsFx[0]!, perfsFx.filter((p) => p.matchId === "m1"));
    await repo.saveMatch({ ...matchsFx[0]!, lieu: "AUTRE" }, []);
    expect(await repo.getMatchs()).toHaveLength(1);
    expect((await repo.getMatch("m1"))!.lieu).toBe("AUTRE");
    expect(await repo.getPerformances("m1")).toEqual([]);
  });

  it("supprime un match et ses performances", async () => {
    await repo.saveMatch(matchsFx[0]!, perfsFx.filter((p) => p.matchId === "m1"));
    await repo.deleteMatch("m1");
    expect(await repo.getMatchs()).toEqual([]);
    expect(store.keys().some((k) => k.includes("perfs:m1"))).toBe(false);
  });

  it("refuse une performance rattachée à un autre match", async () => {
    await expect(repo.saveMatch(matchsFx[1]!, perfsFx.filter((p) => p.matchId === "m1"))).rejects.toThrow(StockageError);
  });

  it("dédoublonne les joueuses (accents/casse)", async () => {
    const a = await repo.trouverOuCreerJoueuse("Zoé", "ROUX");
    const b = await repo.trouverOuCreerJoueuse(" zoe ", "roux");
    expect(b.id).toBe(a.id);
    expect(await repo.getJoueuses()).toHaveLength(1);
  });

  it("signale des données corrompues", async () => {
    store.setItem(`${P}:matchs`, "pas du json");
    await expect(repo.getMatchs()).rejects.toThrow(DonneesCorrompuesError);
    store.setItem(`${P}:matchs`, JSON.stringify([{ id: "x" }]));
    await expect(repo.getMatchs()).rejects.toThrow(DonneesCorrompuesError);
  });

  it("garde un brouillon puis l'efface", async () => {
    expect(await repo.getBrouillon()).toBeNull();
    await repo.saveBrouillon({ adversaire: "AST" });
    expect(await repo.getBrouillon()).toEqual({ adversaire: "AST" });
    await repo.effacerBrouillon();
    expect(await repo.getBrouillon()).toBeNull();
  });

  it("ne corrompt pas la liste des matchs si le quota est atteint", async () => {
    class Plein extends MemoryStore {
      override setItem(k: string, v: string) {
        if (k.includes(":perfs:")) throw Object.assign(new Error("full"), { name: "QuotaExceededError" });
        super.setItem(k, v);
      }
    }
    const r = nouveauRepo(new Plein());
    await expect(r.saveMatch(matchsFx[0]!, perfsFx.filter((p) => p.matchId === "m1"))).rejects.toThrow(/plein/);
    expect(await r.getMatchs()).toEqual([]);
  });

  it("réinitialise sans perdre la version du schéma", async () => {
    await repo.saveMatch(matchsFx[0]!, []);
    await repo.reinitialiser();
    expect(await repo.getMatchs()).toEqual([]);
    expect(store.getItem(`${P}:schema`)).toBe(String(SCHEMA_VERSION));
  });
});

describe("migrations", () => {
  it("refuse des données d'une version plus récente", () => {
    const s = new MemoryStore();
    s.setItem(`${P}:schema`, String(SCHEMA_VERSION + 1));
    expect(() => migrer(s, P)).toThrow(/plus récente/);
  });
  it("refuse une version invalide", () => {
    const s = new MemoryStore();
    s.setItem(`${P}:schema`, "abc");
    expect(() => migrer(s, P)).toThrow(StockageError);
  });
});

describe("export / import JSON", () => {
  async function repoRempli() {
    const r = nouveauRepo();
    await r.saveSaison({ id: "s1", libelle: "2026-2027" });
    for (const j of joueusesFx) await r.saveJoueuse(j);
    for (const m of matchsFx) await r.saveMatch(m, perfsFx.filter((p) => p.matchId === m.id));
    return r;
  }

  it("aller-retour complet vers un repository vide", async () => {
    const source = await repoRempli();
    const json = await exporterJson(source, new Date("2026-10-01T00:00:00Z"));
    const cible = nouveauRepo();
    const n = await importerJson(cible, json, "remplacer");
    expect(n).toEqual({ saisons: 1, joueuses: 10, matchs: 2, performances: 10 });
    expect(await cible.exporter()).toEqual(await source.exporter());
  });

  it("remplacer efface le contenu existant, fusionner le conserve", async () => {
    const json = await exporterJson(await repoRempli());
    const autre = nouveauRepo();
    await autre.saveMatch({ ...matchsFx[0]!, id: "zz", adversaire: "AUTRE" }, []);
    await importerJson(autre, json, "fusionner");
    expect(await autre.getMatchs()).toHaveLength(3);
    await importerJson(autre, json, "remplacer");
    expect(await autre.getMatchs()).toHaveLength(2);
  });

  it("n'écrit rien si le fichier est invalide", async () => {
    const cible = nouveauRepo();
    await cible.saveMatch(matchsFx[0]!, []);
    expect(() => lireSauvegarde("{pas json")).toThrow(/JSON/);
    expect(() => lireSauvegarde(JSON.stringify({ application: "autre" }))).toThrow(StockageError);
    const json = JSON.parse(await exporterJson(await repoRempli()));
    json.performances[0].joueuseId = "inconnue";
    await expect(importerJson(cible, JSON.stringify(json), "remplacer")).rejects.toThrow(/joueuse introuvable/);
    expect(await cible.getMatchs()).toHaveLength(1);
  });
});

describe("import CSV de l'historique", () => {
  const ctx = (extra = {}) => ({ saisonId: "s1", joueusesExistantes: [], matchsExistants: [], genererId: compteur(), ...extra });

  it("lit les guillemets et les CRLF", () => {
    expect(parseCsv('a,b\r\n"1,5",x\r\n')).toEqual([["a", "b"], ["1,5", "x"]]);
    expect(parseCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("importe l'extrait réel : 2 matchs, 10 joueuses, 10 performances", () => {
    const r = analyserCsvHistorique(CSV_EXTRAIT, ctx());
    expect(r.matchs.map((m) => `${m.date} ${m.adversaire} ${m.type} ${m.lieu}`)).toEqual([
      "2026-09-12 ASTRO brassage PINSAGUEL",
      "2026-09-26 VERFEIL brassage VERFEIL",
    ]);
    expect(r.matchs.every((m) => m.lfObtenus === null && m.scoreAdverse === null)).toBe(true);
    expect(r.joueusesACreer).toHaveLength(10);
    expect(r.performances).toHaveLength(10);
    expect(r.rapport).toMatchObject({ lignesLues: 10, matchsCrees: 2, erreurs: [], avertissements: [], matchsRejetes: [] });
    const alix = r.joueusesACreer.find((j) => j.prenom === "Alix")!;
    expect(r.performances.find((p) => p.joueuseId === alix.id)).toMatchObject({ tempsJeuSec: 1370, titulaire: true, p3: 2, p2: 4, lfReussis: 3, fautes: 1 });
  });

  it("écrit dans le repository et reste idempotent", async () => {
    const repo = nouveauRepo();
    const r1 = await importerCsvHistorique(repo, CSV_EXTRAIT, "s1");
    expect(r1.matchsCrees).toBe(2);
    const [astro] = await repo.getMatchs();
    const perfs = await repo.getToutesPerformances();
    expect(perfs.filter((p) => p.matchId === astro!.id)).toHaveLength(9);
    expect(bilanMatch(astro!, perfs)).toMatchObject({ score: 85, lfReussis: 23, aCompleter: true });
    const r2 = await importerCsvHistorique(repo, CSV_EXTRAIT, "s1");
    expect(r2.matchsCrees).toBe(0);
    expect(r2.matchsDejaPresents).toHaveLength(2);
    expect(await repo.getJoueuses()).toHaveLength(10);
    expect(await repo.getMatchs()).toHaveLength(2);
  });

  it("rattache une joueuse déjà connue sans doublon", () => {
    const connue = { id: "j-zoe", prenom: "zoe", nom: "roux" };
    const r = analyserCsvHistorique(CSV_EXTRAIT, ctx({ joueusesExistantes: [connue] }));
    expect(r.joueusesACreer).toHaveLength(9);
    expect(r.performances.some((p) => p.joueuseId === "j-zoe")).toBe(true);
  });

  const EN_TETE = "date,type,contre,lieu,prenom,nom,time_play,minutes,fautes,titulaire,points,p3,p2,lancer_franc\n";

  it("rejette tout le match si une de ses lignes est en erreur", () => {
    const csv = EN_TETE +
      "2026-10-03,championnat,LOURDES,LOURDES,Ana,DIAZ,10:00,,1,x,4,0,2,0\n" +
      "2026-10-03,championnat,LOURDES,LOURDES,Bea,LUZ,xx,,1,,2,0,1,0\n";
    const r = analyserCsvHistorique(csv, ctx());
    expect(r.matchs).toEqual([]);
    expect(r.rapport.matchsRejetes).toEqual(["2026-10-03 LOURDES"]);
    expect(r.rapport.erreurs).toEqual([{ ligne: 3, message: expect.stringContaining("temps") }]);
  });

  it("signale type inconnu, doublon de joueuse et points divergents", () => {
    const csv = EN_TETE +
      "2026-10-03,tournoi,A,X,Ana,DIAZ,10:00,,1,x,4,0,2,0\n" +
      "2026-10-10,coupe,B,Y,Ana,DIAZ,10:00,,1,x,5,0,2,0\n" +
      "2026-10-10,coupe,B,Y,ana,diaz,05:00,,0,,0,0,0,0\n";
    const r = analyserCsvHistorique(csv, ctx());
    expect(r.rapport.erreurs.map((e) => e.message)).toEqual([expect.stringContaining("type"), expect.stringContaining("deux fois")]);
    expect(r.rapport.avertissements[0]).toContain("points du fichier 5, recalculés 4");
    expect(r.matchs).toEqual([]);
  });

  it("utilise la colonne minutes décimale si time_play est illisible", () => {
    const csv = EN_TETE + "2026-10-03,amical,A,X,Ana,DIAZ,,\"22,83\",1,x,4,0,2,0\n";
    expect(analyserCsvHistorique(csv, ctx()).performances[0]!.tempsJeuSec).toBe(1370);
  });

  it("refuse un fichier sans les colonnes requises", () => {
    expect(() => analyserCsvHistorique("date,type\n2026-01-01,amical", ctx())).toThrow(/Colonnes manquantes/);
  });
});
