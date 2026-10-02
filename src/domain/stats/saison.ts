import type { Match, Performance } from "../models";
import { arrondi, bilanMatch, type BilanMatch } from "./match";

export interface BilanSaison {
  matchs: BilanMatch[]; // du plus récent au plus ancien
  victoires: number;
  defaites: number;
  nuls: number;
  nbACompleter: number;
  pointsMarques: number;
  pointsEncaisses: number; // uniquement sur les matchs dont le score adverse est connu
  lfReussis: number;
  lfObtenus: number; // uniquement sur les matchs dont lfObtenus est connu
  pctLf: number | null;
}

export function bilanSaison(matchs: Match[], perfs: Performance[]): BilanSaison {
  const tries = [...matchs].sort((a, b) => b.date.localeCompare(a.date));
  const bilans = tries.map((m) => bilanMatch(m, perfs));
  const avecLf = bilans.filter((b) => b.lfObtenus !== null);
  const lfReussis = avecLf.reduce((s, b) => s + b.lfReussis, 0);
  const lfObtenus = avecLf.reduce((s, b) => s + (b.lfObtenus ?? 0), 0);
  return {
    matchs: bilans,
    victoires: bilans.filter((b) => b.resultat === "gagne").length,
    defaites: bilans.filter((b) => b.resultat === "perdu").length,
    nuls: bilans.filter((b) => b.resultat === "nul").length,
    nbACompleter: bilans.filter((b) => b.aCompleter).length,
    pointsMarques: bilans.reduce((s, b) => s + b.score, 0),
    pointsEncaisses: bilans.reduce((s, b) => s + (b.scoreAdverse ?? 0), 0),
    lfReussis,
    lfObtenus,
    pctLf: lfObtenus > 0 ? arrondi((lfReussis / lfObtenus) * 100) : null,
  };
}
