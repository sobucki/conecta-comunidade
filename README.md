# conecta-comunidade

Aplicação web para conectar demandas de pequenos reparos de uma escola a prestadores adultos da comunidade.

## Desenvolvimento local

O M1 implementa a base de Next.js, TypeScript, Payload e PostgreSQL, com contas fictícias, permissões por papel e escola, bloqueio de acessos, histórico administrativo e recuperação de senha por e-mail local. O M2 acrescenta oportunidades com valor fixo e até três fotos, páginas públicas, conteúdo institucional editável e compartilhamento de links.

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

O banco de desenvolvimento é `conecta_dev`; os testes usam exclusivamente `conecta_test`. Ambos são locais. O Mailpit captura os e-mails, permitindo exercitar a recuperação de acesso sem entrega a destinatários externos. O cadastro público de prestadores será implementado no M3; atualmente, as contas são criadas pelo administrador. O seed também prepara três oportunidades fictícias para consultar em [Escola Demonstração](http://localhost:3000/escolas/escola-demonstracao).

Para publicar, a gestora abre Oportunidades no painel, preenche as condições, salva o rascunho, adiciona até três fotos e confirma Publicar oportunidade. A rotina e o roteiro de avaliação estão em [M2 Publicação e divulgação](docs/m2-publicacao-divulgacao.md).

### Verificações

Com os serviços locais iniciados:

```sh
npx playwright install chromium
npm run typecheck
npm test
npm run build
```

`npm test` executa integração e navegador em sequência. O Playwright inicia e encerra sua própria aplicação na porta 3100, utilizando `.next-test` e o banco de testes. O desenvolvimento na porta 3000 usa `.next` e seu próprio banco.

Os testes verificam permissões reais, isolamento por escola, proteção de campos administrativos, bloqueio de sessões existentes, seed idempotente e recuperação de senha completa via SMTP e navegador. Instruções adicionais e os limites atuais estão em [M1 Base e acessos](docs/m1-base-acessos.md).

## Documentação

- [Visão, escopo e requisitos](conecta-comunidade-requisitos.md).
- [Plano de desenvolvimento](conecta-comunidade-plano-desenvolvimento.md): decisões consolidadas para o MVP, arquitetura, entregas, critérios de aceite e pendências de infraestrutura.
- [Roadmap de desenvolvimento](conecta-comunidade-roadmap.md): sequência dos marcos, tarefas, dependências e critérios de conclusão.
- [M1 Base e acessos](docs/m1-base-acessos.md): configuração local, modelo inicial, permissões, migração e verificações realizadas.
- [M2 Publicação e divulgação](docs/m2-publicacao-divulgacao.md): páginas públicas, oportunidades, fotos, compartilhamento e roteiro de avaliação com a diretora.
