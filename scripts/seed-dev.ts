import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import {
  assertDevelopmentDatabase,
  seedDevelopment,
} from '../src/seed/development'

assertDevelopmentDatabase(process.env.DATABASE_URL)
const payload = await getPayload({ config })
try {
  await seedDevelopment(payload)
  console.info(
    'Escola, categorias e contas fictícias preparadas. Registros existentes foram preservados.',
  )
  console.info(
    'Contas: admin@conecta.test, diretora@conecta.test, prestador@conecta.test e prestadora@conecta.test.',
  )
  console.info(
    'Consulte DEMO_PASSWORD no seu .env para acessar. O seed não redefine senhas existentes.',
  )
} finally {
  await payload.destroy()
}
