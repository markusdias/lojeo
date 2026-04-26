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
    // FKs to tenants only (orders FK skipped to avoid resolution issues — orderId stored as plain UUID)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        user_id uuid,
        customer_name varchar(200) NOT NULL,
        customer_email varchar(300) NOT NULL,
        order_id uuid,
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
        ticket_id uuid NOT NULL,
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
        tenant_id uuid NOT NULL,
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

    // Migration 0004 — gift columns on orders (idempotent)
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT false NOT NULL`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_message text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_packaging_cents integer DEFAULT 0`);
    results.push('orders.gift_columns: ok');

    // Migration 0006 — customer_email on orders (CRITICAL — used in /api/orders, /clientes)
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email varchar(300)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(tenant_id, customer_email)`);
    results.push('orders.customer_email: ok');

    // Sprint 9 — chatbot telemetry sessions
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chatbot_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        session_key varchar(200) NOT NULL,
        product_context_id uuid,
        product_context_name varchar(300),
        msg_count integer DEFAULT 0 NOT NULL,
        tool_call_count integer DEFAULT 0 NOT NULL,
        total_tokens_in integer DEFAULT 0 NOT NULL,
        total_tokens_out integer DEFAULT 0 NOT NULL,
        resolved boolean DEFAULT false NOT NULL,
        escalated boolean DEFAULT false NOT NULL,
        escalated_reason text,
        topics jsonb DEFAULT '[]'::jsonb NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        last_seen_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    results.push('chatbot_sessions: ok');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_tenant_created ON chatbot_sessions(tenant_id, created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_tenant_resolved ON chatbot_sessions(tenant_id, resolved)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_tenant_escalated ON chatbot_sessions(tenant_id, escalated)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_session_key ON chatbot_sessions(tenant_id, session_key)`);
    results.push('chatbot_sessions indexes: ok');

    // Sprint 10 — UGC posts (galeria de clientes)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ugc_posts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        user_id uuid,
        customer_email varchar(300),
        customer_name varchar(200),
        image_url text NOT NULL,
        thumbnail_url text,
        caption text,
        status varchar(20) DEFAULT 'pending' NOT NULL,
        source varchar(30) DEFAULT 'direct_upload' NOT NULL,
        source_url text,
        products_tagged jsonb DEFAULT '[]'::jsonb NOT NULL,
        ai_moderation_result jsonb,
        moderated_by_user_id uuid,
        moderated_at timestamptz,
        rejection_reason text,
        created_at timestamptz DEFAULT now() NOT NULL,
        approved_at timestamptz
      )
    `);
    results.push('ugc_posts: ok');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ugc_tenant_status ON ugc_posts(tenant_id, status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ugc_tenant_approved ON ugc_posts(tenant_id, approved_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ugc_user ON ugc_posts(user_id)`);
    results.push('ugc_posts indexes: ok');

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg, results }, { status: 500 });
  }
}
