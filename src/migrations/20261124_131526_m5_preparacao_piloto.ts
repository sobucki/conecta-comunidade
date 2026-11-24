import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pilot_dashboard" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "site_content" ADD COLUMN "support_name" varchar;
  ALTER TABLE "site_content" ADD COLUMN "support_email" varchar;
  ALTER TABLE "site_content" ADD COLUMN "institutional_terms" varchar;
  ALTER TABLE "site_content" ADD COLUMN "institutional_privacy" varchar;
  ALTER TABLE "site_content" ADD COLUMN "content_approved_at" timestamp(3) with time zone;`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pilot_dashboard" CASCADE;
  ALTER TABLE "site_content" DROP COLUMN "support_name";
  ALTER TABLE "site_content" DROP COLUMN "support_email";
  ALTER TABLE "site_content" DROP COLUMN "institutional_terms";
  ALTER TABLE "site_content" DROP COLUMN "institutional_privacy";
  ALTER TABLE "site_content" DROP COLUMN "content_approved_at";`)
}
