ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."order_status";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'delivered', 'cancelled');--> statement-breakpoint
ALTER TABLE "public"."orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "public"."orders" ALTER COLUMN "status" SET DEFAULT 'pending';
