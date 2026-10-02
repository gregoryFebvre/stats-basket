import type { Performance } from "./models";

type Nombre = number | string | null | undefined;

/** Valeur numérique tolérante pour une saisie en cours (vide, NaN, négatif => 0). */
function entier(v: Nombre): number {
  const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Points d'une joueuse. Accepte une saisie partielle (champs vides ou en texte) :
 * c'est cette fonction qui alimente l'affichage dynamique pendant la saisie.
 */
export function pointsJoueuse(p: { p3?: Nombre; p2?: Nombre; lfReussis?: Nombre }): number {
  return 3 * entier(p.p3) + 2 * entier(p.p2) + entier(p.lfReussis);
}

export const pointsPerformance = (p: Performance): number => pointsJoueuse(p);

/** Texte sans accents, en minuscules, espaces simplifiés : sert à comparer des noms saisis à la main. */
export function normaliser(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Clé servant à retrouver une joueuse (casse, accents, espaces ignorés). */
export function cleJoueuse(prenom: string, nom: string): string {
  return `${normaliser(prenom)}|${normaliser(nom)}`;
}
