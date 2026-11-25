# conecta-comunidade

Aplicação web para conectar demandas de pequenos reparos de uma escola a prestadores adultos da comunidade.

## Desenvolvimento local

O M1 implementa a base de Next.js, TypeScript, Payload e PostgreSQL, com contas fictícias, permissões por papel e escola, bloqueio de acessos, histórico administrativo e recuperação de senha por e-mail local. O M2 acrescenta oportunidades com valor fixo e até três fotos, páginas públicas, conteúdo institucional editável e compartilhamento de links. O M3 completa cadastro público, login, perfil e candidaturas, com edição, retirada, reenvio, histórico e consulta restrita da direção.

O M4 acrescenta encerramento de inscrições, seleção manual, atualização dos demais resultados, desistência do selecionado, reconsideração, cancelamento e encerramento sem seleção, com histórico transacional e seleção única garantida no banco.

Requisitos: Node.js na versão indicada em [.node-version](.node-version), npm e Docker com Compose em execução.

```sh
npm ci
npm run dev:setup
npm run services:up
npm run seed:dev
npm run dev
```

- Aplicação: [localhost:3000](http://localhost:3000).
- Painel de gestão: [localhost:3000/admin](http://localhost:3000/admin).
- E-mails capturados pelo Mailpit: [localhost:8025](http://localhost:8025).

O comando `dev:setup` gera `.env` com segredos locais aleatórios e preserva um arquivo existente. As contas fictícias são `admin@conecta.test`, `diretora@conecta.test`, `prestador@conecta.test` e `prestadora@conecta.test`. A senha inicial está em `DEMO_PASSWORD` no seu `.env`. O seed é idempotente e não redefine senhas ou alterações de contas existentes.

O banco de desenvolvimento é `conecta_dev`; os testes usam exclusivamente `conecta_test`. Ambos são locais. O Mailpit captura os e-mails, permitindo exercitar a recuperação de acesso sem entrega a destinatários externos. Prestadores podem se cadastrar pelo site e se candidatar sem confirmar o e-mail. O seed prepara três oportunidades fictícias em [Escola Demonstração](http://localhost:3000/escolas/escola-demonstracao) e duas candidaturas de exemplo no reparo do muro, quando aberto e dentro do prazo.

Para publicar, a gestora abre Oportunidades no painel, preenche as condições, salva o rascunho, adiciona até três fotos e confirma Publicar oportunidade. A rotina e o roteiro de avaliação estão em [M2 Publicação e divulgação](docs/m2-publicacao-divulgacao.md).

Para participar, abra uma oportunidade e use Quero me candidatar. O cadastro ou login retorna à oportunidade; depois do envio, Minhas candidaturas permite editar, retirar e reenviar enquanto as inscrições estiverem abertas. Na oportunidade do painel, Consultar candidatos apresenta os dados autorizados à diretora. O percurso completo e o roteiro de avaliação estão em [M3 Participação](docs/m3-participacao.md).

Para selecionar, encerre as inscrições no painel, consulte os candidatos e confirme a escolha em uma candidatura elegível. O bloco de decisões da oportunidade reúne desistência, cancelamento, encerramento sem seleção e histórico. O roteiro está em [M4 Seleção e exceções](docs/m4-selecao-excecoes.md). A avaliação real com a diretora permanece pendente.

### Verificações

Com os serviços locais iniciados:

```sh
npx playwright install chromium
npm run typecheck
npm test
npm run build
```

`npm test` executa integração e navegador em sequência. O Playwright inicia e encerra sua própria aplicação na porta 3100, utilizando `.next-test` e o banco de testes. O desenvolvimento na porta 3000 usa `.next` e seu próprio banco.

Os testes verificam permissões reais, isolamento por escola, proteção de campos administrativos, bloqueio de sessões existentes, seed idempotente, recuperação de senha via SMTP, publicação e candidaturas. As garantias de participação incluem unicidade sob concorrência, histórico transacional e proteção das condições após a primeira candidatura.

## Documentação

- [Visão, escopo e requisitos](conecta-comunidade-requisitos.md).
- [Plano de desenvolvimento](conecta-comunidade-plano-desenvolvimento.md): decisões consolidadas para o MVP, arquitetura, entregas, critérios de aceite e pendências de infraestrutura.
- [Roadmap de desenvolvimento](conecta-comunidade-roadmap.md): sequência dos marcos, tarefas, dependências e critérios de conclusão.
- [M1 Base e acessos](docs/m1-base-acessos.md): configuração local, modelo inicial, permissões, migração e verificações realizadas.
- [M2 Publicação e divulgação](docs/m2-publicacao-divulgacao.md): páginas públicas, oportunidades, fotos, compartilhamento e roteiro de avaliação com a diretora.
- [M3 Participação](docs/m3-participacao.md): cadastro, perfil, candidaturas, histórico, concorrência e consulta identificada pela diretora.
- [M4 Seleção e exceções](docs/m4-selecao-excecoes.md): encerramento, seleção, desistência, reconsideração, privacidade e avaliação do painel.

## Preparação do piloto

O M5 acrescenta os indicadores em `/admin/globals/pilot-dashboard` e configuração institucional em Conteúdo do site. O canal de suporte informado é `sobucki@gmail.com`, configurado no banco local. Responsável nominal, termos, privacidade, retenção e avaliação real com a diretora continuam pendentes. Consulte [M5 Preparação do piloto](docs/m5-preparacao-piloto.md) para operação, convenções de contagem e pendências para M6.


## Implantação e ativação (M6)

A homologação privada está implantada na VPS Hostinger KVM 2 (`ssh masque-vps`), em `/home/deploy/conecta-comunidade`, projeto Docker `conecta-staging`. O endereço [redeconectacomunidade.com.br](https://redeconectacomunidade.com.br) usa HTTPS e exige uma senha de acesso à homologação. O piloto ainda não está ativado para participantes reais. Banco e fotos são exclusivos da homologação; os serviços existentes da VPS continuam em seu projeto separado.

Foram preparados imagem Docker, configuração de produção, bootstrap administrativo, migrações explícitas, verificação HTTP e backup/restauração com validação de hashes. O ensaio na VPS restaurou banco e fotos em outro destino vazio e conferiu o resultado da seleção e o histórico. O SMTP Hostinger foi configurado em 25/11/2026 e a aplicação enviou uma recuperação de senha para a caixa de teste autorizada. O usuário confirmou recebimento, redefinição e login em 25/11/2026. Cópia externa, rotina diária de backup e validações institucionais permanecem pendentes.

Consulte [M6 Implantação e ativação](docs/m6-implantacao-ativacao.md) antes de operar a VPS. Para verificar a configuração local: `npm run test:deploy`. O guia inclui os comandos de instalação, recuperação e os critérios para ativar o piloto.

Para acessar a homologação privada, mantenha `ssh -o ExitOnForwardFailure=yes -N -L 127.0.0.1:3200:127.0.0.1:3200 masque-vps` aberto e visite [localhost:3200](http://localhost:3200) ou [painel](http://localhost:3200/admin). O guia do M6 explica como consultar a senha fictícia do administrador e reiniciar o ambiente com o complemento de loopback.

No domínio, a primeira tela de autenticação usa o usuário `homologacao`. Consulte sua senha por `ssh masque-vps 'cat /home/deploy/conecta-comunidade/.access.homologacao'`. O painel `/admin` usa a conta `admin@conecta.test`, com a senha fictícia já existente. O acesso por SSH continua disponível.

O SMTP usa `smtp.hostinger.com:465` com TLS e remetente `acesso@redeconectacomunidade.com.br`. As credenciais ficam exclusivamente em `.env.smtp` na VPS (0600), carregadas por `deploy/compose.smtp.yaml` em formato raw. Inclua esse complemento ao recriar os serviços, conforme o guia do M6. O teste de e-mail da Hostinger termina em 24/12/2026, com renovação automática desativada.
