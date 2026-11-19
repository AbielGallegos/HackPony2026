// Pruebas de la integración con GitHub SIN red (fetch simulado). Ejecutar: npm test
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { parseGitHubRepoUrl, fetchGitHubRepo, GitHubUnavailable, analyzeRepos } from "./github.mjs";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
function mockFetch(routes) {
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    const r = routes[path];
    if (r instanceof Error) throw r;
    return r ? r() : json(404, { message: "Not Found" });
  };
}

test("reconoce URLs de repositorios y rechaza las demás", () => {
  assert.deepEqual(parseGitHubRepoUrl("https://github.com/octocat/Hello-World"), { owner: "octocat", repo: "Hello-World" });
  assert.deepEqual(parseGitHubRepoUrl("https://github.com/a/b.git"), { owner: "a", repo: "b" });
  assert.deepEqual(parseGitHubRepoUrl("https://github.com/a/b/tree/main/src"), { owner: "a", repo: "b" });
  for (const bad of ["https://github.com/octocat", "http://github.com/a/b", "https://gitlab.com/a/b", "https://github.com/../x", "javascript:alert(1)"])
    assert.equal(parseGitHubRepoUrl(bad), null, bad);
});

test("trae nombre, descripción, lenguajes, estrellas y enlace", async () => {
  mockFetch({
    "/repos/ana/inventario": () => json(200, { name: "inventario", description: "Panel de inventario", html_url: "https://github.com/ana/inventario", homepage: "https://inv.vercel.app", stargazers_count: 3, language: "JavaScript", private: false, fork: false }),
    "/repos/ana/inventario/languages": () => json(200, { JavaScript: 9000, CSS: 900, Shell: 10 }),
  });
  const r = await fetchGitHubRepo("https://github.com/ana/inventario");
  assert.equal(r.title, "inventario");
  assert.equal(r.description, "Panel de inventario");
  assert.equal(r.language, "JavaScript, CSS"); // Shell < 2% se omite
  assert.equal(r.stars, 3);
  assert.equal(r.repo_url, "https://github.com/ana/inventario");
  assert.equal(r.demo_url, "https://inv.vercel.app");
});

test("repositorio inexistente ⇒ error claro (no 'GitHub no disponible')", async () => {
  mockFetch({});
  await assert.rejects(fetchGitHubRepo("https://github.com/nadie/nada"), (e) => !(e instanceof GitHubUnavailable) && /no existe o es privado/.test(e.message));
});

test("límite de consultas ⇒ GitHubUnavailable", async () => {
  const limited = () => json(403, { message: "API rate limit exceeded" }, { "x-ratelimit-remaining": "0" });
  mockFetch({ "/repos/a/b": limited, "/repos/a/b/languages": limited });
  await assert.rejects(fetchGitHubRepo("https://github.com/a/b"), (e) => e instanceof GitHubUnavailable && /limitó/.test(e.message));
});

test("sin red ⇒ GitHubUnavailable (el MVP no se bloquea)", async () => {
  mockFetch({ "/repos/a/b": new TypeError("fetch failed"), "/repos/a/b/languages": new TypeError("fetch failed") });
  await assert.rejects(fetchGitHubRepo("https://github.com/a/b"), GitHubUnavailable);
});

test("URL que no es de GitHub ⇒ null (se guarda como enlace normal, sin consultar)", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return json(200, {}); };
  assert.equal(await fetchGitHubRepo("https://mi-demo.vercel.app"), null);
  assert.equal(called, false);
});

test("los forks no cuentan como evidencia", () => {
  const { skills, repoCount } = analyzeRepos([
    { name: "propio", language: "Python", fork: false, stargazers_count: 0 },
    { name: "copiado", language: "Go", fork: true, stargazers_count: 99 },
  ]);
  assert.equal(repoCount, 1);
  assert.deepEqual(skills.map((s) => s.slug), ["python"]);
});
