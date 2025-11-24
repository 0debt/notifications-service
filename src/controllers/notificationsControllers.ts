// src/controllers/notificationsControllers.ts
import { Hono } from "hono";       // valor real
import type { Context } from "hono"; // solo tipo
import Notification from "../models/notification.ts";
import Preferences from "../models/preferences.ts";
import { Resend } from "resend";
import Redis from "ioredis";

const app = new Hono();

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
const sendEmail = async (to: string, subject: string, content: string) => {
  const html = content;
  await resend.sendEmail({ to, subject, html });
};

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
const getPreferences = async (c: Context) => {
  const userId = c.req.param("userId");
  const preference = await Preferences.findOne({ userId });
  return c.json(preference);
};

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
const handleRedisEvent = async (channel: string, message: string) => {
  if (channel === "expense.created") {
    const expense = JSON.parse(message);

    // Guardar notificación en Mongo
    await createNotification(
      expense.userId,
      `Se ha registrado un nuevo gasto: ${expense.amount}`
    );

    // Enviar email al usuario según preferencias
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

redis.subscribe("expense.created", (err, count) => {
  if (err) console.error("Failed to subscribe:", err.message);
  else console.log(`Subscribed successfully! ${count} channels.`);
});

redis.on("message", handleRedisEvent);

// ----------------------------------------
// RUTAS
// ----------------------------------------
app.get("/preferences/:userId", getPreferences);
app.post("/preferences", setPreferences);
app.post("/notifications", async (c: Context) => {
  const { userId, message, to, subject, content } = await c.req.json();

  if (userId && message) await createNotification(userId, message);
  if (to && subject && content) await sendEmail(to, subject, content);

  return c.json({ status: "Notification processed" });
});

export default app;
