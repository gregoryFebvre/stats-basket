import { StockageError } from "./repository";
import type { KeyValueStore } from "./kvStore";

export const SCHEMA_VERSION = 1;

/** MIGRATIONS[n] transforme le stockage de la version n vers n+1. Vide tant qu'on est en v1. */
const MIGRATIONS: Record<number, (store: KeyValueStore, prefix: string) => void> = {};

/** À appeler au démarrage. Retourne la version après migration. */
export function migrer(store: KeyValueStore, prefix: string): number {
  const cle = `${prefix}:schema`;
  const brut = store.getItem(cle);
  let version = brut === null ? SCHEMA_VERSION : Number.parseInt(brut, 10);
  if (!Number.isInteger(version) || version < 1) throw new StockageError(`Version de schéma invalide : ${brut}`);
  if (version > SCHEMA_VERSION) {
    throw new StockageError(`Ces données ont été créées par une version plus récente de l'application (schéma ${version}).`);
  }
  while (version < SCHEMA_VERSION) {
    const etape = MIGRATIONS[version];
    if (!etape) throw new StockageError(`Aucune migration disponible de la version ${version}.`);
    etape(store, prefix);
    version += 1;
    store.setItem(cle, String(version));
  }
  if (brut === null) store.setItem(cle, String(version));
  return version;
}
