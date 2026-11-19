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

// GITHUB_TOKEN (opcional) solo se lee aquí, en el servidor. Nunca llega al navegador.
const TIMEOUT_MS = 6000;
function ghHeaders() {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "puente-tecnico", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}
async function ghFetch(path) {
  try {
    return await fetch(`https://api.github.com${path}`, { headers: ghHeaders(), cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    throw new GitHubUnavailable(e?.name === "TimeoutError" ? "GitHub tardó demasiado en responder." : "No se pudo conectar con GitHub.");
  }
}
/** GitHub no disponible (red, límite de consultas o error del servicio): no es culpa del usuario. */
export class GitHubUnavailable extends Error {}
function checkCommon(res) {
  if (res.status === 403 || res.status === 429) {
    if (res.headers.get("x-ratelimit-remaining") === "0" || res.status === 429)
      throw new GitHubUnavailable("GitHub limitó las consultas (60 por hora sin token). Intenta más tarde.");
  }
  if (res.status === 401 && process.env.GITHUB_TOKEN) throw new GitHubUnavailable("El GITHUB_TOKEN del servidor es inválido o expiró.");
  if (res.status >= 500) throw new GitHubUnavailable(`GitHub respondió con error ${res.status}.`);
}

export async function fetchGitHubPortfolio(username) {
  if (!isValidGitHubUser(username)) throw new Error("Usuario de GitHub inválido.");
  const [userRes, repoRes] = await Promise.all([
    ghFetch(`/users/${username}`),
    ghFetch(`/users/${username}/repos?per_page=100&sort=pushed`),
  ]);
  if (userRes.status === 404) throw new Error(`No existe el usuario "${username}" en GitHub.`);
  checkCommon(userRes);
  checkCommon(repoRes);
  if (!userRes.ok || !repoRes.ok) throw new GitHubUnavailable(`GitHub respondió con error ${userRes.status}.`);

  const user = await userRes.json();
  const repos = await repoRes.json();
  return { username: user.login, avatar: user.avatar_url, ...analyzeRepos(repos) };
}

// ---------------- Repositorio individual por URL ----------------
const REPO_URL_RE = /^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:\/(?:tree|blob)\/[^?#]*)?\/?(?:[?#].*)?$/;

/** Devuelve { owner, repo } si la URL es de un repositorio público de GitHub; si no, null. */
export function parseGitHubRepoUrl(url) {
  const m = REPO_URL_RE.exec(String(url ?? "").trim());
  if (!m) return null;
  const [, owner, repo] = m;
  if (repo === "." || repo === "..") return null;
  return { owner, repo };
}

/**
 * Consulta datos PÚBLICOS de un repositorio: nombre, descripción, lenguajes, estrellas y enlace.
 * - null  → la URL no es de GitHub (se guarda como enlace normal).
 * - lanza Error("no existe o es privado") → 404.
 * - lanza GitHubUnavailable → red, límite o error de GitHub (el proyecto se puede guardar igual).
 * Estos datos NO cambian el % de compatibilidad.
 */
export async function fetchGitHubRepo(url) {
  const parsed = parseGitHubRepoUrl(url);
  if (!parsed) return null;
  const base = `/repos/${parsed.owner}/${parsed.repo}`;
  const [repoRes, langRes] = await Promise.all([ghFetch(base), ghFetch(`${base}/languages`)]);
  if (repoRes.status === 404) throw new Error("Ese repositorio de GitHub no existe o es privado.");
  checkCommon(repoRes);
  if (!repoRes.ok) throw new GitHubUnavailable(`GitHub respondió con error ${repoRes.status}.`);
  const repo = await repoRes.json();
  if (repo.private) throw new Error("Ese repositorio es privado: la empresa no podría verlo.");

  let languages = [];
  if (langRes.ok) {
    const bytes = await langRes.json();
    const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
    languages = Object.entries(bytes)
      .sort((a, b) => b[1] - a[1])
      .filter(([, n]) => n / total >= 0.02)
      .slice(0, 4)
      .map(([name]) => name);
  }
  return {
    title: String(repo.name).slice(0, 120),
    description: repo.description ? String(repo.description).slice(0, 300) : null,
    repo_url: repo.html_url,
    demo_url: typeof repo.homepage === "string" && repo.homepage.startsWith("https://") ? repo.homepage.slice(0, 300) : null,
    language: languages.length ? languages.join(", ").slice(0, 80) : repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
    fork: Boolean(repo.fork),
  };
}
