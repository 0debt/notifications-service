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
  Button,
  Hr,
} from "@react-email/components";

interface GroupInvitationEmailProps {
  groupName: string;
}

export const GroupInvitationEmail = ({ groupName }: GroupInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Te han invitado al grupo {groupName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>¡Nueva Invitación! 👥</Heading>
          
          <Text style={text}>
            Has sido añadido al grupo de gastos: <strong>{groupName}</strong>.
          </Text>

          <Section style={box}>
            <Text style={paragraph}>
              Ahora podrás ver los gastos compartidos, añadir tickets y ver cuánto debes (o cuánto te deben).
            </Text>
            
            <Button href={`https://www.0debt.xyz/groups/${groupName}`} style={button}>
              Ir al Grupo
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>0debt - Cuentas claras, amistades largas.</Text>
        </Container>
      </Body>
    </Html>
  );
};

// Estilos
const main = { backgroundColor: "#f6f9fc", fontFamily: 'sans-serif' };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px 20px", borderRadius: "5px" };
const h1 = { color: "#333", textAlign: "center" as const };
const text = { color: "#525f7f", fontSize: "16px" };
const paragraph = { color: "#525f7f", fontSize: "16px", marginBottom: "20px" };
const box = { padding: "20px", textAlign: "center" as const, backgroundColor: "#f9f9f9", borderRadius: "5px" };
const button = { backgroundColor: "#000", color: "#fff", padding: "12px 25px", borderRadius: "5px", textDecoration: "none", fontWeight: "bold" };
const hr = { borderColor: "#e6ebf1", margin: "30px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };