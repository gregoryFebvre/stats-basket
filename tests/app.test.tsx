// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { RepoProvider } from "../src/app/RepoContext";
import { LocalStorageRepository, MemoryStore } from "../src/data";
import { construireHtmlAutonome } from "../src/ui/exportHtml";
import { joueuses, matchs, performances } from "./fixtures";

afterEach(cleanup);
beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => {}); window.location.hash = "#/saison"; });

describe("application", () => {
  it("navigue entre les écrans (chargement différé des rapports compris)", async () => {
    const repo = new LocalStorageRepository(new MemoryStore(), "t");
    await repo.saveSaison({ id: "s1", libelle: "2026-2027" });
    for (const j of joueuses) await repo.saveJoueuse(j);
    await repo.saveMatch({ ...matchs[0]!, lfObtenus: 30, scoreAdverse: 70 }, performances.filter((p) => p.matchId === "m1"));
    const user = userEvent.setup();
    render(<RepoProvider repo={repo}><App /></RepoProvider>);

    expect(await screen.findByRole("heading", { name: /saison 2026-2027/ })).toBeTruthy(); // route "#/saison"
    await user.click(screen.getByRole("link", { name: "Lancers francs" }));
    expect(await screen.findByRole("heading", { name: "Lancers francs" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Matchs" }));
    expect(await screen.findByRole("heading", { name: "Matchs" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Fiche" }));
    expect(await screen.findByRole("heading", { name: /contre ASTRO/ })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Données" }));
    expect(await screen.findByRole("heading", { name: "Données" })).toBeTruthy();
  });
});

describe("export HTML autonome", () => {
  it("garde le contenu et les graphiques, retire boutons, filtres et liens", () => {
    const racine = document.createElement("main");
    racine.innerHTML = `
      <h1>Rapport</h1>
      <div class="filtre no-print"><input type="checkbox"></div>
      <button>Imprimer</button>
      <p>Voir <a href="#/matchs/1">la fiche <b>ASTRO</b></a> & <script>alert(1)</script></p>
      <svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>`;
    const html = construireHtmlAutonome(racine, "Rapport <U18F>", "body{color:red}", new Date("2026-10-01T12:00:00Z"));
    expect(html).toContain("<title>Rapport &lt;U18F></title>");
    expect(html).toContain("body{color:red}");
    expect(html).toContain("<svg");
    expect(html).toContain("<b>ASTRO</b>");
    expect(html).toContain("01/10/2026");
    for (const interdit of ["<button", "<input", "<a ", "<script", "no-print\""]) expect(html).not.toContain(interdit);
    expect(racine.querySelector("button")).not.toBeNull(); // le DOM d'origine n'est pas modifié
  });
});
