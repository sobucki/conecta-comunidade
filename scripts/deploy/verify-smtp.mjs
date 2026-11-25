import { createRequire } from 'node:module'
import { productionErrors } from './environment.mjs'

const errors = productionErrors(process.env)
if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD)
  errors.push('Configure SMTP_USER e SMTP_PASSWORD do provedor escolhido.')
if (process.env.SMTP_HOST === 'pendente.invalid')
  errors.push('Configure o SMTP_HOST real do provedor.')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
// Usar a dependência do adaptador declarado pelo projeto.
const adapterRequire = createRequire(import.meta.resolve('@payloadcms/email-nodemailer'))
const nodemailer = adapterRequire('nodemailer')
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: process.env.SMTP_SECURE !== 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  connectionTimeout: 20_000,
  greetingTimeout: 20_000,
  socketTimeout: 30_000,
  logger: false,
  debug: false,
})
try {
  await transport.verify()
  console.info('Conexão TLS e autenticação SMTP aprovadas. Nenhuma mensagem enviada.')
} catch (error) {
  // O provedor pode devolver dados de autenticação no texto: imprimir só códigos.
  const code = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'SMTP_ERROR'
  const status = Number.isInteger(error.responseCode) ? ` (${error.responseCode})` : ''
  console.error(`Falha na verificação SMTP: ${code}${status}. Confira servidor, porta, credencial e DNS do remetente.`)
  process.exitCode = 1
} finally {
  transport.close()
}
