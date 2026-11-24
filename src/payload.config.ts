import 'dotenv/config'
import { postgresAdapter, sql } from '@payloadcms/db-postgres'
import { uniqueIndex } from '@payloadcms/db-postgres/drizzle/pg-core'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { Users } from './collections/Users'
import { Schools } from './collections/Schools'
import { Categories } from './collections/Categories'
import { ActivityLogs } from './collections/ActivityLogs'
import { Opportunities } from './collections/Opportunities'
import { Media } from './collections/Media'
import { SiteContent } from './globals/SiteContent'
import { Applications } from './collections/Applications'
import { ApplicationEvents } from './collections/ApplicationEvents'
import { OpportunityEvents } from './collections/OpportunityEvents'
import sharp from 'sharp'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const secret = process.env.PAYLOAD_SECRET
if (!secret || secret.length < 32)
  throw new Error(
    'Defina PAYLOAD_SECRET com pelo menos 32 caracteres. Execute npm run dev:setup no desenvolvimento.',
  )
if (!process.env.DATABASE_URL)
  throw new Error('Defina DATABASE_URL para o PostgreSQL.')

export default buildConfig({
  telemetry: false,
  serverURL: process.env.APP_URL || 'http://localhost:3000',
  admin: {
    user: 'users',
    importMap: { baseDir: dirname },
    meta: { titleSuffix: ' | Conecta Comunidade' },
  },
  i18n: { fallbackLanguage: 'pt', supportedLanguages: { pt } },
  collections: [
    Users,
    Schools,
    Categories,
    ActivityLogs,
    Opportunities,
    Media,
    Applications,
    ApplicationEvents,
    OpportunityEvents,
  ],
  globals: [SiteContent],
  sharp,
  upload: {
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: 'Cada foto deve ter no máximo 5 MB.',
  },
  secret,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  graphQL: { disable: true },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    push: process.env.NODE_ENV !== 'production',
    migrationDir: path.resolve(dirname, 'migrations'),
    afterSchemaInit: [
      ({ schema, extendTable }) => {
        extendTable({
          table: schema.tables.applications,
          extraConfig: (columns) => ({
            applications_one_selected_idx: uniqueIndex(
              'applications_one_selected_idx',
            )
              .on(columns.opportunity)
              .where(sql`${columns.status} = 'SELECTED'`),
          }),
        })
        return schema
      },
    ],
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM || 'acesso@conecta.test',
    defaultFromName: 'Conecta Comunidade',
    skipVerify: true,
    transportOptions: {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === 'true',
      ...(process.env.SMTP_USER
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD || '',
            },
          }
        : {}),
    },
  }),
})
