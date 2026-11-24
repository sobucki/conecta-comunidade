export const opportunityStatusLabels = {
  DRAFT: 'Rascunho',
  OPEN: 'Inscrições abertas',
  UNDER_REVIEW: 'Inscrições encerradas, em análise',
  AWAITING_FORMALIZATION: 'Seleção realizada, aguardando formalização externa',
  CLOSED_WITHOUT_SELECTION: 'Encerrada sem seleção',
  CANCELLED: 'Oportunidade cancelada',
}
export const applicationStatusLabels = {
  SUBMITTED: 'Enviada',
  WITHDRAWN: 'Retirada',
  SELECTED: 'Selecionada',
  NOT_SELECTED: 'Não selecionada',
  SELECTED_WITHDRAWN: 'Desistência registrada',
  CANCELLED: 'Cancelada',
}
export const applicationEventLabels: Record<string, string> = {
  submit: 'Candidatura enviada',
  edit: 'Candidatura editada',
  withdraw: 'Candidatura retirada',
  resubmit: 'Candidatura reenviada',
  selected: 'Candidatura selecionada',
  not_selected: 'Candidatura não selecionada',
  selection_withdrawn: 'Desistência registrada pela direção',
  cancelled: 'Candidatura cancelada',
}
export const decisionLabels: Record<string, string> = {
  close: 'Inscrições encerradas pela direção',
  deadline_closed: 'Análise iniciada após o prazo',
  select: 'Candidato selecionado',
  selected_withdrawal: 'Desistência do selecionado registrada',
  cancel: 'Oportunidade cancelada',
  close_without_selection: 'Encerrada sem seleção',
}
export function currentOpportunityStatus(opportunity: {
  status: string
  applicationDeadline: string
}) {
  return opportunity.status === 'OPEN' &&
    Date.parse(opportunity.applicationDeadline) <= Date.now()
    ? 'UNDER_REVIEW'
    : opportunity.status
}
export function opportunityStatusLabel(opportunity: {
  status: string
  applicationDeadline: string
}) {
  const status = currentOpportunityStatus(opportunity)
  return (
    opportunityStatusLabels[status as keyof typeof opportunityStatusLabels] ||
    status
  )
}
export function applicationResult(
  application: { status: string },
  opportunity?: { status: string; applicationDeadline: string } | null,
) {
  if (application.status === 'SELECTED')
    return 'Você foi selecionado. A seleção aguarda formalização externa e não equivale a contratação.'
  if (application.status === 'SELECTED_WITHDRAWN')
    return 'A direção registrou a desistência da seleção anterior. As inscrições continuam encerradas.'
  if (application.status === 'WITHDRAWN')
    return 'Sua candidatura foi retirada. O histórico da participação foi preservado.'
  if (opportunity?.status === 'CANCELLED' || application.status === 'CANCELLED')
    return 'A oportunidade foi cancelada pela direção.'
  if (opportunity?.status === 'CLOSED_WITHOUT_SELECTION')
    return 'A direção encerrou esta oportunidade sem selecionar um candidato.'
  if (opportunity && currentOpportunityStatus(opportunity) === 'UNDER_REVIEW')
    return 'A oportunidade está em análise. Candidatos existentes podem ser reconsiderados; acompanhe a decisão por aqui.'
  if (application.status === 'NOT_SELECTED')
    return 'Sua candidatura não foi selecionada nesta decisão.'
  return 'Sua candidatura foi recebida. Acompanhe a decisão por aqui; não enviamos notificações automáticas.'
}
