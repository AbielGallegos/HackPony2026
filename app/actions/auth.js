"use server";
// Inicio de sesión, registro y cierre de sesión (dueño: Abiel).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocal } from "@/lib/mode.mjs";
import { createClient } from "@/lib/supabase/server.mjs";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth.mjs";
import { store } from "@/lib/local-store.mjs";
import { resetLocalDemo } from "@/lib/queries.mjs";
import { safe, safeNext } from "@/lib/action-helpers.mjs";
import { ValidationError, text, oneOf } from "@/lib/validation.mjs";

const home = (role) => (role === "company" ? "/empresa" : "/retos");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function signIn(_prev, formData) {
  let target;
  const res = await safe(async () => {
    if (isLocal) {
      const id = String(formData.get("demo") ?? "");
      const p = store().profiles.find((x) => x.id === id);
      if (!p) throw new ValidationError("Elige una cuenta de demostración.");
      (await cookies()).set(LOCAL_SESSION_COOKIE, p.id, { httpOnly: true, sameSite: "lax", path: "/" });
      target = safeNext(formData.get("next"), home(p.role));
      return;
    }
    const email = text(formData, "email", { label: "El correo", required: true, max: 200 });
    const password = String(formData.get("password") ?? "");
    if (!EMAIL_RE.test(email) || !password) throw new ValidationError("Escribe tu correo y tu contraseña.");
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Solo en el log del servidor (Vercel → Logs); al usuario no se le revela la causa.
      console.error("[signIn]", error.status, error.code, error.message);
      throw new ValidationError("Correo o contraseña incorrectos.");
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    target = safeNext(formData.get("next"), home(profile?.role));
  });
  if (!res.ok) return res;
  revalidatePath("/", "layout");
  redirect(target);
}

export async function signUp(_prev, formData) {
  let target;
  const res = await safe(async () => {
    if (isLocal) throw new ValidationError("El registro requiere Supabase. En modo local usa una cuenta de demostración.");
    const role = oneOf(String(formData.get("role") ?? ""), ["student", "company"], "El tipo de cuenta");
    const display_name = text(formData, "display_name", { label: role === "company" ? "El nombre de la empresa" : "Tu nombre", required: true, min: 2, max: 80 });
    const email = text(formData, "email", { label: "El correo", required: true, max: 200 });
    if (!EMAIL_RE.test(email)) throw new ValidationError("El correo no es válido.");
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) throw new ValidationError("La contraseña debe tener al menos 8 caracteres.");

    const supabase = await createClient();
    // El rol viaja como metadato y el trigger handle_new_user lo valida (solo student|company).
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { role, display_name } } });
    if (error) {
      if (/already|registered/i.test(error.message)) throw new ValidationError("Ya existe una cuenta con ese correo.");
      if (/rate limit/i.test(error.message)) throw new ValidationError("Supabase limitó los registros por correo. Desactiva 'Confirm email' o usa una cuenta demo.");
      throw new ValidationError("No se pudo crear la cuenta: " + error.message);
    }
    if (!data.session) return { message: "Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión." };
    target = role === "company" ? "/empresa" : "/perfil?bienvenida=1";
  });
  if (!res.ok || !target) return res;
  revalidatePath("/", "layout");
  redirect(target);
}

export async function signOut() {
  if (isLocal) (await cookies()).delete(LOCAL_SESSION_COOKIE);
  else await (await createClient()).auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetDemo() {
  if (!isLocal) redirect("/login"); // solo existe en el modo local de desarrollo
  resetLocalDemo();
  revalidatePath("/", "layout");
  redirect("/login?reiniciado=1");
}
