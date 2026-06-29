// ─── Constantes globais do sistema EBD ────────────────────────────────────────

export const ANOS_DISPONIVEIS = (() => {
  const anoAtual = new Date().getFullYear()
  const anos: number[] = []
  for (let a = 2026; a <= Math.max(anoAtual + 1, 2027); a++) anos.push(a)
  return anos
})()

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export const TRIMESTRES = [
  { label: '1º Trim', desc: 'Jan – Mar', meses: [0, 1, 2] },
  { label: '2º Trim', desc: 'Abr – Jun', meses: [3, 4, 5] },
  { label: '3º Trim', desc: 'Jul – Set', meses: [6, 7, 8] },
  { label: '4º Trim', desc: 'Out – Dez', meses: [9, 10, 11] },
]

/** Cores hex usadas em gráficos quando a turma não tem cor cadastrada */
export const CORES_FALLBACK = [
  '#EAB308', '#F97316', '#3B82F6', '#A855F7',
  '#22C55E', '#14B8A6', '#EF4444', '#EC4899',
]

/** Mapeamento de classes Tailwind bg para hex (usado em legenda de gráficos) */
export const BG_TO_HEX: Record<string, string> = {
  'bg-yellow-500': '#EAB308',
  'bg-orange-500': '#F97316',
  'bg-blue-500':   '#3B82F6',
  'bg-purple-500': '#A855F7',
  'bg-green-500':  '#22C55E',
  'bg-teal-500':   '#14B8A6',
  'bg-red-500':    '#EF4444',
  'bg-pink-500':   '#EC4899',
  'bg-indigo-500': '#6366F1',
  'bg-cyan-500':   '#06B6D4',
}

/** Cargos eclesiásticos com cores */
export const CARGOS = [
  { label: 'Pastor',      bg: '#7C3AED20', color: '#7C3AED', border: '#7C3AED50' },
  { label: 'Evangelista', bg: '#2563EB20', color: '#2563EB', border: '#2563EB50' },
  { label: 'Presbítero',  bg: '#4F46E520', color: '#4F46E5', border: '#4F46E550' },
  { label: 'Diácono',     bg: '#16A34A20', color: '#16A34A', border: '#16A34A50' },
  { label: 'Cooperador',  bg: '#0D948820', color: '#0D9488', border: '#0D948850' },
  { label: 'Obreiro',     bg: '#EA580C20', color: '#EA580C', border: '#EA580C50' },
]

export function getCargo(cargo: string) {
  return CARGOS.find(c => c.label === cargo) ?? null
}

// ─── Temas das revistas CPAD por ano/trimestre ────────────────────────────────
export const TEMAS_REVISTA: Record<string, Record<number, Record<string, string>>> = {
  '2026': {
    2: {
      adultos:          'Homens dos quais o Mundo não Era Digno — O Legado de Abraão, Isaque e Jacó',
      jovens:           'Entre a Verdade e o Engano — Combatendo Ideologias e Ensinos que se Opõem à Palavra de Deus',
      adolescentes:     'As Parábolas de Jesus são Vivas',
      juniores:         'Israel e a Terra Prometida',
      primarios:        'Os Ensinamentos de Deus',
    },
    3: {
      adultos:          'A Igreja dos Gentios: Da Chamada Missionária à Consolidação do Evangelho entre os Povos',
      jovens:           'Fidelidade às Escrituras em Oposição à Apostasia: Lições Espirituais no Livro de Juízes',
      adolescentes:     'Conhecendo os Fundamentos da Fé Cristã nas Epístolas Gerais',
      pre_adolescentes: 'Servindo A Deus Com Meus Talentos',
      juniores:         'Tempo dos Juízes',
      primarios:        'As Crianças da Bíblia',
    },
  },
}

// ─── Temas individuais das aulas (títulos por lição) ──────────────────────────
// Estrutura: ano → trimestre → categoria → número da aula → título
export const LICOES_REVISTA: Record<string, Record<number, Record<string, Record<number, string>>>> = {
  '2026': {
    2: {
      adultos: {
        1:  'Abraão: Seu Chamado e Sua Jornada de Fé',
        2:  'A Fé de Abrão nas Promessas de Deus',
        3:  'A Impaciência na Espera do Cumprimento da Promessa',
        4:  'A Confirmação de uma Promessa',
        5:  'O Juízo contra Sodoma e Gomorra',
        6:  'O Nascimento de Isaque',
        7:  'Uma Prova de Fé: A Entrega de Isaque',
        8:  'Isaque: Herdeiro da Promessa',
        9:  'Jacó e Esaú: Irmãos em Conflito',
        10: 'A Experiência Transformadora de Jacó',
        11: 'Jacó: De Enganador a Homem de Honra',
        12: 'A Reconciliação de Jacó com Esaú',
        13: 'O Legado de Fé de Abraão, Isaque e Jacó',
      },
      jovens: {
        1:  'O Que É uma Ideologia',
        2:  'A Falácia do Materialismo Histórico',
        3:  'A Falácia do Relativismo Ético-Moral',
        4:  'A Falácia da Ideologia de Gênero',
        5:  'A Falácia da Teologia Progressista',
        6:  'A Falácia do Humanismo',
        7:  'A Falácia da Teoria Darwiniana',
        8:  'A Falácia do Pragmatismo',
        9:  'A Falácia do Ateísmo',
        10: 'A Falácia da Teoria do Deísmo',
        11: 'A Falácia da Teologia da Prosperidade',
        12: 'A Falácia do Triunfalismo',
        13: 'O Discernimento do Cristão',
      },
      adolescentes: {
        1:  'Jesus, o Mestre que Ensinava por Parábolas',
        2:  'Uma História sobre a Oração',
        3:  'O Semeador e a Sua Semente',
        4:  'Uma História sobre Graça e Responsabilidade',
        5:  'O Reino de Deus e as Sementes',
        6:  'A Obediência Verdadeira',
        7:  'Achados e Perdidos no Reino',
        8:  'Você Está Preparado?',
        9:  'Uma Parábola sobre Israel',
        10: 'O Amor na Prática',
        11: 'Você Está Firme?',
        12: 'Uma História sobre Dinheiro',
        13: 'O Amor do Pai por Seus Filhos',
      },
      juniores: {
        1:  'O Nascimento de Moisés',
        2:  'Deus Chama um Libertador',
        3:  'A Aflição dos Hebreus e a Promessa de Liberdade',
        4:  'Deus Envia as Pragas',
        5:  'A Morte dos Primogênitos',
        6:  'A Primeira Páscoa',
        7:  'A Travessia pelo Mar Vermelho',
        8:  'Deus Manda o Alimento',
        9:  'A Família de Moisés',
        10: 'Os Dez Mandamentos',
        11: 'O Tabernáculo de Deus',
        12: 'As Pedras da Lei e o Bezerro de Ouro',
        13: 'Moisés, a Glória de Deus e a Terra Prometida',
      },
      primarios: {
        1:  'Deus Me Ensina um Livro Especial',
        2:  'Deus Me Ensina os Dez Mandamentos',
        3:  'Deus Me Ensina a Obedecer e a Agradecer',
        4:  'Deus Me Ensina sobre os Juízes',
        5:  'Deus Me Ensina a Ter um Coração Sincero',
        6:  'Deus Me Ensina a Ser Sábio',
        7:  'Deus Me Ensina sobre os Profetas',
        8:  'Deus Me Ensina sobre o Seu Filho Jesus',
        9:  'Jesus Me Ensina a Verdadeira Felicidade',
        10: 'Jesus Me Ensina sobre o Céu e a Salvação',
        11: 'Jesus Me Ensina a Amar como Ele Amou',
        12: 'Jesus Me Ensina a Evangelizar',
        13: 'Jesus Me Ensina a Me Preparar para a Sua Volta',
      },
    },
    3: {
      primarios: {
        1:  'As Crianças Que Receberam Uma Grande Promessa',
        2:  'A Criança Que Ajudou A Salvar O Irmão',
        3:  'Uma Criança Profeta',
        4:  'O Menino Rei',
        5:  'De Criança Órfã À Rainha',
        6:  'A Menina Que Salvou Um Guerreiro',
        7:  'Um Menino Pastor',
        8:  'O Deus Menino',
        9:  'As Crianças Que Foram Abençoadas Por Jesus',
        10: 'A Criança Que Virou Um Exemplo',
        11: 'A Criança Que Ressuscitou',
        12: 'A Criança Que Ajudou Jesus',
        13: 'Você É Uma Criança Escolhida Por Deus!',
      },
      juniores: {
        1:  'A Desobediência Do Povo De Deus',
        2:  'Deus Escolhe Libertadores',
        3:  'Otoniel e os Mesopotâmios',
        4:  'Eúde e os Moabitas',
        5:  'Sangar e os Filisteus',
        6:  'Débora E Baraque na Batalha Contra os Cananeus',
        7:  'Gideão Enfrenta os Midianitas',
        8:  'Abimeleque Lidera Israel',
        9:  'Jefté Livra Israel dos Amonitas',
        10: 'Jefté Batalha Contra os Efraimitas',
        11: 'O Nascimento E Vida De Sansão',
        12: 'Sansão Livra Israel dos Filisteus',
        13: 'Mica e o Levita em Sua Casa',
      },
      pre_adolescentes: {
        1:  'Dons Ministeriais para a Igreja',
        2:  'Dons Espirituais, o que Significam?',
        3:  'A Unidade da Igreja',
        4:  'O Fruto do Amor',
        5:  'Manifestações do Espírito Santo nos Crentes',
        6:  'O Papel do Talento Musical',
        7:  'Quem é o Pastor',
        8:  'Quem é o Presbítero?',
        9:  'Quem são os Obreiros e Diáconos?',
        10: 'O Funcionamento da Igreja',
        11: 'Cuidando dos Novos Convertidos',
        12: 'A Importância do Evangelismo',
        13: 'Trabalhando Com Missões',
      },
      adolescentes: {
        1:  'A Superioridade de Cristo',
        2:  'Cristo Entende Você',
        3:  'A Fé E O Nosso Relacionamento Com Deus',
        4:  'Mais Que Vencedor: Provas E Tentações',
        5:  'Fé E Obras',
        6:  'Uma Arma Poderosamente Mortal',
        7:  'A Santificação Necessária',
        8:  'O Propósito Do Sofrimento',
        9:  'Inimigo Íntimo',
        10: 'Uma Carta Para Você',
        11: 'Saiba Dizer "Não"!',
        12: 'Cuidado Com O Ego E Suas Ambições',
        13: 'Lute Por Sua Fé',
      },
      jovens: {
        1:  'O Livro de Juízes: Quando Cada um Fazia o que Parecia Certo',
        2:  'Fidelidade a Deus: Uma Questão de Escolha',
        3:  'Clamor e Libertação: A Liderança de Otniel',
        4:  'Eúde e Sangar: Deus Usa os Improváveis',
        5:  'Débora e Baraque: União para Fazer a Obra de Deus',
        6:  'Gideão: Deus Transforma a Insegurança em Coragem',
        7:  'O Fim da Liderança de Gideão e o Governo de Abimeleque',
        8:  'Jefté: De Rejeitado a Libertador',
        9:  'Sansão: A Força e a Fraqueza de um Jovem',
        10: 'Sansão: Entre Vitórias e Derrotas',
        11: 'Crise Espiritual e Falsa Religiosidade',
        12: 'Tempos de Decadência Moral e Maldade',
        13: 'Esperança em Meio ao Caos: Aguardando a Vinda do Rei',
      },
      adultos: {
        1:  'O Chamado para os Gentios',
        2:  'A Porta da Fé se Abre entre os Gentios',
        3:  'A Graça que Alcança todas as Nações',
        4:  'O Espírito que nos Guia para além das Fronteiras',
        5:  'Cristo entre os Filósofos: o Deus desconhecido se Revela',
        6:  'A Suficiência da Graça na Cidade de Corinto',
        7:  'Quando o Espírito Sopra em Éfeso',
        8:  'Despedida em Éfeso: entre Lágrimas e Alertas',
        9:  'Coragem para Testemunhar: Paulo diante da Multidão',
        10: 'Uma Esperança Inabalável perante os Poderosos',
        11: 'Entre Tempestades e Promessas',
        12: 'O Evangelho Chega ao Coração do Império',
        13: 'A Missão Continua em Nós',
      },
    },
  },
}

/** Retorna o título da lição específica de uma turma em um período */
export function getLicaoTema(turmaNome: string, ano: string | number, trimestre: number, aula: number): string | null {
  const cat = getTurmaCategoria(turmaNome)
  if (!cat) return null
  return LICOES_REVISTA[String(ano)]?.[trimestre]?.[cat]?.[aula] ?? null
}

/** Mapeia o nome de uma turma para a categoria de revista CPAD */
export function getTurmaCategoria(nome: string): string | null {
  const n = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (n.includes('adulto') || n.includes('heroi') || n.includes('herois') || n.includes('filha')) return 'adultos'
  if (n.includes('shekinah') || n.includes('jovem')) return 'jovens'
  if (n.includes('valente')) return 'pre_adolescentes'
  if (n.includes('adolesc') || n.includes('dynamo')) return 'adolescentes'
  if (n.includes('junior') || n.includes('guerreiro')) return 'juniores'
  if (n.includes('primar') || n.includes('cordeirinho')) return 'primarios'
  return null
}

/** Retorna o tema da revista para uma turma em um período */
export function getTemaRevista(turmaNome: string, ano: string | number, trimestre: number): string | null {
  const cat = getTurmaCategoria(turmaNome)
  if (!cat) return null
  return TEMAS_REVISTA[String(ano)]?.[trimestre]?.[cat] ?? null
}

/** Faixas etárias padrão da EBD */
export const FAIXAS_ETARIAS = [
  { label: 'Crianças (0–7)',       min: 0,  max: 7   },
  { label: 'Juniores (8–10)',        min: 8,  max: 10  },
  { label: 'Pré-Adolescentes (11–13)', min: 11, max: 13  },
  { label: 'Adolescentes (14–16)',     min: 14, max: 16  },
  { label: 'Jovens (17–25)',           min: 17, max: 25  },
  { label: 'Adultos (26+)',            min: 26, max: 999 },
]
