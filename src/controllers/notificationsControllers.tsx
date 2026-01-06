// src/controllers/notificationsControllers.ts
import type { Context } from "hono";
import Notification from "../models/notification";
import Preferences, { type IPreferences } from "../models/preferences";
import { emailBreaker } from "../config/circuitBreaker"; 
// 👇 Importamos la plantilla de Alba
import { getEmailTemplate } from "../notifications/email-template";
// 👇 Imports para React Email
import { render } from "@react-email/render";
import WelcomeEmail from "../emails/WelcomeEmail";      
import { NewExpenseEmail } from "../emails/NewExpenseEmail"; 
import { GroupInvitationEmail } from "../emails/GroupInvitationEmail";
import React from "react";
import { redisClient } from "../config/redis";
import { sendEmail } from "../services/emailService";

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://users-service:3000';

// ----------------------------------------
// 1. CONFIGURACIÓN
// ----------------------------------------

// ----------------------------------------
// 2. FUNCIONES AUXILIARES
// ----------------------------------------

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
  
  // -----------------------------------------------------
  // A. ADAPTADOR PARA EXPENSES
  // -----------------------------------------------------
  // Ellos publican en 'events' con estructura { type: 'expense.created', data: {...} }
  if (channel === 'events') {
    const internalType = eventData.type;
    
    if (internalType === 'expense.created') {
        channel = 'expense.created'; // Re-etiquetamos el canal para nuestro switch
        const rawData = eventData.data;

        // Obtener nombre del grupo desde Redis cache (groups-service lo guarda ahí)
        let groupName = `Grupo ${rawData.groupId}`;
        try {
            const cachedSummary = await redisClient.get(`group_summary:${rawData.groupId}`);
            if (cachedSummary) {
                const summary = JSON.parse(cachedSummary);
                groupName = summary.name || groupName;
            }
        } catch (e) {
            console.error('Error obteniendo nombre del grupo desde Redis:', e);
        }

        // Obtener nombre del pagador desde users-service (endpoint interno)
        let payerName = "Alguien";
        try {
            const userRes = await fetch(`${USERS_SERVICE_URL}/internal/users/${rawData.payerId}`);
            if (userRes.ok) {
                const user = await userRes.json();
                payerName = user.name || payerName;
            }
        } catch (e) {
            console.error('Error obteniendo nombre del pagador:', e);
        }

        // Transformamos sus datos a nuestra estructura con nombres reales
        eventData = {
            expense: {
                groupName,
                payerName,
                amount: rawData.amount,
                currency: rawData.currency || "EUR",
                description: rawData.description
            },
            // IMPORTANTE: Como no mandan receivers, ponemos al payerId como objetivo
            // para al menos enviarle una confirmación de "Gasto creado".
            receivers: [rawData.payerId], 
            
            // Guardamos el ID para buscar preferencias
            targetUserId: rawData.payerId
        };
    }
  }

  // -----------------------------------------------------
  // B. ADAPTADOR PARA GROUPS
  // -----------------------------------------------------
  if (channel === 'group-events') {
    const internalEventType = eventData.type; 
    const payload = eventData.payload;        
    channel = internalEventType; 
    eventData = payload; 
  }
  // -----------------------------------------------------

  // -----------------------------------------------------
  // C. HANDLER PARA USER.DELETED (limpieza de datos)
  // -----------------------------------------------------
  if (channel === 'user.deleted') {
    const { userId } = eventData;
    console.log(`Limpiando datos del usuario eliminado: ${userId}`);

    try {
      // Eliminar preferencias del usuario
      await Preferences.deleteOne({ userId });

      // Eliminar notificaciones del usuario
      await Notification.deleteMany({ userId });

      console.log(`Datos del usuario ${userId} eliminados correctamente`);
    } catch (error) {
      console.error(`Error limpiando datos del usuario ${userId}:`, error);
    }
    return; // Terminamos aquí, no necesitamos procesar más
  }
  // -----------------------------------------------------

  // Buscamos el ID del usuario principal afectado
  const affectedUserId = eventData.userId || eventData.memberId || eventData.targetUserId;
  
  if (!affectedUserId) {
    // Si sigue sin haber ID, no podemos hacer nada
    return;
  }

  try {
    // Buscamos preferencias
    const preference = await Preferences.findOne({ userId: affectedUserId }) as (IPreferences | null);

    if (!preference) {
        console.warn(`Usuario ${affectedUserId} no tiene preferencias. Ignorando.`);
        return; 
    }
    
    switch (channel) {
      case 'expense.created': {
        const { expense, targetUserId } = eventData; // Asegúrate de extraer targetUserId si lo guardaste en el adaptador
        
        if (preference.globalEmailNotifications && preference.alertOnExpenseCreation) {
          
          // 1. Guardar en Mongo
          const notificationMessage = `Gasto registrado: ${expense.amount}€ en ${expense.groupName}.`;
          await createNotification(affectedUserId, notificationMessage);
          
          // 2. Generar el HTML con React Email
          // Renderizamos el componente pasándole los datos limpios
          const htmlContent = await render(
            <NewExpenseEmail 
              payerName={expense.payerName}
              amount={expense.amount}
              description={expense.description}
              owedAmount={0} // Expenses no te manda cuánto debes, pon 0 o calcula si puedes
            />
          );
          

          // 3. Enviar
          await sendEmail(
            preference.email, 
            `[0debt] Nuevo gasto en ${expense.groupName}`, 
            htmlContent
          );
        }
        break;
      }

      case 'group.member.added': {
        const { groupName, invitedUserEmail } = eventData;
        
        if (preference.globalEmailNotifications && preference.alertOnNewGroup) {
           if (invitedUserEmail) {
             // Usamos el componente React Email para consistencia de estilo
             const htmlContent = await render(
               <GroupInvitationEmail groupName={groupName} />
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

      case 'balance.changed': {
        const { groupName } = eventData;
        
        if (preference.globalEmailNotifications && preference.alertOnBalanceChange) {
           const html = getEmailTemplate(
             "Tu Balance ha Cambiado",
             `<p>Hola,</p>
              <p>Tu balance en el grupo <b>${groupName}</b> ha cambiado.</p>
              <p>Entra en la app para ver los detalles.</p>`,
             "Cambio de balance"
           );

           await sendEmail(
             preference.email,
             `[Odebt] Tu balance ha cambiado en ${groupName}`,
             html
           );
        }       
        break;
      }

      default:
        break;
    }

  } catch (error) {
    console.error(`Error procesando evento ${channel} para user ${affectedUserId}:`, error);
  }
};