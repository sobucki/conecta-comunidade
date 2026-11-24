import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  date,
  dateTime,
  isAccepting,
  mediaObject,
  money,
  photoURL,
  publicPayload,
  responsibility,
} from '@/public/data'
import { ShareLinks } from '@/components/ShareLinks'

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawID } = await params
  if (!/^\d+$/.test(rawID)) notFound()
  const id = Number(rawID)
  if (!Number.isSafeInteger(id) || id < 1) notFound()
  const payload = await publicPayload()
  const result = await payload.find({
    collection: 'opportunities',
    overrideAccess: false,
    user: null,
    depth: 1,
    where: { id: { equals: id } },
    limit: 1,
  })
  const opportunity = result.docs[0]
  if (!opportunity) notFound()
  const school =
    typeof opportunity.school === 'object' ? opportunity.school : null
  const category =
    typeof opportunity.category === 'object'
      ? opportunity.category.name
      : 'Reparo escolar'
  const photos = (opportunity.photos || [])
    .map(mediaObject)
    .filter((photo) => photo !== undefined)
  const accepting = isAccepting(opportunity)
  return (
    <main id="conteudo" className="detail-page container">
      <nav className="breadcrumb" aria-label="Localização">
        <Link href="/">Início</Link>
        <span>/</span>
        {school && <Link href={`/escolas/${school.slug}`}>{school.name}</Link>}
        <span>/</span>
        <span>Oportunidade</span>
      </nav>
      <div className="detail-grid">
        <article>
          <div className="detail-heading">
            <span className="category-label">{category}</span>
            <span
              className={`status-badge ${accepting ? 'status-open' : 'status-closed'}`}
            >
              {accepting ? 'Inscrições abertas' : 'Inscrições encerradas'}
            </span>
            <h1>{opportunity.title}</h1>
            <p className="location-line">
              {school?.name} · {opportunity.location}
            </p>
          </div>
          {photos.length > 0 && (
            <div className={`photo-gallery photos-${photos.length}`}>
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photoURL(photo)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img src={photoURL(photo)} alt={photo.alt} loading="lazy" />
                </a>
              ))}
            </div>
          )}
          <section className="detail-section">
            <h2>Sobre o serviço</h2>
            <p className="preserve-lines">{opportunity.description}</p>
          </section>
          <section className="detail-section">
            <h2>Materiais e ferramentas</h2>
            <dl className="responsibilities">
              <div>
                <dt>Materiais</dt>
                <dd>{responsibility(opportunity.materialsResponsibility)}</dd>
              </div>
              <div>
                <dt>Ferramentas</dt>
                <dd>{responsibility(opportunity.toolsResponsibility)}</dd>
              </div>
            </dl>
          </section>
          {opportunity.requirements && (
            <section className="detail-section">
              <h2>O que é necessário</h2>
              <p className="preserve-lines">{opportunity.requirements}</p>
            </section>
          )}
          {opportunity.notes && (
            <section className="detail-section">
              <h2>Outras condições</h2>
              <p className="preserve-lines">{opportunity.notes}</p>
            </section>
          )}
        </article>
        <aside className="conditions-card">
          <p className="eyebrow">Valor oferecido pelo serviço</p>
          <strong className="detail-value">
            {money(opportunity.fixedAmount)}
          </strong>
          <p className="amount-note">
            Valor total para o escopo e as condições descritas.
          </p>
          <dl>
            <div>
              <dt>Candidaturas até</dt>
              <dd>
                {dateTime(opportunity.applicationDeadline)}{' '}
                <small>(horário de Brasília)</small>
              </dd>
            </div>
            <div>
              <dt>Período previsto de execução</dt>
              <dd>
                {date(opportunity.executionStart)} a{' '}
                {date(opportunity.executionEnd)}
              </dd>
            </div>
          </dl>
          <div className="participation-note">
            {accepting
              ? 'As candidaturas pelo site estarão disponíveis em breve. Compartilhe esta oportunidade com a comunidade.'
              : 'O prazo desta oportunidade terminou. Confira outras demandas da escola.'}
          </div>
          <ShareLinks
            path={`/oportunidades/${opportunity.id}`}
            title={`${opportunity.title} — ${school?.name || 'Conecta Comunidade'}`}
            origin={process.env.APP_URL || 'http://localhost:3000'}
          />
          {school && (
            <Link className="inline-link" href={`/escolas/${school.slug}`}>
              Ver outras oportunidades
            </Link>
          )}
        </aside>
      </div>
    </main>
  )
}
