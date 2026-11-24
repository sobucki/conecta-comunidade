import { ResetPasswordForm } from '@/components/RecoveryForms'

export const metadata = {
  title: 'Nova senha | Conecta Comunidade',
  robots: { index: false },
}

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <main id="conteudo" className="container account-page">
      <h1>Definir nova senha</h1>
      <p>Use uma senha com pelo menos 12 caracteres.</p>
      <ResetPasswordForm token={typeof token === 'string' ? token : ''} />
    </main>
  )
}
