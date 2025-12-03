// src/controllers/notificationsControllers.ts
import type { Context } from "hono";
import Notification from "../models/notification";
import Preferences, { type IPreferences } from "../models/preferences";
import { emailBreaker } from "../config/circuitBreaker"; 
import Bottleneck from "bottleneck";
import { getEmailTemplate } from "../notifications/email-template";

// ----------------------------------------
// 1. CONFIGURACIÓN
// ----------------------------------------
const apiKey = process.env.RESEND_API_KEY;

// Advertencia en consola si falta la key
if (!apiKey) {
  console.warn("ADVERTENCIA: RESEND_API_KEY no está definida en el .env");
}

// Asegura que no enviemos más de 1 email cada 600ms (aprox 100/minuto max)
// para proteger tu cuenta de Resend y evitar errores 429 (Too Many Requests).
const limiter = new Bottleneck({
  minTime: 600, // Espera mínima entre tareas
  maxConcurrent: 1 // Solo 1 a la vez
});

// ----------------------------------------
// 2. FUNCIONES AUXILIARES
// ----------------------------------------

/**
 * Envía un email usando la API de Resend (SDK v2)
 * Usa el dominio verificado 'mail.0debt.xyz'
 */
const sendEmail = async (to: string, subject: string, htmlContent: string) => {
 try {
    // CRÍTICO: Usamos emailBreaker.fire() en lugar de la llamada directa a Resend
    // Breaker.fire llama a la función protegida (sendEmailFunction)
    // limiter.schedule() pone la tarea en la cola y espera su turno.
    const data = await limiter.schedule(() => 
      emailBreaker.fire(to, subject, htmlContent)
    );

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

    // Si nos pasan userId y mensaje -> Guardamos en Base de Datos
    if (userId && message) {
      await createNotification(userId, message);
      results.dbSaved = true;
    }

    if (to && subject && content) {
      // Convertimos el texto plano en HTML profesional antes de enviar
      const htmlBody = getEmailTemplate(subject, content, "Enviado manualmente desde API");
      const emailResult = await sendEmail(to, subject, htmlBody);
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

    console.log(`Preferencias inicializadas para usuario: ${userId}`);
    return c.json({ status: "created" }, 201);

  } catch (error) {
    console.error("Error en initPreferences:", error);
    return c.json({ error: "Error interno del servidor" }, 500);
  }
};

// ----------------------------------------
// 4. HANDLER DE EVENTOS DE REDIS (LÓGICA ASÍNCRONA)
// ----------------------------------------

/**
 * Función que recibe y procesa eventos de Redis (Publicados por otros servicios).
 * Usa las preferencias del usuario para decidir si enviar notificaciones.
 */
export const handleRedisEvent = async (channel: string, message: string): Promise<void> => {
  let eventData;
  try {
    eventData = JSON.parse(message);
  } catch (e) {
    console.error(`Fallo al parsear JSON del canal ${channel}. Ignorando mensaje.`);
    return;
  }
  
  // El ID del usuario afectado por el evento (varía según el evento)
  // Intentamos obtener el ID del usuario del evento.
  const affectedUserId = eventData.userId || eventData.memberId || eventData.targetUserId;
  if (!affectedUserId) {
    console.warn(`Evento ${channel} sin userId/memberId/targetUserId definido. Ignorando.`);
    return;
  }

  try {
    // 1. BUSCAR PREFERENCIAS DEL USUARIO
    // Usamos el casting 'as IPreference | null' para que TS sepa qué buscar
    const preference = await Preferences.findOne({ userId: affectedUserId }) as (IPreferences | null);

    if (!preference) {
        console.warn(`Usuario ${affectedUserId} no tiene preferencias. Ignorando eventos de notificación inmediatos.`);
        // Podríamos inicializar aquí, pero idealmente lo hace users-service vía /init
        return; 
    }
    
    // 2. LÓGICA POR TIPO DE EVENTO
    
    switch (channel) {
      case 'expense.created': {
        const { expense, receivers } = eventData;
        // Asumimos que el evento pasa el ID del usuario afectado en la propiedad 'affectedUserId'
        const isReceiver = receivers.includes(affectedUserId); 
        
        // Lógica de negocio: Solo notificamos a los que tienen que pagar Y si tienen la preferencia activada
        if (isReceiver && preference.alertOnExpenseCreation) {
          
          const notificationMessage = `¡Nuevo gasto! ${expense.payerName} ha pagado ${expense.amount} ${expense.currency} en '${expense.groupName}'. Revisa tu saldo.`;

          // Guardar Notificación In-App (para la campana)
          await createNotification(affectedUserId, notificationMessage);
          
          if (preference.globalEmailNotifications) {
            // Usamos la plantilla HTML
            const html = getEmailTemplate(
              "Nuevo Gasto Registrado",
              `<p>Hola,</p>
               <p><b>${expense.payerName}</b> ha registrado un gasto de <b>${expense.amount} ${expense.currency}</b> en el grupo <i>${expense.groupName}</i>.</p>
               <p>Entra en la app para ver los detalles.</p>`,
              "Detalles de gasto"
            );

            await sendEmail(
              preference.email, 
              `[Odebt] Deuda pendiente en ${expense.groupName}`, 
              html
            );
          }
        }
        break;
      }

      case 'group.member.added': {
        const { groupName, invitedUserEmail } = eventData;
        
        if (preference.globalEmailNotifications) {
           // Usamos la plantilla HTML
           const html = getEmailTemplate(
             "¡Bienvenido al Grupo!",
             `<p>Has sido añadido al grupo <b>${groupName}</b>.</p>
              <p>Ahora podrás dividir gastos con tus amigos fácilmente.</p>
              <a href="#" style="display:inline-block;background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;margin-top:10px;">Ver Grupo</a>`,
             "Invitación a grupo"
           );

           await sendEmail(
             invitedUserEmail,
             `¡Has sido invitado a ${groupName}!`,
             html
           );
        }
        break;
      }

      case 'user.deleted': {
        // Lógica del patrón SAGA (Nivel 10): Tarea de compensación
        console.warn(`[SAGA] Recibido evento user.deleted para ID: ${affectedUserId}. Iniciando limpieza...`);
        
        // Eliminar datos privados (preferencias y notificaciones)
        await Preferences.deleteOne({ userId: affectedUserId });
        await Notification.deleteMany({ userId: affectedUserId });
        
        console.log(`[SAGA] Preferencias y notificaciones del usuario ${affectedUserId} eliminadas correctamente.`);
        break;
      }

      default:
        console.warn(`Evento desconocido recibido en el canal: ${channel}`);
    }

  } catch (error) {
    console.error(`Error procesando evento ${channel} para user ${affectedUserId}:`, error);
  }
};