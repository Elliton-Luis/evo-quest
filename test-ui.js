// Smoke test de interface com jsdom: fluxo completo do MVP no DOM real.
// Requer: npm install --no-save jsdom
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const FILES = ['storage', 'game/xp', 'game/categories', 'game/quests',
  'game/achievements', 'state', 'ui/notifications', 'ui/modals',
  'ui/screens', 'app'];
const code = FILES.map(f => fs.readFileSync(path.join(dir, 'js', f + '.js'), 'utf8'))
  .join('\n') + '\n;window.__LQ = { Game, Screens, Quests, Categories };';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('ok:', msg);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function newApp(savedState = null) {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  if (savedState) w.localStorage.setItem('lifequest_save_v1', savedState);
  w.eval(code);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return w;
}

(async () => {
  /* ---------- 1. Primeiro acesso: criação ---------- */
  let w = newApp();
  assert(w.document.getElementById('char-form'), 'tela de criação exibida no primeiro acesso');

  /* ---------- 2. Criação com classe personalizada ---------- */
  w.document.getElementById('char-name').value = 'Alice';
  const sel = w.document.getElementById('char-class');
  sel.value = '__custom';
  sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  assert(!w.document.getElementById('char-custom-field').classList.contains('hidden'),
    'campo de classe personalizada aparece');
  w.document.getElementById('char-custom').value = 'Cavaleiro do Código';
  w.document.getElementById('char-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

  const { Game } = w.__LQ;
  assert(Game.state.player.customClass === true && Game.state.categories.length === 0,
    'personagem criado com classe personalizada e 0 categorias');

  /* ---------- 3. Tela de boas-vindas incentiva criar atributos ---------- */
  assert(w.document.body.innerHTML.includes('COMECE SUA AVENTURA'),
    'tela "COMECE SUA AVENTURA" exibida');
  w.document.querySelector('[data-action="cat-new"]').click();
  assert(w.document.getElementById('cat-form'), 'modal de nova categoria aberto pela boas-vindas');
  w.document.getElementById('cat-name').value = 'Estudos';
  w.document.getElementById('cat-desc').value = 'Livros e cursos';
  w.document.getElementById('cat-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert(Game.state.categories.length === 1 && Game.state.player.createdCategory === true,
    'categoria criada direto da tela de boas-vindas');
  assert(w.document.body.innerHTML.includes('COMECE SUA AVENTURA'),
    'boas-vindas continua mostrando as categorias criadas');

  /* ---------- 4. Painel inicial ---------- */
  w.document.querySelector('[data-action="welcome-home"]').click();
  assert(w.document.body.innerHTML.includes('Alice'), 'dashboard mostra o personagem');

  /* ---------- 5. Criar missão com dificuldade e recorrência ---------- */
  w.document.querySelector('[data-action="new-quest"]').click();
  assert(w.document.getElementById('quest-form'), 'modal de nova missão aberto');
  // selecionar dificuldade "Difícil" preenche o XP automaticamente
  const diff = w.document.getElementById('q-difficulty');
  diff.value = 'hard';
  diff.dispatchEvent(new w.Event('change', { bubbles: true }));
  assert(w.document.getElementById('q-xp').value === '50',
    'dificuldade Difícil preenche XP com 50 automaticamente');
  // usuário personaliza o XP manualmente
  w.document.getElementById('q-xp').value = '75';

  w.document.getElementById('q-title').value = 'Estudar capítulo';
  const rec = w.document.querySelector('input[name="q-recurrence"][value="daily"]');
  rec.checked = true;

  w.document.getElementById('quest-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

  const quest = Game.state.quests[0];
  assert(quest && quest.difficulty === 'hard' && quest.xp === 75 && quest.recurrence === 'daily',
    'missão criada com XP personalizado e frequência diária');

  /* ---------- 6. Concluir missão: XP + overlay ---------- */
  w.document.querySelector('[data-action="nav"][data-screen="quests"]').click();
  const btn = w.document.querySelector('[data-action="quest-complete"]');
  assert(!!btn, 'botão CONCLUIR visível para missão disponível');
  btn.click();
  await sleep(1900);

  assert(Game.stats().completedQuests === 1 && Game.state.player.totalXp === 75,
    'XP personalizado aplicado e histórico registrado');
  assert(!w.__LQ.Quests.isAvailable(quest), 'diária bloqueada dentro do mesmo dia');
  assert(w.document.body.innerHTML.includes('COMPLETA HOJE'),
    'cartão mostra status "COMPLETA HOJE · volta amanhã"');
  while (w.document.querySelector('[data-action="overlay-close"]')) {
    w.document.querySelector('[data-action="overlay-close"]').click();
  }

  /* ---------- 7. Aba de histórico ---------- */
  w.document.querySelector('[data-action="filter"][data-filter="history"]').click();
  assert(w.document.body.innerHTML.includes('HISTÓRICO (1)'),
    'aba de histórico lista a conclusão registrada');

  /* ---------- 8. Fechar e reabrir o navegador ---------- */
  const save = w.localStorage.getItem('lifequest_save_v1');
  w = newApp(save);
  const { Game: Game2 } = w.__LQ;
  await sleep(50);
  assert(Game2.load() && Game2.state.version === 3, 'save recarregado na versão 3');
  assert(!w.document.getElementById('char-form'), 'criação não é exibida novamente');
  assert(Game2.state.player.name === 'Alice' &&
    Game2.state.player.totalXp === 75 &&
    Game2.state.completions.length === 1,
    'todo o progresso preservado ao reabrir');
  assert(w.document.body.innerHTML.includes('Alice'), 'dashboard restaurado');

  console.log('\nSMOKE TEST DE INTERFACE PASSOU ✔');
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
