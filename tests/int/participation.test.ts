import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  getPayload,
  createLocalReq,
  initTransaction,
  commitTransaction,
  killTransaction,
  type Payload,
} from 'payload'
import config from '../../src/payload.config'
import type { User } from '../../src/payload-types'
import { registerProvider } from '../../src/accounts/registration'
import { safeReturnPath } from '../../src/accounts/navigation'
import {
  changeParticipation,
  type ParticipationAction,
} from '../../src/participation/actions'
import { conditionsToken } from '../../src/participation/rules'
import { seedDevelopment } from '../../src/seed/development'
import { lockOpportunity } from '../../src/opportunities/transaction'

let payload: Payload
let manager: User,
  otherManager: User,
  provider: User,
  otherProvider: User,
  admin: User
let school: number, otherSchool: number, category: number
const suffix = randomUUID().slice(0, 8)
const password = 'Senha-ficticia-de-participacao'
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString()

beforeAll(async () => {
  payload = await getPayload({ config })
  await seedDevelopment(payload)
  school = (
    await payload.create({
      collection: 'schools',
      data: { name: 'Escola Participação', slug: `participacao-${suffix}` },
    })
  ).id
  otherSchool = (
    await payload.create({
      collection: 'schools',
      data: {
        name: 'Outra Escola Participação',
        slug: `outra-participacao-${suffix}`,
      },
    })
  ).id
  category = (
    await payload.create({
      collection: 'categories',
      data: { name: `Serviço ${suffix}` },
    })
  ).id
  async function account(role: User['role'], schoolID: number, name: string) {
    return payload.create({
      collection: 'users',
      context: { bootstrap: true },
      data: {
        name,
        email: `${name}-${suffix}@example.test`,
        password,
        role,
        status: 'active',
        school: schoolID,
        ...(role === 'provider'
          ? {
              phone: '11999999999',
              communityLink: 'local',
              adultConfirmed: true,
              termsAcceptedAt: new Date().toISOString(),
              professionalSummary: 'Perfil fictício para teste.',
            }
          : {}),
      },
    })
  }
  manager = await account('manager', school, 'gestora-m3')
  otherManager = await account('manager', otherSchool, 'outra-gestora-m3')
  provider = await account('provider', school, 'prestador-m3')
  otherProvider = await account('provider', otherSchool, 'outro-prestador-m3')
  admin = await account('admin', school, 'admin-m3')
})
afterAll(async () => {
  await payload?.destroy()
})

const reqFor = (user?: User) => createLocalReq({ user }, payload)
const input = (expectedRevision?: number) => ({
  availability: 'Segunda a sexta, das 8h às 12h.',
  experience: '',
  accepted: true,
  expectedRevision,
})
async function opportunity(published = true) {
  const doc = await payload.create({
    collection: 'opportunities',
    user: manager,
    overrideAccess: false,
    data: {
      title: `Reparo M3 ${randomUUID()}`,
      description: 'Escopo fictício aceito pelo prestador.',
      category,
      school,
      status: 'DRAFT',
      location: 'Entrada',
      fixedAmount: 350.5,
      applicationDeadline: future(2),
      executionStart: future(3),
      executionEnd: future(5),
      materialsResponsibility: 'school',
      toolsResponsibility: 'provider',
      requirements: 'Conhecimento do serviço',
      notes: 'Trabalho pela manhã',
    },
  })
  return published
    ? payload.update({
        collection: 'opportunities',
        id: doc.id,
        user: manager,
        overrideAccess: false,
        context: { publishingOpportunity: true },
        data: { status: 'OPEN' },
      })
    : doc
}
async function confirmedInput(id: number, revision?: number) {
  return {
    ...input(revision),
    conditionsToken: conditionsToken(
      await payload.findByID({ collection: 'opportunities', id, depth: 0 }),
    ),
  }
}
async function change(
  opportunityID: number,
  action: ParticipationAction = 'submit',
  revision?: number,
  user = provider,
) {
  return changeParticipation(
    await reqFor(user),
    opportunityID,
    action,
    await confirmedInput(opportunityID, revision),
  )
}
async function events(id: number, user = provider) {
  return payload.find({
    collection: 'application-events',
    user,
    overrideAccess: false,
    depth: 0,
    where: { application: { equals: id } },
    sort: 'revision',
    pagination: false,
  })
}

describe('Cadastro e participação', () => {
  it('cria cadastro público canônico, sem privilégios nem confirmação de e-mail', async () => {
    const content = await payload.findGlobal({ slug: 'site-content', depth: 0 })
    const email = `cadastro-${suffix}@example.test`
    const result = await registerProvider(await reqFor(), {
      name: 'Pessoa Fictícia',
      email,
      password,
      phone: '11988887777',
      communityLink: 'other',
      adultConfirmed: true,
      termsAccepted: true,
      role: 'admin',
      status: 'blocked',
      school: otherSchool,
      termsAcceptedAt: '2000-01-01',
    })
    const saved = await payload.findByID({
      collection: 'users',
      id: result.id,
      depth: 0,
    })
    expect(saved.role).toBe('provider')
    expect(saved.status).toBe('active')
    expect(saved.school).toBe(content.school)
    expect(Date.parse(saved.termsAcceptedAt!)).toBeGreaterThan(
      Date.now() - 60000,
    )
    const login = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    expect(login.token).toBeTruthy()
    const opened = await opportunity()
    const application = await change(opened.id, 'submit', undefined, saved)
    expect(application.status).toBe('SUBMITTED')
    expect(saved).not.toHaveProperty('_verified')
  })

  it('exige maioridade, aceite, senha e contato válidos e limita retorno a caminhos locais', async () => {
    const valid = {
      name: 'Pessoa Fictícia',
      email: `incompleto-${suffix}@example.test`,
      password,
      phone: '11988887777',
      communityLink: 'local',
      adultConfirmed: true,
      termsAccepted: true,
    }
    for (const invalid of [
      { adultConfirmed: false },
      { termsAccepted: false },
      { password: 'curta' },
      { phone: '12' },
      { communityLink: 'inventado' },
      { name: '  ' },
    ])
      await expect(
        registerProvider(await reqFor(), { ...valid, ...invalid }),
      ).rejects.toThrow()
    expect(safeReturnPath('https://example.com')).toBe('/minhas-candidaturas')
    expect(safeReturnPath('//example.com')).toBe('/minhas-candidaturas')
    expect(safeReturnPath('/oportunidades/1/candidatar')).toBe(
      '/oportunidades/1/candidatar',
    )
    expect(safeReturnPath('/oportunidades/1?next=//example.com')).toBe(
      '/minhas-candidaturas',
    )
  })

  it('exige disponibilidade e concordância e registra condições, perfil e datas no servidor', async () => {
    const opened = await opportunity()
    await expect(
      changeParticipation(await reqFor(provider), opened.id, 'submit', {
        ...(await confirmedInput(opened.id)),
        availability: ' ',
      }),
    ).rejects.toThrow()
    await expect(
      changeParticipation(await reqFor(provider), opened.id, 'submit', {
        ...(await confirmedInput(opened.id)),
        accepted: false,
      }),
    ).rejects.toThrow()
    const saved = await change(opened.id)
    expect(saved.availability).toBe(input().availability)
    expect(saved.acceptedConditions).toMatchObject({
      fixedAmount: 350.5,
      description: opened.description,
      materialsResponsibility: 'school',
      toolsResponsibility: 'provider',
      applicationDeadline: opened.applicationDeadline,
    })
    expect(saved.profileSnapshot).toMatchObject({
      email: provider.email,
      phone: provider.phone,
      professionalSummary: provider.professionalSummary,
    })
    expect(saved.acceptedAt).toBeTruthy()
    expect(saved.firstSubmittedAt).toBe(saved.submittedAt)
    expect((await events(saved.id)).docs.map((event) => event.action)).toEqual([
      'submit',
    ])
  })

  it('limita consulta ao próprio prestador e gestão da escola sem abrir catálogo de usuários', async () => {
    const opened = await opportunity()
    const saved = await change(opened.id)
    const authorized = await payload.findByID({
      collection: 'applications',
      id: saved.id,
      user: manager,
      overrideAccess: false,
      depth: 3,
    })
    expect(authorized.profileSnapshot?.phone).toBe(provider.phone)
    expect(authorized.candidate).toBe(provider.id)
    for (const user of [undefined, otherProvider, otherManager]) {
      await expect(
        payload.findByID({
          collection: 'applications',
          id: saved.id,
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
      const event = (await events(saved.id)).docs[0]
      await expect(
        payload.findByID({
          collection: 'application-events',
          id: event.id,
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    }
    const users = await payload.find({
      collection: 'users',
      user: manager,
      overrideAccess: false,
    })
    expect(users.docs.map((user) => user.id)).toEqual([manager.id])
    await expect(
      change(opened.id, 'edit', saved.revision, otherProvider),
    ).rejects.toThrow()
  })

  it('preserva o mesmo registro e histórico em edição, retirada e reenvio e rejeita revisões antigas', async () => {
    const opened = await opportunity()
    const first = await change(opened.id)
    const edited = await changeParticipation(
      await reqFor(provider),
      opened.id,
      'edit',
      {
        ...(await confirmedInput(opened.id, first.revision)),
        availability: 'Somente às terças.',
      },
    )
    const withdrawn = await change(opened.id, 'withdraw', edited.revision)
    expect(withdrawn.status).toBe('WITHDRAWN')
    await expect(change(opened.id, 'resubmit', first.revision)).rejects.toThrow(
      /alterada/,
    )
    const resubmitted = await change(opened.id, 'resubmit', withdrawn.revision)
    expect(resubmitted.id).toBe(first.id)
    expect(resubmitted.revision).toBe(4)
    expect(resubmitted.firstSubmittedAt).toBe(first.firstSubmittedAt)
    const history = await events(first.id)
    expect(history.docs.map((event) => event.action)).toEqual([
      'submit',
      'edit',
      'withdraw',
      'resubmit',
    ])
    expect(history.docs[0].snapshot).toMatchObject({
      availability: input().availability,
    })
    expect(history.docs[1].snapshot).toMatchObject({
      availability: 'Somente às terças.',
    })
    expect(
      (
        await payload.count({
          collection: 'applications',
          where: { opportunity: { equals: opened.id } },
        })
      ).totalDocs,
    ).toBe(1)
  })

  it('impede escritas genéricas e alterações ou exclusões do histórico, até por administrador', async () => {
    const opened = await opportunity()
    const saved = await change(opened.id)
    await expect(
      payload.update({
        collection: 'applications',
        id: saved.id,
        user: admin,
        overrideAccess: false,
        data: { status: 'WITHDRAWN' },
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'applications',
        id: saved.id,
        overrideAccess: true,
        data: { status: 'WITHDRAWN' },
      }),
    ).rejects.toThrow()
    await expect(
      payload.delete({
        collection: 'applications',
        id: saved.id,
        user: admin,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const event = (await events(saved.id)).docs[0]
    await expect(
      payload.update({
        collection: 'application-events',
        id: event.id,
        context: { applicationAction: true },
        data: { action: 'edit' },
      }),
    ).rejects.toThrow(/imutável/)
    await expect(
      payload.delete({ collection: 'application-events', id: event.id }),
    ).rejects.toThrow(/imutável/)
  })

  it('bloqueia prazo vencido, rascunho, conta bloqueada e perfis de gestão', async () => {
    const draft = await opportunity(false)
    await expect(change(draft.id)).rejects.toThrow()
    const opened = await opportunity()
    const saved = await change(opened.id)
    // Teste do relógio: espera o prazo real passar, sem alterar condições protegidas.
    const short = await opportunity()
    await payload.update({
      collection: 'opportunities',
      id: short.id,
      user: manager,
      overrideAccess: false,
      data: { applicationDeadline: new Date(Date.now() - 1000).toISOString() },
    })
    await expect(change(short.id)).rejects.toThrow(/encerradas/)
    for (const action of ['edit', 'withdraw', 'resubmit'] as const) {
      // Data já vencida é montada antes da primeira candidatura no outro teste abaixo.
      await expect(
        changeParticipation(
          await reqFor({ ...provider, status: 'blocked' }),
          opened.id,
          action,
          input(saved.revision),
        ),
      ).rejects.toThrow()
    }
    await expect(
      change(opened.id, 'submit', undefined, manager),
    ).rejects.toThrow()
    await expect(
      changeParticipation(await reqFor(), opened.id, 'submit', input()),
    ).rejects.toThrow()
  })

  it('protege condições após a primeira candidatura e retirada, permitindo só correções separadas', async () => {
    const opened = await opportunity()
    const saved = await change(opened.id)
    await change(opened.id, 'withdraw', saved.revision)
    for (const data of [
      { fixedAmount: 400 },
      { description: 'Novo escopo' },
      { materialsResponsibility: 'provider' as const },
      { toolsResponsibility: 'school' as const },
      { applicationDeadline: future(3) },
      { executionStart: future(4) },
      { requirements: 'Outra exigência' },
    ])
      await expect(
        payload.update({
          collection: 'opportunities',
          id: opened.id,
          user: manager,
          overrideAccess: false,
          data,
        }),
      ).rejects.toThrow(/protegidas/)
    const corrected = await payload.update({
      collection: 'opportunities',
      id: opened.id,
      user: manager,
      overrideAccess: false,
      data: {
        clarification: 'Correção da grafia do nome do local.',
        fixedAmount: opened.fixedAmount,
        applicationDeadline: opened.applicationDeadline,
      },
    })
    expect(corrected.clarification).toBeTruthy()
    expect(corrected.fixedAmount).toBe(350.5)
  })

  it('rejeita edição, retirada e reenvio após o prazo sem alterar histórico', async () => {
    const opened = await opportunity()
    const saved = await change(opened.id)
    const withdrawnOpportunity = await opportunity()
    const initial = await change(withdrawnOpportunity.id)
    const withdrawn = await change(
      withdrawnOpportunity.id,
      'withdraw',
      initial.revision,
    )
    const clock = vi
      .spyOn(Date, 'now')
      .mockReturnValue(Date.parse(opened.applicationDeadline) + 1000)
    try {
      for (const action of ['edit', 'withdraw'] as const)
        await expect(change(opened.id, action, saved.revision)).rejects.toThrow(
          /encerradas/,
        )
      await expect(
        change(withdrawnOpportunity.id, 'resubmit', withdrawn.revision),
      ).rejects.toThrow(/encerradas/)
      expect((await events(saved.id)).docs).toHaveLength(1)
      expect((await events(withdrawn.id)).docs).toHaveLength(2)
    } finally {
      clock.mockRestore()
    }
  })

  it('impede envios duplicados e reenvios simultâneos com índice único e trava transacional', async () => {
    const opened = await opportunity()
    const submissions = await Promise.allSettled(
      Array.from({ length: 5 }, () => change(opened.id)),
    )
    expect(
      submissions.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const first = submissions.find(
      (result) => result.status === 'fulfilled',
    )!.value
    const withdrawn = await change(opened.id, 'withdraw', first.revision)
    const resubmits = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        change(opened.id, 'resubmit', withdrawn.revision),
      ),
    )
    expect(
      resubmits.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect((await events(first.id)).docs).toHaveLength(3)
    const { id, createdAt, updatedAt, ...duplicate } = first
    await expect(
      payload.create({
        collection: 'applications',
        context: { applicationAction: true },
        data: duplicate,
      }),
    ).rejects.toThrow()
  })

  it('serializa primeira candidatura versus edição, observando condições atualizadas após esperar a trava', async () => {
    const opened = await opportunity()
    const editor = await reqFor(manager)
    await initTransaction(editor)
    await lockOpportunity(editor, opened.id)
    const staleInput = await confirmedInput(opened.id)
    const submission = changeParticipation(
      await reqFor(provider),
      opened.id,
      'submit',
      staleInput,
    )
    const staleDenied = expect(submission).rejects.toThrow(/atualizadas/)
    await payload.update({
      collection: 'opportunities',
      id: opened.id,
      req: editor,
      overrideAccess: false,
      data: { fixedAmount: 900 },
    })
    await commitTransaction(editor)
    await staleDenied
    const saved = await change(opened.id)
    expect(saved.acceptedConditions).toMatchObject({ fixedAmount: 900 })

    const another = await opportunity()
    const candidate = await reqFor(provider)
    await initTransaction(candidate)
    await changeParticipation(
      candidate,
      another.id,
      'submit',
      await confirmedInput(another.id),
    )
    const update = payload.update({
      collection: 'opportunities',
      id: another.id,
      user: manager,
      overrideAccess: false,
      data: { fixedAmount: 1000 },
    })
    // Instala o observador de rejeição antes de liberar a transação.
    const denied = expect(update).rejects.toThrow(/protegidas/)
    await commitTransaction(candidate)
    await denied
    expect(
      (await payload.findByID({ collection: 'opportunities', id: another.id }))
        .fixedAmount,
    ).toBe(350.5)
  })

  it('reverte candidatura e evento juntos em rollback e mantém condições editáveis', async () => {
    const opened = await opportunity()
    const req = await reqFor(provider)
    await initTransaction(req)
    const saved = await changeParticipation(
      req,
      opened.id,
      'submit',
      await confirmedInput(opened.id),
    )
    await killTransaction(req)
    expect(
      (
        await payload.count({
          collection: 'applications',
          where: { id: { equals: saved.id } },
        })
      ).totalDocs,
    ).toBe(0)
    expect(
      (
        await payload.count({
          collection: 'application-events',
          where: { application: { equals: saved.id } },
        })
      ).totalDocs,
    ).toBe(0)
    await expect(
      payload.update({
        collection: 'opportunities',
        id: opened.id,
        user: manager,
        overrideAccess: false,
        data: { fixedAmount: 600 },
      }),
    ).resolves.toMatchObject({ fixedAmount: 600 })
  })
})
