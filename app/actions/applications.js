"use server";
// Postulación en un clic y estado de la postulación (dueño: José).
// El % se calcula AQUÍ, en el servidor. El navegador solo envía el id del reto.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth.mjs";
import * as q from "@/lib/queries.mjs";
import { computeMatch } from "@/lib/matching.mjs";
import { safe } from "@/lib/action-helpers.mjs";
import { ValidationError, oneOf, id } from "@/lib/validation.mjs";

export async function applyToChallenge(challengeId) {
  return safe(async () => {
    const user = await requireRole("student");
    const challenge = await q.getChallenge(id(challengeId, "Reto"));
    if (!challenge) throw new ValidationError("El reto no existe.");
    if (challenge.status !== "open") throw new ValidationError("Este reto ya no recibe postulaciones.");
    const student = await q.getStudent(user.id);
    const match = computeMatch(student?.skills ?? [], challenge.skills);
    if (!match) throw new ValidationError("Este reto no tiene requisitos definidos.");
    const { duplicate } = await q.insertApplication({ challengeId: challenge.id, studentId: user.id, score: match.score });
    revalidatePath("/retos", "layout");
    revalidatePath("/perfil");
    return { duplicate, score: match.score };
  });
}

export async function setApplicationStatus(applicationId, status, challengeId) {
  return safe(async () => {
    const user = await requireRole("company");
    await q.updateApplicationStatus({
      applicationId: id(applicationId, "Postulación"),
      companyId: user.id,
      status: oneOf(status, ["postulado", "en_revision", "seleccionado", "descartado"], "El estado"),
    });
    revalidatePath(`/retos/${id(challengeId, "Reto")}`);
  });
}
