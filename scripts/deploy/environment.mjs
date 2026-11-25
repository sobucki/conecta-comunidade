import path from 'node:path'

// Não incluir valores recebidos em erros: URLs de banco e SMTP contêm segredos.
export function productionErrors(env) {
  const errors = []
  if (env.NODE_ENV !== 'production') errors.push('NODE_ENV deve ser production.')
  for (const key of ['PAYLOAD_SECRET', 'DATABASE_URL', 'APP_URL', 'MEDIA_DIR', 'SMTP_HOST', 'SMTP_FROM']) {
    if (!env[key]?.trim()) errors.push(`Defina ${key}.`)
  }
  if ((env.PAYLOAD_SECRET || '').length < 32 || /placeholder|gerado-pelo|build-only/i.test(env.PAYLOAD_SECRET || ''))
    errors.push('PAYLOAD_SECRET exige segredo próprio com pelo menos 32 caracteres.')
  let stagingSSH = false
  try {
    const db = new URL(env.DATABASE_URL)
    stagingSSH = env.STAGING_SSH_ACCESS === 'true' && db.hostname === 'postgres' && db.pathname === '/conecta_staging' && env.APP_URL === 'http://localhost:3200'
  } catch {}
  if (env.STAGING_SSH_ACCESS === 'true' && !stagingSSH)
    errors.push('STAGING_SSH_ACCESS exige banco conecta_staging e origem exata http://localhost:3200.')
  try {
    const url = new URL(env.APP_URL)
    if (!stagingSSH && (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /localhost|example\.|\.invalid$|^127\./.test(url.hostname))) throw new Error()
  } catch { errors.push('APP_URL deve ser uma origem HTTPS pública válida, sem caminho.') }
  try {
    const db = new URL(env.DATABASE_URL)
    if (!['postgres:', 'postgresql:'].includes(db.protocol) || !db.hostname || !db.pathname.slice(1) || /conecta_(dev|test)$/.test(db.pathname) || /SENHA_CODIFICADA/.test(db.password)) throw new Error()
  } catch { errors.push('DATABASE_URL deve apontar para banco exclusivo do ambiente, separado de conecta_dev/conecta_test.') }
  if (!path.isAbsolute(env.MEDIA_DIR || '')) errors.push('MEDIA_DIR deve ser absoluto e persistente.')
  const port = Number(env.SMTP_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('Defina SMTP_PORT entre 1 e 65535.')
  if (!['true', 'false'].includes(env.SMTP_SECURE)) errors.push('SMTP_SECURE deve ser true ou false.')
  if (port === 465 && env.SMTP_SECURE !== 'true') errors.push('SMTP na porta 465 exige SMTP_SECURE=true.')
  if (env.SMTP_USER && !env.SMTP_PASSWORD) errors.push('Defina SMTP_PASSWORD para o usuário SMTP.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SMTP_FROM || '') || /\.test$/.test(env.SMTP_FROM || '')) errors.push('SMTP_FROM deve ser um endereço de envio real.')
  if (env.ALLOW_DEV_SEED !== 'false' || env.DEMO_PASSWORD) errors.push('Defina ALLOW_DEV_SEED=false e remova DEMO_PASSWORD.')
  return errors
}
