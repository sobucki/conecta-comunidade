import { randomUUID } from 'node:crypto'
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import { getPayload, createLocalReq, type Payload } from 'payload'
import config from '../../src/payload.config'
import type { User, Opportunity, Application } from '../../src/payload-types'
import {
  decideOpportunity,
  type DecisionAction,
} from '../../src/selection/actions'
import { changeParticipation } from '../../src/participation/actions'
import { conditionsToken } from '../../src/participation/rules'
import { relationID } from '../../src/opportunities/rules'

let payload: Payload, manager: User, otherManager: User, admin: User
let providers: User[], school: number, category: number
const suffix = randomUUID().slice(0, 8)
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString()

beforeAll(async () => {
  payload = await getPayload({ config })
  school = (
    await payload.create({
      collection: 'schools',
      data: { name: 'Escola Seleção', slug: `selecao-${suffix}` },
    })
  ).id
  const otherSchool = (
    await payload.create({
      collection: 'schools',
      data: { name: 'Outra Escola Seleção', slug: `outra-selecao-${suffix}` },
    })
  ).id
  category = (
    await payload.create({
      collection: 'categories',
      data: { name: `Reparo Seleção ${suffix}` },
    })
  ).id
  async function account(name: string, role: User['role'], schoolID = school) {
    return payload.create({
      collection: 'users',
      context: { bootstrap: true },
      data: {
        name,
        role,
        school: schoolID,
        status: 'active',
        email: `${name}-${suffix}@example.test`,
        password: 'Senha-ficticia-de-selecao',
        ...(role === 'provider'
          ? {
              phone: '11999998888',
              communityLink: 'local',
              adultConfirmed: true,
              termsAcceptedAt: new Date().toISOString(),
            }
          : {}),
      },
    })
  }
  manager = await account('gestora-m4', 'manager')
  otherManager = await account('outra-gestora-m4', 'manager', otherSchool)
  admin = await account('admin-m4', 'admin')
  providers = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      account(`prestador-m4-${index}`, 'provider'),
    ),
  )
})
afterAll(async () => {
  await payload?.destroy()
})
const reqFor = (user?: User) => createLocalReq({ user }, payload)
const read = (id: number) =>
  payload.findByID({
    collection: 'opportunities',
    id,
    user: manager,
    overrideAccess: false,
    depth: 0,
  })
const application = (id: number) =>
  payload.findByID({ collection: 'applications', id, depth: 0 })
const applications = (id: number) =>
  payload.find({
    collection: 'applications',
    where: { opportunity: { equals: id } },
    depth: 0,
    pagination: false,
    sort: 'id',
  })
const decisions = (id: number, user: User = manager) =>
  payload.find({
    collection: 'opportunity-events',
    user,
    overrideAccess: false,
    where: { opportunity: { equals: id } },
    depth: 0,
    sort: 'revision',
    pagination: false,
  })

async function opportunity() {
  const doc = await payload.create({
    collection: 'opportunities',
    user: manager,
    overrideAccess: false,
    data: {
      title: `Reparo M4 ${randomUUID()}`,
      description: 'Escopo fictício para seleção.',
      status: 'DRAFT',
      school,
      category,
      location: 'Entrada',
      fixedAmount: 700,
      applicationDeadline: future(2),
      executionStart: future(3),
      executionEnd: future(5),
      materialsResponsibility: 'school',
      toolsResponsibility: 'provider',
    },
  })
  return payload.update({
    collection: 'opportunities',
    id: doc.id,
    user: manager,
    overrideAccess: false,
    context: { publishingOpportunity: true },
    data: { status: 'OPEN' },
    depth: 0,
  })
}
async function apply(opportunity: Opportunity, provider = providers[0]) {
  return changeParticipation(await reqFor(provider), opportunity.id, 'submit', {
    availability: 'Durante a manhã.',
    accepted: true,
    conditionsToken: conditionsToken(opportunity),
  })
}
async function decide(
  id: number,
  action: DecisionAction,
  input: Record<string, unknown> = {},
  user = manager,
) {
  const current = await read(id)
  return decideOpportunity(await reqFor(user), id, action, {
    expectedRevision: current.decisionRevision || 0,
    confirmed: true,
    ...input,
  })
}
async function select(id: number, candidate: Application) {
  return decide(id, 'select', {
    applicationID: candidate.id,
    expectedApplicationRevision: candidate.revision,
  })
}

describe('Seleção manual e exceções', () => {
  it('encerra antecipadamente, bloqueia candidaturas e exige encerramento para selecionar', async () => {
    const opened = await opportunity()
    const candidate = await apply(opened)
    await expect(select(opened.id, candidate)).rejects.toThrow(
      /inscrições encerradas/,
    )
    const closed = await decide(opened.id, 'close')
    expect(closed.status).toBe('UNDER_REVIEW')
    expect(closed.closedAt).toBeTruthy()
    expect(relationID(closed.closedBy)).toBe(manager.id)
    await expect(apply(opened, providers[1])).rejects.toThrow(/encerradas/)
    await expect(
      changeParticipation(await reqFor(providers[0]), opened.id, 'withdraw', {
        expectedRevision: candidate.revision,
      }),
    ).rejects.toThrow(/encerradas/)
    await expect(decide(opened.id, 'close')).rejects.toThrow(/encerradas/)
  })

  it('apresenta análise após prazo e permite seleção sem rotina de agendamento', async () => {
    const opened = await opportunity()
    const candidate = await apply(opened)
    const clock = vi
      .spyOn(Date, 'now')
      .mockReturnValue(Date.parse(opened.applicationDeadline) + 1000)
    try {
      expect((await read(opened.id)).currentStatus).toBe('UNDER_REVIEW')
      await expect(apply(opened, providers[1])).rejects.toThrow(/encerradas/)
      const selected = await select(opened.id, candidate)
      expect(selected.status).toBe('AWAITING_FORMALIZATION')
      expect(
        (await decisions(opened.id)).docs.map((event) => event.action),
      ).toEqual(['deadline_closed', 'select'])
    } finally {
      clock.mockRestore()
    }
  })

  it('seleciona um candidato e atualiza demais elegíveis atomicamente, preservando retiradas', async () => {
    const opened = await opportunity()
    const candidates = await Promise.all(
      providers.slice(0, 3).map((provider) => apply(opened, provider)),
    )
    await changeParticipation(
      await reqFor(providers[2]),
      opened.id,
      'withdraw',
      { expectedRevision: candidates[2].revision },
    )
    await decide(opened.id, 'close')
    const result = await select(opened.id, candidates[0])
    expect(result.status).toBe('AWAITING_FORMALIZATION')
    expect(relationID(result.selectedApplication)).toBe(candidates[0].id)
    expect(result.selectedAt).toBeTruthy()
    expect(relationID(result.selectedBy)).toBe(manager.id)
    const statuses = new Map(
      (await applications(opened.id)).docs.map((doc) => [doc.id, doc.status]),
    )
    expect(statuses.get(candidates[0].id)).toBe('SELECTED')
    expect(statuses.get(candidates[1].id)).toBe('NOT_SELECTED')
    expect(statuses.get(candidates[2].id)).toBe('WITHDRAWN')
    expect((await application(candidates[0].id)).acceptedAt).toBe(
      candidates[0].acceptedAt,
    )
    const history = await payload.find({
      collection: 'application-events',
      where: { application: { equals: candidates[1].id } },
      sort: 'revision',
      depth: 0,
    })
    expect(history.docs.map((doc) => doc.action)).toEqual([
      'submit',
      'not_selected',
    ])
    expect(relationID(history.docs[1].actor)).toBe(manager.id)
  })

  it('mantém apenas uma seleção em requisições concorrentes', async () => {
    const opened = await opportunity()
    const candidates = await Promise.all(
      providers.slice(0, 2).map((provider) => apply(opened, provider)),
    )
    const closed = await decide(opened.id, 'close')
    const results = await Promise.allSettled(
      candidates.map(async (candidate) =>
        decideOpportunity(await reqFor(manager), opened.id, 'select', {
          confirmed: true,
          expectedRevision: closed.decisionRevision,
          applicationID: candidate.id,
          expectedApplicationRevision: candidate.revision,
        }),
      ),
    )
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(
      (await applications(opened.id)).docs.filter(
        (doc) => doc.status === 'SELECTED',
      ),
    ).toHaveLength(1)
    expect(
      (await decisions(opened.id)).docs.filter(
        (doc) => doc.action === 'select',
      ),
    ).toHaveLength(1)
  })

  it('possui índice parcial que impede duas seleções mesmo fora do serviço de decisão', async () => {
    const opened = await opportunity()
    const a = await apply(opened)
    const b = await apply(opened, providers[1])
    await decide(opened.id, 'close')
    await select(opened.id, a)
    await expect(
      payload.update({
        collection: 'applications',
        id: b.id,
        context: { applicationAction: true },
        data: { status: 'SELECTED' },
      }),
    ).rejects.toThrow()
    expect((await application(b.id)).status).toBe('NOT_SELECTED')
    const result = await payload.db.pool.query(
      "select indexdef from pg_indexes where indexname='applications_one_selected_idx'",
    )
    expect(result.rows[0].indexdef).toMatch(
      /UNIQUE.*opportunity_id.*WHERE.*SELECTED/,
    )
  })

  it('reverte seleção, demais resultados e eventos quando a gravação final falha', async () => {
    const opened = await opportunity()
    const a = await apply(opened)
    const b = await apply(opened, providers[1])
    const closed = await decide(opened.id, 'close')
    const hooks =
      payload.collections['opportunity-events'].config.hooks.beforeChange
    const fail = () => {
      throw new Error('Falha controlada no histórico de decisões.')
    }
    hooks.push(fail)
    try {
      await expect(select(opened.id, a)).rejects.toThrow(/Falha controlada/)
    } finally {
      hooks.splice(hooks.indexOf(fail), 1)
    }
    expect((await read(opened.id)).status).toBe('UNDER_REVIEW')
    expect((await read(opened.id)).decisionRevision).toBe(
      closed.decisionRevision,
    )
    expect((await application(a.id)).status).toBe('SUBMITTED')
    expect((await application(b.id)).status).toBe('SUBMITTED')
    expect((await application(a.id)).revision).toBe(a.revision)
    expect(
      (await decisions(opened.id)).docs.map((event) => event.action),
    ).toEqual(['close'])
    const histories = await payload.find({
      collection: 'application-events',
      where: { application: { in: [a.id, b.id] } },
      pagination: false,
    })
    expect(histories.docs).toHaveLength(2)
  })

  it('registra desistência e reconsidera candidato existente sem reabrir inscrições', async () => {
    const opened = await opportunity()
    const a = await apply(opened)
    const b = await apply(opened, providers[1])
    await decide(opened.id, 'close')
    await select(opened.id, a)
    const reason = 'Motivo administrativo restrito da desistência.'
    const reviewed = await decide(opened.id, 'selected-withdrawal', { reason })
    expect(reviewed.status).toBe('UNDER_REVIEW')
    expect(reviewed.selectedApplication).toBeNull()
    expect(reviewed.closedAt).toBeTruthy()
    expect((await application(a.id)).status).toBe('SELECTED_WITHDRAWN')
    await expect(apply(opened, providers[3])).rejects.toThrow(/encerradas/)
    await expect(select(opened.id, await application(a.id))).rejects.toThrow(
      /indisponível/,
    )
    await select(opened.id, await application(b.id))
    expect(relationID((await read(opened.id)).selectedApplication)).toBe(b.id)
    expect(
      (await decisions(opened.id)).docs.map((event) => event.action),
    ).toEqual(['close', 'select', 'selected_withdrawal', 'select'])
    const own = await payload.find({
      collection: 'application-events',
      user: providers[0],
      overrideAccess: false,
      depth: 4,
      where: { application: { equals: a.id } },
    })
    expect(JSON.stringify(own)).not.toContain(reason)
    const authorized = await payload.find({
      collection: 'application-events',
      user: manager,
      overrideAccess: false,
      depth: 0,
      where: { application: { equals: a.id } },
    })
    expect(JSON.stringify(authorized)).toContain(reason)
  })

  it('diferencia cancelamento de encerramento sem seleção, exige motivo e mantém retiradas', async () => {
    for (const action of ['cancel', 'close-without-selection'] as const) {
      const opened = await opportunity()
      const a = await apply(opened)
      const b = await apply(opened, providers[1])
      await changeParticipation(
        await reqFor(providers[1]),
        opened.id,
        'withdraw',
        { expectedRevision: b.revision },
      )
      await decide(opened.id, 'close')
      for (const reason of ['', '   ', 'a'.repeat(2001)])
        await expect(decide(opened.id, action, { reason })).rejects.toThrow(
          /justificativa/,
        )
      const result = await decide(opened.id, action, {
        reason: 'Justificativa administrativa restrita.',
      })
      expect(result.status).toBe(
        action === 'cancel' ? 'CANCELLED' : 'CLOSED_WITHOUT_SELECTION',
      )
      expect((await application(a.id)).status).toBe(
        action === 'cancel' ? 'CANCELLED' : 'NOT_SELECTED',
      )
      expect((await application(b.id)).status).toBe('WITHDRAWN')
      await expect(select(opened.id, await application(a.id))).rejects.toThrow(
        /situação atual/,
      )
      const publicDoc = await payload.findByID({
        collection: 'opportunities',
        id: opened.id,
        overrideAccess: false,
        depth: 4,
      })
      expect(JSON.stringify(publicDoc)).not.toContain(
        'Justificativa administrativa restrita.',
      )
      expect(publicDoc).not.toHaveProperty('selectedApplication')
      expect(publicDoc).not.toHaveProperty('selectedBy')
      expect(publicDoc).not.toHaveProperty('resolutionReason')
    }
  })

  it('permite cancelar após seleção e encerrar sem seleção mesmo sem candidatos', async () => {
    const opened = await opportunity()
    const a = await apply(opened)
    await decide(opened.id, 'close')
    await select(opened.id, a)
    await decide(opened.id, 'cancel', {
      reason: 'Demanda cancelada pela escola.',
    })
    expect((await application(a.id)).status).toBe('CANCELLED')
    expect((await read(opened.id)).selectedApplication).toBeNull()
    const empty = await opportunity()
    await decide(empty.id, 'close')
    expect(
      (
        await decide(empty.id, 'close-without-selection', {
          reason: 'Não houve candidatos.',
        })
      ).status,
    ).toBe('CLOSED_WITHOUT_SELECTION')
  })

  it('restringe decisões e motivos à gestão da escola e protege estados contra patches comuns', async () => {
    const opened = await opportunity()
    for (const user of [
      providers[0],
      otherManager,
      { ...manager, status: 'blocked' as const },
    ])
      await expect(decide(opened.id, 'close', {}, user)).rejects.toThrow()
    await expect(
      decideOpportunity(await reqFor(), opened.id, 'close', {
        confirmed: true,
        expectedRevision: 0,
      }),
    ).rejects.toThrow()
    const spoofed = await payload.update({
      collection: 'opportunities',
      id: opened.id,
      user: admin,
      overrideAccess: false,
      data: {
        status: 'AWAITING_FORMALIZATION',
        decisionRevision: 999,
        resolutionReason: 'Motivo falso',
        selectedBy: admin.id,
      },
    })
    expect(spoofed.status).toBe('OPEN')
    expect(spoofed.decisionRevision).toBe(0)
    expect(spoofed.resolutionReason).toBeFalsy()
    await decide(opened.id, 'cancel', { reason: 'Restrito à direção.' })
    const event = (await decisions(opened.id)).docs[0]
    for (const user of [undefined, providers[0], otherManager])
      await expect(
        payload.findByID({
          collection: 'opportunity-events',
          id: event.id,
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'opportunity-events',
        id: event.id,
        context: { selectionAction: true },
        data: { reason: 'Alteração indevida' },
      }),
    ).rejects.toThrow(/imutável/)
    await expect(
      payload.delete({ collection: 'opportunity-events', id: event.id }),
    ).rejects.toThrow(/imutável/)
  })

  it('rejeita confirmações ausentes, revisões antigas, candidato de outra oportunidade e conta bloqueada', async () => {
    const opened = await opportunity()
    const a = await apply(opened)
    const other = await opportunity()
    const b = await apply(other, providers[1])
    await expect(
      decide(opened.id, 'close', { confirmed: false }),
    ).rejects.toThrow(/Confirme/)
    await decide(opened.id, 'close')
    await expect(
      decide(opened.id, 'select', {
        expectedRevision: 0,
        applicationID: a.id,
        expectedApplicationRevision: a.revision,
      }),
    ).rejects.toThrow(/outra decisão/)
    await expect(select(opened.id, b)).rejects.toThrow(/indisponível/)
    await expect(
      decide(opened.id, 'select', {
        applicationID: a.id,
        expectedApplicationRevision: 999,
      }),
    ).rejects.toThrow(/candidatura foi alterada/)
    const blocked = await payload.update({
      collection: 'users',
      id: providers[0].id,
      user: admin,
      overrideAccess: false,
      data: { status: 'blocked' },
    })
    try {
      await expect(select(opened.id, a)).rejects.toThrow(/indisponível/)
    } finally {
      await payload.update({
        collection: 'users',
        id: blocked.id,
        user: admin,
        overrideAccess: false,
        data: { status: 'active' },
      })
    }
  })

  it('serializa seleção e cancelamento concorrentes sem estado parcial', async () => {
    const opened = await opportunity()
    const a = await apply(opened)
    const closed = await decide(opened.id, 'close')
    const results = await Promise.allSettled([
      decideOpportunity(await reqFor(manager), opened.id, 'select', {
        confirmed: true,
        expectedRevision: closed.decisionRevision,
        applicationID: a.id,
        expectedApplicationRevision: a.revision,
      }),
      decideOpportunity(await reqFor(manager), opened.id, 'cancel', {
        confirmed: true,
        expectedRevision: closed.decisionRevision,
        reason: 'Cancelamento concorrente.',
      }),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const current = await read(opened.id)
    expect((await application(a.id)).status).toBe(
      current.status === 'CANCELLED' ? 'CANCELLED' : 'SELECTED',
    )
    expect((await decisions(opened.id)).docs).toHaveLength(2)
  })

  it('não permite reabrir por mudança de prazo, inclusive sem candidaturas', async () => {
    const opened = await opportunity()
    await decide(opened.id, 'close')
    await expect(
      payload.update({
        collection: 'opportunities',
        id: opened.id,
        user: manager,
        overrideAccess: false,
        data: { applicationDeadline: future(4) },
      }),
    ).rejects.toThrow()
    const expired = await opportunity()
    await payload.update({
      collection: 'opportunities',
      id: expired.id,
      user: manager,
      overrideAccess: false,
      data: { applicationDeadline: new Date(Date.now() - 1000).toISOString() },
    })
    await expect(
      payload.update({
        collection: 'opportunities',
        id: expired.id,
        user: manager,
        overrideAccess: false,
        data: { applicationDeadline: future(4) },
      }),
    ).rejects.toThrow()
    const result = await payload.update({
      collection: 'opportunities',
      id: opened.id,
      user: manager,
      overrideAccess: false,
      data: {
        clarification: 'Correção de grafia, sem mudar o serviço.',
        status: 'OPEN',
      },
    })
    expect(result.status).toBe('UNDER_REVIEW')
  })
})
