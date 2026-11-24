import type { Payload } from 'payload'

export function assertDevelopmentDatabase(databaseURL: string | undefined) {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ALLOW_DEV_SEED !== 'true'
  ) {
    throw new Error(
      'O seed fictício exige ALLOW_DEV_SEED=true e ambiente de desenvolvimento.',
    )
  }
  const database = new URL(databaseURL || '')
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname) ||
    !/^\/conecta_(dev|test)$/.test(database.pathname)
  ) {
    throw new Error(
      'O seed fictício só pode executar nos bancos locais conecta_dev ou conecta_test.',
    )
  }
}

export async function seedDevelopment(payload: Payload) {
  assertDevelopmentDatabase(process.env.DATABASE_URL)
  const password = process.env.DEMO_PASSWORD
  if (!password || password.length < 12)
    throw new Error('Defina DEMO_PASSWORD com pelo menos 12 caracteres.')

  const existing = await payload.find({
    collection: 'schools',
    overrideAccess: true,
    where: { slug: { equals: 'escola-demonstracao' } },
    limit: 1,
  })
  const school =
    existing.docs[0] ||
    (await payload.create({
      collection: 'schools',
      overrideAccess: true,
      data: {
        name: 'Escola Demonstração',
        slug: 'escola-demonstracao',
        description: 'Instituição fictícia para testes e demonstrações.',
      },
    }))
  for (const name of [
    'Pintura',
    'Jardinagem',
    'Marcenaria',
    'Hidráulica simples',
    'Manutenção geral',
    'Conservação',
  ]) {
    const result = await payload.find({
      collection: 'categories',
      overrideAccess: true,
      where: { name: { equals: name } },
      limit: 1,
    })
    if (!result.docs.length)
      await payload.create({
        collection: 'categories',
        overrideAccess: true,
        data: { name },
      })
  }
  const accounts = [
    {
      email: 'admin@conecta.test',
      name: 'Administrador Demonstração',
      role: 'admin',
    },
    {
      email: 'diretora@conecta.test',
      name: 'Diretora Demonstração',
      role: 'manager',
    },
    {
      email: 'prestador@conecta.test',
      name: 'Prestador Demonstração',
      role: 'provider',
    },
    {
      email: 'prestadora@conecta.test',
      name: 'Prestadora Demonstração',
      role: 'provider',
    },
  ] satisfies {
    email: string
    name: string
    role: 'admin' | 'manager' | 'provider'
  }[]

  for (const account of accounts) {
    const result = await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { email: { equals: account.email } },
      limit: 1,
    })
    if (result.docs.length) continue
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { bootstrap: true },
      data: {
        ...account,
        password,
        status: 'active',
        school: school.id,
        ...(account.role === 'provider'
          ? {
              phone: '(00) 00000-0000',
              communityLink: 'local',
              adultConfirmed: true,
              termsAcceptedAt: new Date().toISOString(),
              professionalSummary: 'Perfil fictício para demonstração.',
            }
          : {}),
      },
    })
  }
  return school
}
