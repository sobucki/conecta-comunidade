import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_opportunity_events_action" AS ENUM('close', 'deadline_closed', 'select', 'selected_withdrawal', 'cancel', 'close_without_selection');
  CREATE TABLE "opportunity_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"opportunity_id" integer NOT NULL,
  	"school_id" integer NOT NULL,
  	"actor_id" integer NOT NULL,
  	"actor_name" varchar NOT NULL,
  	"action" "enum_opportunity_events_action" NOT NULL,
  	"revision" numeric NOT NULL,
  	"previous_status" varchar NOT NULL,
  	"next_status" varchar NOT NULL,
  	"application_id" integer,
  	"reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "opportunities" ADD COLUMN "decision_revision" numeric DEFAULT 0;
  ALTER TABLE "opportunities" ADD COLUMN "closed_at" timestamp(3) with time zone;
  ALTER TABLE "opportunities" ADD COLUMN "selected_at" timestamp(3) with time zone;
  ALTER TABLE "opportunities" ADD COLUMN "closed_by_id" integer;
  ALTER TABLE "opportunities" ADD COLUMN "selected_by_id" integer;
  ALTER TABLE "opportunities" ADD COLUMN "selected_application_id" integer;
  ALTER TABLE "opportunities" ADD COLUMN "resolution_reason" varchar;
  ALTER TABLE "applications" ADD COLUMN "decision_at" timestamp(3) with time zone;
  ALTER TABLE "applications" ADD COLUMN "decision_by_id" integer;
  ALTER TABLE "application_events" ADD COLUMN "private_reason" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "opportunity_events_id" integer;
  ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "opportunity_events_opportunity_idx" ON "opportunity_events" USING btree ("opportunity_id");
  CREATE INDEX "opportunity_events_school_idx" ON "opportunity_events" USING btree ("school_id");
  CREATE INDEX "opportunity_events_actor_idx" ON "opportunity_events" USING btree ("actor_id");
  CREATE INDEX "opportunity_events_application_idx" ON "opportunity_events" USING btree ("application_id");
  CREATE INDEX "opportunity_events_updated_at_idx" ON "opportunity_events" USING btree ("updated_at");
  CREATE INDEX "opportunity_events_created_at_idx" ON "opportunity_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "opportunity_revision_idx" ON "opportunity_events" USING btree ("opportunity_id","revision");
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_closed_by_id_users_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_selected_by_id_users_id_fk" FOREIGN KEY ("selected_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_selected_application_id_applications_id_fk" FOREIGN KEY ("selected_application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_decision_by_id_users_id_fk" FOREIGN KEY ("decision_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opportunity_events_fk" FOREIGN KEY ("opportunity_events_id") REFERENCES "public"."opportunity_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "opportunities_closed_by_idx" ON "opportunities" USING btree ("closed_by_id");
  CREATE INDEX "opportunities_selected_by_idx" ON "opportunities" USING btree ("selected_by_id");
  CREATE INDEX "opportunities_selected_application_idx" ON "opportunities" USING btree ("selected_application_id");
  CREATE INDEX "applications_decision_by_idx" ON "applications" USING btree ("decision_by_id");
  CREATE UNIQUE INDEX "applications_one_selected_idx" ON "applications" USING btree ("opportunity_id") WHERE "applications"."status" = 'SELECTED';
  CREATE INDEX "payload_locked_documents_rels_opportunity_events_id_idx" ON "payload_locked_documents_rels" USING btree ("opportunity_events_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM opportunity_events) THEN
        RAISE EXCEPTION 'Não é possível reverter: existem decisões do M4. Preserve o histórico.';
      END IF;
    END $$;
   ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_closed_by_id_users_id_fk";

  ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_selected_by_id_users_id_fk";

  ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_selected_application_id_applications_id_fk";

  ALTER TABLE "applications" DROP CONSTRAINT "applications_decision_by_id_users_id_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_opportunity_events_fk";

  DROP INDEX "opportunities_closed_by_idx";
  DROP INDEX "opportunities_selected_by_idx";
  DROP INDEX "opportunities_selected_application_idx";
  DROP INDEX "applications_decision_by_idx";
  DROP INDEX "applications_one_selected_idx";
  DROP INDEX "payload_locked_documents_rels_opportunity_events_id_idx";
  ALTER TABLE "opportunities" DROP COLUMN "decision_revision";
  ALTER TABLE "opportunities" DROP COLUMN "closed_at";
  ALTER TABLE "opportunities" DROP COLUMN "selected_at";
  ALTER TABLE "opportunities" DROP COLUMN "closed_by_id";
  ALTER TABLE "opportunities" DROP COLUMN "selected_by_id";
  ALTER TABLE "opportunities" DROP COLUMN "selected_application_id";
  ALTER TABLE "opportunities" DROP COLUMN "resolution_reason";
  ALTER TABLE "applications" DROP COLUMN "decision_at";
  ALTER TABLE "applications" DROP COLUMN "decision_by_id";
  ALTER TABLE "application_events" DROP COLUMN "private_reason";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "opportunity_events_id";
  DROP TABLE "opportunity_events";
  DROP TYPE "public"."enum_opportunity_events_action";`)
}
