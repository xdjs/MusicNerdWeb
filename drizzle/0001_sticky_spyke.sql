CREATE TYPE "public"."platform_type" AS ENUM('social', 'web3', 'listen');--> statement-breakpoint
CREATE TABLE "aiprompts" (
	"prompt_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"prompt_before_name" text NOT NULL,
	"prompt_after_name" text NOT NULL,
	"is_active" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "coverage_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository" varchar(255) NOT NULL,
	"branch" varchar(255) NOT NULL,
	"commit_sha" varchar(40) NOT NULL,
	"workflow_run_id" varchar(50),
	"coverage_data" jsonb NOT NULL,
	"total_coverage" numeric(5, 2),
	"lines_covered" integer,
	"lines_total" integer,
	"functions_covered" integer,
	"functions_total" integer,
	"branches_covered" integer,
	"branches_total" integer,
	"statements_covered" integer,
	"statements_total" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funfacts" (
	"id" integer PRIMARY KEY NOT NULL,
	"lore_drop" text NOT NULL,
	"behind_the_scenes" text NOT NULL,
	"recent_activity" text NOT NULL,
	"surprise_me" text NOT NULL,
	"is_active" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "urlmap" DROP CONSTRAINT "urlmap_siteurl_key";--> statement-breakpoint
ALTER TABLE "urlmap" DROP CONSTRAINT "urlmap_sitename_key";--> statement-breakpoint
ALTER TABLE "urlmap" DROP CONSTRAINT "urlmap_appstingformat_key";--> statement-breakpoint
ALTER TABLE "artists" DROP CONSTRAINT "artists_addedby_fkey";
--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP CONSTRAINT "ugcresearch_artistID_fkey";
--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP CONSTRAINT "ugcresearch_userID_fkey";
--> statement-breakpoint
ALTER TABLE "ugcwhitelist" DROP CONSTRAINT "ugcwhitelist_userid_fkey";
--> statement-breakpoint
ALTER TABLE "urlmap" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "urlmap" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "ugcresearch" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_white_listed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_artist" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "added_by" uuid DEFAULT uuid_generate_v4() NOT NULL;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "supercollector" text;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "site_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "site_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "app_string_format" text NOT NULL;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "order" integer;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "is_iframe_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "is_embed_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "card_description" text;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "card_platform_name" text;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "is_web3_site" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "site_image" text;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "regex" text DEFAULT '""' NOT NULL;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "regex_matcher" text;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "is_monetized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "regex_options" text[];--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "platform_type_list" "platform_type"[] DEFAULT '{"social"}';--> statement-breakpoint
ALTER TABLE "urlmap" ADD COLUMN "color_hex" text NOT NULL;--> statement-breakpoint
ALTER TABLE "featured" ADD COLUMN "featured_artist" uuid;--> statement-breakpoint
ALTER TABLE "featured" ADD COLUMN "featured_collector" uuid;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD COLUMN "artist_uri" text;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD COLUMN "ugc_url" text;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD COLUMN "site_name" text;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD COLUMN "site_username" text;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD COLUMN "artist_id" uuid;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD COLUMN "date_processed" timestamp;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "ugcwhitelist" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_addedby_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured" ADD CONSTRAINT "featured_featuredartist_fkey" FOREIGN KEY ("featured_artist") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured" ADD CONSTRAINT "featured_featuredcollector_fkey" FOREIGN KEY ("featured_collector") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD CONSTRAINT "ugcresearch_artistID_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ugcresearch" ADD CONSTRAINT "ugcresearch_userID_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ugcwhitelist" ADD CONSTRAINT "ugcwhitelist_userid_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" DROP COLUMN "addedBy";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "siteurl";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "sitename";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "appstingformat";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "cardorder";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "isiframeenabled";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "isembedenabled";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "carddescription";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "cardplatformname";--> statement-breakpoint
ALTER TABLE "urlmap" DROP COLUMN "isweb3site";--> statement-breakpoint
ALTER TABLE "featured" DROP COLUMN "featuredartist";--> statement-breakpoint
ALTER TABLE "featured" DROP COLUMN "featuredcollector";--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP COLUMN "artistURI";--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP COLUMN "ugcURL";--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP COLUMN "siteName";--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP COLUMN "siteUsername";--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP COLUMN "artistID";--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP COLUMN "dateProcessed";--> statement-breakpoint
ALTER TABLE "ugcresearch" DROP COLUMN "userID";--> statement-breakpoint
ALTER TABLE "ugcwhitelist" DROP COLUMN "userid";--> statement-breakpoint
ALTER TABLE "urlmap" ADD CONSTRAINT "urlmap_siteurl_key" UNIQUE("site_url");--> statement-breakpoint
ALTER TABLE "urlmap" ADD CONSTRAINT "urlmap_sitename_key" UNIQUE("site_name");--> statement-breakpoint
ALTER TABLE "urlmap" ADD CONSTRAINT "urlmap_appstingformat_key" UNIQUE("app_string_format");