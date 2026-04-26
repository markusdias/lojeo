import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Edge-compatible config — no DB imports
const providers: NextAuthConfig['providers'] = [];

if (process.env.CUSTOMER_GOOGLE_CLIENT_ID && process.env.CUSTOMER_GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.CUSTOMER_GOOGLE_CLIENT_ID,
      clientSecret: process.env.CUSTOMER_GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { signIn: '/entrar' },
  providers,
};
