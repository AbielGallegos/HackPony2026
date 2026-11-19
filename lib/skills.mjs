// Catálogo de habilidades (fuente única).
// Se usa para: generar supabase/seed.sql, el modo local y normalizar lo que llega de GitHub.
// El slug es la llave en toda la app y en la base de datos.

export const SKILLS = [
  { slug: "javascript", label: "JavaScript", category: "Lenguaje", aliases: ["js", "ecmascript"] },
  { slug: "typescript", label: "TypeScript", category: "Lenguaje", aliases: ["ts"] },
  { slug: "python", label: "Python", category: "Lenguaje", aliases: ["py", "jupyter notebook"] },
  { slug: "java", label: "Java", category: "Lenguaje", aliases: [] },
  { slug: "csharp", label: "C#", category: "Lenguaje", aliases: ["c#", "dotnet", ".net"] },
  { slug: "cpp", label: "C++", category: "Lenguaje", aliases: ["c++"] },
  { slug: "php", label: "PHP", category: "Lenguaje", aliases: ["laravel"] },
  { slug: "dart", label: "Dart", category: "Lenguaje", aliases: [] },
  { slug: "kotlin", label: "Kotlin", category: "Lenguaje", aliases: [] },
  { slug: "go", label: "Go", category: "Lenguaje", aliases: ["golang"] },
  { slug: "html", label: "HTML", category: "Web", aliases: ["html5"] },
  { slug: "css", label: "CSS", category: "Web", aliases: ["css3", "scss", "sass"] },
  { slug: "react", label: "React", category: "Web", aliases: ["reactjs", "react.js"] },
  { slug: "nextjs", label: "Next.js", category: "Web", aliases: ["next.js"] },
  { slug: "vue", label: "Vue", category: "Web", aliases: ["vuejs", "vue.js"] },
  { slug: "tailwind", label: "Tailwind", category: "Web", aliases: ["tailwindcss"] },
  { slug: "node", label: "Node.js", category: "Backend", aliases: ["nodejs", "node.js", "express", "expressjs"] },
  { slug: "apis", label: "APIs REST", category: "Backend", aliases: ["rest-api", "api-rest"] },
  { slug: "flutter", label: "Flutter", category: "Móvil", aliases: [] },
  { slug: "sql", label: "SQL", category: "Datos", aliases: ["mysql", "tsql", "sql-server", "sqlserver"] },
  { slug: "postgresql", label: "PostgreSQL", category: "Datos", aliases: ["postgres", "supabase", "plpgsql"] },
  { slug: "mongodb", label: "MongoDB", category: "Datos", aliases: ["mongo"] },
  { slug: "firebase", label: "Firebase", category: "Datos", aliases: [] },
  { slug: "pandas", label: "Pandas", category: "Datos", aliases: [] },
  { slug: "ml", label: "Machine Learning", category: "Datos", aliases: ["machine-learning", "scikit-learn", "tensorflow", "pytorch"] },
  { slug: "docker", label: "Docker", category: "DevOps", aliases: ["dockerfile"] },
  { slug: "linux", label: "Linux", category: "DevOps", aliases: [] },
  { slug: "git", label: "Git", category: "DevOps", aliases: [] },
  { slug: "figma", label: "Figma / UI", category: "Diseño", aliases: ["ui-ux"] },
  { slug: "redes", label: "Redes", category: "Infraestructura", aliases: ["networking", "cisco"] },
  { slug: "ciberseguridad", label: "Ciberseguridad", category: "Infraestructura", aliases: ["cybersecurity", "pentesting"] },
];

const BY_SLUG = new Map(SKILLS.map((s) => [s.slug, s]));
const ALIAS = new Map();
for (const s of SKILLS) {
  ALIAS.set(s.slug, s.slug);
  ALIAS.set(s.label.toLowerCase(), s.slug);
  for (const a of s.aliases) ALIAS.set(a.toLowerCase(), s.slug);
}

/** Convierte un texto ("Node.js", "nodejs", "TypeScript") en slug del catálogo, o null. */
export function normalizeSkill(raw) {
  if (raw == null) return null;
  return ALIAS.get(String(raw).trim().toLowerCase()) ?? null;
}

export const isSkill = (slug) => BY_SLUG.has(slug);
export const skillLabel = (slug) => BY_SLUG.get(slug)?.label ?? slug;

export const SKILL_OPTIONS = [...SKILLS]
  .map(({ slug, label, category }) => ({ slug, label, category }))
  .sort((a, b) => a.label.localeCompare(b.label, "es"));
