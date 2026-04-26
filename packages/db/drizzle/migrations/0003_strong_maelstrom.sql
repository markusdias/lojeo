CREATE TABLE "gift_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"initial_value_cents" integer NOT NULL,
	"current_balance_cents" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"buyer_user_id" uuid,
	"recipient_email" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restock_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"email" varchar(300),
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"anonymous_id" varchar(64),
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_notifications" ADD CONSTRAINT "restock_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_notifications" ADD CONSTRAINT "restock_notifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_notifications" ADD CONSTRAINT "restock_notifications_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_giftcard_code" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_giftcard_tenant" ON "gift_cards" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_restock_variant" ON "restock_notifications" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_restock_product" ON "restock_notifications" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_wishlist_user" ON "wishlist_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wishlist_anon" ON "wishlist_items" USING btree ("anonymous_id");--> statement-breakpoint
CREATE INDEX "idx_wishlist_product" ON "wishlist_items" USING btree ("product_id");