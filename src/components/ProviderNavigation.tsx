import Link from 'next/link'
import { LogoutButton } from './AccountForms'
export function ProviderNavigation() {
  return (
    <nav className="provider-nav" aria-label="Área do prestador">
      <Link href="/minhas-candidaturas">Minhas candidaturas</Link>
      <Link href="/perfil">Meu perfil</Link>
      <LogoutButton />
    </nav>
  )
}
