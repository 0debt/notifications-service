// src/controllers/notificationsControllers.ts
import { Context } from "hono";
import Notification from "../models/notification";
import Preferences from "../models/preferences"; // Si tienes un modelo de preferences
import { Resend } from "resend";
import Redis from "ioredis";

// Configuración de Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Configuración de Redis
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

// ----------------------------------------
// FUNCIONES AUXILIARES
// ----------------------------------------

// Enviar email usando Resend
const sendEmail = async (to: string, subject: string, content: string) => {
  const html = content;
  await resend.sendEmail({ to, subject, html });
};

// Crear y guardar notificación en MongoDB
const createNotification = async (userId: string, message: string) => {
  return await Notification.create({
    userId,
    message,
    read: false,
    createdAt: new Date(),
  });
};

// ----------------------------------------
// CRUD DE PREFERENCIAS
// ----------------------------------------

// Obtener preferencias de un usuario
const getPreferences = async (c: Context) => {
  const userId = c.req.param("userId");
  const preference = await Preferences.findOne({ userId });
  return c.json(preference);
};

// Crear o actualizar preferencias
const setPreferences = async (c: Context) => {
  const data = await c.req.json();
  const result = await Preferences.updateOne(
    { userId: data.userId },
    { $set: data },
    { upsert: true }
  );
  return c.json(result);
};

// ----------------------------------------
// MANEJO DE EVENTOS REDIS
// ----------------------------------------

// Función que maneja eventos del canal "expense.created"
const handleRedisEvent = async (channel: string, message: string) => {
  if (channel === "expense.created") {
    const expense = JSON.parse(message);

    // Guardar notificación en Mongo
    await createNotification(
      expense.userId,
      `Se ha registrado un nuevo gasto: ${expense.amount}`
    );

    // Enviar email al usuario
    const userPref = await Preferences.findOne({ userId: expense.userId });
    if (userPref?.emailNotifications) {
      await sendEmail(
        userPref.email,
        "Nuevo gasto registrado",
        `Se ha registrado un nuevo gasto: ${expense.amount}`
      );
    }
  }
};

// Suscribirse al canal "expense.created"
redis.subscribe("expense.created", (err, count) => {
  if (err) console.error("Failed to subscribe:", err.message);
  else console.log(`Subscribed successfully! ${count} channels.`);
});

redis.on("message", handleRedisEvent);

// ----------------------------------------
// ENDPOINTS
// ----------------------------------------

export default (app: any) => {
  // Preferencias
  app.get("/preferences/:userId", getPreferences);
  app.post("/preferences", setPreferences);

  // Enviar notificación manualmente
  app.post("/notifications", async (c: Context) => {
    const { userId, message, to, subject, content } = await c.req.json();

    // Guardar en Mongo
    if (userId && message) await createNotification(userId, message);

    // Enviar email si vienen datos de email
    if (to && subject && content) await sendEmail(to, subject, content);

    return c.json({ status: "Notification processed" });
  });
};
