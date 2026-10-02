import { z } from "zod";
import { CLUB } from "../../club.config";
import { TYPES_MATCH, type Joueuse, type Match, type MatchSaisie, type Performance } from "../../domain/models";
import { cleJoueuse, pointsJoueuse } from "../../domain/points";
import { formatTemps, parseTemps } from "../../domain/temps";
import { validerSaisie } from "../../domain/validation";

// Le formulaire manipule des CHAÎNES (ce que l'utilisateur tape) ; versDomaine() les convertit et les valide.

export const LigneFormSchema = z.object({
  prenom: z.string(), nom: z.string(), titulaire: z.boolean(),
  temps: z.string(), p3: z.string(), p2: z.string(), lf: z.string(), fautes: z.string(),
});
export const FormulaireSchema = z.object({
  date: z.string(),
  type: z.union([z.enum(TYPES_MATCH), z.literal("")]),
  adversaire: z.string(), lieu: z.string(), lfObtenus: z.string(), scoreAdverse: z.string(),
  lignes: z.array(LigneFormSchema),
});
export type LigneForm = z.infer<typeof LigneFormSchema>;
export type FormulaireMatch = z.infer<typeof FormulaireSchema>;

export const ligneVide = (): LigneForm => ({ prenom: "", nom: "", titulaire: false, temps: "", p3: "", p2: "", lf: "", fautes: "" });
export const formulaireVide = (nbLignes = 10): FormulaireMatch => ({
  date: "", type: "", adversaire: "", lieu: "", lfObtenus: "", scoreAdverse: "",
  lignes: Array.from({ length: nbLignes }, ligneVide),
});

export const ligneEstVide = (l: LigneForm) =>
  !l.titulaire && [l.prenom, l.nom, l.temps, l.p3, l.p2, l.lf, l.fautes].every((v) => v.trim() === "");
export const estVide = (f: FormulaireMatch) =>
  [f.date, f.type, f.adversaire, f.lieu, f.lfObtenus, f.scoreAdverse].every((v) => v.trim() === "") && f.lignes.every(ligneEstVide);

/** Entier positif ou nul, ou null si le texte n'en est pas un. */
export const parseEntier = (s: string): number | null => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);

/** « 2250 » -> « 22:50 » (confort de saisie, appliqué à la sortie du champ). */
export function normaliserTemps(s: string): string {
  const t = s.trim();
  return /^\d{3,4}$/.test(t) ? `${t.slice(0, -2)}:${t.slice(-2)}` : t;
}

/** Totaux affichés en direct sous le tableau (tolérants aux saisies incomplètes). */
export function totauxForm(f: FormulaireMatch) {
  const lignes = f.lignes.filter((l) => !ligneEstVide(l));
  return {
    nbJoueuses: lignes.length,
    points: lignes.reduce((s, l) => s + pointsJoueuse({ p3: l.p3, p2: l.p2, lfReussis: l.lf }), 0),
    lfSaisis: lignes.reduce((s, l) => s + (parseEntier(l.lf) ?? 0), 0),
    tempsSec: lignes.reduce((s, l) => s + (parseTemps(l.temps) ?? 0), 0),
    titulaires: lignes.filter((l) => l.titulaire).length,
    tempsAttenduSec: 5 * CLUB.dureeMatchMin * 60,
  };
}

export interface ContexteConversion {
  joueuses: Joueuse[];
  saisonId: string;
  matchId?: string; // en mode édition
  genererId?: () => string;
}

export type ResultatConversion =
  | { ok: true; match: MatchSaisie; performances: Performance[]; nouvellesJoueuses: Joueuse[]; avertissements: string[] }
  | { ok: false; champs: Record<string, string>; globales: string[]; avertissements: string[] };

/** Convertit et valide le formulaire. Les clés d'erreur de champ : date, type, adversaire, lfObtenus, scoreAdverse, lignes.<i>.<champ>. */
export function versDomaine(f: FormulaireMatch, ctx: ContexteConversion): ResultatConversion {
  const id = ctx.genererId ?? (() => crypto.randomUUID());
  const champs: Record<string, string> = {};

  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || Number.isNaN(Date.parse(f.date))) champs.date = "Date obligatoire";
  if (f.type === "") champs.type = "Type obligatoire";
  if (!f.adversaire.trim()) champs.adversaire = "Adversaire obligatoire";
  const lfObtenus = parseEntier(f.lfObtenus);
  if (lfObtenus === null) champs.lfObtenus = "Nombre entier obligatoire";
  const scoreAdverse = parseEntier(f.scoreAdverse);
  if (scoreAdverse === null) champs.scoreAdverse = "Nombre entier obligatoire";

  const matchId = ctx.matchId ?? id();
  const connues = new Map(ctx.joueuses.map((j) => [cleJoueuse(j.prenom, j.nom), j]));
  const creees = new Map<string, Joueuse>();
  const noms = new Map<string, string>();
  const performances: Performance[] = [];

  f.lignes.forEach((l, i) => {
    if (ligneEstVide(l)) return;
    const k = (c: string) => `lignes.${i}.${c}`;
    let ok = true;
    const refuser = (c: string, m: string) => { champs[k(c)] = m; ok = false; };
    if (!l.prenom.trim()) refuser("prenom", "Prénom obligatoire");
    if (!l.nom.trim()) refuser("nom", "Nom obligatoire");
    const temps = parseTemps(l.temps);
    if (temps === null) refuser("temps", "Format mm:ss");
    const compte = (c: "p3" | "p2" | "lf" | "fautes") => {
      if (l[c].trim() === "") return 0; // case laissée vide = 0
      const n = parseEntier(l[c]);
      if (n === null) refuser(c, "Entier ≥ 0");
      return n ?? 0;
    };
    const p3 = compte("p3"), p2 = compte("p2"), lfReussis = compte("lf"), fautes = compte("fautes");
    if (!ok || temps === null) return;

    const cle = cleJoueuse(l.prenom, l.nom);
    let j = connues.get(cle) ?? creees.get(cle);
    if (!j) {
      j = { id: id(), prenom: l.prenom.trim(), nom: l.nom.trim() };
      creees.set(cle, j);
    }
    noms.set(j.id, `${j.prenom} ${j.nom}`);
    performances.push({ id: id(), matchId, joueuseId: j.id, titulaire: l.titulaire, tempsJeuSec: temps, p3, p2, lfReussis, fautes });
  });

  if (Object.keys(champs).length > 0 || lfObtenus === null || scoreAdverse === null || f.type === "") {
    return { ok: false, champs, globales: [], avertissements: [] };
  }
  const match: MatchSaisie = {
    id: matchId, saisonId: ctx.saisonId, date: f.date, type: f.type, adversaire: f.adversaire.trim(), lieu: f.lieu.trim(), lfObtenus, scoreAdverse,
  };
  const v = validerSaisie(match, performances, noms);
  if (v.erreurs.length > 0) return { ok: false, champs: {}, globales: v.erreurs, avertissements: v.avertissements };
  return { ok: true, match, performances, nouvellesJoueuses: [...creees.values()], avertissements: v.avertissements };
}

/** Préremplit le formulaire d'édition depuis un match enregistré. */
export function depuisMatch(match: Match, perfs: Performance[], joueuses: Joueuse[], nbLignesMin = 10): FormulaireMatch {
  const lignes: LigneForm[] = perfs.map((p) => {
    const j = joueuses.find((x) => x.id === p.joueuseId);
    return {
      prenom: j?.prenom ?? "", nom: j?.nom ?? "", titulaire: p.titulaire, temps: formatTemps(p.tempsJeuSec),
      p3: String(p.p3), p2: String(p.p2), lf: String(p.lfReussis), fautes: String(p.fautes),
    };
  });
  while (lignes.length < nbLignesMin) lignes.push(ligneVide());
  return {
    date: match.date, type: match.type, adversaire: match.adversaire, lieu: match.lieu,
    lfObtenus: match.lfObtenus === null ? "" : String(match.lfObtenus),
    scoreAdverse: match.scoreAdverse === null ? "" : String(match.scoreAdverse),
    lignes,
  };
}
