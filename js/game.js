'use strict';

/* =====================================================================
   LifeQuest — lógica do jogo (sem manipulação de DOM)
   Estado central + regras de XP, níveis, missões e conquistas.
   ===================================================================== */

/* ---------- Fórmulas de XP / nível ---------- */

// XP necessário para sair do nível `level` (regra do MVP).
function xpForNext(level) {
  return 100 + level * 50;
}

// XP acumulado total exigido para ESTAR no nível `level`.
function cumulativeXpForLevel(level) {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpForNext(l);
  return sum;
}

// Deriva o nível a partir do XP total acumulado.
function levelFromTotalXp(totalXp) {
  let level = 1;
  let acc = 0;
  while (totalXp >= acc + xpForNext(level)) {
    acc += xpForNext(level);
    level++;
  }
  return { level, base: acc };
}

// Progresso visível dentro do nível atual.
function statsFromTotalXp(totalXp) {
  const { level, base } = levelFromTotalXp(totalXp);
  return {
    level,
    current: totalXp - base,   // XP dentro do nível atual
    needed: xpForNext(level),  // XP para o próximo nível
    total: totalXp,
  };
}

/* ---------- Conquistas (definições) ---------- */

const ACHIEVEMENT_DEFS = [
  {
    id: 'first_step',
    icon: '🥇',
    name: 'Primeiro Passo',
    desc: 'Complete sua primeira missão.',
    check: s => s.player.completedCount >= 1,
  },
  {
    id: 'adventurer',
    icon: '🗺️',
    name: 'Aventureiro',
    desc: 'Complete 10 missões.',
    check: s => s.player.completedCount >= 10,
  },
  {
    id: 'veteran',
    icon: '🛡️',
    name: 'Veterano',
    desc: 'Complete 50 missões.',
    check: s => s.player.completedCount >= 50,
  },
  {
    id: 'hero',
    icon: '⚔️',
    name: 'Herói',
    desc: 'Complete 100 missões.',
    check: s => s.player.completedCount >= 100,
  },
  {
    id: 'legend',
    icon: '👑',
    name: 'Lenda',
    desc: 'Complete 1000 missões.',
    check: s => s.player.completedCount >= 1000,
  },
  {
    id: 'first_level_up',
    icon: '⭐',
    name: 'Primeiro Level Up',
    desc: 'Alcance o nível 2 em qualquer categoria.',
    check: s => s.categories.some(c => statsFromTotalXp(c.xp).level >= 2),
  },
  {
    id: 'attribute_master',
    icon: '🔮',
    name: 'Mestre de um Atributo',
    desc: 'Alcance o nível 10 em qualquer categoria.',
    check: s => s.categories.some(c => statsFromTotalXp(c.xp).level >= 10),
  },
  {
    id: 'polymath',
    icon: '📚',
    name: 'Polímata',
    desc: 'Alcance o nível 5 em pelo menos 4 categorias.',
    check: s =>
      s.categories.filter(c => statsFromTotalXp(c.xp).level >= 5).length >= 4,
  },
  {
    id: 'centurion',
    icon: '⚔️',
    name: 'Centurião',
    desc: 'Complete 250 missões.',
    check: s => s.player.completedCount >= 250,
  },
  {
    id: 'tireless',
    icon: '💯',
    name: 'Incansável',
    desc: 'Complete 500 missões.',
    check: s => s.player.completedCount >= 500,
  },
  {
    id: 'first_master',
    icon: '🌟',
    name: 'Primeiro Mestre',
    desc: 'Alcance o nível 10 em qualquer categoria.',
    check: s => s.categories.some(c => statsFromTotalXp(c.xp).level >= 10),
  },
  {
    id: 'knowledge_master',
    icon: '🧠',
    name: 'Mestre do Conhecimento',
    desc: 'Alcance o nível 10 em duas categorias diferentes.',
    check: s =>
      s.categories.filter(c => statsFromTotalXp(c.xp).level >= 10).length >= 2,
  },
  {
    id: 'generalist',
    icon: '🌐',
    name: 'Generalista',
    desc: 'Tenha pelo menos 5 categorias criadas.',
    check: s => s.categories.length >= 5,
  },
  {
    id: 'xp_hoarder',
    icon: '💰',
    name: 'Acumulador de XP',
    desc: 'Acumule 1.000 XP total.',
    check: s => s.player.totalXp >= 1000,
  },
  {
    id: 'xp_treasure',
    icon: '💎',
    name: 'Tesouro de XP',
    desc: 'Acumule 5.000 XP total.',
    check: s => s.player.totalXp >= 5000,
  },
  {
    id: 'adventure_lord',
    icon: '👑',
    name: 'Senhor da Aventura',
    desc: 'Alcance o nível geral 10.',
    check: s => statsFromTotalXp(s.player.totalXp).level >= 10,
  },
  {
    id: 'war_veteran',
    icon: '🎖️',
    name: 'Veterano de Guerra',
    desc: 'Complete missões em pelo menos 4 categorias diferentes.',
    check: s =>
      s.categories.filter(c => c.completedCount > 0).length >= 4,
  },
  {
    id: 'explorer',
    icon: '🧭',
    name: 'Explorador',
    desc: 'Crie sua primeira categoria personalizada.',
    check: s => !!s.player.createdCustomCategory,
  },
  {
    id: 'own_identity',
    icon: '🎭',
    name: 'Identidade Própria',
    desc: 'Defina uma classe personalizada.',
    check: s => !!s.player.customClass,
  },
  {
    id: 'collector',
    icon: '🏆',
    name: 'Colecionador',
    desc: 'Desbloqueie 10 conquistas.',
    check: s => s.achievements.length >= 10,
  },
  {
    id: 'achievement_hunter',
    icon: '🏅',
    name: 'Caçador de Conquistas',
    desc: 'Desbloqueie 20 conquistas.',
    check: s => s.achievements.length >= 20,
  },
  {
    id: 'living_legend',
    icon: '🌠',
    name: 'Lenda Viva',
    desc: 'Desbloqueie todas as outras conquistas.',
    check: s =>
      ACHIEVEMENT_DEFS.every(
        d => d.id === 'living_legend' || s.achievements.some(a => a.id === d.id)
      ),
  },
];

const DEFAULT_CATEGORIES = [
  { icon: '💻', name: 'Programação' },
  { icon: '✝️', name: 'Catolicismo' },
  { icon: '🏛️', name: 'Latim' },
  { icon: '🧹', name: 'Organização' },
];

const SAMPLE_QUESTS = [
  { icon: '💻', cat: 'Programação',  name: '[EXEMPLO] Estudar Laravel por 1 hora', xp: 30 },
  { icon: '✝️', cat: 'Catolicismo',  name: '[EXEMPLO] Ler um capítulo da Bíblia', xp: 20 },
  { icon: '🏛️', cat: 'Latim',        name: '[EXEMPLO] Revisar declinações',       xp: 15 },
  { icon: '🧹', cat: 'Organização',  name: '[EXEMPLO] Organizar arquivos',        xp: 10 },
];

/* ---------- Objeto principal do jogo ---------- */

const Game = {
  state: null,

  /* ----- estado ----- */

  isValidState(s) {
    return !!s && typeof s === 'object' && Array.isArray(s.categories) &&
      Array.isArray(s.quests) && Array.isArray(s.achievements) &&
      s.player && typeof s.player.name === 'string';
  },

  load() {
    this.state = Storage.load();
    return this.state;
  },

  save() {
    if (this.state) Storage.save(this.state);
  },

  reset() {
    Storage.clear();
    this.state = null;
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /* ----- criação / personagem ----- */

  createPlayer(name, className, isCustomClass = false) {
    this.state = {
      player: {
        name: name.trim() || 'Aventureiro',
        class: className,
        customClass: !!isCustomClass,
        createdCustomCategory: false,
        level: 1,
        totalXp: 0,
        completedCount: 0,
        createdAt: new Date().toISOString(),
      },
      categories: DEFAULT_CATEGORIES.map(c => ({
        id: this.uid(),
        icon: c.icon,
        name: c.name,
        desc: '',
        xp: 0,
        completedCount: 0,
      })),
      quests: [],
      achievements: [], // {id, unlockedAt}
    };
    this.save();
    return this.state;
  },

  updatePlayer(patch) {
    Object.assign(this.state.player, patch);
    this.save();
  },

  addSampleQuests() {
    for (const q of SAMPLE_QUESTS) {
      const cat = this.state.categories.find(c => c.name === q.cat);
      if (!cat) continue;
      this.state.quests.push({
        id: this.uid(),
        name: q.name,
        desc: '',
        categoryId: cat.id,
        xp: q.xp,
        done: false,
        createdAt: new Date().toISOString(),
      });
    }
    this.save();
  },

  /* ----- categorias ----- */

  createCategory(name, icon, desc = '') {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const cat = {
      id: this.uid(),
      icon: icon.trim() || '⭐',
      name: cleanName,
      desc: (desc || '').trim(),
      xp: 0,
      completedCount: 0,
    };
    this.state.categories.push(cat);
    this.state.player.createdCustomCategory = true;
    this.save();
    return cat;
  },

  /** Renomear/trocar ícone NÃO mexe em XP nem nas missões vinculadas. */
  updateCategory(id, patch) {
    const cat = this.getCategory(id);
    if (!cat) return null;
    if (patch.name !== undefined) cat.name = String(patch.name).trim() || cat.name;
    if (patch.icon !== undefined) cat.icon = String(patch.icon).trim() || cat.icon;
    if (patch.desc !== undefined) cat.desc = String(patch.desc).trim();
    this.save();
    return cat;
  },

  deleteCategory(catId) {
    // Remove também as missões da categoria (o XP histórico já ganho é mantido).
    this.state.categories = this.state.categories.filter(c => c.id !== catId);
    this.state.quests = this.state.quests.filter(q => q.categoryId !== catId);
    this.save();
  },

  getCategory(catId) {
    return this.state.categories.find(c => c.id === catId) || null;
  },

  /* ----- missões ----- */

  createQuest({ name, desc, categoryId, xp }) {
    const quest = {
      id: this.uid(),
      name: name.trim(),
      desc: (desc || '').trim(),
      categoryId,
      xp: Math.max(1, Math.floor(Number(xp) || 0)),
      done: false,
      createdAt: new Date().toISOString(),
    };
    if (!quest.name || !this.getCategory(categoryId)) return null;
    this.state.quests.push(quest);
    this.save();
    return quest;
  },

  updateQuest(id, patch) {
    const quest = this.state.quests.find(q => q.id === id);
    if (!quest) return null;
    if (patch.name !== undefined) quest.name = String(patch.name).trim() || quest.name;
    if (patch.desc !== undefined) quest.desc = String(patch.desc).trim();
    if (patch.categoryId !== undefined && this.getCategory(patch.categoryId)) {
      quest.categoryId = patch.categoryId;
    }
    if (patch.xp !== undefined) quest.xp = Math.max(1, Math.floor(Number(patch.xp) || quest.xp));
    this.save();
    return quest;
  },

  deleteQuest(id) {
    this.state.quests = this.state.quests.filter(q => q.id !== id);
    this.save();
  },

  /**
   * Conclui uma missão aplicando XP e retornando todos os eventos
   * ocorridos, para que a UI exiba os feedbacks na ordem correta:
   * { quest, category, categoryLevelUp, playerLevelUp, unlocked[] }
   */
  completeQuest(id) {
    const quest = this.state.quests.find(q => q.id === id);
    if (!quest || quest.done) return null;
    const category = this.getCategory(quest.categoryId);
    if (!category) return null;

    quest.done = true;
    quest.doneAt = new Date().toISOString();

    const catBefore = statsFromTotalXp(category.xp).level;
    const playerBefore = statsFromTotalXp(this.state.player.totalXp).level;

    category.xp += quest.xp;
    category.completedCount += 1;
    this.state.player.totalXp += quest.xp;
    this.state.player.completedCount += 1;

    const catAfter = statsFromTotalXp(category.xp).level;
    const playerAfter = statsFromTotalXp(this.state.player.totalXp).level;

    this.state.player.level = playerAfter;

    const unlocked = this.checkAchievements();

    this.save();

    return {
      quest,
      category,
      gainedXp: quest.xp,
      categoryLevelUp: catAfter > catBefore
        ? { from: catBefore, to: catAfter }
        : null,
      playerLevelUp: playerAfter > playerBefore
        ? { from: playerBefore, to: playerAfter }
        : null,
      unlocked,
    };
  },

  /** Reabrir NÃO remove o XP ganho — mantém a simplicidade do MVP. */
  reopenQuest(id) {
    const quest = this.state.quests.find(q => q.id === id);
    if (quest) {
      quest.done = false;
      delete quest.doneAt;
      this.save();
    }
    return quest;
  },

  /* ----- conquistas ----- */

  isUnlocked(id) {
    return this.state.achievements.some(a => a.id === id);
  },

  unlockAchievement(def) {
    this.state.achievements.push({
      id: def.id,
      unlockedAt: new Date().toISOString(),
    });
  },

  /** Verifica todas as definições e desbloqueia as novas. Retorna as novas. */
  checkAchievements() {
    const newly = [];
    for (const def of ACHIEVEMENT_DEFS) {
      if (!this.isUnlocked(def.id) && def.check(this.state)) {
        this.unlockAchievement(def);
        newly.push(def);
      }
    }
    return newly;
  },
};
