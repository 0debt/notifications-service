// test-invite.ts
import Redis from 'ioredis';

// Asegúrate del puerto (6380 o 6379)
const redis = new Redis('redis://localhost:6380'); 

const main = async () => {
  console.log('📢 Simulando evento desde Groups-Service...');

  // Estructura que espera tu controlador para 'group-events'
  const eventoGrupo = {
    type: 'group.member.added', // El tipo interno
    payload: {
      groupName: 'Viaje a Canarias 🌴',
      invitedUserEmail: 'a.javfrarui@gmail.com', // Tu email real
      userId: 'javi_test' // Tu ID de usuario (para buscar tus preferencias)
    }
  };

  // Publicamos al canal 'group-events' (que es el de la Pareja 2)
  await redis.publish('group-events', JSON.stringify(eventoGrupo));
  
  console.log('Invitación enviada. Revisa tu terminal y tu correo.');
  process.exit(0);
};

main().catch(console.error);