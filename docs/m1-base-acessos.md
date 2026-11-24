# M1 Base e acessos

O primeiro marco entrega a aplicação local, o banco PostgreSQL, a configuração da escola, contas com papéis protegidos e recuperação de senha. O site contém uma página inicial e as telas de recuperação; publicação de oportunidades e cadastro público de prestadores pertencem aos próximos marcos.

## Ambiente

As dependências instaladas estão registradas em `package-lock.json`. A base utiliza Payload 3.94.1, Next.js 16.4.6 e TypeScript, com Node.js 24.22.3 indicado em `.node-version`. PostgreSQL 17 e Mailpit 1.34.0 são executados pelo Compose, com portas expostas apenas na interface local.

Se o Node instalado na estação for anterior ao exigido pelo Payload, utilize seu gerenciador de versões. Como alternativa, pode instalar um runtime isolado e ignorado pelo Git:

```sh
npm install --prefix .tools --no-save --package-lock=false node@24.22.3
export PATH="$PWD/.tools/node_modules/node/bin:$PATH"
node --version
```

Depois, siga os comandos do [README](../README.md). `npm run services:down` interrompe os serviços locais preservando o volume do PostgreSQL. Os bancos de desenvolvimento e testes são criados quando esse volume é inicializado.

## Modelo inicial

| Coleção | Conteúdo e limites |
| --- | --- |
| `users` | Autenticação, nome, papel, escola, situação da conta, telefone e perfil profissional. Dados de maioridade, vínculo e aceite são exigidos para prestadores. |
| `schools` | Nome, identificador público e apresentação da escola. Criação e alteração restritas ao administrador. |
| `categories` | Categorias de habilidades e serviços, mantidas pelo administrador. |
| `activity-logs` | Operação, coleção, identificador do registro e responsável. Leitura restrita ao administrador; alteração e exclusão bloqueadas pelas APIs. |

O perfil profissional está representado nos campos do usuário, em vez de exigir outra conta ou coleção nesta etapa. Oportunidades, candidaturas e imagens serão acrescentadas nos marcos correspondentes.

## Permissões

- Administrador ativo acessa o painel, cadastra escolas e contas, concede papéis e bloqueia acessos.
- Gestora ativa acessa o painel e consulta somente sua escola e seu próprio perfil. A consulta aos candidatos será acrescentada no M3, vinculada às candidaturas; este marco não oferece catálogo de profissionais.
- Prestador ativo autentica pela API e consulta ou edita somente os campos permitidos do próprio perfil. O painel administrativo permanece inacessível.
- Visitante não lista usuários, não consulta o histórico administrativo e não cria contas neste marco.
- Papel, escola, situação de bloqueio e registro de aceite possuem escrita protegida. As validações do perfil consideram o papel efetivo, mesmo que a requisição tente falsificá-lo.
- Contas bloqueadas não fazem login nem utilizam as permissões de uma sessão anteriormente emitida.

A criação inicial de contas depende do seed local ou de um administrador existente. O contexto interno de bootstrap não é um campo aceito pelo endpoint público. Isso também impede que a rota inicial de cadastro do Payload conceda acesso administrativo sem o procedimento definido.

As chamadas internas feitas em nome de um usuário aplicam `overrideAccess: false`. O seed e a escrita interna de auditoria utilizam operações privilegiadas explícitas. Alterações de escolas e contas registram histórico, incluindo mudanças de papel, associação à escola e bloqueio, dentro da transação da operação.

## Dados fictícios

`npm run seed:dev` prepara uma escola, seis categorias e quatro contas fictícias. O seed exige `ALLOW_DEV_SEED=true`, ambiente de desenvolvimento e um banco local chamado `conecta_dev` ou `conecta_test`. O código recusa execução em produção e preserva os registros já existentes.

O arquivo `.env`, o runtime isolado, os arquivos de execução e os relatórios de teste são ignorados pelo Git. A senha inicial das contas é gerada localmente; ela não é registrada na documentação nem no código-fonte.

## Recuperação de senha

O fluxo público começa em `/recuperar-acesso`, envia um e-mail capturado no Mailpit e leva a `/redefinir-senha?token=...`. A resposta ao pedido é genérica, independentemente de existir uma conta com o endereço informado. A troca valida a senha no servidor, exige pelo menos 12 caracteres e rejeita tokens inválidos, expirados ou reutilizados.

Após sucesso, a tela remove o token da URL. A recuperação serve também a prestadores e não exige acesso ao painel. A confirmação prévia do e-mail permanece desabilitada, conforme o plano.

O envio real por SMTP, o domínio e as configurações de produção continuam pendentes para M6. O WhatsApp não participa da autenticação ou recuperação.

## Esquema e migrações

No desenvolvimento e nos testes, o adaptador PostgreSQL sincroniza o esquema com as coleções. A migração inicial está em `src/migrations` e foi aplicada em um banco local vazio separado para verificar a criação do esquema. Em produção, a sincronização automática está desabilitada.

Para gerar e aplicar migrações futuras, com o ambiente de destino devidamente configurado:

```sh
npm run db:migrate:create
npm run db:migrate
```

A preparação da infraestrutura de produção, seus backups e a definição do processo de atualização permanecem no M6. O banco temporário utilizado para verificar a migração não contém dados de participantes.

## Verificações do marco

| Verificação | Resultado esperado e exercitado |
| --- | --- |
| Integração com Vitest | Nove testes de contas, isolamento, proteção de privilégios, bloqueio, histórico, seed e recuperação por SMTP. |
| Navegador com Playwright | Cinco percursos: gestora pelo celular, restrição do painel ao prestador, proteção da API pública, recuperação com resposta genérica e troca completa de senha por link real. |
| TypeScript | Verificação estática de tipos sem erros. |
| Build | Compilação de produção concluída para páginas públicas, painel e APIs. |
| Migração inicial | Aplicação concluída em PostgreSQL local vazio separado. |

Os testes executam exclusivamente no banco local `conecta_test` e criam registros fictícios próprios. Eles não apagam nem reutilizam dados reais. Para executar apenas uma camada, utilize `npm run test:int` ou `npm run test:e2e`. A execução conjunta deve usar `npm test`, que evita concorrência entre as duas suítes no mesmo banco de testes.

## Dependências e próximos marcos

O Vitest do template foi atualizado para 4.1.12 para corrigir os alertas encontrados na instalação. A auditoria atual ainda identifica cinco entradas moderadas na cadeia transitiva de esbuild e Drizzle do adaptador PostgreSQL, sem correção automática indicada pelo registro. Essa cadeia deverá ser reavaliada antes da implantação; as versões resolvidas permanecem registradas no lockfile.

O próximo marco é M2 Publicação e divulgação. Persistem as pendências já acordadas de prazo, disponibilidade da equipe e detalhes da Hostinger. As demonstrações continuam utilizando dados fictícios.
