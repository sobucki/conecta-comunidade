import { date, dateTime, money, responsibility } from '@/public/data'

export function AcceptedConditions({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const conditions = value as Record<string, unknown>
  return (
    <section className="accepted-conditions">
      <h2>Condições aceitas</h2>
      <dl className="conditions-list">
        <div>
          <dt>Valor total</dt>
          <dd>{money(Number(conditions.fixedAmount))}</dd>
        </div>
        <div>
          <dt>Materiais</dt>
          <dd>
            {responsibility(
              conditions.materialsResponsibility as
                'school' | 'provider' | 'shared',
            )}
          </dd>
        </div>
        <div>
          <dt>Ferramentas</dt>
          <dd>
            {responsibility(
              conditions.toolsResponsibility as
                'school' | 'provider' | 'shared',
            )}
          </dd>
        </div>
        <div>
          <dt>Prazo de candidatura</dt>
          <dd>{dateTime(String(conditions.applicationDeadline))} (Brasília)</dd>
        </div>
        <div>
          <dt>Execução prevista</dt>
          <dd>
            {date(String(conditions.executionStart))} a{' '}
            {date(String(conditions.executionEnd))}
          </dd>
        </div>
        <div>
          <dt>Local</dt>
          <dd>{String(conditions.location || '')}</dd>
        </div>
      </dl>
      <details>
        <summary>Ver escopo e demais condições</summary>
        <p className="preserve-lines">{String(conditions.description || '')}</p>
        {!!conditions.requirements && (
          <p className="preserve-lines">
            Requisitos: {String(conditions.requirements)}
          </p>
        )}
        {!!conditions.notes && (
          <p className="preserve-lines">
            Outras condições: {String(conditions.notes)}
          </p>
        )}
      </details>
    </section>
  )
}
