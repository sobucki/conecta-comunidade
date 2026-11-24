import {
  APIError,
  initTransaction,
  commitTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload'
import { managementPanel, isAdministrator } from '../access'
import { relationID, userSchool } from '../opportunities/rules'
import { lockOpportunity } from '../opportunities/transaction'
import { recordApplicationEvent } from '../participation/history'
import type {
  Application,
  Opportunity,
  ApplicationEvent,
  OpportunityEvent,
} from '../payload-types'
import { currentOpportunityStatus } from './status'

export type DecisionAction =
  | 'close'
  | 'select'
  | 'selected-withdrawal'
  | 'cancel'
  | 'close-without-selection'
type Input = {
  expectedRevision?: unknown
  applicationID?: unknown
  expectedApplicationRevision?: unknown
  confirmed?: unknown
  reason?: unknown
}

export async function decideOpportunity(
  req: PayloadRequest,
  id: number,
  action: DecisionAction,
  input: Input,
) {
  if (!managementPanel({ req }))
    throw new APIError('Acesso reservado à gestão autorizada.', 403)
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  )
    throw new APIError('Decisão inválida.', 400)
  if (input.confirmed !== true)
    throw new APIError('Confirme a decisão antes de continuar.', 400)
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  if (
    ['cancel', 'close-without-selection', 'selected-withdrawal'].includes(
      action,
    ) &&
    (!reason || reason.length > 2000)
  )
    throw new APIError(
      'Informe uma justificativa de até 2.000 caracteres.',
      400,
    )
  const started = await initTransaction(req)
  const previousContext = { ...req.context }
  try {
    await lockOpportunity(req, id)
    let opportunity = await req.payload.findByID({
      collection: 'opportunities',
      id,
      req,
      overrideAccess: false,
      depth: 0,
    })
    if (
      !isAdministrator(req.user) &&
      relationID(opportunity.school) !== userSchool(req.user)
    )
      throw new APIError('Escola não autorizada.', 403)
    if ((opportunity.decisionRevision || 0) !== input.expectedRevision)
      throw new APIError(
        'A oportunidade foi alterada por outra decisão. Atualize a página antes de continuar.',
        409,
      )
    if (
      !opportunity.publishedAt ||
      ['DRAFT', 'CANCELLED', 'CLOSED_WITHOUT_SELECTION'].includes(
        opportunity.status,
      )
    )
      throw new APIError(
        'Esta ação não está disponível para a situação atual.',
        409,
      )
    req.context.selectionAction = true
    req.context.applicationAction = true
    const now = new Date().toISOString()
    async function transition(
      status: Opportunity['status'],
      event: OpportunityEvent['action'],
      changes: Partial<Opportunity> = {},
      application?: number,
      motive?: string,
    ) {
      const before = opportunity.status
      opportunity = await req.payload.update({
        collection: 'opportunities',
        id,
        req,
        overrideAccess: false,
        depth: 0,
        data: {
          ...changes,
          status,
          decisionRevision: (opportunity.decisionRevision || 0) + 1,
        },
      })
      await req.payload.create({
        collection: 'opportunity-events',
        req,
        overrideAccess: true,
        data: {
          opportunity: id,
          school: relationID(opportunity.school)!,
          actor: req.user!.id,
          actorName: req.user!.name,
          action: event,
          previousStatus: before,
          nextStatus: status,
          revision: opportunity.decisionRevision!,
          application,
          reason: motive,
        },
      })
    }
    async function changeApplication(
      application: Application,
      status: Application['status'],
      event: ApplicationEvent['action'],
      motive?: string,
    ) {
      const doc = await req.payload.update({
        collection: 'applications',
        id: application.id,
        req,
        overrideAccess: true,
        depth: 0,
        data: {
          status,
          revision: application.revision + 1,
          decisionAt: now,
          decisionBy: req.user!.id,
        },
      })
      await recordApplicationEvent(req, doc, event, motive)
      return doc
    }
    const effectiveStatus = currentOpportunityStatus(opportunity)
    if (action === 'close') {
      if (opportunity.status !== 'OPEN')
        throw new APIError('As inscrições já foram encerradas.', 409)
      await transition(
        'UNDER_REVIEW',
        effectiveStatus === 'UNDER_REVIEW' ? 'deadline_closed' : 'close',
        { closedAt: now, closedBy: req.user!.id },
      )
    } else if (action === 'select') {
      if (effectiveStatus !== 'UNDER_REVIEW')
        throw new APIError(
          'A seleção exige inscrições encerradas e oportunidade em análise.',
          409,
        )
      const applicationID = relationID(input.applicationID)
      if (!applicationID)
        throw new APIError('Escolha um candidato desta oportunidade.', 400)
      const candidate = await req.payload.findByID({
        collection: 'applications',
        id: applicationID,
        req,
        overrideAccess: false,
        depth: 0,
      })
      if (
        relationID(candidate.opportunity) !== id ||
        !['SUBMITTED', 'NOT_SELECTED'].includes(candidate.status)
      )
        throw new APIError(
          'Candidatura indisponível para seleção nesta oportunidade.',
          409,
        )
      if (candidate.revision !== input.expectedApplicationRevision)
        throw new APIError(
          'A candidatura foi alterada. Atualize a página antes de selecionar.',
          409,
        )
      const account = await req.payload.findByID({
        collection: 'users',
        id: relationID(candidate.candidate)!,
        req,
        overrideAccess: true,
        depth: 0,
        select: { role: true, status: true },
      })
      if (account.status !== 'active' || account.role !== 'provider')
        throw new APIError(
          'A conta do candidato está indisponível para seleção.',
          409,
        )
      if (opportunity.status === 'OPEN')
        await transition('UNDER_REVIEW', 'deadline_closed', {
          closedAt: now,
          closedBy: req.user!.id,
        })
      const eligible = await req.payload.find({
        collection: 'applications',
        req,
        overrideAccess: false,
        depth: 0,
        pagination: false,
        where: {
          and: [
            { opportunity: { equals: id } },
            { status: { in: ['SUBMITTED', 'NOT_SELECTED'] } },
          ],
        },
      })
      await changeApplication(candidate, 'SELECTED', 'selected')
      for (const other of eligible.docs)
        if (other.id !== candidate.id && other.status !== 'NOT_SELECTED')
          await changeApplication(other, 'NOT_SELECTED', 'not_selected')
      await transition(
        'AWAITING_FORMALIZATION',
        'select',
        {
          selectedApplication: candidate.id,
          selectedAt: now,
          selectedBy: req.user!.id,
          resolutionReason: null,
        },
        candidate.id,
      )
    } else if (action === 'selected-withdrawal') {
      if (
        opportunity.status !== 'AWAITING_FORMALIZATION' ||
        !relationID(opportunity.selectedApplication)
      )
        throw new APIError(
          'Não há seleção vigente para registrar desistência.',
          409,
        )
      const selected = await req.payload.findByID({
        collection: 'applications',
        id: relationID(opportunity.selectedApplication)!,
        req,
        overrideAccess: false,
        depth: 0,
      })
      if (
        selected.status !== 'SELECTED' ||
        relationID(selected.opportunity) !== id
      )
        throw new APIError(
          'Seleção inconsistente. Procure a administração.',
          409,
        )
      await changeApplication(
        selected,
        'SELECTED_WITHDRAWN',
        'selection_withdrawn',
        reason,
      )
      await transition(
        'UNDER_REVIEW',
        'selected_withdrawal',
        {
          selectedApplication: null,
          selectedAt: null,
          selectedBy: null,
          resolutionReason: reason,
        },
        selected.id,
        reason,
      )
    } else if (action === 'cancel' || action === 'close-without-selection') {
      if (
        action === 'close-without-selection' &&
        effectiveStatus !== 'UNDER_REVIEW'
      )
        throw new APIError(
          'Encerre as inscrições antes de concluir sem seleção.',
          409,
        )
      if (action === 'close-without-selection' && opportunity.status === 'OPEN')
        await transition('UNDER_REVIEW', 'deadline_closed', {
          closedAt: now,
          closedBy: req.user!.id,
        })
      const active = await req.payload.find({
        collection: 'applications',
        req,
        overrideAccess: false,
        depth: 0,
        pagination: false,
        where: {
          and: [
            { opportunity: { equals: id } },
            { status: { in: ['SUBMITTED', 'NOT_SELECTED', 'SELECTED'] } },
          ],
        },
      })
      for (const application of active.docs) {
        const status = action === 'cancel' ? 'CANCELLED' : 'NOT_SELECTED'
        if (application.status !== status)
          await changeApplication(
            application,
            status,
            action === 'cancel' ? 'cancelled' : 'not_selected',
            reason,
          )
      }
      await transition(
        action === 'cancel' ? 'CANCELLED' : 'CLOSED_WITHOUT_SELECTION',
        action === 'cancel' ? 'cancel' : 'close_without_selection',
        {
          closedAt: opportunity.closedAt || now,
          closedBy: opportunity.closedBy || req.user!.id,
          selectedApplication: null,
          selectedAt: null,
          selectedBy: null,
          resolutionReason: reason,
        },
        undefined,
        reason,
      )
    } else throw new APIError('Decisão inválida.', 400)
    if (started) await commitTransaction(req)
    return opportunity
  } catch (error) {
    if (started) await killTransaction(req)
    throw error
  } finally {
    req.context = previousContext
  }
}

export function decisionEndpoint(action: DecisionAction) {
  return async (req: PayloadRequest) => {
    if (!managementPanel({ req }))
      throw new APIError('Acesso reservado à gestão autorizada.', 403)
    const doc = await decideOpportunity(
      req,
      Number(req.routeParams?.id),
      action,
      await req.json!(),
    )
    return Response.json(
      { doc },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
