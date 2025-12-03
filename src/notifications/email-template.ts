export const getEmailTemplate = (title: string, body: string, footerText: string) => {
  // Un diseño limpio tipo "Notion" o "Stripe"
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #000000; color: #ffffff; padding: 20px; text-align: center; }
        .content { padding: 30px; color: #333333; line-height: 1.6; font-size: 16px; }
        .footer { background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #eaeaea; }
        .btn { display: inline-block; background-color: #000000; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>notifications-service</h1>
        </div>
        <div class="content">
          <h2>${title}</h2>
          <p>${body}</p>
        </div>
        <div class="footer">
          <p>${footerText}</p>
          <p>Enviado automáticamente por tu Microservicio de Notificaciones</p>
        </div>
      </div>
    </body>
    </html>
  `;
};