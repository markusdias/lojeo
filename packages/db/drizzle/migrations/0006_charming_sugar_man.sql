ALTER TABLE "orders" ADD COLUMN "customer_email" varchar(300);--> statement-breakpoint
CREATE INDEX "idx_orders_customer_email" ON "orders" USING btree ("tenant_id","customer_email");