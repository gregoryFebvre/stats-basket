import { TYPES_MATCH, type Joueuse, type Match, type Performance, type TypeMatch } from "../domain/models";
import { cleJoueuse, pointsJoueuse } from "../domain/points";
import { parseTemps } from "../domain/temps";
import type { Repository } from "./repository";

/** Lecteur CSV minimal (guillemets, CRLF, BOM). Le séparateur « ; » est détecté sur l'en-tête. */
export function parseCsv(texte: string): string[][] {
  const t = texte.replace(/^\uFEFF/, "");
  const entete = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = entete.includes(";") && !entete.includes(",") ? ";" : ",";
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (guillemets) {
      if (c === '"') { if (t[i + 1] === '"') { champ += '"'; i++; } else guillemets = false; }
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      ligne.push(champ); champ = ""; lignes.push(ligne); ligne = [];
    } else champ += c;
  }
  if (champ !== "" || ligne.length > 0) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter((l) => l.some((x) => x.trim() !== ""));
}

export interface ContexteImport {
  saisonId: string;
  joueusesExistantes: Joueuse[];
  matchsExistants: Match[];
  genererId?: () => string;
}

export interface RapportImport {
  lignesLues: number;
  matchsCrees: number;
  /** Matchs déjà présents (même date + adversaire) : non réimportés. */
  matchsDejaPresents: string[];
  /** Matchs écartés car au moins une de leurs lignes est en erreur. */
  matchsRejetes: string[];
  erreurs: Array<{ ligne: number; message: string }>;
  avertissements: string[];
}

export interface ResultatImport {
  joueusesACreer: Joueuse[];
  matchs: Match[];
  performances: Performance[];
  rapport: RapportImport;
}

const REQUIS = ["date", "type", "contre", "lieu", "prenom", "nom", "time_play", "fautes", "titulaire", "p3", "p2", "lancer_franc"];

const cleMatch = (date: string, adversaire: string) => `${date}|${adversaire.trim().toLowerCase()}`;

function lireDate(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}` : null;
}

/** Analyse pure du CSV historique : ne touche à aucun stockage. */
export function analyserCsvHistorique(texte: string, ctx: ContexteImport): ResultatImport {
  const id = ctx.genererId ?? (() => crypto.randomUUID());
  const lignes = parseCsv(texte);
  if (lignes.length < 2) throw new Error("Fichier CSV vide.");
  const entetes = lignes[0]!.map((h) => h.trim().toLowerCase());
  const manquantes = REQUIS.filter((n) => !entetes.includes(n));
  if (manquantes.length) throw new Error(`Colonnes manquantes : ${manquantes.join(", ")}`);
  const col = (l: string[], n: string) => (l[entetes.indexOf(n)] ?? "").trim();

  const rapport: RapportImport = { lignesLues: lignes.length - 1, matchsCrees: 0, matchsDejaPresents: [], matchsRejetes: [], erreurs: [], avertissements: [] };
  type Groupe = { date: string; type: TypeMatch; adversaire: string; lieu: string; erreur: boolean; lignes: Array<{ prenom: string; nom: string; perf: Omit<Performance, "id" | "matchId" | "joueuseId"> }> };
  const groupes = new Map<string, Groupe>();

  lignes.slice(1).forEach((l, i) => {
    const n = i + 2; // numéro de ligne (en-tête = 1, lignes vides ignorées)
    const err = (message: string) => { rapport.erreurs.push({ ligne: n, message }); return null; };
    const date = lireDate(col(l, "date"));
    const adversaire = col(l, "contre");
    if (!date) return void err(`date invalide « ${col(l, "date")} »`);
    if (!adversaire) return void err("adversaire (colonne contre) vide");
    const g = groupes.get(cleMatch(date, adversaire)) ?? { date, type: "championnat" as TypeMatch, adversaire, lieu: col(l, "lieu"), erreur: false, lignes: [] };
    groupes.set(cleMatch(date, adversaire), g);
    const rejeter = (message: string) => { g.erreur = true; err(message); };

    const type = col(l, "type").toLowerCase();
    if (!(TYPES_MATCH as readonly string[]).includes(type)) return rejeter(`type de match inconnu « ${col(l, "type")} »`);
    g.type = type as TypeMatch;
    const prenom = col(l, "prenom"), nom = col(l, "nom");
    if (!prenom || !nom) return rejeter("prénom ou nom vide");

    let temps = parseTemps(col(l, "time_play"));
    if (temps === null && entetes.includes("minutes")) {
      const dec = Number(col(l, "minutes").replace(",", "."));
      if (col(l, "minutes") !== "" && Number.isFinite(dec) && dec >= 0) temps = Math.round(dec * 60);
    }
    if (temps === null) return rejeter(`temps de jeu illisible « ${col(l, "time_play")} »`);

    const nombres: Record<string, number> = {};
    for (const c of ["p3", "p2", "lancer_franc", "fautes"]) {
      const v = col(l, c);
      if (v !== "" && !/^\d+$/.test(v)) return rejeter(`valeur non entière pour ${c} : « ${v} »`);
      nombres[c] = v === "" ? 0 : Number(v);
    }
    const perf = { titulaire: /^(x|oui|true|1)$/i.test(col(l, "titulaire")), tempsJeuSec: temps, p3: nombres.p3!, p2: nombres.p2!, lfReussis: nombres.lancer_franc!, fautes: nombres.fautes! };

    const calc = pointsJoueuse(perf);
    if (entetes.includes("points") && col(l, "points") !== "" && Number(col(l, "points")) !== calc) {
      rapport.avertissements.push(`Ligne ${n} (${prenom} ${nom}, ${g.adversaire}) : points du fichier ${col(l, "points")}, recalculés ${calc}`);
    }
    if (g.lignes.some((x) => cleJoueuse(x.prenom, x.nom) === cleJoueuse(prenom, nom))) return rejeter(`${prenom} ${nom} apparaît deux fois dans ce match`);
    g.lignes.push({ prenom, nom, perf });
  });

  const existants = new Set(ctx.matchsExistants.map((m) => cleMatch(m.date, m.adversaire)));
  const joueusesParCle = new Map(ctx.joueusesExistantes.map((j) => [cleJoueuse(j.prenom, j.nom), j]));
  const res: ResultatImport = { joueusesACreer: [], matchs: [], performances: [], rapport };

  for (const [cle, g] of [...groupes].sort((a, b) => a[1].date.localeCompare(b[1].date))) {
    const etiquette = `${g.date} ${g.adversaire}`;
    if (existants.has(cle)) { rapport.matchsDejaPresents.push(etiquette); continue; }
    if (g.erreur) { rapport.matchsRejetes.push(etiquette); continue; }
    const match: Match = { id: id(), saisonId: ctx.saisonId, date: g.date, type: g.type, adversaire: g.adversaire, lieu: g.lieu, lfObtenus: null, scoreAdverse: null };
    res.matchs.push(match);
    for (const l of g.lignes) {
      const k = cleJoueuse(l.prenom, l.nom);
      let j = joueusesParCle.get(k);
      if (!j) {
        j = { id: id(), prenom: l.prenom, nom: l.nom };
        joueusesParCle.set(k, j);
        res.joueusesACreer.push(j);
      }
      res.performances.push({ id: id(), matchId: match.id, joueuseId: j.id, ...l.perf });
    }
  }
  rapport.matchsCrees = res.matchs.length;
  return res;
}

/** Analyse puis écrit dans le repository (rien n'est écrit si le fichier n'a pas les bonnes colonnes). */
export async function importerCsvHistorique(repo: Repository, texte: string, saisonId: string): Promise<RapportImport> {
  const r = analyserCsvHistorique(texte, {
    saisonId,
    joueusesExistantes: await repo.getJoueuses(),
    matchsExistants: await repo.getMatchs(),
  });
  for (const j of r.joueusesACreer) await repo.saveJoueuse(j);
  for (const m of r.matchs) await repo.saveMatch(m, r.performances.filter((p) => p.matchId === m.id));
  return r.rapport;
}
