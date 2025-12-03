import { Hono } from "hono";
import { cors } from "hono/cors"; // 👈 1. IMPORTANTE: Importamos CORS
import { connectDB } from "./config/mongo.ts";
import { initRedisSubscriber } from "./config/redisSubscriber.ts";
// Importamos el servicio del Cron Job (Resúmenes semanales)
import { startWeeklySummaryJob } from "./services/summaryService.ts"; 
import { 
  getPreferences, 
  setPreferences, 
  sendNotification, 
  getNotifications,
  initPreferences,
  handleRedisEvent
} from "./controllers/notificationsControllers.ts";

const app = new Hono();

// -------------------------------------------------
// 1. CONFIGURACIÓN DE SEGURIDAD (CORS)
// -------------------------------------------------
// 👇 Esto es vital para que tu Frontend (puerto 3000) pueda hablar 
// con este Backend (puerto 4000) en tu ordenador.
app.use('/*', cors({
  origin: '*', 
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  // credentials: true, // ⚠️ OJO: Con '*', los navegadores suelen prohibir 'credentials: true'.
                        // Si te da error en consola, borra esta línea o ponla en false.
}));

// -------------------------------------------------
// 2. CONEXIÓN A DEPENDENCIAS CRÍTICAS (DB, REDIS y CRON)
// -------------------------------------------------
// Solo intentamos conectar a DB y Redis si NO estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    console.log("✅ DB Conectada");
    
    // A. Inicializar el suscriptor de Redis (Event Driven)
    initRedisSubscriber(handleRedisEvent);

    // B. Inicializar el Cron Job (Lógica Serverless simulada)
    // Esto arrancará el reloj para enviar resúmenes los viernes
    startWeeklySummaryJob();
    
  }).catch(error => {
    console.error("❌ Error Crítico DB:", error);
    process.exit(1);
  });
} else {
    // Modo Test
    console.log("🟡 Modo Test: Saltando conexión a DB y Redis.");
}

// -------------------------------------------------
// 3. RUTAS
// -------------------------------------------------
// 👇 Ruta para integración con Users-Service (Pareja 1)
app.post("/preferences/init", initPreferences);

// Rutas de preferencias y notificaciones
app.get("/preferences/:userId", getPreferences);
app.post("/preferences", setPreferences);
app.post("/notifications", sendNotification);
app.get("/notifications/:userId", getNotifications);

// -------------------------------------------------
// 4. SERVER
// -------------------------------------------------
const port = process.env.PORT || 3000;
console.log(`🚀 Server is running on port ${port}`);

export default {
  app,
  port,
  fetch: app.fetch,
};