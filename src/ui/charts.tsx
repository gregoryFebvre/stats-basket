import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Label, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const COULEURS = { principale: "#e67e22", violet: "#9b59b6", orange: "#f39c12", bleu: "#3498db", vert: "#2ecc71", rouge: "#e74c3c", titulaires: "#466bfd", banc: "#f8cc54", gagne: "#4CAF50", perdu: "#FF5252", nul: "#9e9e9e" };
// jsdom (tests) n'a pas de mise en page : on fournit une taille initiale.
const DIM = (hauteur: number) => ({ width: 600, height: hauteur });

function Figure({ titre, children }: { titre?: string; children: ReactNode }) {
  return <figure className="graphique">{titre && <figcaption>{titre}</figcaption>}{children}</figure>;
}
const hauteurBarres = (n: number, serie = 1) => Math.max(150, n * (serie === 1 ? 30 : 46) + 40);

export interface PointBarre { nom: string; valeur: number }

/** Barres horizontales, la plus grande valeur en haut (données déjà triées). */
export function BarreH({ titre, donnees, couleur = COULEURS.principale, format }: { titre?: string; donnees: PointBarre[]; couleur?: string; format?: (v: number) => string }) {
  if (donnees.length === 0) return null;
  const h = hauteurBarres(donnees.length);
  return (
    <Figure titre={titre}>
      <ResponsiveContainer width="100%" height={h} initialDimension={DIM(h)}>
        <BarChart data={donnees} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="nom" width={92} tickLine={false} />
          <Tooltip formatter={(v) => (format ? format(Number(v)) : String(v))} />
          <Bar dataKey="valeur" fill={couleur} isAnimationActive={false}>
            <LabelList dataKey="valeur" position="right" formatter={(v: unknown) => (format ? format(Number(v)) : String(v))} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export interface PointDouble { nom: string; a: number; b: number }

/** Deux séries côte à côte (ex. nombre de paniers et points correspondants). */
export function BarreHDouble({ titre, donnees, libelleA, libelleB, couleurA = COULEURS.violet, couleurB = COULEURS.orange }: { titre?: string; donnees: PointDouble[]; libelleA: string; libelleB: string; couleurA?: string; couleurB?: string }) {
  if (donnees.length === 0) return null;
  const h = hauteurBarres(donnees.length, 2);
  return (
    <Figure titre={titre}>
      <ResponsiveContainer width="100%" height={h} initialDimension={DIM(h)}>
        <BarChart data={donnees} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="nom" width={92} tickLine={false} />
          <Tooltip />
          <Legend verticalAlign="bottom" />
          <Bar dataKey="a" name={libelleA} fill={couleurA} isAnimationActive={false}><LabelList dataKey="a" position="right" /></Bar>
          <Bar dataKey="b" name={libelleB} fill={couleurB} isAnimationActive={false}><LabelList dataKey="b" position="right" /></Bar>
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export interface PartDonut { nom: string; valeur: number; couleur: string }

export function Donut({ titre, parts, centre }: { titre?: string; parts: PartDonut[]; centre?: string }) {
  const visibles = parts.filter((p) => p.valeur > 0);
  if (visibles.length === 0) return null;
  const total = visibles.reduce((s, p) => s + p.valeur, 0);
  return (
    <Figure titre={titre}>
      <ResponsiveContainer width="100%" height={260} initialDimension={DIM(260)}>
        <PieChart>
          <Pie data={visibles} dataKey="valeur" nameKey="nom" innerRadius={55} outerRadius={90} startAngle={90} endAngle={-270} isAnimationActive={false}
            label={(p: { valeur: number }) => `${Math.round((p.valeur / total) * 1000) / 10} %`}>
            {visibles.map((p) => <Cell key={p.nom} fill={p.couleur} />)}
            {centre && <Label value={centre} position="center" />}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export interface PointEmpile { nom: string; pts3: number; pts2: number; lf: number; total: number; zero: number }

/** Barres empilées 3 pts / 2 pts / LF avec le total au bout de chaque barre. */
export function BarresEmpilees({ titre, donnees }: { titre?: string; donnees: Array<Omit<PointEmpile, "zero">> }) {
  if (donnees.length === 0) return null;
  const data: PointEmpile[] = donnees.map((d) => ({ ...d, zero: 0 }));
  const h = hauteurBarres(data.length) + 30;
  const dedans = (v: unknown) => (Number(v) > 0 ? String(v) : "");
  return (
    <Figure titre={titre}>
      <ResponsiveContainer width="100%" height={h} initialDimension={DIM(h)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 50, top: 4, bottom: 4 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="nom" width={110} tickLine={false} />
          <Tooltip />
          <Legend verticalAlign="bottom" />
          <Bar dataKey="pts3" name="3 pts" stackId="p" fill={COULEURS.bleu} isAnimationActive={false}><LabelList dataKey="pts3" position="center" fill="#fff" formatter={dedans} /></Bar>
          <Bar dataKey="pts2" name="2 pts" stackId="p" fill={COULEURS.vert} isAnimationActive={false}><LabelList dataKey="pts2" position="center" fill="#fff" formatter={dedans} /></Bar>
          <Bar dataKey="lf" name="LF" stackId="p" fill={COULEURS.rouge} isAnimationActive={false}><LabelList dataKey="lf" position="center" fill="#fff" formatter={dedans} /></Bar>
          <Bar dataKey="zero" stackId="p" legendType="none" isAnimationActive={false}><LabelList dataKey="total" position="right" formatter={(v: unknown) => `= ${v}`} /></Bar>
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

/** Courbe de pourcentages (0-100) par match. */
export function CourbePct({ titre, donnees }: { titre?: string; donnees: PointBarre[] }) {
  if (donnees.length === 0) return null;
  return (
    <Figure titre={titre}>
      <ResponsiveContainer width="100%" height={260} initialDimension={DIM(260)}>
        <LineChart data={donnees} margin={{ left: 0, right: 20, top: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nom" angle={-35} textAnchor="end" interval={0} height={60} />
          <YAxis domain={[0, 100]} unit=" %" width={52} />
          <Tooltip formatter={(v) => `${v} %`} />
          <Line type="monotone" dataKey="valeur" stroke={COULEURS.principale} strokeWidth={2} dot isAnimationActive={false}>
            <LabelList dataKey="valeur" position="top" formatter={(v: unknown) => Math.round(Number(v))} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </Figure>
  );
}

/** Barres verticales simples (évolution dans le temps). */
export function BarresV({ titre, donnees, couleur = COULEURS.principale }: { titre?: string; donnees: PointBarre[]; couleur?: string }) {
  if (donnees.length === 0) return null;
  return (
    <Figure titre={titre}>
      <ResponsiveContainer width="100%" height={260} initialDimension={DIM(260)}>
        <BarChart data={donnees} margin={{ left: 0, right: 10, top: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="nom" angle={-35} textAnchor="end" interval={0} height={60} />
          <YAxis allowDecimals={false} width={36} />
          <Tooltip />
          <Bar dataKey="valeur" fill={couleur} isAnimationActive={false}><LabelList dataKey="valeur" position="top" /></Bar>
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}
