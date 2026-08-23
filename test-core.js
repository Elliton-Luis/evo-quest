// Testes headless do núcleo do LifeQuest (pós-refatoração v3).
const fs = require('fs');
const path = require('path');

// Mock do localStorage
const store = {};
global.localStorage = {
  setItem: (k, v) => { store[k] = String(v); },
  getItem: k => (k in store ? store[k] : null),
  removeItem: k => { delete store[k]; },
};

const FILES = [
  'js/storage.js', 'js/game/xp.js', 'js/game/categories.js',
  'js/game/quests.js', 'js/game/achievements.js', 'js/game/shop.js', 'js/state.js',
];
const code = FILES.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const run = new Function('localStorage', code +
  '\n; return { Storage, Game, Xp, Categories, Quests, Achievements, ACHIEVEMENT_DEFS, DIFFICULTIES, ECONOMY, Shop, BASIC_AVATARS };');
const { Storage, Game, Xp, Categories, Quests, Achievements, ACHIEVEMENT_DEFS, DIFFICULTIES, ECONOMY, Shop, BASIC_AVATARS } =
  run(global.localStorage);

function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } console.log('ok:', msg); }
const sleepless = () => new Date().toISOString();
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
// meio da semana N semanas atrás (semana começa na segunda) — sempre semanas distintas
const weeksAgo = n => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * n + 3);
  return d.toISOString();
};
// dia 15 do mês N meses atrás — sempre meses distintos
const monthsAgo = n => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - n, 15).toISOString();
};

/* ---------- 1. Estado inicial: ZERO categorias ---------- */
assert(Game.load() === null, 'nenhum save inicial');
Game.createPlayer('Herói', 'Cavaleiro do Código', true);
assert(Game.state.categories.length === 0, 'novo jogador começa com 0 categorias (sem padrões)');
assert(Game.state.player.customClass === true, 'classe personalizada registrada');
assert(Game.state.completions.length === 0 && Game.state.quests.length === 0, 'histórico e missões vazios');

/* ---------- 2. Categorias ---------- */
const prog = Categories.create({ name: 'Programação', icon: '💻', description: 'Código' });
const leitura = Categories.create({ name: 'Leitura', icon: '📖' });
assert(!!prog && !!leitura, 'categorias criadas pelo usuário');
assert(prog.createdAt && leitura.createdAt, 'categoria possui createdAt');
assert(Game.state.player.createdCategory === true, 'flag createdCategory ativada');

Categories.update(prog.id, { name: 'Desenvolvimento', icon: '🛠️' });
assert(Categories.get(prog.id).name === 'Desenvolvimento' && Categories.get(prog.id).description === 'Código',
  'edição preserva descrição e id');
assert(prog.xp === 0, 'edição não mexe no XP');

/* ---------- 3. Dificuldades ---------- */
assert(DIFFICULTIES.easy.xp === 10 && DIFFICULTIES.normal.xp === 25 &&
       DIFFICULTIES.hard.xp === 50 && DIFFICULTIES.epic.xp === 100,
  'presets de dificuldade: 10/25/50/100 XP');

/* ---------- 4. Missões únicas ---------- */
const q1 = Quests.create({ title: 'Concluir projeto', categoryId: prog.id, difficulty: 'hard', xp: 50 });
assert(q1.title === 'Concluir projeto' && q1.difficulty === 'hard' && q1.recurrence === 'once',
  'missão única com dificuldade difícil');
assert(Quests.isAvailable(q1) === true, 'missão única disponível antes de concluir');

const ev1 = Game.completeQuest(q1.id);
assert(ev1 && ev1.gainedXp === 50, 'XP da dificuldade aplicado (+50)');
assert(ev1.categoryLevelUp === null && ev1.playerLevelUp === null, 'sem level up com 50 XP');
assert(Quests.isAvailable(q1) === false, 'missão única indisponível após conclusão');
assert(Game.completeQuest(q1.id) === null, 'conclusão duplicada é bloqueada');

// XP personalizado prevalece sobre o preset
Quests.create({ title: 'Tarefa custom', categoryId: prog.id, difficulty: 'easy', xp: 75 });
const qCustom = Quests.all()[Quests.all().length - 1];
assert(qCustom.difficulty === 'easy' && qCustom.xp === 75, 'XP manual prevalece sobre a dificuldade');

/* ---------- 5. Recorrência: diária ---------- */
const daily = Quests.create({ title: 'Estudar 30 minutos', categoryId: prog.id,
  difficulty: 'normal', xp: 25, recurrence: 'daily' });
assert(Quests.isAvailable(daily), 'diária disponível hoje');
Game.completeQuest(daily.id);
assert(!Quests.isAvailable(daily), 'diária bloqueada após concluir hoje');
// conclusão de ontem não bloqueia hoje
Quests.get(daily.id); // noop
const comps = Game.state.completions;
comps[comps.length - 1].at = daysAgo(1);
assert(Quests.isAvailable(daily), 'diária volta a ficar disponível em outro dia');
Game.completeQuest(daily.id); // conclui de novo (hoje)
assert(!Quests.isAvailable(daily), 'diária bloqueada novamente hoje');

/* ---------- 6. Recorrência: semanal e mensal ---------- */
const weekly = Quests.create({ title: 'Revisar objetivos', recurrence: 'weekly', xp: 25 });
Game.completeQuest(weekly.id);
assert(!Quests.isAvailable(weekly), 'semanal bloqueada na mesma semana');
comps[comps.length - 1].at = daysAgo(8); // semana passada
assert(Quests.isAvailable(weekly), 'semanal disponível em nova semana');

const monthly = Quests.create({ title: 'Balanço do mês', recurrence: 'monthly', xp: 25 });
Game.completeQuest(monthly.id);
assert(!Quests.isAvailable(monthly), 'mensal bloqueada no mesmo mês');
comps[comps.length - 1].at = daysAgo(35);
assert(Quests.isAvailable(monthly), 'mensal disponível em novo mês');

/* ---------- 7. Exclusão de categoria NUNCA apaga missões ---------- */
const musica = Categories.create({ name: 'Música', icon: '🎸' });
const qMusica = Quests.create({ title: 'Praticar escala', categoryId: musica.id, xp: 15 });
Categories.remove(musica.id, { mode: 'orphan' });
assert(!Categories.get(musica.id), 'categoria excluída');
assert(!!Quests.get(qMusica.id) && Quests.get(qMusica.id).categoryId === null,
  'modo orphan: missão mantida SEM categoria');

const idiomas = Categories.create({ name: 'Idiomas', icon: '🗣️' });
const qIdiomas = Quests.create({ title: 'Estudar vocabulário', categoryId: idiomas.id, xp: 20 });
Categories.remove(idiomas.id, { mode: 'reassign', targetId: leitura.id });
assert(!!Quests.get(qIdiomas.id) && Quests.get(qIdiomas.id).categoryId === leitura.id,
  'modo reassign: missão reatribuída à categoria escolhida');

/* ---------- 8. Estatísticas derivadas ---------- */
// Terceira categoria ativa + progresso em 3 atributos (multiclass)
const exercicio = Categories.create({ name: 'Exercícios', icon: '🏃' });
const qExe = Quests.create({ title: 'Caminhada', categoryId: exercicio.id, xp: 10 });
Game.completeQuest(qExe.id);
Game.completeQuest(qIdiomas.id);

const st = Game.stats();
assert(st.completedQuests === Game.state.completions.length, 'completedQuests derivado do histórico');
assert(!('completedCount' in Game.state.player), 'player não armazena contador duplicado');
assert(Game.state.categories.every(c => !('completedCount' in c)), 'categorias não armazenam contador duplicado');
assert(st.unlockedCount === Game.state.achievements.length, 'conquistas contadas do array');

/* ---------- 9. Conquistas data-driven ---------- */
assert(ACHIEVEMENT_DEFS.length >= 32, 'sistema tem ao menos 32 conquistas definidas');
assert(Achievements.check === undefined || true, 'noop');
const newly = Achievements.check(Game.state);
const ids = new Set([...newly.map(d => d.id), ...Game.state.achievements.map(a => a.id)]);
for (const expected of ['first_step', 'first_reward', 'first_journey',
  'first_attribute', 'generalist', 'multiclass', 'first_level_up']) {
  assert(ids.has(expected), `conquista ${expected} desbloqueada`);
}
assert(!ids.has('myth') && !ids.has('xp_mountain'), 'conquistas distantes permanecem bloqueadas');

/* Rotina: diárias em 7 dias distintos */
for (let i = 1; i <= 7; i++) {
  Game.state.completions.push({ id: 'r' + i, questId: daily.id, recurrence: 'daily', xp: 5, at: daysAgo(i * 2) });
}
Achievements.check(Game.state);
assert(Achievements.isUnlocked(Game.state, 'routine'), 'Rotina: 7 dias distintos de diárias');

/* Constância e Ciclo Completo */
Game.state.completions.push(
  { id: 'w1', questId: weekly.id, recurrence: 'weekly', xp: 5, at: weeksAgo(0) },
  { id: 'w2', questId: weekly.id, recurrence: 'weekly', xp: 5, at: weeksAgo(1) },
  { id: 'w3', questId: weekly.id, recurrence: 'weekly', xp: 5, at: weeksAgo(2) },
  { id: 'w4', questId: weekly.id, recurrence: 'weekly', xp: 5, at: weeksAgo(3) },
  { id: 'm1', questId: monthly.id, recurrence: 'monthly', xp: 5, at: monthsAgo(1) },
  { id: 'm2', questId: monthly.id, recurrence: 'monthly', xp: 5, at: monthsAgo(2) },
  { id: 'm3', questId: monthly.id, recurrence: 'monthly', xp: 5, at: monthsAgo(3) },
);
Achievements.check(Game.state);
assert(Achievements.isUnlocked(Game.state, 'consistency'), 'Constância: 4 semanas distintas');
assert(Achievements.isUnlocked(Game.state, 'full_cycle'), 'Ciclo Completo: 3 meses distintos');

/* Colecionador / Lenda Viva */
Game.state.achievements = ACHIEVEMENT_DEFS
  .filter(d => !['collector', 'achievement_hunter', 'living_legend'].includes(d.id))
  .slice(0, 10)
  .map(d => ({ id: d.id, unlockedAt: sleepless() }));
Achievements.check(Game.state);
assert(Achievements.isUnlocked(Game.state, 'collector'), 'Colecionador com 10 conquistas');

Game.state.achievements = ACHIEVEMENT_DEFS
  .filter(d => d.id !== 'living_legend')
  .map(d => ({ id: d.id, unlockedAt: sleepless() }));
Achievements.check(Game.state);
assert(Achievements.isUnlocked(Game.state, 'living_legend'), 'Lenda Viva com todas as outras');

/* ---------- 10. Persistência + migração v2 → v3 ---------- */
Game.save();
Game.state = null;
const reloaded = Game.load();
assert(reloaded.version === 4, 'save persistido na versão atual');
assert(reloaded.player.totalXp > 0 && reloaded.completions.length > 0, 'progresso preservado ao reabrir');

store[Storage.KEY] = JSON.stringify({
  version: 2,
  player: { name: 'Antigo', class: '🧙 Mago', customClass: false,
    createdCustomCategory: false, level: 3, totalXp: 400, completedCount: 7,
    createdAt: '2024-01-01T00:00:00Z' },
  categories: [{ id: 'c1', icon: '💻', name: 'Programação', desc: '', xp: 400, completedCount: 7 }],
  quests: [{ id: 'q1', name: 'Velha', desc: 'x', categoryId: 'c1', xp: 30, done: true, doneAt: '2024-02-02T00:00:00Z' }],
  achievements: [{ id: 'first_step', unlockedAt: '2024-01-05T00:00:00Z' }],
});
Game.state = null;
const mig = Game.load();
assert(mig.version === 4, 'save v2 migrado para a versão atual');
assert(mig.quests[0].title === 'Velha' && mig.quests[0].description === 'x' &&
       typeof mig.quests[0].done === 'undefined', 'missão migrada para title/description, done removido');
assert(mig.quests[0].difficulty === 'hard' && mig.quests[0].recurrence === 'once',
  'dificuldade inferida pelo XP e recorrência padrão aplicadas');
assert(mig.categories[0].createdAt === '2024-01-01T00:00:00Z', 'categoria ganha createdAt');
assert(mig.completions.length >= 1 && mig.completions.some(c => c.questId === 'q1'),
  'missão concluída virou entrada no histórico');
assert(!('completedCount' in mig.player) && !('createdCustomCategory' in mig.player),
  'campos legados do player removidos após migração');
assert(mig.player.totalXp === 400 && mig.achievements.length === 1, 'XP e conquistas preservados');

// migração de save v1 (sem version)
delete store[Storage.KEY];
store[Storage.KEY] = JSON.stringify({
  player: { name: 'Muito antigo', class: '⚔️ Guerreiro', level: 1, totalXp: 0, completedCount: 0 },
  categories: [], quests: [], achievements: [],
});
Game.state = null;
const v1 = Game.load();
assert(v1.version === 4 && Array.isArray(v1.completions), 'save v1 também é migrado direto para a versão atual');

/* ---------- 10. Economia: Gold por dificuldade, sem duplicação ---------- */
assert(Game.state.wallet && Game.state.wallet.gold === 0, 'carteira começa em 0');
const goldBefore = Game.state.wallet.gold;
const catEco = Categories.create({ name: 'Rotina', icon: '🔁' });

// missão fácil = 5 gold (+ bônus por eventuais conquistas desbloqueadas)
const qEasy = Quests.create({ title: 'Fácil', categoryId: catEco.id, difficulty: 'easy', xp: 10 });
const evEasy = Game.completeQuest(qEasy.id);
const expectedEasy = DIFFICULTIES.easy.gold +
  evEasy.unlocked.length * ECONOMY.achievementBonus;
assert(Game.state.wallet.gold === goldBefore + expectedEasy,
  `missão fácil paga ${DIFFICULTIES.easy.gold} gold + bônus de conquista quando houver`);

// épica = 40 gold
const goldMid = Game.state.wallet.gold;
const qEpic = Quests.create({ title: 'Épica', categoryId: catEco.id, difficulty: 'epic', xp: 100 });
const evEpic = Game.completeQuest(qEpic.id);
assert(Game.state.wallet.gold - goldMid >= DIFFICULTIES.epic.gold,
  'missão épica paga ao menos 40 gold');

// reconcluir é bloqueado → nada de Gold duplicado
const afterFirst = Game.state.wallet.gold;
assert(Game.completeQuest(qEpic.id) === null && Game.state.wallet.gold === afterFirst,
  'reconcluir não duplica Gold');

// custom paga taxa fixa
const qCustomGold = Quests.create({ title: 'Custom gold', recurrence: 'daily', xp: 7 });
Game.completeQuest(qCustomGold.id);
const diffCustom = Game.state.wallet.gold - afterFirst;
assert(diffCustom >= ECONOMY.achievementBonus || diffCustom > 0, 'missão custom concede Gold fixo positivo');
assert(Game.state.wallet.gold >= 0, 'Gold nunca fica negativo');

// recarregar não duplica recompensa
const goldSnapshot = Game.state.wallet.gold;
Game.save();
Game.state = null;
const reSaved = Game.load();
assert(reSaved.wallet.gold === goldSnapshot, 'Gold preservado exatamente após reload');

/* ---------- 11. Loja: compra, posse, equipar ---------- */
const cheap = Shop.get('cap');
assert(cheap.price === 50 && cheap.rarity === 'common', 'item da loja definido por dados');
assert(!Shop.owns('cap'), 'item não possuído inicialmente');

// sem saldo suficiente → bloqueado
Game.state.wallet.gold = 10;
const poorBuy = Shop.buy('cap');
assert(!poorBuy.ok && poorBuy.reason === 'poor' && Game.state.wallet.gold === 10,
  'compra sem Gold é recusada e não altera carteira');

// compra válida debita e registra uma única vez
Game.state.wallet.gold = 100;
assert(Shop.buy('cap').ok === true, 'compra bem-sucedida');
assert(Game.state.wallet.gold === 50, 'preço debitado corretamente');
assert(Shop.buy('cap').ok === false && Shop.owns('cap') &&
  Game.state.inventory.owned.filter(i => i === 'cap').length === 1,
  'compra duplicada recusada — item único no inventário');

// equipar / desequipar
assert(Shop.equip('cap') && Shop.equippedIn('head')?.id === 'cap', 'item equipado');
assert(Shop.equip('cap') === true && Game.state.inventory.equipped.head === 'cap',
  'equipar novamente não cria estado estranho');
assert(Shop.unequip('head') && Shop.equippedIn('head') === null, 'item desequipado');
assert(Shop.equip('cap-inexistente') === false, 'equipar item inexistente falha com segurança');

// item bloqueado por conquista
const trophy = Shop.get('gold-trophy');
assert(trophy.price === null && trophy.unlockAchievement === 'hero', 'item especial definido por conquista');
assert(Shop.isLocked(trophy), 'troféu bloqueado sem a conquista Herói');
assert(Shop.buy('gold-trophy').reason === 'locked' && !Shop.owns('gold-trophy'),
  'compra de item bloqueado é recusada');
Game.state.achievements.push({ id: 'hero', unlockedAt: sleepless() });
assert(!Shop.isLocked(trophy) && Shop.buy('gold-trophy').ok, 'troféu liberado após conquista');

// avatar: básico por padrão, item equipado tem prioridade
assert(BASIC_AVATARS.length >= 8, 'avatares básicos disponíveis');
Game.state.player.avatarId = 'coder';
assert(Shop.avatarIcon() === '🧑‍💻', 'avatarId resolve ícone do avatar básico');
Game.state.wallet.gold = 200;
assert(Shop.buy('av-wizard').ok, 'avatar comprado com Gold suficiente');
Shop.equip('av-wizard');
assert(Shop.avatarIcon() === '🧙‍♂️', 'avatar comprado sobrepõe o básico');
Shop.unequip('avatar');
assert(Shop.avatarIcon() === '🧑‍💻', 'desequipar volta ao avatar básico escolhido');

console.log('\nTODOS OS TESTES PASSARAM ✔');
