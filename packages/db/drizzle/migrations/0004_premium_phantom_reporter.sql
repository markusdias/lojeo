ALTER TABLE "orders" ADD COLUMN "is_gift" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gift_message" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gift_packaging_cents" integer DEFAULT 0;