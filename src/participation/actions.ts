import {
  APIError,
  initTransaction,
  commitTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload'
import { lockOpportunity } from '../opportunities/transaction'
import { relationID } from '../opportunities/rules'
import { acceptedConditions, conditionsToken, requireProvider } from './rules'
import { recordApplicationEvent } from './history'
import type { Application } from '../payload-types'

export type ParticipationAction = 'submit' | 'edit' | 'withdraw' | 'resubmit'
type Input = {
  availability?: unknown
  experience?: unknown
  accepted?: unknown
  expectedRevision?: unknown
  conditionsToken?: unknown
}

function text(value: unknown, limit: number, required = false) {
  if (value == null && !required) return ''
  if (
    typeof value !== 'string' ||
    value.trim().length > limit ||
    (required && !value.trim())
  )
    throw new APIError(
      required
        ? 'Informe sua disponibilidade (até 3.000 caracteres).'
        : 'Apresentação inválida (até 3.000 caracteres).',
      400,
    )
  return value.trim()
}

export async function changeParticipation(
  req: PayloadRequest,
  opportunityID: number,
  action: ParticipationAction,
  input: Input,
) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new APIError('Candidatura inválida.', 400)
  const user = requireProvider(req)
  if (!Number.isSafeInteger(opportunityID) || opportunityID < 1)
    throw new APIError('Oportunidade inválida.', 400)
  const started = await initTransaction(req)
  const previousContext = { ...req.context }
  try {
    await lockOpportunity(req, opportunityID)
    const opportunity = await req.payload.findByID({
      collection: 'opportunities',
      id: opportunityID,
      depth: 0,
      req,
      overrideAccess: false,
    })
    if (
      opportunity.status !== 'OPEN' ||
      !opportunity.publishedAt ||
      Date.parse(opportunity.applicationDeadline) <= Date.now()
    )
      throw new APIError(
        'As inscrições estão encerradas. Não é possível enviar ou alterar candidaturas.',
        409,
      )
    const found = await req.payload.find({
      collection: 'applications',
      req,
      overrideAccess: false,
      depth: 0,
      limit: 1,
      where: {
        and: [
          { opportunity: { equals: opportunityID } },
          { candidate: { equals: user.id } },
        ],
      },
    })
    const original = found.docs[0]
    if (action === 'submit' && original)
      throw new APIError(
        'Você já possui uma candidatura. Consulte Minhas candidaturas para editar ou reenviar.',
        409,
      )
    if (
      action !== 'submit' &&
      (!original || original.revision !== input.expectedRevision)
    )
      throw new APIError(
        'A candidatura foi alterada. Atualize a página antes de tentar novamente.',
        409,
      )
    if (
      original &&
      ((action === 'resubmit' && original.status !== 'WITHDRAWN') ||
        (['edit', 'withdraw'].includes(action) &&
          original.status !== 'SUBMITTED'))
    )
      throw new APIError(
        'Esta ação não está disponível para a situação atual.',
        409,
      )

    const now = new Date().toISOString()
    let values: Partial<Application>
    if (action === 'withdraw')
      values = { status: 'WITHDRAWN' as const, withdrawnAt: now }
    else {
      if (input.accepted !== true)
        throw new APIError(
          'Confirme a concordância com o valor e as condições publicadas.',
          400,
        )
      if (input.conditionsToken !== conditionsToken(opportunity))
        throw new APIError(
          'As condições da oportunidade foram atualizadas. Recarregue a página, confira os dados e confirme novamente.',
          409,
        )
      // Snapshot com campos permitidos; a consulta de candidatos não abre um catálogo de usuários.
      const profile = await req.payload.findByID({
        collection: 'users',
        id: user.id,
        req,
        overrideAccess: false,
        depth: 1,
      })
      values = {
        availability: text(input.availability, 3000, true),
        experience: text(input.experience, 3000),
        status: 'SUBMITTED' as const,
        withdrawnAt: null,
        acceptedAt: now,
        acceptedConditions: acceptedConditions(opportunity),
        submittedAt: action === 'edit' ? original!.submittedAt : now,
        candidateName: profile.name,
        profileSnapshot: {
          email: profile.email,
          phone: profile.phone,
          communityLink: profile.communityLink,
          professionalSummary: profile.professionalSummary || '',
          skills: (profile.skills || [])
            .filter((skill) => typeof skill === 'object')
            .map((skill) => (typeof skill === 'object' ? skill.name : ''))
            .join(', '),
        },
      }
    }
    req.context.applicationAction = true
    const data = {
      ...values,
      revision: (original?.revision || 0) + 1,
      school: relationID(opportunity.school)!,
      candidate: user.id,
      opportunity: opportunityID,
    }
    const doc = original
      ? await req.payload.update({
          collection: 'applications',
          id: original.id,
          req,
          overrideAccess: true,
          depth: 0,
          data,
        })
      : await req.payload.create({
          collection: 'applications',
          req,
          overrideAccess: true,
          depth: 0,
          data: {
            ...data,
            firstSubmittedAt: now,
            status: 'SUBMITTED',
            candidateName: values.candidateName!,
            availability: values.availability!,
            acceptedAt: now,
            acceptedConditions: values.acceptedConditions!,
            submittedAt: now,
          },
        })
    await recordApplicationEvent(req, doc, action)
    if (started) await commitTransaction(req)
    return doc
  } catch (error) {
    if (started) await killTransaction(req)
    throw error
  } finally {
    req.context = previousContext
  }
}

export async function applyEndpoint(req: PayloadRequest) {
  const input = await req.json!()
  const doc = await changeParticipation(
    req,
    Number(req.routeParams?.id),
    'submit',
    input,
  )
  return Response.json(
    { doc },
    { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export async function conditionsEndpoint(req: PayloadRequest) {
  const opportunity = await req.payload.findByID({
    collection: 'opportunities',
    id: Number(req.routeParams?.id),
    req,
    overrideAccess: false,
    depth: 0,
  })
  return Response.json(
    {
      conditions: acceptedConditions(opportunity),
      conditionsToken: conditionsToken(opportunity),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export function applicationEndpoint(
  action: Exclude<ParticipationAction, 'submit'>,
) {
  return async (req: PayloadRequest) => {
    requireProvider(req)
    const application = await req.payload.findByID({
      collection: 'applications',
      id: Number(req.routeParams?.id),
      req,
      overrideAccess: false,
      depth: 0,
    })
    const doc = await changeParticipation(
      req,
      relationID(application.opportunity)!,
      action,
      await req.json!(),
    )
    return Response.json(
      { doc },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
