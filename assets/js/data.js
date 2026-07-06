// Dados de demonstração do portal Cais — conteúdo fictício para prototipagem.
const EDITORIAS = [
  { slug: "rio", nome: "Rio", cor: "teal" },
  { slug: "baixada", nome: "Baixada Fluminense", cor: "laranja" },
  { slug: "regiao-dos-lagos", nome: "Região dos Lagos", cor: "verde" },
  { slug: "brasil", nome: "Brasil", cor: "verde" },
  { slug: "economia", nome: "Economia", cor: "ouro" },
  { slug: "tecnologia", nome: "Tecnologia", cor: "azul" },
  { slug: "esportes", nome: "Esportes", cor: "laranja" },
  { slug: "cultura", nome: "Cultura", cor: "verde" },
];

const NOTICIAS = [
  {
    id: "obras-linha-tres",
    editoria: "rio",
    titulo: "Prefeitura antecipa entrega das obras de drenagem na Zona Norte para outubro",
    linha: "Cronograma revisado após vistoria técnica aponta avanço de 40% acima do previsto no trimestre.",
    resumo30s: [
      "Obras de drenagem na Zona Norte devem ficar prontas em outubro, três meses antes do previsto.",
      "Vistoria técnica identificou avanço de 40% acima da meta trimestral.",
      "Moradores relatam menos alagamentos em dias de chuva forte desde o início das intervenções.",
      "Investimento total do pacote é de R$ 82 milhões, com recursos federais e municipais.",
    ],
    corpo: [
      "A prefeitura informou nesta quinta-feira que o cronograma das obras de drenagem em três bairros da Zona Norte foi revisado para baixo: a entrega, antes prevista para janeiro, deve acontecer já em outubro.",
      "Segundo a secretaria de Infraestrutura, uma vistoria técnica realizada na semana passada constatou que o ritmo das obras está 40% acima da meta estabelecida para o trimestre, resultado de um novo contrato com fornecedores de tubulação.",
      "Moradores da região ouvidos pela reportagem relatam melhora perceptível durante as últimas chuvas fortes, embora pontos isolados ainda registrem alagamento em vias secundárias.",
      "O pacote de obras soma R$ 82 milhões, com recursos de convênio federal e contrapartida municipal. A previsão é que outras quatro regiões da cidade recebam intervenções semelhantes até o fim do próximo ano.",
    ],
    fontes: [
      "Secretaria Municipal de Infraestrutura — coletiva de imprensa, 02/07/2026",
      "Vistoria técnica da Coordenadoria de Obras (relatório interno)",
      "Entrevistas com moradores dos bairros Del Castilho e Higienópolis",
    ],
    tempoLeitura: 4,
    data: "2026-07-03T08:12:00",
    destaque: true,
    imagem: "teal",
  },
  {
    id: "startup-fluminense-rodada",
    editoria: "tecnologia",
    titulo: "Startup fluminense de logística portuária capta R$ 14 milhões em rodada série A",
    linha: "Aporte será usado para expandir o software de rastreamento de cargas para outros portos do Sudeste.",
    resumo30s: [
      "Empresa sediada em Niterói capta R$ 14 milhões liderados por fundo de São Paulo.",
      "Produto é um software de rastreamento de cargas usado por operadores portuários.",
      "Recursos vão financiar expansão para mais três portos do Sudeste em 2027.",
      "Empresa foi fundada em 2022 por dois ex-funcionários de terminal portuário.",
    ],
    corpo: [
      "A companhia, fundada em 2022 em Niterói, anunciou nesta semana a captação de R$ 14 milhões em uma rodada série A liderada por um fundo de venture capital paulista, com participação de investidores-anjo locais.",
      "O produto principal é uma plataforma de rastreamento de cargas em tempo real, hoje usada por operadores de dois terminais na Baía de Guanabara. Com o aporte, a meta é expandir a operação para mais três portos do Sudeste até 2027.",
      "Os fundadores, ambos ex-funcionários de terminal portuário, afirmam que o diferencial da ferramenta é a integração direta com sistemas alfandegários, reduzindo o tempo médio de liberação de contêineres.",
    ],
    fontes: [
      "Press release da empresa, 01/07/2026",
      "Entrevista com fundadores concedida à redação",
    ],
    tempoLeitura: 3,
    data: "2026-07-03T07:40:00",
    destaque: false,
    imagem: "azul",
  },
  {
    id: "dolar-exportacao-fluminense",
    editoria: "economia",
    titulo: "Alta do dólar impulsiona exportações do polo industrial da Baixada em junho",
    linha: "Balança comercial da região registra melhor resultado mensal em dois anos, aponta federação industrial.",
    resumo30s: [
      "Exportações do polo industrial da Baixada Fluminense cresceram 18% em junho ante maio.",
      "Alta é atribuída à valorização do dólar e à retomada de contratos com a Europa.",
      "Setor químico e metalúrgico puxaram o resultado, segundo federação industrial.",
      "Entidade projeta manutenção do ritmo se câmbio permanecer estável no trimestre.",
    ],
    corpo: [
      "O polo industrial da Baixada Fluminense fechou junho com o melhor resultado mensal de exportações em dois anos, segundo levantamento da federação das indústrias do estado divulgado nesta quarta-feira.",
      "O crescimento de 18% em relação a maio é atribuído à valorização do dólar frente ao real e à retomada de contratos com compradores europeus, especialmente nos setores químico e metalúrgico.",
      "Para o economista-chefe da federação, o cenário deve se manter estável nos próximos meses caso o câmbio não sofra correções bruscas, mas alerta para o risco de dependência excessiva de poucos setores.",
    ],
    fontes: [
      "Federação das Indústrias do Estado do Rio de Janeiro — boletim mensal, 02/07/2026",
      "Entrevista com economista-chefe da federação",
    ],
    tempoLeitura: 3,
    data: "2026-07-02T18:20:00",
    destaque: false,
    imagem: "ouro",
  },
  {
    id: "final-campeonato-regional",
    editoria: "esportes",
    titulo: "Time da Baixada garante vaga na final do campeonato estadual após 12 anos",
    linha: "Vitória por 2 a 1 fora de casa leva o clube à decisão, marcada para o dia 19 no Maracanã.",
    resumo30s: [
      "Clube da Baixada vence por 2 a 1 e garante vaga na final do estadual.",
      "É a primeira final do time em 12 anos.",
      "Decisão está marcada para o dia 19 de julho, no Maracanã.",
      "Adversário na final ainda será definido em jogo de volta na próxima terça.",
    ],
    corpo: [
      "O time da Baixada Fluminense confirmou presença na final do campeonato estadual após vencer fora de casa por 2 a 1 nesta terça-feira, resultado que garante vaga na decisão pela primeira vez em 12 anos.",
      "A partida da final está marcada para o dia 19 de julho, no Maracanã, com data e horário a confirmar junto à federação de futebol do estado.",
      "O adversário ainda será definido em jogo de volta entre os outros dois semifinalistas, na próxima terça-feira.",
    ],
    fontes: ["Assessoria de imprensa do clube", "Federação de Futebol do Estado do Rio de Janeiro"],
    tempoLeitura: 2,
    data: "2026-07-02T21:05:00",
    destaque: false,
    imagem: "laranja",
  },
  {
    id: "festival-cultura-popular",
    editoria: "cultura",
    titulo: "Festival de cultura popular reúne 40 grupos de jongo e maracatu na região",
    linha: "Edição deste ano amplia programação para três dias e inclui oficinas gratuitas para crianças.",
    resumo30s: [
      "Festival de cultura popular reúne 40 grupos de jongo e maracatu na região metropolitana.",
      "Programação foi ampliada de dois para três dias neste ano.",
      "Evento inclui oficinas gratuitas de percussão para crianças e adolescentes.",
      "Entrada é gratuita, com shows programados para o fim de semana do dia 25.",
    ],
    corpo: [
      "A décima edição do festival de cultura popular da região metropolitana reunirá 40 grupos de jongo, maracatu e outras manifestações tradicionais, com programação estendida para três dias.",
      "Entre as novidades, os organizadores destacam oficinas gratuitas de percussão voltadas para crianças e adolescentes, além de uma feira de artesanato local.",
      "O evento tem entrada gratuita e acontece no fim de semana do dia 25, em praça pública, com apoio da secretaria municipal de cultura.",
    ],
    fontes: ["Organização do festival", "Secretaria Municipal de Cultura"],
    tempoLeitura: 2,
    data: "2026-07-02T15:00:00",
    destaque: false,
    imagem: "verde",
  },
  {
    id: "reforma-tributaria-impacto-regional",
    editoria: "brasil",
    titulo: "Entenda o que muda para pequenas empresas da região com a nova etapa da reforma tributária",
    linha: "Explicativo detalha prazos, alíquotas de transição e obrigações que entram em vigor no próximo semestre.",
    resumo30s: [
      "Nova etapa da reforma tributária afeta diretamente pequenas empresas a partir do segundo semestre.",
      "Alíquotas de transição variam por setor e serão aplicadas gradualmente até 2028.",
      "Empresas do Simples Nacional têm regras específicas que reduzem o impacto imediato.",
      "Contadores recomendam revisão de precificação antes da entrada em vigor das mudanças.",
    ],
    corpo: [
      "A nova etapa da reforma tributária começa a valer no segundo semestre e traz mudanças diretas para pequenas empresas, especialmente as que não estão enquadradas no Simples Nacional.",
      "As alíquotas de transição variam conforme o setor de atuação e serão aplicadas de forma gradual até 2028, segundo cronograma definido pela Receita Federal.",
      "Empresas do Simples Nacional têm regras específicas que reduzem o impacto imediato, mas especialistas recomendam que todos os negócios revisem sua precificação antes da entrada em vigor das novas regras.",
    ],
    fontes: ["Receita Federal — cronograma oficial da reforma tributária", "Entrevista com contadores locais"],
    tempoLeitura: 5,
    data: "2026-07-02T10:30:00",
    destaque: false,
    imagem: "verde",
  },
  {
    id: "temporada-turismo-lagos",
    editoria: "regiao-dos-lagos",
    titulo: "Rede hoteleira da Região dos Lagos registra ocupação recorde para o feriado",
    linha: "Cabo Frio, Búzios e Arraial do Cabo somam mais de 90% de ocupação; setor projeta alta de 15% na receita frente ao ano passado.",
    resumo30s: [
      "Hotéis da Região dos Lagos registram mais de 90% de ocupação no feriado prolongado.",
      "Cabo Frio, Búzios e Arraial do Cabo puxam a alta na procura.",
      "Setor turístico projeta receita 15% maior que no mesmo período do ano passado.",
      "Prefeituras reforçam limpeza urbana e sinalização de trânsito nas orlas.",
    ],
    corpo: [
      "A rede hoteleira da Região dos Lagos fechou o feriado prolongado com ocupação média acima de 90%, segundo levantamento do sindicato de hotéis da região divulgado nesta semana.",
      "Cabo Frio, Búzios e Arraial do Cabo concentraram a maior procura, impulsionada por pacotes promocionais e pela melhora na previsão do tempo para o litoral.",
      "Para o setor turístico local, a expectativa é de uma receita 15% maior do que no mesmo período do ano passado, com reflexo direto no comércio e nos serviços de gastronomia.",
      "As prefeituras da região reforçaram equipes de limpeza urbana e sinalização de trânsito nas principais vias de acesso às praias durante o feriado.",
    ],
    fontes: [
      "Sindicato de Hotéis da Região dos Lagos — boletim de ocupação, 02/07/2026",
      "Secretarias municipais de turismo de Cabo Frio, Búzios e Arraial do Cabo",
    ],
    tempoLeitura: 3,
    data: "2026-07-02T12:00:00",
    destaque: false,
    imagem: "verde",
  },
  {
    id: "chuva-forte-alerta",
    editoria: "rio",
    titulo: "Defesa Civil emite alerta para chuva forte na Região Metropolitana neste fim de semana",
    linha: "Órgão recomenda atenção redobrada em áreas de encosta e histórico de alagamento.",
    resumo30s: [
      "Defesa Civil alerta para chuva forte na Região Metropolitana neste sábado e domingo.",
      "Recomendação é atenção redobrada em áreas de encosta e histórico de alagamento.",
      "Órgão reforça equipes de plantão em 12 municípios da região.",
      "Moradores podem acionar canal de emergência 199 em caso de risco.",
    ],
    corpo: [
      "A Defesa Civil estadual emitiu alerta para chuva forte na Região Metropolitana entre sábado e domingo, com possibilidade de acumulados acima de 60mm em pontos isolados.",
      "O órgão recomenda atenção redobrada em áreas de encosta e regiões com histórico de alagamento, além de reforçar equipes de plantão em 12 municípios.",
      "Em caso de risco iminente, moradores podem acionar o canal de emergência 199, disponível 24 horas.",
    ],
    fontes: ["Defesa Civil do Estado do Rio de Janeiro — boletim de alerta"],
    tempoLeitura: 2,
    data: "2026-07-03T06:00:00",
    destaque: false,
    imagem: "teal",
  },
];

const AO_VIVO_INICIAL = [
  { hora: "09:14", texto: "Trânsito lento na Linha Vermelha sentido Centro após acidente sem vítimas." },
  { hora: "08:55", texto: "Prefeitura confirma coletiva sobre obras de drenagem para as 11h." },
  { hora: "08:30", texto: "Dólar abre em leve alta, cotado a R$ 5,42 no início do pregão." },
];

const AO_VIVO_NOVOS = [
  { texto: "Ônibus voltam a circular normalmente na Baixada após bloqueio pontual." },
  { texto: "Federação industrial divulga nota sobre resultado das exportações de junho." },
  { texto: "Time da Baixada treina em período fechado antes da final do estadual." },
  { texto: "Meteorologia reforça alerta de chuva forte para a madrugada de sábado." },
  { texto: "Câmara municipal aprova em primeira votação projeto de mobilidade urbana." },
];

const MAIS_LIDAS = [
  "obras-linha-tres",
  "final-campeonato-regional",
  "reforma-tributaria-impacto-regional",
  "chuva-forte-alerta",
  "startup-fluminense-rodada",
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { EDITORIAS, NOTICIAS, AO_VIVO_INICIAL, AO_VIVO_NOVOS, MAIS_LIDAS };
}
