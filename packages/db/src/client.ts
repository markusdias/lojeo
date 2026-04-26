import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const url =
  process.env.DATABASE_URL ??
  'postgres://placeholder:placeholder@localhost:5432/placeholder?sslmode=disable';

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  // build-time / dev fallback — postgres-js só conecta na primeira query
}

const client = postgres(url, {
  max: process.env.NODE_ENV === 'production' ? 10 : 3,
  prepare: false,
});

export const db = drizzle(client, { schema, logger: process.env.DB_LOG === '1' });
export type Database = typeof db;
export { schema };
