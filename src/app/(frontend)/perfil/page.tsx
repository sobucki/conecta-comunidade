import { providerSession } from '@/accounts/session'
import { publicPayload } from '@/public/data'
import { ProfileForm } from '@/components/AccountForms'
import { ProviderNavigation } from '@/components/ProviderNavigation'

export const metadata = { robots: { index: false, follow: false } }

export default async function Profile() {
  const user = await providerSession('/perfil')
  const payload = await publicPayload()
  const categories = await payload.find({
    collection: 'categories',
    overrideAccess: false,
    pagination: false,
    depth: 0,
    sort: 'name',
  })
  // Passe ao cliente apenas os campos necessários ao formulário, sem sessões ou credenciais.
  const { id, name, email, phone, communityLink, skills, professionalSummary } =
    user
  return (
    <main id="conteudo" className="container account-page">
      <ProviderNavigation />
      <h1>Meu perfil</h1>
      <p>
        Seus dados de contato serão apresentados à direção nas candidaturas que
        você enviar.
      </p>
      <ProfileForm
        user={{
          id,
          name,
          email,
          phone,
          communityLink,
          skills,
          professionalSummary,
        }}
        categories={categories.docs}
      />
    </main>
  )
}
