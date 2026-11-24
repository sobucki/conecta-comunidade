'use client'
import { useEffect, useState } from 'react'
import { decisionLabels } from '@/selection/status'

export function DecisionHistory({
  opportunityID,
  revision,
}: {
  opportunityID: number | string
  revision: number
}) {
  const [events, setEvents] = useState<
    {
      id: number
      action: string
      actorName: string
      createdAt: string
      reason?: string
    }[]
  >([])
  const [error, setError] = useState('')
  useEffect(() => {
    let current = true
    fetch(
      `/api/opportunity-events?where[opportunity][equals]=${opportunityID}&sort=-revision&limit=100&depth=0`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error()
        const result = await response.json()
        if (current) {
          setEvents(result.docs)
          setError('')
        }
      })
      .catch(() => {
        if (current)
          setError('Não foi possível carregar o histórico de decisões.')
      })
    return () => {
      current = false
    }
  }, [opportunityID, revision])
  if (!events.length && !error) return null
  return (
    <details className="decision-history">
      <summary>Histórico de decisões</summary>
      {error && <p role="status">{error}</p>}
      <ol>
        {events.map((event) => (
          <li key={event.id}>
            <strong>{decisionLabels[event.action]}</strong>
            <p>
              {event.actorName} ·{' '}
              {new Date(event.createdAt).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
              })}{' '}
              (Brasília)
            </p>
            {event.reason && (
              <p className="decision-reason">Justificativa: {event.reason}</p>
            )}
          </li>
        ))}
      </ol>
    </details>
  )
}
