/** Convertit "mm:ss" (saisie) ou "h:mm:ss" (anciennes feuilles) en secondes. Retourne null si invalide. */
export function parseTemps(saisie: string): number | null {
  const m = /^(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)$/.exec(saisie.trim());
  if (!m) return null;
  const [, h, min, sec] = m;
  return Number(h ?? 0) * 3600 + Number(min) * 60 + Number(sec);
}

/** Affiche des secondes au format mm:ss (ex. 1370 -> "22:50"). */
export function formatTemps(secondes: number): string {
  const total = Math.max(0, Math.round(secondes));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
