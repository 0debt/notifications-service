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
  Img,
} from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Bienvenido a 0debt, {name}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>¡Bienvenido a 0debt!</Heading>
          
          <Text style={text}>Hola <strong>{name}</strong>,</Text>
          <Text style={text}>
            Estamos encantados de que te hayas unido. Con 0debt, gestionar los gastos compartidos nunca ha sido tan fácil (ni tan justo).
          </Text>

          <Section style={box}>
            <Text style={paragraph}>
              Ya puedes empezar a crear grupos, añadir amigos y registrar gastos. 
              Nosotros nos encargamos de las matemáticas.
            </Text>
            
            <Button href="https://www.0debt.xyz/groups" style={button}>
              Ir a grupos
            </Button>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            Si tienes alguna duda, responde a este correo. <br/>
            El equipo de 0debt.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// --- Estilos ---
const main = { backgroundColor: "#f6f9fc", fontFamily: 'sans-serif' };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px 20px", borderRadius: "5px" };
const h1 = { color: "#333", textAlign: "center" as const };
const text = { color: "#525f7f", fontSize: "16px", lineHeight: "24px" };
const paragraph = { color: "#525f7f", fontSize: "16px", marginBottom: "20px" };
const box = { padding: "20px", textAlign: "center" as const };
const button = { backgroundColor: "#000", color: "#fff", padding: "12px 25px", borderRadius: "5px", textDecoration: "none", fontWeight: "bold", fontSize: "16px" };
const hr = { borderColor: "#e6ebf1", margin: "30px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };

export default WelcomeEmail;