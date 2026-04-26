import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada');

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.warn('→ Aplicando migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  console.warn('✓ Migrations aplicadas');

  await client.end();
}

main().catch((err) => {
  console.error('✗ Falha ao migrar:', err);
  process.exit(1);
});
