import cron from 'node-cron';
import Notification from '../models/notification';
import Preferences from '../models/preferences';
import { emailBreaker } from '../config/circuitBreaker';
import React from 'react';
import { render } from '@react-email/render';
import WeeklySummaryEmail from '../emails/WeeklySummaryEmail';

/**
 * Tarea programada: Enviar resumen semanal
 * Se ejecuta cada Viernes a las 18:00 
 */
export const startWeeklySummaryJob = () => {

  cron.schedule("0 18 * * 5", async () => {
    console.log('Iniciando tarea de resúmenes semanales...');
    await processWeeklySummaries();
  });
  
  console.log(' Cron Job de resúmenes semanales programado (Viernes 18:00)');
};

const processWeeklySummaries = async () => {
  try {
    // 1. Buscar usuarios que quieren resumen semanal
    const usersPreferences = await Preferences.find({ 
      emailSummaryFrequency: 'weekly' 
    });

    console.log(`Encontrados ${usersPreferences.length} usuarios suscritos al resumen semanal.`);

    for (const pref of usersPreferences) {
      // 2. Buscar sus notificaciones NO leídas de los últimos 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const unreadNotifications = await Notification.find({
        userId: pref.userId,
        read: false,
        createdAt: { $gte: sevenDaysAgo }
      });

      if (unreadNotifications.length === 0) {
        continue; // Si no hay novedades, saltamos al siguiente usuario
      }

      // Generamos el HTML usando React Email
      // Renderizamos el componente pasándole las notificaciones como "props"
      const htmlContent = await render(
        <WeeklySummaryEmail notifications={unreadNotifications} />
      );

      // 4. Enviar usando el Circuit Breaker
      console.log(`Enviando resumen a ${pref.email} con ${unreadNotifications.length} notificaciones.`);
      
      await emailBreaker.fire(
        pref.email,
        `[0debt] Your weekly summary with ${unreadNotifications.length} updates`, // Asunto
        htmlContent
      );

      // 5. Actualizar fecha del último resumen enviado
      pref.lastSummarySent = new Date();
      await pref.save();
    }
    
    console.log('Tarea de resúmenes finalizada correctamente.');

  } catch (error) {
    console.error(' Error generando resúmenes semanales:', error);
  }
};