import { Html, Body, Container, Heading, Text, Button, Hr } from '@react-email/components';

export interface WelcomeProps {
  storeName: string;
  customerName: string;
  loginUrl: string;
}

export function Welcome({ storeName, customerName, loginUrl }: WelcomeProps) {
  return (
    <Html lang="pt-BR">
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8f7f4' }}>
        <Container style={{ padding: '32px 24px', maxWidth: 560 }}>
          <Heading style={{ color: '#1a1a1a', fontSize: 24 }}>Bem-vindo, {customerName}!</Heading>
          <Text>Sua conta na {storeName} está pronta. Acesse seus pedidos e favoritos.</Text>
          <Button
            href={loginUrl}
            style={{
              backgroundColor: '#1a1a1a',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 4,
              textDecoration: 'none',
            }}
          >
            Acessar minha conta
          </Button>
          <Hr style={{ marginTop: 32, borderColor: '#e0ddd4' }} />
          <Text style={{ fontSize: 12, color: '#666' }}>
            {storeName} — você recebe esse email porque criou conta na nossa loja.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
