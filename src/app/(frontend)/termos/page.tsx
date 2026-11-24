import { siteContent } from '@/public/data'
import Link from 'next/link'
export default async function Terms() {
  const content = await siteContent()
  if (content.contentApprovedAt && content.institutionalTerms)
    return (
      <main id="conteudo" className="container account-page">
        <h1>Termos de participação</h1>
        <p className="preserve-lines">{content.institutionalTerms}</p>
        <Link href="/suporte">Suporte e privacidade</Link>
      </main>
    )
  return (
    <main id="conteudo" className="container account-page">
      <h1>Termos de participação</h1>
      <p className="participation-note">
        Demonstração com dados fictícios. O conteúdo do piloto está sujeito à
        validação da instituição responsável antes do uso real.
      </p>
      <p>
        A participação é destinada a adultos com 18 anos ou mais. Informe dados
        corretos de contato e seu vínculo autodeclarado com a comunidade, sem
        nomes de alunos ou documentos pessoais.
      </p>
      <p>
        Ao enviar uma candidatura, informe sua disponibilidade e confirme a
        concordância com o valor total e as condições publicadas. Enquanto as
        inscrições estiverem abertas, você pode editar, retirar ou reenviar.
      </p>
      <p>
        A direção analisa as candidaturas e registra a seleção manualmente. A
        seleção aguarda formalização externa e não equivale a contratação. Não
        há pagamentos, transações ou envio de orçamentos nesta ferramenta.
      </p>
      <p>
        Acompanhe sua candidatura e o resultado no site. O compartilhamento pelo
        WhatsApp se limita ao link da oportunidade; não enviamos mensagens ou
        notificações automáticas.
      </p>
    </main>
  )
}
