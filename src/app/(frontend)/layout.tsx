import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './styles.css'
import Link from 'next/link'
import { siteContent } from '@/public/data'
import { SiteHeader } from '@/components/SiteHeader'
import { currentUser } from '@/accounts/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Conecta Comunidade',
  description:
    'Conectando as necessidades da escola às habilidades da comunidade.',
}

export default async function Layout({ children }: { children: ReactNode }) {
  const content = await siteContent()
  const user = await currentUser()
  const school = typeof content.school === 'object' ? content.school : null
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <SiteHeader
          name={content.projectName || 'Conecta Comunidade'}
          schoolSlug={school?.slug}
          signedIn={user?.role === 'provider'}
        />
        {children}
        <footer className="site-footer">
          <div className="container footer-inner">
            <div>
              <strong>{content.projectName || 'Conecta Comunidade'}</strong>
              <p>Habilidades da comunidade. Cuidado com a escola.</p>
            </div>
            <nav aria-label="Links de apoio">
              <Link href="/recuperar-acesso">Recuperar acesso</Link>
              <Link href="/termos">Termos de participação</Link>
              <Link href="/privacidade">Privacidade</Link>
              <Link href="/admin">Área da gestão</Link>
            </nav>
            <span className="pilot-note">Projeto piloto escolar</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
