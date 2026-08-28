'use strict';

/* Loja cosmética: itens baseados em dados, raridade visual, compra,
   inventário e equipamento. Nenhuma lógica específica por item:
   adicionar um item novo é acrescentar uma entrada em SHOP_ITEMS. */

const RARITIES = {
  common:    { label: 'Comum' },
  uncommon:  { label: 'Incomum' },
  rare:      { label: 'Raro' },
  epic:      { label: 'Épico' },
  legendary: { label: 'Lendário' },
};

// Avatares básicos, sempre disponíveis (escolha livre no perfil).
const BASIC_AVATARS = [
  { id: 'default',    icon: '🧙' },
  { id: 'elf',        icon: '🧝' },
  { id: 'astronaut',  icon: '🧑‍🚀' },
  { id: 'scientist',  icon: '🧑‍🔬' },
  { id: 'artist',     icon: '🧑‍🎨' },
  { id: 'coder',      icon: '🧑‍💻' },
  { id: 'shield',     icon: '🛡️' },
  { id: 'sword',      icon: '⚔️' },
];

const SLOTS = ['avatar'];

/* price null → item desbloqueado por conquista (unlockAchievement). */
const SHOP_ITEMS = [
  /* Avatares humanos */
  { id: 'av-wizard',    name: 'Arquimago',      type: 'avatar', icon: '🧙‍♂️', price: 100,  rarity: 'rare' },
  { id: 'av-fencer',    name: 'Esgrimista',     type: 'avatar', icon: '🤺',   price: 150,  rarity: 'rare' },
  { id: 'av-knight',    name: 'Cavaleiro',      type: 'avatar', icon: '🛡️',   price: 120,  rarity: 'rare' },
  { id: 'av-ninja',     name: 'Ninja',          type: 'avatar', icon: '🥷',   price: 180,  rarity: 'rare' },
  { id: 'av-viking',    name: 'Viking',         type: 'avatar', icon: '🪓',   price: 180,  rarity: 'rare' },
  { id: 'av-superhero', name: 'Super-Herói',    type: 'avatar', icon: '🦸',   price: 300,  rarity: 'epic' },
  { id: 'av-supervillain', name: 'Vilão',       type: 'avatar', icon: '🦹',   price: 300,  rarity: 'epic' },
  { id: 'av-king',      name: 'Rei',            type: 'avatar', icon: '🤴',   price: 350,  rarity: 'epic' },
  { id: 'av-queen',     name: 'Rainha',         type: 'avatar', icon: '👸',   price: 350,  rarity: 'epic' },
  { id: 'av-princess',  name: 'Princesa',       type: 'avatar', icon: '👸🏽',  price: 350,  rarity: 'epic' },

  /* Avatares fantásticos */
  { id: 'av-vampire',   name: 'Vampiro',        type: 'avatar', icon: '🧛',   price: 250,  rarity: 'epic' },
  { id: 'av-zombie',    name: 'Zumbi',          type: 'avatar', icon: '🧟',   price: 700,  rarity: 'epic' },
  { id: 'av-genie',     name: 'Gênio',          type: 'avatar', icon: '🧞',   price: 700,  rarity: 'epic' },
  { id: 'av-fairy',     name: 'Fada',           type: 'avatar', icon: '🧚',   price: 750,  rarity: 'epic' },
  { id: 'av-goblin',    name: 'Duende',         type: 'avatar', icon: '👺',   price: 750,  rarity: 'epic' },
  { id: 'av-ogre',      name: 'Ogro',           type: 'avatar', icon: '🧌',   price: 1400, rarity: 'legendary' },
  { id: 'av-demon',     name: 'Demônio',        type: 'avatar', icon: '👹',   price: 1300, rarity: 'legendary' },
  { id: 'av-gargoyle',  name: 'Gárgula',        type: 'avatar', icon: '👿',   price: 1200, rarity: 'legendary' },
  { id: 'av-angel',     name: 'Anjo',           type: 'avatar', icon: '😇',   price: 900,  rarity: 'legendary' },

  /* Avatares místicos */
  { id: 'av-skull',     name: 'Caveira Mística', type: 'avatar', icon: '💀', price: 800, rarity: 'epic' },
  { id: 'av-ghost',     name: 'Espectro',       type: 'avatar', icon: '👻',   price: 600,  rarity: 'epic' },
  { id: 'av-alien',     name: 'Alienígena',     type: 'avatar', icon: '👽',   price: 500,  rarity: 'epic' },
  { id: 'av-robot',     name: 'Robô',           type: 'avatar', icon: '🤖',   price: 550,  rarity: 'epic' },
  { id: 'av-medusa',    name: 'Medusa',         type: 'avatar', icon: '🐍',   price: 1200, rarity: 'legendary' },
  { id: 'av-cyclops',   name: 'Ciclope',        type: 'avatar', icon: '👁️',   price: 950,  rarity: 'legendary' },

  /* Avatares animais */
  { id: 'av-wolf',      name: 'Lobisomem',      type: 'avatar', icon: '🐺',   price: 300,  rarity: 'epic' },
  { id: 'av-tiger',     name: 'Tigre',          type: 'avatar', icon: '🐯',   price: 300,  rarity: 'epic' },
  { id: 'av-lion',      name: 'Leão',           type: 'avatar', icon: '🦁',   price: 320,  rarity: 'epic' },
  { id: 'av-panda',     name: 'Panda',          type: 'avatar', icon: '🐼',   price: 280,  rarity: 'rare' },
  { id: 'av-unicorn',   name: 'Unicórnio',      type: 'avatar', icon: '🦄',   price: 300,  rarity: 'epic' },
  { id: 'av-whale',     name: 'Baleia',         type: 'avatar', icon: '🐋',   price: 500,  rarity: 'epic' },
  { id: 'av-dino',      name: 'Dinossauro',     type: 'avatar', icon: '🦖',   price: 600,  rarity: 'epic' },
  { id: 'av-octopus',   name: 'Polvo',          type: 'avatar', icon: '🐙',   price: 550,  rarity: 'epic' },
  { id: 'av-fox',       name: 'Raposa',         type: 'avatar', icon: '🦊',   price: 250,  rarity: 'rare' },
  { id: 'av-frog',      name: 'Sapo',           type: 'avatar', icon: '🐸',   price: 200,  rarity: 'rare' },

  /* Avatares lendários */
  { id: 'av-dragon',      name: 'Dragão',       type: 'avatar', icon: '🐉',   price: 1000, rarity: 'legendary' },
  { id: 'av-dragonface',  name: 'Dragão Ancião', type: 'avatar', icon: '🐲', price: 1100, rarity: 'legendary' },
  { id: 'av-phoenix',     name: 'Fênix',        type: 'avatar', icon: '🔥',   price: 600,  rarity: 'legendary' },
  { id: 'av-kaiju',       name: 'Kaiju',        type: 'avatar', icon: '🦕',   price: 900,  rarity: 'legendary' },
  { id: 'av-godzilla',    name: 'Colosso',      type: 'avatar', icon: '🦖💥', price: 1500, rarity: 'legendary' },
];

const Shop = {
  items(type = null) {
    return type ? SHOP_ITEMS.filter(i => i.type === type) : [...SHOP_ITEMS];
  },

  get(id) {
    return SHOP_ITEMS.find(i => i.id === id) || null;
  },

  gold() {
    return Game.state.wallet.gold;
  },

  owns(id) {
    return Game.state.inventory.owned.includes(id);
  },

  /** Itens com unlockAchievement exigem a conquista correspondente. */
  isLocked(item) {
    return !!item.unlockAchievement &&
      !Achievements.isUnlocked(Game.state, item.unlockAchievement);
  },

  /**
   * Compra: valida posse, bloqueio e saldo. Nunca deixa Gold negativo
   * nem registra item duplicado.
   */
  buy(id) {
    const item = this.get(id);
    if (!item || this.owns(id)) return { ok: false, reason: 'owned' };
    if (this.isLocked(item)) return { ok: false, reason: 'locked' };
    if (this.gold() < item.price) return { ok: false, reason: 'poor' };

    Game.state.wallet.gold -= item.price;
    Game.state.inventory.owned.push(id);
    Game.save();
    return { ok: true, item };
  },

  equip(id) {
    const item = this.get(id);
    if (!item || !this.owns(id)) return false;
    Game.state.inventory.equipped[item.type] = id;
    Game.save();
    return true;
  },

  unequip(slot) {
    if (!SLOTS.includes(slot)) return false;
    Game.state.inventory.equipped[slot] = null;
    Game.save();
    return true;
  },

  equippedIn(slot) {
    const id = Game.state.inventory.equipped[slot];
    return id ? this.get(id) : null;
  },

  /** Ícone exibido no perfil: item de avatar equipado > avatar básico escolhido. */
  avatarIcon() {
    const equippedItem = this.equippedIn('avatar');
    if (equippedItem) return equippedItem.icon;
    const base = BASIC_AVATARS.find(a => a.id === (Game.state.player.avatarId || 'default'));
    return base ? base.icon : '🧙';
  },
};
