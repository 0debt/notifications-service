import cron from 'node-cron';
import Notification from '../models/notification';
import Preferences from '../models/preferences';
import { emailBreaker } from '../config/circuitBreaker';

/**
 * Tarea programada: Enviar resumen semanal
 * Se ejecuta cada Viernes a las 18:00 
 */
export const startWeeklySummaryJob = () => {
  // Cron syntax: "0 18 * * 5" = Viernes a las 18:00
  cron.schedule('0 18 * * 5', async () => {
    console.log('Iniciando tarea de resúmenes semanales...');
    await processWeeklySummaries();
  });
  
  console.log('Cron Job de resúmenes semanales programado (Viernes 18:00)');
};

const processWeeklySummaries = async () => {
  try {
    // 1. Buscar usuarios que quieren resumen semanal
    const usersPreferences = await Preferences.find({ 
      emailSummaryFrequency: 'weekly' 
    });

    console.log(` Encontrados ${usersPreferences.length} usuarios suscritos al resumen semanal.`);

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
        continue; // Si no hay novedades, no molestamos
      }

      // 3. Generar el HTML del email (Lista de notificaciones)
      const listItems = unreadNotifications
        .map(n => `<li style="margin-bottom: 5px;">${n.message} <small style="color: #666;">(${n.createdAt.toLocaleDateString()})</small></li>`)
        .join('');

      const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>📅 Tu resumen semanal de 0debt</h2>
          <p>Hola, aquí tienes lo que te has perdido esta semana:</p>
          <ul style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            ${listItems}
          </ul>
          <p>Entra en la app para ver los detalles.</p>
        </div>
      `;

      // 4. Enviar usando el Circuit Breaker
      console.log(` Enviando resumen a ${pref.email} con ${unreadNotifications.length} notificaciones.`);
      
      await emailBreaker.fire(
        pref.email,
        `[0debt] Tienes ${unreadNotifications.length} notificaciones pendientes`,
        htmlContent
      );

      // 5. Opcional: Podríamos marcar 'lastSummarySent' en las preferencias
      pref.lastSummarySent = new Date();
      await pref.save();
    }
    
    console.log('✅ Tarea de resúmenes finalizada.');

  } catch (error) {
    console.error('❌ Error generando resúmenes semanales:', error);
  }
};