# Stats basket — PBC U18F

Application 100 % navigateur (React + Vite + TypeScript), données dans le localStorage.

    npm install
    npm run dev         # développement
    npm test            # tests (domaine, stockage, formulaire, écran de saisie)
    npm run build       # génère dist/ (hébergement statique, chemins relatifs)

Paramètres du club : `src/club.config.ts`.

Écrans : Saison (tableau de bord), Matchs + fiche match, Joueuses + fiche, Lancers francs, Comparer, Saisie, Données.
Impression : bouton « Imprimer / PDF » (feuille `@media print` dans `src/styles.css`).

Hors-ligne / installation : PWA (service worker généré par vite-plugin-pwa). Servir `dist/` en HTTPS
(GitHub Pages, Netlify…), ouvrir une première fois en ligne, puis « Ajouter à l'écran d'accueil ».
Les données restent dans le navigateur de l'appareil : exporter régulièrement une sauvegarde JSON (onglet Données).
