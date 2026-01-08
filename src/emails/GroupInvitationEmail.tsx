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
      <Preview>You've been invited to the group {groupName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Invitation! 👥</Heading>
          
          <Text style={text}>
            You've been added to the expense group: <strong>{groupName}</strong>.
          </Text>

          <Section style={box}>
            <Text style={paragraph}>
              Now you can view shared expenses, add tickets, and see how much you owe (or how much you're owed).
            </Text>
            
            <Button href={`https://www.0debt.xyz/groups/${groupName}`} style={button}>
              Go to Group
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>0debt - Clear accounts, long friendships.</Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = { backgroundColor: "#f6f9fc", fontFamily: 'sans-serif' };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px 20px", borderRadius: "5px" };
const h1 = { color: "#333", textAlign: "center" as const };
const text = { color: "#525f7f", fontSize: "16px" };
const paragraph = { color: "#525f7f", fontSize: "16px", marginBottom: "20px" };
const box = { padding: "20px", textAlign: "center" as const, backgroundColor: "#f9f9f9", borderRadius: "5px" };
const button = { backgroundColor: "#000", color: "#fff", padding: "12px 25px", borderRadius: "5px", textDecoration: "none", fontWeight: "bold" };
const hr = { borderColor: "#e6ebf1", margin: "30px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };