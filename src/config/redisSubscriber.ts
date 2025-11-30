import { Redis } from 'ioredis';

// La URI de Redis se lee de las variables de entorno.
// Es importante que esta variable (REDIS_URI) esté definida en Coolify/VSE.
const redisURI = process.env.REDIS_URI || 'redis://localhost:6379';

// Inicializamos el cliente Redis para la subscripción.
// Utilizamos ioredis, una librería rápida y robusta.
const subscriber = new Redis(redisURI);

/**
 * Inicializa el suscriptor de Redis y empieza a escuchar los canales de eventos.
 * @param eventHandler Función de lógica de negocio (en el controller) que procesa los eventos.
 */
export const initRedisSubscriber = (eventHandler: (channel: string, message: string) => void): void => {
  console.log('Conectando a Redis para subscripción...');
  
  // Lista de canales a los que nos subscribiremos (Eventos clave de otros microservicios)
  const channels = [
    'expense.created',      // Cuando se crea un gasto (Pareja 3)
    'group.member.added',   // Cuando se añade un miembro a un grupo (Pareja 2)
    'user.deleted',         // Para la lógica de compensación SAGA (Pareja 1)
  ];

  subscriber.subscribe(...channels, (err, count) => {
    if (err) {
      console.error('Error al suscribirse a canales de Redis:', err);
      return;
    }
    console.log(`Suscrito a ${count} canales de Redis: ${channels.join(', ')}`);
  });

  // Listener principal para todos los mensajes recibidos
  subscriber.on('message', (channel, message) => {
    console.log(`📡 Recibido evento [${channel}]: ${message}`);
    // Pasa el evento al controlador para que la función handleRedisEvent lo procese.
    eventHandler(channel, message);
  });
  
  subscriber.on('error', (err) => {
    console.error('Error de conexión/comunicación de Redis:', err);
  });
};