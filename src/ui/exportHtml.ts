/**
 * Construit un fichier HTML autonome à partir d'un bloc de page déjà affiché :
 * styles intégrés, graphiques SVG conservés, éléments interactifs et liens retirés.
 */
export function construireHtmlAutonome(source: HTMLElement, titre: string, css: string, date: Date = new Date()): string {
  const copie = source.cloneNode(true) as HTMLElement;
  copie.querySelectorAll(".no-print, button, input, select, textarea, datalist, script").forEach((e) => e.remove());
  copie.querySelectorAll("a").forEach((a) => {
    const s = document.createElement("span");
    s.innerHTML = a.innerHTML;
    a.replaceWith(s);
  });
  const echappe = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echappe(titre)}</title>
<style>
${css}
svg { max-width: 100%; height: auto; }
.recharts-responsive-container, .recharts-wrapper { max-width: 100%; }
.pied { text-align: center; color: #888; font-size: .8rem; margin: 24px 0; }
</style>
</head>
<body>
<main>
${copie.innerHTML}
</main>
<p class="pied">Rapport généré le ${date.toLocaleDateString("fr-FR")}</p>
</body>
</html>
`;
}
