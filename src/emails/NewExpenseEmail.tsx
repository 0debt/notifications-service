// src/emails/NewExpenseEmail.tsx
import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
  Button,
} from "@react-email/components";

// 1. Definimos la interfaz (los tipos de datos)
interface NewExpenseEmailProps {
  payerName: string;
  amount: number;
  description: string;
  groupId: string;
  owedAmount?: number;
}

// 2. Definimos el componente
export const NewExpenseEmail = ({
  payerName,
  amount,
  description,
  groupId,
  owedAmount = 0,
}: NewExpenseEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>💸 Nuevo gasto: {description}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Nuevo Gasto Registrado</Heading>
          
          <Text style={text}>
            Hola, <strong>{payerName}</strong> ha registrado un nuevo pago en el grupo.
          </Text>

          <Section style={box}>
            <Text style={amountText}>
              {amount}€
            </Text>
            <Text style={descriptionText}>
              Concepto: <strong>{description}</strong>
            </Text>
            
            {owedAmount > 0 && (
              <Text style={debtText}>
                Te toca pagar: <span style={{ color: "#e11d48" }}>{owedAmount}€</span>
              </Text>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button href={`https://www.0debt.xyz/expenses?group=${groupId}`} style={button}>
              Ver Gasto en la App
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Recibes esto porque tienes las notificaciones activadas en 0debt.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// 3. Estilos
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "5px",
  maxWidth: "600px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
};

const box = {
  padding: "24px",
  backgroundColor: "#f2f3f3",
  borderRadius: "4px",
  textAlign: "center" as const,
  margin: "20px 0",
};

const amountText = {
  margin: "0",
  color: "#333",
  fontSize: "32px",
  fontWeight: "bold",
};

const descriptionText = {
  margin: "8px 0 0",
  color: "#525f7f",
  fontSize: "16px",
};

const debtText = {
  marginTop: "16px",
  fontSize: "18px",
  fontWeight: "bold",
  color: "#333",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
};

const button = {
  backgroundColor: "#000000",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  textAlign: "center" as const,
};