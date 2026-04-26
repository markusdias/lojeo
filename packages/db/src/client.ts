import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL não configurada');
}

const client = postgres(url, {
  max: process.env.NODE_ENV === 'production' ? 10 : 3,
  prepare: false,
});

export const db = drizzle(client, { schema, logger: process.env.DB_LOG === '1' });
export type Database = typeof db;
export { schema };
