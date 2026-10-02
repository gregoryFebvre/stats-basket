import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RepoProvider } from "./app/RepoContext";
import { LocalStorageRepository, navigateurStore } from "./data";
import "./styles.css";

// Demande au navigateur de ne pas effacer les données automatiquement (sans effet s'il refuse).
void navigator.storage?.persist?.();

const racine = createRoot(document.getElementById("root")!);
try {
  const repo = new LocalStorageRepository(navigateurStore());
  racine.render(<StrictMode><RepoProvider repo={repo}><App /></RepoProvider></StrictMode>);
} catch (e) {
  racine.render(<p className="erreur" role="alert">Impossible d'ouvrir le stockage : {e instanceof Error ? e.message : String(e)}</p>);
}
