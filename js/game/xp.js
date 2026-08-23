'use strict';

/* Fórmulas de XP e nível. Funções puras, sem estado. */

const Xp = {
  // XP necessário para sair do nível `level`.
  forNext(level) {
    return 100 + level * 50;
  },

  // XP acumulado total exigido para ESTAR no nível `level`.
  cumulative(level) {
    let sum = 0;
    for (let l = 1; l < level; l++) sum += this.forNext(l);
    return sum;
  },

  // Deriva o nível a partir do XP total acumulado.
  levelFromTotal(totalXp) {
    let level = 1;
    let acc = 0;
    while (totalXp >= acc + this.forNext(level)) {
      acc += this.forNext(level);
      level++;
    }
    return { level, base: acc };
  },

  // Progresso visível dentro do nível atual (o histórico nunca é apagado).
  fromTotal(totalXp) {
    const { level, base } = this.levelFromTotal(totalXp);
    return {
      level,
      current: totalXp - base,
      needed: this.forNext(level),
      total: totalXp,
    };
  },
};
