# M7 Avaliação e encerramento

**Relatório final da demonstração técnica para entrega acadêmica**  
**Data de conclusão: 25/11/2026**

## Resumo

O Conecta Comunidade foi desenvolvido para permitir que uma escola publique demandas de pequenos reparos, receba candidaturas e registre a seleção manual de um prestador. A entrega acadêmica apresenta o MVP implantado em uma VPS, com domínio HTTPS, autenticação por perfil, publicação com fotos, candidaturas, decisões rastreáveis e recuperação de senha por e-mail.

A avaliação foi realizada em homologação, com oportunidades e contas de teste. O usuário confirmou a execução do fluxo completo sem dificuldades e a recuperação de senha com recebimento da mensagem, redefinição e login. Esses resultados demonstram o funcionamento do percurso técnico avaliado. Adesão espontânea, utilidade para a direção e efeitos comunitários permanecem como questões de um piloto futuro.

Em 25/11/2026, o usuário decidiu concluir a entrega acadêmica como demonstração técnica e deixar o piloto escolar para uma etapa posterior. Este relatório registra os resultados, as limitações e essa decisão de encerramento do recorte acadêmico.

## Objetivo e escopo da entrega

O objetivo da demonstração foi verificar o percurso entre a publicação de uma oportunidade e o registro da seleção de um prestador, incluindo autenticação, candidaturas e recuperação de acesso. O MVP utiliza Next.js, TypeScript, Payload e PostgreSQL em uma aplicação, com permissões por papel e escola.

A escola da demonstração é fictícia. As oportunidades, disponibilidades e candidaturas foram utilizadas para testar o sistema. O teste de recuperação utilizou uma caixa real controlada pelo usuário para verificar o envio de e-mail; isso não representa participação de uma comunidade escolar.

Formalização, pagamentos e execução dos serviços permanecem externos ao MVP. A aplicação não mede visitas, alcance de compartilhamentos, renda, serviços concluídos ou fortalecimento de vínculos.

## Metodologia

A avaliação reuniu três tipos de evidência:

1. **Verificação técnica:** testes de regras, permissões e percursos documentados nos guias de M1 a M5; implantação e exercício do percurso HTTP de cadastro, publicação com imagem sintética, candidatura e seleção na VPS, registrados no [guia do M6](m6-implantacao-ativacao.md).
2. **Uso da homologação:** teste do fluxo completo pelo usuário, que relatou em 25/11/2026 não ter encontrado dificuldades. A recuperação de senha foi confirmada pelo mesmo usuário após receber o e-mail, redefinir a senha e entrar na aplicação.
3. **Consulta de indicadores:** extração dos seis indicadores implementados, com datas, horário, escopo e convenções registrados no [snapshot agregado](evidencias/m7-indicadores-homologacao-20261125.json). O arquivo não contém contatos ou identificadores de usuários.

Não houve observação de um piloto autorizado com a escola, entrevista com a diretora ou coleta de feedback da comunidade. A avaliação de uso contém o relato de uma pessoa, sem medição formal de tempo por tarefa ou escala padronizada de usabilidade.

## Resultados técnicos

| Percurso ou recurso | Evidência e resultado |
| --- | --- |
| Implantação e acesso | Aplicação disponível em domínio HTTPS, com acesso à homologação protegido por senha e login próprio para os papéis da aplicação. |
| Publicação | Criação de rascunho, publicação com foto e consulta da oportunidade exercitadas em homologação. |
| Participação | Cadastro, candidatura, acompanhamento e operações de manutenção cobertos pelos testes documentados; o usuário confirmou o fluxo completo sem dificuldades. |
| Decisão da escola | Consulta de candidatos e seleção manual exercitadas na VPS; decisões e histórico preservados. |
| Recuperação de senha | SMTP autenticado com TLS; usuário confirmou recebimento, redefinição e login no domínio HTTPS em 25/11/2026. |
| Persistência e restauração | Recriação da aplicação preservou registros e fotos; restauração em destino separado conferiu dados e hashes dos arquivos. A rotina diária e a cópia externa foram adiadas. |
| Suporte durante a preparação | A recusa de autenticação SMTP foi resolvida após a criação efetiva da caixa e a validação da credencial. Nenhum novo ajuste de interface foi solicitado no teste final do usuário. |

O relato registrado foi: “Consegui testar o fluxo completo sem dificuldades.” A avaliação com uma diretora real continua prevista para o piloto futuro.

## Indicadores da homologação

Janela de consulta: **24 a 25/11/2026**, com datas inclusivas no horário de Brasília. Extração em **25/11/2026 às 11:40:19**, durante o segundo dia da janela. Escopo administrativo: todas as escolas da homologação. A tabela corresponde ao snapshot preservado; novos testes posteriores não alteram os valores deste relatório.

| Indicador do MVP | Resultado na homologação | Interpretação |
| --- | --- | --- |
| Prestadores cadastrados | 2 contas de teste | Contas criadas na janela, incluindo a conta do teste de recuperação. |
| Prestadores participantes | 1 conta de teste | Conta distinta que enviou candidatura na janela. |
| Oportunidades publicadas | 2 oportunidades de teste | Publicações registradas na janela. |
| Candidaturas recebidas | 2 envios | Dois primeiros envios e nenhum reenvio na janela. |
| Oportunidades com candidatos | 100% (2 de 2) | As duas publicações receberam candidatura até a extração. |
| Tempo médio até a primeira candidatura | 46,52 segundos | Média nas duas oportunidades de teste com candidatura. |

As candidaturas foram feitas pela mesma conta em oportunidades diferentes. O login da conta utilizada na recuperação não conta, isoladamente, como participação. Retiradas, cancelamentos e desistências não apagam o histórico. As convenções completas estão no [guia do M5](m5-preparacao-piloto.md).

Os 100% de oportunidades com candidatos e o tempo curto refletem o uso controlado da demonstração. Não permitem estimar procura pelos serviços ou velocidade de resposta da comunidade. A janela retrospectiva dos testes não constitui um período de observação de um piloto escolar.

## Análise das hipóteses

As hipóteses vêm dos [requisitos](../conecta-comunidade-requisitos.md), com o recorte de avaliação do [plano de desenvolvimento](../conecta-comunidade-plano-desenvolvimento.md).

| Hipótese | Conclusão possível nesta entrega |
| --- | --- |
| H1 Divulgação nos canais da escola gera adesão espontânea | Não avaliada. Os cadastros e candidaturas de teste não demonstram adesão espontânea nem efeito dos canais de divulgação. |
| H2 Há habilidades profissionais desconhecidas pela direção | Não avaliada. Depende de participantes reais e da percepção da diretora. |
| H3 A ferramenta facilita identificar prestadores | Consulta e seleção funcionaram na demonstração. A melhoria do processo institucional depende de avaliação com a escola. |
| H4 A participação pode fortalecer vínculos comunitários | Não avaliada. A existência de candidaturas não comprova esse efeito. |
| H5 A aplicação pode ser utilizada com baixa dificuldade digital | Há um relato preliminar favorável de uma pessoa. Não é suficiente para generalizar a facilidade de uso aos públicos do projeto. |

## Limitações

Os registros de teste foram produzidos em um ambiente controlado, sem recrutamento de participantes da escola. A amostra pequena e a atuação do usuário em diferentes papéis limitam a avaliação de usabilidade e não permitem inferir adoção, confiança ou impacto social.

Não foram realizadas entrevistas com a direção, aplicação de questionários ou comparação com o processo atual da escola. A extração inclui um dia ainda em curso e representa somente o estado dos indicadores no horário registrado. Também não houve contratação ou acompanhamento da execução dos serviços no âmbito desta demonstração.

A rotina diária de backup, a cópia externa, a validação institucional dos textos e a definição de responsáveis pelo piloto permanecem adiadas no M6. A entrega acadêmica não comprova que essas condições operacionais e institucionais foram atendidas.

## Decisão de encerramento da entrega acadêmica

| Item | Decisão registrada em 25/11/2026 |
| --- | --- |
| Responsável pela decisão de escopo | Usuário solicitante do projeto, conforme instrução registrada nesta conversa. Não representa autorização de uma escola ou aprovação da banca. |
| Formato da entrega | Demonstração técnica do MVP implantado, acompanhada deste relatório e do snapshot agregado de indicadores. |
| Situação do M7 neste recorte | Concluído como avaliação e consolidação da demonstração técnica para entrega acadêmica. |
| Piloto com a escola | Adiado para etapa futura. Nenhuma instituição foi cadastrada como autorizante nem houve ativação para participantes reais. |
| Ambiente para apresentação | Manter a homologação protegida já existente para demonstração. A senha inicial do ambiente e os logins por perfil continuam ativos. |
| Registros da demonstração | Mantidos na homologação para apresentação e reprodução dos testes. Não foram apagados dados, redefinidas senhas de usuários ou publicados contatos neste relatório. |
| Encerramento da infraestrutura | Não solicitado. Data de desligamento e descarte dos registros de teste não definida; qualquer alteração operacional deve ser decidida separadamente. |
| Continuidade do e-mail | O teste Hostinger termina em 24/12/2026, com renovação automática desativada. Manutenção, migração ou desativação do envio devem ser decididas antes do término. |

O encerramento aqui registrado se refere à entrega acadêmica no formato escolhido. Não encerra um experimento escolar que ainda não ocorreu nem altera as pendências de ativação do M6.

## Roteiro de apresentação

1. Apresentar o problema proposto e o recorte do MVP: publicação, participação e seleção, com formalização externa.
2. Acessar a homologação e, como diretora de teste, criar e publicar uma oportunidade fictícia com valor, condições, prazo e foto.
3. Em outra sessão, demonstrar o acesso de prestador pelo site, a candidatura e a consulta em Minhas candidaturas.
4. Voltar à gestão, encerrar as inscrições, consultar o candidato e registrar a seleção; mostrar o resultado e o histórico.
5. Explicar a recuperação de senha já validada e, se for repetida, usar uma caixa controlada pelo apresentador. Não exibir senhas ou tokens de recuperação.
6. Mostrar os indicadores e esclarecer que os números pertencem à homologação. Encerrar com as limitações e os requisitos para o piloto futuro.

A demonstração continua acessível em [redeconectacomunidade.com.br](https://redeconectacomunidade.com.br), mediante a proteção de homologação. Credenciais ficam nas instruções operacionais do projeto e não integram o relatório acadêmico.

## Trabalhos futuros

Para iniciar o piloto, será necessário identificar a escola e os responsáveis, obter as autorizações, validar termos, privacidade e retenção, definir suporte, aprovar oportunidades reais e concluir as condições operacionais do M6. O período de acompanhamento deverá ter início, fim e critério de corte definidos com a instituição.

A etapa futura poderá acompanhar cadastros, candidaturas e dificuldades e coletar feedback voluntário externo. A diretora deverá avaliar publicação com foto, consulta de candidatos e seleção sem orientação passo a passo. Os prestadores poderão relatar clareza das condições, facilidade de participação e acompanhamento do resultado. Os dados do piloto deverão ser separados dos registros desta demonstração.

## Conclusão

A entrega acadêmica demonstrou o funcionamento do percurso técnico do Conecta Comunidade até a seleção manual, com implantação HTTPS, permissões por perfil, registros de teste e recuperação de senha validada pelo usuário. Os indicadores e o relato de uso sustentam a apresentação do MVP como demonstração técnica funcional.

A avaliação de adesão e utilidade no contexto escolar permanece como trabalho futuro. O resultado desta entrega é o MVP demonstrável e sua avaliação técnica documentada, sem atribuir aos testes evidências de contratação, renda ou impacto comunitário.
