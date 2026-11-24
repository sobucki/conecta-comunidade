import 'dotenv/config'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

if (!process.env.TEST_DATABASE_URL) throw new Error('Defina TEST_DATABASE_URL.')
const database = new URL(process.env.TEST_DATABASE_URL)
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  database.pathname !== '/conecta_test'
) {
  throw new Error(
    'Testes exigem o banco local conecta_test, separado do desenvolvimento.',
  )
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.MEDIA_DIR = '.tools/test-media'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/int/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
