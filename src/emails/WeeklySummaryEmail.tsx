// src/emails/WeeklySummaryEmail.tsx
import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
  Link,
  Preview,
} from "@react-email/components";

// Definimos qué datos necesita este email para funcionar
interface WeeklySummaryProps {
  notifications: any[]; // Usamos any[] por simplicidad
}

export const WeeklySummaryEmail = ({ notifications }: WeeklySummaryProps) => {
  return (
    <Html>
      <Head />
      <Preview>Tienes {String(notifications.length)} novedades en 0debt</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Tu Resumen Semanal</Heading>
          <Text style={text}>
            Hola, aquí tienes lo que te has perdido esta semana en 0debt:
          </Text>

          <Section style={box}>
            {notifications.map((n, index) => (
              <div key={index} style={item}>
                <Text style={notificationText}>
                  🔔 <strong>{n.message}</strong>
                </Text>
                <Text style={dateText}>
                  {new Date(n.createdAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                {/* Ponemos una línea separadora salvo en el último elemento */}
                {index < notifications.length - 1 && <Hr style={hr} />}
              </div>
            ))}
          </Section>

          <Text style={text}>
            Entra en la aplicación para gestionar tus deudas.
          </Text>
          
          <Section style={buttonContainer}>
            <Link href="https://www.0debt.xyz" style={button}>
              Ir a 0debt
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// --- Estilos (React Email usa estilos en línea para máxima compatibilidad) ---
const main = { backgroundColor: "#f6f9fc", fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "20px 0 48px", marginBottom: "64px" };
const box = { padding: "24px", backgroundColor: "#f2f3f3", borderRadius: "4px", margin: "0 20px" };
const h1 = { color: "#333", fontSize: "24px", fontWeight: "bold", textAlign: "center" as const, padding: "10px" };
const text = { color: "#525f7f", fontSize: "16px", padding: "0 24px", lineHeight: "24px" };
const item = { padding: "10px 0" };
const notificationText = { margin: "0", color: "#333", fontSize: "15px" };
const dateText = { margin: "4px 0 0", color: "#8898aa", fontSize: "12px", textTransform: "capitalize" as const };
const hr = { borderColor: "#e6ebf1", margin: "15px 0" };
const buttonContainer = { textAlign: "center" as const, marginTop: "20px" };
const button = { backgroundColor: "#000", color: "#fff", padding: "12px 20px", borderRadius: "5px", textDecoration: "none", fontSize: "16px", fontWeight: "bold" };

export default WeeklySummaryEmail;