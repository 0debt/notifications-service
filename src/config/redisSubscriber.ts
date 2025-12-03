import Redis from 'ioredis';

// 1. CORRECCIÓN CRÍTICA: Cambiado URI -> URL para coincidir con tu .env
// Si tu .env tiene REDIS_URL=redis://127.0.0.1:6380, ahora sí lo leerá.
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// 2. LOG DE DEPURACIÓN: Esto te dirá la verdad en la consola al arrancar
console.log(`🔍 [RedisConfig] Intentando conectar a: ${redisUrl}`);

// Inicializamos el cliente Redis
const subscriber = new Redis(redisUrl);

/**
 * Inicializa el suscriptor de Redis y empieza a escuchar los canales de eventos.
 * @param eventHandler Función de lógica de negocio (en el controller) que procesa los eventos.
 */
export const initRedisSubscriber = (eventHandler: (channel: string, message: string) => void): void => {
  console.log('🔌 Iniciando suscripción a canales...');
  
  // Lista de canales a los que nos subscribiremos
  const channels = [
    'expense.created',      // Cuando se crea un gasto (Pareja 3)
    'group.member.added',   // Cuando se añade un miembro a un grupo (Pareja 2)
    'user.deleted',         // Para la lógica de compensación SAGA (Pareja 1)
  ];

  subscriber.subscribe(...channels, (err, count) => {
    if (err) {
      console.error('❌ Error fatal al suscribirse a canales de Redis:', err);
      return;
    }
    console.log(`✅ Suscrito correctamente a ${count} canales: ${channels.join(', ')}`);
  });

  // Listener principal para todos los mensajes recibidos
  subscriber.on('message', (channel, message) => {
    console.log(`📡 Recibido evento [${channel}]: ${message}`);
    // Pasa el evento al controlador
    eventHandler(channel, message);
  });
  
  subscriber.on('error', (err) => {
    console.error('❌ Error de conexión con Redis:', err);
  });
};