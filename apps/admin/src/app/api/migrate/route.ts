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

    // Migration 0002 — orders + order_items + order_events + customer_addresses (CRITICAL)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        order_number varchar(30) NOT NULL,
        user_id uuid,
        customer_name varchar(200),
        customer_phone varchar(30),
        status varchar(30) DEFAULT 'pending' NOT NULL,
        payment_status varchar(30) DEFAULT 'pending' NOT NULL,
        payment_method varchar(40),
        subtotal_cents integer NOT NULL,
        shipping_cents integer DEFAULT 0 NOT NULL,
        discount_cents integer DEFAULT 0 NOT NULL,
        tax_cents integer DEFAULT 0 NOT NULL,
        total_cents integer NOT NULL,
        currency varchar(3) DEFAULT 'BRL' NOT NULL,
        shipping_address jsonb,
        billing_address jsonb,
        shipping_method varchar(60),
        tracking_code varchar(60),
        coupon_code varchar(40),
        utm_source varchar(100),
        utm_medium varchar(100),
        utm_campaign varchar(100),
        notes text,
        metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
        paid_at timestamptz,
        shipped_at timestamptz,
        delivered_at timestamptz,
        cancelled_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    results.push('orders: ok');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(tenant_id, order_number)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        order_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        variant_id uuid,
        product_name varchar(300) NOT NULL,
        variant_name varchar(200),
        sku varchar(100),
        image_url text,
        options jsonb DEFAULT '{}'::jsonb NOT NULL,
        unit_price_cents integer NOT NULL,
        qty integer NOT NULL,
        total_cents integer NOT NULL
      )
    `);
    results.push('order_items: ok');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        order_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        event_type varchar(60) NOT NULL,
        from_status varchar(30),
        to_status varchar(30),
        actor varchar(100) DEFAULT 'system' NOT NULL,
        notes text,
        metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    results.push('order_events: ok');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        user_id uuid,
        label varchar(100),
        recipient_name varchar(200) NOT NULL,
        phone varchar(30),
        postal_code varchar(20) NOT NULL,
        street varchar(300) NOT NULL,
        number varchar(30) NOT NULL,
        complement varchar(100),
        neighborhood varchar(100),
        city varchar(150) NOT NULL,
        state varchar(50) NOT NULL,
        country varchar(2) DEFAULT 'BR' NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    results.push('customer_addresses: ok');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_addresses_user ON customer_addresses(user_id)`);

    // Migration 0004 — gift columns on orders (idempotent)
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT false NOT NULL`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_message text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_packaging_cents integer DEFAULT 0`);
    results.push('orders.gift_columns: ok');

    // Migration 0006 — customer_email on orders (CRITICAL — used in /api/orders, /clientes)
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email varchar(300)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(tenant_id, customer_email)`);
    results.push('orders.customer_email: ok');

    // Schema reconciliation — columns from packages/db schema not in 0002 base
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS anonymous_id varchar(64)`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier varchar(100)`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service varchar(100)`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_deadline_days integer`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway varchar(50)`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_payment_id varchar(200)`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_status varchar(50)`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount_cents integer DEFAULT 0`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS fraud_score integer`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_key varchar(60)`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_url text`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_orders_gateway_payment ON orders(gateway_payment_id)`);
    results.push('orders.schema_reconciliation: ok');

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

    // Sprint 5 — user roles + audit logs
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        email varchar(300) NOT NULL,
        role varchar(30) NOT NULL,
        invited_by_user_id uuid,
        invited_at timestamptz DEFAULT now() NOT NULL,
        accepted_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user ON user_roles(tenant_id, user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_email ON user_roles(tenant_id, email)`);
    results.push('user_roles: ok');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        user_id uuid,
        user_email varchar(300),
        action varchar(80) NOT NULL,
        entity_type varchar(60),
        entity_id uuid,
        before jsonb,
        after jsonb,
        metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
        ip_address varchar(45),
        user_agent text,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_tenant_action ON audit_logs(tenant_id, action)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_tenant_entity ON audit_logs(tenant_id, entity_type, entity_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`);
    results.push('audit_logs: ok');

    // Sprint 5+12 — A/B testing nativo
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS experiments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        key varchar(80) NOT NULL,
        name varchar(200) NOT NULL,
        description text,
        status varchar(20) DEFAULT 'draft' NOT NULL,
        target_metric varchar(60) DEFAULT 'conversion' NOT NULL,
        variants jsonb DEFAULT '[]'::jsonb NOT NULL,
        audience jsonb DEFAULT '{}'::jsonb NOT NULL,
        started_at timestamptz,
        ended_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_experiments_tenant_key ON experiments(tenant_id, key)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_experiments_tenant_status ON experiments(tenant_id, status)`);
    results.push('experiments: ok');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS experiment_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        experiment_id uuid NOT NULL,
        anonymous_id varchar(64) NOT NULL,
        user_id uuid,
        variant_key varchar(40) NOT NULL,
        assigned_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_assignment_anon_experiment ON experiment_assignments(experiment_id, anonymous_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_assignment_tenant_experiment ON experiment_assignments(tenant_id, experiment_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_assignment_user ON experiment_assignments(user_id)`);
    results.push('experiment_assignments: ok');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS experiment_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        experiment_id uuid NOT NULL,
        variant_key varchar(40) NOT NULL,
        anonymous_id varchar(64) NOT NULL,
        user_id uuid,
        event_type varchar(40) NOT NULL,
        value integer DEFAULT 0,
        metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_exp_events_tenant_experiment ON experiment_events(tenant_id, experiment_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_exp_events_experiment_variant ON experiment_events(experiment_id, variant_key)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_exp_events_type ON experiment_events(experiment_id, event_type)`);
    results.push('experiment_events: ok');

    // Sprint 5+13 — 2FA TOTP
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_two_factor (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL UNIQUE,
        secret text NOT NULL,
        enabled text DEFAULT 'false' NOT NULL,
        recovery_codes_hash jsonb DEFAULT '[]'::jsonb NOT NULL,
        enabled_at timestamptz,
        last_used_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    results.push('user_two_factor: ok');

    // Sprint 11 — recommendation_overrides (pin/exclude manual de recomendações por PDP)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS recommendation_overrides (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        product_id uuid NOT NULL,
        recommended_product_id uuid NOT NULL,
        override_type varchar(20) NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rec_overrides_tenant_product ON recommendation_overrides(tenant_id, product_id)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_rec_overrides_tenant_product_target ON recommendation_overrides(tenant_id, product_id, recommended_product_id)`);
    results.push('recommendation_overrides: ok');

    // Sprint 5 — Recently viewed sync DB
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS recently_viewed_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        product_id uuid NOT NULL,
        viewed_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed ON recently_viewed_items(user_id, viewed_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_recently_viewed_tenant_user ON recently_viewed_items(tenant_id, user_id)`);
    results.push('recently_viewed_items: ok');

    // Sprint 4 — Cupons de desconto (admin CRUD + storefront validate)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS coupons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        code varchar(60) NOT NULL,
        name varchar(200) NOT NULL,
        type varchar(20) NOT NULL,
        value integer NOT NULL,
        min_order_cents integer DEFAULT 0 NOT NULL,
        max_uses integer,
        uses_count integer DEFAULT 0 NOT NULL,
        starts_at timestamptz,
        ends_at timestamptz,
        active boolean DEFAULT true NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_coupons_tenant_code ON coupons(tenant_id, code)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_coupons_tenant_active ON coupons(tenant_id, active)`);
    results.push('coupons: ok');

    // Sprint 5 — user_invite_tokens (convite via URL+token, sem Resend)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_invite_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        email varchar(300) NOT NULL,
        role varchar(30) NOT NULL,
        token varchar(64) NOT NULL UNIQUE,
        invited_by_user_id uuid,
        expires_at timestamptz NOT NULL,
        accepted_at timestamptz,
        accepted_by_user_id uuid,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invite_tokens_tenant_email ON user_invite_tokens(tenant_id, email)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON user_invite_tokens(token)`);
    results.push('user_invite_tokens: ok');

    // Migration 0023 — retention tables (wishlist_items, restock_notifications, gift_cards)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        user_id uuid,
        anonymous_id varchar(64),
        product_id uuid NOT NULL,
        variant_id uuid,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wishlist_anon ON wishlist_items(anonymous_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist_items(product_id)`);
    results.push('wishlist_items: ok');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS restock_notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        user_id uuid,
        email varchar(300),
        product_id uuid NOT NULL,
        variant_id uuid,
        notified_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_restock_variant ON restock_notifications(variant_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_restock_product ON restock_notifications(product_id)`);
    results.push('restock_notifications: ok');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gift_cards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        code varchar(32) NOT NULL,
        initial_value_cents integer NOT NULL,
        current_balance_cents integer NOT NULL,
        expires_at timestamptz,
        status varchar(20) DEFAULT 'active' NOT NULL,
        buyer_user_id uuid,
        recipient_email varchar(300),
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_giftcard_code ON gift_cards(code)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_giftcard_tenant ON gift_cards(tenant_id)`);
    results.push('gift_cards: ok');

    // Migration 0024 — product_reviews
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        product_id uuid NOT NULL,
        order_id uuid,
        user_id uuid,
        anonymous_name varchar(100),
        anonymous_email varchar(300),
        rating integer NOT NULL,
        title varchar(200),
        body text,
        status varchar(20) DEFAULT 'pending' NOT NULL,
        admin_response text,
        verified_purchase boolean DEFAULT false NOT NULL,
        helpful_count integer DEFAULT 0 NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reviews_tenant_status ON product_reviews(tenant_id, status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reviews_user ON product_reviews(user_id)`);
    results.push('product_reviews: ok');

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg, results }, { status: 500 });
  }
}
