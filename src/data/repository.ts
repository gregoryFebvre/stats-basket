import type { Joueuse, Match, Performance, Saison } from "../domain/models";

export interface Donnees {
  saisons: Saison[];
  joueuses: Joueuse[];
  matchs: Match[];
  performances: Performance[];
}

export class StockageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "StockageError";
  }
}
export class DonneesCorrompuesError extends StockageError {
  constructor(readonly cle: string, detail: string) {
    super(`Données illisibles pour « ${cle} » : ${detail}`);
    this.name = "DonneesCorrompuesError";
  }
}

/**
 * Contrat de stockage. Tout est asynchrone, même si localStorage est synchrone :
 * passer à IndexedDB plus tard ne demandera aucun changement côté interface.
 */
export interface Repository {
  getSaisons(): Promise<Saison[]>;
  saveSaison(saison: Saison): Promise<void>;

  getJoueuses(): Promise<Joueuse[]>;
  saveJoueuse(joueuse: Joueuse): Promise<void>;
  /** Retrouve une joueuse par prénom/nom (casse et accents ignorés) ou la crée. */
  trouverOuCreerJoueuse(prenom: string, nom: string): Promise<Joueuse>;

  getMatchs(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | null>;
  getPerformances(matchId: string): Promise<Performance[]>;
  getToutesPerformances(): Promise<Performance[]>;
  /** Crée ou remplace un match et toutes ses performances. */
  saveMatch(match: Match, performances: Performance[]): Promise<void>;
  deleteMatch(id: string): Promise<void>;

  getBrouillon(): Promise<unknown | null>;
  saveBrouillon(brouillon: unknown): Promise<void>;
  effacerBrouillon(): Promise<void>;

  exporter(): Promise<Donnees>;
  /** Remplace tout le contenu. */
  remplacerTout(donnees: Donnees): Promise<void>;
  /** Ajoute ou met à jour par identifiant, sans rien supprimer. */
  fusionner(donnees: Donnees): Promise<void>;
  reinitialiser(): Promise<void>;
}
