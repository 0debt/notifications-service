import { Hono } from "hono";
import { connectDB } from "./config/mongo.ts";
import { initRedisSubscriber } from "./config/redisSubscriber.ts";
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

// 1. CONEXIÓN A DEPENDENCIAS CRÍTICAS (DB y REDIS)
// Solo intentamos conectar a DB y Redis si NO estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  // Conexión a Base de Datos
  connectDB().then(() => {
    console.log(" DB Conectada");
    
    // Inicializar el suscriptor de Redis solo después de que la DB esté conectada
    // Esto es importante para que el servicio no empiece a procesar eventos
    // antes de poder guardar las notificaciones en Mongo.
    initRedisSubscriber(handleRedisEvent);
    
  }).catch(error => {
    console.error(" Error Crítico DB:", error);
    process.exit(1);
  });
} else {
    // Modo Test
    console.log(" Modo Test: Saltando conexión a DB y Redis.");
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