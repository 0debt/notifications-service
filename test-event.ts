// test-event.ts
import Redis from 'ioredis';

// Asegúrate de que este puerto es el correcto (6380 o 6379 según tu docker-compose)
const redis = new Redis('redis://localhost:6380'); 

const main = async () => {
  console.log('📢 Conectando a Redis para simular a Expenses-Service...');

  const eventoExpense = {
    type: 'expense.created',
    data: {
      groupId: 'Grupo-Cena-Navidad',
      payerId: 'javi_test',    // El mismo ID que usaste en el curl
      amount: 45.50,
      description: 'Taxis y Copas 🍸',
      currency: 'EUR'
    }
  };

  // Publicamos al canal 'events'
  await redis.publish('events', JSON.stringify(eventoExpense));
  
  console.log('✅ Evento enviado. Revisa la terminal de tu servidor y tu email.');
  process.exit(0);
};

main().catch(console.error);