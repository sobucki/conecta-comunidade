import 'dotenv/config'
import { spawn } from 'node:child_process'

if (!process.env.TEST_DATABASE_URL) throw new Error('Defina TEST_DATABASE_URL.')
const database = new URL(process.env.TEST_DATABASE_URL)
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  database.pathname !== '/conecta_test'
) {
  throw new Error(
    'E2E exige o banco local conecta_test, separado do desenvolvimento.',
  )
}
const child = spawn(
  'npx',
  ['--no-install', 'playwright', 'test', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      APP_URL: 'http://localhost:3100',
      NEXT_DIST_DIR: '.next-test',
      ALLOW_DEV_SEED: 'true',
    },
  },
)
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
child.on('error', (error) => {
  throw error
})
