// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RepoProvider } from "../src/app/RepoContext";
import { LocalStorageRepository, MemoryStore } from "../src/data";
import { historiqueJoueuse, repartitionParMatch } from "../src/domain";
import { ComparerPage } from "../src/features/rapports/ComparerPage";
import { JoueuseFichePage, JoueusesPage } from "../src/features/rapports/JoueusesPage";
import { LancersFrancsPage } from "../src/features/rapports/LancersFrancsPage";
import { MatchFichePage } from "../src/features/rapports/MatchFichePage";
import { SaisonPage } from "../src/features/rapports/SaisonPage";
import { joueuses, matchs, performances } from "./fixtures";

afterEach(cleanup);
beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => {}); });

/** ASTRO (complété : 85 – 70, 30 LF obtenus), VERFEIL (incomplet), puis ASTRO retour (championnat). */
async function repoRempli() {
  const repo = new LocalStorageRepository(new MemoryStore(), "t");
  await repo.saveSaison({ id: "s1", libelle: "2026-2027" });
  for (const j of joueuses) await repo.saveJoueuse(j);
  await repo.saveMatch({ ...matchs[0]!, lfObtenus: 30, scoreAdverse: 70 }, performances.filter((p) => p.matchId === "m1"));
  await repo.saveMatch(matchs[1]!, performances.filter((p) => p.matchId === "m2"));
  const alix = joueuses[0]!, clem = joueuses[1]!;
  await repo.saveMatch(
    { id: "m3", saisonId: "s1", date: "2027-01-16", type: "championnat", adversaire: "ASTRO", lieu: "Portet", lfObtenus: 10, scoreAdverse: 80 },
    [
      { id: "q1", matchId: "m3", joueuseId: alix.id, titulaire: true, tempsJeuSec: 1200, p3: 1, p2: 1, lfReussis: 0, fautes: 2 },
      { id: "q2", matchId: "m3", joueuseId: clem.id, titulaire: true, tempsJeuSec: 1500, p3: 0, p2: 10, lfReussis: 5, fautes: 1 },
    ],
  );
  return repo;
}

function monter(repo: LocalStorageRepository, chemin: string) {
  return render(
    <RepoProvider repo={repo}>
      <MemoryRouter initialEntries={[chemin]}>
        <Routes>
          <Route path="/saison" element={<SaisonPage />} />
          <Route path="/matchs/:id" element={<MatchFichePage />} />
          <Route path="/lancers-francs" element={<LancersFrancsPage />} />
          <Route path="/comparer" element={<ComparerPage />} />
          <Route path="/joueuses" element={<JoueusesPage />} />
          <Route path="/joueuses/:id" element={<JoueuseFichePage />} />
        </Routes>
      </MemoryRouter>
    </RepoProvider>,
  );
}
const kpi = (libelle: RegExp | string) => {
  const el = screen.getAllByText(libelle).find((e) => e.classList.contains("kpi-libelle"));
  if (!el) throw new Error(`Carte « ${String(libelle)} » introuvable`);
  return el.parentElement!;
};

describe("domaine : historique", () => {
  it("répartit les points par match, du plus ancien au plus récent", async () => {
    const r = repartitionParMatch([matchs[1]!, matchs[0]!], performances);
    expect(r.map((x) => x.adversaire)).toEqual(["ASTRO", "VERFEIL"]);
    expect(r[0]).toMatchObject({ pts3: 6, pts2: 56, lf: 23, total: 85 });
  });
  it("retrouve les matchs d'une joueuse", () => {
    const h = historiqueJoueuse(joueuses[0]!.id, matchs, performances);
    expect(h).toEqual([expect.objectContaining({ adversaire: "ASTRO", points: 17, tempsJeuSec: 1370, titulaire: true })]);
  });
});

describe("rapport de saison", () => {
  it("affiche bilan, points marqués et tableau des joueuses", async () => {
    monter(await repoRempli(), "/saison");
    expect(await screen.findByRole("heading", { name: /saison 2026-2027/ })).toBeTruthy();
    expect(kpi("Matchs").textContent).toContain("3");
    expect(kpi("Bilan").textContent).toContain("1 V – 1 D"); // VERFEIL sans score adverse : ni V ni D
    expect(kpi("Points marqués").textContent).toContain("115"); // 85 + 0 + 30
    expect(screen.getByText(/1 match\(s\) sans score adverse/)).toBeTruthy();
    const ligne = screen.getByRole("cell", { name: "Alix" }).closest("tr")!;
    expect(within(ligne).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Alix", "2", "2", "22", "11", "17", "5", "42:50", "3", "0,51"]);
  });

  it("le filtre par type de match recalcule tout (championnat seul)", async () => {
    const user = userEvent.setup();
    monter(await repoRempli(), "/saison");
    await screen.findByRole("heading", { name: /saison/ });
    await user.click(screen.getByRole("checkbox", { name: "Amical" }));
    await user.click(screen.getByRole("checkbox", { name: "Brassage" }));
    await user.click(screen.getByRole("checkbox", { name: "Coupe" }));
    expect(kpi("Matchs").textContent).toContain("1");
    expect(kpi("Bilan").textContent).toContain("0 V – 1 D");
    expect(kpi("Points marqués").textContent).toContain("30");
  });

  it("invite à saisir quand il n'y a aucun match", async () => {
    monter(new LocalStorageRepository(new MemoryStore(), "t"), "/saison");
    expect(await screen.findByText(/Aucun match enregistré/)).toBeTruthy();
  });
});

describe("fiche match", () => {
  it("affiche score, résultat, LF et lignes triées par points", async () => {
    monter(await repoRempli(), "/matchs/m1");
    expect(await screen.findByRole("heading", { name: /12\/09\/2026 contre ASTRO/ })).toBeTruthy();
    expect(kpi("Gagné").textContent).toContain("85 – 70");
    expect(kpi(/Lancers francs/).textContent).toContain("23 / 30");
    expect(kpi(/Lancers francs/).textContent).toContain("76,7 %");
    const lignes = screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0]!.textContent);
    expect(lignes[0]).toBe("Alix");
    expect(lignes).toHaveLength(9);
  });
  it("signale un match à compléter", async () => {
    monter(await repoRempli(), "/matchs/m2");
    expect(await screen.findByText(/Score adverse ou LF obtenus manquants/)).toBeTruthy();
  });
  it("gère un match inconnu", async () => {
    monter(await repoRempli(), "/matchs/zzz");
    expect((await screen.findByRole("alert")).textContent).toContain("introuvable");
  });
});

describe("lancers francs", () => {
  it("totalise uniquement les matchs dont les LF obtenus sont connus", async () => {
    monter(await repoRempli(), "/lancers-francs");
    await screen.findByRole("heading", { name: "Lancers francs" });
    expect(kpi("LF obtenus").textContent).toContain("40"); // 30 + 10, VERFEIL exclu
    expect(kpi("LF réussis").textContent).toContain("28"); // 23 + 5
    expect(kpi("Réussite").textContent).toContain("70 %");
    expect(kpi("LF manqués").textContent).toContain("12");
    expect(screen.getByText(/Dépendance aux lancers francs/)).toBeTruthy();
  });
});

describe("comparaison", () => {
  it("présélectionne la dernière confrontation aller/retour", async () => {
    monter(await repoRempli(), "/comparer");
    await screen.findByRole("heading", { name: "Comparer deux matchs" });
    expect((screen.getByLabelText("Match 1") as HTMLSelectElement).value).toBe("m1");
    expect((screen.getByLabelText("Match 2") as HTMLSelectElement).value).toBe("m3");
    const lignes = screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
    expect(lignes).toEqual([["Camille", "14", "25", "+11"], ["Alix", "17", "5", "-12"]]);
    expect(kpi("Évolution").textContent).toContain("-55"); // 30 - 85
  });
});

describe("joueuses", () => {
  it("liste les joueuses et ouvre une fiche avec son historique", async () => {
    const repo = await repoRempli();
    monter(repo, `/joueuses/${joueuses[0]!.id}`);
    expect(await screen.findByRole("heading", { name: "Alix MARTIN" })).toBeTruthy();
    expect(kpi("Points").textContent).toContain("22");
    expect(kpi("Moyenne / match").textContent).toContain("11");
  });
});
