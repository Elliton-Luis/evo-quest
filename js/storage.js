'use strict';

/* Persistência em localStorage com versionamento.
   A KEY nunca muda: saves antigos são migrados no carregamento,
   preservando todo o progresso do usuário. */

const Storage = {
  KEY: 'lifequest_save_v1',
  VERSION: 4,

  save(state) {
    try {
      state.version = this.VERSION;
      localStorage.setItem(this.KEY, JSON.stringify(state));
    } catch (e) {
      console.error('LifeQuest: falha ao salvar.', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const state = this.migrate(JSON.parse(raw));
      return Game.isValidState(state) ? state : null;
    } catch (e) {
      console.error('LifeQuest: save corrompido.', e);
      return null;
    }
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /* ---------- migrações ---------- */

  migrate(state) {
    if (!state || typeof state !== 'object') return null;

    // v1 → v2: descrição nas categorias, flags de personalização no player.
    if (!state.version || state.version < 2) {
      if (state.player) {
        state.player.customClass ??= false;
        state.player.createdCustomCategory ??= false;
      }
      for (const cat of state.categories || []) cat.desc ??= '';
      state.version = 2;
    }

    // v2 → v3: missões ganham title/description/difficulty/recurrence,
    // histórico vira lista própria (completions) e contadores derivados somem.
    if (state.version < 3) {
      const p = state.player || {};
      const createdAt = p.createdAt || new Date().toISOString();

      p.customClass ??= false;
      p.createdCategory = p.createdCustomCategory
        ?? (Array.isArray(state.categories) && state.categories.length > 0);
      delete p.createdCustomCategory;

      for (const c of state.categories || []) {
        c.description = c.desc ?? '';
        delete c.desc;
        c.createdAt ??= createdAt;
      }

      const inferDifficulty = xp =>
        xp <= 10 ? 'easy' : xp <= 25 ? 'normal' : xp <= 50 ? 'hard' : 'epic';

      const completions = [];
      let doneCount = 0;
      for (const q of state.quests || []) {
        if (q.name !== undefined) { q.title = q.name; delete q.name; }
        if (q.desc !== undefined) { q.description = q.desc; delete q.desc; }
        q.difficulty ??= inferDifficulty(q.xp || 0);
        q.recurrence ??= 'once';
        q.createdAt ??= createdAt;
        if (q.done) {
          doneCount++;
          completions.push({
            id: this.uid(),
            questId: q.id,
            recurrence: 'once',
            xp: q.xp || 0,
            at: q.doneAt || createdAt,
          });
        }
        delete q.done;
        delete q.doneAt;
      }

      // O contador antigo podia ser maior que o histórico reconstruído
      // (missões já excluídas). Preserva o total como entradas de legado.
      const legacy = Math.max(0, (p.completedCount || 0) - doneCount);
      for (let i = 0; i < legacy; i++) {
        completions.push({
          id: this.uid(),
          questId: null,
          recurrence: 'once',
          xp: 0,
          at: createdAt,
        });
      }

      state.completions = completions;
      delete p.completedCount;
      state.version = 3;
    }

    // v3 → v4: avatar do personagem, carteira de Gold e inventário cosmético.
    if (state.version < 4) {
      const p = state.player;
      p.avatarId ??= 'default';
      state.wallet ??= { gold: 0 };
      state.inventory ??= {
        owned: [],
        equipped: {
          avatar: null,
          head: null,
          body: null,
          accessory: null,
          background: null,
        },
      };
      state.version = 4;
    }

    return state;
  },

  clear() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) { /* ignora */ }
  },
};
