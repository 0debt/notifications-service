import { Hono } from "hono";
import { cors } from "hono/cors";
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

// Si ya creaste el archivo de Redis, descomenta la siguiente línea:
// import { initRedisListener } from "./services/redisListener.ts";

const app = new Hono();

// 1. SEGURIDAD (CORS)
if (process.env.NODE_ENV === 'production') {
  app.use('*', cors({ origin: 'https://api-gateway.0debt.xyz', credentials: true }));
} else {
  app.use('*', cors());
}

// 2. CONEXIÓN A DEPENDENCIAS CRÍTICAS (DB y REDIS)
// CRÍTICO: Solo intentamos conectar a DB y Redis si NO estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  // Conexión a Base de Datos
  connectDB().then(() => {
    console.log("DB Conectada");
    
    // Inicializar el suscriptor de Redis solo después de que la DB esté conectada
    // Esto es importante para que el servicio no empiece a procesar eventos
    // antes de poder guardar las notificaciones en Mongo.
    initRedisSubscriber(handleRedisEvent);
    
  }).catch(error => {
    console.error("Error DB:", error);
    process.exit(1);
  });
} else {
    // Modo Test
    console.log("🟡 Modo Test: Saltando conexión a DB y Redis.");
}

// 3. RUTAS
// 👇 ESTA ES LA RUTA NUEVA PARA LA PAREJA 1
app.post("/preferences/init", initPreferences);

// Rutas anteriores
app.get("/preferences/:userId", getPreferences);
app.post("/preferences", setPreferences);
app.post("/notifications", sendNotification);
app.get("/notifications/:userId", getNotifications);

// SERVER
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

export default {
  app,
  port,
  fetch: app.fetch,
};