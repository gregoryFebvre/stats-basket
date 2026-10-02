import { Link, useParams } from "react-router-dom";
import { FiltreTypes, useFiltreTypes } from "../../app/filtre";
import { bilanJoueuses, filtrerParType, formatTemps, historiqueJoueuse } from "../../domain";
import { BarresV } from "../../ui/charts";
import { AvecDonnees, Carte } from "./commun";
import { fmtDate, fmtNombre, fmtPct } from "./libelles";

export function JoueusesPage() {
  const { actifs } = useFiltreTypes();
  return (
    <>
      <h1>Joueuses</h1>
      <FiltreTypes />
      <AvecDonnees>
        {(data) => {
          const { perfs } = filtrerParType(data.matchs, data.perfs, actifs);
          const bilans = bilanJoueuses(data.joueuses, perfs);
          const sansMatch = data.joueuses.filter((j) => !bilans.some((b) => b.joueuseId === j.id));
          return (
            <section className="carte">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Joueuse</th><th>Matchs</th><th>Points</th><th>Moy.</th><th>Temps</th><th>Fautes</th></tr></thead>
                  <tbody>
                    {bilans.map((b) => (
                      <tr key={b.joueuseId}>
                        <td className="gauche"><Link to={`/joueuses/${b.joueuseId}`}>{b.prenom} {b.nom}</Link></td>
                        <td>{b.nbMatchs}</td><td>{b.pointsTotal}</td><td>{fmtNombre(b.pointsMoyenne)}</td><td>{formatTemps(b.tempsJeuSec)}</td><td>{b.fautes}</td>
                      </tr>
                    ))}
                    {sansMatch.map((j) => <tr key={j.id}><td className="gauche">{j.prenom} {j.nom}</td><td colSpan={5}>aucun match pour ces types</td></tr>)}
                  </tbody>
                </table>
              </div>
            </section>
          );
        }}
      </AvecDonnees>
    </>
  );
}

export function JoueuseFichePage() {
  const { id } = useParams();
  const { actifs } = useFiltreTypes();
  return (
    <AvecDonnees>
      {(data) => {
        const joueuse = data.joueuses.find((j) => j.id === id);
        if (!joueuse) return <p className="erreur" role="alert">Joueuse introuvable. <Link to="/joueuses">Retour</Link></p>;
        const { matchs, perfs } = filtrerParType(data.matchs, data.perfs, actifs);
        const b = bilanJoueuses([joueuse], perfs)[0];
        const histo = historiqueJoueuse(joueuse.id, matchs, perfs);
        return (
          <>
            <h1>{joueuse.prenom} {joueuse.nom}</h1>
            <FiltreTypes />
            {!b ? <p>Aucun match pour les types sélectionnés.</p> : (
              <>
                <div className="kpis">
                  <Carte valeur={b.nbMatchs} libelle="Matchs" />
                  <Carte valeur={b.pointsTotal} libelle="Points" />
                  <Carte valeur={fmtNombre(b.pointsMoyenne)} libelle="Moyenne / match" />
                  <Carte valeur={fmtNombre(b.pointsParMinute)} libelle="Points / minute" />
                  <Carte valeur={fmtPct(b.dependanceLf)} libelle="Part des LF dans ses points" />
                </div>
                <BarresV titre="Points par match" donnees={histo.map((h) => ({ nom: h.adversaire, valeur: h.points }))} />
                <section className="carte">
                  <div className="table-scroll">
                    <table>
                      <thead><tr><th>Date</th><th>Adversaire</th><th>Titulaire</th><th>Temps</th><th>Points</th><th>Fautes</th></tr></thead>
                      <tbody>
                        {histo.map((h) => (
                          <tr key={h.matchId}><td>{fmtDate(h.date)}</td><td className="gauche"><Link to={`/matchs/${h.matchId}`}>{h.adversaire}</Link></td><td>{h.titulaire ? "x" : ""}</td><td>{formatTemps(h.tempsJeuSec)}</td><td>{h.points}</td><td>{h.fautes}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        );
      }}
    </AvecDonnees>
  );
}
