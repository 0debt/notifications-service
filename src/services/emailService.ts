import { Resend } from 'resend';

// Verificación de seguridad
if (!process.env.RESEND_API_KEY) {
  throw new Error(" FALTA RESEND_API_KEY EN EL .ENV");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Función GENÉRICA para enviar cualquier email
export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    // 1. Desestructuramos la respuesta: separamos lo bueno (data) de lo malo (error)
    const { data, error } = await resend.emails.send({
      from: '0debt App <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    // 2. Si Resend nos dice que hubo un error, lo devolvemos
    if (error) {
      console.error(' Error devuelto por Resend:', error);
      return { success: false, error };
    }

    // 3. Si todo fue bien, 'data' tendrá el ID.
    // Usamos el operador '?' por si acaso data es null (seguridad extra de TypeScript)
    console.log('Email enviado ID:', data?.id);
    return { success: true, id: data?.id };

  } catch (err) {
    // 4. Si falla la conexión o el código explota
    console.error('Error inesperado enviando email:', err);
    return { success: false, error: err };
  }
};