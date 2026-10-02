import { Link, useParams } from "react-router-dom";
import { bilanMatch, formatTemps, pointsPerformance, repartitionPoints, titulairesVsBanc } from "../../domain";
import { BarreH, BarreHDouble, COULEURS, Donut } from "../../ui/charts";
import { ImprimerBouton } from "../../ui/ImprimerBouton";
import { AvecDonnees, Carte } from "./commun";
import { etiquettesJoueuses, fmtDate, fmtPct } from "./libelles";

export function MatchFichePage() {
  const { id } = useParams();
  return (
    <AvecDonnees>
      {(data) => {
        const match = data.matchs.find((m) => m.id === id);
        if (!match) return <p className="erreur" role="alert">Match introuvable. <Link to="/matchs">Retour à la liste</Link></p>;
        const perfs = data.perfs.filter((p) => p.matchId === match.id);
        const bilan = bilanMatch(match, data.perfs);
        const noms = etiquettesJoueuses(data.joueuses);
        const nom = (jid: string) => noms.get(jid) ?? jid;
        const lignes = [...perfs].sort((a, b) => pointsPerformance(b) - pointsPerformance(a));
        const tb = titulairesVsBanc(perfs);
        const rep = repartitionPoints(perfs);
        const tri = (cle: (p: (typeof perfs)[number]) => number) => [...perfs].sort((a, b) => cle(b) - cle(a)).map((p) => ({ nom: nom(p.joueuseId), valeur: cle(p) }));
        const libelleResultat = bilan.resultat === "gagne" ? "Gagné" : bilan.resultat === "perdu" ? "Perdu" : bilan.resultat === "nul" ? "Nul" : null;

        return (
          <>
            <div className="entete-page">
              <h1>Match du {fmtDate(match.date)} contre {match.adversaire}</h1>
              <div className="actions no-print"><Link className="bouton secondaire" to={`/matchs/${match.id}/modifier`}>Modifier</Link><ImprimerBouton /></div>
            </div>
            <p>{match.type}{match.lieu && ` — ${match.lieu}`}</p>
            <div className="kpis">
              <Carte valeur={bilan.scoreAdverse === null ? bilan.score : `${bilan.score} – ${bilan.scoreAdverse}`} libelle={libelleResultat ?? "Score"} />
              <Carte valeur={bilan.lfObtenus === null ? `${bilan.lfReussis} LF` : `${bilan.lfReussis} / ${bilan.lfObtenus}`} libelle={`Lancers francs${bilan.pctLf !== null ? ` (${fmtPct(bilan.pctLf)})` : ""}`} />
              <Carte valeur={rep.nb3} libelle="Paniers à 3 points" />
            </div>
            {bilan.aCompleter && <p className="avertissement">Score adverse ou LF obtenus manquants. <Link to={`/matchs/${match.id}/modifier`}>Compléter</Link></p>}

            <section className="carte">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Joueuse</th><th>Titulaire</th><th>Temps</th><th>3 pts</th><th>2 pts</th><th>LF</th><th>Fautes</th><th>Points</th></tr></thead>
                  <tbody>
                    {lignes.map((p) => (
                      <tr key={p.id}>
                        <td className="gauche">{nom(p.joueuseId)}</td><td>{p.titulaire ? "x" : ""}</td><td>{formatTemps(p.tempsJeuSec)}</td>
                        <td>{p.p3}</td><td>{p.p2}</td><td>{p.lfReussis}</td><td>{p.fautes}</td><td><strong>{pointsPerformance(p)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grille-graph">
              <Donut titre="Répartition des points" centre={`${tb.titulaires + tb.banc} pts`} parts={[
                { nom: "Titulaires", valeur: tb.titulaires, couleur: COULEURS.titulaires },
                { nom: "Banc", valeur: tb.banc, couleur: COULEURS.banc },
              ]} />
              <BarreH titre="Points marqués" donnees={tri(pointsPerformance)} />
              <BarreH titre="Points LF marqués" donnees={tri((p) => p.lfReussis)} />
              <BarreHDouble titre="3 points" libelleA="Nb 3 points" libelleB="Valeur 3 points" donnees={perfs.filter((p) => p.p3 > 0).map((p) => ({ nom: nom(p.joueuseId), a: p.p3, b: p.p3 * 3 }))} />
              <BarreHDouble titre="2 points" libelleA="Nb 2 points" libelleB="Valeur 2 points" donnees={[...perfs].sort((a, b) => b.p2 - a.p2).filter((p) => p.p2 > 0).map((p) => ({ nom: nom(p.joueuseId), a: p.p2, b: p.p2 * 2 }))} />
              <BarreH titre="Temps de jeu (minutes)" donnees={tri((p) => p.tempsJeuSec).map((d) => ({ ...d, valeur: Math.round(d.valeur / 6) / 10 }))} />
              <BarreH titre="Nombre de fautes" donnees={tri((p) => p.fautes)} />
            </div>
          </>
        );
      }}
    </AvecDonnees>
  );
}
