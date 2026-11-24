import { randomUUID } from 'node:crypto'
import { beforeAll, afterAll, it, expect } from 'vitest'
import { getPayload, createLocalReq, type Payload, type User } from 'payload'
import config from '../../src/payload.config'
import { observationPeriod, pilotMetrics } from '../../src/pilot/metrics'
import { changeParticipation } from '../../src/participation/actions'
import { conditionsToken } from '../../src/participation/rules'
let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
})
afterAll(async () => {
  await payload?.destroy()
})
it('interpreta limites inclusivos por dia em Brasília e rejeita datas inexistentes', () => {
  expect(observationPeriod('2026-11-24', '2026-11-24')).toEqual({
    from: '2026-11-24T03:00:00.000Z',
    until: '2026-11-25T03:00:00.000Z',
  })
  expect(() => observationPeriod('2026-02-30', '2026-03-01')).toThrow()
  expect(() => observationPeriod('2026-11-25', '2026-11-24')).toThrow()
})
it('nega indicadores a visitantes e prestadores', async () => {
  await expect(
    pilotMetrics(await createLocalReq({}, payload), '2026-01-01', '2026-12-31'),
  ).rejects.toThrow()
  const user = (
    await payload.find({
      collection: 'users',
      where: { role: { equals: 'provider' } },
      limit: 1,
    })
  ).docs[0]
  await expect(
    pilotMetrics(
      await createLocalReq({ user }, payload),
      '2026-01-01',
      '2026-12-31',
    ),
  ).rejects.toThrow()
})
it('reconcilia reenvios e coorte sem contar edição ou retirada como novo envio', async () => {
  const suffix = randomUUID().slice(0, 8)
  const school = (
    await payload.create({
      collection: 'schools',
      data: { name: 'Escola indicadores', slug: `metricas-${suffix}` },
    })
  ).id
  const account = async (role: User['role']) =>
    payload.create({
      collection: 'users',
      context: { bootstrap: true },
      data: {
        name: role,
        email: `${role}-${suffix}@example.test`,
        password: 'Senha-ficticia-de-indicadores',
        role,
        status: 'active',
        school,
        ...(role === 'provider'
          ? {
              phone: '11999999999',
              communityLink: 'local' as const,
              adultConfirmed: true,
              termsAcceptedAt: new Date().toISOString(),
            }
          : {}),
      },
    })
  const manager = await account('manager'),
    provider = await account('provider')
  const category = (await payload.find({ collection: 'categories', limit: 1 }))
    .docs[0].id
  const future = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString()
  const draft = await payload.create({
    collection: 'opportunities',
    user: manager,
    overrideAccess: false,
    data: {
      title: 'Teste indicadores',
      description: 'Fictício',
      status: 'DRAFT',
      school,
      category,
      location: 'Entrada',
      fixedAmount: 100,
      applicationDeadline: future(2),
      executionStart: future(3),
      executionEnd: future(4),
      materialsResponsibility: 'school',
      toolsResponsibility: 'provider',
    },
  })
  const opened = await payload.update({
    collection: 'opportunities',
    id: draft.id,
    user: manager,
    overrideAccess: false,
    context: { publishingOpportunity: true },
    data: { status: 'OPEN' },
  })
  const req = () => createLocalReq({ user: provider }, payload)
  const values = {
    availability: 'Pela manhã',
    accepted: true,
    conditionsToken: conditionsToken(opened),
  }
  const first = await changeParticipation(
    await req(),
    opened.id,
    'submit',
    values,
  )
  const edited = await changeParticipation(await req(), opened.id, 'edit', {
    ...values,
    expectedRevision: first.revision,
  })
  const withdrawn = await changeParticipation(
    await req(),
    opened.id,
    'withdraw',
    { expectedRevision: edited.revision },
  )
  await changeParticipation(await req(), opened.id, 'resubmit', {
    ...values,
    expectedRevision: withdrawn.revision,
  })
  const metrics = await pilotMetrics(
    await createLocalReq({ user: manager }, payload),
    '2020-01-01',
    '2099-12-31',
  )
  expect(metrics).toMatchObject({
    registered: 1,
    participants: 1,
    published: 1,
    submissions: 2,
    first_submissions: 1,
    resubmissions: 1,
    opportunities_with_candidates: 1,
    percentage: 100,
  })
  expect(Number(metrics.average_seconds)).toBeGreaterThanOrEqual(0)
  const empty = await pilotMetrics(
    await createLocalReq({ user: manager }, payload),
    '2000-01-01',
    '2000-01-01',
  )
  expect(empty).toMatchObject({
    published: 0,
    percentage: null,
    average_seconds: null,
  })
})
