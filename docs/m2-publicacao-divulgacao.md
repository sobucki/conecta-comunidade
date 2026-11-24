# M2 Publicação e divulgação

A implementação técnica do M2 disponibiliza publicação de reparos com fotos, páginas públicas e compartilhamento de links. A avaliação com a diretora, prevista na issue [M2.7](https://github.com/sobucki/conecta-comunidade/issues/14), permanece pendente; as verificações automatizadas e a inspeção técnica não substituem essa sessão.

## Como executar

Com o Node compatível configurado conforme o [README](../README.md):

```sh
npm ci
npm run services:up
npm run seed:dev
npm run dev
```

O seed preserva os dados existentes e acrescenta três oportunidades fictícias publicadas, quando ainda não houver exemplos com os mesmos títulos. A escola, os exemplos e os textos de apresentação podem ser consultados em [localhost:3000](http://localhost:3000). As contas e a senha inicial continuam descritas no README; o seed não redefine senhas alteradas.

| Área | Caminho |
| --- | --- |
| Apresentação do projeto | `/` |
| Escola de demonstração | `/escolas/escola-demonstracao` |
| Detalhes do reparo | `/oportunidades/{id}` |
| Publicação pela gestão | `/admin/collections/opportunities` |
| Biblioteca de fotos | `/admin/collections/media` |
| Conteúdo institucional pelo administrador | `/admin/globals/site-content` |

## Publicação pela diretora

1. Entrar no painel com a conta de gestora e abrir Oportunidades.
2. Criar um registro com título, descrição, categoria, local, valor fixo, prazo de candidatura, período de execução e responsabilidade por materiais e ferramentas. A escola é atribuída pelo servidor à conta da gestora.
3. Salvar o rascunho. O registro e suas fotos ainda não ficam disponíveis para visitantes.
4. Em Fotos do reparo, usar Criar Novo, selecionar o arquivo, preencher a descrição da foto e salvar no modal. Salvar novamente a oportunidade para vincular a foto.
5. Conferir as condições e usar Publicar oportunidade. A ação pede confirmação e só fica habilitada depois de salvar as alterações.
6. Usar Ver página pública para conferir os dados apresentados à comunidade. A página permite copiar o link ou preparar seu compartilhamento pelo WhatsApp.

São permitidas até três fotos diferentes por oportunidade, em JPEG, PNG ou WebP, com até 5 MB por arquivo. Os períodos de execução precisam ser coerentes, o valor deve ser positivo com até duas casas decimais e o prazo de candidatura deve ser futuro ao publicar.

O administrador edita os textos, a escola de apresentação e a imagem institucional em Conteúdo do site. Essa edição não faz parte da rotina de publicação da diretora.

## Visibilidade e arquivos

- Rascunhos são restritos à gestão da escola. Prestadores e visitantes consultam somente oportunidades publicadas.
- A listagem da escola mostra apenas registros abertos dentro do prazo. Um link publicado continua acessível depois do prazo, com as inscrições identificadas como encerradas.
- Nome, e-mail e demais dados do autor ou responsável pela publicação não são enviados nas respostas públicas de oportunidades.
- Fotos soltas permanecem privadas. O acesso público é derivado das relações com oportunidades publicadas ou da escolha explícita da imagem institucional pelo administrador.
- A mesma regra protege o arquivo original, a versão de exibição e a miniatura. Remover uma foto de todos os usos públicos retira seu acesso anônimo.
- Escola e autor do arquivo são atribuídos no servidor e preservados nas alterações. Uma oportunidade não pode vincular foto de outra escola.

Os arquivos são armazenados em `media/`, fora de `public/`, com acesso pela API do Payload. O Sharp valida o formato e regrava a imagem em WebP, reduzindo o original e gerando versões de exibição e miniatura. Arquivos corrompidos ou acima dos limites são rejeitados.

As respostas de arquivo usam `Cache-Control: private, no-store`, e o otimizador de imagens do Next está desabilitado para evitar outra rota de cache desses arquivos. A hospedagem futura deve preservar o diretório e continuar servindo as fotos pela API autorizada, sem expô-lo por uma rota estática paralela.

Despublicação, cancelamento e seleção serão tratados nos marcos correspondentes. O M2 entrega criação, edição, salvamento de rascunho e publicação. O [M3 Participação](m3-participacao.md) já acrescenta o botão de candidatura ao site e protege as condições após a primeira participação.

## Verificações técnicas

Os testes de integração do M1 e M2 verificam contas, permissões, isolamento entre escolas, validação de valor e datas, publicação, arquivos, quantidade de fotos, propriedade dos registros e conteúdo institucional.

Os percursos de navegador cobrem preenchimento do formulário de publicação pelo celular, envio da foto pelo modal, publicação com confirmação, bloqueio de publicação com alterações não salvas, consulta anônima, compartilhamento, prazo encerrado e edição dos textos institucionais pelo administrador. Também exercitam acesso direto ao original e à miniatura antes e depois da publicação e depois da remoção da foto.

```sh
npm run typecheck
npm test
npm run build
```

Os arquivos de teste ficam em `.tools/test-media` e os registros no banco `conecta_test`, separados do desenvolvimento. A migração `20261124_022040` acrescenta oportunidades, fotos e conteúdo institucional; sua aplicação em sequência com a migração do M1 foi verificada em um banco vazio separado.

Resultado da verificação técnica: 19 testes de integração e 10 percursos de navegador aprovados, tipagem sem erros e build de produção concluído. A cópia efetiva do link para a área de transferência e a edição da imagem institucional também foram exercitadas. O teste que envia um PNG deliberadamente corrompido gera um erro de decodificação esperado no log e verifica sua rejeição.

## Avaliação com a diretora

O teste deve ocorrer com dados fictícios, antes da ativação do piloto. Entregue à diretora apenas este objetivo: **publicar um reparo com valor, prazos, condições e uma foto, e localizar o link para compartilhar**.

O observador evita dar instruções passo a passo durante a primeira tentativa. Os passos da seção Publicação pela diretora servem como referência para o observador ou para um segundo teste após registrar as dificuldades.

- [ ] A diretora encontrou onde criar a oportunidade.
- [ ] Preencheu valor, datas e responsabilidade por materiais e ferramentas.
- [ ] Conseguiu salvar o rascunho e anexar uma foto.
- [ ] Entendeu a diferença entre salvar e publicar.
- [ ] Publicou e conferiu a página sem login.
- [ ] Localizou e compreendeu o compartilhamento do link.

Registrar aparelho utilizado, necessidade de ajuda e os pontos que exigiram orientação, sem coletar dados de alunos. Se houver dificuldade, registrar o ajuste necessário e repetir a tarefa depois da correção. A issue M2.7 será concluída após essa execução e o registro dos resultados.

## Pendências preservadas

Os detalhes da Hostinger, a cobertura de seus backups, o prazo de desenvolvimento e a disponibilidade da equipe continuam em aberto. A implementação utiliza dados fictícios e não ativa o piloto com participantes reais.
