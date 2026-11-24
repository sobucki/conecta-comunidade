import { siteContent } from '@/public/data'
export default async function Support() {
  const content = await siteContent()
  return (
    <main id="conteudo" className="container account-page">
      <h1>Suporte e privacidade</h1>
      {content.supportName && <p>Responsável: {content.supportName}</p>}
      {content.supportEmail ? (
        <p>
          Para dúvidas de acesso, dificuldades de participação ou solicitações
          sobre seus dados, escreva para{' '}
          <a href={`mailto:${content.supportEmail}`}>{content.supportEmail}</a>.
          Não envie senhas, documentos pessoais ou dados de alunos.
        </p>
      ) : (
        <p>
          O canal de atendimento ainda precisa ser definido pela instituição
          antes do início do piloto. Esta demonstração utiliza dados fictícios.
        </p>
      )}
      <p>
        O atendimento ocorre externamente. Consulte a situação de suas
        candidaturas no site; não enviamos notificações automáticas.
      </p>
    </main>
  )
}
