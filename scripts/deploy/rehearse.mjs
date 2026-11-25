// Percurso HTTP com dados fictícios, permitido apenas nos bancos de homologação.
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const database = new URL(process.env.DATABASE_URL || '')
if (process.env.ALLOW_STAGING_REHEARSAL !== 'true' || !['/conecta_staging', '/conecta_restore'].includes(database.pathname))
  throw new Error('Ensaio exige autorização explícita e banco conecta_staging ou conecta_restore.')
const reportPath = process.env.REHEARSAL_REPORT
if (!reportPath) throw new Error('Defina REHEARSAL_REPORT em diretório protegido e persistente.')
if (!/^[a-z0-9-]+$/.test(process.env.APP_NETWORK_ALIAS || ''))
  throw new Error('Defina APP_NETWORK_ALIAS exclusivo do ambiente ensaiado.')
const base = `http://${process.env.APP_NETWORK_ALIAS}:3000`
async function request(route, { token, data, method = 'GET', body } = {}) {
  const response = await fetch(new URL(route, base), {
    method, signal: AbortSignal.timeout(30_000),
    headers: { ...(token ? { Authorization: `JWT ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : body,
  })
  if (!response.ok) throw new Error(`Ensaio falhou em ${method} ${route}: HTTP ${response.status}.`)
  return response
}
const json = async (route, options) => (await request(route, options)).json()
const post = (route, data, token) => json(route, { method: 'POST', data, token })
const email = process.env.INITIAL_ADMIN_EMAIL
const password = process.env.INITIAL_ADMIN_PASSWORD
if (!email || !password) throw new Error('Forneça credenciais fictícias de homologação pelo ambiente.')
for (let attempt = 0; ; attempt++) {
  try {
    const ready = await fetch(`${base}/api/users/me`, { signal: AbortSignal.timeout(3000) })
    if (ready.ok) break
  } catch {}
  if (attempt >= 29) throw new Error('Aplicação não ficou disponível para o ensaio.')
  await new Promise(resolve => setTimeout(resolve, 1000))
}
const admin = (await post('/api/users/login', { email, password })).token
const hash = data => createHash('sha256').update(data).digest('hex')

async function verify(report) {
  const opportunity = await json(`/api/opportunities/${report.opportunity}`, { token: admin })
  assert.equal(opportunity.status, 'AWAITING_FORMALIZATION')
  const application = await json(`/api/applications/${report.application}`, { token: admin })
  assert.equal(application.status, 'SELECTED')
  const events = await json(`/api/opportunity-events?where[opportunity][equals]=${report.opportunity}`, { token: admin })
  assert.equal(events.totalDocs, report.events)
  for (const file of report.files) {
    const bytes = Buffer.from(await (await request(`/api/media/file/${encodeURIComponent(file.filename)}`)).arrayBuffer())
    assert.equal(hash(bytes), file.sha256)
  }
  for (const route of ['/', '/cadastro', '/entrar', '/recuperar-acesso', '/termos', '/privacidade', '/suporte', '/admin/login', `/oportunidades/${report.opportunity}`])
    await request(route)
  const metrics = await fetch(`${base}/api/pilot-metrics`)
  assert.ok([401, 403].includes(metrics.status))
  console.info('Ensaio HTTP aprovado: páginas, autenticação, seleção, histórico e hashes das fotos/versões reduzidas. SMTP e HTTPS público continuam pendentes.')
}
if (process.argv.includes('--verify')) {
  await verify(JSON.parse(readFileSync(reportPath, 'utf8')))
} else {
  assert.equal(database.pathname, '/conecta_staging', 'Novos dados fictícios somente em conecta_staging.')
  const suffix = randomUUID().slice(0, 8)
  const school = (await post('/api/schools', { name: 'Escola Fictícia Homologação', slug: `homologacao-${suffix}` }, admin)).doc
  const category = (await post('/api/categories', { name: `Reparo fictício ${suffix}` }, admin)).doc
  await post('/api/globals/site-content', { school: school.id }, admin)
  const managerEmail = `gestora-${suffix}@conecta.test`
  await post('/api/users', { name: 'Gestora Fictícia', email: managerEmail, password, role: 'manager', school: school.id, status: 'active' }, admin)
  const manager = (await post('/api/users/login', { email: managerEmail, password })).token
  const providerEmail = `prestador-${suffix}@conecta.test`
  await post('/api/users/register', { name: 'Prestador Fictício', email: providerEmail, password, phone: '11999998888', communityLink: 'local', adultConfirmed: true, termsAccepted: true })
  const provider = (await post('/api/users/login', { email: providerEmail, password })).token
  const future = days => new Date(Date.now() + days * 86400000).toISOString()
  let opportunity = (await post('/api/opportunities', {
    title: `Reparo fictício de homologação ${suffix}`, description: 'Demonstração fictícia, sem contratação real.', category: category.id,
    location: 'Pátio fictício', fixedAmount: 500, applicationDeadline: future(2), executionStart: future(3), executionEnd: future(5),
    materialsResponsibility: 'school', toolsResponsibility: 'provider',
  }, manager)).doc
  const image = await sharp({ create: { width: 900, height: 650, channels: 3, background: '#83a98c' } }).png().toBuffer()
  const form = new FormData()
  form.set('_payload', JSON.stringify({ alt: 'Imagem sintética para homologação', school: school.id }))
  form.set('file', new Blob([image], { type: 'image/png' }), `homologacao-${suffix}.png`)
  const photo = (await json('/api/media', { method: 'POST', body: form, token: manager })).doc
  await json(`/api/opportunities/${opportunity.id}`, { method: 'PATCH', data: { photos: [photo.id] }, token: manager })
  const restricted = await fetch(`${base}/api/media/file/${photo.filename}`)
  assert.ok([401, 403, 404].includes(restricted.status), 'Foto de rascunho permanece restrita.')
  await post(`/api/opportunities/${opportunity.id}/publish`, {}, manager)
  const conditions = await json(`/api/opportunities/${opportunity.id}/conditions`)
  const application = (await post(`/api/opportunities/${opportunity.id}/apply`, { availability: 'Manhãs, para demonstração fictícia.', accepted: true, conditionsToken: conditions.conditionsToken }, provider)).doc
  opportunity = (await post(`/api/opportunities/${opportunity.id}/close`, { expectedRevision: 0, confirmed: true }, manager)).doc
  await post(`/api/opportunities/${opportunity.id}/select`, { expectedRevision: opportunity.decisionRevision, confirmed: true, applicationID: application.id, expectedApplicationRevision: application.revision }, manager)
  const events = await json(`/api/opportunity-events?where[opportunity][equals]=${opportunity.id}`, { token: admin })
  const report = { testedAt: new Date().toISOString(), opportunity: opportunity.id, application: application.id, events: events.totalDocs, files: [] }
  for (const filename of [photo.filename, ...Object.values(photo.sizes || {}).map(size => size.filename)].filter(Boolean)) {
    const bytes = Buffer.from(await (await request(`/api/media/file/${encodeURIComponent(filename)}`)).arrayBuffer())
    report.files.push({ filename, sha256: hash(bytes) })
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 })
  await verify(report)
}
