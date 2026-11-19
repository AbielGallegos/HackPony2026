// Datos de demostración (FICTICIOS) con contexto de Michoacán.
// Fuente única para: scripts/seed-demo.mjs (Supabase) y el modo local de respaldo.
// Cada registro tiene una "key" estable; los ids reales los asigna Supabase.

// La contraseña de las cuentas demo NO vive en el código: se lee de DEMO_PASSWORD en .env.local
// (generada con `npm run demo:password`). Así no se publica en GitHub ni en Vercel.
const mail = (k) => `${k}@demo.puentetecnico.mx`;

export const companies = [
  { key: "tecnomich", company_name: "TecnoMich Soluciones", sector: "Desarrollo de software", city: "Morelia", description: "Fábrica de software para PyMEs del Bajío." },
  { key: "aguacates", company_name: "Aguacates del Valle", sector: "Agroexportación", city: "Uruapan", description: "Empacadora y exportadora de aguacate Hass." },
  { key: "cafe", company_name: "Café La Catedral", sector: "Restaurantes", city: "Morelia (Centro)", description: "Cafetería con 3 sucursales en el Centro Histórico." },
  { key: "clinica", company_name: "Clínica Santa Rosa", sector: "Salud", city: "Morelia", description: "Clínica privada con 12 consultorios." },
  { key: "paracho", company_name: "Guitarras Paracho Online", sector: "Artesanía / e-commerce", city: "Paracho", description: "Taller familiar que quiere vender guitarras a todo el país." },
  { key: "puerto", company_name: "Logística Lázaro Cárdenas", sector: "Logística portuaria", city: "Lázaro Cárdenas", description: "Agencia de carga en el puerto de Lázaro Cárdenas." },
].map((c) => ({ ...c, email: mail(c.key), website_url: null }));

const sk = (...slugs) => slugs.map((slug) => ({ slug, evidence_count: 0 }));

export const students = [
  { key: "ana", display_name: "Ana Ramírez", university: "Tecnológico de Morelia", career: "Ing. en Sistemas Computacionales", semester: 7, city: "Morelia", bio: "Me gusta construir interfaces útiles. Busco mi primera experiencia real.", skills: sk("javascript", "react", "css", "html", "git"), projects: [{ title: "Control de biblioteca del salón", description: "CRUD en React para la biblioteca del grupo." }] },
  { key: "diego", display_name: "Diego Herrera", university: "Tecnológico de Morelia", career: "Ing. en Sistemas Computacionales", semester: 9, city: "Morelia", bio: "Backend y bases de datos. Hice mi residencia en una ferretería.", skills: sk("node", "sql", "apis", "postgresql", "docker", "javascript"), projects: [{ title: "API de inventario para ferretería", description: "Express + PostgreSQL con autenticación." }] },
  { key: "mariana", display_name: "Mariana López", university: "UMSNH", career: "Ing. en TIC", semester: 8, city: "Morelia", bio: "Ciencia de datos aplicada al campo michoacano.", skills: sk("python", "pandas", "ml", "sql"), projects: [{ title: "Clasificador de calibres de aguacate", description: "Modelo con scikit-learn sobre fotos de lotes." }] },
  { key: "jorge", display_name: "Jorge Pérez", university: "Tecnológico Superior de Uruapan", career: "Ing. Informática", semester: 6, city: "Uruapan", bio: "Apps móviles que funcionen aunque no haya señal.", skills: sk("flutter", "dart", "firebase", "kotlin"), projects: [] },
  { key: "sofia", display_name: "Sofía Torres", university: "UVAQ", career: "Ing. en Sistemas Computacionales", semester: 8, city: "Morelia", bio: "Full-stack con Next.js. Diseño en Figma antes de programar.", skills: sk("react", "nextjs", "tailwind", "typescript", "figma", "node"), projects: [{ title: "Tienda de artesanías", description: "E-commerce con Next.js y pagos de prueba." }] },
  { key: "luis", display_name: "Luis Medina", university: "Universidad Tecnológica de Morelia", career: "Ing. en Redes", semester: 5, city: "Morelia", bio: "Redes, Linux y seguridad. CCNA en proceso.", skills: sk("redes", "linux", "ciberseguridad", "python"), projects: [] },
  { key: "valeria", display_name: "Valeria Cruz", university: "Tecnológico de Morelia", career: "Ing. en TIC", semester: 7, city: "Pátzcuaro", bio: "Front-end y accesibilidad web.", skills: sk("html", "css", "javascript", "figma", "vue"), projects: [{ title: "Menú digital de la cafetería del Tec", description: "Sitio responsive con QR." }] },
  { key: "raul", display_name: "Raúl Sandoval", university: "UMSNH", career: "Ing. en Sistemas Computacionales", semester: 10, city: "Morelia", bio: "Me gustan los datos y automatizar tareas aburridas.", skills: sk("python", "sql", "apis", "postgresql"), projects: [{ title: "Scraper de precios de insumos", description: "Python + cron, reporte diario." }] },
  { key: "fernanda", display_name: "Fernanda Ruiz", university: "Tecnológico de Morelia", career: "Ing. Informática", semester: 6, city: "Morelia", bio: "Aprendiendo backend con Java y bases de datos.", skills: sk("java", "sql", "git"), projects: [] },
  { key: "emilio", display_name: "Emilio Vargas", university: "Tecnológico Superior de Uruapan", career: "Ing. en Sistemas Computacionales", semester: 8, city: "Uruapan", bio: "Mapas, APIs y visualización de datos.", skills: sk("javascript", "apis", "react", "python"), projects: [{ title: "Mapa interactivo de huertas", description: "Leaflet + API de clima." }] },
  { key: "karla", display_name: "Karla Mendoza", university: "UVAQ", career: "Ing. en TIC", semester: 9, city: "Morelia", bio: "PHP y MySQL para negocios locales.", skills: sk("php", "sql", "html", "css", "javascript"), projects: [] },
  { key: "andres", display_name: "Andrés Silva", university: "Tecnológico de Morelia", career: "Ing. en Sistemas Computacionales", semester: 7, city: "Zamora", bio: "DevOps curioso: Docker, Linux y Node.", skills: sk("docker", "linux", "node", "git"), projects: [] },
].map((s) => ({ ...s, email: mail(s.key), github_username: null }));

export const challenges = [
  { key: "r01", company: "tecnomich", title: "Dashboard de ventas en React", description: "Construir un tablero con gráficas de ventas mensuales consumiendo nuestra API existente.", required: ["react", "javascript", "css"], nice: ["node", "sql"], duration: "2 semanas", reward_mxn: 6000, modality: "Remoto", created_at: "2026-11-10T16:00:00Z" },
  { key: "r02", company: "tecnomich", title: "API REST de inventarios", description: "Endpoints CRUD para inventario de ferreterías clientes, con autenticación básica.", required: ["node", "sql", "apis"], nice: ["docker", "postgresql"], duration: "3 semanas", reward_mxn: 8000, modality: "Híbrido", created_at: "2026-11-12T16:00:00Z" },
  { key: "r03", company: "aguacates", title: "Predecir calidad de lotes de aguacate", description: "Analizar datos históricos de cosecha y proponer un modelo simple para clasificar calidad de exportación.", required: ["python", "pandas"], nice: ["ml", "sql"], duration: "4 semanas", reward_mxn: 10000, modality: "Remoto", created_at: "2026-11-08T16:00:00Z" },
  { key: "r04", company: "aguacates", title: "App de registro de cosecha sin internet", description: "App móvil para que los cortadores registren cajas aunque no haya señal en la huerta.", required: ["flutter", "dart"], nice: ["firebase"], duration: "4 semanas", reward_mxn: 12000, modality: "Presencial (Uruapan)", created_at: "2026-11-14T16:00:00Z" },
  { key: "r05", company: "cafe", title: "Menú digital con QR y pedidos", description: "Menú web responsive accesible por QR, con carrito y envío del pedido a cocina.", required: ["html", "css", "javascript"], nice: ["react", "firebase"], duration: "1 semana", reward_mxn: 3500, modality: "Remoto", created_at: "2026-11-15T16:00:00Z" },
  { key: "r06", company: "cafe", title: "Automatizar el inventario de insumos", description: "Script que lea ventas diarias y avise cuando falte café, leche o pan.", required: ["python", "sql"], nice: ["apis"], duration: "1 semana", reward_mxn: 3000, modality: "Remoto", created_at: "2026-11-16T16:00:00Z" },
  { key: "r07", company: "clinica", title: "Recordatorios de citas por WhatsApp", description: "Servicio que envíe recordatorios automáticos a pacientes 24 h antes de su cita.", required: ["node", "apis"], nice: ["sql", "docker"], duration: "2 semanas", reward_mxn: 7000, modality: "Remoto", created_at: "2026-11-11T16:00:00Z" },
  { key: "r08", company: "clinica", title: "Migrar expedientes a PostgreSQL", description: "Diseñar el esquema y migrar expedientes desde hojas de Excel a una base de datos.", required: ["sql", "postgresql"], nice: ["python"], duration: "3 semanas", reward_mxn: 9000, modality: "Híbrido", created_at: "2026-11-09T16:00:00Z" },
  { key: "r09", company: "paracho", title: "Tienda en línea de guitarras", description: "Catálogo con fotos, carrito y pagos en línea para vender a todo México.", required: ["react", "nextjs"], nice: ["tailwind", "node", "figma"], duration: "3 semanas", reward_mxn: 9500, modality: "Remoto", created_at: "2026-11-17T16:00:00Z" },
  { key: "r10", company: "puerto", title: "Mapa de rastreo de contenedores", description: "Visualizar en un mapa la ubicación y estatus de contenedores usando la API de la naviera.", required: ["javascript", "apis"], nice: ["react", "python"], duration: "2 semanas", reward_mxn: 7500, modality: "Remoto", created_at: "2026-11-13T16:00:00Z" },
  { key: "r11", company: "puerto", title: "Red y seguridad básica de oficina", description: "Auditar y documentar la red de la oficina, segmentar el Wi-Fi de invitados y endurecer equipos.", required: ["redes", "linux"], nice: ["ciberseguridad"], duration: "1 semana", reward_mxn: 5000, modality: "Presencial (Lázaro Cárdenas)", created_at: "2026-11-18T16:00:00Z" },
].map((c) => ({ ...c, status: "open" }));

export const applications = [
  { challenge: "r02", student: "diego", status: "en_revision", created_at: "2026-11-13T18:00:00Z" },
  { challenge: "r02", student: "andres", status: "postulado", created_at: "2026-11-13T21:00:00Z" },
  { challenge: "r02", student: "fernanda", status: "postulado", created_at: "2026-11-14T15:00:00Z" },
  { challenge: "r03", student: "mariana", status: "postulado", created_at: "2026-11-09T17:00:00Z" },
  { challenge: "r03", student: "raul", status: "postulado", created_at: "2026-11-10T17:00:00Z" },
  { challenge: "r09", student: "sofia", status: "postulado", created_at: "2026-11-18T16:00:00Z" },
  { challenge: "r05", student: "valeria", status: "postulado", created_at: "2026-11-16T16:00:00Z" },
  { challenge: "r05", student: "karla", status: "postulado", created_at: "2026-11-16T18:00:00Z" },
];
