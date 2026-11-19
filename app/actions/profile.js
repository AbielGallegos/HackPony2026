"use server";
// Perfil del estudiante: datos, habilidades, proyectos y evidencia de GitHub (dueño: Abiel).
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth.mjs";
import * as q from "@/lib/queries.mjs";
import { safe } from "@/lib/action-helpers.mjs";
import { ValidationError, text, int, httpsUrl, skillList, id } from "@/lib/validation.mjs";
import { fetchGitHubPortfolio, isValidGitHubUser } from "@/lib/github.mjs";

function refresh(userId) {
  revalidatePath("/perfil");
  revalidatePath(`/estudiantes/${userId}`);
  revalidatePath("/retos", "layout");
}

export async function updateProfile(_prev, formData) {
  return safe(async () => {
    const user = await requireRole("student");
    await q.updateStudentProfile(user.id, {
      display_name: text(formData, "display_name", { label: "El nombre", required: true, min: 2, max: 80 }),
      university: text(formData, "university", { label: "La universidad", max: 120 }),
      career: text(formData, "career", { label: "La carrera", max: 120 }),
      semester: int(formData, "semester", { label: "El semestre", min: 1, max: 14 }),
      city: text(formData, "city", { label: "La ciudad", max: 80 }),
      bio: text(formData, "bio", { label: "La descripción", max: 500 }),
    });
    refresh(user.id);
    return { message: "Perfil guardado." };
  });
}

export async function addSkill(_prev, formData) {
  return safe(async () => {
    const user = await requireRole("student");
    const [slug] = skillList([formData.get("skill")], "Habilidad");
    if (!slug) throw new ValidationError("Elige una habilidad del catálogo.");
    await q.addStudentSkill(user.id, slug);
    refresh(user.id);
  });
}

export async function removeSkill(slug) {
  return safe(async () => {
    const user = await requireRole("student");
    const [s] = skillList([slug], "Habilidad");
    await q.removeStudentSkill(user.id, s);
    refresh(user.id);
  });
}

export async function addProject(_prev, formData) {
  return safe(async () => {
    const user = await requireRole("student");
    const project = {
      title: text(formData, "title", { label: "El nombre del proyecto", required: true, min: 3, max: 120 }),
      description: text(formData, "description", { label: "La descripción", max: 300 }),
      repo_url: httpsUrl(formData, "repo_url", { label: "El enlace al repositorio" }),
      demo_url: httpsUrl(formData, "demo_url", { label: "El enlace a la demo" }),
    };
    if (!project.repo_url && !project.demo_url) throw new ValidationError("Agrega al menos un enlace (repositorio o demo) para que la empresa pueda revisarlo.");
    await q.addProject(user.id, project);
    refresh(user.id);
    return { message: "Proyecto agregado." };
  });
}

export async function removeProject(projectId) {
  return safe(async () => {
    const user = await requireRole("student");
    await q.removeProject(user.id, id(projectId, "Proyecto"));
    refresh(user.id);
  });
}

/** P1: lee repos públicos y registra cuántos respaldan cada habilidad. No cambia el %, solo desempata. */
export async function syncGitHub(_prev, formData) {
  return safe(async () => {
    const user = await requireRole("student");
    const username = String(formData.get("username") ?? "").trim().replace(/^@/, "");
    if (!isValidGitHubUser(username)) throw new ValidationError("Escribe un usuario de GitHub válido.");
    let gh;
    try {
      gh = await fetchGitHubPortfolio(username);
    } catch (e) {
      throw new ValidationError(e.message);
    }
    await q.saveGitHubEvidence(user.id, { username: gh.username, skills: gh.skills, projects: gh.projects });
    refresh(user.id);
    return { message: `${gh.repoCount} repositorios públicos revisados · ${gh.skills.length} habilidades con evidencia.` };
  });
}
