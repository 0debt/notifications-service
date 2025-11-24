// src/controllers/notificationsControllers.ts
import type { Context } from "hono";
import Notification from "../models/notification";
import Preferences from "../models/preferences";
import { Resend } from "resend";

// Configuración de Resend
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("RESEND_API_KEY no definida");
const resend = new Resend(apiKey);

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
// HANDLERS / RUTAS
// ----------------------------------------
export const getPreferences = async (c: Context) => {
  const userId = c.req.param("userId");
  const preference = await Preferences.findOne({ userId });
  return c.json(preference);
};
export const getNotifications = async (c: Context) => {
  const userId = c.req.param("userId");
  const notifications = await Notification.find({ userId });
  return c.json(notifications);
};

export const setPreferences = async (c: Context) => {
  const data = await c.req.json();
  const result = await Preferences.updateOne(
    { userId: data.userId },
    { $set: data },
    { upsert: true }
  );
  return c.json(result);
};

export const sendNotification = async (c: Context) => {
  const { userId, message, to, subject, content } = await c.req.json();
  if (userId && message) await createNotification(userId, message);
  if (to && subject && content) await sendEmail(to, subject, content);
  return c.json({ status: "Notification processed" });
};
