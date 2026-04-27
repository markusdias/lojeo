import NextAuth, { type NextAuthResult } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import { authConfig } from './auth.config';

const providers = [...authConfig.providers];

if (process.env.NODE_ENV !== 'production') {
  providers.push(
    Credentials({
      id: 'dev-customer-login',
      name: 'Dev login (cliente)',
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
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  events: {
    async createUser({ user }) {
      // Welcome email — fire-and-forget. Falha NÃO derruba signup.
      if (!user.email) return;
      try {
        const { sendWelcomeEmail } = await import('./lib/email/transactional');
        await sendWelcomeEmail({
          customerEmail: user.email,
          customerName: user.name ?? user.email.split('@')[0] ?? 'Cliente',
        });
      } catch (err) {
        console.warn('[auth.events.createUser] welcome email failed', err);
      }
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
