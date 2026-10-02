// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepoProvider } from "../src/app/RepoContext";
import { LocalStorageRepository, MemoryStore } from "../src/data";
import { MatchsPage } from "../src/features/matchs/MatchsPage";
import { SaisiePage } from "../src/features/saisie/SaisiePage";
import { bilanMatch } from "../src/domain";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function monter(repo: LocalStorageRepository, chemin = "/matchs/nouveau") {
  return render(
    <RepoProvider repo={repo}>
      <MemoryRouter initialEntries={[chemin]}>
        <Routes>
          <Route path="/matchs" element={<MatchsPage />} />
          <Route path="/matchs/nouveau" element={<SaisiePage />} />
          <Route path="/matchs/:id/modifier" element={<SaisiePage />} />
        </Routes>
      </MemoryRouter>
    </RepoProvider>,
  );
}
const nouveauRepo = () => new LocalStorageRepository(new MemoryStore(), "t");

describe("écran de saisie", () => {
  it("affiche les points de la joueuse en direct à chaque frappe", async () => {
    const user = userEvent.setup();
    monter(nouveauRepo());
    const points = await screen.findByLabelText("Points ligne 1");
    await user.type(screen.getByLabelText("Prénom ligne 1"), "Alix");
    expect(points.textContent).toBe("0");
    await user.type(screen.getByLabelText("3 pts ligne 1"), "2");
    expect(points.textContent).toBe("6");
    await user.type(screen.getByLabelText("2 pts ligne 1"), "4");
    expect(points.textContent).toBe("14");
    await user.type(screen.getByLabelText("LF ligne 1"), "3");
    expect(points.textContent).toBe("17");
    expect(within(screen.getByLabelText("Totaux")).getByText("17")).toBeTruthy();
  });

  it("signale en direct des LF saisis supérieurs aux LF obtenus", async () => {
    const user = userEvent.setup();
    monter(nouveauRepo());
    await user.type(await screen.findByLabelText("Lancers francs obtenus"), "2");
    await user.type(screen.getByLabelText("LF ligne 1"), "3");
    expect((await screen.findByRole("alert")).textContent).toContain("Lancers francs");
  });

  it("complète le nom d'une joueuse connue, met le temps au format mm:ss et enregistre le match", async () => {
    const repo = nouveauRepo();
    const alix = await repo.trouverOuCreerJoueuse("Alix", "MARTIN");
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true); // avertissement « 0 titulaire »
    monter(repo);

    fireEvent.change(await screen.findByLabelText("Date"), { target: { value: "2026-10-03" } });
    await user.selectOptions(screen.getByLabelText("Type de match"), "championnat");
    await user.type(screen.getByLabelText("Adversaire"), "LOURDES");
    await user.type(screen.getByLabelText("Lieu"), "Lourdes");
    await user.type(screen.getByLabelText("Lancers francs obtenus"), "8");
    await user.type(screen.getByLabelText("Score adverse"), "50");

    await user.type(screen.getByLabelText("Prénom ligne 1"), "alix");
    expect((screen.getByLabelText("Nom ligne 1") as HTMLInputElement).value).toBe("MARTIN");
    await user.type(screen.getByLabelText("Temps ligne 1"), "2250");
    await user.tab();
    expect((screen.getByLabelText("Temps ligne 1") as HTMLInputElement).value).toBe("22:50");
    await user.type(screen.getByLabelText("3 pts ligne 1"), "2");
    await user.type(screen.getByLabelText("2 pts ligne 1"), "4");
    await user.type(screen.getByLabelText("LF ligne 1"), "3");
    await user.click(screen.getByLabelText("Titulaire ligne 1"));

    await user.click(screen.getByRole("button", { name: "Enregistrer le match" }));

    await waitFor(async () => expect(await repo.getMatchs()).toHaveLength(1));
    const [m] = await repo.getMatchs();
    const perfs = await repo.getPerformances(m!.id);
    expect(m).toMatchObject({ adversaire: "LOURDES", type: "championnat", lfObtenus: 8, scoreAdverse: 50 });
    expect(perfs).toEqual([expect.objectContaining({ joueuseId: alix.id, tempsJeuSec: 1370, titulaire: true })]);
    expect(bilanMatch(m!, perfs)).toMatchObject({ score: 17, pctLf: 37.5, resultat: "perdu", diff: -33 });
    expect(await repo.getJoueuses()).toHaveLength(1); // pas de doublon
    expect(await repo.getBrouillon()).toBeNull();
    expect(await screen.findByRole("heading", { name: "Matchs" })).toBeTruthy(); // redirection vers la liste
  });

  it("n'enregistre rien et affiche les erreurs si le formulaire est incomplet", async () => {
    const repo = nouveauRepo();
    const user = userEvent.setup();
    monter(repo);
    await user.click(await screen.findByRole("button", { name: "Enregistrer le match" }));
    expect(await screen.findByText("Date obligatoire")).toBeTruthy();
    expect(await repo.getMatchs()).toEqual([]);
  });

  it("sauvegarde un brouillon puis propose de le reprendre", async () => {
    const repo = nouveauRepo();
    const user = userEvent.setup();
    const premier = monter(repo);
    await user.type(await screen.findByLabelText("Adversaire"), "ASTRO");
    await waitFor(async () => expect(await repo.getBrouillon()).toMatchObject({ adversaire: "ASTRO" }), { timeout: 2000 });
    premier.unmount();

    monter(repo);
    await user.click(await screen.findByRole("button", { name: "Reprendre" }));
    expect((screen.getByLabelText("Adversaire") as HTMLInputElement).value).toBe("ASTRO");
  });

  it("modifie un match existant sans le dupliquer", async () => {
    const repo = nouveauRepo();
    const saison = { id: "s1", libelle: "2026-2027" };
    await repo.saveSaison(saison);
    const j = await repo.trouverOuCreerJoueuse("Alix", "MARTIN");
    await repo.saveMatch(
      { id: "m1", saisonId: "s1", date: "2026-09-12", type: "brassage", adversaire: "ASTRO", lieu: "PINSAGUEL", lfObtenus: null, scoreAdverse: null },
      [{ id: "p1", matchId: "m1", joueuseId: j.id, titulaire: true, tempsJeuSec: 1370, p3: 2, p2: 4, lfReussis: 3, fautes: 1 }],
    );
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    monter(repo, "/matchs/m1/modifier");

    expect(((await screen.findByLabelText("Temps ligne 1")) as HTMLInputElement).value).toBe("22:50");
    expect(screen.getByLabelText("Points ligne 1").textContent).toBe("17");
    await user.type(screen.getByLabelText("Lancers francs obtenus"), "6");
    await user.type(screen.getByLabelText("Score adverse"), "60");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    await waitFor(async () => expect((await repo.getMatch("m1"))?.scoreAdverse).toBe(60));
    expect(await repo.getMatchs()).toHaveLength(1);
    expect(await repo.getBrouillon()).toBeNull();
  });
});
