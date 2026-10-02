import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRepo } from "../../app/RepoContext";
import { assurerSaisonCourante } from "../../data/saison";
import { TYPES_MATCH, type Joueuse } from "../../domain/models";
import { cleJoueuse, normaliser, pointsJoueuse } from "../../domain/points";
import { formatTemps } from "../../domain/temps";
import {
  FormulaireSchema, depuisMatch, estVide, formulaireVide, ligneEstVide, ligneVide, normaliserTemps,
  parseEntier, totauxForm, versDomaine, type FormulaireMatch, type LigneForm,
} from "./formulaire";

const LIBELLES_TYPE: Record<string, string> = { amical: "Amical", brassage: "Brassage", championnat: "Championnat", coupe: "Coupe" };

export function SaisiePage() {
  const { id } = useParams();
  const edition = id !== undefined;
  const repo = useRepo();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState<FormulaireMatch>(formulaireVide());
  const [joueuses, setJoueuses] = useState<Joueuse[]>([]);
  const [saisonId, setSaisonId] = useState("");
  const [chargement, setChargement] = useState(true);
  const [brouillon, setBrouillon] = useState<FormulaireMatch | null>(null);
  const [tente, setTente] = useState(false);
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);

  // Chargement initial : effectif, saison, match à modifier ou brouillon éventuel
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const js = await repo.getJoueuses();
        let saison = "";
        let formEdition: FormulaireMatch | null = null;
        let brouillonTrouve: FormulaireMatch | null = null;
        if (edition) {
          const m = await repo.getMatch(id);
          if (!m) throw new Error("Match introuvable.");
          saison = m.saisonId;
          formEdition = depuisMatch(m, await repo.getPerformances(m.id), js);
        } else {
          saison = (await assurerSaisonCourante(repo)).id;
          const b = FormulaireSchema.safeParse(await repo.getBrouillon());
          if (b.success && !estVide(b.data)) brouillonTrouve = b.data;
        }
        if (annule) return;
        setJoueuses(js);
        setSaisonId(saison);
        if (formEdition) setForm(formEdition);
        setBrouillon(brouillonTrouve);
      } catch (e) {
        if (!annule) setErreurGenerale(e instanceof Error ? e.message : String(e));
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => { annule = true; };
  }, [repo, id, edition]);

  // Sauvegarde automatique du brouillon (nouveau match uniquement)
  useEffect(() => {
    if (edition || chargement || brouillon || estVide(form)) return;
    const t = setTimeout(() => { void repo.saveBrouillon(form); }, 400);
    return () => clearTimeout(t);
  }, [form, edition, chargement, brouillon, repo]);

  const analyse = useMemo(() => versDomaine(form, { joueuses, saisonId: saisonId || "saison", matchId: id }), [form, joueuses, saisonId, id]);
  const totaux = useMemo(() => totauxForm(form), [form]);
  const lfObtenus = parseEntier(form.lfObtenus);
  const scoreAdverse = parseEntier(form.scoreAdverse);
  const erreurChamp = (cle: string) => (tente && !analyse.ok ? analyse.champs[cle] : undefined);
  const globales = analyse.ok ? [] : analyse.globales;
  const lfDepasse = lfObtenus !== null && totaux.lfSaisis > lfObtenus;
  // Le dépassement de LF s'affiche en direct (même si le reste du formulaire est incomplet) ; les autres erreurs globales après un essai d'enregistrement.
  const erreursAffichees = [
    ...(lfDepasse ? [`Lancers francs : ${totaux.lfSaisis} réussis saisis pour seulement ${lfObtenus} obtenus`] : []),
    ...(tente ? globales.filter((g) => !g.startsWith("Lancers francs")) : []),
  ];

  const prenoms = useMemo(() => [...new Set(joueuses.map((j) => j.prenom))], [joueuses]);
  const noms = useMemo(() => [...new Set(joueuses.map((j) => j.nom))], [joueuses]);

  const setChamp = <K extends keyof FormulaireMatch>(k: K, v: FormulaireMatch[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setLigne = (i: number, patch: Partial<LigneForm>) =>
    setForm((f) => ({ ...f, lignes: f.lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  const changerPrenom = (i: number, prenom: string) => {
    const ligne = form.lignes[i]!;
    const patch: Partial<LigneForm> = { prenom };
    // Si un seul prénom correspond dans l'effectif, on complète le nom
    if (ligne.nom.trim() === "") {
      const candidates = joueuses.filter((j) => normaliser(j.prenom) === normaliser(prenom));
      if (candidates.length === 1) patch.nom = candidates[0]!.nom;
    }
    setLigne(i, patch);
  };

  const chargerEffectif = () =>
    setForm((f) => {
      const presentes = new Set(f.lignes.filter((l) => !ligneEstVide(l)).map((l) => cleJoueuse(l.prenom, l.nom)));
      const aAjouter = joueuses.filter((j) => !presentes.has(cleJoueuse(j.prenom, j.nom))).map((j) => ({ ...ligneVide(), prenom: j.prenom, nom: j.nom }));
      const lignes = [...f.lignes.filter((l) => !ligneEstVide(l)), ...aAjouter];
      while (lignes.length < 10) lignes.push(ligneVide());
      return { ...f, lignes };
    });

  // Entrée = champ suivant (saisie rapide au clavier)
  const entreeSuivant = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const champs = Array.from(formRef.current?.querySelectorAll<HTMLElement>("[data-nav]") ?? []);
    champs[champs.indexOf(e.currentTarget) + 1]?.focus();
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTente(true);
    setErreurGenerale(null);
    const r = versDomaine(form, { joueuses, saisonId, matchId: id });
    if (!r.ok) return;
    if (r.avertissements.length > 0 && !window.confirm(`Enregistrer malgré ces avertissements ?\n\n- ${r.avertissements.join("\n- ")}`)) return;
    try {
      for (const j of r.nouvellesJoueuses) await repo.saveJoueuse(j);
      await repo.saveMatch(r.match, r.performances);
      if (!edition) await repo.effacerBrouillon();
      navigate("/matchs");
    } catch (err) {
      setErreurGenerale(err instanceof Error ? err.message : String(err));
    }
  };

  if (chargement) return <p>Chargement…</p>;

  const champ = (cle: string) => (erreurChamp(cle) ? "invalide" : undefined);
  const resultatProvisoire = scoreAdverse === null || totaux.nbJoueuses === 0 ? null : totaux.points - scoreAdverse;

  return (
    <form ref={formRef} onSubmit={enregistrer} noValidate>
      <h1>{edition ? "Modifier le match" : "Nouveau match"}</h1>

      {brouillon && (
        <div className="bandeau">
          Un brouillon non enregistré a été retrouvé.
          <button type="button" onClick={() => { setForm(brouillon); setBrouillon(null); }}>Reprendre</button>
          <button type="button" className="secondaire" onClick={() => { void repo.effacerBrouillon(); setBrouillon(null); }}>Ignorer</button>
        </div>
      )}

      <fieldset className="bloc-match">
        <legend>Match</legend>
        <label>Date
          <input type="date" aria-label="Date" className={champ("date")} value={form.date} onChange={(e) => setChamp("date", e.target.value)} data-nav />
          <small className="erreur">{erreurChamp("date")}</small>
        </label>
        <label>Type
          <select aria-label="Type de match" className={champ("type")} value={form.type} onChange={(e) => setChamp("type", e.target.value as FormulaireMatch["type"])} data-nav>
            <option value="">—</option>
            {TYPES_MATCH.map((t) => <option key={t} value={t}>{LIBELLES_TYPE[t]}</option>)}
          </select>
          <small className="erreur">{erreurChamp("type")}</small>
        </label>
        <label>Adversaire
          <input aria-label="Adversaire" className={champ("adversaire")} value={form.adversaire} onChange={(e) => setChamp("adversaire", e.target.value)} onKeyDown={entreeSuivant} data-nav />
          <small className="erreur">{erreurChamp("adversaire")}</small>
        </label>
        <label>Lieu
          <input aria-label="Lieu" value={form.lieu} onChange={(e) => setChamp("lieu", e.target.value)} onKeyDown={entreeSuivant} data-nav />
        </label>
        <label>Lancers francs obtenus
          <input aria-label="Lancers francs obtenus" inputMode="numeric" className={champ("lfObtenus")} value={form.lfObtenus} onChange={(e) => setChamp("lfObtenus", e.target.value)} onKeyDown={entreeSuivant} data-nav />
          <small className="erreur">{erreurChamp("lfObtenus")}</small>
        </label>
        <label>Score adverse
          <input aria-label="Score adverse" inputMode="numeric" className={champ("scoreAdverse")} value={form.scoreAdverse} onChange={(e) => setChamp("scoreAdverse", e.target.value)} onKeyDown={entreeSuivant} data-nav />
          <small className="erreur">{erreurChamp("scoreAdverse")}</small>
        </label>
      </fieldset>

      <datalist id="dl-prenoms">{prenoms.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="dl-noms">{noms.map((n) => <option key={n} value={n} />)}</datalist>

      <fieldset>
        <legend>Joueuses</legend>
        <div className="actions">
          <button type="button" className="secondaire" onClick={chargerEffectif} disabled={joueuses.length === 0}>Charger l'effectif</button>
        </div>
        <div className="table-scroll">
          <table className="saisie">
            <thead>
              <tr><th>Prénom</th><th>Nom</th><th>Titulaire</th><th>Temps (mm:ss)</th><th>3 pts</th><th>2 pts</th><th>LF</th><th>Fautes</th><th>Points</th><th></th></tr>
            </thead>
            <tbody>
              {form.lignes.map((l, i) => {
                const n = i + 1;
                const vide = ligneEstVide(l);
                const nouvelle = !vide && l.prenom.trim() !== "" && l.nom.trim() !== "" && joueuses.length > 0 && !joueuses.some((j) => cleJoueuse(j.prenom, j.nom) === cleJoueuse(l.prenom, l.nom));
                const num = (c: "p3" | "p2" | "lf" | "fautes", libelle: string) => (
                  <td>
                    <input aria-label={`${libelle} ligne ${n}`} inputMode="numeric" className={champ(`lignes.${i}.${c}`)} value={l[c]} onChange={(e) => setLigne(i, { [c]: e.target.value })} onKeyDown={entreeSuivant} data-nav />
                  </td>
                );
                return (
                  <tr key={i} className={vide ? "ligne-vide" : undefined}>
                    <td>
                      <input aria-label={`Prénom ligne ${n}`} list="dl-prenoms" className={champ(`lignes.${i}.prenom`)} value={l.prenom} onChange={(e) => changerPrenom(i, e.target.value)} onKeyDown={entreeSuivant} data-nav />
                      {nouvelle && <span className="badge">nouvelle</span>}
                    </td>
                    <td><input aria-label={`Nom ligne ${n}`} list="dl-noms" className={champ(`lignes.${i}.nom`)} value={l.nom} onChange={(e) => setLigne(i, { nom: e.target.value })} onKeyDown={entreeSuivant} data-nav /></td>
                    <td className="centre"><input type="checkbox" aria-label={`Titulaire ligne ${n}`} checked={l.titulaire} onChange={(e) => setLigne(i, { titulaire: e.target.checked })} data-nav /></td>
                    <td>
                      <input aria-label={`Temps ligne ${n}`} placeholder="mm:ss" className={champ(`lignes.${i}.temps`)} value={l.temps} onChange={(e) => setLigne(i, { temps: e.target.value })} onBlur={(e) => setLigne(i, { temps: normaliserTemps(e.target.value) })} onKeyDown={entreeSuivant} data-nav />
                    </td>
                    {num("p3", "3 pts")}{num("p2", "2 pts")}{num("lf", "LF")}{num("fautes", "Fautes")}
                    <td className="points"><output aria-label={`Points ligne ${n}`}>{vide ? "" : pointsJoueuse({ p3: l.p3, p2: l.p2, lfReussis: l.lf })}</output></td>
                    <td><button type="button" className="icone" aria-label={`Vider la ligne ${n}`} onClick={() => setLigne(i, ligneVide())}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" className="secondaire" onClick={() => setForm((f) => ({ ...f, lignes: [...f.lignes, ligneVide()] }))}>+ Ajouter une ligne</button>
      </fieldset>

      <section className="totaux" aria-label="Totaux">
        <div><strong>{totaux.points}</strong> points équipe{scoreAdverse !== null && <> — adverse {scoreAdverse}{resultatProvisoire !== null && <> ({resultatProvisoire > 0 ? "gagné" : resultatProvisoire < 0 ? "perdu" : "nul"}, {resultatProvisoire > 0 ? "+" : ""}{resultatProvisoire})</>}</>}</div>
        <div className={lfDepasse ? "erreur" : undefined}>LF saisis : <strong>{totaux.lfSaisis}</strong>{lfObtenus !== null && <> / {lfObtenus} obtenus</>}</div>
        <div>Temps cumulé : <strong>{formatTemps(totaux.tempsSec)}</strong> / {formatTemps(totaux.tempsAttenduSec)} attendu</div>
        <div>Titulaires : <strong>{totaux.titulaires}</strong> / 5</div>
      </section>

      {erreursAffichees.length > 0 && <ul className="erreur" role="alert">{erreursAffichees.map((g) => <li key={g}>{g}</li>)}</ul>}
      {analyse.avertissements.length > 0 && <ul className="avertissement">{analyse.avertissements.map((a) => <li key={a}>{a}</li>)}</ul>}
      {tente && !analyse.ok && Object.keys(analyse.champs).length > 0 && <p className="erreur" role="alert">Certains champs sont à corriger.</p>}
      {erreurGenerale && <p className="erreur" role="alert">{erreurGenerale}</p>}

      <div className="actions">
        <button type="submit">{edition ? "Enregistrer les modifications" : "Enregistrer le match"}</button>
        <button type="button" className="secondaire" onClick={() => navigate("/matchs")}>Annuler</button>
      </div>
    </form>
  );
}
