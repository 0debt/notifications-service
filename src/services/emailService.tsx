// src/services/emailService.tsx
import { Resend } from 'resend';
import * as React from 'react'; // Necesario para los tipos de React

// Verificación de seguridad
if (!process.env.RESEND_API_KEY) {
  throw new Error("FALTA RESEND_API_KEY EN EL .ENV");
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Función Híbrida: Envía emails usando HTML puro o Componentes React
 * @param to Destinatario
 * @param subject Asunto
 * @param content Puede ser un string (HTML) o un Componente React (<Email />)
 */
export const sendEmail = async (
  to: string, 
  subject: string, 
  content: string | React.ReactElement
) => {
  try {
    // Preparamos el payload dinámicamente
    const emailPayload: any = {
      from: '0debt App <noreply@mail.0debt.xyz>',
      to: [to],
      subject: subject,
    };

    // Detectamos si es React o HTML String
    if (typeof content === 'string') {
      emailPayload.html = content; // Es un string viejo
    } else {
      emailPayload.react = content; // Si es un componente React, Resend lo renderiza internamente
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error(' Error devuelto por Resend:', error);
      return { success: false, error };
    }

    console.log('Email enviado ID:', data?.id);
    return { success: true, id: data?.id };

  } catch (err) {
    console.error(' Error inesperado enviando email:', err);
    return { success: false, error: err };
  }
};