CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"customer_name" varchar(200) NOT NULL,
	"customer_email" varchar(300) NOT NULL,
	"order_id" uuid,
	"subject" varchar(300) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"source" varchar(20) DEFAULT 'web' NOT NULL,
	"assigned_to_user_id" uuid,
	"sla_hours" integer DEFAULT 24,
	"sla_deadline_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"user_id" uuid,
	"sender_type" varchar(20) NOT NULL,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_templates" ADD CONSTRAINT "ticket_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tickets_tenant_status" ON "support_tickets" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_tickets_tenant_priority" ON "support_tickets" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE INDEX "idx_tickets_user" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_order" ON "support_tickets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_assigned" ON "support_tickets" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_created" ON "support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ticket_msgs_ticket" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_msgs_created" ON "ticket_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ticket_templates_tenant" ON "ticket_templates" USING btree ("tenant_id");