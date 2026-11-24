# M3 Participação

A implementação técnica do M3 completa o percurso do prestador: cadastro, login, perfil, candidatura, edição, retirada, reenvio e acompanhamento no site. A diretora consulta os candidatos identificados pelo painel da sua escola. A avaliação dessa consulta com a diretora permanece pendente na issue [M3.7](https://github.com/sobucki/conecta-comunidade/issues/21).

## Como executar e testar

Use a versão de Node indicada em [.node-version](../.node-version), com Docker em execução. Para a primeira configuração, siga o [README](../README.md). Se estiver utilizando o runtime local já instalado em `.tools`, execute antes `export PATH="$PWD/.tools/node_modules/node/bin:$PATH"` na raiz do projeto.

```sh
npm run services:up
npm run seed:dev
npm run dev
```

Abra [localhost:3000](http://localhost:3000). Em uma oportunidade aberta, use **Quero me candidatar**. Entre com uma conta fictícia existente ou crie outra usando nome, e-mail, telefone e vínculo fictícios. O cadastro exige confirmação de maioridade, aceite dos termos e ciência do aviso de privacidade. A confirmação do e-mail não é exigida.

O cadastro ou login iniciado pelo link retorna à candidatura da oportunidade. Informe disponibilidade, opcionalmente apresentação e experiência, confira as condições e confirme a concordância antes de enviar. A página seguinte apresenta a situação, as condições aceitas e o histórico. Enquanto as inscrições estiverem abertas, experimente editar, retirar e reenviar; todos os eventos permanecem no mesmo registro.

Para testar o perfil, abra **Meu perfil** e altere nome, telefone, vínculo, habilidades ou apresentação profissional. O e-mail de acesso é exibido para consulta. As candidaturas anteriores preservam o perfil informado no envio ou na última edição; editar ou reenviar a candidatura registra os dados atuais e mantém as versões anteriores no histórico.

As contas de demonstração e a senha inicial estão descritas no README. O seed acrescenta uma candidatura fictícia de `prestador@conecta.test` à oportunidade **Pintura do muro de entrada**, se ela estiver aberta, dentro do prazo e ainda não tiver esse registro. Reexecutar o seed preserva candidaturas retiradas, alterações, histórico e senhas existentes.

| Área                           | Caminho                           |
| ------------------------------ | --------------------------------- |
| Cadastro público               | `/cadastro`                       |
| Login do prestador             | `/entrar`                         |
| Perfil                         | `/perfil`                         |
| Envio a uma oportunidade       | `/oportunidades/{id}/candidatar`  |
| Candidaturas próprias          | `/minhas-candidaturas`            |
| Detalhes e histórico próprio   | `/minhas-candidaturas/{id}`       |
| Consulta da direção            | `/admin/collections/applications` |
| Termos e aviso de demonstração | `/termos` e `/privacidade`        |

## Consulta pela diretora

Entre em [localhost:3000/admin](http://localhost:3000/admin) com `diretora@conecta.test`. Abra uma oportunidade e use **Consultar candidatos**, que leva à lista filtrada por oportunidade. Também é possível acessar Candidaturas pelo menu do painel.

Abra o nome do candidato para consultar telefone, e-mail, vínculo autodeclarado, habilidades, apresentação profissional, disponibilidade, condições aceitas e datas. Esses dados correspondem ao envio ou à última edição da candidatura. A consulta inclui candidaturas retiradas, identificadas pela situação, para preservar a participação anterior. Os registros são somente de leitura neste marco; a seleção e as demais decisões serão implementadas no M4.

O acesso da gestora está limitado às candidaturas de sua escola. O vínculo do candidato é uma autodeclaração para análise da direção; o painel não fornece um catálogo geral de usuários ou profissionais.

## Regras de participação

O cadastro público utiliza uma lista explícita de campos e sempre cria prestador ativo, associado à escola configurada no conteúdo do site. Papel, situação da conta, escola e data do aceite são definidos pelo servidor. A criação administrativa de contas continua restrita ao administrador.

O envio exige conta ativa de prestador, oportunidade publicada e aberta, prazo vigente, disponibilidade e concordância explícita. Apresentação e experiência são opcionais. São registrados o valor, escopo, local, categoria, fotos, responsabilidades, requisitos, observações e prazos aceitos, além da data da concordância.

Se as condições mudarem enquanto o interessado preenche a primeira candidatura, o servidor rejeita o envio e pede que ele recarregue a página, confira as condições e confirme novamente. O endereço de retorno após autenticação aceita somente os caminhos internos previstos para o prestador.

Cada par prestador e oportunidade possui um único registro permanente. A retirada muda sua situação para **Retirada**; o reenvio retorna a **Enviada**, com nova revisão e preservação do primeiro envio. Edição, retirada e reenvio exigem a revisão atual e são bloqueados após o prazo. Uma aba antiga ou requisição repetida não sobrescreve uma alteração mais recente.

Minhas candidaturas permite consultar somente os próprios registros. A direção autorizada e o administrador podem consultar os dados necessários à gestão; visitantes e outros prestadores não recebem candidaturas, histórico ou identidades de candidatos. As páginas públicas permanecem acessíveis para consulta e compartilhamento.

O participante acompanha o resultado no site. Não há notificações automáticas, pagamentos, envio de orçamentos ou integração com o WhatsApp. A recuperação de senha por e-mail permanece disponível.

## Condições protegidas e histórico

Após a primeira candidatura, as condições ficam protegidas mesmo que todas as candidaturas sejam retiradas. O bloqueio inclui título, descrição, categoria, local, valor, fotos, materiais, ferramentas, requisitos, observações e prazos. A gestão pode acrescentar **Correções de escrita**, exibidas separadamente na página pública, preservando as condições aceitas. Mudanças de condições exigem cancelamento e nova publicação, cujas ações pertencem ao M4.

A coleção `applications` guarda a candidatura atual e os dados informados no envio ou na última edição. A coleção `application-events` preserva as revisões, condições, dados informados, responsável e data de cada operação. Atualizações e exclusões genéricas dessas coleções são negadas; o prestador usa ações específicas.

As ações usam transações do Payload e bloqueiam a linha da oportunidade no PostgreSQL antes de consultar e alterar os dados relacionados. A edição de oportunidades usa a mesma trava antes de carregar o documento original. Assim, envios simultâneos e alterações concorrentes das condições observam as gravações anteriores. Índices únicos para prestador e oportunidade, e para candidatura e revisão, acrescentam garantias no banco. Candidatura e evento são gravados ou revertidos juntos.

As APIs específicas são `POST /api/users/register`, `GET /api/opportunities/{id}/conditions`, `POST /api/opportunities/{id}/apply` e `POST /api/applications/{id}/edit`, `/withdraw` e `/resubmit`. O envio, a edição e o reenvio recebem `availability`, `experience` opcional, `accepted: true` e o `conditionsToken` retornado com as condições atuais. Alterações de uma candidatura existente também exigem `expectedRevision`; a retirada precisa apenas da revisão. A autenticação e a proteção CSRF do Payload continuam aplicáveis.

## Verificações técnicas

```sh
npm run typecheck
npm test
npm run build
```

Foram aprovados **31 testes de integração e 15 percursos de navegador**, incluindo as verificações de M1 e M2. A tipagem e o build de produção também foram verificados.

Os testes novos cobrem cadastro sem concessão de privilégios, campos mínimos, retorno seguro após login, candidatura sem confirmação de e-mail, concordância e condições registradas, consulta própria e por escola, manutenção de histórico, prazo, duplicidades e reenvios simultâneos. Também verificam as duas ordens possíveis de concorrência entre primeira candidatura e edição das condições, além do rollback conjunto da candidatura e do evento.

No navegador foram exercitados o percurso completo do prestador pelo celular, a consulta identificada da diretora no painel, as proteções nas APIs, a necessidade de nova conferência após mudança das condições e a ausência de dados de candidatos nas páginas públicas. As telas foram verificadas com largura de 390 px; foram corrigidas a rolagem horizontal do cabeçalho da consulta e a apresentação das datas no painel.

A migração `20261124_123359_m3_participacao` acrescenta candidaturas, eventos, índices únicos e o campo de correções de escrita. As três migrações foram aplicadas em sequência em banco vazio separado; a reversão e a reaplicação da migração do M3 também foram verificadas. O banco temporário foi removido após a conferência. Desenvolvimento e testes continuam usando bancos e diretórios de fotos separados.

O teste de imagem deliberadamente corrompida do M2 continua produzindo um erro de decodificação esperado e verifica a rejeição do arquivo.

## Avaliação com a diretora

Use dados fictícios e entregue somente este objetivo: **encontrar os candidatos de uma oportunidade, identificar contato e vínculo de uma pessoa e conferir sua disponibilidade e concordância com as condições**.

O observador registra a primeira tentativa sem dar instruções passo a passo. A seção Consulta pela diretora serve como referência para o observador ou para uma nova tentativa depois do registro das dificuldades.

- [ ] Encontrou a lista da oportunidade correta.
- [ ] Abriu os dados do candidato sem confundir a lista com um catálogo geral.
- [ ] Localizou nome, telefone, vínculo e apresentação profissional.
- [ ] Localizou a disponibilidade e as condições aceitas.
- [ ] Diferenciou uma candidatura enviada de uma retirada.
- [ ] Conseguiu consultar pelo celular sem precisar de orientação passo a passo.

Registrar aparelho, dificuldades, ajuda necessária e ajustes propostos. A issue M3.7 permanece aberta até a realização dessa sessão e o registro dos resultados. A avaliação de publicação de M2.7 também continua pendente.

## Próxima entrega

O M4 acrescentará encerramento antecipado, seleção manual, resultados das demais candidaturas, desistência do selecionado, cancelamento e encerramento sem seleção. Termos, privacidade e canal de suporte precisam de validação institucional no M5 antes da ativação com dados reais. Detalhes da Hostinger, calendário e capacidade da equipe continuam em aberto.
