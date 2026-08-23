'use strict';

/* Operações sobre categorias (atributos). Operam sobre Game.state.
   Nunca apagam missões: na exclusão, as missões ficam sem categoria
   ou são reatribuídas, conforme a escolha do usuário. */

const Categories = {
  all() {
    return Game.state.categories;
  },

  get(id) {
    return Game.state.categories.find(c => c.id === id) || null;
  },

  create({ name, icon, description = '' }) {
    const cleanName = (name || '').trim();
    if (!cleanName) return null;
    const cat = {
      id: Game.uid(),
      icon: (icon || '').trim() || '⭐',
      name: cleanName,
      description: (description || '').trim(),
      xp: 0,
      createdAt: new Date().toISOString(),
    };
    Game.state.categories.push(cat);
    Game.state.player.createdCategory = true;
    Game.save();
    return cat;
  },

  // Renomear/trocar ícone NÃO mexe em XP nem nas missões vinculadas.
  update(id, patch) {
    const cat = this.get(id);
    if (!cat) return null;
    if (patch.name !== undefined) cat.name = String(patch.name).trim() || cat.name;
    if (patch.icon !== undefined) cat.icon = String(patch.icon).trim() || cat.icon;
    if (patch.description !== undefined) cat.description = String(patch.description).trim();
    Game.save();
    return cat;
  },

  /**
   * Remove a categoria SEM apagar missões:
   *  - mode 'orphan'    → missões ficam sem categoria (categoryId: null);
   *  - mode 'reassign'  → missões vão para targetId.
   */
  remove(id, { mode = 'orphan', targetId = null } = {}) {
    if (!this.get(id)) return false;
    const s = Game.state;

    if (mode === 'reassign' && targetId && this.get(targetId)) {
      for (const q of s.quests) {
        if (q.categoryId === id) q.categoryId = targetId;
      }
    } else {
      for (const q of s.quests) {
        if (q.categoryId === id) q.categoryId = null;
      }
    }

    s.categories = s.categories.filter(c => c.id !== id);
    Game.save();
    return true;
  },
};
