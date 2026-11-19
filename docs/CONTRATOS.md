# Contratos compartidos

Cambiar algo de este archivo requiere avisar a los cuatro. Dueño: Cid.

## Tablas (Supabase / PostgreSQL)

| Tabla | Llave | Columnas |
| --- | --- | --- |
| `profiles` | `id` → `auth.users` | `role` (`student`\|`company`, inmutable), `display_name`, `created_at` |
| `students` | `id` → `profiles` | `university`, `career`, `semester` (1–14), `city`, `bio`, `github_username` |
| `companies` | `id` → `profiles` | `company_name`, `sector`, `city`, `description`, `website_url` |
| `skills` | `slug` | `label`, `category` (catálogo de `lib/skills.mjs`) |
| `student_skills` | (`student_id`, `skill_slug`) | `evidence_count` (repos públicos que la respaldan) |
| `portfolio_projects` | `id` | `student_id`, `title`, `description`, `repo_url`, `demo_url` (https), `language`, `stars`, `from_github` |
| `challenges` | `id` | `company_id`, `title`, `description`, `status` (`open`\|`closed`), `reward_mxn`, `duration`, `modality`, `created_at` |
| `challenge_skills` | (`challenge_id`, `skill_slug`) | `is_required` |
| `applications` | `id`, único (`challenge_id`, `student_id`) | `status` (`postulado`\|`en_revision`\|`seleccionado`\|`descartado`), `score_at_apply`, `created_at` |

Funciones SQL: `my_role()`, `owns_challenge(id)`, `applied_to(id)`, `public_stats()`, `create_challenge(...)`.

## Formas de datos que devuelve `lib/queries.mjs`

```js
Challenge = { id, company_id, title, description, status, reward_mxn, duration, modality, created_at,
              company: { id, company_name, sector, city },
              skills: [{ slug, is_required }] }

Student   = { id, display_name, university, career, semester, city, bio, github_username,
              skills: [{ slug, evidence_count }],
              projects: [{ id, title, description, repo_url, demo_url, language, stars, from_github }] }

Application = { id, challenge_id, student_id, status, score_at_apply, created_at }
User (getUser) = { id, role: "student"|"company", displayName, email } | null
```

## Matching (`lib/matching.mjs`)

```js
computeMatch(studentSkills, challengeSkills)
// → null si el reto no tiene obligatorias
// → { score, requiredMet, requiredTotal, niceMet, niceTotal, meetsAllRequired,
//     recommended /* ≥75% de obligatorias */, evidenceMatches, profileEmpty,
//     matched: [{ slug, is_required, has_evidence }], missing: [{ slug, is_required }] }

rankCandidates([{ student_id, applied_at, match }])
// orden: score ↓ · requiredMet ↓ · evidenceMatches ↓ · applied_at ↑ · student_id ↑
```

## Server Actions (`app/actions/*`)

Todas devuelven `{ ok: true, ... }` o `{ ok: false, error }`, salvo las que redirigen.

| Acción | Rol | Entrada |
| --- | --- | --- |
| `signIn`, `signUp`, `signOut` | — | FormData |
| `updateProfile`, `addSkill`, `addProject`, `syncGitHub` | student | FormData |
| `removeSkill(slug)`, `removeProject(id)` | student | argumentos |
| `applyToChallenge(challengeId)` | student | id del reto → `{ duplicate, score }` |
| `createChallenge` | company | FormData (`required[]`, `nice[]`) → redirige a `/retos/[id]?nuevo=1` |
| `setChallengeStatus(id, "open"\|"closed")` | company | argumentos |
| `setApplicationStatus(appId, status, challengeId)` | company | argumentos |

## Rutas

`/` · `/login` · `/registro` · `/retos` · `/retos/[id]` · `/estudiantes/[id]` · `/perfil` · `/empresa` · `/arquitectura`
