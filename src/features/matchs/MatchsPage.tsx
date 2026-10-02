import { Link } from "react-router-dom";
import { useRepo } from "../../app/RepoContext";
import { useCharge } from "../../app/useCharge";
import { bilanSaison } from "../../domain";

const LIBELLES = { gagne: "Gagné", perdu: "Perdu", nul: "Nul" } as const;

export function MatchsPage() {
  const repo = useRepo();
  const { data, erreur, chargement, recharger } = useCharge(async () => ({ matchs: await repo.getMatchs(), perfs: await repo.getToutesPerformances() }), [repo]);

  if (chargement) return <p>Chargement…</p>;
  if (erreur || !data) return <p className="erreur" role="alert">{erreur}</p>;

  const bilan = bilanSaison(data.matchs, data.perfs);
  const parId = new Map(data.matchs.map((m) => [m.id, m]));

  const supprimer = async (id: string, libelle: string) => {
    if (!window.confirm(`Supprimer définitivement le match ${libelle} ?`)) return;
    await repo.deleteMatch(id);
    recharger();
  };

  return (
    <>
      <div className="entete-page">
        <h1>Matchs</h1>
        <Link className="bouton" to="/matchs/nouveau">+ Nouveau match</Link>
      </div>
      {data.matchs.length === 0 ? (
        <p>Aucun match enregistré. Saisis un match ou importe ton historique depuis l'onglet Données.</p>
      ) : (
        <>
          <p className="resume">
            {bilan.victoires} victoire(s), {bilan.defaites} défaite(s){bilan.nuls > 0 && `, ${bilan.nuls} nul(s)`}
            {bilan.nbACompleter > 0 && <> — <span className="badge">{bilan.nbACompleter} à compléter</span></>}
          </p>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Adversaire</th><th>Lieu</th><th>Score</th><th>Résultat</th><th></th></tr></thead>
              <tbody>
                {bilan.matchs.map((b) => {
                  const m = parId.get(b.matchId)!;
                  return (
                    <tr key={m.id}>
                      <td>{m.date}</td><td>{m.type}</td><td>{m.adversaire}</td><td>{m.lieu}</td>
                      <td>{b.score}{b.scoreAdverse !== null && ` – ${b.scoreAdverse}`}</td>
                      <td>{b.resultat ? LIBELLES[b.resultat] : <span className="badge">à compléter</span>}{b.resultat && b.lfObtenus === null && <span className="badge">LF ?</span>}</td>
                      <td className="actions-ligne">
                        <Link to={`/matchs/${m.id}`}>Fiche</Link>&nbsp;
                        <Link to={`/matchs/${m.id}/modifier`}>Modifier</Link>
                        <button type="button" className="lien" onClick={() => supprimer(m.id, `${m.date} ${m.adversaire}`)}>Supprimer</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
