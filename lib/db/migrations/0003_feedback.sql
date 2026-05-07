CREATE TABLE "feedback" (
  "id" text PRIMARY KEY,
  "user_id" text REFERENCES "users"("id"),
  "content" text NOT NULL,
  "category" text NOT NULL DEFAULT 'general',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");
