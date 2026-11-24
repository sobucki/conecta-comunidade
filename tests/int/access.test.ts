import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config'
import {
  assertDevelopmentDatabase,
  seedDevelopment,
} from '../../src/seed/development'
import type { User } from '../../src/payload-types'

const password = 'Teste-local-com-12-caracteres!'
const suffix = randomUUID().slice(0, 8)
let payload: Payload
let admin: User
let manager: User
let provider: User
let otherProvider: User
let schoolId: number
let otherSchoolId: number

async function createUser(name: string, role: User['role'], school: number) {
  return payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { bootstrap: true },
    data: {
      name,
      role,
      school,
      email: `${name.toLowerCase()}-${suffix}@example.test`,
      password,
      status: 'active',
      ...(role === 'provider'
        ? {
            phone: '(00) 00000-0000',
            communityLink: 'local',
            adultConfirmed: true,
            termsAcceptedAt: new Date().toISOString(),
          }
        : {}),
    },
  })
}

beforeAll(async () => {
  assertDevelopmentDatabase(process.env.DATABASE_URL)
  payload = await getPayload({ config })
  const school = await payload.create({
    collection: 'schools',
    overrideAccess: true,
    data: { name: 'Escola Teste A', slug: `teste-a-${suffix}` },
  })
  const other = await payload.create({
    collection: 'schools',
    overrideAccess: true,
    data: { name: 'Escola Teste B', slug: `teste-b-${suffix}` },
  })
  schoolId = school.id
  otherSchoolId = other.id
  admin = await createUser('Admin', 'admin', school.id)
  manager = await createUser('Gestora', 'manager', school.id)
  provider = await createUser('Prestador', 'provider', school.id)
  otherProvider = await createUser('Outro', 'provider', other.id)
})

afterAll(async () => {
  await payload?.destroy()
})

describe('Contas e isolamento por escola', () => {
  it('permite ao administrador cadastrar escola e gestora', async () => {
    const school = await payload.create({
      collection: 'schools',
      overrideAccess: false,
      user: admin,
      data: { name: 'Escola Administrada', slug: `administrada-${suffix}` },
    })
    const user = await payload.create({
      collection: 'users',
      overrideAccess: false,
      user: admin,
      data: {
        name: 'Gestora Cadastrada',
        email: `nova-gestora-${suffix}@example.test`,
        password,
        role: 'manager',
        status: 'active',
        school: school.id,
      },
    })
    expect(user.role).toBe('manager')
    expect(
      typeof user.school === 'object' ? user.school?.id : user.school,
    ).toBe(school.id)
  })

  it('restringe a gestora à escola autorizada e impede a criação administrativa', async () => {
    const result = await payload.find({
      collection: 'schools',
      user: manager,
      overrideAccess: false,
    })
    expect(result.docs.map(({ id }) => id)).toEqual([schoolId])
    await expect(
      payload.findByID({
        collection: 'schools',
        id: otherSchoolId,
        user: manager,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'schools',
        user: manager,
        overrideAccess: false,
        data: { name: 'Sem permissão', slug: `negada-${suffix}` },
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'users',
        user: manager,
        overrideAccess: false,
        data: {
          name: 'Sem permissão',
          email: `negada-${suffix}@example.test`,
          password,
          role: 'admin',
          status: 'active',
        },
      }),
    ).rejects.toThrow()
  })

  it('impede listagem anônima e acesso aos dados pessoais de outros usuários', async () => {
    await expect(
      payload.find({ collection: 'users', overrideAccess: false }),
    ).rejects.toThrow()
    const own = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user: provider,
    })
    expect(own.docs.map(({ id }) => id)).toEqual([provider.id])
    await expect(
      payload.findByID({
        collection: 'users',
        id: otherProvider.id,
        user: provider,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    // Até M3, a gestora acessa o próprio perfil; não existe catálogo privado de profissionais.
    const management = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user: manager,
    })
    expect(management.docs.map(({ id }) => id)).toEqual([manager.id])
  })

  it('permite editar o próprio nome e protege papel, escola e bloqueio', async () => {
    await payload.update({
      collection: 'users',
      id: provider.id,
      user: provider,
      overrideAccess: false,
      data: {
        name: 'Nome atualizado',
        role: 'admin',
        school: otherSchoolId,
        status: 'blocked',
      },
    })
    const saved = await payload.findByID({
      collection: 'users',
      id: provider.id,
      overrideAccess: true,
    })
    expect(saved.name).toBe('Nome atualizado')
    expect(saved.role).toBe('provider')
    expect(saved.status).toBe('active')
    expect(
      typeof saved.school === 'object' ? saved.school?.id : saved.school,
    ).toBe(schoolId)
    await expect(
      payload.update({
        collection: 'users',
        id: manager.id,
        user: provider,
        overrideAccess: false,
        data: { name: 'Alteração indevida' },
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'users',
        id: provider.id,
        user: provider,
        overrideAccess: false,
        data: { role: 'admin', adultConfirmed: false, phone: '' },
      }),
    ).rejects.toThrow()
  })

  it('fecha o bootstrap público e exige dados mínimos de prestador', async () => {
    await expect(
      payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          name: 'Bootstrap indevido',
          email: `bootstrap-${suffix}@example.test`,
          password,
          role: 'admin',
          status: 'active',
        },
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'users',
        user: admin,
        overrideAccess: false,
        data: {
          name: 'Incompleto',
          email: `incompleto-${suffix}@example.test`,
          password,
          role: 'provider',
          status: 'active',
          school: schoolId,
        },
      }),
    ).rejects.toThrow()
  })

  it('bloqueia login e acessos com uma sessão já emitida ao bloquear a conta', async () => {
    const user = await createUser('Bloqueavel', 'provider', schoolId)
    const login = await payload.login({
      collection: 'users',
      data: { email: user.email, password },
    })
    await payload.update({
      collection: 'users',
      id: user.id,
      user: admin,
      overrideAccess: false,
      data: { status: 'blocked' },
    })
    await expect(
      payload.login({
        collection: 'users',
        data: { email: user.email, password },
      }),
    ).rejects.toThrow()
    const auth = await payload.auth({
      headers: new Headers({ Authorization: `JWT ${login.token}` }),
    })
    await expect(
      payload.find({
        collection: 'users',
        user: auth.user,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('registra mudanças administrativas sem dados sensíveis e protege o histórico', async () => {
    const logs = await payload.find({
      collection: 'activity-logs',
      user: admin,
      overrideAccess: false,
      where: { action: { equals: 'access.changed' } },
    })
    expect(logs.docs.length).toBeGreaterThan(0)
    const log = logs.docs[0]
    expect(JSON.stringify(log)).not.toContain(password)
    await expect(
      payload.find({
        collection: 'activity-logs',
        user: manager,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'activity-logs',
        id: log.id,
        user: admin,
        overrideAccess: false,
        data: { action: 'alterada' },
      }),
    ).rejects.toThrow()
  })

  it('mantém o seed idempotente, sem duplicar escola ou contas de demonstração', async () => {
    await seedDevelopment(payload)
    const before = await payload.count({
      collection: 'users',
      where: { email: { contains: '@conecta.test' } },
    })
    await seedDevelopment(payload)
    const after = await payload.count({
      collection: 'users',
      where: { email: { contains: '@conecta.test' } },
    })
    expect(before.totalDocs).toBe(4)
    expect(after.totalDocs).toBe(before.totalDocs)
  })
})

describe('Recuperação de senha com SMTP local', () => {
  it('entrega o link no Mailpit, troca a senha e invalida a reutilização do token', async () => {
    const user = await createUser('Recuperacao', 'provider', schoolId)
    await payload.forgotPassword({
      collection: 'users',
      data: { email: user.email },
    })
    const search = await fetch(
      `http://127.0.0.1:8025/api/v1/search?query=${encodeURIComponent(`to:${user.email}`)}`,
    )
    const mailbox = await search.json()
    expect(mailbox.messages).toHaveLength(1)
    const response = await fetch(
      `http://127.0.0.1:8025/api/v1/message/${mailbox.messages[0].ID}`,
    )
    const mail = await response.json()
    expect(mail.Subject).toBe('Recupere seu acesso ao Conecta Comunidade')
    const href = /href="([^"]+)"/.exec(mail.HTML)?.[1]
    expect(href).toBeTruthy()
    const link = new URL(href!.replaceAll('&amp;', '&'))
    expect(link.pathname).toBe('/redefinir-senha')
    const token = link.searchParams.get('token')!
    const newPassword = 'Nova-senha-de-teste-com-12!'
    await expect(
      payload.resetPassword({
        collection: 'users',
        overrideAccess: false,
        data: { token, password: 'curta' },
      }),
    ).rejects.toThrow()
    await payload.resetPassword({
      collection: 'users',
      overrideAccess: false,
      data: { token, password: newPassword },
    })
    await expect(
      payload.login({
        collection: 'users',
        data: { email: user.email, password },
      }),
    ).rejects.toThrow()
    const login = await payload.login({
      collection: 'users',
      data: { email: user.email, password: newPassword },
    })
    expect(login.user?.id).toBe(user.id)
    await expect(
      payload.resetPassword({
        collection: 'users',
        overrideAccess: false,
        data: { token, password },
      }),
    ).rejects.toThrow()
    await expect(
      payload.resetPassword({
        collection: 'users',
        overrideAccess: false,
        data: { token: 'invalido', password },
      }),
    ).rejects.toThrow()
    const expiredToken = await payload.forgotPassword({
      collection: 'users',
      data: { email: user.email },
      expiration: -1,
      disableEmail: true,
    })
    if (!expiredToken) throw new Error('O token de teste não foi gerado.')
    await expect(
      payload.resetPassword({
        collection: 'users',
        overrideAccess: false,
        data: { token: expiredToken, password },
      }),
    ).rejects.toThrow()
  })
})
