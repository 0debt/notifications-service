import { Hono } from "hono";
import { cors } from "hono/cors";
import { connectDB } from "./config/mongo.ts";
import { initRedisSubscriber } from "./config/redisSubscriber.ts";
import { startWeeklySummaryJob } from "./services/summaryService"; 
import { sendEmail } from "./services/emailService";
import { render } from "@react-email/render";
import WelcomeEmail from "./emails/WelcomeEmail";
import { 
  getPreferences, 
  setPreferences, 
  sendNotification, 
  getNotifications,
  initPreferences,
  handleRedisEvent,
  markNotificationAsRead 
} from "./controllers/notificationsControllers";

const app = new Hono();

// -------------------------------------------------
// 1. CONFIGURACIÓN DE SEGURIDAD (CORS)
// -------------------------------------------------
app.use('/*', cors({
  origin: '*', 
  allowMethods: ['POST', 'GET', 'OPTIONS','PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// -------------------------------------------------
// 2. CONEXIÓN A DEPENDENCIAS (DB, REDIS y CRON)
// -------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    console.log("✅ DB Conectada");
    
    // A. Inicializar el suscriptor de Redis (Escucha eventos de otros servicios)
    // IMPORTANTE: Asegúrate de que dentro de este archivo te suscribes a "group-events"
    initRedisSubscriber(handleRedisEvent);

    // B. Inicializar el Cron Job (Resúmenes semanales)
    startWeeklySummaryJob();
    
  }).catch(error => {
    console.error("❌ Error Crítico DB:", error);
    process.exit(1);
  });
} else {
    console.log("🟡 Modo Test: Saltando conexión a DB y Redis.");
}

// -------------------------------------------------
// 3. RUTAS
// -------------------------------------------------

// Integración con Users-Service (Pareja 1)
app.post("/preferences/init", initPreferences);

// Preferencias y Notificaciones
app.get("/preferences/:userId", getPreferences);
app.post("/preferences", setPreferences);
app.post("/notifications", sendNotification);
app.get("/notifications/:userId", getNotifications);

//marcar notifcacion como leida
app.patch("/notifications/:id/read", markNotificationAsRead);

//email de bienvenida
app.post("/email/welcome", async (c) => {
  try {
    const body = await c.req.json();
    const { email, name } = body;

    if (!email || !name) {
      return c.json({ error: 'Faltan datos: email y name' }, 400);
    }

    // Usamos el componente React Email para un email bonito y consistente
    const htmlContent = await render(<WelcomeEmail name={name} />);

    // Usamos el servicio de email
    const result = await sendEmail(email, '¡Bienvenido a 0debt!', htmlContent);

    if (result.success) {
      return c.json({ message: 'Email de bienvenida enviado' }, 200);
    } else {
      return c.json({ error: 'Error enviando email', details: result.error }, 500);
    }
  } catch (error) {
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

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