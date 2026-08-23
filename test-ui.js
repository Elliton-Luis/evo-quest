// Smoke test de interface com jsdom: fluxo completo do MVP no DOM real.
// Requer: npm install --no-save jsdom
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const code = ['storage', 'game', 'ui', 'app']
  .map(f => fs.readFileSync(path.join(dir, 'js', f + '.js'), 'utf8'))
  .join('\n') + '\n;window.__LQ = { Game, UI };';

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

const $ = (w, sel) => w.document.querySelector(sel);

(async () => {
  /* ---------- 1. Primeiro acesso mostra criação de personagem ---------- */
  let w = newApp();
  assert(w.document.getElementById('char-form'), 'tela de criação exibida no primeiro acesso');

  /* ---------- 2. Criação com classe personalizada ---------- */
  w.document.getElementById('char-name').value = 'Alice';
  const sel = w.document.getElementById('char-class');
  sel.value = '__custom';
  sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  assert(!w.document.getElementById('char-custom-field').classList.contains('hidden'),
    'campo de classe personalizada aparece ao selecionar ✨ Personalizado');
  w.document.getElementById('char-custom').value = 'Cavaleiro do Código';
  w.document.getElementById('char-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

  const { Game } = w.__LQ;
  assert(Game.state.player.class === 'Cavaleiro do Código' && Game.state.player.customClass === true,
    'personagem criado com classe personalizada');
  assert(w.document.querySelector('[data-action="go-home"]'), 'tela AVENTURA INICIADA exibida');

  /* ---------- 3. Painel inicial ---------- */
  w.document.querySelector('[data-action="go-home"]').click();
  assert(w.document.body.innerHTML.includes('Alice'), 'dashboard mostra o nome do personagem');
  assert(w.document.querySelectorAll('.attr-row').length === 4, '4 categorias padrão no dashboard');

  /* ---------- 4. Criar missão pelo modal ---------- */
  w.document.querySelector('[data-action="new-quest"]').click();
  assert(w.document.getElementById('quest-form'), 'modal de nova missão aberto');
  w.document.getElementById('q-name').value = 'Estudar JavaScript';
  w.document.getElementById('q-xp').value = '30';
  w.document.getElementById('quest-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert(Game.state.quests.length === 1 && Game.state.quests[0].xp === 30,
    'missão criada e salva no estado');

  /* ---------- 5. Concluir missão: XP, nível geral e conquista ---------- */
  w.document.querySelector('[data-action="nav"][data-screen="quests"]').click();
  const btn = w.document.querySelector('[data-action="quest-complete"]');
  assert(!!btn, 'botão CONCLUIR visível na tela de missões');
  btn.click();

  await sleep(1900); // aguarda feedback do cartão + re-render + overlays

  assert(Game.state.player.totalXp === 30, 'XP aplicado ao personagem (+30)');
  assert(Game.state.player.completedCount === 1, 'contador de missões concluídas = 1');
  assert(Game.isUnlocked('first_step') && Game.isUnlocked('own_identity'),
    'Primeiro Passo e Identidade Própria desbloqueadas');
  assert(w.document.querySelector('#overlay-root .overlay-box'),
    'overlay de recompensa exibido após concluir');
  // fecha overlays
  while (w.document.querySelector('[data-action="overlay-close"]')) {
    w.document.querySelector('[data-action="overlay-close"]').click();
  }

  /* ---------- 6. Editar categoria sem perder XP/vínculos ---------- */
  w.document.querySelector('[data-action="nav"][data-screen="attrs"]').click();
  w.document.querySelector('[data-action="cat-edit"]').click();
  assert(w.document.getElementById('cat-form'), 'modal de editar categoria aberto');
  w.document.getElementById('cat-name').value = 'Desenvolvimento';
  w.document.getElementById('cat-desc').value = 'Código e estudos';
  w.document.getElementById('cat-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const cat = Game.getCategory(Game.state.quests[0].categoryId);
  assert(cat.name === 'Desenvolvimento' && cat.desc === 'Código e estudos',
    'categoria renomeada com descrição');
  assert(cat.xp === 30 && Game.state.quests[0].categoryId === cat.id,
    'XP e vínculo da missão preservados após renomear');

  /* ---------- 7. Fechar e reabrir o navegador ---------- */
  const save = w.localStorage.getItem('lifequest_save_v1');
  w = newApp(save);
  const { Game: Game2 } = w.__LQ;
  await sleep(50);
  assert(Game2.load() && Game2.state.player.name === 'Alice', 'save recarregado ao reabrir');
  assert(Game2.state.version === 2, 'save permanece na versão 2');
  assert(!w.document.getElementById('char-form'), 'criação NÃO é exibida novamente');
  assert(w.document.body.innerHTML.includes('Alice'), 'dashboard restaurado com progresso');
  assert(Game2.state.quests.length === 1 && Game2.state.achievements.length >= 2,
    'missões e conquistas preservadas');

  console.log('\nSMOKE TEST DE INTERFACE PASSOU ✔');
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
