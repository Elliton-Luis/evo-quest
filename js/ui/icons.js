'use strict';

/* Catálogo de ícones para categorias: favoritos, grupos temáticos e
   metadados de busca. Somente dados + helpers puros (sem DOM). */

const ICON_CATEGORIES = [
  { id: 'conhecimento', label: 'Conhecimento', icons: ['📚', '📖', '📝', '✏️', '🧠', '💡', '🎓', '🔬'] },
  { id: 'tecnologia',   label: 'Tecnologia',   icons: ['💻', '🖥️', '🖱️', '⌨️', '📱', '⚙️', '🔧', '🤖'] },
  { id: 'trabalho',     label: 'Trabalho',     icons: ['💼', '🏢', '📊', '📈', '📋', '📁', '🤝', '🏆'] },
  { id: 'exercicios',   label: 'Exercícios',   icons: ['🏋️', '🏃', '🚴', '🏊', '🤸', '🧘', '⚽', '🥊'] },
  { id: 'criatividade', label: 'Criatividade', icons: ['🎨', '🖌️', '🎭', '🎬', '📷', '🎵', '🎸', '🎹', '🎤'] },
  { id: 'organizacao',  label: 'Organização',  icons: ['🧹', '🧽', '🧼', '🧺', '📦', '🗂️', '🏠'] },
  { id: 'financas',     label: 'Finanças',     icons: ['💰', '🪙', '💵', '💳', '🏦', '📈', '🧾'] },
  { id: 'alimentacao',  label: 'Alimentação',  icons: ['🍎', '🍊', '🍌', '🍇', '🍓', '🥑', '🥕', '🥦', '🍳', '🍲'] },
  { id: 'social',       label: 'Social',       icons: ['👥', '🤝', '❤️', '💬', '🗣️', '👋', '🎉', '🎁'] },
  { id: 'viagem',       label: 'Viagem',       icons: ['✈️', '🚗', '🚂', '🚆', '🚢', '🗺️', '🧭', '🏕️', '🌎'] },
  { id: 'entretenimento', label: 'Entretenimento', icons: ['🎮', '🕹️', '👾', '🎲', '🃏', '♟️', '🎯'] },
  { id: 'musica',       label: 'Música',       icons: ['🎵', '🎶', '🎼', '🎤', '🎧', '🎸', '🎹', '🥁', '🎻'] },
  { id: 'ciencia',      label: 'Ciência',      icons: ['🔬', '🧪', '🧬', '🔭', '⚗️', '🧫', '🧲', '📐'] },
  { id: 'natureza',     label: 'Natureza',     icons: ['🌱', '🌿', '🌳', '🌲', '🌻', '🌺', '🍀', '🦋', '🐝', '🐢'] },
  { id: 'metas',        label: 'Metas',        icons: ['🚀', '🎯', '🏆', '🥇', '⭐', '🌟', '🔥', '💎', '👑'] },
  { id: 'geral',        label: 'Geral',        icons: ['✨', '⚔️', '🛡️', '🙏', '🛠️', '⭐', '🌟', '🔥', '💎', '🎯', '🏆', '🚀', '❤️', '🧭'] },
];

/* Primeira visualização do seletor: poucos, úteis, sem poluição. */
const FAVORITE_ICONS = [
  '📚', '💻', '💼', '🏋️', '🎨', '🌱',
  '🧹', '💰', '🏠', '🍎', '👥', '✈️',
  '🎮', '🎵', '🧪', '🛠️', '🌎', '🎯',
  '🙏', '🧠', '🚀', '⭐', '🔥', '👑',
];

/* Palavras-chave extras para busca (o rótulo do grupo também é pesquisável). */
const ICON_KEYWORDS = {
  '📚': ['estudo', 'livro', 'leitura'],
  '💻': ['tecnologia', 'computador', 'programacao', 'codigo'],
  '🖥️': ['tecnologia', 'monitor', 'pc'],
  '📱': ['tecnologia', 'celular'],
  '⚙️': ['configuracao', 'sistema'],
  '🤖': ['ia', 'robotica', 'automacao'],
  '💼': ['emprego', 'carreira'],
  '📈': ['crescimento', 'progresso'],
  '🏆': ['vitoria', 'premio', 'meta'],
  '🏋️': ['academia', 'musculacao', 'forca'],
  '🏃': ['corrida', 'cardio'],
  '🧘': ['meditacao', 'yoga', 'calma'],
  '⚽': ['futebol', 'esporte'],
  '🎨': ['arte', 'desenho', 'pintura'],
  '🎬': ['cinema', 'filme', 'serie'],
  '📷': ['foto', 'fotografia'],
  '🎵': ['som', 'cancao'],
  '🎸': ['instrumento', 'violao'],
  '🧹': ['limpeza', 'arrumar'],
  '🏠': ['casa', 'lar'],
  '💰': ['dinheiro', 'economia', 'poupanca'],
  '🪙': ['moeda', 'gold'],
  '🍎': ['fruta', 'comida saudavel', 'dieta'],
  '🥦': ['vegetal', 'verdura'],
  '🍳': ['cozinhar', 'refeicao'],
  '👥': ['amigos', 'familia', 'pessoas'],
  '❤️': ['amor', 'relacionamento', 'saude'],
  '💬': ['conversa', 'comunicacao'],
  '🎉': ['festa', 'celebracao'],
  '✈️': ['aviao', 'viagem'],
  '🎮': ['jogo', 'videogame'],
  '🎲': ['sorte', 'jogo de mesa'],
  '🎧': ['escutar', 'podcast'],
  '🥁': ['bateria', 'percussao'],
  '🔬': ['pesquisa', 'laboratorio'],
  '🧪': ['experimento', 'quimica'],
  '🔭': ['astronomia', 'estrelas'],
  '📐': ['matematica', 'geometria'],
  '🌱': ['planta', 'crescimento pessoal'],
  '🌿': ['natureza', 'verde'],
  '🦋': ['transformacao'],
  '🐝': ['abelha', 'produtividade'],
  '🚀': ['espaco', 'lançar', 'comecar'],
  '🎯': ['foco', 'objetivo', 'alvo'],
  '🔥': ['intensidade', 'streak'],
  '💎': ['raro', 'precioso'],
  '👑': ['rei', 'mestre'],
  '⭐': ['estrela', 'favorito'],
  '🌟': ['brilho', 'destaque'],
  '✨': ['magia', 'inspiracao'],
  '⚔️': ['batalha', 'guerra', 'rpg'],
  '🛡️': ['defesa', 'protecao'],
  '🧭': ['direcao', 'bussola'],
  '🙏': ['fe', 'gratidao', 'oracao'],
  '🛠️': ['ferramentas', 'construcao', 'maker'],
  '🧠': ['mente', 'aprendizado', 'memoria'],
  '💡': ['ideia', 'insight'],
  '📝': ['escrever', 'anotacoes', 'diario'],
  '📖': ['biblia', 'texto'],
  '🤝': ['acordo', 'compromisso'],
  '🎁': ['presente', 'recompensa'],
  '🌍': ['mundo'],
  '🌎': ['mundo', 'planeta'],
  '🏕️': ['camping', 'aventura'],
  '🚴': ['bike', 'cicismo'],
  '🏊': ['natacao'],
  '🥊': ['boxe', 'luta'],
  '🧺': ['roupas', 'lavanderia'],
  '📦': ['caixa', 'entrega'],
  '💵': ['nota', 'dinheiro'],
  '💳': ['cartao', 'gasto'],
  '🏦': ['banco', 'investimento'],
  '🧾': ['conta', 'recibo'],
  '🏢': ['escritorio', 'empresa'],
  '📁': ['arquivos', 'documentos'],
  '📋': ['lista', 'checklist'],
  '⌨️': ['digitar', 'teclado'],
  '🖱️': ['mouse'],
  '🔧': ['ajustar', 'manutencao'],
  '🧲': ['fisica'],
  '🧬': ['genetica', 'biologia'],
  '⚗️': ['alquimia'],
  '🧫': ['microbiologia'],
  '🎹': ['piano', 'teclado musical'],
  '🎤': ['cantar', 'voz'],
  '🎻': ['cordas', 'classico'],
  '🎶': ['melodia'],
  '🎼': ['partitura'],
  '♟️': ['xadrez', 'estrategia'],
  '🃏': ['cartas'],
  '👾': ['arcade', 'retro'],
  '🕹️': ['controle', 'video game'],
  '🥑': ['abacate'],
  '🥕': ['legume'],
  '🍲': ['sopa', 'comida'],
  '🍌': ['banana'],
  '🍊': ['laranja'],
  '🍇': ['uva'],
  '🍓': ['morango'],
  '🌳': ['árvore'],
  '🌲': ['floresta'],
  '🌻': ['girassol', 'flor'],
  '🌺': ['flor'],
  '🍀': ['trevo', 'sorte'],
  '🐢': ['constancia', 'devagar'],
  '🚂': ['trem'],
  '🚆': ['trem'],
  '🚗': ['carro'],
  '🚢': ['navio'],
  '🗺️': ['mapa', 'planejamento'],
  '🗣️': ['falar', 'idioma'],
  '👋': ['oi', 'cumprimento'],
  '🏢': ['trabalho presencial'],
  '🎓': ['formatura', 'faculdade', 'universidade'],
};

const Icons = {
  favorites: FAVORITE_ICONS,
  categories: ICON_CATEGORIES,

  /** Remove acentos e padroniza para busca insensível a maiúsculas. */
  normalize(str) {
    return String(str || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  _keywordsFor(emoji) {
    const out = new Set(ICON_KEYWORDS[emoji] || []);
    for (const group of ICON_CATEGORIES) {
      if (group.icons.includes(emoji)) out.add(this.normalize(group.label));
    }
    return out;
  },

  /** Busca por palavra-chave, rótulo de grupo ou próprio emoji. */
  search(query) {
    const q = this.normalize(query);
    if (!q) return [];
    const seen = new Set();
    const results = [];
    for (const group of ICON_CATEGORIES) {
      for (const emoji of group.icons) {
        if (seen.has(emoji)) continue;
        const match =
          emoji === query.trim() ||
          [...this._keywordsFor(emoji)].some(kw => kw.includes(q));
        if (match) { seen.add(emoji); results.push(emoji); }
      }
    }
    // favoritos que só existem fora dos grupos (ex.: 🙏, 🛠️ já estão no geral)
    for (const emoji of FAVORITE_ICONS) {
      if (seen.has(emoji)) continue;
      if ([...this._keywordsFor(emoji)].some(kw => kw.includes(q))) {
        seen.add(emoji); results.push(emoji);
      }
    }
    return results;
  },
};
