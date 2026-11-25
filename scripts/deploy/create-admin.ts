import { getPayload } from 'payload'
import config from '../../src/payload.config'

// Credenciais via ambiente do processo, nunca argumentos ou saída do comando.
const email = process.env.INITIAL_ADMIN_EMAIL?.trim()
const name = process.env.INITIAL_ADMIN_NAME?.trim()
const password = process.env.INITIAL_ADMIN_PASSWORD
if (!email || !name || !password || password.length < 16)
  throw new Error('Defina INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME e INITIAL_ADMIN_PASSWORD (mínimo 16 caracteres).')
const payload = await getPayload({ config })
try {
  const existing = await payload.count({ collection: 'users', overrideAccess: true })
  if (existing.totalDocs) throw new Error('Bootstrap permitido somente em banco sem usuários. Use a administração existente.')
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { bootstrap: true },
    data: { email, name, password, role: 'admin', status: 'active' },
  })
  console.info('Administrador inicial criado. Nenhum dado de demonstração foi inserido.')
} finally {
  await payload.destroy()
}
