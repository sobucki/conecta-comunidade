'use client'
import { useField } from '@payloadcms/ui'

export function AcceptedConditionsField({ path }: { path: string }) {
  const { value } = useField<Record<string, unknown>>({ path })
  if (!value) return null
  const labels: Record<string, string> = {
    title: 'Serviço',
    description: 'Escopo',
    location: 'Local',
    fixedAmount: 'Valor total (R$)',
    applicationDeadline: 'Prazo de candidatura',
    executionStart: 'Execução a partir de',
    executionEnd: 'Execução até',
    materialsResponsibility: 'Materiais',
    toolsResponsibility: 'Ferramentas',
    requirements: 'Requisitos',
    notes: 'Outras condições',
  }
  const responsibility: Record<string, string> = {
    school: 'Escola',
    provider: 'Prestador',
    shared: 'Compartilhada',
  }
  return (
    <section style={{ marginBlock: '1rem 2rem' }}>
      <h3>Condições aceitas</h3>
      <dl>
        {Object.entries(labels)
          .filter(([key]) => value[key] != null && value[key] !== '')
          .map(([key, label]) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <dt>{label}</dt>
              <dd
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                {key.endsWith('Responsibility')
                  ? responsibility[String(value[key])]
                  : /Start|End|Deadline/.test(key)
                    ? new Date(String(value[key])).toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                      })
                    : String(value[key])}
              </dd>
            </div>
          ))}
      </dl>
    </section>
  )
}
