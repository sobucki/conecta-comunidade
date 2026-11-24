import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_applications_status" AS ENUM('SUBMITTED', 'WITHDRAWN');
  CREATE TYPE "public"."enum_applications_profile_snapshot_community_link" AS ENUM('guardian', 'relative', 'friend', 'former-student', 'local', 'other');
  CREATE TYPE "public"."enum_application_events_action" AS ENUM('submit', 'edit', 'withdraw', 'resubmit');
  CREATE TABLE "applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"candidate_name" varchar NOT NULL,
  	"opportunity_id" integer NOT NULL,
  	"candidate_id" integer NOT NULL,
  	"school_id" integer NOT NULL,
  	"status" "enum_applications_status" NOT NULL,
  	"availability" varchar NOT NULL,
  	"experience" varchar,
  	"profile_snapshot_email" varchar,
  	"profile_snapshot_phone" varchar,
  	"profile_snapshot_community_link" "enum_applications_profile_snapshot_community_link",
  	"profile_snapshot_skills" varchar,
  	"profile_snapshot_professional_summary" varchar,
  	"accepted_conditions" jsonb NOT NULL,
  	"accepted_at" timestamp(3) with time zone NOT NULL,
  	"first_submitted_at" timestamp(3) with time zone NOT NULL,
  	"submitted_at" timestamp(3) with time zone NOT NULL,
  	"withdrawn_at" timestamp(3) with time zone,
  	"revision" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "application_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"application_id" integer NOT NULL,
  	"school_id" integer NOT NULL,
  	"candidate_id" integer NOT NULL,
  	"actor_id" integer NOT NULL,
  	"action" "enum_application_events_action" NOT NULL,
  	"revision" numeric NOT NULL,
  	"snapshot" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "opportunities" ADD COLUMN "clarification" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "applications_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "application_events_id" integer;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_events" ADD CONSTRAINT "application_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_events" ADD CONSTRAINT "application_events_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_events" ADD CONSTRAINT "application_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "applications_opportunity_idx" ON "applications" USING btree ("opportunity_id");
  CREATE INDEX "applications_candidate_idx" ON "applications" USING btree ("candidate_id");
  CREATE INDEX "applications_school_idx" ON "applications" USING btree ("school_id");
  CREATE INDEX "applications_updated_at_idx" ON "applications" USING btree ("updated_at");
  CREATE INDEX "applications_created_at_idx" ON "applications" USING btree ("created_at");
  CREATE UNIQUE INDEX "opportunity_candidate_idx" ON "applications" USING btree ("opportunity_id","candidate_id");
  CREATE INDEX "application_events_application_idx" ON "application_events" USING btree ("application_id");
  CREATE INDEX "application_events_school_idx" ON "application_events" USING btree ("school_id");
  CREATE INDEX "application_events_candidate_idx" ON "application_events" USING btree ("candidate_id");
  CREATE INDEX "application_events_actor_idx" ON "application_events" USING btree ("actor_id");
  CREATE INDEX "application_events_updated_at_idx" ON "application_events" USING btree ("updated_at");
  CREATE INDEX "application_events_created_at_idx" ON "application_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "application_revision_idx" ON "application_events" USING btree ("application_id","revision");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_applications_fk" FOREIGN KEY ("applications_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_application_events_fk" FOREIGN KEY ("application_events_id") REFERENCES "public"."application_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("applications_id");
  CREATE INDEX "payload_locked_documents_rels_application_events_id_idx" ON "payload_locked_documents_rels" USING btree ("application_events_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_applications_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_application_events_fk";

  DROP INDEX "payload_locked_documents_rels_applications_id_idx";
  DROP INDEX "payload_locked_documents_rels_application_events_id_idx";
  ALTER TABLE "opportunities" DROP COLUMN "clarification";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "applications_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "application_events_id";
  DROP TABLE "application_events";
  DROP TABLE "applications";
  DROP TYPE "public"."enum_applications_status";
  DROP TYPE "public"."enum_applications_profile_snapshot_community_link";
  DROP TYPE "public"."enum_application_events_action";`)
}
