import { createLocalReq, type Payload } from 'payload'
import { changeParticipation } from '../participation/actions'
import { conditionsToken } from '../participation/rules'

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
  const administrator = (
    await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { email: { equals: 'admin@conecta.test' } },
      limit: 1,
    })
  ).docs[0]
  const content = await payload.findGlobal({
    slug: 'site-content',
    overrideAccess: true,
    depth: 0,
  })
  if (!content.school)
    await payload.updateGlobal({
      slug: 'site-content',
      overrideAccess: true,
      data: { school: school.id },
    })
  const examples = [
    {
      categoryName: 'Pintura',
      title: 'Pintura do muro de entrada',
      description:
        'Preparar a superfície e renovar a pintura do muro próximo ao portão. Demanda fictícia para demonstração do piloto.',
      fixedAmount: 850,
      location: 'Muro de entrada',
      requirements: 'Experiência com pintura de superfícies externas.',
    },
    {
      categoryName: 'Jardinagem',
      title: 'Manutenção do jardim',
      description:
        'Retirar folhas secas, aparar a grama e cuidar dos canteiros da entrada. Demanda fictícia para demonstração do piloto.',
      fixedAmount: 300,
      location: 'Jardim da escola',
      requirements: 'Conhecimentos básicos de jardinagem.',
    },
    {
      categoryName: 'Marcenaria',
      title: 'Reparo das portas da biblioteca',
      description:
        'Ajustar dobradiças e maçanetas das portas da biblioteca. Demanda fictícia para demonstração do piloto.',
      fixedAmount: 450,
      location: 'Biblioteca',
      requirements: 'Experiência em pequenos reparos e ajustes de portas.',
    },
  ]
  for (const example of examples) {
    const found = await payload.find({
      collection: 'opportunities',
      overrideAccess: true,
      where: {
        and: [
          { school: { equals: school.id } },
          { title: { equals: example.title } },
        ],
      },
      limit: 1,
    })
    if (found.docs.length) continue
    const { categoryName, ...details } = example
    const category = (
      await payload.find({
        collection: 'categories',
        overrideAccess: true,
        where: { name: { equals: categoryName } },
        limit: 1,
      })
    ).docs[0]
    const draft = await payload.create({
      collection: 'opportunities',
      user: administrator,
      overrideAccess: false,
      data: {
        ...details,
        school: school.id,
        category: category.id,
        status: 'DRAFT',
        applicationDeadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        executionStart: new Date(Date.now() + 16 * 86400000).toISOString(),
        executionEnd: new Date(Date.now() + 23 * 86400000).toISOString(),
        materialsResponsibility: 'school',
        toolsResponsibility: 'provider',
      },
    })
    await payload.update({
      collection: 'opportunities',
      id: draft.id,
      user: administrator,
      overrideAccess: false,
      context: { publishingOpportunity: true },
      data: { status: 'OPEN' },
    })
  }
  const demoOpportunity = (
    await payload.find({
      collection: 'opportunities',
      depth: 0,
      limit: 1,
      where: {
        and: [
          { school: { equals: school.id } },
          { title: { equals: 'Pintura do muro de entrada' } },
        ],
      },
    })
  ).docs[0]
  for (const email of ['prestador@conecta.test', 'prestadora@conecta.test']) {
    const demoProvider = (
      await payload.find({
        collection: 'users',
        depth: 0,
        limit: 1,
        where: { email: { equals: email } },
      })
    ).docs[0]
    if (
      demoOpportunity?.status === 'OPEN' &&
      Date.parse(demoOpportunity.applicationDeadline) > Date.now() &&
      demoProvider?.status === 'active' &&
      demoProvider.role === 'provider'
    ) {
      const existingApplication = await payload.count({
        collection: 'applications',
        where: {
          and: [
            { opportunity: { equals: demoOpportunity.id } },
            { candidate: { equals: demoProvider.id } },
          ],
        },
      })
      if (!existingApplication.totalDocs)
        await changeParticipation(
          await createLocalReq({ user: demoProvider }, payload),
          demoOpportunity.id,
          'submit',
          {
            availability: 'Exemplo fictício: terças e quintas pela manhã.',
            experience:
              'Candidatura fictícia para demonstrar a consulta da direção.',
            accepted: true,
            conditionsToken: conditionsToken(demoOpportunity),
          },
        )
    }
  }
  return school
}
