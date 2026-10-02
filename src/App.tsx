import { Suspense, lazy } from "react";
import { HashRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { CLUB } from "./club.config";
import { DonneesPage } from "./features/donnees/DonneesPage";
import { MatchsPage } from "./features/matchs/MatchsPage";
import { SaisiePage } from "./features/saisie/SaisiePage";

// Les écrans de rapport (et Recharts) ne sont chargés qu'à l'ouverture d'un rapport.
const page = <K extends string>(charger: () => Promise<Record<K, React.ComponentType>>, nom: K) =>
  lazy(() => charger().then((m) => ({ default: m[nom] })));
const SaisonPage = page(() => import("./features/rapports/SaisonPage"), "SaisonPage");
const MatchFichePage = page(() => import("./features/rapports/MatchFichePage"), "MatchFichePage");
const LancersFrancsPage = page(() => import("./features/rapports/LancersFrancsPage"), "LancersFrancsPage");
const ComparerPage = page(() => import("./features/rapports/ComparerPage"), "ComparerPage");
const JoueusesPage = page(() => import("./features/rapports/JoueusesPage"), "JoueusesPage");
const JoueuseFichePage = page(() => import("./features/rapports/JoueusesPage"), "JoueuseFichePage");

export function App() {
  return (
    <HashRouter>
      <header className="entete">
        <strong>🏀 {CLUB.nom} {CLUB.equipe}</strong>
        <nav>
          <NavLink to="/saison">Saison</NavLink>
          <NavLink to="/matchs" end>Matchs</NavLink>
          <NavLink to="/joueuses">Joueuses</NavLink>
          <NavLink to="/lancers-francs">Lancers francs</NavLink>
          <NavLink to="/comparer">Comparer</NavLink>
          <NavLink to="/matchs/nouveau">Saisie</NavLink>
          <NavLink to="/donnees">Données</NavLink>
        </nav>
      </header>
      <main>
        <Suspense fallback={<p>Chargement…</p>}>
        <Routes>
          <Route path="/" element={<Navigate to="/saison" replace />} />
          <Route path="/saison" element={<SaisonPage />} />
          <Route path="/joueuses" element={<JoueusesPage />} />
          <Route path="/joueuses/:id" element={<JoueuseFichePage />} />
          <Route path="/lancers-francs" element={<LancersFrancsPage />} />
          <Route path="/comparer" element={<ComparerPage />} />
          <Route path="/matchs" element={<MatchsPage />} />
          <Route path="/matchs/nouveau" element={<SaisiePage />} />
          <Route path="/matchs/:id" element={<MatchFichePage />} />
          <Route path="/matchs/:id/modifier" element={<SaisiePage />} />
          <Route path="/donnees" element={<DonneesPage />} />
          <Route path="*" element={<Navigate to="/saison" replace />} />
        </Routes>
        </Suspense>
      </main>
    </HashRouter>
  );
}
