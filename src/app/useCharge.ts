import { useCallback, useEffect, useState } from "react";

/** Charge des données asynchrones ; `recharger()` relance la lecture. */
export function useCharge<T>(lire: () => Promise<T>, deps: unknown[]) {
  const [etat, setEtat] = useState<{ data?: T; erreur?: string; chargement: boolean }>({ chargement: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let annule = false;
    lire()
      .then((data) => { if (!annule) setEtat({ data, chargement: false }); })
      .catch((e) => { if (!annule) setEtat({ erreur: e instanceof Error ? e.message : String(e), chargement: false }); });
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  const recharger = useCallback(() => setVersion((v) => v + 1), []);
  return { ...etat, recharger };
}
