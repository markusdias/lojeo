import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://lojeo:lojeo@localhost:5432/lojeo',
  },
  strict: true,
  verbose: true,
} satisfies Config;
