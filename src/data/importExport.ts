import { z } from "zod";
import { JoueuseSchema, MatchSchema, PerformanceSchema, SaisonSchema } from "../domain/models";
import { SCHEMA_VERSION } from "./migrations";
import { StockageError, type Donnees, type Repository } from "./repository";

const FichierSauvegardeSchema = z.object({
  application: z.literal("stats-basket"),
  schema: z.number().int().min(1),
  exporteLe: z.string(),
  saisons: z.array(SaisonSchema),
  joueuses: z.array(JoueuseSchema),
  matchs: z.array(MatchSchema),
  performances: z.array(PerformanceSchema),
});

export async function exporterJson(repo: Repository, maintenant: Date = new Date()): Promise<string> {
  const d = await repo.exporter();
  return JSON.stringify({ application: "stats-basket", schema: SCHEMA_VERSION, exporteLe: maintenant.toISOString(), ...d }, null, 2);
}

/** Valide entièrement le fichier AVANT toute écriture. Lève une StockageError explicite sinon. */
export function lireSauvegarde(texte: string): Donnees {
  let json: unknown;
  try { json = JSON.parse(texte); } catch { throw new StockageError("Le fichier n'est pas un JSON valide."); }
  const r = FichierSauvegardeSchema.safeParse(json);
  if (!r.success) throw new StockageError(`Fichier de sauvegarde invalide : ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}`);
  if (r.data.schema > SCHEMA_VERSION) throw new StockageError("Sauvegarde créée par une version plus récente de l'application.");

  const joueuses = new Set(r.data.joueuses.map((j) => j.id));
  const matchs = new Set(r.data.matchs.map((m) => m.id));
  for (const p of r.data.performances) {
    if (!matchs.has(p.matchId)) throw new StockageError(`Performance ${p.id} : match introuvable (${p.matchId}).`);
    if (!joueuses.has(p.joueuseId)) throw new StockageError(`Performance ${p.id} : joueuse introuvable (${p.joueuseId}).`);
  }
  const { saisons, joueuses: j, matchs: m, performances } = r.data;
  return { saisons, joueuses: j, matchs: m, performances };
}

export async function importerJson(repo: Repository, texte: string, mode: "remplacer" | "fusionner") {
  const d = lireSauvegarde(texte);
  if (mode === "remplacer") await repo.remplacerTout(d);
  else await repo.fusionner(d);
  return { saisons: d.saisons.length, joueuses: d.joueuses.length, matchs: d.matchs.length, performances: d.performances.length };
}
