import { FiltreTypes, useFiltreTypes } from "../../app/filtre";
import { CLUB } from "../../club.config";
import { bilanJoueuses, bilanSaison, filtrerParType, formatTemps, repartitionParMatch, titulairesVsBanc } from "../../domain";
import { BarreH, BarreHDouble, BarresEmpilees, COULEURS, Donut } from "../../ui/charts";
import { ImprimerBouton } from "../../ui/ImprimerBouton";
import { AvecDonnees, Carte } from "./commun";
import { etiquettesJoueuses, fmtDate, fmtNombre, fmtPct } from "./libelles";

export function SaisonPage() {
  const { actifs } = useFiltreTypes();
  return (
    <>
      <div className="entete-page">
        <h1>{CLUB.nom} {CLUB.equipe} — saison {CLUB.saisonCourante}</h1>
        <ImprimerBouton />
      </div>
      <FiltreTypes />
      <AvecDonnees>
        {(data) => {
          const { matchs, perfs } = filtrerParType(data.matchs, data.perfs, actifs);
          if (matchs.length === 0) return <p>Aucun match pour les types sélectionnés.</p>;
          const bilans = bilanJoueuses(data.joueuses, perfs);
          const saison = bilanSaison(matchs, perfs);
          const noms = etiquettesJoueuses(data.joueuses);
          const nom = (id: string) => noms.get(id) ?? id;
          const topN = <T,>(l: T[], n = 10) => l.slice(0, n);
          const parSomme = (cle: (b: (typeof bilans)[number]) => number) => [...bilans].sort((a, b) => cle(b) - cle(a));
          const tb = titulairesVsBanc(perfs);

          return (
            <>
              <div className="kpis">
                <Carte valeur={matchs.length} libelle="Matchs" />
                <Carte valeur={`${saison.victoires} V – ${saison.defaites} D`} libelle="Bilan" />
                <Carte valeur={saison.pointsMarques} libelle="Points marqués" />
                <Carte valeur={fmtNombre(saison.pointsMarques / matchs.length, 1)} libelle="Points / match" />
                <Carte valeur={fmtPct(saison.pctLf)} libelle="Lancers francs réussis" />
              </div>
              {saison.nbACompleter > 0 && <p className="avertissement">{saison.nbACompleter} match(s) sans score adverse ou LF obtenus : bilan V/D et % de LF incomplets.</p>}

              <section className="carte">
                <h2>Statistiques générales</h2>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Joueuse</th><th>Matchs</th><th>Titul.</th><th>Points</th><th>Moy.</th><th>Max</th><th>Min</th><th>Temps</th><th>Fautes</th><th>Pts/min</th></tr></thead>
                    <tbody>
                      {bilans.map((b) => (
                        <tr key={b.joueuseId}>
                          <td className="gauche">{nom(b.joueuseId)}</td><td>{b.nbMatchs}</td><td>{b.nbTitularisations}</td><td>{b.pointsTotal}</td>
                          <td>{fmtNombre(b.pointsMoyenne)}</td><td>{b.pointsMaxi}</td><td>{b.pointsMini}</td><td>{formatTemps(b.tempsJeuSec)}</td>
                          <td>{b.fautes}</td><td>{fmtNombre(b.pointsParMinute)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="grille-graph">
                <BarreH titre="Temps de jeu (minutes)" donnees={parSomme((b) => b.tempsJeuSec).map((b) => ({ nom: nom(b.joueuseId), valeur: Math.round(b.tempsJeuSec / 6) / 10 }))} />
                <BarreH titre="Total des points" donnees={parSomme((b) => b.pointsTotal).map((b) => ({ nom: nom(b.joueuseId), valeur: b.pointsTotal }))} />
                <BarreH titre="Nombre de fautes" donnees={parSomme((b) => b.fautes).map((b) => ({ nom: nom(b.joueuseId), valeur: b.fautes }))} />
                <BarreH titre="Points par minute" donnees={parSomme((b) => b.pointsParMinute ?? 0).map((b) => ({ nom: nom(b.joueuseId), valeur: b.pointsParMinute ?? 0 }))} format={(v) => fmtNombre(v)} />
              </div>

              <h2 className="saut-page">Statistiques par type de point</h2>
              <div className="grille-graph">
                <BarreHDouble titre="3 points" libelleA="Nb 3 points" libelleB="Valeur 3 points" donnees={topN(parSomme((b) => b.pts3)).map((b) => ({ nom: nom(b.joueuseId), a: b.nb3, b: b.pts3 }))} />
                <BarreHDouble titre="2 points" libelleA="Nb 2 points" libelleB="Valeur 2 points" donnees={topN(parSomme((b) => b.pts2)).map((b) => ({ nom: nom(b.joueuseId), a: b.nb2, b: b.pts2 }))} />
                <BarreH titre="Points sur lancers francs" donnees={parSomme((b) => b.lfReussis).map((b) => ({ nom: nom(b.joueuseId), valeur: b.lfReussis }))} />
              </div>

              <h2 className="saut-page">Récapitulatif de la saison</h2>
              <section className="carte">
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Adversaire</th><th>Score</th><th>Résultat</th><th>Écart</th></tr></thead>
                    <tbody>
                      {saison.matchs.map((b) => {
                        const m = matchs.find((x) => x.id === b.matchId)!;
                        return (
                          <tr key={m.id}>
                            <td>{fmtDate(m.date)}</td><td>{m.type}</td><td className="gauche">{m.adversaire}</td>
                            <td>{b.score}{b.scoreAdverse !== null && ` – ${b.scoreAdverse}`}</td>
                            <td>{b.resultat === "gagne" ? "Gagné" : b.resultat === "perdu" ? "Perdu" : b.resultat === "nul" ? "Nul" : "—"}</td>
                            <td>{b.diff === null ? "—" : `${b.diff > 0 ? "+" : ""}${b.diff}`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="grille-graph">
                <Donut titre="Victoires / défaites" parts={[
                  { nom: "Gagné", valeur: saison.victoires, couleur: COULEURS.gagne },
                  { nom: "Perdu", valeur: saison.defaites, couleur: COULEURS.perdu },
                  { nom: "Nul", valeur: saison.nuls, couleur: COULEURS.nul },
                ]} />
                <Donut titre="Titulaires / banc" centre={`${tb.titulaires + tb.banc} pts`} parts={[
                  { nom: "Titulaires", valeur: tb.titulaires, couleur: COULEURS.titulaires },
                  { nom: "Banc", valeur: tb.banc, couleur: COULEURS.banc },
                ]} />
              </div>
              <BarresEmpilees titre="Type de points par rencontre" donnees={repartitionParMatch(matchs, perfs).map((r) => ({ nom: `${r.adversaire} (${fmtDate(r.date).slice(0, 5)})`, pts3: r.pts3, pts2: r.pts2, lf: r.lf, total: r.total }))} />
            </>
          );
        }}
      </AvecDonnees>
    </>
  );
}
