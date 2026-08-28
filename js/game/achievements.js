'use strict';

/* Conquistas baseadas em dados: para adicionar uma nova, basta uma
   entrada em ACHIEVEMENT_DEFS. Nada de if/else espalhado pelo sistema. */

// ---- condições reutilizáveis ----

const Cond = {
  completions: n => s => s.completions.length >= n,
  totalXp: n => s => s.player.totalXp >= n,
  quests: n => s => s.quests.length >= n,
  cats: n => s => s.categories.length >= n,
  gold: n => s => (s.wallet?.gold || 0) >= n,
  catsAtLevel(level, count) {
    return s =>
      s.categories.filter(c => Xp.fromTotal(c.xp).level >= level).length >= count;
  },
  // categorias com ao menos 1 conclusão atribuída
  catsWithProgress: n => s => {
    const withProgress = new Set(
      s.completions
        .map(c => s.quests.find(q => q.id === c.questId)?.categoryId)
        .filter(Boolean)
    );
    return withProgress.size >= n;
  },
  unlocked: n => s => s.achievements.length >= n,
  // conclusões recorrentes em N períodos distintos (dias/semanas/meses)
  recurringPeriods(recurrence, distinct) {
    return s => {
      const keys = new Set(
        s.completions
          .filter(c => c.recurrence === recurrence)
          .map(c => Quests.periodKey(c.at, recurrence))
          .filter(Boolean)
      );
      return keys.size >= distinct;
    };
  },
};

// ---- definições ----

const ACHIEVEMENT_DEFS = [
  /* Progressão de missões */
  { id: 'first_step', icon: '🥇', name: 'Primeiro Passo', desc: 'Complete sua primeira missão.', condition: Cond.completions(1) },
  { id: 'adventurer', icon: '🗺️', name: 'Aventureiro', desc: 'Complete 10 missões.', condition: Cond.completions(10) },
  { id: 'veteran', icon: '🛡️', name: 'Veterano', desc: 'Complete 50 missões.', condition: Cond.completions(50) },
  { id: 'hero', icon: '⚔️', name: 'Herói', desc: 'Complete 100 missões.', condition: Cond.completions(100) },
  { id: 'legend', icon: '👑', name: 'Lenda', desc: 'Complete 1.000 missões.', condition: Cond.completions(1000) },
  { id: 'myth', icon: '🐉', name: 'Mito', desc: 'Complete 5.000 missões.', condition: Cond.completions(5000) },
  { id: 'immortal', icon: '🌌', name: 'Imortal', desc: 'Complete 10.000 missões.', condition: Cond.completions(10000) },

  /* XP */
  { id: 'first_reward', icon: '🎁', name: 'Primeira Recompensa', desc: 'Ganhe seu primeiro XP.', condition: Cond.totalXp(1) },
  { id: 'xp_collector', icon: '💰', name: 'Colecionador de XP', desc: 'Acumule 1.000 XP.', condition: Cond.totalXp(1000) },
  { id: 'xp_treasure', icon: '💎', name: 'Tesouro', desc: 'Acumule 5.000 XP.', condition: Cond.totalXp(5000) },
  { id: 'fortune', icon: '🍀', name: 'Fortuna', desc: 'Acumule 10.000 XP.', condition: Cond.totalXp(10000) },
  { id: 'xp_mountain', icon: '⛰️', name: 'Montanha de XP', desc: 'Acumule 50.000 XP.', condition: Cond.totalXp(50000) },
  { id: 'xp_peak', icon: '🏔️', name: 'Pico de XP', desc: 'Acumule 100.000 XP.', condition: Cond.totalXp(100000) },

  /* Níveis */
  { id: 'evolution', icon: '⬆️', name: 'Evolução', desc: 'Alcance o nível 2 em qualquer categoria.', condition: Cond.catsAtLevel(2, 1) },
  { id: 'attribute_veteran', icon: '🎖️', name: 'Veterano de Atributo', desc: 'Alcance o nível 5 em qualquer categoria.', condition: Cond.catsAtLevel(5, 1) },
  { id: 'master', icon: '🔮', name: 'Mestre', desc: 'Alcance o nível 10 em qualquer categoria.', condition: Cond.catsAtLevel(10, 1) },
  { id: 'grand_master', icon: '🏅', name: 'Grande Mestre', desc: 'Alcance o nível 20 em qualquer categoria.', condition: Cond.catsAtLevel(20, 1) },
  { id: 'archmage', icon: '🧙', name: 'Arquimago', desc: 'Alcance o nível 30 em qualquer categoria.', condition: Cond.catsAtLevel(30, 1) },
  { id: 'ascended', icon: '✨', name: 'Ascendido', desc: 'Alcance o nível 50 em qualquer categoria.', condition: Cond.catsAtLevel(50, 1) },

  /* Diversidade */
  { id: 'first_attribute', icon: '🌱', name: 'Primeiro Atributo', desc: 'Crie sua primeira categoria.', condition: s => !!s.player.createdCategory },
  { id: 'specialist', icon: '🎯', name: 'Especialista', desc: 'Alcance o nível 10 em uma categoria.', condition: Cond.catsAtLevel(10, 1) },
  { id: 'generalist', icon: '🌐', name: 'Generalista', desc: 'Tenha 3 categorias diferentes.', condition: Cond.cats(3) },
  { id: 'polymath', icon: '📚', name: 'Polímata', desc: 'Tenha 5 categorias diferentes.', condition: Cond.cats(5) },
  { id: 'renaissance', icon: '🎓', name: 'Renascimento', desc: 'Tenha 8 categorias diferentes.', condition: Cond.cats(8) },
  { id: 'master_of_all', icon: '🧩', name: 'Mestre em Tudo', desc: 'Alcance o nível 5 em pelo menos 5 categorias.', condition: Cond.catsAtLevel(5, 5) },
  { id: 'jack_of_all', icon: '🃏', name: 'Faz-Tudo', desc: 'Tenha progresso em 10 categorias diferentes.', condition: Cond.catsWithProgress(10) },

  /* Recorrência */
  { id: 'routine', icon: '🔁', name: 'Rotina', desc: 'Complete missões diárias em 7 dias diferentes.', condition: Cond.recurringPeriods('daily', 7) },
  { id: 'habit', icon: '🔄', name: 'Hábito', desc: 'Complete missões diárias em 30 dias diferentes.', condition: Cond.recurringPeriods('daily', 30) },
  { id: 'consistency', icon: '📅', name: 'Constância', desc: 'Complete missões semanais em 4 semanas diferentes.', condition: Cond.recurringPeriods('weekly', 4) },
  { id: 'marathon', icon: '🏃', name: 'Maratona', desc: 'Complete missões semanais em 12 semanas diferentes.', condition: Cond.recurringPeriods('weekly', 12) },
  { id: 'full_cycle', icon: '🌗', name: 'Ciclo Completo', desc: 'Complete missões mensais em 3 meses diferentes.', condition: Cond.recurringPeriods('monthly', 3) },

  /* Exploração */
  { id: 'first_journey', icon: '🚀', name: 'Primeira Jornada', desc: 'Crie sua primeira missão.', condition: Cond.quests(1) },
  { id: 'quest_arsenal', icon: '🎒', name: 'Arsenal de Missões', desc: 'Tenha 10 missões cadastradas.', condition: Cond.quests(10) },
  { id: 'planner', icon: '🗒️', name: 'Planejador', desc: 'Tenha 25 missões cadastradas.', condition: Cond.quests(25) },
  { id: 'strategist', icon: '♟️', name: 'Estrategista', desc: 'Tenha 50 missões cadastradas.', condition: Cond.quests(50) },
  { id: 'architect', icon: '🏗️', name: 'Arquiteto', desc: 'Tenha 100 missões cadastradas.', condition: Cond.quests(100) },

  /* Gold */
  { id: 'first_gold', icon: '🪙', name: 'Primeira Moeda', desc: 'Acumule 100 Gold.', condition: Cond.gold(100) },
  { id: 'hoarder', icon: '💰', name: 'Acumulador', desc: 'Acumule 1.000 Gold.', condition: Cond.gold(1000) },
  { id: 'millionaire', icon: '💸', name: 'Milionário', desc: 'Acumule 10.000 Gold.', condition: Cond.gold(10000) },

  /* Especiais */
  { id: 'first_level_up', icon: '⭐', name: 'Primeiro Level Up', desc: 'Suba de nível pela primeira vez.',
    condition: s => Xp.fromTotal(s.player.totalXp).level >= 2 || Cond.catsAtLevel(2, 1)(s) },
  { id: 'multiclass', icon: '🎭', name: 'Multiclasse', desc: 'Tenha progresso em pelo menos 3 categorias.', condition: Cond.catsWithProgress(3) },
  { id: 'collector', icon: '🏆', name: 'Colecionador', desc: 'Desbloqueie 10 conquistas.', condition: Cond.unlocked(10) },
  { id: 'achievement_hunter', icon: '🏅', name: 'Caçador de Conquistas', desc: 'Desbloqueie 25 conquistas.', condition: Cond.unlocked(25) },
  { id: 'achievement_master', icon: '🎖️', name: 'Mestre das Conquistas', desc: 'Desbloqueie 40 conquistas.', condition: Cond.unlocked(40) },
  {
    id: 'living_legend', icon: '🌠', name: 'Lenda Viva', desc: 'Desbloqueie todas as outras conquistas.',
    condition: s => ACHIEVEMENT_DEFS.every(
      d => d.id === 'living_legend' || s.achievements.some(a => a.id === d.id)
    ),
  },
];

const Achievements = {
  defs: ACHIEVEMENT_DEFS,

  isUnlocked(state, id) {
    return state.achievements.some(a => a.id === id);
  },

  /** Verifica todas as definições; desbloqueia e retorna as novas. */
  check(state) {
    const newly = [];
    for (const def of ACHIEVEMENT_DEFS) {
      if (!this.isUnlocked(state, def.id) && def.condition(state)) {
        state.achievements.push({
          id: def.id,
          unlockedAt: new Date().toISOString(),
        });
        newly.push(def);
      }
    }
    return newly;
  },
};
