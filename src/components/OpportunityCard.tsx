import Link from 'next/link'
import type { Opportunity } from '../payload-types'
import { date, mediaObject, money, photoURL } from '../public/data'

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const photo = mediaObject(opportunity.photos?.[0])
  const category =
    typeof opportunity.category === 'object'
      ? opportunity.category.name
      : 'Reparo escolar'
  return (
    <article className="opportunity-card">
      <Link
        className="card-photo"
        href={`/oportunidades/${opportunity.id}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {photo ? (
          <img src={photoURL(photo, 'thumbnail')} alt="" loading="lazy" />
        ) : (
          <div className="photo-placeholder">
            <span aria-hidden="true">✳</span>
            <span>{category}</span>
          </div>
        )}
      </Link>
      <div className="card-content">
        <span className="category-label">{category}</span>
        <h3>
          <Link href={`/oportunidades/${opportunity.id}`}>
            {opportunity.title}
          </Link>
        </h3>
        <p>
          {opportunity.description.length > 140
            ? `${opportunity.description.slice(0, 137)}…`
            : opportunity.description}
        </p>
        <div className="card-value">
          <strong>{money(opportunity.fixedAmount)}</strong>
          <span>Valor do serviço</span>
        </div>
        <div className="card-deadline">
          Candidaturas até {date(opportunity.applicationDeadline)}
        </div>
      </div>
    </article>
  )
}
