import { CLUB } from "../club.config";
import { MatchSaisieSchema, type MatchSaisie, type Performance } from "./models";

export interface ResultatValidation {
  erreurs: string[]; // bloquantes
  avertissements: string[];
}

/** Valide un match saisi dans le formulaire. `perfs` doivent déjà avoir un temps en secondes. */
export function validerSaisie(
  match: MatchSaisie,
  perfs: Performance[],
  noms: ReadonlyMap<string, string> = new Map(),
): ResultatValidation {
  const nom = (id: string) => noms.get(id) ?? id;
  const erreurs: string[] = [];
  const avertissements: string[] = [];

  const r = MatchSaisieSchema.safeParse(match);
  if (!r.success) for (const i of r.error.issues) erreurs.push(`${i.path.join(".")} : ${i.message}`);

  const dateOk = !Number.isNaN(Date.parse(match.date));
  if (!dateOk) erreurs.push("date : date invalide");

  const lfSaisis = perfs.reduce((s, p) => s + p.lfReussis, 0);
  if (lfSaisis > match.lfObtenus) {
    erreurs.push(`Lancers francs : ${lfSaisis} réussis saisis pour seulement ${match.lfObtenus} obtenus`);
  }

  const ids = perfs.map((p) => p.joueuseId);
  const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of new Set(doublons)) erreurs.push(`${nom(id)} apparaît plusieurs fois dans ce match`);
  if (perfs.length === 0) erreurs.push("Aucune joueuse saisie");

  const titulaires = perfs.filter((p) => p.titulaire).length;
  if (perfs.length > 0 && titulaires !== 5) avertissements.push(`${titulaires} titulaire(s) saisie(s) au lieu de 5`);

  const attenduSec = 5 * CLUB.dureeMatchMin * 60;
  const totalSec = perfs.reduce((s, p) => s + p.tempsJeuSec, 0);
  if (perfs.length > 0 && Math.abs(totalSec - attenduSec) > 120) {
    avertissements.push(
      `Temps de jeu cumulé de ${Math.floor(totalSec / 60)} min, attendu environ ${attenduSec / 60} min`,
    );
  }
  for (const p of perfs) if (p.fautes > 5) avertissements.push(`${nom(p.joueuseId)} : ${p.fautes} fautes`);

  return { erreurs, avertissements };
}
