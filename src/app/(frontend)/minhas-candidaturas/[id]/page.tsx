import { notFound } from 'next/navigation'
import Link from 'next/link'
import { providerSession } from '@/accounts/session'
import { publicPayload, dateTime, isAccepting } from '@/public/data'
import { AcceptedConditions } from '@/components/AcceptedConditions'
import { ProviderNavigation } from '@/components/ProviderNavigation'
import { ParticipationForm } from '@/components/ParticipationForm'
import { conditionsToken } from '@/participation/rules'

const eventLabels: Record<string, string> = {
  submit: 'Candidatura enviada',
  edit: 'Candidatura editada',
  withdraw: 'Candidatura retirada',
  resubmit: 'Candidatura reenviada',
}
export const metadata = { robots: { index: false, follow: false } }

export default async function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  const user = await providerSession(`/minhas-candidaturas/${id}`)
  const payload = await publicPayload()
  const result = await payload.find({
    collection: 'applications',
    user,
    overrideAccess: false,
    depth: 1,
    where: { id: { equals: Number(id) } },
    limit: 1,
  })
  const application = result.docs[0]
  if (!application) notFound()
  const opportunity =
    typeof application.opportunity === 'object' ? application.opportunity : null
  const events = await payload.find({
    collection: 'application-events',
    user,
    overrideAccess: false,
    depth: 0,
    where: { application: { equals: application.id } },
    sort: '-revision',
    pagination: false,
  })
  return (
    <main id="conteudo" className="container account-page participation-page">
      <ProviderNavigation />
      <p className="eyebrow">Minha candidatura</p>
      <h1>{opportunity?.title || 'Oportunidade'}</h1>
      <p className="application-status">
        <strong>
          Situação:{' '}
          {application.status === 'SUBMITTED' ? 'Enviada' : 'Retirada'}
        </strong>
      </p>
      {opportunity && (
        <Link href={`/oportunidades/${opportunity.id}`}>Ver oportunidade</Link>
      )}
      <p>
        Concordância registrada em {dateTime(application.acceptedAt)}. Volte
        aqui para acompanhar a decisão da direção; não enviamos notificações
        automáticas.
      </p>
      <AcceptedConditions value={application.acceptedConditions} />
      <section>
        <h2>
          {application.status === 'WITHDRAWN'
            ? 'Reenviar candidatura'
            : 'Disponibilidade e apresentação'}
        </h2>
        {opportunity && isAccepting(opportunity) ? (
          <ParticipationForm
            key={`${application.id}-${application.revision}`}
            opportunityID={opportunity.id}
            conditionsToken={conditionsToken(opportunity)}
            application={{
              id: application.id,
              revision: application.revision,
              status: application.status,
              availability: application.availability,
              experience: application.experience,
            }}
          />
        ) : (
          <>
            <p className="participation-note">
              Inscrições encerradas. Não é mais possível editar, retirar ou
              reenviar pelo site.
            </p>
            <p className="preserve-lines">{application.availability}</p>
            {application.experience && (
              <p className="preserve-lines">{application.experience}</p>
            )}
          </>
        )}
      </section>
      <section className="application-history">
        <h2>Histórico da candidatura</h2>
        <ol>
          {events.docs.map((event) => {
            const snapshot =
              event.snapshot &&
              typeof event.snapshot === 'object' &&
              !Array.isArray(event.snapshot)
                ? event.snapshot
                : {}
            return (
              <li key={event.id}>
                <strong>{eventLabels[event.action]}</strong>
                <span>{dateTime(event.createdAt)}</span>
                <details>
                  <summary>Dados desta revisão</summary>
                  <p className="preserve-lines">
                    Disponibilidade: {String(snapshot.availability || '')}
                  </p>
                  {!!snapshot.experience && (
                    <p className="preserve-lines">
                      Apresentação: {String(snapshot.experience)}
                    </p>
                  )}
                  <AcceptedConditions value={snapshot.conditions} />
                </details>
              </li>
            )
          })}
        </ol>
      </section>
    </main>
  )
}
