"use server";
// Publicar y cerrar retos (dueño: José).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth.mjs";
import * as q from "@/lib/queries.mjs";
import { safe } from "@/lib/action-helpers.mjs";
import { ValidationError, text, int, oneOf, skillList, id } from "@/lib/validation.mjs";

export async function createChallenge(_prev, formData) {
  let newId;
  const res = await safe(async () => {
    const user = await requireRole("company");
    const required = skillList(formData.getAll("required"), "Habilidad obligatoria");
    const nice = skillList(formData.getAll("nice"), "Habilidad deseable").filter((s) => !required.includes(s));
    if (required.length < 1) throw new ValidationError("Selecciona al menos una habilidad obligatoria.");
    if (required.length + nice.length < 2) throw new ValidationError("Selecciona al menos 2 habilidades en total para que el % sea significativo.");
    if (required.length + nice.length > 8) throw new ValidationError("Máximo 8 habilidades por reto.");
    newId = await q.insertChallenge({
      companyId: user.id,
      title: text(formData, "title", { label: "El título", required: true, min: 5, max: 120 }),
      description: text(formData, "description", { label: "La descripción", max: 1000 }),
      reward_mxn: int(formData, "reward_mxn", { label: "El pago", min: 0, max: 1000000 }) ?? 0,
      duration: oneOf(String(formData.get("duration") ?? "2 semanas"), ["1 semana", "2 semanas", "3 semanas", "4 semanas"], "La duración"),
      modality: oneOf(String(formData.get("modality") ?? "Remoto"), ["Remoto", "Híbrido", "Presencial"], "La modalidad"),
      required,
      nice,
    });
  });
  if (!res.ok) return res;
  revalidatePath("/retos", "layout");
  revalidatePath("/empresa");
  redirect(`/retos/${newId}?nuevo=1`);
}

export async function setChallengeStatus(challengeId, status) {
  return safe(async () => {
    const user = await requireRole("company");
    await q.updateChallengeStatus({ challengeId: id(challengeId, "Reto"), companyId: user.id, status: oneOf(status, ["open", "closed"], "El estado") });
    revalidatePath("/retos", "layout");
    revalidatePath("/empresa");
  });
}
