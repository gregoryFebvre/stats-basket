import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CLUB } from "../club.config";

const LIENS = [
  { to: "/saison", libelle: "Saison" },
  { to: "/matchs", libelle: "Matchs", end: true },
  { to: "/joueuses", libelle: "Joueuses" },
  { to: "/lancers-francs", libelle: "Lancers francs" },
  { to: "/comparer", libelle: "Comparer" },
  { to: "/matchs/nouveau", libelle: "Saisie" },
  { to: "/donnees", libelle: "Données" },
];

/** Bandeau de navigation : liens en ligne sur grand écran, menu déroulant (burger) sur mobile. */
export function Entete() {
  const [ouvert, setOuvert] = useState(false);
  const { pathname } = useLocation();

  // Le menu se referme après chaque navigation et avec la touche Échap.
  useEffect(() => setOuvert(false), [pathname]);
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [ouvert]);

  return (
    <header className="entete">
      <strong className="marque">🏀 {CLUB.nom} {CLUB.equipe}</strong>
      <button
        type="button"
        className="menu-bouton"
        aria-label="Menu"
        aria-expanded={ouvert}
        aria-controls="menu-principal"
        onClick={() => setOuvert((o) => !o)}
      >
        <span aria-hidden="true">{ouvert ? "✕" : "☰"}</span>
      </button>
      <nav id="menu-principal" className={ouvert ? "ouvert" : undefined} aria-label="Navigation principale">
        {LIENS.map((l) => <NavLink key={l.to} to={l.to} end={l.end}>{l.libelle}</NavLink>)}
      </nav>
    </header>
  );
}
