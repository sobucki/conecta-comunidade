'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  currentOpportunityStatus,
  opportunityStatusLabel,
} from '@/selection/status'

type Opportunity = {
  id: number
  status: string
  applicationDeadline: string
  decisionRevision: number
}
export function SelectCandidate() {
  const { id, data } = useDocumentInfo()
  const router = useRouter()
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const opportunityID =
    typeof data?.opportunity === 'object'
      ? data.opportunity?.id
      : data?.opportunity
  useEffect(() => {
    let current = true
    if (opportunityID)
      fetch(`/api/opportunities/${opportunityID}?depth=0`)
        .then(async (response) => {
          if (!response.ok) throw new Error()
          const result = await response.json()
          if (current) setOpportunity(result)
        })
        .catch(() => {
          if (current)
            setMessage('Não foi possível consultar a situação da oportunidade.')
        })
    return () => {
      current = false
    }
  }, [opportunityID, data?.revision])
  if (!id || !opportunity)
    return (
      <p role="status">{message || 'Consultando situação da oportunidade…'}</p>
    )
  const eligible =
    ['SUBMITTED', 'NOT_SELECTED'].includes(String(data?.status)) &&
    currentOpportunityStatus(opportunity) === 'UNDER_REVIEW'
  async function select() {
    if (
      !window.confirm(
        `Selecionar ${data?.candidateName}? As demais candidaturas elegíveis serão marcadas como não selecionadas. A seleção aguarda formalização externa e não equivale a contratação.`,
      )
    )
      return
    setPending(true)
    setMessage('')
    try {
      const response = await fetch(
        `/api/opportunities/${opportunity!.id}/select`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmed: true,
            expectedRevision: opportunity!.decisionRevision || 0,
            applicationID: Number(id),
            expectedApplicationRevision: data?.revision,
          }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(
          result.errors?.[0]?.message || 'Não foi possível selecionar.',
        )
      setOpportunity(result.doc)
      setMessage('Candidato selecionado. Aguardando formalização externa.')
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
    <section className="decision-panel" aria-label="Seleção de candidato">
      <h3>{opportunityStatusLabel(opportunity)}</h3>
      {eligible && (
        <button
          type="button"
          className="btn btn--style-primary btn--size-medium"
          disabled={pending}
          onClick={select}
        >
          Selecionar candidato
        </button>
      )}
      {opportunity.status === 'OPEN' &&
        currentOpportunityStatus(opportunity) === 'OPEN' && (
          <p>
            Encerre as inscrições ou aguarde o prazo para selecionar um
            candidato.
          </p>
        )}
      {data?.status === 'SELECTED' && (
        <p>Este candidato está selecionado, aguardando formalização externa.</p>
      )}
      <p>
        <a href={`/admin/collections/opportunities/${opportunity.id}`}>
          Voltar à oportunidade e às decisões
        </a>
      </p>
      <p role="status">{pending ? 'Registrando seleção…' : message}</p>
    </section>
  )
}
