CREATE TABLE "murmur_upvotes" (
  "murmur_id" text NOT NULL REFERENCES "murmurs"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("murmur_id", "user_id")
);
