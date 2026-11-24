'use client'
import { useState, useRef } from 'react'
export function PilotMetrics() {
  const container = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  async function query() {
    const inicio =
      container.current?.querySelector<HTMLInputElement>(
        '[name="inicio"]',
      )?.value
    const fim =
      container.current?.querySelector<HTMLInputElement>('[name="fim"]')?.value
    setPending(true)
    setMessage('')
    setData(null)
    try {
      const response = await fetch(
        `/api/pilot-metrics?inicio=${inicio}&fim=${fim}`,
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(
          result.errors?.[0]?.message || 'Não foi possível consultar.',
        )
      setData(result)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Não foi possível conectar.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="decision-panel">
      <h2>Indicadores do piloto</h2>
      <div ref={container}>
        <label>
          Início <input name="inicio" type="date" required />
        </label>{' '}
        <label>
          Fim <input name="fim" type="date" required />
        </label>{' '}
        <button disabled={pending} type="button" onClick={query}>
          {pending ? 'Consultando…' : 'Consultar indicadores'}
        </button>
      </div>
      <p role="status">{message}</p>
      {data && (
        <>
          <p>{String(data.scope)}</p>
          <dl>
            {[
              ['Prestadores cadastrados', data.registered],
              ['Prestadores participantes', data.participants],
              ['Oportunidades publicadas', data.published],
              ['Candidaturas recebidas (envios e reenvios)', data.submissions],
              [
                'Oportunidades com candidatos',
                data.percentage == null
                  ? 'Sem oportunidades no período'
                  : `${Number(data.percentage).toFixed(1)}% (${data.opportunities_with_candidates}/${data.published})`,
              ],
              [
                'Tempo médio até a primeira candidatura',
                data.average_seconds == null
                  ? 'Sem candidaturas na coorte'
                  : `${(Number(data.average_seconds) / 3600).toFixed(2)} horas`,
              ],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt>{String(label)}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
          <p>
            Primeiros envios: {String(data.first_submissions)}. Reenvios:{' '}
            {String(data.resubmissions)}.
          </p>
        </>
      )}
      <p>
        Dias completos no horário de Brasília. Participação conta eventos no
        período, inclusive reenvios. Percentual e tempo usam oportunidades
        publicadas no período e candidaturas recebidas até o fim dele. Sem
        oportunidades, o percentual não se aplica. Seleção não equivale a
        contratação ou renda gerada.
      </p>
    </section>
  )
}
