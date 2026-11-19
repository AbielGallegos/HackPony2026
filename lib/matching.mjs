// SkillMatch · motor de compatibilidad (dueño: José)
//
//   compat = 80 · (obligatorias cumplidas / obligatorias)  +  20 · (deseables cumplidas / deseables)
//   Si el reto no tiene deseables:  compat = 100 · (obligatorias cumplidas / obligatorias)
//
// Reglas:
//  • Función pura: mismos datos ⇒ mismo resultado. Solo se ejecuta en el servidor.
//  • La evidencia de GitHub NO cambia el %. Se informa aparte y sirve para desempatar.
//  • Un reto sin habilidades obligatorias es inválido ⇒ devuelve null.

export const WEIGHTS = { required: 80, nice: 20 };
export const RECOMMENDED_REQUIRED_RATIO = 0.75; // "Recomendados": cumple ≥ 75% de las obligatorias

/**
 * @param {{slug:string, evidence_count?:number}[]} studentSkills
 * @param {{slug:string, is_required:boolean}[]} challengeSkills
 */
export function computeMatch(studentSkills = [], challengeSkills = []) {
  // Normaliza y elimina duplicados (si una habilidad viene repetida, cuenta una vez).
  const required = [...new Set(challengeSkills.filter((s) => s.is_required).map((s) => s.slug))];
  const nice = [...new Set(challengeSkills.filter((s) => !s.is_required).map((s) => s.slug))].filter((s) => !required.includes(s));
  if (required.length === 0) return null;

  const evidence = new Map();
  for (const s of studentSkills ?? []) {
    evidence.set(s.slug, Math.max(evidence.get(s.slug) ?? 0, Number(s.evidence_count) || 0));
  }

  const matched = [];
  const missing = [];
  const check = (slugs, isRequired) => {
    let met = 0;
    for (const slug of slugs) {
      if (evidence.has(slug)) {
        met++;
        matched.push({ slug, is_required: isRequired, has_evidence: evidence.get(slug) > 0 });
      } else {
        missing.push({ slug, is_required: isRequired });
      }
    }
    return met;
  };

  const requiredMet = check(required, true);
  const niceMet = check(nice, false);

  const raw =
    nice.length > 0
      ? WEIGHTS.required * (requiredMet / required.length) + WEIGHTS.nice * (niceMet / nice.length)
      : 100 * (requiredMet / required.length);

  return {
    score: Math.round(raw),
    requiredMet,
    requiredTotal: required.length,
    niceMet,
    niceTotal: nice.length,
    meetsAllRequired: requiredMet === required.length,
    recommended: requiredMet / required.length >= RECOMMENDED_REQUIRED_RATIO,
    evidenceMatches: matched.filter((m) => m.has_evidence).length,
    profileEmpty: (studentSkills ?? []).length === 0,
    matched,
    missing,
  };
}

/**
 * Ordena candidatos de forma determinista:
 * 1) % desc  2) obligatorias cumplidas desc  3) habilidades con evidencia desc
 * 4) fecha de postulación asc (el primero gana)  5) id asc
 * @param {{student_id:string, applied_at?:string, match:ReturnType<typeof computeMatch>}[]} candidates
 */
export function rankCandidates(candidates) {
  return [...candidates].sort(
    (a, b) =>
      (b.match?.score ?? -1) - (a.match?.score ?? -1) ||
      (b.match?.requiredMet ?? 0) - (a.match?.requiredMet ?? 0) ||
      (b.match?.evidenceMatches ?? 0) - (a.match?.evidenceMatches ?? 0) ||
      String(a.applied_at ?? "9999").localeCompare(String(b.applied_at ?? "9999")) ||
      String(a.student_id).localeCompare(String(b.student_id))
  );
}

/** Colores del semáforo de compatibilidad (los mismos en toda la app). */
export function scoreTone(score) {
  if (score >= 75) return { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", bar: "bg-emerald-500", label: "Alta" };
  if (score >= 50) return { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200", bar: "bg-amber-500", label: "Media" };
  return { text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200", bar: "bg-slate-400", label: "Baja" };
}
