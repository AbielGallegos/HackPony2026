// Evidencia de GitHub (P1, dueño: José).
// Lee los repositorios PÚBLICOS de un usuario y cuenta en cuántos aparece cada habilidad.
// Importante: esto prueba que hay código público con esa tecnología, NO que la persona la domine.
// Por eso en la interfaz se dice "con evidencia en GitHub", nunca "verificada".

import { normalizeSkill, SKILLS } from "./skills.mjs";

const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
export const isValidGitHubUser = (u) => USERNAME_RE.test(u ?? "");

// Palabras comunes que darían falsos positivos se excluyen ("next step", "api" en cualquier texto).
const AMBIGUOUS = new Set(["next", "rest", "api", "go", "ts", "js", "py"]);
const KEYWORDS = SKILLS.flatMap((s) => [s.slug, s.label, ...s.aliases].map((w) => [w.toLowerCase(), s.slug])).filter(
  ([w]) => w.length >= 3 && !AMBIGUOUS.has(w)
);

export function skillsFromRepo(repo) {
  const found = new Set();
  const lang = normalizeSkill(repo.language);
  if (lang) found.add(lang);
  for (const t of repo.topics ?? []) {
    const k = normalizeSkill(t);
    if (k) found.add(k);
  }
  const text = `${repo.name} ${repo.description ?? ""}`.toLowerCase().replace(/_/g, "-");
  for (const [word, slug] of KEYWORDS) {
    const re = new RegExp(`(^|[^a-z0-9])${word.replace(/[.+#]/g, "\\$&")}([^a-z0-9]|$)`);
    if (re.test(text)) found.add(slug);
  }
  return [...found];
}

/** @returns {{skills:{slug:string,evidence_count:number}[], projects:object[], repoCount:number}} */
export function analyzeRepos(repos) {
  const own = repos.filter((r) => !r.fork);
  const evidence = new Map();
  for (const repo of own) for (const slug of skillsFromRepo(repo)) evidence.set(slug, (evidence.get(slug) ?? 0) + 1);

  const skills = [...evidence.entries()].sort((a, b) => b[1] - a[1]).map(([slug, evidence_count]) => ({ slug, evidence_count }));
  const projects = [...own]
    .sort((a, b) => b.stargazers_count - a.stargazers_count || String(b.pushed_at).localeCompare(String(a.pushed_at)))
    .slice(0, 6)
    .map((r) => ({
      title: r.name.slice(0, 120).padEnd(3, "-"),
      description: (r.description ?? "").slice(0, 300) || null,
      repo_url: r.html_url,
      demo_url: r.homepage?.startsWith("https://") ? r.homepage : null,
      language: r.language ?? null,
      stars: r.stargazers_count ?? 0,
      from_github: true,
    }));
  return { skills, projects, repoCount: own.length };
}

export async function fetchGitHubPortfolio(username) {
  if (!isValidGitHubUser(username)) throw new Error("Usuario de GitHub inválido.");
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "puente-tecnico" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let userRes, repoRes;
  try {
    [userRes, repoRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers, cache: "no-store" }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, { headers, cache: "no-store" }),
    ]);
  } catch {
    throw new Error("No se pudo conectar con GitHub. Revisa tu conexión a internet.");
  }
  if (userRes.status === 404) throw new Error(`No existe el usuario "${username}" en GitHub.`);
  if (userRes.status === 403 || userRes.status === 429)
    throw new Error("GitHub limitó las consultas (60 por hora sin token). Configura GITHUB_TOKEN.");
  if (userRes.status === 401 && process.env.GITHUB_TOKEN) throw new Error("El GITHUB_TOKEN configurado es inválido o expiró.");
  if (!userRes.ok || !repoRes.ok) throw new Error(`GitHub respondió con error ${userRes.status}.`);

  const user = await userRes.json();
  const repos = await repoRes.json();
  return { username: user.login, avatar: user.avatar_url, ...analyzeRepos(repos) };
}
