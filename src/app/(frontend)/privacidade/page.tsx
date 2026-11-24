import { siteContent } from '@/public/data'
import Link from 'next/link'
export default async function Privacy() {
  const content = await siteContent()
  if (content.contentApprovedAt && content.institutionalPrivacy)
    return (
      <main id="conteudo" className="container account-page">
        <h1>Aviso de privacidade</h1>
        <p className="preserve-lines">{content.institutionalPrivacy}</p>
        <Link href="/suporte">Suporte e privacidade</Link>
      </main>
    )
  return (
    <main id="conteudo" className="container account-page">
      <h1>Aviso de privacidade</h1>
      <p className="participation-note">
        Demonstração com dados fictícios. Responsáveis, canal de atendimento e
        prazos de retenção serão definidos e validados com a instituição antes
        do piloto com participantes reais.
      </p>
      <p>
        O cadastro utiliza nome, e-mail, senha, telefone, vínculo comunitário
        autodeclarado, confirmação de maioridade e registro de aceite.
        Habilidades e apresentação profissional são opcionais.
      </p>
      <p>
        Nas candidaturas, registramos disponibilidade, experiência opcional,
        condições aceitas, datas e histórico. Seus dados e candidaturas ficam
        disponíveis a você e à gestão autorizada da escola para análise e
        administração do piloto. As páginas públicas não exibem identidades de
        candidatos.
      </p>
      <p>
        Não informe dados de alunos ou documentos pessoais. Seu e-mail é usado
        no acesso e na recuperação de senha; não há confirmação obrigatória do
        e-mail para se candidatar.
      </p>
      <p>
        A retirada preserva o histórico da participação. Solicitações de suporte
        e privacidade serão atendidas pelo responsável e canal definidos para o
        piloto.
      </p>
    </main>
  )
}
