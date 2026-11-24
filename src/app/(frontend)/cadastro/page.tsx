import { redirect } from 'next/navigation'
import { currentUser } from '@/accounts/session'
import { safeReturnPath } from '@/accounts/navigation'
import { AccessForm } from '@/components/AccountForms'

export const metadata = { robots: { index: false, follow: false } }

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const returnPath = safeReturnPath((await searchParams).next)
  const user = await currentUser()
  if (user) redirect(user.role === 'provider' ? returnPath : '/admin')
  return (
    <main id="conteudo" className="container account-page">
      <p className="eyebrow">Participe da comunidade</p>
      <h1>Crie sua conta</h1>
      <p>
        Cadastro para adultos. Você poderá complementar suas habilidades depois
        e se candidatar sem confirmar o e-mail.
      </p>
      <AccessForm register returnPath={returnPath} />
    </main>
  )
}
