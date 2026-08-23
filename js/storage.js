'use strict';

/* Persistência em localStorage. Nenhuma outra forma de armazenamento. */

const Storage = {
  KEY: 'lifequest_save_v1',

  save(state) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(state));
    } catch (e) {
      console.error('LifeQuest: falha ao salvar.', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      return Game.isValidState(state) ? state : null;
    } catch (e) {
      console.error('LifeQuest: save corrompido.', e);
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) { /* ignora */ }
  },
};
