import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { providerSession } from '@/accounts/session'
import { publicPayload, isAccepting } from '@/public/data'
import { acceptedConditions, conditionsToken } from '@/participation/rules'
import { AcceptedConditions } from '@/components/AcceptedConditions'
import { ParticipationForm } from '@/components/ParticipationForm'
import { ProviderNavigation } from '@/components/ProviderNavigation'

export const metadata = { robots: { index: false, follow: false } }

export default async function Apply({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  const user = await providerSession(`/oportunidades/${id}/candidatar`)
  const payload = await publicPayload()
  const result = await payload.find({
    collection: 'opportunities',
    overrideAccess: false,
    user: null,
    where: { id: { equals: Number(id) } },
    limit: 1,
    depth: 0,
  })
  const opportunity = result.docs[0]
  if (!opportunity) notFound()
  const own = await payload.find({
    collection: 'applications',
    user,
    overrideAccess: false,
    where: { opportunity: { equals: opportunity.id } },
    limit: 1,
    depth: 0,
  })
  if (own.docs[0]) redirect(`/minhas-candidaturas/${own.docs[0].id}`)
  return (
    <main id="conteudo" className="container account-page participation-page">
      <ProviderNavigation />
      <p className="eyebrow">Candidatura</p>
      <h1>{opportunity.title}</h1>
      <Link href={`/oportunidades/${id}`}>Ver oportunidade completa</Link>
      <AcceptedConditions value={acceptedConditions(opportunity)} />
      {isAccepting(opportunity) ? (
        <>
          <p>
            Confira seu <Link href="/perfil">perfil e telefone de contato</Link>
            . A direção receberá os dados informados no envio.
          </p>
          <ParticipationForm
            opportunityID={opportunity.id}
            conditionsToken={conditionsToken(opportunity)}
          />
          <p className="field-help">
            Acompanhe o resultado no site. Não enviamos notificações
            automáticas.
          </p>
        </>
      ) : (
        <p className="participation-note">As inscrições estão encerradas.</p>
      )}
    </main>
  )
}
