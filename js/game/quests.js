'use strict';

/* Missões: CRUD, dificuldades predefinidas e regras de recorrência.
   A missão é uma definição; as conclusões vivem em Game.state.completions. */

const DIFFICULTIES = {
  easy:   { label: 'Fácil',   xp: 10, gold: 5 },
  normal: { label: 'Normal',  xp: 25, gold: 10 },
  hard:   { label: 'Difícil', xp: 50, gold: 20 },
  epic:   { label: 'Épica',   xp: 100, gold: 40 },
};

// Dificuldade personalizada paga como uma missão normal.
const CUSTOM_QUEST_GOLD = 10;

// Bônus de economia (concedidos junto com a conclusão, nunca em dobro).
const ECONOMY = {
  catLevelUpBonus: 25,
  playerLevelUpBonus: 50,
  achievementBonus: 15,
};

const RECURRENCES = {
  once:    { label: 'Uma vez' },
  daily:   { label: 'Diária' },
  weekly:  { label: 'Semanal' },
  monthly: { label: 'Mensal' },
};

const Quests = {
  all() {
    return Game.state.quests;
  },

  get(id) {
    return Game.state.quests.find(q => q.id === id) || null;
  },

  create({ title, description = '', categoryId = null, difficulty = 'normal', xp, recurrence = 'once' }) {
    const quest = {
      id: Game.uid(),
      title: (title || '').trim(),
      description: (description || '').trim(),
      categoryId: categoryId && Categories.get(categoryId) ? categoryId : null,
      difficulty: DIFFICULTIES[difficulty] ? difficulty : 'normal',
      xp: Math.max(1, Math.min(99999, Math.floor(Number(xp) || 0))),
      recurrence: RECURRENCES[recurrence] ? recurrence : 'once',
      createdAt: new Date().toISOString(),
    };
    if (!quest.title) return null;
    Game.state.quests.push(quest);
    Game.save();
    return quest;
  },

  update(id, patch) {
    const q = this.get(id);
    if (!q) return null;
    if (patch.title !== undefined) q.title = String(patch.title).trim() || q.title;
    if (patch.description !== undefined) q.description = String(patch.description).trim();
    if (patch.categoryId !== undefined) {
      q.categoryId = patch.categoryId && Categories.get(patch.categoryId) ? patch.categoryId : null;
    }
    if (patch.difficulty !== undefined && DIFFICULTIES[patch.difficulty]) q.difficulty = patch.difficulty;
    if (patch.recurrence !== undefined && RECURRENCES[patch.recurrence]) q.recurrence = patch.recurrence;
    if (patch.xp !== undefined) q.xp = Math.max(1, Math.min(99999, Math.floor(Number(patch.xp) || q.xp)));
    Game.save();
    return q;
  },

  remove(id) {
    // O histórico de conclusões é preservado mesmo sem a missão.
    Game.state.quests = Game.state.quests.filter(q => q.id !== id);
    Game.save();
  },

  /* ---------- conclusões / histórico ---------- */

  completionsFor(questId) {
    return Game.state.completions.filter(c => c.questId === questId);
  },

  lastCompletion(questId) {
    let last = null;
    for (const c of this.completionsFor(questId)) {
      if (!last || c.at > last.at) last = c;
    }
    return last;
  },

  /* ---------- recorrência ---------- */

  _pad(n) { return String(n).padStart(2, '0'); },

  /**
   * Chave do período (dia/semana/mês) a que um instante pertence.
   * Semanas começam na segunda-feira; usa sempre data local.
   */
  periodKey(at, recurrence) {
    const d = new Date(at);
    if (recurrence === 'daily') {
      return `${d.getFullYear()}-${this._pad(d.getMonth() + 1)}-${this._pad(d.getDate())}`;
    }
    if (recurrence === 'weekly') {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return `w${monday.getFullYear()}-${this._pad(monday.getMonth() + 1)}-${this._pad(monday.getDate())}`;
    }
    if (recurrence === 'monthly') {
      return `${d.getFullYear()}-${this._pad(d.getMonth() + 1)}`;
    }
    return null; // 'once' não tem período
  },

  /** A missão pode ser concluída agora? */
  isAvailable(quest, now = new Date()) {
    const comps = this.completionsFor(quest.id);
    if (quest.recurrence === 'once') return comps.length === 0;
    const key = this.periodKey(now, quest.recurrence);
    return !comps.some(c => this.periodKey(c.at, quest.recurrence) === key);
  },

  availableQuests() {
    return this.all().filter(q => this.isAvailable(q));
  },

  // Rótulos de feedback ("✓ COMPLETA HOJE", "disponível novamente amanhã").
  doneLabel(recurrence) {
    return { daily: 'COMPLETA HOJE', weekly: 'COMPLETA ESTA SEMANA', monthly: 'COMPLETA ESTE MÊS' }[recurrence] || 'Concluída';
  },

  nextLabel(recurrence) {
    return { daily: 'amanhã', weekly: 'na próxima semana', monthly: 'no próximo mês' }[recurrence] || '';
  },
};
