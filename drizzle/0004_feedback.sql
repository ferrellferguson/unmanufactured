-- Feedback table
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "message" text NOT NULL,
  "name" varchar(255),
  "email" varchar(255),
  "created_at" timestamp NOT NULL DEFAULT now()
);
