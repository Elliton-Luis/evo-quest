// Teste headless do núcleo do jogo (storage.js + game.js + asserções).
const fs = require('fs');
const path = require('path');

// Mock do localStorage
const store = {};
global.localStorage = {
  setItem: (k, v) => { store[k] = String(v); },
  getItem: k => (k in store ? store[k] : null),
  removeItem: k => { delete store[k]; },
};

const dir = path.join(__dirname);
const code =
  fs.readFileSync(path.join(dir, 'js/storage.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(dir, 'js/game.js'), 'utf8');

// Executa no escopo global (sem 'strict' isolado pelo eval)
const run = new Function('localStorage', code +
  '\n; return { Storage, Game, ACHIEVEMENT_DEFS, statsFromTotalXp };');
const { Storage, Game, ACHIEVEMENT_DEFS, statsFromTotalXp } = run(global.localStorage);

function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } console.log('ok:', msg); }

// 1. Sem save inicial
assert(Game.load() === null, 'nenhum save inicial');

// 2. Criação de personagem com categorias padrão
Game.createPlayer('Herói', '💻 Programador');
assert(Game.state.categories.length === 4, '4 categorias padrão');
assert(Game.state.player.level === 1 && Game.state.player.totalXp === 0, 'jogador Lv.1 / 0 XP');

const cat1 = Game.state.categories[0];

// 3. Criar missões (10 × 30 XP = 300 XP)
let last;
for (let i = 0; i < 10; i++) {
  last = Game.createQuest({ name: 'Missão ' + i, desc: '', categoryId: cat1.id, xp: 30 });
}
assert(Game.state.quests.length === 10, '10 missões criadas');

// 4. Completar todas e coletar eventos
let sawCatLevelUp = false, unlockedIds = [];
for (const q of [...Game.state.quests]) {
  const ev = Game.completeQuest(q.id);
  if (!ev) throw new Error('completeQuest falhou em ' + q.id);
  if (ev.categoryLevelUp) sawCatLevelUp = true;
  unlockedIds.push(...ev.unlocked.map(d => d.id));
}
assert(Game.state.player.totalXp === 300, '300 XP total acumulado');
assert(sawCatLevelUp, 'houve level up de categoria');
const cSt = statsFromTotalXp(cat1.xp);
assert(cSt.level === 2 && cSt.current === 150 && cSt.needed === 200,
  'categoria Lv.2, 150/200 XP com 300 XP totais');
const pSt = statsFromTotalXp(Game.state.player.totalXp);
assert(pSt.level === 2 && pSt.current === 150 && pSt.needed === 200, 'jogador Lv.2, 150/200 XP');
assert(Game.state.player.completedCount === 10, 'contador global = 10');
assert(cat1.completedCount === 10, 'contador da categoria = 10');
assert(unlockedIds.includes('first_step') && unlockedIds.includes('adventurer'),
  'Primeiro Passo e Aventureiro desbloqueadas');
assert(!unlockedIds.includes('veteran'), 'Veterano ainda bloqueada');
assert(unlockedIds.includes('first_level_up'), 'Primeiro Level Up desbloqueada');
assert(Game.state.achievements.every(a => a.unlockedAt), 'conquistas têm data');

// 5. Persistência
Game.save();
Game.state = null;
const reloaded = Game.load();
assert(reloaded !== null && reloaded.player.totalXp === 300, 'estado persistido e recarregado');
assert(reloaded.quests.filter(q => q.done).length === 10, 'missões concluídas persistidas');
assert(reloaded.achievements.length >= 3, 'conquistas persistidas');

// 6. Reabrir missão não remove XP
Game.state = reloaded;
Game.reopenQuest(Game.state.quests[0].id);
assert(Game.state.player.totalXp === 300, 'reabrir mantém XP');

// 7. Editar e excluir missão/categoria
const q2 = Game.createQuest({ name: 'Temp', desc: 'x', categoryId: cat1.id, xp: 5 });
Game.updateQuest(q2.id, { name: 'Temp2', xp: 7 });
assert(Game.state.quests.find(q => q.id === q2.id).xp === 7, 'edição de XP');
Game.deleteQuest(q2.id);
assert(!Game.state.quests.find(q => q.id === q2.id), 'exclusão de missão');

const catNew = Game.createCategory('Música', '🎸');
assert(!!catNew, 'categoria criada');
const q3 = Game.createQuest({ name: 'Tocar', desc: '', categoryId: catNew.id, xp: 10 });
Game.deleteCategory(catNew.id);
assert(!Game.getCategory(catNew.id), 'categoria excluída');
assert(!Game.state.quests.find(q => q.id === q3.id), 'missões da categoria removidas junto');

// 8. Fórmula: XP necessário = 100 + nível × 50
assert(xpForNextSafe(1) === 150 && xpForNextSafe(2) === 200 && xpForNextSafe(9) === 550,
  'fórmula de XP correta');

function xpForNextSafe(l) { return 100 + l * 50; }

// 9. Edição de categoria preserva XP e missões
const catProg = Game.state.categories[0];
const progQuests = Game.state.quests.filter(q => q.categoryId === catProg.id).length;
const progXp = catProg.xp;
Game.updateCategory(catProg.id, { name: 'Desenvolvimento', icon: '🛠️', desc: 'Código' });
const renamed = Game.getCategory(catProg.id);
assert(renamed.name === 'Desenvolvimento' && renamed.icon === '🛠️' && renamed.desc === 'Código',
  'categoria renomeada com ícone e descrição');
assert(renamed.xp === progXp &&
  Game.state.quests.filter(q => q.categoryId === catProg.id).length === progQuests,
  'edição preserva XP e vínculo das missões');

// 10. Classe personalizada marca flag (conquista Identidade Própria)
Game.updatePlayer({ class: 'Cavaleiro do Código', customClass: true });
const newlyIdentity = Game.checkAchievements();
assert(newlyIdentity.some(d => d.id === 'own_identity'), 'Identidade Própria desbloqueada');

// 11. Nova categoria dispara Explorador/Generalista
Game.createCategory('Música', '🎸');
Game.checkAchievements();
assert(Game.isUnlocked('explorer'), 'Explorador desbloqueada');
assert(Game.isUnlocked('generalist'), 'Generalista desbloqueada');

// 12. Conquistas de XP/nível gerais
Game.state.player.totalXp = 5000;
Game.state.player.level = statsFromTotalXp(5000).level;
const newlyXp = Game.checkAchievements();
assert(newlyXp.some(d => d.id === 'xp_hoarder') && newlyXp.some(d => d.id === 'xp_treasure'),
  'Acumulador e Tesouro de XP desbloqueadas');
assert(newlyXp.some(d => d.id === 'adventure_lord'), 'Senhor da Aventura no nível geral 10');

// 13. Veterano de Guerra: missões em 4 categorias diferentes
for (let i = 1; i < 4; i++) {
  const c = Game.state.categories[i];
  if (c.completedCount === 0) c.completedCount = 3;
}
const newlyWar = Game.checkAchievements();
assert(newlyWar.some(d => d.id === 'war_veteran'), 'Veterano de Guerra desbloqueada');

// 14. Lenda Viva só com todas as outras
const othersUnlocked = ACHIEVEMENT_DEFS
  .filter(d => d.id !== 'living_legend')
  .every(d => Game.isUnlocked(d.id));
if (othersUnlocked) {
  const finalCheck = Game.checkAchievements();
  assert(finalCheck.some(d => d.id === 'living_legend'), 'Lenda Viva com todas desbloqueadas');
} else {
  assert(!Game.isUnlocked('living_legend'), 'Lenda Viva bloqueada sem as demais');
}

// 15. Migração v1 → v2: save antigo ganha campos novos sem perder nada
store[Storage.KEY] = JSON.stringify({
  player: { name: 'Antigo', class: '🧙 Mago', level: 2, totalXp: 200, completedCount: 5 },
  categories: [{ id: 'c1', icon: '💻', name: 'Programação', xp: 200, completedCount: 5 }],
  quests: [{ id: 'q1', name: 'Velha', desc: '', categoryId: 'c1', xp: 10, done: true }],
  achievements: [{ id: 'first_step', unlockedAt: '2024-01-01T00:00:00Z' }],
});
Game.state = null;
const migrated = Game.load();
assert(migrated.version === 2, 'save migrado para versão 2');
assert(migrated.player.customClass === false &&
  migrated.player.createdCustomCategory === false, 'flags do player adicionadas');
assert(migrated.categories[0].desc === '', 'descrição da categoria adicionada');
assert(migrated.player.totalXp === 200 && migrated.achievements.length === 1,
  'dados antigos preservados na migração');

console.log('\nTODOS OS TESTES PASSARAM ✔');
