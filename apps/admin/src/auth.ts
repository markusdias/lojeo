import NextAuth, { type NextAuthResult } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens } from '@lojeo/db';
import { eq } from 'drizzle-orm';

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (process.env.NODE_ENV !== 'production' || process.env.ADMIN_DEV_LOGIN === 'true') {
  providers.push(
    Credentials({
      id: 'dev-login',
      name: 'Dev login (sem provider)',
      credentials: { email: { label: 'Email', type: 'email' } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').toLowerCase().trim();
        if (!email) return null;
        let user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) {
          const [created] = await db.insert(users).values({
            email,
            name: email.split('@')[0],
            emailVerified: new Date(),
          }).returning();
          user = created;
        }
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  );
}

const result: NextAuthResult = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  trustHost: true,
  providers,
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request }) {
      const isLogged = !!auth?.user;
      const isLogin = request.nextUrl.pathname.startsWith('/login');
      if (isLogin) return true;
      return isLogged;
    },
  },
});

type SignInFn = NextAuthResult['signIn'];
type SignOutFn = NextAuthResult['signOut'];
type AuthFn = NextAuthResult['auth'];

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const signIn: SignInFn = result.signIn;
export const signOut: SignOutFn = result.signOut;
export const auth: AuthFn = result.auth;
