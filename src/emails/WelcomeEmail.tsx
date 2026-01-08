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
      <Preview>Welcome to 0debt, {name}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to 0debt!</Heading>
          
          <Text style={text}>Hello <strong>{name}</strong>,</Text>
          <Text style={text}>
            We're delighted that you've joined. With 0debt, managing shared expenses has never been easier (or fairer).
          </Text>

          <Section style={box}>
            <Text style={paragraph}>
              You can now start creating groups, adding friends, and registering expenses. 
              We'll take care of the math.
            </Text>
            
            <Button href="https://www.0debt.xyz/groups" style={button}>
              Go to groups
            </Button>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            If you have any questions, reply to this email. <br/>
            The 0debt team.
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