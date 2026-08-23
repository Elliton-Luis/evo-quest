'use strict';

/* Persistência em localStorage com versionamento.
   A KEY nunca muda: saves antigos são migrados no carregamento. */

const Storage = {
  KEY: 'lifequest_save_v1',
  VERSION: 2,

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

  /** Converte saves de versões antigas para o formato atual. */
  migrate(state) {
    if (!state || typeof state !== 'object') return null;

    // v1 → v2: categorias ganham descrição; player ganha flags de personalização.
    if (!state.version || state.version < 2) {
      state.version = 2;
      if (state.player) {
        state.player.customClass ??= false;
        state.player.createdCustomCategory ??= false;
      }
      for (const cat of state.categories || []) {
        cat.desc ??= '';
      }
    }

    return state;
  },

  clear() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) { /* ignora */ }
  },
};
