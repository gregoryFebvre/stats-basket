import { useState } from "react";
import { useRepo } from "../../app/RepoContext";
import { assurerSaisonCourante } from "../../data/saison";
import { exporterJson, importerJson } from "../../data/importExport";
import { importerCsvHistorique, type RapportImport } from "../../data/csvHistorique";
import { telecharger } from "../../ui/telecharger";

export function DonneesPage() {
  const repo = useRepo();
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [mode, setMode] = useState<"fusionner" | "remplacer">("fusionner");

  const executer = async (action: () => Promise<string>) => {
    setMessage(null); setErreur(null); setRapport(null);
    try { setMessage(await action()); } catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
  };

  const exporter = () => executer(async () => {
    telecharger(`sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, await exporterJson(repo));
    return "Sauvegarde téléchargée. Conserve ce fichier : il contient tout l'historique.";
  });

  const importJson = (fichier: File | undefined) => fichier && executer(async () => {
    if (mode === "remplacer" && !window.confirm("Remplacer toutes les données actuelles par ce fichier ?")) return "Import annulé.";
    const n = await importerJson(repo, await fichier.text(), mode);
    return `Import terminé : ${n.matchs} match(s), ${n.joueuses} joueuse(s), ${n.performances} ligne(s) de stats.`;
  });

  const importCsv = (fichier: File | undefined) => fichier && executer(async () => {
    const saison = await assurerSaisonCourante(repo);
    const r = await importerCsvHistorique(repo, await fichier.text(), saison.id);
    setRapport(r);
    return `${r.matchsCrees} match(s) importé(s). Les lancers francs obtenus et le score adverse sont à compléter depuis la liste des matchs.`;
  });

  const reinitialiser = () => executer(async () => {
    if (!window.confirm("Effacer TOUTES les données de ce navigateur ? Pense à exporter une sauvegarde avant.")) return "Réinitialisation annulée.";
    await repo.reinitialiser();
    return "Données effacées.";
  });

  return (
    <>
      <h1>Données</h1>
      <p>Les données sont stockées dans ce navigateur uniquement. Vider le navigateur les efface : fais des sauvegardes régulières.</p>

      <section className="carte">
        <h2>Sauvegarde</h2>
        <button type="button" onClick={exporter}>Exporter (JSON)</button>
      </section>

      <section className="carte">
        <h2>Restaurer une sauvegarde</h2>
        <label><input type="radio" checked={mode === "fusionner"} onChange={() => setMode("fusionner")} /> Fusionner avec l'existant</label>
        <label><input type="radio" checked={mode === "remplacer"} onChange={() => setMode("remplacer")} /> Remplacer tout</label>
        <input type="file" accept=".json,application/json" aria-label="Fichier de sauvegarde JSON" onChange={(e) => { void importJson(e.target.files?.[0]); e.target.value = ""; }} />
      </section>

      <section className="carte">
        <h2>Importer l'historique (CSV des anciennes feuilles)</h2>
        <input type="file" accept=".csv,text/csv" aria-label="Fichier CSV" onChange={(e) => { void importCsv(e.target.files?.[0]); e.target.value = ""; }} />
      </section>

      <section className="carte">
        <h2>Réinitialiser</h2>
        <button type="button" className="danger" onClick={reinitialiser}>Effacer toutes les données</button>
      </section>

      {message && <p role="status">{message}</p>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {rapport && (
        <div className="carte" role="status">
          <h3>Rapport d'import</h3>
          <p>{rapport.lignesLues} ligne(s) lues, {rapport.matchsCrees} match(s) créé(s).</p>
          {rapport.matchsDejaPresents.length > 0 && <p>Déjà présents (ignorés) : {rapport.matchsDejaPresents.join(", ")}</p>}
          {rapport.matchsRejetes.length > 0 && <p className="erreur">Rejetés : {rapport.matchsRejetes.join(", ")}</p>}
          {rapport.erreurs.length > 0 && <ul className="erreur">{rapport.erreurs.map((e) => <li key={`${e.ligne}-${e.message}`}>Ligne {e.ligne} : {e.message}</li>)}</ul>}
          {rapport.avertissements.length > 0 && <ul className="avertissement">{rapport.avertissements.map((a) => <li key={a}>{a}</li>)}</ul>}
        </div>
      )}
    </>
  );
}
