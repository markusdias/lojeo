CREATE TABLE "product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"order_id" uuid,
	"user_id" uuid,
	"anonymous_name" varchar(100),
	"anonymous_email" varchar(300),
	"rating" integer NOT NULL,
	"title" varchar(200),
	"body" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"admin_response" text,
	"verified_purchase" boolean DEFAULT false NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reviews_product" ON "product_reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_tenant_status" ON "product_reviews" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_reviews_user" ON "product_reviews" USING btree ("user_id");