// Genera una contraseña aleatoria fuerte para las cuentas demo y la guarda en .env.local
// SIN imprimirla. Uso: npm run demo:password
// Para verla (solo quien prepara la demo), abre .env.local en tu editor.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const file = new URL("../.env.local", import.meta.url);
const current = existsSync(file) ? readFileSync(file, "utf8") : "";

if (/^DEMO_PASSWORD=.+$/m.test(current) && !process.argv.includes("--renovar")) {
  console.log("Ya existe DEMO_PASSWORD en .env.local. Para cambiarla: npm run demo:password -- --renovar");
  process.exit(0);
}

// 20 caracteres: letras y números (fácil de escribir en un celular), con al menos una mayúscula, minúscula y dígito.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
let pwd;
do {
  pwd = [...randomBytes(20)].map((b) => alphabet[b % alphabet.length]).join("");
} while (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/\d/.test(pwd));

const line = `DEMO_PASSWORD=${pwd}`;
const next = /^DEMO_PASSWORD=.*$/m.test(current)
  ? current.replace(/^DEMO_PASSWORD=.*$/m, line)
  : `${current}${current && !current.endsWith("\n") ? "\n" : ""}${line}\n`;
writeFileSync(file, next);
console.log("Listo: DEMO_PASSWORD guardada en .env.local (20 caracteres). No se mostró en pantalla.");
console.log("Después corre: npm run seed:demo  (para aplicarla a las cuentas demo de Supabase)");
