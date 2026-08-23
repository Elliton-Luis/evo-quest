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

const SLOTS = ['avatar', 'head', 'body', 'accessory', 'background'];

/* price null → item desbloqueado por conquista (unlockAchievement). */
const SHOP_ITEMS = [
  /* Avatares */
  { id: 'av-wizard',   name: 'Arquimago',    type: 'avatar', icon: '🧙‍♂️', price: 100,  rarity: 'rare' },
  { id: 'av-fencer',   name: 'Esgrimista',   type: 'avatar', icon: '🤺',   price: 150,  rarity: 'rare' },
  { id: 'av-vampire',  name: 'Vampiro',      type: 'avatar', icon: '🧛',   price: 250,  rarity: 'epic' },
  { id: 'av-alien',    name: 'Alienígena',   type: 'avatar', icon: '👽',   price: 500,  rarity: 'epic' },
  { id: 'av-dragon',   name: 'Dragão',       type: 'avatar', icon: '🐉',   price: 1000, rarity: 'legendary' },

  /* Cabeça */
  { id: 'cap',         name: 'Boné',          type: 'head', icon: '🧢', price: 50,  rarity: 'common' },
  { id: 'top-hat',     name: 'Cartola',       type: 'head', icon: '🎩', price: 100, rarity: 'uncommon' },
  { id: 'helmet',      name: 'Elmo de Batalha', type: 'head', icon: '🪖', price: 250, rarity: 'rare' },
  { id: 'crown',       name: 'Coroa Real',    type: 'head', icon: '👑', price: 500, rarity: 'epic' },

  /* Corpo */
  { id: 'tshirt',      name: 'Camiseta',      type: 'body', icon: '👕', price: 50,  rarity: 'common' },
  { id: 'coat',        name: 'Sobretudo',     type: 'body', icon: '🧥', price: 150, rarity: 'uncommon' },
  { id: 'dress',       name: 'Vestido Real',  type: 'body', icon: '👗', price: 250, rarity: 'rare' },
  { id: 'hero-cape',   name: 'Capa Lendária', type: 'body', icon: '🦸', price: 1000, rarity: 'legendary' },

  /* Acessórios */
  { id: 'glasses',     name: 'Óculos',        type: 'accessory', icon: '👓', price: 50,  rarity: 'common' },
  { id: 'backpack',    name: 'Mochila',       type: 'accessory', icon: '🎒', price: 100, rarity: 'uncommon' },
  { id: 'scarf',       name: 'Cachecol',      type: 'accessory', icon: '🧣', price: 150, rarity: 'uncommon' },
  { id: 'wand',        name: 'Varinha Mágica', type: 'accessory', icon: '🪄', price: 500, rarity: 'epic' },
  {
    id: 'gold-trophy', name: 'Troféu de Ouro', type: 'accessory', icon: '🏆',
    price: null, rarity: 'legendary', unlockAchievement: 'hero',
    unlockDesc: 'Complete 100 missões.',
  },

  /* Fundos */
  { id: 'bg-forest',   name: 'Floresta',      type: 'background', icon: '🌲', price: 100, rarity: 'uncommon' },
  { id: 'bg-castle',   name: 'Castelo',       type: 'background', icon: '🏰', price: 250, rarity: 'rare' },
  { id: 'bg-night',    name: 'Céu Noturno',   type: 'background', icon: '🌌', price: 500, rarity: 'epic' },
  { id: 'bg-volcano',  name: ' Vulcão',       type: 'background', icon: '🌋', price: 1000, rarity: 'legendary' },
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
