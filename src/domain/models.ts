import { z } from "zod";

export const TYPES_MATCH = ["amical", "brassage", "championnat", "coupe"] as const;
export type TypeMatch = (typeof TYPES_MATCH)[number];

const entierPositif = z.number().int().min(0);

export const SaisonSchema = z.object({
  id: z.string().min(1),
  libelle: z.string().min(1), // ex. "2026-2027"
});

export const JoueuseSchema = z.object({
  id: z.string().min(1),
  prenom: z.string().trim().min(1),
  nom: z.string().trim().min(1),
});

/**
 * Match tel que STOCKÉ.
 * lfObtenus et scoreAdverse sont nullables uniquement pour les matchs importés
 * depuis les anciennes feuilles (« à compléter »). Le formulaire les impose (MatchSaisieSchema).
 */
export const MatchSchema = z.object({
  id: z.string().min(1),
  saisonId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ"),
  type: z.enum(TYPES_MATCH),
  adversaire: z.string().trim().min(1),
  lieu: z.string().trim(), // texte libre
  lfObtenus: entierPositif.nullable(),
  scoreAdverse: entierPositif.nullable(),
});

/** Match tel que SAISI : lfObtenus et scoreAdverse obligatoires. */
export const MatchSaisieSchema = MatchSchema.extend({
  lfObtenus: entierPositif,
  scoreAdverse: entierPositif,
});

export const PerformanceSchema = z.object({
  id: z.string().min(1),
  matchId: z.string().min(1),
  joueuseId: z.string().min(1),
  titulaire: z.boolean(),
  tempsJeuSec: entierPositif, // secondes ; saisie/affichage en mm:ss
  p3: entierPositif,
  p2: entierPositif,
  lfReussis: entierPositif,
  fautes: entierPositif,
});

export type Saison = z.infer<typeof SaisonSchema>;
export type Joueuse = z.infer<typeof JoueuseSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type MatchSaisie = z.infer<typeof MatchSaisieSchema>;
export type Performance = z.infer<typeof PerformanceSchema>;
