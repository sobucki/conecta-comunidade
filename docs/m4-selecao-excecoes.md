# M4 Seleção e exceções

A implementação técnica do M4 permite encerrar inscrições, selecionar manualmente, registrar desistência do selecionado, reconsiderar candidatos existentes, cancelar e encerrar sem seleção. Cada decisão preserva responsável, data e histórico. A avaliação real do painel com a diretora permanece pendente em [M4.8](https://github.com/sobucki/conecta-comunidade/issues/29), junto das sessões de publicação e consulta de M2.7 e M3.7.

## Preparação local

Use o Node indicado em [.node-version](../.node-version), com Docker em execução. A primeira configuração está no [README](../README.md).

```sh
npm run services:up
npm run seed:dev
npm run dev
```

Se utilizar o runtime já instalado em `.tools`, execute antes `export PATH="$PWD/.tools/node_modules/node/bin:$PATH"` na raiz do projeto.

O seed prepara candidaturas de `prestador@conecta.test` e `prestadora@conecta.test` no reparo **Pintura do muro de entrada**, se continuar aberto, dentro do prazo e sem esses registros. Não reabre oportunidades nem desfaz decisões, retiradas ou alterações. As contas e a senha inicial estão no README.

Todos os percursos abaixo devem usar dados fictícios. Para repetir uma experiência já encerrada, crie e publique outra oportunidade.

## Seleção e desistência pelo painel

1. Entre em [localhost:3000/admin](http://localhost:3000/admin) com `diretora@conecta.test` e abra a oportunidade.
2. Use **Encerrar inscrições** e confirme. A oportunidade passa para análise, bloqueando envios, edições, retiradas e reenvios pelo prestador. Depois do prazo, a análise fica disponível sem depender de uma tarefa agendada; o painel oferece **Iniciar análise após o prazo**.
3. Use **Consultar candidatos**, abra uma candidatura enviada e confira perfil, contato, disponibilidade e condições aceitas.
4. Use **Selecionar candidato**. A confirmação identifica a pessoa e explica a atualização dos demais resultados. Descartar a confirmação não registra a escolha.
5. A oportunidade fica em **Seleção realizada, aguardando formalização externa**. Uma candidatura fica selecionada e as demais elegíveis ficam não selecionadas. Retiradas são preservadas.
6. Volte à oportunidade para consultar a candidatura selecionada e o **Histórico de decisões**, com responsável, data e justificativa quando aplicável.
7. Use **Registrar desistência do selecionado**, informe a justificativa e confirme. A candidatura anterior passa a **Desistência registrada** e a oportunidade volta para análise, mantendo as inscrições fechadas.
8. Selecione outra candidatura existente, inclusive anteriormente não selecionada. As escolhas anteriores continuam no histórico. Candidaturas retiradas ou com desistência registrada não são elegíveis para nova seleção neste fluxo.

As ações ficam indisponíveis com alterações do formulário ainda não salvas. Se outra decisão ou revisão da candidatura ocorrer enquanto a página estiver aberta, o servidor rejeita a operação e pede atualização. Contas bloqueadas não podem ser selecionadas.

## Encerramentos com justificativa

**Encerrar sem seleção** fica disponível durante a análise, após o prazo ou o encerramento antecipado. Exige justificativa mesmo sem candidatos. Com candidatos, as candidaturas elegíveis ficam não selecionadas; retiradas e desistências anteriores permanecem preservadas.

**Cancelar oportunidade** fica disponível para oportunidades publicadas ainda não encerradas de forma terminal, inclusive depois da seleção. Exige justificativa, desfaz uma seleção vigente e muda as candidaturas ainda participantes para canceladas. Decisões anteriores continuam no histórico.

As ações pedem confirmação e produzem situações distintas e terminais. Os links permanecem acessíveis com as condições públicas e a situação atual. Depois de receber candidaturas ou encerrar inscrições, as condições ficam protegidas, inclusive contra alteração de prazo para reabrir a participação. Mudanças exigem cancelamento e outra publicação, com outro link.

## Resultado e privacidade

Minhas candidaturas apresenta a situação e explica o resultado. A pessoa selecionada é informada de que a escolha aguarda formalização externa e não equivale a contratação. Após uma desistência, a interface explica a reconsideração dos candidatos existentes durante a análise. O acompanhamento continua pelo site, sem notificações automáticas.

As páginas públicas apresentam oportunidades abertas, em análise, com seleção realizada, canceladas ou encerradas sem seleção. A listagem da escola mostra somente oportunidades abertas dentro do prazo. Links antigos não expõem o selecionado, candidaturas, responsáveis por decisões ou justificativas administrativas. Fotos publicadas continuam seguindo a visibilidade dessas páginas.

Justificativas ficam restritas à gestão autorizada. O prestador consulta somente seus dados, resultados e histórico, sem motivos administrativos restritos ou identidades alheias. A gestora consulta somente a escola autorizada; o administrador mantém o acesso necessário à administração do piloto.

## Consistência e histórico

As ações validam papel, escola, confirmação, revisão e estado no servidor. A seleção exige candidatura elegível da própria oportunidade, com revisão atual, e inscrições encerradas. Quando o prazo expira, `currentStatus` e as interfaces apresentam análise, mesmo se o estado persistido ainda for `OPEN`. O servidor usa o relógio para bloquear participação. A primeira decisão registra e persiste o encerramento por prazo, na mesma transação quando seguida de seleção ou encerramento sem seleção.

A trava da linha da oportunidade serializa candidaturas, alterações e decisões. Seleção, demais resultados, oportunidade e eventos são gravados juntos. Uma falha na gravação do histórico reverte também as alterações anteriores daquela operação. Revisões impedem que confirmações em abas antigas substituam decisões recentes.

O índice único parcial `applications_one_selected_idx` impede duas candidaturas `SELECTED` na mesma oportunidade, como garantia adicional no PostgreSQL. Ele participa do esquema de desenvolvimento e das migrações.

`opportunity-events` preserva decisões, responsável, data, estados anterior e seguinte, candidatura relacionada e justificativa, com acesso apenas à gestão. `application-events` registra as mudanças de resultado nas revisões de cada candidatura; justificativas possuem controle separado e não integram o histórico entregue ao prestador. Alterações e exclusões genéricas dos históricos são negadas.

As ações usam `POST /api/opportunities/{id}/close`, `/select`, `/selected-withdrawal`, `/cancel` e `/close-without-selection`. Todas exigem gestão autenticada, `confirmed: true` e `expectedRevision`. Seleção também exige `applicationID` e `expectedApplicationRevision`; desistência, cancelamento e encerramento sem seleção exigem `reason`, com até 2.000 caracteres. Autenticação e proteção CSRF do Payload permanecem aplicáveis.

## Migrações e verificações

```sh
npm run typecheck
npm test
npm run build
```

Foram aprovados **44 testes de integração e 20 percursos de navegador**, incluindo M1 a M3, além da tipagem e do build de produção.

Os testes novos cobrem encerramento antecipado e por prazo, seleção única, demais resultados, retiradas, desistência e reconsideração, cancelamento e encerramento sem seleção. Também verificam confirmações ausentes, revisões antigas, candidatos de outra oportunidade, contas bloqueadas, permissões por escola, motivos restritos e imutabilidade do histórico.

Os testes concorrentes exercitam duas seleções e seleção contra cancelamento. Outro teste tenta violar o índice fora do serviço de decisão. Uma falha controlada na gravação final do histórico verifica o rollback conjunto da oportunidade, candidaturas e eventos. No navegador, o percurso móvel cobre confirmação descartada, escolha, desistência e reconsideração. A inspeção visual e os testes verificam os controles sem sobreposição aos campos em 390 px e 1280 px.

As migrações `20261124_125127_m4_estados` e `20261124_125128_m4_selecao_excecoes` separam os novos valores de enum da criação do índice parcial, pois o PostgreSQL exige commit antes de usar `SELECTED` no predicado. As cinco migrações do projeto foram aplicadas em banco vazio separado; as duas do M4 também foram revertidas e reaplicadas. O banco temporário foi removido após a conferência.

As reversões recusam a remoção de estrutura ou estados quando isso eliminaria decisões ou tornaria resultados existentes irrepresentáveis. O teste de reversão usa um banco temporário vazio. Desenvolvimento, testes e fotos continuam isolados conforme os marcos anteriores.

## Avaliação com a diretora

Use dados fictícios e o celular da diretora. Entregue apenas estes objetivos, sem orientação passo a passo na primeira tentativa:

- Publicar um reparo com valor, prazos, condições e foto, e localizar o link de divulgação.
- Encontrar candidatos e conferir contato, vínculo, disponibilidade e condições aceitas.
- Encerrar inscrições, selecionar, registrar desistência e escolher outro candidato existente.

Registrar aparelho, dificuldades, ajuda necessária e entendimento das confirmações, justificativas e diferença entre seleção e contratação.

- [ ] Publicou com foto e encontrou o link sem instruções passo a passo.
- [ ] Consultou os candidatos e distinguiu situações e dados relevantes.
- [ ] Encerrou as inscrições e confirmou uma seleção.
- [ ] Registrou desistência com justificativa e reconsiderou outro candidato.
- [ ] Entendeu os encerramentos e a formalização externa.
- [ ] Dificuldades observadas foram corrigidas e as tarefas repetidas após os ajustes.

Os testes técnicos preparam essa avaliação, mas não a substituem. M2.7, M3.7 e M4.8 continuam pendentes. O painel será aproveitado se as tarefas forem concluídas sem orientação passo a passo; dificuldades deverão ser resolvidas por adaptação ou interface própria antes da conclusão integral de M4.

## Próxima entrega

O M5 acrescentará indicadores agregados, validação institucional dos textos, termos e privacidade, definição do suporte e verificação dos percursos do piloto. Hostinger, calendário e disponibilidade da equipe continuam pendentes. A implementação local não ativa o piloto com participantes reais.
