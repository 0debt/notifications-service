// src/controllers/notificationsControllers.ts
import type { Context } from "hono";
import Notification from "../models/notification";
import Preferences from "../models/preferences";
import { Resend } from "resend";

// ----------------------------------------
// 1. CONFIGURACIÓN
// ----------------------------------------
const apiKey = process.env.RESEND_API_KEY;

// Advertencia en consola si falta la key, pero no rompe la app inmediatamente
if (!apiKey) {
  console.warn("⚠️ ADVERTENCIA: RESEND_API_KEY no está definida en el .env");
}

const resend = new Resend(apiKey);

// ----------------------------------------
// 2. FUNCIONES AUXILIARES
// ----------------------------------------

/**
 * Envía un email usando la API de Resend (SDK v2)
 * Usa el dominio verificado 'mail.0debt.xyz'
 */
const sendEmail = async (to: string, subject: string, content: string) => {
  try {
    const { data, error } = await resend.emails.send({
      // IMPORTANTE: Usamos el dominio verificado que te pasó tu compañero
      from: "0debt Notificaciones <noreply@mail.0debt.xyz>",
      to: [to], // Resend espera un array de destinatarios
      subject: subject,
      html: content,
    });

    if (error) {
      console.error("❌ Error devuelto por Resend:", error);
      return null;
    }

    console.log(`✅ Email enviado a ${to}. ID: ${data?.id}`);
    return data;
  } catch (err) {
    console.error("❌ Excepción intentando enviar email:", err);
    // No lanzamos el error (throw) para no detener el flujo principal si el email falla
    return null;
  }
};

/**
 * Guarda una notificación interna en MongoDB
 */
const createNotification = async (userId: string, message: string) => {
  try {
    return await Notification.create({
      userId,
      message,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("❌ Error guardando notificación en Mongo:", error);
    throw error;
  }
};

// ----------------------------------------
// 3. HANDLERS / RUTAS (Lógica de los Endpoints)
// ----------------------------------------

// GET /preferences/:userId
export const getPreferences = async (c: Context) => {
  try {
    const userId = c.req.param("userId");
    const preference = await Preferences.findOne({ userId });
    
    // Si no existen preferencias, devolvemos un objeto vacío o null, pero status 200
    return c.json(preference || {});
  } catch (error) {
    return c.json({ error: "Error obteniendo preferencias" }, 500);
  }
};

// GET /notifications/:userId
export const getNotifications = async (c: Context) => {
  try {
    const userId = c.req.param("userId");
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }); // Ordenamos por fecha descendente
    return c.json(notifications);
  } catch (error) {
    return c.json({ error: "Error obteniendo notificaciones" }, 500);
  }
};

// POST /preferences
export const setPreferences = async (c: Context) => {
  try {
    const data = await c.req.json();
    
    if (!data.userId) {
      return c.json({ error: "userId es obligatorio" }, 400);
    }

    const result = await Preferences.updateOne(
      { userId: data.userId },
      { $set: data },
      { upsert: true } // Crea el documento si no existe
    );
    return c.json(result);
  } catch (error) {
    return c.json({ error: "Error guardando preferencias" }, 500);
  }
};

// POST /notifications
// Este es el endpoint principal para crear alertas y mandar correos
export const sendNotification = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { userId, message, to, subject, content } = body;

    const results = {
      dbSaved: false,
      emailSent: false
    };

    // A. Si nos pasan userId y mensaje -> Guardamos en Base de Datos (Campana de notificaciones)
    if (userId && message) {
      await createNotification(userId, message);
      results.dbSaved = true;
    }

    // B. Si nos pasan datos de email -> Enviamos correo vía Resend
    if (to && subject && content) {
      const emailResult = await sendEmail(to, subject, content);
      if (emailResult) results.emailSent = true;
    }

    return c.json({ 
      status: "success", 
      message: "Proceso completado", 
      details: results 
    });

  } catch (error: any) {
    console.error("❌ Error en sendNotification:", error);
    return c.json({ status: "error", error: error.message }, 500);
  }
};