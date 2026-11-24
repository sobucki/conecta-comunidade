# M5 Preparação do piloto

A preparação técnica acrescenta os seis indicadores ao painel em `/admin/globals/pilot-dashboard`, consulta por período e campos institucionais em Conteúdo do site. A conclusão integral depende da validação institucional dos textos, definição do responsável e canal de suporte e avaliação real com a diretora. O piloto não está ativado para dados reais.

## Indicadores e convenções

As datas inicial e final são inclusivas, usando dias completos em Brasília (UTC−03). Internamente o intervalo é fechado no início e aberto à meia-noite seguinte ao último dia. Cada consulta usa um único snapshot do PostgreSQL. A gestora recebe apenas sua escola; o administrador consulta todas as escolas. Visitantes e prestadores não acessam a API `/api/pilot-metrics`.

- Prestadores cadastrados: contas de prestador criadas no período e associadas à escola consultada.
- Prestadores participantes: pessoas distintas com primeiro envio ou reenvio no período, mesmo em oportunidades publicadas anteriormente.
- Oportunidades publicadas: publicações no período, incluindo oportunidades posteriormente encerradas ou canceladas.
- Candidaturas recebidas: eventos de primeiro envio mais reenvios no período. A interface discrimina ambas as parcelas. Edições e retiradas não contam novos envios.
- Oportunidades com candidatos: proporção da coorte de publicações do período que recebeu ao menos uma primeira candidatura até o fim do período. Denominador: todas as oportunidades publicadas no período. Sem publicações, o percentual não se aplica.
- Tempo até a primeira candidatura: média das horas entre publicação e primeiro envio, somente nas oportunidades dessa coorte que receberam candidatura até o fim do período. Sem candidaturas, o tempo não se aplica.

Retirada, desistência e cancelamento preservam as contagens históricas. Não são medidos visitas, alcance no WhatsApp, contratação, renda ou serviços executados. Períodos recentes podem ter observação mais curta; compare resultados com essa limitação explícita.

## Conteúdo institucional e atendimento

Em Conteúdo do site, o administrador pode preencher responsável pelo atendimento, e-mail externo, termos institucionais, aviso de privacidade e data da validação. A data só deve ser registrada após validação real pela instituição. Termos e privacidade usam o conteúdo institucional quando o texto e a data estão preenchidos; caso contrário mantêm o aviso de demonstração.

A página `/suporte`, também no rodapé, publica o responsável e e-mail configurados. O e-mail informado pelo usuário, `sobucki@gmail.com`, foi configurado no banco de desenvolvimento. A identificação nominal do responsável continua pendente. Em instalações sem configuração, a página apresenta a pendência sem inventar contatos. Antes da ativação, definir finalidade, instituição responsável, acesso, retenção, tratamento dos pedidos de privacidade, encerramento do piloto e quem substituirá o responsável se necessário. A interface preparada não substitui essa decisão institucional.

## Operação e teste

Na raiz, com Node compatível e Docker:

```sh
npm run services:up
npm run seed:dev
npm run dev
```

Entre como diretora em `/admin`, abra Indicadores do piloto, informe início e fim e consulte os resultados. As contas e a senha inicial estão no README. Use exclusivamente dados fictícios. O seed preserva alterações e decisões existentes.

```sh
npm run typecheck
npm test
npm run build
```

Verificação técnica: 47 testes de integração e 22 percursos de navegador, tipagem e build de produção. As seis migrações foram aplicadas em banco vazio; a migração do M5 foi revertida e reaplicada.

Os testes de indicadores reconciliam cadastro, publicação, envio, edição, retirada e reenvio numa escola isolada e verificam ausência de denominador e restrição de acesso. Os percursos anteriores exercitam visitante, cadastro, perfil, recuperação, publicação com foto, candidaturas, seleção, desistência e reconsideração no celular. A avaliação com a diretora permanece em M2.7, M3.7 e M4.8.

## Rotina do responsável

1. Conferir escola, contas de gestão e bloqueios antes de divulgar.
2. Revisar escopo, valor, condições, prazo e fotos antes da publicação; evitar pessoas identificáveis e dados de alunos.
3. Atender pedidos pelo e-mail externo definido, sem solicitar senha ou documentos desnecessários.
4. Consultar candidatos da escola, encerrar inscrições e confirmar decisões. A seleção aguarda formalização externa.
5. Usar justificativa para cancelamento, encerramento sem seleção e desistência. Não excluir histórico para corrigir resultados.
6. Consultar indicadores com as convenções acima e apresentar somente dados agregados na avaliação acadêmica.
7. Antes de atualizar em produção, realizar backup e seguir o procedimento de implantação validado em M6.

## Pendências para M6 e ativação

- Confirmar plano Hostinger, Node, PostgreSQL, domínio, HTTPS, SMTP e armazenamento persistente das fotos.
- Definir implantação, segredos e migrações; aplicar migrações no ambiente de destino, sem usar sincronização de desenvolvimento em produção.
- Separar dados fictícios e reais. Não executar o seed de demonstração em produção.
- Confirmar backup diário de banco e fotos, cópia antes de atualizações, destino separado e teste de restauração; a cobertura da Hostinger ainda precisa ser verificada.
- Identificar responsável e e-mail de suporte e administração, obter textos e retenção validados pela instituição.
- Concluir avaliação real da diretora e corrigir dificuldades observadas.
- Exercitar o fluxo completo e recuperação de senha com dados fictícios no ambiente de destino.
- Obter autorização da escola, demandas reais, condições de divulgação e período do experimento antes de receber participantes reais.

Prazo e disponibilidade da equipe continuam em aberto. Preparação técnica não equivale à autorização institucional ou conclusão dessas pendências.
