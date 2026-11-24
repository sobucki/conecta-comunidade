import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_opportunities_materials_responsibility" AS ENUM('school', 'provider', 'shared');
  CREATE TYPE "public"."enum_opportunities_tools_responsibility" AS ENUM('school', 'provider', 'shared');
  CREATE TYPE "public"."enum_opportunities_status" AS ENUM('DRAFT', 'OPEN');
  CREATE TABLE "opportunities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"category_id" integer NOT NULL,
  	"school_id" integer,
  	"location" varchar NOT NULL,
  	"application_deadline" timestamp(3) with time zone NOT NULL,
  	"fixed_amount" numeric NOT NULL,
  	"execution_start" timestamp(3) with time zone NOT NULL,
  	"execution_end" timestamp(3) with time zone NOT NULL,
  	"materials_responsibility" "enum_opportunities_materials_responsibility" NOT NULL,
  	"tools_responsibility" "enum_opportunities_tools_responsibility" NOT NULL,
  	"requirements" varchar,
  	"notes" varchar,
  	"status" "enum_opportunities_status" DEFAULT 'DRAFT' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"published_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "opportunities_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );

  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"school_id" integer,
  	"uploaded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_display_url" varchar,
  	"sizes_display_width" numeric,
  	"sizes_display_height" numeric,
  	"sizes_display_mime_type" varchar,
  	"sizes_display_filesize" numeric,
  	"sizes_display_filename" varchar
  );

  CREATE TABLE "site_content" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_name" varchar DEFAULT 'Conecta Comunidade' NOT NULL,
  	"headline" varchar DEFAULT 'Sua habilidade pode fazer a diferença na escola.' NOT NULL,
  	"introduction" varchar DEFAULT 'Pequenos reparos, novas conexões. Conheça as necessidades da escola e compartilhe as oportunidades com quem pode ajudar.' NOT NULL,
  	"about" varchar DEFAULT 'A escola é um ponto de encontro de muitas habilidades. O Conecta Comunidade aproxima suas demandas de manutenção dos profissionais que fazem parte dessa rede.' NOT NULL,
  	"school_id" integer,
  	"cover_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "opportunities_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities_rels" ADD CONSTRAINT "opportunities_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opportunities_rels" ADD CONSTRAINT "opportunities_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_content" ADD CONSTRAINT "site_content_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_content" ADD CONSTRAINT "site_content_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "opportunities_category_idx" ON "opportunities" USING btree ("category_id");
  CREATE INDEX "opportunities_school_idx" ON "opportunities" USING btree ("school_id");
  CREATE INDEX "opportunities_created_by_idx" ON "opportunities" USING btree ("created_by_id");
  CREATE INDEX "opportunities_published_by_idx" ON "opportunities" USING btree ("published_by_id");
  CREATE INDEX "opportunities_updated_at_idx" ON "opportunities" USING btree ("updated_at");
  CREATE INDEX "opportunities_created_at_idx" ON "opportunities" USING btree ("created_at");
  CREATE INDEX "opportunities_rels_order_idx" ON "opportunities_rels" USING btree ("order");
  CREATE INDEX "opportunities_rels_parent_idx" ON "opportunities_rels" USING btree ("parent_id");
  CREATE INDEX "opportunities_rels_path_idx" ON "opportunities_rels" USING btree ("path");
  CREATE INDEX "opportunities_rels_media_id_idx" ON "opportunities_rels" USING btree ("media_id");
  CREATE INDEX "media_school_idx" ON "media" USING btree ("school_id");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_display_sizes_display_filename_idx" ON "media" USING btree ("sizes_display_filename");
  CREATE INDEX "site_content_school_idx" ON "site_content" USING btree ("school_id");
  CREATE INDEX "site_content_cover_image_idx" ON "site_content" USING btree ("cover_image_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opportunities_fk" FOREIGN KEY ("opportunities_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_opportunities_id_idx" ON "payload_locked_documents_rels" USING btree ("opportunities_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "opportunities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "opportunities_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_content" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "opportunities" CASCADE;
  DROP TABLE "opportunities_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "site_content" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_opportunities_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";

  DROP INDEX "payload_locked_documents_rels_opportunities_id_idx";
  DROP INDEX "payload_locked_documents_rels_media_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "opportunities_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
  DROP TYPE "public"."enum_opportunities_materials_responsibility";
  DROP TYPE "public"."enum_opportunities_tools_responsibility";
  DROP TYPE "public"."enum_opportunities_status";`)
}
