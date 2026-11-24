'use client'
import { useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  currentOpportunityStatus,
  opportunityStatusLabel,
} from '@/selection/status'
import { DecisionHistory } from './DecisionHistory'

export function OpportunityDecisionControls() {
  const { id, data } = useDocumentInfo()
  const modified = useFormModified()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [reasonAction, setReasonAction] = useState<
    'cancel' | 'close-without-selection' | 'selected-withdrawal' | null
  >(null)
  const [reason, setReason] = useState('')
  if (!id || !data || data.status === 'DRAFT') return null
  const opportunity = {
    status: String(data.status),
    applicationDeadline: String(data.applicationDeadline),
  }
  const effective = currentOpportunityStatus(opportunity)
  const selected =
    typeof data.selectedApplication === 'object'
      ? data.selectedApplication?.id
      : data.selectedApplication
  const revision = Number(data.decisionRevision || 0)
  const finished = ['CANCELLED', 'CLOSED_WITHOUT_SELECTION'].includes(
    opportunity.status,
  )
  const actionLabels = {
    cancel: 'Confirmar cancelamento',
    'close-without-selection': 'Confirmar encerramento sem seleção',
    'selected-withdrawal': 'Confirmar desistência',
  }
  async function decide(action: string) {
    const question =
      action === 'close'
        ? 'Encerrar as inscrições e iniciar a análise? Novos envios, edições e reenvios serão bloqueados.'
        : action === 'selected-withdrawal'
          ? 'Registrar a desistência do selecionado? A oportunidade voltará para análise, mantendo as inscrições fechadas.'
          : action === 'cancel'
            ? 'Cancelar esta oportunidade? O link e o histórico serão preservados e esta decisão não poderá ser desfeita.'
            : 'Encerrar sem selecionar um candidato? O link e o histórico serão preservados e esta decisão não poderá ser desfeita.'
    if (!window.confirm(question)) return
    setPending(true)
    setMessage('')
    try {
      const response = await fetch(`/api/opportunities/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed: true,
          expectedRevision: revision,
          reason,
        }),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(
          result.errors?.[0]?.message ||
            'Não foi possível registrar a decisão.',
        )
      setReasonAction(null)
      setReason('')
      setMessage('Decisão registrada.')
      router.refresh()
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Não foi possível conectar.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="decision-panel" aria-label="Decisões da oportunidade">
      <h3>{opportunityStatusLabel(opportunity)}</h3>
      {opportunity.status === 'AWAITING_FORMALIZATION' && (
        <p>
          A seleção aguarda formalização externa e não equivale a contratação.{' '}
          {selected && (
            <a href={`/admin/collections/applications/${selected}`}>
              Consultar candidatura selecionada
            </a>
          )}
        </p>
      )}
      {!finished && (
        <div className="decision-actions">
          {opportunity.status === 'OPEN' && (
            <button
              type="button"
              className="btn btn--style-primary btn--size-medium"
              disabled={pending || modified}
              onClick={() => decide('close')}
            >
              {effective === 'UNDER_REVIEW'
                ? 'Iniciar análise após o prazo'
                : 'Encerrar inscrições'}
            </button>
          )}
          {effective === 'UNDER_REVIEW' && (
            <button
              type="button"
              className="btn btn--style-secondary btn--size-medium"
              disabled={pending || modified}
              onClick={() => {
                setReasonAction('close-without-selection')
                setReason('')
              }}
            >
              Encerrar sem seleção
            </button>
          )}
          {opportunity.status === 'AWAITING_FORMALIZATION' && (
            <button
              type="button"
              className="btn btn--style-secondary btn--size-medium"
              disabled={pending || modified}
              onClick={() => {
                setReasonAction('selected-withdrawal')
                setReason('')
              }}
            >
              Registrar desistência do selecionado
            </button>
          )}
          <button
            type="button"
            className="btn btn--style-secondary btn--size-medium"
            disabled={pending || modified}
            onClick={() => {
              setReasonAction('cancel')
              setReason('')
            }}
          >
            Cancelar oportunidade
          </button>
        </div>
      )}
      {modified && <p>Salve as alterações antes de registrar uma decisão.</p>}
      {reasonAction && (
        <div className="decision-reason-form">
          <label htmlFor="decision-reason">Justificativa administrativa</label>
          <textarea
            id="decision-reason"
            maxLength={2000}
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <p>A justificativa fica restrita à gestão autorizada.</p>
          <button
            type="button"
            className="btn btn--style-primary btn--size-medium"
            disabled={pending || modified || !reason.trim()}
            onClick={() => decide(reasonAction)}
          >
            {actionLabels[reasonAction]}
          </button>
          <button
            type="button"
            className="btn btn--style-secondary btn--size-medium"
            disabled={pending}
            onClick={() => setReasonAction(null)}
          >
            Voltar
          </button>
        </div>
      )}
      <p role="status">{pending ? 'Registrando decisão…' : message}</p>
      <DecisionHistory opportunityID={id} revision={revision} />
    </section>
  )
}
