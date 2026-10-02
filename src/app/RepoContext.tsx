import { createContext, useContext, type ReactNode } from "react";
import type { Repository } from "../data/repository";

const Ctx = createContext<Repository | null>(null);

export function RepoProvider({ repo, children }: { repo: Repository; children: ReactNode }) {
  return <Ctx.Provider value={repo}>{children}</Ctx.Provider>;
}

export function useRepo(): Repository {
  const repo = useContext(Ctx);
  if (!repo) throw new Error("useRepo doit être utilisé dans un RepoProvider");
  return repo;
}
