import Link from 'next/link'
import {
  siteContent,
  mediaObject,
  openOpportunities,
  photoURL,
} from '@/public/data'
import { OpportunityCard } from '@/components/OpportunityCard'

export default async function Home() {
  const content = await siteContent()
  const school = typeof content.school === 'object' ? content.school : null
  const opportunities = school ? await openOpportunities(school.id, 3) : null
  const cover = mediaObject(content.coverImage)
  return (
    <main id="conteudo">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="small-square" /> Escola e comunidade, mais
              próximas
            </p>
            <h1>
              {content.headline ||
                'Sua habilidade pode fazer a diferença na escola.'}
            </h1>
            <p className="hero-intro">{content.introduction}</p>
            {school && (
              <Link
                className="button button-primary"
                href={`/escolas/${school.slug}`}
              >
                Conhecer as oportunidades
              </Link>
            )}
            <p className="hero-footnote">
              A consulta é livre. Conheça cada reparo e suas condições.
            </p>
          </div>
          <div className="hero-art">
            {cover ? (
              <img
                className="hero-image"
                src={photoURL(cover)}
                alt={cover.alt}
              />
            ) : (
              <div className="school-illustration" aria-hidden="true">
                <svg viewBox="0 0 440 340" fill="none">
                  <circle cx="226" cy="170" r="148" fill="#D7E8DD" />
                  <circle cx="345" cy="56" r="25" fill="#F0BD4E" />
                  <path d="M72 265H372" stroke="#194E3D" strokeWidth="4" />
                  <path
                    d="M122 143L220 78L319 143V264H122V143Z"
                    fill="#F6FCF7"
                    stroke="#194E3D"
                    strokeWidth="4"
                  />
                  <path
                    d="M103 151L220 72L337 151"
                    stroke="#194E3D"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path d="M198 203H242V264H198V203Z" fill="#194E3D" />
                  <path
                    d="M147 167H178V198H147V167ZM262 167H293V198H262V167Z"
                    fill="#E9B344"
                    stroke="#194E3D"
                    strokeWidth="3"
                  />
                  <path
                    d="M220 110V143M204 126H236"
                    stroke="#194E3D"
                    strokeWidth="4"
                  />
                  <path
                    d="M80 264V209M62 222L80 236L98 218M354 264V198M338 217L354 230L373 208"
                    stroke="#194E3D"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M55 186C25 146 66 120 80 158C95 113 132 150 104 184"
                    fill="#74A184"
                  />
                </svg>
              </div>
            )}
            <div className="art-caption">
              <span className="caption-icon" aria-hidden="true">
                ✳
              </span>
              <div>
                <strong>O que você sabe fazer tem valor.</strong>
                <span>Uma conexão pode transformar um espaço.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="opportunities-section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Encontre uma oportunidade</p>
            <h2>
              Pequenos reparos,
              <br />
              grandes possibilidades.
            </h2>
          </div>
          {school && (
            <Link className="inline-link" href={`/escolas/${school.slug}`}>
              Ver todas as oportunidades
            </Link>
          )}
        </div>
        {opportunities?.docs.length ? (
          <div className="cards-grid">
            {opportunities.docs.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Novas oportunidades estão a caminho.</h3>
            <p>
              Quando a escola publicar um reparo, você poderá conhecer os
              detalhes por aqui.
            </p>
          </div>
        )}
      </section>
      <section id="sobre" className="about-section">
        <div className="container about-grid">
          <div>
            <p className="eyebrow">Uma escola, muitas habilidades</p>
            <h2>
              Gente que se conhece.
              <br />
              Talentos que se encontram.
            </h2>
            <p>{content.about}</p>
            {school && (
              <p className="school-signature">
                Uma iniciativa na{' '}
                <Link href={`/escolas/${school.slug}`}>{school.name}</Link>.
              </p>
            )}
          </div>
          <div className="how-it-works">
            <div>
              <span>01</span>
              <section>
                <h3>Conheça a demanda</h3>
                <p>
                  Veja o que a escola precisa, o período de execução e o valor
                  oferecido.
                </p>
              </section>
            </div>
            <div>
              <span>02</span>
              <section>
                <h3>Confira as condições</h3>
                <p>
                  Saiba quem fornece os materiais e as ferramentas e quais
                  habilidades são necessárias.
                </p>
              </section>
            </div>
            <div>
              <span>03</span>
              <section>
                <h3>Faça a conexão circular</h3>
                <p>
                  Compartilhe a oportunidade com familiares e profissionais da
                  comunidade.
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
