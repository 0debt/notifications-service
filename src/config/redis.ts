// src/config/redis.ts
import Redis from "ioredis";

// 1. Leemos la URL del entorno
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("❌ REDIS_URL no está definida en el .env");
}

console.log("🔌 Conectando a Redis...");

// 2. Creamos dos conexiones:
// - una para enviar mensajes (si hiciera falta)
// - otra EXCLUSIVA para escuchar (subscriber)
export const redisClient = new Redis(redisUrl);
export const redisSubscriber = new Redis(redisUrl);

console.log("✅ Conexión a Redis lista");