// src/controllers/notificationsControllers.ts
import type { Context } from "hono";
import Notification from "../models/notification";
import Preferences from "../models/preferences";
import { emailBreaker } from "../config/circuitBreaker"; 

// ----------------------------------------
// 1. CONFIGURACIÓN
// ----------------------------------------
const apiKey = process.env.RESEND_API_KEY;

// Advertencia en consola si falta la key
if (!apiKey) {
  console.warn("ADVERTENCIA: RESEND_API_KEY no está definida en el .env");
}

// ----------------------------------------
// 2. FUNCIONES AUXILIARES
// ----------------------------------------

/**
 * Envía un email usando la API de Resend (SDK v2)
 * Usa el dominio verificado 'mail.0debt.xyz'
 */
const sendEmail = async (to: string, subject: string, content: string) => {
 try {
    // CRÍTICO: Usamos emailBreaker.fire() en lugar de la llamada directa a Resend
    // Breaker.fire llama a la función protegida (sendEmailFunction)
    const data = await emailBreaker.fire(to, subject, content); 

    console.log(`Email enviado a ${to} (vía Breaker). ID: ${data?.id}`);
    return data;

  } catch (err: any) {
    // Si el breaker está ABIERTO, lanzará este error inmediatamente, protegiendo a Resend.
    if (err.name === 'CircuitBreakerOpenError') {
      console.warn("CIRCUIT BREAKER ACTIVO: La llamada a Resend fue BLOCQUEADA. Email no enviado.");
    } else {
      // Si el breaker está cerrado pero la llamada subyacente falló.
      console.error("Excepción intentando enviar email (fallo interno o Breaker):", err.message);
    }
    
    // No lanzamos el error para no detener el flujo principal si el email falla
    return null; 
  }
};

/**
 * Guarda una notificación interna en MongoDB (Campanita)
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
    console.error("Error guardando notificación en Mongo:", error);
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
// Usado para actualizar preferencias manualmente
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
// Endpoint principal para crear alertas y mandar correos
export const sendNotification = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { userId, message, to, subject, content } = body;

    const results = {
      dbSaved: false,
      emailSent: false
    };

    // A. Si nos pasan userId y mensaje -> Guardamos en Base de Datos
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
    console.error("Error en sendNotification:", error);
    return c.json({ status: "error", error: error.message }, 500);
  }
};

// ----------------------------------------
// 4. NUEVA FUNCIÓN PARA EL REGISTRO (INTEGRACIÓN PAREJA 1)
// ----------------------------------------

// POST /preferences/init
// Esta función la llama el Users-Service cuando se crea un usuario nuevo
export const initPreferences = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { userId, email } = body;

    // 1. Validación básica
    if (!userId) {
      return c.json({ error: "Falta el userId" }, 400);
    }

    // 2. PARCHE DE SEGURIDAD 🛡️
    // Si la Pareja 1 no envía el email, usamos uno temporal para no romper la DB
    const userEmail = email || "pendiente_de_actualizar@0debt.xyz";

    // 3. Guardamos en Base de Datos
    await Preferences.updateOne(
      { userId }, 
      { 
        $setOnInsert: { 
          userId, 
          email: userEmail, 
          emailNotifications: true // Por defecto activadas
        } 
      },
      { upsert: true }
    );

    console.log(`✅ Preferencias inicializadas para usuario: ${userId}`);
    return c.json({ status: "created" }, 201);

  } catch (error) {
    console.error("Error en initPreferences:", error);
    return c.json({ error: "Error interno del servidor" }, 500);
  }
};