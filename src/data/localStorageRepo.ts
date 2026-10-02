import { z } from "zod";
import { CLUB } from "../club.config";
import { JoueuseSchema, MatchSchema, PerformanceSchema, SaisonSchema } from "../domain/models";
import type { Joueuse, Match, Performance, Saison } from "../domain/models";
import { cleJoueuse } from "../domain/points";
import type { KeyValueStore } from "./kvStore";
import { migrer } from "./migrations";
import { DonneesCorrompuesError, StockageError, type Donnees, type Repository } from "./repository";

export class LocalStorageRepository implements Repository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly prefix: string = CLUB.prefixeStockage,
    private readonly genererId: () => string = () => crypto.randomUUID(),
  ) {
    migrer(store, prefix);
  }

  // --- utilitaires bas niveau --------------------------------------------
  private cle = (nom: string) => `${this.prefix}:${nom}`;

  private lire<T>(nom: string, schema: z.ZodType<T>, defaut: T): T {
    const brut = this.store.getItem(this.cle(nom));
    if (brut === null) return defaut;
    try {
      const r = schema.safeParse(JSON.parse(brut));
      if (r.success) return r.data;
      throw new DonneesCorrompuesError(this.cle(nom), r.error.issues[0]?.message ?? "format invalide");
    } catch (e) {
      if (e instanceof StockageError) throw e;
      throw new DonneesCorrompuesError(this.cle(nom), "JSON invalide");
    }
  }

  private ecrire(nom: string, valeur: unknown): void {
    try {
      this.store.setItem(this.cle(nom), JSON.stringify(valeur));
    } catch (e) {
      const quota = e instanceof Error && e.name === "QuotaExceededError";
      throw new StockageError(quota ? "Espace de stockage du navigateur plein." : "Écriture impossible.", e);
    }
  }

  private cleP = (matchId: string) => `perfs:${matchId}`;

  // --- saisons -----------------------------------------------------------
  async getSaisons() { return this.lire("saisons", z.array(SaisonSchema), [] as Saison[]); }
  async saveSaison(s: Saison) {
    SaisonSchema.parse(s);
    this.ecrire("saisons", upsert(await this.getSaisons(), s));
  }

  // --- joueuses ----------------------------------------------------------
  async getJoueuses() { return this.lire("joueuses", z.array(JoueuseSchema), [] as Joueuse[]); }
  async saveJoueuse(j: Joueuse) {
    JoueuseSchema.parse(j);
    this.ecrire("joueuses", upsert(await this.getJoueuses(), j));
  }
  async trouverOuCreerJoueuse(prenom: string, nom: string) {
    const liste = await this.getJoueuses();
    const cle = cleJoueuse(prenom, nom);
    const existante = liste.find((j) => cleJoueuse(j.prenom, j.nom) === cle);
    if (existante) return existante;
    const nouvelle: Joueuse = { id: this.genererId(), prenom: prenom.trim(), nom: nom.trim() };
    await this.saveJoueuse(nouvelle);
    return nouvelle;
  }

  // --- matchs ------------------------------------------------------------
  async getMatchs() { return this.lire("matchs", z.array(MatchSchema), [] as Match[]); }
  async getMatch(id: string) { return (await this.getMatchs()).find((m) => m.id === id) ?? null; }
  async getPerformances(matchId: string) {
    return this.lire(this.cleP(matchId), z.array(PerformanceSchema), [] as Performance[]);
  }
  async getToutesPerformances() {
    const matchs = await this.getMatchs();
    return (await Promise.all(matchs.map((m) => this.getPerformances(m.id)))).flat();
  }
  async saveMatch(match: Match, performances: Performance[]) {
    MatchSchema.parse(match);
    performances.forEach((p) => PerformanceSchema.parse(p));
    if (performances.some((p) => p.matchId !== match.id)) throw new StockageError("Performance rattachée à un autre match.");
    // Les performances d'abord : si le quota saute, la liste des matchs reste cohérente.
    this.ecrire(this.cleP(match.id), performances);
    this.ecrire("matchs", upsert(await this.getMatchs(), match));
  }
  async deleteMatch(id: string) {
    this.ecrire("matchs", (await this.getMatchs()).filter((m) => m.id !== id));
    this.store.removeItem(this.cle(this.cleP(id)));
  }

  // --- brouillon ---------------------------------------------------------
  async getBrouillon() { return this.lire("brouillon", z.unknown(), null as unknown); }
  async saveBrouillon(b: unknown) { this.ecrire("brouillon", b); }
  async effacerBrouillon() { this.store.removeItem(this.cle("brouillon")); }

  // --- sauvegarde / restauration ----------------------------------------
  async exporter(): Promise<Donnees> {
    return {
      saisons: await this.getSaisons(),
      joueuses: await this.getJoueuses(),
      matchs: await this.getMatchs(),
      performances: await this.getToutesPerformances(),
    };
  }
  async remplacerTout(d: Donnees) {
    await this.reinitialiser();
    await this.fusionner(d);
  }
  async fusionner(d: Donnees) {
    for (const s of d.saisons) await this.saveSaison(s);
    for (const j of d.joueuses) await this.saveJoueuse(j);
    const parMatch = new Map<string, Performance[]>();
    for (const p of d.performances) parMatch.set(p.matchId, [...(parMatch.get(p.matchId) ?? []), p]);
    for (const m of d.matchs) await this.saveMatch(m, parMatch.get(m.id) ?? []);
  }
  async reinitialiser() {
    for (const k of this.store.keys()) if (k.startsWith(`${this.prefix}:`) && k !== this.cle("schema")) this.store.removeItem(k);
  }
}

function upsert<T extends { id: string }>(liste: T[], item: T): T[] {
  return liste.some((x) => x.id === item.id) ? liste.map((x) => (x.id === item.id ? item : x)) : [...liste, item];
}
