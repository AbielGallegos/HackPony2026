// Genera supabase/seed.sql (catálogo de habilidades) desde lib/skills.mjs.
// Uso: node scripts/gen-seed-sql.mjs
import { writeFileSync } from "node:fs";
import { SKILLS } from "../lib/skills.mjs";

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rows = SKILLS.map((s) => `  (${q(s.slug)}, ${q(s.label)}, ${q(s.category)})`).join(",\n");

const sql = `-- Generado por scripts/gen-seed-sql.mjs · catálogo de habilidades
-- Ejecutar después de 001 y 002. Es idempotente.
insert into public.skills (slug, label, category) values
${rows}
on conflict (slug) do update set label = excluded.label, category = excluded.category;
`;

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log(`supabase/seed.sql generado (${SKILLS.length} habilidades)`);

// Archivo único para pegar en Supabase → SQL Editor (001 + 002 + 003 + catálogo).
import { readFileSync } from "node:fs";
const part = (p) => readFileSync(new URL(`../supabase/${p}`, import.meta.url), "utf8");
const setup = [
  "-- Puente Técnico · instalación completa (generado por scripts/gen-seed-sql.mjs).",
  "-- Pegar TODO en Supabase → SQL Editor → Run. Es idempotente: se puede ejecutar de nuevo.",
  "",
  part("migrations/001_schema.sql"),
  part("migrations/002_rls.sql"),
  part("migrations/003_create_challenge.sql"),
  sql,
].join("\n");
writeFileSync(new URL("../supabase/setup-completo.sql", import.meta.url), setup);
console.log("supabase/setup-completo.sql generado");
