import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useDonnees } from "../../app/useDonnees";

export type Donnees = NonNullable<ReturnType<typeof useDonnees>["data"]>;

/** Gère chargement, erreur et absence de données pour les écrans de rapport. */
export function AvecDonnees({ children }: { children: (d: Donnees) => ReactNode }) {
  const { data, erreur, chargement } = useDonnees();
  if (chargement) return <p>Chargement…</p>;
  if (erreur || !data) return <p className="erreur" role="alert">{erreur ?? "Données indisponibles."}</p>;
  if (data.matchs.length === 0) {
    return <p>Aucun match enregistré. <Link to="/matchs/nouveau">Saisis un match</Link> ou <Link to="/donnees">importe ton historique</Link>.</p>;
  }
  return <>{children(data)}</>;
}

export function Carte({ valeur, libelle }: { valeur: ReactNode; libelle: string }) {
  return <div className="kpi"><span className="kpi-valeur">{valeur}</span><span className="kpi-libelle">{libelle}</span></div>;
}
