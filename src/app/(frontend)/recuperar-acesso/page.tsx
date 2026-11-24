import { ForgotPasswordForm } from '@/components/RecoveryForms'

export const metadata = {
  title: 'Recuperar acesso | Conecta Comunidade',
  robots: { index: false },
}

export default function RecoverAccess() {
  return (
    <main id="conteudo" className="container account-page">
      <h1>Recuperar acesso</h1>
      <p>Informe seu e-mail para receber um link e definir uma nova senha.</p>
      <ForgotPasswordForm />
    </main>
  )
}
