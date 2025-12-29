// src/controllers/notificationsControllers.ts
import type { Context } from "hono";
import Notification from "../models/notification";
import Preferences, { type IPreferences } from "../models/preferences";
import { emailBreaker } from "../config/circuitBreaker"; 
import Bottleneck from "bottleneck";
// 👇 Importamos la plantilla de Alba
import { getEmailTemplate } from "../notifications/email-template";
import { Resend } from "resend";

// ----------------------------------------
// 1. CONFIGURACIÓN
// ----------------------------------------
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn("ADVERTENCIA: RESEND_API_KEY no está definida en el .env");
}

const resend = new Resend(apiKey);

// Rate Limiter: Máximo 1 email cada 600ms
const limiter = new Bottleneck({
  minTime: 600, 
  maxConcurrent: 1 
});

// ----------------------------------------
// 2. FUNCIONES AUXILIARES
// ----------------------------------------

/**
 * Envía un email usando Resend + Circuit Breaker + Rate Limiter
 */
const sendEmail = async (to: string, subject: string, htmlContent: string) => {
 try {
    const data = await limiter.schedule(async () => {
        // Llamada directa a Resend protegida
        const { data, error } = await resend.emails.send({
            from: "0debt Notificaciones <noreply@mail.0debt.xyz>",
            to: [to],
            subject: subject,
            html: htmlContent, // Aquí va el HTML bonito
        });
        
        if (error) throw new Error(error.message);
        return data;
    });

    console.log(`Email enviado a ${to}. ID: ${data?.id}`);
    return data;

  } catch (err: any) {
    console.error("Excepción intentando enviar email:", err.message);
    return null; 
  }
};

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
// 3. HANDLERS / RUTAS
// ----------------------------------------

export const getPreferences = async (c: Context) => {
  try {
    const userId = c.req.param("userId");
    const preference = await Preferences.findOne({ userId });
    return c.json(preference || {});
  } catch (error) {
    return c.json({ error: "Error obteniendo preferencias" }, 500);
  }
};

export const getNotifications = async (c: Context) => {
  try {
    const userId = c.req.param("userId");
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    return c.json(notifications);
  } catch (error) {
    return c.json({ error: "Error obteniendo notificaciones" }, 500);
  }
};

export const setPreferences = async (c: Context) => {
  try {
    const data = await c.req.json();
    if (!data.userId) return c.json({ error: "userId es obligatorio" }, 400);

    const result = await Preferences.updateOne(
      { userId: data.userId },
      { $set: data },
      { upsert: true }
    );
    return c.json(result);
  } catch (error) {
    return c.json({ error: "Error guardando preferencias" }, 500);
  }
};

// POST /notifications (Manual)
export const sendNotification = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { userId, message, to, subject, content } = body;
    const results = { dbSaved: false, emailSent: false };

    if (userId && message) {
      await createNotification(userId, message);
      results.dbSaved = true;
    }

    if (to && subject && content) {
      // ✨ Usamos la plantilla aquí también
      const htmlBody = getEmailTemplate(subject, content, "Notificación Manual");
      const emailResult = await sendEmail(to, subject, htmlBody);
      if (emailResult) results.emailSent = true;
    }

    return c.json({ status: "success", message: "Proceso completado", details: results });
  } catch (error: any) {
    console.error("Error en sendNotification:", error);
    return c.json({ status: "error", error: error.message }, 500);
  }
};

export const markNotificationAsRead = async (c: Context) => {
  try {
    const notificationId = c.req.param("id");
    const result = await Notification.updateOne(
      { _id: notificationId },
      { $set: { read: true } }
    );

    if (result.matchedCount === 0) {
      return c.json({ error: "Notificación no encontrada" }, 404);
    }
    return c.json({ status: "success", message: "Notificación marcada como leída" });
  } catch (error) {
    console.error("Error marcando notificación como leída:", error);
    return c.json({ error: "Error interno del servidor" }, 500);
  }
};

export const initPreferences = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { userId, email } = body;
    if (!userId) return c.json({ error: "Falta el userId" }, 400);

    const userEmail = email || "pendiente_de_actualizar@0debt.xyz";

    await Preferences.updateOne(
      { userId }, 
      { 
        $setOnInsert: { 
          userId, 
          email: userEmail, 
          globalEmailNotifications: true
        } 
      },
      { upsert: true }
    );

    console.log(`Preferencias inicializadas para usuario: ${userId}`);
    return c.json({ status: "created" }, 201);
  } catch (error) {
    console.error("Error en initPreferences:", error);
    return c.json({ error: "Error interno del servidor" }, 500);
  }
};

// ----------------------------------------
// 5. HANDLER DE EVENTOS DE REDIS
// ----------------------------------------

export const handleRedisEvent = async (channel: string, message: string): Promise<void> => {
  let eventData;
  try {
    eventData = JSON.parse(message);
  } catch (e) {
    console.error(`Fallo al parsear JSON del canal ${channel}. Ignorando mensaje.`);
    return;
  }
  
  // Adaptador para Groups
  if (channel === 'group-events') {
    const internalEventType = eventData.type; 
    const payload = eventData.payload;        
    channel = internalEventType; 
    eventData = payload; 
  }

  const affectedUserId = eventData.userId || eventData.memberId || eventData.targetUserId;
  
  if (!affectedUserId) {
    console.warn(`Evento ${channel} sin userId definido. Ignorando.`);
    return;
  }

  try {
    const preference = await Preferences.findOne({ userId: affectedUserId }) as (IPreferences | null);

    if (!preference) {
        console.warn(`Usuario ${affectedUserId} no tiene preferencias. Ignorando.`);
        return; 
    }
    
    switch (channel) {
      case 'expense.created': {
        const { expense, receivers } = eventData;
        const isReceiver = receivers.includes(affectedUserId); 
        
        if (isReceiver && preference.globalEmailNotifications) {
          const notificationMessage = `¡Nuevo gasto! ${expense.payerName} ha pagado ${expense.amount} en '${expense.groupName}'.`;

          // A) Campana
          await createNotification(affectedUserId, notificationMessage);
          
          // B) Email con Plantilla ✨
          const htmlContent = getEmailTemplate(
            "Nuevo Gasto Registrado", // Título
            `<p>Hola,</p>
             <p><b>${expense.payerName}</b> ha registrado un gasto de <b>${expense.amount} ${expense.currency}</b> en el grupo <i>${expense.groupName}</i>.</p>
             <p>Entra en la app para ver los detalles y saldar deudas.</p>`, // Cuerpo
            "Ver Detalles de Gasto" // Botón
          );

          await sendEmail(
            preference.email, 
            `[Odebt] Nuevo gasto en ${expense.groupName}`, 
            htmlContent
          );
        }
        break;
      }

      case 'group.member.added': {
        const { groupName, invitedUserEmail } = eventData;
        
        if (preference.globalEmailNotifications) {
           if (invitedUserEmail) {
             // ✨ Email con Plantilla
             const htmlContent = getEmailTemplate(
               "¡Bienvenido al Grupo!", // Título
               `<p>Has sido invitado a unirte al grupo <b>${groupName}</b>.</p>
                <p>Ahora podrás dividir gastos con tus amigos fácilmente.</p>`, // Cuerpo
               "Ir al Grupo" // Botón
             );

             await sendEmail(
               invitedUserEmail,
               `¡Has sido invitado a ${groupName}!`,
               htmlContent
             );
           }
        }

        await createNotification(affectedUserId, `Te han añadido al grupo ${groupName}`);
        break;
      }

      case 'user.deleted': {
        console.warn(`[SAGA] Recibido evento user.deleted para ID: ${affectedUserId}.`);
        await Preferences.deleteOne({ userId: affectedUserId });
        await Notification.deleteMany({ userId: affectedUserId });
        break;
      }

      default:
        console.warn(`Evento no manejado: ${channel}`);
    }

  } catch (error) {
    console.error(`Error procesando evento ${channel} para user ${affectedUserId}:`, error);
  }
};