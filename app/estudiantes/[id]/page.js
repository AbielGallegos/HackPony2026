import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStudent } from "@/lib/queries.mjs";
import { getUser } from "@/lib/auth.mjs";
import { ProfileHeader, SkillsSection, ProjectsSection } from "@/components/StudentProfileView";

export default async function PerfilPublico({ params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/estudiantes/${id}`); // los portafolios solo se ven con sesión
  const student = await getStudent(id);
  if (!student) notFound();

  return (
    <div className="space-y-6">
      {user.id === id && (
        <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">
          Así ven las empresas tu portafolio. <Link href="/perfil" className="font-semibold underline">Editar mi perfil</Link>
        </p>
      )}
      <ProfileHeader student={student} />
      <SkillsSection student={student} />
      <ProjectsSection student={student} />
    </div>
  );
}
