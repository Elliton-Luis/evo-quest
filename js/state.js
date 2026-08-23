'use strict';

/* Estado central do jogo. Orquestra os módulos de game/ e é a única
   porta de entrada da UI para a lógica. Estatísticas são derivadas
   (single source of truth): nada é contado em dois lugares. */

const Game = {
  state: null,

  /* ----- ciclo de vida ----- */

  isValidState(s) {
    return !!s && typeof s === 'object' &&
      Array.isArray(s.categories) && Array.isArray(s.quests) &&
      Array.isArray(s.completions) && Array.isArray(s.achievements) &&
      s.player && typeof s.player.name === 'string';
  },

  load() {
    this.state = Storage.load();
    if (this.state) this.normalize();
    return this.state;
  },

  /**
   * Garante que TODOS os campos esperados existam, independente da idade
   * do save. Assim nenhuma tela quebra por propriedade ausente.
   */
  normalize() {
    const s = this.state;
    s.player ??= {};
    s.player.avatarId ??= 'default';
    s.player.customClass ??= false;
    s.player.createdCategory ??= false;
    s.player.level ??= 1;
    s.player.totalXp ??= 0;
    s.categories ??= [];
    s.quests ??= [];
    s.completions ??= [];
    s.achievements ??= [];
    s.regras ??= [];

    s.wallet ??= { gold: 0 };
    if (!Number.isFinite(s.wallet.gold) || s.wallet.gold < 0) {
      s.wallet.gold = Math.max(0, Math.floor(Number(s.wallet.gold) || 0));
    }

    s.inventory ??= {};
    s.inventory.owned ??= [];
    s.inventory.equipped = {
      avatar: null, head: null, body: null,
      accessory: null, background: null,
      ...s.inventory.equipped,
    };
    // equipamentos que não correspondem a itens conhecidos são limpos
    for (const slot of Object.keys(s.inventory.equipped)) {
      const id = s.inventory.equipped[slot];
      if (id && !Shop.get(id)) s.inventory.equipped[slot] = null;
    }
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

  /* ----- personagem ----- */

  createPlayer(name, className, isCustomClass = false) {
    this.state = {
      player: {
        name: name.trim() || 'Aventureiro',
        class: className,
        customClass: !!isCustomClass,
        createdCategory: false, // vira true ao criar a 1ª categoria
        avatarId: 'default',
        level: 1,
        totalXp: 0,
        createdAt: new Date().toISOString(),
      },
      categories: [], // o jogador cria os próprios atributos
      quests: [],
      completions: [], // histórico: {id, questId, recurrence, xp, at}
      achievements: [],
      regras: [], // compromissos recorrentes com streak/penalidade
      wallet: { gold: 0 },
      inventory: {
        owned: [],
        equipped: {
          avatar: null,
          head: null,
          body: null,
          accessory: null,
          background: null,
        },
      },
    };
    this.save();
    return this.state;
  },

  updatePlayer(patch) {
    Object.assign(this.state.player, patch);
    this.save();
  },

  /* ----- estatísticas derivadas (nunca armazenadas em duplicidade) ----- */

  stats() {
    const s = this.state;
    const playerXp = Xp.fromTotal(s.player.totalXp);
    return {
      completedQuests: s.completions.length,
      totalXp: s.player.totalXp,
      categoriesCount: s.categories.length,
      questsCount: s.quests.length,
      unlockedCount: s.achievements.length,
      achievementsTotal: Achievements.defs.length,
      playerLevel: playerXp.level,
      playerProgress: playerXp,
    };
  },

  /* ----- conclusão de missão (coração do jogo) ----- */

  /**
   * Conclui uma missão disponível e retorna todos os eventos ocorridos,
   * na ordem em que a UI deve exibi-los:
   * { quest, category, gainedXp, categoryLevelUp, playerLevelUp, unlocked[] }
   */
  completeQuest(id) {
    const quest = Quests.get(id);
    if (!quest || !Quests.isAvailable(quest)) return null;

    const category = quest.categoryId ? Categories.get(quest.categoryId) : null;
    const catBefore = category ? Xp.fromTotal(category.xp).level : 0;
    const playerBefore = Xp.fromTotal(this.state.player.totalXp).level;

    if (category) category.xp += quest.xp;
    this.state.player.totalXp += quest.xp;

    // 1. A conclusão é registrada ANTES de conceder recompensas:
    //    recarregar a página ou reconcluir nunca duplica Gold/XP.
    this.state.completions.push({
      id: this.uid(),
      questId: quest.id,
      recurrence: quest.recurrence,
      xp: quest.xp,
      at: new Date().toISOString(),
    });

    const catAfter = category ? Xp.fromTotal(category.xp).level : 0;
    const playerAfter = Xp.fromTotal(this.state.player.totalXp).level;
    this.state.player.level = playerAfter;

    const unlocked = Achievements.check(this.state);

    // 2. Recompensas de Gold (missão + bônus de level up e conquistas).
    const catLevelUp = catAfter > catBefore;
    const playerLevelUp = playerAfter > playerBefore;
    const goldEarned = quest.difficulty === 'custom'
      ? CUSTOM_QUEST_GOLD
      : DIFFICULTIES[quest.difficulty].gold;
    const goldBonus =
      (catLevelUp ? ECONOMY.catLevelUpBonus : 0) +
      (playerLevelUp ? ECONOMY.playerLevelUpBonus : 0) +
      unlocked.length * ECONOMY.achievementBonus;
    this.state.wallet.gold += goldEarned + goldBonus;

    this.save();

    return {
      quest,
      category,
      gainedXp: quest.xp,
      goldEarned,
      goldBonus,
      categoryLevelUp: catLevelUp ? { from: catBefore, to: catAfter } : null,
      playerLevelUp: playerLevelUp ? { from: playerBefore, to: playerAfter } : null,
      unlocked,
    };
  },
};
