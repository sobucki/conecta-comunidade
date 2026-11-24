import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="conteudo" className="container empty-state error-page">
      <p className="eyebrow">Página indisponível</p>
      <h1>Não encontramos esta página.</h1>
      <p>
        O link pode estar incorreto ou esta oportunidade ainda não foi
        publicada.
      </p>
      <Link href="/" className="button button-primary">
        Voltar ao início
      </Link>
    </main>
  )
}
