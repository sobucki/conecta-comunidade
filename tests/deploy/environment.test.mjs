import assert from 'node:assert/strict'
import test from 'node:test'
import { productionErrors } from '../../scripts/deploy/environment.mjs'

const valid = {
  NODE_ENV: 'production', APP_URL: 'https://piloto.escola.org.br',
  PAYLOAD_SECRET: 'a'.repeat(48), DATABASE_URL: 'postgresql://app:secret@postgres/pilot',
  MEDIA_DIR: '/app/media', SMTP_HOST: 'smtp.escola.org.br', SMTP_PORT: '587',
  SMTP_SECURE: 'false', SMTP_FROM: 'acesso@escola.org.br', ALLOW_DEV_SEED: 'false',
}
test('aceita configuração própria do ambiente', () => assert.deepEqual(productionErrors(valid), []))
test('recusa banco de desenvolvimento e seed fictício em produção', () => {
  assert.ok(productionErrors({ ...valid, DATABASE_URL: 'postgresql://app:secret@postgres/conecta_dev' }).length)
  assert.ok(productionErrors({ ...valid, ALLOW_DEV_SEED: 'true' }).length)
  assert.ok(productionErrors({ ...valid, DEMO_PASSWORD: 'secret' }).length)
})
test('recusa origem insegura, exemplo e caminhos que quebrariam links', () => {
  for (const APP_URL of ['http://piloto.escola.org.br', 'https://localhost', 'https://piloto.example.org', 'https://piloto.escola.org.br/admin', 'https://a:b@piloto.escola.org.br'])
    assert.ok(productionErrors({ ...valid, APP_URL }).length)
})
test('recusa SMTP incompleto, remetente fictício e fotos em diretório relativo', () => {
  for (const changes of [{ SMTP_PORT: 'x' }, { SMTP_PORT: '465' }, { SMTP_USER: 'user' }, { SMTP_FROM: 'user@conecta.test' }, { MEDIA_DIR: 'media' }, { PAYLOAD_SECRET: 'build-only-placeholder-never-use-at-runtime' }])
    assert.ok(productionErrors({ ...valid, ...changes }).length)
})
test('erros não revelam credenciais', () => {
  const errors = productionErrors({ ...valid, DATABASE_URL: 'senha-sensivel', PAYLOAD_SECRET: 'segredo-curto', SMTP_PORT: 'porta-sensivel' }).join('\n')
  for (const secret of ['senha-sensivel', 'segredo-curto', 'porta-sensivel']) assert.ok(!errors.includes(secret))
})

test('permite acesso SSH local somente na homologação explicitamente habilitada', () => {
  const staging = { ...valid, STAGING_SSH_ACCESS: 'true', APP_URL: 'http://localhost:3200', DATABASE_URL: 'postgresql://app:secret@postgres/conecta_staging' }
  assert.deepEqual(productionErrors(staging), [])
  for (const changes of [{ STAGING_SSH_ACCESS: 'false' }, { DATABASE_URL: valid.DATABASE_URL }, { APP_URL: 'http://0.0.0.0:3200' }, { APP_URL: 'http://localhost:3201' }])
    assert.ok(productionErrors({ ...staging, ...changes }).length)
})
test('recusa ativar exceção SSH na configuração pública do piloto', () => {
  assert.ok(productionErrors({ ...valid, STAGING_SSH_ACCESS: 'true' }).length)
})
