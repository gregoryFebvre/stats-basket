import { CLUB } from "../club.config";
import type { Saison } from "../domain/models";
import type { Repository } from "./repository";

/** Retourne la saison courante (définie dans club.config.ts), en la créant au besoin. */
export async function assurerSaisonCourante(repo: Repository, genererId: () => string = () => crypto.randomUUID()): Promise<Saison> {
  const existante = (await repo.getSaisons()).find((s) => s.libelle === CLUB.saisonCourante);
  if (existante) return existante;
  const s: Saison = { id: genererId(), libelle: CLUB.saisonCourante };
  await repo.saveSaison(s);
  return s;
}
