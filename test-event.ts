// test-event.ts
import Redis from 'ioredis';

const redis = new Redis('redis://localhost:6380'); 

const main = async () => {
  console.log('Conectando a Redis para simular a Expenses-Service...');

  const eventoExpense = {
    type: 'expense.created',
    data: {
      groupId: 'Grupo-Cena-Navidad',
      payerId: 'javi_test',
      amount: 45.50,
      description: 'Taxis y Copas',
      currency: 'EUR'
    }
  };

  await redis.publish('events', JSON.stringify(eventoExpense));
  
  console.log('Evento enviado. Revisa la terminal de tu servidor y tu email.');
  process.exit(0);
};

main().catch(console.error);