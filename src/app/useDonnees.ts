import { useRepo } from "./RepoContext";
import { useCharge } from "./useCharge";

/** Toutes les données utiles aux écrans de rapport. */
export function useDonnees() {
  const repo = useRepo();
  return useCharge(async () => {
    const [joueuses, matchs, perfs] = await Promise.all([repo.getJoueuses(), repo.getMatchs(), repo.getToutesPerformances()]);
    return { joueuses, matchs, perfs };
  }, [repo]);
}
