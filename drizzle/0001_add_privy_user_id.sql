-- Add privy_user_id column and make wallet nullable for Privy authentication migration

-- Make wallet nullable (Privy users may not have a wallet linked)
ALTER TABLE "users" ALTER COLUMN "wallet" DROP NOT NULL;--> statement-breakpoint

-- Add privy_user_id column for Privy authentication
ALTER TABLE "users" ADD COLUMN "privy_user_id" text;--> statement-breakpoint

-- Add unique constraint on privy_user_id
ALTER TABLE "users" ADD CONSTRAINT "users_privy_user_id_key" UNIQUE("privy_user_id");
