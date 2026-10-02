import type { Match, Performance } from "../models";
import { pointsPerformance } from "../points";

export type Resultat = "gagne" | "perdu" | "nul";

export interface BilanMatch {
  matchId: string;
  score: number;
  scoreAdverse: number | null;
  diff: number | null;
  resultat: Resultat | null; // null si scoreAdverse manquant
  lfReussis: number;
  lfObtenus: number | null;
  pctLf: number | null; // 0-100, null si lfObtenus manquant ou 0
  lfManques: number | null;
  aCompleter: boolean; // lfObtenus ou scoreAdverse manquant
}

export const perfsDuMatch = (perfs: Performance[], matchId: string) =>
  perfs.filter((p) => p.matchId === matchId);

export const arrondi = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function bilanMatch(match: Match, perfs: Performance[]): BilanMatch {
  const lignes = perfsDuMatch(perfs, match.id);
  const score = lignes.reduce((s, p) => s + pointsPerformance(p), 0);
  const lfReussis = lignes.reduce((s, p) => s + p.lfReussis, 0);
  const { scoreAdverse, lfObtenus } = match;
  const diff = scoreAdverse === null ? null : score - scoreAdverse;
  return {
    matchId: match.id,
    score,
    scoreAdverse,
    diff,
    resultat: diff === null ? null : diff > 0 ? "gagne" : diff < 0 ? "perdu" : "nul",
    lfReussis,
    lfObtenus,
    pctLf: lfObtenus ? arrondi((lfReussis / lfObtenus) * 100) : null,
    lfManques: lfObtenus === null ? null : lfObtenus - lfReussis,
    aCompleter: lfObtenus === null || scoreAdverse === null,
  };
}

/** Titulaires vs banc : points marqués par chaque groupe (un match ou toute la saison selon les perfs passées). */
export function titulairesVsBanc(perfs: Performance[]): { titulaires: number; banc: number } {
  let titulaires = 0;
  let banc = 0;
  for (const p of perfs) (p.titulaire ? (titulaires += pointsPerformance(p)) : (banc += pointsPerformance(p)));
  return { titulaires, banc };
}

/** Répartition des points de l'équipe par type. */
export function repartitionPoints(perfs: Performance[]) {
  const p3 = perfs.reduce((s, p) => s + p.p3, 0);
  const p2 = perfs.reduce((s, p) => s + p.p2, 0);
  const lf = perfs.reduce((s, p) => s + p.lfReussis, 0);
  return { nb3: p3, nb2: p2, lf, pts3: p3 * 3, pts2: p2 * 2, total: p3 * 3 + p2 * 2 + lf };
}
