import { redirect } from 'next/navigation'
import { currentUser } from '@/accounts/session'
import { safeReturnPath } from '@/accounts/navigation'
import { AccessForm } from '@/components/AccountForms'

export const metadata = { robots: { index: false, follow: false } }

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const returnPath = safeReturnPath((await searchParams).next)
  const user = await currentUser()
  if (user) redirect(user.role === 'provider' ? returnPath : '/admin')
  return (
    <main id="conteudo" className="container account-page">
      <p className="eyebrow">Área do prestador</p>
      <h1>Entre para participar</h1>
      <p>Acesse sua conta para se candidatar e acompanhar suas candidaturas.</p>
      <AccessForm returnPath={returnPath} />
    </main>
  )
}
