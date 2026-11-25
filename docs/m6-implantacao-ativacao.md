# M6 Implantação e ativação

O marco está em execução. A VPS Hostinger KVM 2 foi acessada por `ssh masque-vps` em 24/11/2026: Linux x86_64, Docker e Compose disponíveis, 7,7 GiB de RAM (5,5 GiB disponíveis na inspeção) e 74 GB livres. Não há Node instalado no host; a imagem fornece Node 24.22.3. O servidor já executa outra aplicação, PostgreSQL 18 e Caddy nas portas 80/443. O Conecta usa outro projeto Compose e PostgreSQL 17, sem publicar diretamente as portas do banco e da aplicação na interface pública; o Caddy encaminha o domínio protegido para a homologação.

O domínio `redeconectacomunidade.com.br` e o HTTPS estão configurados e verificados. SMTP foi configurado e o envio de recuperação foi solicitado em 25/11/2026. Em 25/11/2026 o usuário confirmou recebimento, redefinição e login com a conta de teste; cobertura de backup externo e autorização institucional permanecem pendentes. Preparar infraestrutura ou exercitar restauração com dados fictícios não autoriza o piloto com dados reais.

## Acesso pelo domínio

Abra [redeconectacomunidade.com.br](https://redeconectacomunidade.com.br) ou [painel](https://redeconectacomunidade.com.br/admin). A autenticação inicial do navegador usa `homologacao`. Consulte a senha no seu terminal:

```sh
ssh masque-vps 'cat /home/deploy/conecta-comunidade/.access.homologacao'
```

Depois, o painel usa `admin@conecta.test` e a senha fictícia do administrador descrita na seção de SSH. São duas autenticações: a primeira restringe a homologação, a segunda controla as permissões na aplicação. Usar somente dados fictícios até a autorização do piloto.

Em 24/11/2026, o registro `A` de `@` foi ajustado no painel da Hostinger para `76.13.163.219`, TTL 300; o `CNAME` de `www` já apontava para `redeconectacomunidade.com.br` e foi preservado. Os nameservers são `aurora.dns-parking.com` e `nebula.dns-parking.com`. Ambos os servidores autoritativos e os resolvedores 1.1.1.1 e 8.8.8.8 confirmaram o apontamento. O registro inicialmente pendente foi ativado durante a configuração.

`deploy/compose.staging-domain.yaml` acrescenta `app-domain`, com origem HTTPS canônica e alias exclusivo `conecta-domain-app`. Essa instância e a de SSH compartilham somente o banco e as fotos fictícias da homologação. A instância do domínio desabilita a exceção `STAGING_SSH_ACCESS`; a de SSH mantém `localhost:3200` para testes privados. Não iniciar rotinas que escrevam nos dados durante cópias; o backup pausa e retoma **ambas** as instâncias, por IDs e rótulos do projeto, preservando suas configurações.

`deploy/Caddyfile.homologacao` foi incorporado ao proxy existente por `import /etc/caddy/conecta-homologacao.caddy`. O hash de acesso fica apenas em `/data/conecta-homologacao-auth.caddy`, no volume persistente do Caddy. A senha em texto fica somente no arquivo 0600 `.access.homologacao` da VPS. A configuração anterior do proxy foi copiada para `/home/deploy/conecta-config-backups` antes da validação e recarga. O outro site respondeu HTTP 200 após a recarga.

Verificações aprovadas: certificado TLS válido no domínio e no `www`, HTTP→HTTPS, `www`→domínio principal, recusa 401 sem senha de homologação, páginas autenticadas 200, login administrativo, cookie Secure e sessão autenticada no domínio. O cabeçalho `X-Robots-Tag` mantém a homologação fora da indexação. A configuração SMTP e o envio de recuperação estão registrados na seção abaixo; o usuário confirmou recebimento, redefinição e login; a autorização institucional continua pendente.

Para manter os dois acessos ao recriar os serviços:

```sh
cd /home/deploy/conecta-comunidade
export DEPLOY_ENV_FILE=/home/deploy/conecta-comunidade/.env.staging
docker compose --env-file .env.staging -p conecta-staging -f deploy/compose.production.yaml -f deploy/compose.staging-ssh.yaml -f deploy/compose.staging-domain.yaml -f deploy/compose.smtp.yaml up -d app app-domain
```

Não usar `--remove-orphans` com apenas o arquivo base: isso removeria a instância complementar por domínio. O backup de banco/fotos não inclui as configurações de proxy, o hash de acesso e os segredos de ambiente; estes também precisam de cópia externa protegida na política operacional.

## Acesso privado para testes

No computador que possui o alias SSH `masque-vps`, execute e mantenha o terminal aberto:

```sh
ssh -o ExitOnForwardFailure=yes -N -L 127.0.0.1:3200:127.0.0.1:3200 masque-vps
```

Abra [site de homologação](http://localhost:3200) e [painel administrativo](http://localhost:3200/admin). Use `localhost` e a porta 3200, pois a origem da aplicação foi configurada para esse endereço. O administrador fictício é `admin@conecta.test`. Consulte a senha somente no seu terminal:

```sh
ssh masque-vps 'sed -n "s/^INITIAL_ADMIN_PASSWORD=//p" /home/deploy/conecta-comunidade/.bootstrap.staging'
```

Use Ctrl+C no terminal do túnel para encerrar o acesso. A porta 3200 da VPS está vinculada somente a `127.0.0.1`; o acesso continua privado. O Chromium foi usado para conferir a página pública, o login e a sessão administrativa pelo túnel. Utilize dados fictícios; a configuração SMTP e o estado da validação estão descritos abaixo.

A homologação usa `.env.staging`, imagem `conecta-comunidade:m6-ssh` (digest `sha256:aca14169b8401a81650425172614acf118be46d65bdfd8e73e005fcceb9f9f1b`), `APP_URL=http://localhost:3200` e `STAGING_SSH_ACCESS=true`. A exceção ao HTTPS é aceita apenas para essa origem exata, host de banco `postgres` e banco `conecta_staging`; ela é recusada para a configuração pública do piloto. As demais verificações de produção permanecem aplicadas. Sete testes de configuração passaram, incluindo o isolamento dessa exceção.

Para recriar a homologação na VPS, incluir sempre o complemento de loopback:

```sh
cd /home/deploy/conecta-comunidade
export DEPLOY_ENV_FILE=/home/deploy/conecta-comunidade/.env.staging
docker compose --env-file .env.staging -p conecta-staging -f deploy/compose.production.yaml -f deploy/compose.staging-ssh.yaml -f deploy/compose.staging-domain.yaml -f deploy/compose.smtp.yaml up -d app app-domain
```

## SMTP e recuperação de senha — 25/11/2026

A caixa `acesso@redeconectacomunidade.com.br` está ativa na Hostinger. O usuário salvou a credencial com `scripts/deploy/store-smtp-password.py`; `.env.smtp` tem permissão 0600 e não é versionado. Servidor `smtp.hostinger.com`, porta 465, TLS direto, usuário e remetente iguais ao endereço da caixa. O teste gratuito permanece ativo até **24/12/2026**, com renovação automática desativada por solicitação do usuário. Definir continuidade do serviço antes dessa data.

`deploy/compose.smtp.yaml` deve ser o último complemento da configuração de homologação. O formato `raw` preserva caracteres especiais da senha sem interpolação do Compose. As instâncias `app` e `app-domain` receberam o SMTP; a origem da instância por domínio é `https://redeconectacomunidade.com.br`, de modo que os links de recuperação apontem para o endereço correto. O segredo não é incorporado à imagem. Incluir `.env.smtp` na cópia externa protegida das configurações.

Verificações: conexão TLS e autenticação aprovadas por `scripts/deploy/verify-smtp.mjs`; backup de banco e fotos antes da alteração em `/home/deploy/conecta-backups/staging/2026-11-25T14-24-06.863Z`; ambas as instâncias recriadas com os complementos; solicitação HTTPS real para `/api/users/forgot-password` concluída com HTTP 200, depois de confirmar a existência da conta. A validade do registro de recuperação foi conferida sem consultar ou exibir o token.

Para o teste autorizado, foi criada uma conta de **prestador**, identificada como Teste Recuperação de Senha, com o endereço `sobucki@gmail.com`, sem alterar contas existentes. O SMTP recebeu a solicitação da aplicação. **Validação confirmada pelo usuário em 25/11/2026:** recebeu a mensagem, redefiniu a senha pelo link e conseguiu entrar com `sobucki@gmail.com`. A posição da mensagem em Entrada/Spam não foi informada. A confirmação cobre o percurso de recuperação e autenticação no domínio; a avaliação com a diretora permanece pendente nos marcos anteriores. A senha inicial aleatória dessa conta não foi divulgada; a recuperação é o percurso de acesso previsto para o teste.

Para conferir somente a conexão e autenticação SMTP, sem enviar outra mensagem:

```sh
cd /home/deploy/conecta-comunidade
export DEPLOY_ENV_FILE=/home/deploy/conecta-comunidade/.env.staging
docker compose --env-file .env.staging -p conecta-staging -f deploy/compose.production.yaml -f deploy/compose.staging-ssh.yaml -f deploy/compose.staging-domain.yaml -f deploy/compose.smtp.yaml run --rm --no-deps -v /home/deploy/conecta-comunidade/scripts/deploy:/app/scripts/deploy:ro app-domain node scripts/deploy/verify-smtp.mjs
```

Se trocar a senha da caixa na Hostinger, executar novamente o helper de entrada oculta e recriar os serviços com todos os complementos. Não expor senhas ou links com tokens em logs, commits ou relatórios. A confirmação humana de recebimento, redefinição e login deste teste foi registrada acima.

## Arquivos e configuração

- `Dockerfile`: build em Linux com versões do lockfile, sem `.env`, mídia ou dados locais. A imagem inclui fontes, CLI e dependências de desenvolvimento para executar migrações e bootstrap sem outra instalação. Não é uma imagem standalone.
- `deploy/compose.production.yaml`: banco e app separados do desenvolvimento. Fotos e banco usam diretórios persistentes absolutos, distintos por ambiente. Não iniciar junto com `compose.yaml`.
- `deploy/Caddyfile`: bloco para integrar ao Caddy existente, sem ocupar novamente 80/443. A rede externa já disponível na VPS é `masquebarbaridade_default`.
- `.env.production.example`: contrato das variáveis; copiar para arquivo não versionado com permissão 0600. Segredo da aplicação e senha do banco devem ser novos e aleatórios. Codificar caracteres especiais da senha ao montar `DATABASE_URL`.

O `env_file` do app pode ser substituído por `DEPLOY_ENV_FILE` **absoluto**. Use também `--env-file` para a interpolação do Compose. `DEPLOY_PROJECT`, usado pelos scripts de armazenamento, deve corresponder ao `-p` dos demais comandos. `APP_NETWORK_ALIAS` deve ser exclusivo por ambiente para não conflitar com o piloto.

Antes de iniciar, criar o diretório das fotos com UID/GID 1000 e permissão 0700, e o diretório do banco separado. O PostgreSQL gerencia as permissões do próprio diretório. Nunca montar as fotos dentro de `public/` nem servi-las diretamente pelo Caddy: a rota do Payload verifica acesso inclusive a rascunhos.

`deploy:check` recusa segredos de exemplo, origem sem HTTPS, banco local de desenvolvimento/testes, seed fictício, SMTP incompleto e diretório de fotos sem escrita. A verificação não comprova DNS, entrega de e-mail, persistência ou autorização. SMTP usa TLS direto na porta 465 (`SMTP_SECURE=true`) ou exige STARTTLS nas demais (`SMTP_SECURE=false`) em produção.

## Primeira instalação

Na VPS, em `/home/deploy/conecta-comunidade`, com `.env.production` preenchido:

```sh
docker compose --env-file .env.production -p conecta-pilot -f deploy/compose.production.yaml build app
docker compose --env-file .env.production -p conecta-pilot -f deploy/compose.production.yaml up -d --wait postgres
docker compose --env-file .env.production -p conecta-pilot -f deploy/compose.production.yaml run --rm --no-deps app npm run deploy:check
docker compose --env-file .env.production -p conecta-pilot -f deploy/compose.production.yaml run --rm --no-deps app npm run db:migrate
```

Migrações são explícitas, sequenciais e anteriores à inicialização da versão nova. `push` fica desabilitado em produção. Não gerar migrações na VPS nem usar o seed de desenvolvimento. O bootstrap `deploy:admin` cria apenas o primeiro administrador em banco sem usuários; recusa reaplicação em instalação existente e não redefine senhas.

Fornecer `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME` e `INITIAL_ADMIN_PASSWORD` (mínimo 16 caracteres) por ambiente protegido do processo; nunca em argumentos, commits ou logs. Com as variáveis exportadas temporariamente no terminal:

```sh
docker compose --env-file .env.production -p conecta-pilot -f deploy/compose.production.yaml run --rm --no-deps -e INITIAL_ADMIN_EMAIL -e INITIAL_ADMIN_NAME -e INITIAL_ADMIN_PASSWORD app npm run deploy:admin
unset INITIAL_ADMIN_EMAIL INITIAL_ADMIN_NAME INITIAL_ADMIN_PASSWORD
docker compose --env-file .env.production -p conecta-pilot -f deploy/compose.production.yaml up -d app
```

Ao incorporar `deploy/Caddyfile` ao Caddy existente, substituir `{$DOMAIN}` pelo domínio literal confirmado: o proxy de outro projeto não lê o `.env` do Conecta. Só adicionar o bloco após confirmar DNS e validar a configuração completa com `caddy validate`. Fazer cópia da configuração anterior e recarregar o proxy sem reiniciar a outra aplicação. O upstream do novo bloco é `conecta-app:3000`, ou o alias exclusivo definido no ambiente. Não alterar as rotas existentes. Validar HTTPS público, redirecionamento de HTTP e acesso a `/admin`.

## Backup e restauração

A VPS não precisa de Node instalado: construir a imagem de operações, que fornece Node e Docker CLI. O wrapper Linux `storage.sh` monta código, arquivo de ambiente, destino das cópias e socket Docker com os mesmos caminhos absolutos do host. Ele roda com UID/GID do operador e grupo do socket; deve ser usado somente por quem já administra o Docker.

```sh
docker build --target operations -t conecta-operations:m6 .
BACKUP_DIR=/caminho/fora-da-instalacao/conecta sh scripts/deploy/storage.sh backup
sh scripts/deploy/storage.sh restore /caminho/do/backup
```

Em hosts com Node e Docker CLI disponíveis, também é possível usar `npm run deploy:backup` e `npm run deploy:restore -- /caminho/do/backup`. `DEPLOY_ENV_FILE` e `DEPLOY_PROJECT` selecionam ambientes alternativos nas duas formas.

O backup pausa as instâncias `app` e `app-domain` que estiverem ativas no projeto para copiar banco e fotos do mesmo intervalo sem escritas da aplicação, executa `pg_dump` em formato custom, arquiva as fotos e grava manifesto SHA-256. As instâncias anteriormente ativas voltam a iniciar no fim, inclusive em falha. Há uma breve indisponibilidade durante a cópia. Apenas diretórios renomeados ao final estão completos; diretórios `.partial` não são backups válidos. Não permitir outros processos escrevendo no banco ou nas fotos durante a operação.

Restauração confere hashes, exige app parado, banco sem tabelas e diretório de fotos vazio; não apaga bancos existentes. Usa `pg_restore --single-transaction --exit-on-error`. Banco e arquivos não formam uma única transação: se a extração falhar após restaurar o banco, manter o app parado e repetir em novos destinos vazios após corrigir a causa. O script nunca inicia o app restaurado automaticamente. Restaurar somente cópias confiáveis.

Para ensaiar, criar outro arquivo de ambiente, projeto Compose, banco, diretórios de banco/fotos e alias de rede. Usar a mesma imagem da cópia, iniciar apenas o PostgreSQL, executar a restauração e conferir contas fictícias, oportunidades, candidaturas, decisões, histórico e fotos (incluindo versões reduzidas). Repetir o fluxo funcional e verificar as permissões das fotos de rascunhos. Registrar data, versão da imagem, origem, destino, duração, verificações e responsável. Não usar o banco do piloto como destino de ensaio.

A política exige cópia diária e antes de cada atualização, armazenada fora da instalação, com outra cópia fora da VPS. Confirmar na Hostinger: inclusão do PostgreSQL e diretório de fotos, frequência, retenção, destino, acesso e recuperação de arquivos individuais. Um backup no mesmo disco da VPS não comprova cobertura externa. Agendar a execução diária e a cópia externa somente após definir destino, retenção e alerta de falha; não apagar automaticamente cópias sem política aprovada.

## Atualizações e recuperação

1. Construir nova tag de imagem, preservando a anterior e as configurações correspondentes.
2. Interromper alterações de conteúdo e realizar backup de banco e fotos; confirmar manifesto e cópia externa.
3. Parar app, aplicar migrações com a imagem nova e iniciar somente se concluírem.
4. Verificar HTTPS, páginas, login e fluxo autenticado. Se falhar, manter indisponível até recuperar.
5. Para retorno incompatível de esquema, restaurar backup anterior em destinos vazios e apontar a imagem anterior para esses destinos. Não apenas trocar a imagem sobre banco já migrado. Registrar perda de alterações posteriores à cópia e coordenar a recuperação com o responsável.

## Verificação no destino com dados fictícios

O comando `APP_URL=https://DOMINIO npm run deploy:smoke` verifica páginas e recusa de acesso anônimo aos indicadores. Não substitui os passos autenticados abaixo; não executar a suíte Playwright local contra o piloto, pois ela reinicializa dados de testes.

1. Criar escola, administrador, gestora e prestadores fictícios exclusivos da homologação. Não transportar o banco de desenvolvimento.
2. Abrir link público no celular e verificar termos, privacidade e suporte. Cadastrar prestador, autenticar e retornar à oportunidade.
3. Recuperar senha e receber o e-mail real: remetente, entrega, link HTTPS correto, redefinição e login com a nova senha. Não registrar token no relatório.
4. Publicar com foto; candidatar-se, editar, retirar e reenviar. Conferir Minhas candidaturas e a proteção de contatos e candidaturas alheias.
5. Encerrar inscrições, selecionar, registrar desistência e reconsiderar. Conferir histórico, resultado e indicadores. Seleção permanece diferente de contratação.
6. Reiniciar/recriar o app e conferir persistência de fotos e dados. Ensaiar backup/restauração e verificar as cópias.
7. Registrar evidência e corrigir falhas. Avaliação com a diretora continua sendo uma atividade humana, pendente nos marcos M2–M5.

## Evidências de homologação — 24/11/2026

- Código e imagem em `/home/deploy/conecta-comunidade`; ambiente `.env.staging` (0600), projeto `conecta-staging`, dados em `/home/deploy/conecta-data/staging`. Portas de aplicação e banco sem exposição direta. A origem inicial `.internal` foi substituída por acesso via SSH em `localhost:3200` e pelo domínio HTTPS protegido descrito acima; o valor antigo `SMTP_HOST=pendente.invalid` de `.env.staging` é substituído pelos valores de `.env.smtp` quando o complemento SMTP é incluído; não usar a configuração base isoladamente para recriar a homologação.
- Imagem Linux construída na VPS; seis migrações aplicadas em banco vazio, com sincronização de desenvolvimento desabilitada. Administrador inicial fictício criado sem seed local. Imagem base verificada `conecta-comunidade:m6`, digest `sha256:ca94298315cbd5ddead4bd5568ccea934f60ecd756ee4ab1a663dc3d00612a6f`; a versão de acesso SSH está registrada acima. Arquivos `.env` e de bootstrap não estão na imagem. Reexecução das migrações sem pendências e recriação do app preservaram os dados e os hashes das fotos, conferidos pelo ensaio HTTP usando as ferramentas da própria imagem.
- `scripts/deploy/rehearse.mjs` exercitou via HTTP cadastro público, login, publicação com imagem sintética, candidatura, seleção, histórico, páginas e recusa de indicadores anônimos. A foto de rascunho ficou restrita. O script exige `ALLOW_STAGING_REHEARSAL=true` e banco `conecta_staging` ou `conecta_restore`; criação de registros somente no primeiro. Não testa entrega SMTP, HTTPS público ou usabilidade humana.
- Backup em `/home/deploy/conecta-backups/staging/2026-11-24T13-36-42.322Z`, com manifesto SHA-256, banco e fotos. Cópia presente somente na VPS; não atende ainda à política externa/diária.
- Restauração em `conecta-restore`, usando `.env.restore` e `/home/deploy/conecta-data/restore`, sem sobrescrever a origem. Login, resultado selecionado, quantidade de eventos e hashes do original e versões reduzidas passaram novamente. Relatório sem credenciais em `.verification-data/report.json` na VPS. Nova tentativa sobre o banco já restaurado foi recusada por não estar vazio, sem apagar registros. Uma cópia propositalmente alterada também foi recusada pela conferência de hash antes de acessar o banco; a cópia de teste foi removida. Serviços do ensaio de restauração parados ao final, dados preservados.
- Verificação local: tipagem, build, 47 testes de integração e cinco testes da configuração de produção aprovados. Os percursos móveis anteriores permanecem documentados no M5; M6 ainda depende do teste no endereço HTTPS definitivo e da avaliação humana.

Para repetir apenas a verificação de um ambiente já restaurado, iniciar seu app e executar o ensaio com `--verify`, fornecendo o relatório original em `REHEARSAL_REPORT` e as credenciais fictícias via ambiente protegido. Usar `DEPLOY_ENV_FILE` absoluto, o projeto correspondente e montar o relatório e `scripts/deploy` no container. Nenhuma credencial foi incorporada aos arquivos versionados.

## Avaliação preliminar com dados fictícios

Em 25/11/2026, o usuário solicitou adiar a discussão dos backups. Cobertura da Hostinger, rotina diária e cópia externa continuam pendentes; o teste de restauração já realizado permanece registrado. O usuário ainda não sabe o nome da escola participante. A avaliação pode avançar com a Escola Fictícia Homologação existente, sem cadastrar uma instituição real ou registrar autorização presumida.

No celular, a pessoa que avalia deve entrar como diretora e executar três tarefas: publicar uma oportunidade fictícia com foto, consultar seus candidatos e selecionar um prestador após encerrar as inscrições. Registrar, para cada tarefa, se conseguiu concluir sem orientação passo a passo, onde houve dúvida, qualquer mensagem de erro e o ajuste necessário. Testes feitos pelo próprio usuário são uma avaliação preliminar; a sessão com a diretora real permanece pendente até sua identificação.

Em 25/11/2026, o usuário confirmou que concluiu o fluxo completo sem dificuldades. Nenhum novo ajuste foi solicitado nessa avaliação preliminar; isso não substitui a sessão com a diretora real. Por decisão do usuário em 25/11/2026, a validação institucional de M6.8 ficou pendente e a entrega acadêmica foi encerrada como demonstração técnica no M7. O [relatório final do M7](m7-avaliacao-encerramento.md) reúne os resultados, os indicadores de teste, a análise das hipóteses, as limitações e a decisão de adiar o piloto escolar. A identificação da escola, a autorização e as demais condições institucionais serão retomadas quando houver essas informações. Os adiamentos não comprovam conclusão de M6 nem autorizam divulgação para participantes reais.

## Condições para ativação

Antes de receber participantes reais, registrar: escola e responsável autorizantes, textos/privacidade/retenção validados, responsável por suporte e administração, período do piloto, oportunidades reais e condições de contratação externa, materiais/valores/prazos e meios de divulgação. Preparar banco e diretórios exclusivos para o piloto; não converter a homologação fictícia em produção. Cadastrar somente dados autorizados, orientar a diretora e iniciar divulgação após essas verificações.

M6.1 a M6.9 devem ser marcados no roadmap somente quando houver evidência correspondente. Capacidade técnica da VPS não comprova backup externo, envio de e-mail ou aprovação institucional.

## Referências

[Implantação do Payload](https://payloadcms.com/docs/production/deployment), [migrações do Payload](https://payloadcms.com/docs/database/migrations), [pg_restore do PostgreSQL 17](https://www.postgresql.org/docs/17/app-pgrestore.html) e guias locais de Next.js em `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`.
