import { cleJoueuse } from "../src/domain/points";
import { parseTemps } from "../src/domain/temps";
import type { Joueuse, Match, Performance } from "../src/domain/models";

// Extrait réel : [match, prenom, nom, time_play, fautes, titulaire, points(ancienne colonne), p3, p2, lf]
const LIGNES: Array<[string, string, string, string, number, boolean, number, number, number, number]> = [
  ["m1", "Alix", "MARTIN", "00:22:50", 1, true, 17, 2, 4, 3],
  ["m1", "Camille", "DUPONT", "00:28:04", 4, true, 14, 0, 5, 4],
  ["m1", "Rose", "ROBERT", "00:13:54", 4, false, 11, 0, 5, 1],
  ["m1", "Eva", "PETIT", "00:29:12", 4, true, 10, 0, 4, 2],
  ["m1", "Nina", "MOREAU", "00:23:23", 1, false, 2, 0, 1, 0],
  ["m1", "Lena", "SIMON", "00:22:46", 1, true, 7, 0, 2, 3],
  ["m1", "Roxane", "LAURENT", "00:15:24", 3, false, 3, 0, 1, 1],
  ["m1", "Lola", "MICHEL", "00:21:10", 1, true, 9, 0, 3, 3],
  ["m1", "Tess", "LEROY", "00:23:17", 0, false, 12, 0, 3, 6],
  ["m2", "Zoé", "ROUX", "00:13:07", 2, false, 0, 0, 0, 0],
];

export const joueuses: Joueuse[] = [];
export const performances: Performance[] = [];
export const pointsAncienneColonne = new Map<string, number>();

for (const [matchId, prenom, nom, temps, fautes, titulaire, pts, p3, p2, lf] of LIGNES) {
  const cle = cleJoueuse(prenom, nom);
  let j = joueuses.find((x) => cleJoueuse(x.prenom, x.nom) === cle);
  if (!j) joueuses.push((j = { id: `j${joueuses.length + 1}`, prenom, nom }));
  const id = `p${performances.length + 1}`;
  performances.push({ id, matchId, joueuseId: j.id, titulaire, tempsJeuSec: parseTemps(temps)!, p3, p2, lfReussis: lf, fautes });
  pointsAncienneColonne.set(id, pts);
}

// Option 2 : lfObtenus et scoreAdverse absents (« à compléter »)
export const matchs: Match[] = [
  { id: "m1", saisonId: "s1", date: "2026-09-12", type: "brassage", adversaire: "ASTRO", lieu: "PINSAGUEL", lfObtenus: null, scoreAdverse: null },
  { id: "m2", saisonId: "s1", date: "2026-09-26", type: "brassage", adversaire: "VERFEIL", lieu: "VERFEIL", lfObtenus: null, scoreAdverse: null },
];
