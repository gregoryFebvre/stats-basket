import css from "../styles.css?inline";
import { construireHtmlAutonome } from "./exportHtml";
import { telecharger } from "./telecharger";

/** Imprimer / PDF + export HTML autonome de la page affichée. */
export function ImprimerBouton() {
  const exporter = () => {
    const main = document.querySelector("main");
    if (!main) return;
    const titre = main.querySelector("h1")?.textContent?.trim() || document.title;
    const nom = titre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    telecharger(`${nom || "rapport"}.html`, construireHtmlAutonome(main, titre, css), "text/html");
  };
  return (
    <span className="actions no-print">
      <button type="button" className="secondaire" onClick={() => window.print()}>Imprimer / PDF</button>
      <button type="button" className="secondaire" onClick={exporter}>Exporter en HTML</button>
    </span>
  );
}
