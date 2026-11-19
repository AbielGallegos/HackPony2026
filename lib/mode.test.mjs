// Pruebas de la validación de configuración (falla segura). Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSupabaseConfig } from "./mode.mjs";

const jwt = (role) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.firma`;
const URL_OK = "https://abcdefgh.supabase.co";

test("configuración válida con publishable key", () => {
  assert.equal(validateSupabaseConfig(URL_OK, "sb_publishable_abc123"), null);
});
test("configuración válida con anon key (JWT)", () => {
  assert.equal(validateSupabaseConfig(URL_OK, jwt("anon")), null);
});
test("faltan variables ⇒ error, nunca modo simulado", () => {
  assert.match(validateSupabaseConfig("", ""), /Faltan/);
  assert.match(validateSupabaseConfig(URL_OK, ""), /Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(validateSupabaseConfig("", "sb_publishable_x"), /Falta NEXT_PUBLIC_SUPABASE_URL/);
});
test("rechaza una llave SECRETA en la variable pública", () => {
  assert.match(validateSupabaseConfig(URL_OK, "sb_secret_abc"), /SECRETA/);
  assert.match(validateSupabaseConfig(URL_OK, jwt("service_role")), /service_role/);
});
test("rechaza URL inválida o sin https (salvo localhost)", () => {
  assert.match(validateSupabaseConfig("no-es-url", "sb_publishable_x"), /no es una URL/);
  assert.match(validateSupabaseConfig("http://abc.supabase.co", "sb_publishable_x"), /https/);
  assert.equal(validateSupabaseConfig("http://localhost:54321", "sb_publishable_x"), null);
});
test("rechaza llaves con formato desconocido", () => {
  assert.match(validateSupabaseConfig(URL_OK, "cualquier-cosa"), /sb_publishable_/);
  assert.match(validateSupabaseConfig(URL_OK, jwt("authenticated")), /anon key válida/);
});
