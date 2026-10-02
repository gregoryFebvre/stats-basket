import type { Match, Performance } from "../models";
import { pointsPerformance } from "../points";
import { perfsDuMatch, repartitionPoints } from "./match";

export interface PointsParMatch { matchId: string; date: string; adversaire: string; pts3: number; pts2: number; lf: number; total: number }

/** Répartition des points de l'équipe (3 pts / 2 pts / LF) match par match, du plus ancien au plus récent. */
export function repartitionParMatch(matchs: Match[], perfs: Performance[]): PointsParMatch[] {
  return [...matchs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => {
      const r = repartitionPoints(perfsDuMatch(perfs, m.id));
      return { matchId: m.id, date: m.date, adversaire: m.adversaire, pts3: r.pts3, pts2: r.pts2, lf: r.lf, total: r.total };
    });
}

export interface LigneHistorique { matchId: string; date: string; adversaire: string; points: number; tempsJeuSec: number; fautes: number; titulaire: boolean }

/** Matchs joués par une joueuse, du plus ancien au plus récent. */
export function historiqueJoueuse(joueuseId: string, matchs: Match[], perfs: Performance[]): LigneHistorique[] {
  return [...matchs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((m) => {
      const p = perfs.find((x) => x.matchId === m.id && x.joueuseId === joueuseId);
      return p ? [{ matchId: m.id, date: m.date, adversaire: m.adversaire, points: pointsPerformance(p), tempsJeuSec: p.tempsJeuSec, fautes: p.fautes, titulaire: p.titulaire }] : [];
    });
}
