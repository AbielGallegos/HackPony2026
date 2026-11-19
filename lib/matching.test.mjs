// Pruebas del motor de matching. Ejecutar: npm test  (usa node --test, sin dependencias)
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMatch, rankCandidates } from "./matching.mjs";

const st = (...slugs) => slugs.map((slug) => ({ slug, evidence_count: 0 }));
const ch = (req, nice = []) => [...req.map((slug) => ({ slug, is_required: true })), ...nice.map((slug) => ({ slug, is_required: false }))];

test("compatibilidad completa = 100", () => {
  assert.equal(computeMatch(st("a", "b", "c"), ch(["a", "b"], ["c"])).score, 100);
});

test("ejemplo del equipo: 3/4 obligatorias y 1/2 deseables = 70", () => {
  const m = computeMatch(st("a", "b", "c", "e"), ch(["a", "b", "c", "d"], ["e", "f"]));
  assert.equal(m.score, 70);
  assert.equal(m.requiredMet, 3);
  assert.deepEqual(m.missing.map((x) => x.slug), ["d", "f"]);
});

test("sin deseables, las obligatorias valen 100: 3/4 = 75", () => {
  assert.equal(computeMatch(st("python", "sql", "git"), ch(["python", "sql", "git", "docker"])).score, 75);
});

test("escenario de la demo en vivo = 75 y le falta SQL", () => {
  const m = computeMatch(st("javascript", "react", "git"), ch(["javascript", "react", "sql", "git"]));
  assert.equal(m.score, 75);
  assert.deepEqual(m.missing, [{ slug: "sql", is_required: true }]);
  assert.equal(m.recommended, true); // 3/4 = 0.75
});

test("sin coincidencias = 0", () => {
  assert.equal(computeMatch(st("x", "y"), ch(["a", "b"], ["c"])).score, 0);
});

test("perfil vacío = 0 y se marca como incompleto", () => {
  const m = computeMatch([], ch(["a", "b"], ["c"]));
  assert.equal(m.score, 0);
  assert.equal(m.profileEmpty, true);
});

test("habilidades duplicadas nunca pasan de 100", () => {
  const m = computeMatch(st("a", "a", "b"), ch(["a", "b", "a"]));
  assert.equal(m.score, 100);
  assert.equal(m.requiredTotal, 2);
});

test("solo deseables cumplidas = 20 y no cumple obligatorias", () => {
  const m = computeMatch(st("c", "d"), ch(["a", "b"], ["c", "d"]));
  assert.equal(m.score, 20);
  assert.equal(m.meetsAllRequired, false);
  assert.equal(m.recommended, false);
});

test("reto sin obligatorias es inválido (null), nunca divide entre cero", () => {
  assert.equal(computeMatch(st("a"), ch([], ["c"])), null);
  assert.equal(computeMatch(st("a"), []), null);
});

test("la evidencia no cambia el %, pero sí desempata", () => {
  const ch1 = ch(["a", "b"]);
  const sinEvidencia = computeMatch(st("a"), ch1);
  const conEvidencia = computeMatch([{ slug: "a", evidence_count: 3 }], ch1);
  assert.equal(sinEvidencia.score, conEvidencia.score);

  const ranked = rankCandidates([
    { student_id: "s1", applied_at: "2026-11-01T00:00:00Z", match: sinEvidencia },
    { student_id: "s2", applied_at: "2026-11-02T00:00:00Z", match: conEvidencia },
  ]);
  assert.deepEqual(ranked.map((c) => c.student_id), ["s2", "s1"]);
});

test("empate total: gana quien se postuló primero", () => {
  const m = computeMatch(st("a"), ch(["a", "b"]));
  const ranked = rankCandidates([
    { student_id: "tarde", applied_at: "2026-11-02T00:00:00Z", match: m },
    { student_id: "temprano", applied_at: "2026-11-01T00:00:00Z", match: m },
  ]);
  assert.deepEqual(ranked.map((c) => c.student_id), ["temprano", "tarde"]);
});

test("ranking ordena por % de mayor a menor", () => {
  const c = ch(["a", "b", "c", "d"]);
  const ranked = rankCandidates([
    { student_id: "25", match: computeMatch(st("a"), c) },
    { student_id: "100", match: computeMatch(st("a", "b", "c", "d"), c) },
    { student_id: "50", match: computeMatch(st("a", "b"), c) },
  ]);
  assert.deepEqual(ranked.map((x) => x.student_id), ["100", "50", "25"]);
});
