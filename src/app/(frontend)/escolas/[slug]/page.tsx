import { notFound } from 'next/navigation'
import Link from 'next/link'
import { openOpportunities, publicPayload } from '@/public/data'
import { OpportunityCard } from '@/components/OpportunityCard'
import { ShareLinks } from '@/components/ShareLinks'

export default async function SchoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ pagina?: string }>
}) {
  const { slug } = await params
  const query = await searchParams
  const page = Number(query.pagina || 1)
  if (!Number.isSafeInteger(page) || page < 1) notFound()
  const payload = await publicPayload()
  const result = await payload.find({
    collection: 'schools',
    overrideAccess: false,
    user: null,
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const school = result.docs[0]
  if (!school) notFound()
  const opportunities = await openOpportunities(school.id, 12, page)
  return (
    <main id="conteudo" className="school-page container">
      <nav className="breadcrumb" aria-label="Localização">
        <Link href="/">Início</Link>
        <span>/</span>
        <span>Escola</span>
      </nav>
      <div className="page-intro">
        <p className="eyebrow">Nossa comunidade escolar</p>
        <h1>{school.name}</h1>
        <p>{school.description}</p>
        <ShareLinks
          path={`/escolas/${school.slug}`}
          title={`Conheça as oportunidades da ${school.name}`}
          origin={process.env.APP_URL || 'http://localhost:3000'}
        />
      </div>
      <section aria-labelledby="opportunities-title">
        <div className="section-heading">
          <h2 id="opportunities-title">Oportunidades abertas</h2>
          <span>
            {opportunities.totalDocs}{' '}
            {opportunities.totalDocs === 1 ? 'oportunidade' : 'oportunidades'}
          </span>
        </div>
        {opportunities.docs.length ? (
          <div className="cards-grid">
            {opportunities.docs.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Nenhuma oportunidade aberta no momento.</h3>
            <p>Volte em breve para conhecer novas demandas da escola.</p>
          </div>
        )}
        {opportunities.totalPages > 1 && (
          <nav className="pagination" aria-label="Páginas de oportunidades">
            {opportunities.hasPrevPage && (
              <Link href={`/escolas/${slug}?pagina=${page - 1}`}>
                Página anterior
              </Link>
            )}
            <span>
              Página {page} de {opportunities.totalPages}
            </span>
            {opportunities.hasNextPage && (
              <Link href={`/escolas/${slug}?pagina=${page + 1}`}>
                Próxima página
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  )
}
