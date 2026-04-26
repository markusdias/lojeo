import { db } from './client';
import { tenants, users } from './schema/index';

async function main() {
  console.warn('→ Seed inicial...');

  const tenantId = '00000000-0000-0000-0000-000000000001';
  await db
    .insert(tenants)
    .values({
      id: tenantId,
      slug: 'joias-lab',
      name: 'Joias Lab',
      templateId: 'jewelry-v1',
      domain: 'joias.localhost',
      config: { currency: 'BRL', locale: 'pt-BR' },
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      tenantId,
      email: 'admin@lojeo.dev',
      name: 'Admin Lojeo',
      role: 'admin',
      emailVerified: new Date(),
    })
    .onConflictDoNothing();

  console.warn('✓ Seed pronto: tenant joias-lab + admin@lojeo.dev');
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Seed falhou:', err);
  process.exit(1);
});
