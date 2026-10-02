import type { Joueuse, Match, Performance } from "../models";
import { bilanMatch } from "./match";
import { pointsPerformance } from "../points";

/** Compare deux matchs (typiquement aller/retour contre le même adversaire). Seules les joueuses présentes aux deux sont comparées. */
export function comparerMatchs(m1: Match, m2: Match, joueuses: Joueuse[], perfs: Performance[]) {
  const b1 = bilanMatch(m1, perfs);
  const b2 = bilanMatch(m2, perfs);
  const lignes = joueuses.flatMap((j) => {
    const p1 = perfs.find((p) => p.matchId === m1.id && p.joueuseId === j.id);
    const p2 = perfs.find((p) => p.matchId === m2.id && p.joueuseId === j.id);
    if (!p1 || !p2) return [];
    const a = pointsPerformance(p1);
    const r = pointsPerformance(p2);
    return [{ joueuseId: j.id, prenom: j.prenom, nom: j.nom, aller: a, retour: r, evolution: r - a }];
  });
  return {
    score1: b1.score,
    score2: b2.score,
    diff: b2.score - b1.score,
    joueuses: lignes.sort((x, y) => y.evolution - x.evolution),
  };
}

/** Trouve les paires de matchs contre un même adversaire (casse ignorée), du plus ancien au plus récent. */
export function pairesAllerRetour(matchs: Match[]): Array<[Match, Match]> {
  const parAdversaire = new Map<string, Match[]>();
  for (const m of matchs) {
    const k = m.adversaire.trim().toLowerCase();
    parAdversaire.set(k, [...(parAdversaire.get(k) ?? []), m]);
  }
  const paires: Array<[Match, Match]> = [];
  for (const l of parAdversaire.values()) {
    const t = [...l].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i + 1 < t.length; i++) paires.push([t[i]!, t[i + 1]!]);
  }
  return paires;
}
