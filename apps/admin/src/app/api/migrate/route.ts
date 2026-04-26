import { NextRequest, NextResponse } from 'next/server';
import { db } from '@lojeo/db';
import { sql } from 'drizzle-orm';

// Protected migration endpoint — run after deploy to apply pending schema changes.
// Requires X-Migration-Secret header matching MIGRATION_SECRET env var.
export const dynamic = 'force-dynamic';

const MIGRATION_SECRET = process.env.MIGRATION_SECRET ?? '';

export async function POST(req: NextRequest) {
  // If MIGRATION_SECRET is set, require it; otherwise allow (dev/bootstrap mode)
  if (MIGRATION_SECRET) {
    const secret = req.headers.get('x-migration-secret') ?? '';
    if (secret !== MIGRATION_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const results: string[] = [];

  try {
    // Migration 0007 — support_tickets, ticket_messages, ticket_templates
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        user_id uuid,
        customer_name varchar(200) NOT NULL,
        customer_email varchar(300) NOT NULL,
        order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
        subject varchar(300) NOT NULL,
        status varchar(20) DEFAULT 'open' NOT NULL,
        priority varchar(20) DEFAULT 'medium' NOT NULL,
        source varchar(20) DEFAULT 'web' NOT NULL,
        assigned_to_user_id uuid,
        sla_hours integer DEFAULT 24,
        sla_deadline_at timestamptz,
        resolved_at timestamptz,
        closed_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    results.push('support_tickets: ok');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
        user_id uuid,
        sender_type varchar(20) NOT NULL,
        body text NOT NULL,
        is_internal boolean DEFAULT false NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    results.push('ticket_messages: ok');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        name varchar(200) NOT NULL,
        body text NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    results.push('ticket_templates: ok');

    // Indexes — IF NOT EXISTS available in PG 9.5+
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON support_tickets(tenant_id, status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_tenant_priority ON support_tickets(tenant_id, priority)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_order ON support_tickets(order_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to_user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_created ON support_tickets(created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON ticket_messages(ticket_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ticket_msgs_created ON ticket_messages(created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ticket_templates_tenant ON ticket_templates(tenant_id)`);
    results.push('indexes: ok');

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg, results }, { status: 500 });
  }
}
