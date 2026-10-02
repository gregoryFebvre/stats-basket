export const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const fmtNombre = (n: number | null, decimales = 2) =>
  n === null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: decimales });
export const fmtPct = (n: number | null, decimales = 1) => (n === null ? "—" : `${fmtNombre(n, decimales)} %`);

/** Prénom seul, ou prénom + initiale du nom quand deux joueuses ont le même prénom. */
export function etiquettesJoueuses(js: Array<{ id: string; prenom: string; nom: string }>): Map<string, string> {
  const compte = new Map<string, number>();
  for (const j of js) compte.set(j.prenom, (compte.get(j.prenom) ?? 0) + 1);
  return new Map(js.map((j) => [j.id, (compte.get(j.prenom) ?? 0) > 1 ? `${j.prenom} ${j.nom.charAt(0)}.` : j.prenom]));
}
