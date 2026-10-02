import { useState } from "react";
import { comparerMatchs, pairesAllerRetour } from "../../domain";
import { BarresV } from "../../ui/charts";
import { ImprimerBouton } from "../../ui/ImprimerBouton";
import { AvecDonnees, Carte, type Donnees } from "./commun";
import { etiquettesJoueuses, fmtDate } from "./libelles";

export function ComparerPage() {
  return (
    <>
      <div className="entete-page"><h1>Comparer deux matchs</h1><ImprimerBouton /></div>
      <AvecDonnees>{(data) => <Comparateur data={data} />}</AvecDonnees>
    </>
  );
}

function Comparateur({ data }: { data: Donnees }) {
  const tries = [...data.matchs].sort((a, b) => a.date.localeCompare(b.date));
  const paires = pairesAllerRetour(tries);
  const derniere = paires.at(-1);
  const [idA, setIdA] = useState(derniere?.[0].id ?? tries[0]?.id ?? "");
  const [idB, setIdB] = useState(derniere?.[1].id ?? tries[1]?.id ?? "");
  const a = tries.find((m) => m.id === idA);
  const b = tries.find((m) => m.id === idB);
  const noms = etiquettesJoueuses(data.joueuses);
  const libelle = (m: (typeof tries)[number]) => `${fmtDate(m.date)} — ${m.adversaire}`;

  if (tries.length < 2) return <p>Il faut au moins deux matchs enregistrés pour faire une comparaison.</p>;
  const c = a && b && a.id !== b.id ? comparerMatchs(a, b, data.joueuses, data.perfs) : null;

  return (
    <>
      <div className="bloc-match carte no-print">
        <label>Match 1 (référence)
          <select aria-label="Match 1" value={idA} onChange={(e) => setIdA(e.target.value)}>{tries.map((m) => <option key={m.id} value={m.id}>{libelle(m)}</option>)}</select>
        </label>
        <label>Match 2
          <select aria-label="Match 2" value={idB} onChange={(e) => setIdB(e.target.value)}>{tries.map((m) => <option key={m.id} value={m.id}>{libelle(m)}</option>)}</select>
        </label>
      </div>
      {paires.length > 0 && <p className="note no-print">Confrontations aller/retour détectées : {paires.map(([x, y]) => x.adversaire).filter((v, i, t) => t.indexOf(v) === i).join(", ")}.</p>}
      {!c || !a || !b ? <p>Choisis deux matchs différents.</p> : (
        <>
          <div className="kpis">
            <Carte valeur={`${c.score1} pts`} libelle={`Match 1 — ${libelle(a)}`} />
            <Carte valeur="➔" libelle="" />
            <Carte valeur={`${c.score2} pts`} libelle={`Match 2 — ${libelle(b)}`} />
            <Carte valeur={<span className={c.diff >= 0 ? "positif" : "negatif"}>{c.diff > 0 ? "+" : ""}{c.diff}</span>} libelle="Évolution" />
          </div>
          <section className="carte">
            <h2>Détail des points par joueuse</h2>
            {c.joueuses.length === 0 ? <p>Aucune joueuse n'a joué les deux matchs.</p> : (
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Joueuse</th><th>Match 1</th><th>Match 2</th><th>Évolution</th></tr></thead>
                  <tbody>
                    {c.joueuses.map((j) => (
                      <tr key={j.joueuseId}>
                        <td className="gauche">{noms.get(j.joueuseId)}</td><td>{j.aller}</td><td>{j.retour}</td>
                        <td className={j.evolution >= 0 ? "positif" : "negatif"}>{j.evolution > 0 ? "+" : ""}{j.evolution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <BarresV titre="Évolution des points par joueuse" donnees={c.joueuses.map((j) => ({ nom: noms.get(j.joueuseId) ?? "", valeur: j.evolution }))} />
        </>
      )}
    </>
  );
}
