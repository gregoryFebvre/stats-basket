import { useSearchParams } from "react-router-dom";
import { TYPES_MATCH, type TypeMatch } from "../domain/models";

const LIBELLES: Record<TypeMatch, string> = { amical: "Amical", brassage: "Brassage", championnat: "Championnat", coupe: "Coupe" };
const estType = (s: string): s is TypeMatch => (TYPES_MATCH as readonly string[]).includes(s);

/** Filtre par type de match, conservé dans l'adresse (?types=championnat,coupe). Aucun filtre = tous les types. */
export function useFiltreTypes() {
  const [params, setParams] = useSearchParams();
  const choisis = (params.get("types") ?? "").split(",").filter(estType);
  const actifs: TypeMatch[] = choisis.length > 0 ? choisis : [...TYPES_MATCH];
  const basculer = (t: TypeMatch) => {
    const suivants = actifs.includes(t) ? actifs.filter((x) => x !== t) : [...actifs, t];
    if (suivants.length === 0) return; // au moins un type reste sélectionné
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (suivants.length === TYPES_MATCH.length) n.delete("types");
      else n.set("types", TYPES_MATCH.filter((x) => suivants.includes(x)).join(","));
      return n;
    }, { replace: true });
  };
  return { actifs, tous: actifs.length === TYPES_MATCH.length, basculer };
}

export function FiltreTypes() {
  const { actifs, basculer } = useFiltreTypes();
  return (
    <div className="filtre no-print" role="group" aria-label="Types de match">
      <span>Types de match :</span>
      {TYPES_MATCH.map((t) => (
        <label key={t} className="coche">
          <input type="checkbox" checked={actifs.includes(t)} onChange={() => basculer(t)} /> {LIBELLES[t]}
        </label>
      ))}
    </div>
  );
}
