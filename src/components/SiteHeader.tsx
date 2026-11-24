import Link from 'next/link'

export function SiteHeader({
  name,
  schoolSlug,
  signedIn,
}: {
  name: string
  schoolSlug?: string
  signedIn?: boolean
}) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <span className="brand-symbol" aria-hidden="true">
            c<span>c</span>
          </span>
          <span>{name}</span>
        </Link>
        <nav aria-label="Navegação principal">
          {schoolSlug && (
            <Link href={`/escolas/${schoolSlug}`}>Oportunidades</Link>
          )}
          <Link href="/#sobre">Sobre o projeto</Link>
          <Link href={signedIn ? '/minhas-candidaturas' : '/entrar'}>
            {signedIn ? 'Minhas candidaturas' : 'Entrar'}
          </Link>
          <Link href="/admin" className="management-link">
            Área da gestão
          </Link>
        </nav>
      </div>
    </header>
  )
}
