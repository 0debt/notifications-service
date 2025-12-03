import { Hono } from "hono";
import { connectDB } from "./config/mongo.ts";
import { initRedisSubscriber } from "./config/redisSubscriber.ts";
//Importamos el servicio del Cron Job (Resúmenes semanales)
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
// NOTA: Hemos eliminado CORS porque ahora el API Gateway
// se encarga de la seguridad perimetral. Nosotros solo
// recibimos tráfico interno de confianza.
// -------------------------------------------------

// 1. CONEXIÓN A DEPENDENCIAS CRÍTICAS (DB, REDIS y CRON)
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

// 2. RUTAS
// 👇 Ruta para integración con Users-Service (Pareja 1)
app.post("/preferences/init", initPreferences);

// Rutas de preferencias y notificaciones
app.get("/preferences/:userId", getPreferences);
app.post("/preferences", setPreferences);
app.post("/notifications", sendNotification);
app.get("/notifications/:userId", getNotifications);

// 3. SERVER
const port = process.env.PORT || 3000;
console.log(` Server is running on port ${port}`);

export default {
  app,
  port,
  fetch: app.fetch,
};