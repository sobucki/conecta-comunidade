import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const example = await readFile(
  new URL('../.env.example', import.meta.url),
  'utf8',
)
const content = example
  .replace('gerado-pelo-comando-dev-setup', randomBytes(48).toString('hex'))
  .replace(
    'gerada-pelo-comando-dev-setup',
    randomBytes(18).toString('base64url'),
  )

try {
  await writeFile(new URL('../.env', import.meta.url), content, {
    flag: 'wx',
    mode: 0o600,
  })
  console.info(
    '.env criado. A senha das contas fictícias está em DEMO_PASSWORD nesse arquivo.',
  )
} catch (error) {
  if (error.code !== 'EEXIST') throw error
  console.info('.env já existe e foi preservado.')
}
