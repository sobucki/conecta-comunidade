import {
  type MigrateUpArgs,
  type MigrateDownArgs,
  sql,
} from '@payloadcms/db-postgres'

// O PostgreSQL exige commit dos novos valores do enum antes de usá-los no índice parcial.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."enum_opportunities_status" ADD VALUE 'UNDER_REVIEW';
  ALTER TYPE "public"."enum_opportunities_status" ADD VALUE 'AWAITING_FORMALIZATION';
  ALTER TYPE "public"."enum_opportunities_status" ADD VALUE 'CLOSED_WITHOUT_SELECTION';
  ALTER TYPE "public"."enum_opportunities_status" ADD VALUE 'CANCELLED';
  ALTER TYPE "public"."enum_applications_status" ADD VALUE 'SELECTED';
  ALTER TYPE "public"."enum_applications_status" ADD VALUE 'NOT_SELECTED';
  ALTER TYPE "public"."enum_applications_status" ADD VALUE 'SELECTED_WITHDRAWN';
  ALTER TYPE "public"."enum_applications_status" ADD VALUE 'CANCELLED';
  ALTER TYPE "public"."enum_application_events_action" ADD VALUE 'selected';
  ALTER TYPE "public"."enum_application_events_action" ADD VALUE 'not_selected';
  ALTER TYPE "public"."enum_application_events_action" ADD VALUE 'selection_withdrawn';
  ALTER TYPE "public"."enum_application_events_action" ADD VALUE 'cancelled';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Recusa reversão se ainda houver decisões/estados do M4, preservando os dados.
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM opportunities WHERE status::text NOT IN ('DRAFT','OPEN'))
        OR EXISTS (SELECT 1 FROM applications WHERE status::text NOT IN ('SUBMITTED','WITHDRAWN'))
        OR EXISTS (SELECT 1 FROM application_events WHERE action::text NOT IN ('submit','edit','withdraw','resubmit'))
      THEN RAISE EXCEPTION 'Não é possível reverter os estados: existem decisões do M4. Preserve o histórico.';
      END IF;
    END $$;
    ALTER TABLE opportunities ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE opportunities ALTER COLUMN status SET DATA TYPE text USING status::text;
    DROP TYPE public.enum_opportunities_status;
    CREATE TYPE public.enum_opportunities_status AS ENUM ('DRAFT','OPEN');
    ALTER TABLE opportunities ALTER COLUMN status SET DATA TYPE public.enum_opportunities_status USING status::public.enum_opportunities_status;
    ALTER TABLE opportunities ALTER COLUMN status SET DEFAULT 'DRAFT'::public.enum_opportunities_status;
    ALTER TABLE applications ALTER COLUMN status SET DATA TYPE text USING status::text;
    DROP TYPE public.enum_applications_status;
    CREATE TYPE public.enum_applications_status AS ENUM ('SUBMITTED','WITHDRAWN');
    ALTER TABLE applications ALTER COLUMN status SET DATA TYPE public.enum_applications_status USING status::public.enum_applications_status;
    ALTER TABLE application_events ALTER COLUMN action SET DATA TYPE text USING action::text;
    DROP TYPE public.enum_application_events_action;
    CREATE TYPE public.enum_application_events_action AS ENUM ('submit','edit','withdraw','resubmit');
    ALTER TABLE application_events ALTER COLUMN action SET DATA TYPE public.enum_application_events_action USING action::public.enum_application_events_action;
`)
}
