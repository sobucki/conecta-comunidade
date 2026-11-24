import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './styles.css'

export const metadata: Metadata = {
  title: 'Conecta Comunidade',
  description:
    'Conectando as necessidades da escola às habilidades da comunidade.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
