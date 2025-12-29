import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`🔍 [RedisConfig] Intentando conectar a: ${redisUrl}`);

const subscriber = new Redis(redisUrl);

export const initRedisSubscriber = (eventHandler: (channel: string, message: string) => void): void => {
  console.log('🔌 Iniciando suscripción a canales...');
  
  // Lista de canales a los que nos subscribiremos
  const channels = [
    'expense.created',      // Cuando se crea un gasto (Pareja 3)
    'group-events',         // 👈 ¡CAMBIO CRÍTICO! (Sintonizamos el canal real de Groups)
    'user.deleted',         // Para la lógica de compensación SAGA (Pareja 1)
  ];

  subscriber.subscribe(...channels, (err, count) => {
    if (err) {
      console.error('❌ Error fatal al suscribirse a canales de Redis:', err);
      return;
    }
    console.log(`✅ Suscrito correctamente a ${count} canales: ${channels.join(', ')}`);
  });

  subscriber.on('message', (channel, message) => {
    console.log(`📡 Recibido evento [${channel}]: ${message}`);
    // Pasa el evento al controlador
    eventHandler(channel, message);
  });
  
  subscriber.on('error', (err) => {
    console.error('❌ Error de conexión con Redis:', err);
  });
};