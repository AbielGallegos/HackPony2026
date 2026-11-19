// Validación de entradas en el servidor (dueño: Abiel).
// Nunca confiar en lo que llega del formulario: se valida aquí y la base vuelve a validar con CHECKs.
import { isSkill } from "./skills.mjs";

export class ValidationError extends Error {}

const str = (v) => (v == null ? "" : String(v)).trim();

export function text(formData, name, { label, min = 0, max = 200, required = false } = {}) {
  const v = str(formData.get(name));
  if (!v && required) throw new ValidationError(`${label} es obligatorio.`);
  if (v && v.length < min) throw new ValidationError(`${label} debe tener al menos ${min} caracteres.`);
  if (v.length > max) throw new ValidationError(`${label} admite máximo ${max} caracteres.`);
  return v || null;
}

export function int(formData, name, { label, min, max, required = false } = {}) {
  const raw = str(formData.get(name));
  if (!raw) {
    if (required) throw new ValidationError(`${label} es obligatorio.`);
    return null;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new ValidationError(`${label} debe ser un número entre ${min} y ${max}.`);
  return n;
}

export function httpsUrl(formData, name, { label } = {}) {
  const v = str(formData.get(name));
  if (!v) return null;
  let u;
  try {
    u = new URL(v);
  } catch {
    throw new ValidationError(`${label} no es un enlace válido.`);
  }
  if (u.protocol !== "https:") throw new ValidationError(`${label} debe empezar con https://`);
  if (v.length > 300) throw new ValidationError(`${label} es demasiado largo.`);
  return u.toString();
}

export function oneOf(value, options, label) {
  if (!options.includes(value)) throw new ValidationError(`${label} no es válido.`);
  return value;
}

export function skillList(values, label) {
  const list = [...new Set(values.map(str).filter(Boolean))];
  for (const s of list) if (!isSkill(s)) throw new ValidationError(`${label}: "${s}" no está en el catálogo.`);
  return list;
}

export const UUID_OR_KEY = /^[a-zA-Z0-9-]{1,64}$/;
export function id(value, label = "Identificador") {
  const v = str(value);
  if (!UUID_OR_KEY.test(v)) throw new ValidationError(`${label} inválido.`);
  return v;
}
