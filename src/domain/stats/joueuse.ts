import type { Joueuse, Match, Performance } from "../models";
import { pointsPerformance } from "../points";
import { arrondi } from "./match";

export interface BilanJoueuse {
  joueuseId: string;
  prenom: string;
  nom: string;
  nbMatchs: number;
  nbTitularisations: number;
  pointsTotal: number;
  pointsMaxi: number;
  pointsMini: number;
  pointsMoyenne: number;
  tempsJeuSec: number;
  fautes: number;
  pointsParMinute: number | null;
  nb3: number;
  nb2: number;
  pts3: number;
  pts2: number;
  lfReussis: number;
  /** Part des points venant des lancers francs, en % (ancien « %_lancer_franc »). */
  dependanceLf: number | null;
}

export function bilanJoueuses(joueuses: Joueuse[], perfs: Performance[]): BilanJoueuse[] {
  const res: BilanJoueuse[] = [];
  for (const j of joueuses) {
    const l = perfs.filter((p) => p.joueuseId === j.id);
    if (l.length === 0) continue;
    const pts = l.map(pointsPerformance);
    const pointsTotal = pts.reduce((a, b) => a + b, 0);
    const tempsJeuSec = l.reduce((s, p) => s + p.tempsJeuSec, 0);
    const nb3 = l.reduce((s, p) => s + p.p3, 0);
    const nb2 = l.reduce((s, p) => s + p.p2, 0);
    const lfReussis = l.reduce((s, p) => s + p.lfReussis, 0);
    res.push({
      joueuseId: j.id,
      prenom: j.prenom,
      nom: j.nom,
      nbMatchs: l.length,
      nbTitularisations: l.filter((p) => p.titulaire).length,
      pointsTotal,
      pointsMaxi: Math.max(...pts),
      pointsMini: Math.min(...pts),
      pointsMoyenne: arrondi(pointsTotal / l.length),
      tempsJeuSec,
      fautes: l.reduce((s, p) => s + p.fautes, 0),
      pointsParMinute: tempsJeuSec > 0 ? arrondi(pointsTotal / (tempsJeuSec / 60)) : null,
      nb3,
      nb2,
      pts3: nb3 * 3,
      pts2: nb2 * 2,
      lfReussis,
      dependanceLf: pointsTotal > 0 ? arrondi((lfReussis / pointsTotal) * 100, 1) : null,
    });
  }
  return res.sort((a, b) => b.pointsTotal - a.pointsTotal);
}

/** Filtre les matchs par type (ex. championnat seul) et renvoie les perfs correspondantes. */
export function filtrerParType<T extends Match["type"]>(matchs: Match[], perfs: Performance[], types: readonly T[]) {
  const retenus = matchs.filter((m) => (types as readonly string[]).includes(m.type));
  const ids = new Set(retenus.map((m) => m.id));
  return { matchs: retenus, perfs: perfs.filter((p) => ids.has(p.matchId)) };
}
