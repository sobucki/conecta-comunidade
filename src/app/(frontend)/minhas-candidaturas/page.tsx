import Link from 'next/link'
import { providerSession } from '@/accounts/session'
import { publicPayload, dateTime } from '@/public/data'
import { ProviderNavigation } from '@/components/ProviderNavigation'
import { applicationStatusLabels, applicationResult } from '@/selection/status'

export const metadata = { robots: { index: false, follow: false } }

export default async function MyApplications({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>
}) {
  const user = await providerSession('/minhas-candidaturas')
  const query = (await searchParams).pagina || '1'
  const page =
    /^[1-9]\d*$/.test(query) && Number.isSafeInteger(Number(query))
      ? Number(query)
      : 1
  const payload = await publicPayload()
  const results = await payload.find({
    collection: 'applications',
    user,
    overrideAccess: false,
    depth: 1,
    limit: 12,
    page,
    sort: '-updatedAt',
  })
  return (
    <main id="conteudo" className="container participation-page">
      <ProviderNavigation />
      <div className="page-intro">
        <p className="eyebrow">Área do prestador</p>
        <h1>Minhas candidaturas</h1>
        <p>
          Volte aqui para acompanhar a situação e o resultado. Não enviamos
          notificações automáticas.
        </p>
      </div>
      {results.docs.length ? (
        <div className="application-list">
          {results.docs.map((application) => {
            const opportunity =
              typeof application.opportunity === 'object'
                ? application.opportunity
                : null
            return (
              <article className="application-card" key={application.id}>
                <span
                  className={`status-badge ${application.status === 'SUBMITTED' ? 'status-open' : 'status-closed'}`}
                >
                  {applicationStatusLabels[application.status]}
                </span>
                <h2>
                  <Link href={`/minhas-candidaturas/${application.id}`}>
                    {opportunity?.title || 'Oportunidade'}
                  </Link>
                </h2>
                <p>Último envio em {dateTime(application.submittedAt)}</p>
                <p>{applicationResult(application, opportunity)}</p>
                <Link
                  className="inline-link"
                  href={`/minhas-candidaturas/${application.id}`}
                >
                  Acompanhar candidatura
                </Link>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Nenhuma candidatura por aqui</h2>
          <p>
            Consulte as oportunidades da escola e encontre um serviço em que
            você possa contribuir.
          </p>
          <Link className="button button-primary" href="/">
            Ver oportunidades
          </Link>
        </div>
      )}
      {results.totalPages > 1 && (
        <nav className="pagination" aria-label="Páginas de candidaturas">
          {results.hasPrevPage && (
            <Link href={`?pagina=${page - 1}`}>Anterior</Link>
          )}
          <span>
            Página {results.page} de {results.totalPages}
          </span>
          {results.hasNextPage && (
            <Link href={`?pagina=${page + 1}`}>Próxima</Link>
          )}
        </nav>
      )}
    </main>
  )
}
