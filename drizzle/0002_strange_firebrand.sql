CREATE TABLE "customers" (
	"whatsapp" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "product_interests" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_interests" ADD COLUMN "notified_at" timestamp;