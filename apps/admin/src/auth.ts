import NextAuth, { type NextAuthResult } from 'next-auth';
import 'next-auth/jwt';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens, userTwoFactor } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import { autoAcceptInvitesForUser } from './lib/invites';

// Estender tipos de sessão/JWT para carregar requires2FA (Sprint 5: 2FA enforcement)
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      requires2FA?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    requires2FA?: boolean;
  }
}

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
      const path = request.nextUrl.pathname;
      const isLogin = path.startsWith('/login');
      // Sprint 5 — convite por URL+token: rotas de convite acessíveis sem login
      const isInvite = path.startsWith('/invite/') || path === '/api/users/invites/accept';
      if (isLogin || isInvite) return true;
      return isLogged;
    },
    // JWT callback — roda em Node runtime no signIn e em refreshes.
    // Embed `requires2FA` no token para evitar DB lookup a cada request no middleware (edge).
    async jwt({ token, user, trigger }) {
      // Carregar user.id no signIn (user vem populado apenas aqui)
      if (user?.id) {
        token.uid = user.id;
      }
      // Carregar/recarregar requires2FA quando: signIn (user presente) ou update explícito
      const shouldLoad2fa = !!user || trigger === 'update' || token.requires2FA === undefined;
      const userId = (token.uid as string | undefined) ?? (typeof token.sub === 'string' ? token.sub : undefined);
      if (shouldLoad2fa && userId) {
        try {
          const [row] = await db
            .select({ enabled: userTwoFactor.enabled })
            .from(userTwoFactor)
            .where(eq(userTwoFactor.userId, userId))
            .limit(1);
          token.requires2FA = row?.enabled === 'true';
        } catch {
          // Em caso de falha (DB indisponível), não bloquear login — degradar para false
          token.requires2FA = token.requires2FA ?? false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const uid = (typeof token.uid === 'string' ? token.uid : undefined)
          ?? (typeof token.sub === 'string' ? token.sub : undefined);
        if (uid) session.user.id = uid;
        session.user.requires2FA = !!token.requires2FA;
      }
      return session;
    },
    // Sprint 5 — auto-aceite de convites pendentes no signIn.
    // Não interfere com o callback `jwt` (2FA) acima. Falha aqui NUNCA bloqueia login.
    async signIn({ user }) {
      try {
        const email = user?.email?.toLowerCase();
        const userId = user?.id;
        if (email && userId) {
          await autoAcceptInvitesForUser({ userId, email });
        }
      } catch (err) {
        console.warn('[invite] auto-accept failed:', err instanceof Error ? err.message : err);
      }
      return true;
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
