// test-invite.ts
import Redis from 'ioredis';

const redis = new Redis('redis://localhost:6380'); 

const main = async () => {
  console.log('Simulando evento desde Groups-Service...');

  const eventoGrupo = {
    type: 'group.member.added',
    payload: {
      groupName: 'Viaje a Canarias',
      invitedUserEmail: 'a.javfrarui@gmail.com',
      userId: 'javi_test'
    }
  };

  await redis.publish('group-events', JSON.stringify(eventoGrupo));
  
  console.log('Invitación enviada. Revisa tu terminal y tu correo.');
  process.exit(0);
};

main().catch(console.error);