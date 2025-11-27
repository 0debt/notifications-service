import { Hono } from "hono";
import { cors } from "hono/cors";
import { connectDB } from "./config/mongo.ts";
import { 
  getPreferences, 
  setPreferences, 
  sendNotification, 
  getNotifications,
  initPreferences // <--- 1. ¡IMPORTANTE! Importamos la nueva función
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

// 2. CONEXIÓN A BASE DE DATOS
connectDB().then(() => {
  // Si tienes Redis configurado, descomenta esto:
  // initRedisListener();
  console.log("✅ DB Conectada");
}).catch(error => {
  console.error("❌ Error DB:", error);
  process.exit(1);
});

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