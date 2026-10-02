import { FiltreTypes, useFiltreTypes } from "../../app/filtre";
import { bilanJoueuses, bilanSaison, filtrerParType } from "../../domain";
import { BarreH, CourbePct } from "../../ui/charts";
import { ImprimerBouton } from "../../ui/ImprimerBouton";
import { AvecDonnees, Carte } from "./commun";
import { etiquettesJoueuses, fmtDate, fmtNombre, fmtPct } from "./libelles";

export function LancersFrancsPage() {
  const { actifs } = useFiltreTypes();
  return (
    <>
      <div className="entete-page"><h1>Lancers francs</h1><ImprimerBouton /></div>
      <FiltreTypes />
      <AvecDonnees>
        {(data) => {
          const { matchs, perfs } = filtrerParType(data.matchs, data.perfs, actifs);
          const saison = bilanSaison(matchs, perfs);
          const bilans = bilanJoueuses(data.joueuses, perfs).filter((b) => b.lfReussis > 0 || b.pointsTotal > 0);
          const noms = etiquettesJoueuses(data.joueuses);
          const avecLf = [...saison.matchs].reverse().filter((b) => b.pctLf !== null); // du plus ancien au plus récent
          const dep = [...bilans].sort((a, b) => (b.dependanceLf ?? 0) - (a.dependanceLf ?? 0));

          return (
            <>
              <div className="kpis">
                <Carte valeur={saison.lfReussis} libelle="LF réussis" />
                <Carte valeur={saison.lfObtenus} libelle="LF obtenus" />
                <Carte valeur={fmtPct(saison.pctLf)} libelle="Réussite" />
                <Carte valeur={saison.lfObtenus - saison.lfReussis} libelle="LF manqués" />
              </div>
              {saison.nbACompleter > 0 && <p className="avertissement">Les matchs dont les LF obtenus sont inconnus sont exclus de ces totaux.</p>}

              <section className="carte">
                <h2>Match par match</h2>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Date</th><th>Adversaire</th><th>Obtenus</th><th>Réussis</th><th>Réussite</th><th>Manqués</th></tr></thead>
                    <tbody>
                      {saison.matchs.map((b) => {
                        const m = matchs.find((x) => x.id === b.matchId)!;
                        return (
                          <tr key={m.id}>
                            <td>{fmtDate(m.date)}</td><td className="gauche">{m.adversaire}</td><td>{b.lfObtenus ?? "—"}</td>
                            <td>{b.lfReussis}</td><td>{fmtPct(b.pctLf, 2)}</td><td>{b.lfManques ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <CourbePct titre="% de lancers francs réussis par match" donnees={avecLf.map((b) => ({ nom: matchs.find((m) => m.id === b.matchId)!.adversaire, valeur: b.pctLf ?? 0 }))} />

              <section className="carte saut-page">
                <h2>Dépendance aux lancers francs</h2>
                <p className="note">Part des points d'une joueuse qui vient des lancers francs. Le pourcentage de réussite par joueuse n'existe pas : les LF obtenus sont comptés par équipe.</p>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Joueuse</th><th>Points LF</th><th>Points total</th><th>Dépendance</th></tr></thead>
                    <tbody>
                      {dep.map((b) => (
                        <tr key={b.joueuseId}><td className="gauche">{noms.get(b.joueuseId)}</td><td>{b.lfReussis}</td><td>{b.pointsTotal}</td><td>{fmtPct(b.dependanceLf)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <BarreH titre="Dépendance des points aux lancers francs (%)" donnees={dep.map((b) => ({ nom: noms.get(b.joueuseId) ?? "", valeur: b.dependanceLf ?? 0 }))} format={(v) => fmtNombre(v, 1)} />
            </>
          );
        }}
      </AvecDonnees>
    </>
  );
}
