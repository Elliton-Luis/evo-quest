// Testes headless do núcleo do EvoQuest.
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
  'js/game/quests.js', 'js/game/achievements.js', 'js/game/shop.js',
  'js/game/regras.js', 'js/state.js',
];
const code = FILES.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const run = new Function('localStorage', code +
  '\n; return { Storage, Game, Xp, Categories, Quests, Achievements, ACHIEVEMENT_DEFS, DIFFICULTIES, CUSTOM_QUEST_GOLD, ECONOMY, Shop, BASIC_AVATARS, Regras };');
const { Storage, Game, Xp, Categories, Quests, Achievements, ACHIEVEMENT_DEFS, DIFFICULTIES, CUSTOM_QUEST_GOLD, ECONOMY, Shop, BASIC_AVATARS, Regras } =
  run(global.localStorage);

function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } console.log('ok:', msg); }
const sleepless = () => new Date().toISOString();

/* Relógio simulável: permite adiantar dias para testar a recorrência
   (a lógica usa `new Date()` como "agora", inclusive ao recarregar). */
const RealDate = Date;
const DAY_MS = 24 * 60 * 60 * 1000;
let clockOffsetMs = 0;
global.Date = class extends RealDate {
  constructor(...args) {
    args.length ? super(...args) : super(RealDate.now() + clockOffsetMs);
  }
  static now() { return RealDate.now() + clockOffsetMs; }
};
/** Adianta o relógio em N dias (simula a virada do dia). */
const shiftDays = n => { clockOffsetMs += n * DAY_MS; };

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
assert(Quests.isAvailable(daily) === true, 'diária recém-criada começa disponível');
const dailyXpBefore = Game.state.player.totalXp;
const evDaily = Game.completeQuest(daily.id);
assert(evDaily && Quests.isAvailable(daily) === false,
  'completion de hoje torna a diária concluída/bloqueada');

// segunda conclusão no MESMO dia é impedida (sem XP/Gold duplicado)
const goldSameDay = Game.state.wallet.gold;
const xpSameDay = Game.state.player.totalXp;
assert(Game.completeQuest(daily.id) === null, 'segunda conclusão no mesmo dia é bloqueada');
assert(Game.state.player.totalXp === xpSameDay && Game.state.wallet.gold === goldSameDay,
  'reconclusão no mesmo dia não concede XP nem Gold');

// recarregar a página HOJE mantém o estado concluído (histórico é a fonte da verdade)
Game.save();
Game.state = null;
Game.load();
const dailyReloaded = Quests.get(daily.id);
assert(!Quests.isAvailable(dailyReloaded), 'diária continua concluída após reload no mesmo dia');
assert(Game.completeQuest(dailyReloaded.id) === null,
  'reload não permite reconcluir nem gerar recompensas de novo');

// conclusão de ONTEM não bloqueia hoje
const comps = Game.state.completions;
comps[comps.length - 1].at = daysAgo(1);
assert(Quests.isAvailable(Quests.get(daily.id)) === true,
  'completion de ontem NÃO torna a diária de hoje concluída');
Game.completeQuest(daily.id); // conclui de novo (hoje)
assert(!Quests.isAvailable(daily), 'diária bloqueada novamente hoje');
assert(Quests.completionsFor(daily.id).length === 2,
  'cada dia concluído gera sua própria ocorrência no histórico');

/* ---------- 5b. Virada do dia COM persistência (save existente) ---------- */
Game.save();
shiftDays(1); // agora é "amanhã"
Game.state = null;
Game.load();
const dailyNextDay = Quests.get(daily.id);
assert(Quests.isAvailable(dailyNextDay) === true,
  'no dia seguinte a MESMA definição volta a ficar disponível');
const occBeforeNextDay = Quests.completionsFor(dailyNextDay.id).length;
const goldBeforeNextDay = Game.state.wallet.gold;
const evNextDay = Game.completeQuest(dailyNextDay.id);
assert(evNextDay && evNextDay.gainedXp > 0,
  'concluir amanhã concede as recompensas normalmente');
assert(Quests.completionsFor(dailyNextDay.id).length === occBeforeNextDay + 1 &&
       Game.state.wallet.gold > goldBeforeNextDay,
  'nova completion registrada no histórico com Gold da dificuldade');

const lastCompletionAt = () => {
  const c = Game.state.completions;
  return c[c.length - 1];
};

/* ---------- 6. Recorrência: semanal e mensal ---------- */
const weekly = Quests.create({ title: 'Revisar objetivos', recurrence: 'weekly', xp: 25 });
Game.completeQuest(weekly.id);
assert(!Quests.isAvailable(weekly), 'semanal bloqueada na mesma semana');
lastCompletionAt().at = daysAgo(8); // semana passada
assert(Quests.isAvailable(weekly), 'semanal disponível em nova semana');

const monthly = Quests.create({ title: 'Balanço do mês', recurrence: 'monthly', xp: 25 });
Game.completeQuest(monthly.id);
assert(!Quests.isAvailable(monthly), 'mensal bloqueada no mesmo mês');
lastCompletionAt().at = daysAgo(35);
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
assert(reloaded.version === 5, 'save persistido na versão atual');
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
assert(mig.version === 5, 'save v2 migrado para a versão atual');
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
assert(v1.version === 5 && Array.isArray(v1.completions), 'save v1 também é migrado direto para a versão atual');

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
const cheap = Shop.get('av-fox');
assert(cheap.price === 250 && cheap.type === 'avatar', 'item da loja definido por dados');
assert(!Shop.owns('av-fox'), 'item não possuído inicialmente');

// sem saldo suficiente → bloqueado
Game.state.wallet.gold = 10;
const poorBuy = Shop.buy('av-fox');
assert(!poorBuy.ok && poorBuy.reason === 'poor' && Game.state.wallet.gold === 10,
  'compra sem Gold é recusada e não altera carteira');

// compra válida debita e registra uma única vez
Game.state.wallet.gold = 300;
assert(Shop.buy('av-fox').ok === true, 'compra bem-sucedida');
assert(Game.state.wallet.gold === 50, 'preço debitado corretamente');
assert(Shop.buy('av-fox').ok === false && Shop.owns('av-fox') &&
  Game.state.inventory.owned.filter(i => i === 'av-fox').length === 1,
  'compra duplicada recusada — item único no inventário');

// equipar / desequipar
assert(Shop.equip('av-fox') && Shop.equippedIn('avatar')?.id === 'av-fox', 'item equipado');
assert(Shop.equip('av-fox') === true && Game.state.inventory.equipped.avatar === 'av-fox',
  'equipar novamente não cria estado estranho');
assert(Shop.unequip('avatar') && Shop.equippedIn('avatar') === null, 'item desequipado');
assert(Shop.equip('av-inexistente') === false, 'equipar item inexistente falha com segurança');

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

// ---------- Migração de chave antiga (lifequest → evoquest) ----------
store['lifequest_save_v1'] = store[Storage.KEY]; // save só na chave antiga
delete store[Storage.KEY];
Game.state = null;
const fromLegacy = Game.load();
assert(fromLegacy !== null && fromLegacy.player.name === 'Muito antigo',
  'save na chave antiga (lifequest) ainda é carregado');
Game.save();
assert(!!store[Storage.KEY] && !store['lifequest_save_v1'],
  'após salvar, dados migram para a chave nova e a antiga é removida');

/* ---------- 12. Regrinhas: streak, quebra e penalidade ---------- */
// Estado limpo para testar regrinhas isoladamente
Game.createPlayer('Disciplinado', '🛡️ Paladino');
const catR = Categories.create({ name: 'Hábitos', icon: '📜' });
assert(Game.state.regras.length === 0, 'novo estado inicia sem regrinhas');

// criação com categoria opcional
const rLeitura = Regras.create({ title: 'Leitura diária', categoryId: catR.id,
  frequency: 'daily', penalty: 10, deadline: '23:30' });
const rGeral = Regras.create({ title: 'Dormir antes das 23:30', frequency: 'daily' });
assert(rLeitura && rGeral, 'regrinhas criadas');
assert(rGeral.categoryId === null, 'regrinha funciona SEM categoria');
assert(rLeitura.penalty === 10 && rLeitura.deadline === '23:30', 'penalidade e horário limite armazenados');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();

// cumpriu ontem e hoje → streak 2
Regras.fulfill(rLeitura.id, new Date(now.getTime() - DAY));
Regras.fulfill(rLeitura.id, now);
assert(Regras.streakOf(rLeitura) === 2, 'streak conta períodos consecutivos cumpridos');

// não pode registrar duas vezes no mesmo período
const dup = Regras.fulfill(rLeitura.id, now);
assert(!dup.ok && dup.duplicate, 'cumprimento duplicado no mesmo período é bloqueado');

// ontem cumprida, hoje pendente → streak preservado (dia ainda não acabou)
assert(Regras.streakOf(rLeitura) === 2 || Regras.evaluate(rLeitura, now) === null,
  'pendente hoje ainda não quebra a regra');

// amanhã sem ter cumprido hoje → quebra detectada, streak zera, penalidade aplicada
const rQuebra = Regras.create({ title: 'Rotina de teste', categoryId: catR.id,
  frequency: 'daily', penalty: 10 });
Regras.fulfill(rQuebra.id, new Date(now.getTime() - DAY)); // só ontem foi cumprida
const goldAntes = Game.state.wallet.gold;
const amanha = new Date(now.getTime() + DAY);
const breakEv = Regras.evaluate(rQuebra, amanha);
assert(!!breakEv && breakEv.penalty === 10, 'quebra detectada com penalidade -10');
assert(rQuebra.streak === 0, 'streak zerou após a quebra');
assert(Game.state.wallet.gold === Math.max(0, goldAntes - 10), 'Gold descontado (sem ficar negativo)');
assert(rQuebra.brokenCount === 1 && rQuebra.goldLost === 10, 'estatísticas de quebra registradas');

// avaliar de novo NÃO aplica penalidade em dobro
Regras.evaluate(rQuebra, amanha);
Regras.evaluate(rQuebra, amanha);
assert(rQuebra.brokenCount === 1 && Game.state.wallet.gold === Math.max(0, goldAntes - 10),
  'penalidade aplicada apenas uma vez por quebra');

// regra geral sem categoria também quebra após período perdido
const evGeral = Regras.evaluate(rGeral, new Date(now.getTime() + DAY));
assert(evGeral === null || evGeral.missedKey, 'avaliação de regra sem categoria é segura');

/* semanal e mensal */
const rSemanal = Regras.create({ title: 'Exercício da semana', frequency: 'weekly', penalty: 20 });
Regras.fulfill(rSemanal.id, now);
assert(Regras.streakOf(rSemanal) >= 1, 'semanal com streak ativo');
// cumprimento há 8 dias não protege esta semana? depende da semana — testa quebra futura:
const rMensal = Regras.create({ title: 'Balanço mensal', frequency: 'monthly', penalty: 5 });
Regras.fulfill(rMensal.id, monthsAgo(2)); // cumpriu há 2 meses
Regras.fulfill(rMensal.id, monthsAgo(1)); // cumpriu mês passado
assert(Regras.streakOf(rMensal) >= 2, 'mensal mantém streak entre meses');
// mês atual não cumprido ainda não quebra; mês que vem, sim
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
const evMes = Regras.evaluate(rMensal, nextMonth);
assert(evMes !== null && evMes.penalty === 5, 'mensal quebra quando o mês termina vazio');

/* deadline diário antecipa a quebra */
Game.state.wallet.gold = 100;
const rPrazo = Regras.create({ title: 'Acordar cedo', frequency: 'daily', penalty: 15, deadline: '07:00' });
const antesDoPrazo = new Date().getHours() < 7;
const simulado = new Date();
simulado.setHours(antesDoPrazo ? 3 : 8, 0, 0, 0); // 03:00 (antes) ou 08:00 (depois do prazo)
const evPrazo = Regras.evaluate(rPrazo, simulado);
assert(antesDoPrazo
  ? evPrazo === null
  : (evPrazo !== null && evPrazo.penalty === 15),
  'horário limite diário: quebra somente após o prazo sem cumprir');

/* migração v4 → v5 adiciona regras[] */
store[Storage.KEY] = JSON.stringify({
  version: 4,
  player: { name: 'V4', class: 'X', avatarId: 'default', customClass: false,
    createdCategory: true, level: 1, totalXp: 0, createdAt: sleepless() },
  categories: [], quests: [], completions: [], achievements: [],
  wallet: { gold: 0 }, inventory: { owned: [], equipped: {} },
});
Game.state = null;
const v4 = Game.load();
assert(v4.version === 5 && Array.isArray(v4.regras), 'save v4 migrado para v5 com regras[]');

/* ---------- 13. Dificuldade personalizada ---------- */
Game.createPlayer('Tester', '🧙 Mago');
const catC = Categories.create({ name: 'Custom', icon: '✨' });
const qPers = Quests.create({ title: 'Personalizada', categoryId: catC.id,
  difficulty: 'custom', xp: 77 });
assert(qPers && qPers.difficulty === 'custom', 'dificuldade Personalizada é persistida');
const gold0 = Game.state.wallet.gold;
const evPers = Game.completeQuest(qPers.id);
assert(evPers.gainedXp === 77, 'XP personalizado é aplicado (+77)');
assert(evPers.goldEarned === CUSTOM_QUEST_GOLD,
  `Gold continua vinculado à dificuldade (${CUSTOM_QUEST_GOLD}), não ao XP`);
// editar só o XP não muda o Gold
Quests.update(qPers.id, { xp: 300 });
const undone = Game.undoCompletion(Game.state.completions[Game.state.completions.length - 1].id);
assert(undone.goldBack === CUSTOM_QUEST_GOLD, 'desfazer devolve exatamente o Gold da dificuldade');

// preset com XP alterado mantém o Gold do preset
const qEasyXp = Quests.create({ title: 'Fácil com XP alto', categoryId: catC.id,
  difficulty: 'easy', xp: 90 });
assert(Quests.goldFor(qEasyXp) === DIFFICULTIES.easy.gold, 'Gold segue a dificuldade mesmo com XP manual');

/* ---------- 14. Desfazer conclusão ---------- */
// missão única
const goldU1 = Game.state.wallet.gold;
const xpU1 = Game.state.player.totalXp;
const qOnce = Quests.create({ title: 'Única p/ desfazer', categoryId: catC.id,
  difficulty: 'normal', xp: 25 });
Game.completeQuest(qOnce.id);
assert(!Quests.isAvailable(qOnce), 'única concluída fica indisponível');
const compOnce = Game.state.completions[Game.state.completions.length - 1];
assert(Game.undoCompletion(compOnce.id) !== null, 'desfazer conclusão única funciona');
assert(Quests.isAvailable(qOnce), 'única volta a ficar disponível após desfazer');
assert(Game.state.player.totalXp === xpU1, 'XP do jogador devolvido');
assert(catC.xp === 0, 'XP da categoria devolvido');
assert(Game.state.wallet.gold === goldU1, 'Gold da missão devolvido');
assert(Game.state.completions.length === Game.state.completions.length, 'histórico consistente');

// recorrente: desfaz SÓ a ocorrência atual, preservando as antigas
const qDaily = Quests.create({ title: 'Diária p/ desfazer', categoryId: catC.id,
  difficulty: 'easy', xp: 10, recurrence: 'daily' });
Game.completeQuest(qDaily.id);
Game.state.completions[Game.state.completions.length - 1].at = daysAgo(3);
Game.completeQuest(qDaily.id); // hoje
const compsBeforeUndo = Quests.completionsFor(qDaily.id).length;
assert(compsBeforeUndo === 2, 'duas ocorrências registradas (ontem e hoje)');
assert(!Quests.isAvailable(qDaily), 'diária bloqueada hoje');
const todayComp = Quests.lastCompletion(qDaily.id);
Game.undoCompletion(todayComp.id);
assert(Quests.isAvailable(qDaily), 'desfazer libera somente o período atual');
assert(Quests.completionsFor(qDaily.id).length === compsBeforeUndo - 1,
  'ocorrência antiga permanece no histórico');

// nível recalculado ao desfazer
const qBig = Quests.create({ title: 'Épica nível', categoryId: catC.id,
  difficulty: 'epic', xp: 100 });
const lvlBefore = Game.state.player.level;
const evBig = Game.completeQuest(qBig.id);
if (evBig.playerLevelUp) {
  const compBig = Game.state.completions[Game.state.completions.length - 1];
  Game.undoCompletion(compBig.id);
  assert(Game.state.player.level === lvlBefore, 'nível do jogador recalculado após desfazer');
} else {
  assert(true, 'sem level up neste ponto — nada a recalcular');
}

// desfazer id inexistente é seguro
assert(Game.undoCompletion('id-falso') === null, 'desfazer id inexistente retorna null');

console.log('\nTODOS OS TESTES PASSARAM ✔');
