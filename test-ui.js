// Smoke test de interface com jsdom: fluxo completo do MVP no DOM real.
// Requer: npm install --no-save jsdom
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const FILES = ['storage', 'game/xp', 'game/categories', 'game/quests',
  'game/achievements', 'game/shop', 'game/regras', 'state', 'ui/icons',
  'ui/notifications', 'ui/progress-card', 'ui/modals', 'ui/screens', 'app'];
const code = FILES.map(f => fs.readFileSync(path.join(dir, 'js', f + '.js'), 'utf8'))
  .join('\n') + '\n;window.__LQ = { Game, Screens, Quests, Categories, Shop, Regras };';

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
  if (savedState) w.localStorage.setItem('evoquest_save_v1', savedState);
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

  const { Game, Shop, Regras } = w.__LQ;
  assert(Game.state.player.customClass === true && Game.state.categories.length === 0,
    'personagem criado com classe personalizada e 0 categorias');

  /* ---------- 3. Tela de boas-vindas incentiva criar atributos ---------- */
  assert(w.document.body.innerHTML.includes('COMECE SUA AVENTURA'),
    'tela "COMECE SUA AVENTURA" exibida');
  w.document.querySelector('[data-action="cat-new"]').click();
  assert(w.document.getElementById('cat-form'), 'modal de nova categoria aberto pela boas-vindas');

  // seletor de ícones: abrir, filtrar, escolher
  w.document.querySelector('#cat-icon-btn').click();
  assert(!w.document.getElementById('icon-picker').classList.contains('hidden'),
    'seletor de ícones abre ao clicar no ícone atual');
  assert(w.document.querySelectorAll('#icon-pick-body .pick').length >= 20,
    'favoritos exibidos por padrão no seletor');
  const search = w.document.getElementById('icon-search');
  search.value = 'livro';
  search.dispatchEvent(new w.Event('input', { bubbles: true }));
  const found = [...w.document.querySelectorAll('#icon-pick-body .pick')]
    .some(b => b.dataset.icon === '📚'); // seletor CSS do jsdom falha com emoji (astral)
  assert(found, 'busca encontra 📚 por palavra-chave');
  search.value = '';
  search.dispatchEvent(new w.Event('input', { bubbles: true }));
  w.document.querySelector('#icon-pick-body [data-action="icon-picker-more"], #icon-more-btn').click();
  assert(w.document.querySelectorAll('.picker-group').length >= 10,
    '"Mais" expande o catálogo completo com grupos');
  const target = [...w.document.querySelectorAll('#icon-pick-body .pick')]
    .find(b => b.dataset.icon === '🎯');
  target.click();
  assert(w.document.getElementById('cat-icon').value === '🎯', 'ícone escolhido vai para o campo');
  assert(w.document.getElementById('icon-picker').classList.contains('hidden'),
    'seletor fecha após escolher');

  w.document.getElementById('cat-name').value = 'Estudos';
  w.document.getElementById('cat-desc').value = 'Livros e cursos';
  w.document.getElementById('cat-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert(Game.state.categories.length === 1 && Game.state.player.createdCategory === true,
    'categoria criada direto da tela de boas-vindas');
  assert(Game.state.categories[0].icon === '🎯',
    'categoria criada com o ícone escolhido no seletor');
  assert(w.document.body.innerHTML.includes('COMECE SUA AVENTURA'),
    'boas-vindas continua mostrando as categorias criadas');

  /* ---------- 4. Painel inicial ---------- */
  w.document.querySelector('[data-action="welcome-home"]').click();
  assert(w.document.body.innerHTML.includes('Alice'), 'dashboard mostra o personagem');

  /* ---------- 5. Criar missão com dificuldade e recorrência ---------- */
  w.document.querySelector('[data-action="new-quest"]').click();
  assert(w.document.getElementById('quest-form'), 'modal de nova missão aberto');

  /* criar categoria sem sair do modal de missão */
  w.document.getElementById('q-title').value = 'Rascunho preservado';
  w.document.querySelector('[data-action="quest-new-cat"]').click();
  assert(w.document.getElementById('cat-form'),
    'modal de categoria abre a partir do modal de missão');
  w.document.getElementById('cat-name').value = 'Feito no modal';
  w.document.getElementById('cat-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const backForm = w.document.getElementById('quest-form');
  assert(!!backForm, 'salvar categoria retorna ao modal de missão');
  assert(backForm.querySelector('#q-title').value === 'Rascunho preservado',
    'dados já preenchidos da missão não são perdidos');
  const selOpt = backForm.querySelector('#q-cat').selectedOptions[0];
  assert(selOpt && selOpt.textContent.includes('Feito no modal'),
    'categoria recém-criada fica selecionada automaticamente');

  // cancelar criação de outra categoria também retorna com os dados
  w.document.querySelector('[data-action="quest-new-cat"]').click();
  w.document.querySelector('[data-action="modal-cancel"]').click();
  assert(w.document.getElementById('quest-form') &&
    w.document.getElementById('q-title').value === 'Rascunho preservado',
    'cancelar a categoria volta ao modal da missão com o rascunho');

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

  /* ---------- 7. Aba de histórico + desfazer ---------- */
  w.document.querySelector('[data-action="filter"][data-filter="history"]').click();
  assert(w.document.body.innerHTML.includes('HISTÓRICO (1)'),
    'aba de histórico lista a conclusão registrada');

  // desfazer pela aba de histórico: XP/Gold devolvidos e missão volta a ficar disponível
  const undoBtn = w.document.querySelector('[data-action="quest-undo"]');
  assert(!!undoBtn, 'botão de desfazer visível no histórico');
  undoBtn.click();
  assert(Game.stats().completedQuests === 0 && Game.state.player.totalXp === 0,
    'desfazer remove ocorrência e devolve XP');
  assert(w.__LQ.Quests.isAvailable(quest), 'missão diária disponível novamente após desfazer');

  // recria a conclusão para os testes seguintes
  w.document.querySelector('[data-action="filter"][data-filter="pending"]').click();
  w.document.querySelector('[data-action="quest-complete"]').click();
  await sleep(1900);
  while (w.document.querySelector('[data-action="overlay-close"]')) {
    w.document.querySelector('[data-action="overlay-close"]').click();
  }
  assert(Game.stats().completedQuests === 1, 'conclusão refeita para seguir os testes');

  /* ---------- 8. Regrinhas: criar, cumprir, ver streak ---------- */
  w.document.querySelector('[data-action="nav"][data-screen="regras"]').click();
  assert(w.document.body.innerHTML.includes('NOVA REGRINHA'), 'tela de regrinhas aberta');
  w.document.querySelector('[data-action="regra-new"]').click();
  assert(w.document.getElementById('regra-form'), 'modal de nova regrinha aberto');
  w.document.getElementById('r-title').value = 'Leitura diária';
  const catSel2 = w.document.getElementById('r-cat');
  catSel2.value = catSel2.options[1]?.value || '';
  w.document.getElementById('regra-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const regra = Game.state.regras[0];
  assert(regra && regra.title === 'Leitura diária', 'regrinha criada');

  w.document.querySelector('[data-action="regra-fulfill"]').click();
  assert(Regras.isFulfilledNow(regra), 'cumprimento registrado no período atual');
  assert(w.document.body.innerHTML.includes('CUMPRIDA HOJE'),
    'cartão mostra status CUMPRIDA HOJE e streak');

  /* ---------- 9. Perfil: dados consistentes + edição ---------- */
  w.document.querySelector('[data-action="nav"][data-screen="char"]').click();
  assert(w.document.body.innerHTML.includes('PERSONAGEM') &&
    w.document.body.innerHTML.includes('Alice') &&
    w.document.body.innerHTML.includes('Cavaleiro do Código'),
    'perfil exibe nome e classe corretos');
  assert(w.document.body.innerHTML.includes('🪙'), 'perfil exibe Gold');
  assert(w.document.body.textContent.includes('ESTATÍSTICAS') &&
    w.document.body.textContent.includes('EQUIPAMENTO'),
    'seções ESTATÍSTICAS e EQUIPAMENTO presentes');

  // compartilhar progresso: botão presente e falha graciosa sem canvas (jsdom)
  const shareBtn = w.document.querySelector('[data-action="share-progress"]');
  assert(!!shareBtn && shareBtn.textContent.includes('COMPARTILHAR PROGRESSO'),
    'perfil tem o botão COMPARTILHAR PROGRESSO');
  shareBtn.click();
  await sleep(120);
  assert(w.document.querySelector('[data-action="share-progress"]').disabled === false,
    'geração de imagem falha graciosamente em ambiente sem Canvas');

  // editar personagem: nome, classe e avatar
  w.document.querySelector('[data-action="edit-char"]').click();
  assert(w.document.getElementById('edit-char-form'), 'modal de editar personagem aberto');
  w.document.getElementById('ec-name').value = 'Alice II';
  w.document.getElementById('ec-class').value = 'Monge';
  const avatarRadio = w.document.querySelector('input[name="char-avatar"][value="coder"]');
  avatarRadio.checked = true;
  w.document.getElementById('edit-char-form')
    .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert(Game.state.player.name === 'Alice II' && Game.state.player.class === 'Monge' &&
    Game.state.player.avatarId === 'coder',
    'edição altera nome, classe e avatarId (nunca progresso)');
  assert(Game.stats().totalXp === 75 && Game.state.player.level === Game.stats().playerLevel,
    'XP e nível continuam derivados do progresso');

  /* ---------- 9. Loja: comprar com Gold ganho ---------- */
  Game.state.wallet.gold = 200; // simula progressão anterior
  w.document.querySelector('[data-action="open-shop"]').click();
  assert(w.document.querySelector('.shop-grid .shop-item'), 'loja renderiza itens a partir dos dados');

  // aba Cabeça → comprar o Boné (50)
  w.document.querySelector('[data-action="shop-tab"][data-type="head"]').click();
  const buyBtn = w.document.querySelector('[data-action="shop-buy"][data-id="cap"]');
  assert(buyBtn && buyBtn.textContent.includes('COMPRAR'), 'item comprável mostra botão COMPRAR');
  buyBtn.click();
  assert(Shop.owns('cap') && Game.state.wallet.gold === 150,
    'compra debita Gold e registra item uma única vez');
  assert(w.document.body.innerHTML.includes('✓ COMPRADO'), 'cartão passa a mostrar ✓ COMPRADO');

  // equipar e ver no perfil
  w.document.querySelector('[data-action="shop-equip"][data-id="cap"]').click();
  const equipped = Game.state.inventory.equipped.head;
  assert(equipped === 'cap', 'equipamento registrado no estado');

  /* ---------- 10. Inventário ---------- */
  w.document.querySelector('[data-action="open-inventory"]').click();
  assert(w.document.body.innerHTML.includes('INVENTÁRIO') &&
    w.document.body.innerHTML.includes('Boné'), 'inventário lista o item comprado');

  /* ---------- 11. Fechar e reabrir o navegador ---------- */
  const save = w.localStorage.getItem('evoquest_save_v1');
  w = newApp(save);
  const { Game: Game2 } = w.__LQ;
  await sleep(50);
  assert(Game2.load() && Game2.state.version === 5, 'save recarregado na versão 5');
  assert(!w.document.getElementById('char-form'), 'criação não é exibida novamente');
  assert(Game2.state.player.name === 'Alice II' &&
    Game2.state.player.totalXp === 75 &&
    Game2.state.wallet.gold === 150 &&
    w.__LQ.Shop.owns('cap') &&
    Game2.state.inventory.equipped.head === 'cap',
    'todo o progresso (XP, Gold, itens, equipamento) preservado ao reabrir');

  console.log('\nSMOKE TEST DE INTERFACE PASSOU ✔');
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
