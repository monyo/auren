CREATE TYPE "public"."murmur_status" AS ENUM('active', 'deleted', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('active', 'deleted', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."verification_level" AS ENUM('level_1', 'level_2', 'level_3', 'level_4');--> statement-breakpoint
CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text,
	"moderator_id" text,
	"required_level" "verification_level" DEFAULT 'level_1' NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "murmur_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"murmur_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"content_edited_at" timestamp,
	"status" "murmur_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "murmurs" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"content_edited_at" timestamp,
	"status" "murmur_status" DEFAULT 'active' NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"phone_hash" text NOT NULL,
	"code" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_edited_at" timestamp,
	"status" "post_status" DEFAULT 'active' NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"content_edited_at" timestamp,
	"status" "post_status" DEFAULT 'active' NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"source_text" text NOT NULL,
	"target_lang" text NOT NULL,
	"translated_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorite_boards" (
	"user_id" text NOT NULL,
	"board_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"nickname_changed_at" timestamp,
	"verification_level" "verification_level" DEFAULT 'level_1' NOT NULL,
	"daily_post_count" integer DEFAULT 0 NOT NULL,
	"daily_post_reset_at" timestamp DEFAULT now() NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verified_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"phone_hash" text NOT NULL,
	"verification_level" "verification_level" DEFAULT 'level_1' NOT NULL,
	"device_fingerprint" text,
	"payment_method_hash" text,
	"gov_id_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "murmur_replies" ADD CONSTRAINT "murmur_replies_murmur_id_murmurs_id_fk" FOREIGN KEY ("murmur_id") REFERENCES "public"."murmurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "murmur_replies" ADD CONSTRAINT "murmur_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "murmurs" ADD CONSTRAINT "murmurs_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_boards" ADD CONSTRAINT "user_favorite_boards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_boards" ADD CONSTRAINT "user_favorite_boards_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_identity_id_verified_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."verified_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_slug_idx" ON "boards" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "murmur_replies_murmur_id_idx" ON "murmur_replies" USING btree ("murmur_id","id");--> statement-breakpoint
CREATE INDEX "murmurs_author_id_idx" ON "murmurs" USING btree ("author_id","id");--> statement-breakpoint
CREATE INDEX "murmurs_created_at_idx" ON "murmurs" USING btree ("id");--> statement-breakpoint
CREATE INDEX "otp_codes_phone_hash_idx" ON "otp_codes" USING btree ("phone_hash");--> statement-breakpoint
CREATE INDEX "posts_board_id_idx" ON "posts" USING btree ("board_id","id");--> statement-breakpoint
CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "replies_post_id_idx" ON "replies" USING btree ("post_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorite_boards_pk" ON "user_favorite_boards" USING btree ("user_id","board_id");--> statement-breakpoint
CREATE INDEX "user_favorite_boards_user_idx" ON "user_favorite_boards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tokens_identity_id_idx" ON "user_tokens" USING btree ("identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verified_identities_phone_hash_idx" ON "verified_identities" USING btree ("phone_hash");