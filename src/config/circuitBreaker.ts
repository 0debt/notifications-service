import CircuitBreaker from 'opossum';
import { Resend } from 'resend';

// -----------------------------------------------------------------
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE RESEND (Se mueve aquí)
// -----------------------------------------------------------------
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn("RESEND_API_KEY no está definida. El Circuit Breaker usará una función simulada.");
}

const resend = new Resend(apiKey);

// Definimos la función que queremos 'proteger' con el Circuit Breaker.
// Es la misma lógica de envío que estaba en el controller.
// NOTA: Resend espera un array de destinatarios
export const sendEmailFunction = async (to: string, subject: string, html: string) => {
  if (!apiKey) {
    // Si no hay API Key, simulamos un fallo rápido pero manejable
    throw new Error('RESEND_API_KEY no configurada. Bloqueando llamada externa.');
  }

  const { data, error } = await resend.emails.send({
    from: "0debt Notificaciones <noreply@mail.0debt.xyz>",
    to: [to], 
    subject: subject,
    html: html,
  });

  if (error) {
    console.error("Error devuelto por Resend:", error);
    // Lanzamos una excepción para que el Circuit Breaker la detecte como fallo
    throw new Error(`Resend API Error: ${error.message}`);
  }

  return data;
};

// -----------------------------------------------------------------
// 2. CONFIGURACIÓN DEL CIRCUIT BREAKER
// -----------------------------------------------------------------

const options = {
  timeout: 5000,           // Si la llamada tarda más de 5 segundos, se considera fallo
  errorThresholdPercentage: 50, // Si el 50% de las llamadas fallan...
  resetTimeout: 60000,     // ... espera 60 segundos antes de pasar a Semiabierto
  maxVolume: 10,           // Mínimo de 10 llamadas en la ventana para calcular el umbral
};

// Creamos el Circuit Breaker, protegiendo la función sendEmailFunction
export const emailBreaker = new CircuitBreaker(sendEmailFunction, options);

// -----------------------------------------------------------------
// 3. LISTENERS PARA LOGGING (Opcional, pero muy útil)
// -----------------------------------------------------------------

emailBreaker.on('open', () => console.error('CIRCUIT BREAKER: ABIERTO. Resend está fallando o muy lento.'));
emailBreaker.on('halfOpen', () => console.warn('CIRCUIT BREAKER: SEMIABIERTO. Intentando enviar 1 email de prueba.'));
emailBreaker.on('close', () => console.log('CIRCUIT BREAKER: CERRADO. Resend está operativo de nuevo.'));
emailBreaker.on('fallback', (error) => {
  const errorMessage = error && typeof error === 'object' && 'message' in error
    ? error.message
    : String(error);

console.log('🔵 CIRCUIT BREAKER: Usando fallback (el email no se envió).', errorMessage);
});
// NOTA: No necesitamos una función de fallback compleja porque en este caso, 
// la acción de fallback es simplemente no enviar el email (ya está en el controller).