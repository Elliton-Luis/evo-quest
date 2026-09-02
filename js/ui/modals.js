'use strict';

/* Modais: infraestrutura genérica + modais específicos.
   Nenhum modal conhece navegação; quem submete é o app.js. */

const Modals = {
  esc(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },

  /* ---------- infraestrutura ---------- */

  open(html) {
    this.close();
    document.querySelector('#modal-root').innerHTML = `
      <div class="modal-backdrop" data-action="modal-backdrop">
        <div class="modal">${html}</div>
      </div>`;
  },

  close() {
    document.querySelector('#modal-root').innerHTML = '';
  },

  confirm(title, message, action) {
    this.open(`
      <div class="modal-title">${this.esc(title)}</div>
      <p class="hero-sub">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
        <button type="button" class="btn btn-danger" data-action="confirm-ok" data-confirm="${action}">CONFIRMAR</button>
      </div>`);
  },

  /* ---------- missão (criar/editar) ---------- */

  /* Rascunho do formulário de missão enquanto o usuário cria uma
     categoria por dentro do modal de missão. Nada é perdido. */
  _questDraft: null,

  captureQuestForm() {
    const form = document.getElementById('quest-form');
    if (!form) return;
    const rec = form.querySelector('input[name="q-recurrence"]:checked');
    this._questDraft = {
      id: form.dataset.id,
      title: document.getElementById('q-title')?.value ?? '',
      description: document.getElementById('q-desc')?.value ?? '',
      categoryId: document.getElementById('q-cat')?.value ?? '',
      difficulty: document.getElementById('q-difficulty')?.value ?? 'normal',
      xp: document.getElementById('q-xp')?.value ?? DIFFICULTIES.normal.xp,
      recurrence: rec ? rec.value : 'once',
    };
  },

  /**
   * Reabre o modal de missão com os dados capturados.
   * `selectCategoryId` pré-seleciona a categoria recém-criada.
   * Retorna false se não havia rascunho (fechamento normal).
   */
  restoreQuestDraft(selectCategoryId = null) {
    if (!this._questDraft) return false;
    const draft = this._questDraft;
    this._questDraft = null;
    if (selectCategoryId) draft.categoryId = selectCategoryId;
    this.quest(draft);
    return true;
  },

  quest(quest = null) {
    const cats = Categories.all();
    const catOptions =
      `<option value="" ${quest && !quest.categoryId ? 'selected' : ''}>— Sem categoria —</option>` +
      cats.map(c => `
        <option value="${c.id}" ${quest && quest.categoryId === c.id ? 'selected' : ''}>
          ${this.esc(c.icon + ' ' + c.name)}
        </option>`).join('');

    const catField = cats.length
      ? `<div class="field">
           <label for="q-cat">CATEGORIA</label>
           <div style="display:flex; gap:8px">
             <select id="q-cat" style="flex:1; min-width:0">${catOptions}</select>
             <button type="button" class="icon-btn" data-action="quest-new-cat"
                     title="Criar nova categoria" style="font-size:20px">+</button>
           </div>
         </div>`
      : `<div class="field">
           <label>CATEGORIA</label>
           <button type="button" class="btn btn-block" data-action="quest-new-cat">
             + CRIAR CATEGORIA
           </button>
         </div>`;

    const diffOptions = Object.entries(DIFFICULTIES)
      .map(([id, d]) => `<option value="${id}" ${quest && quest.difficulty === id ? 'selected' : ''}>
        ${this.esc(d.label)} (${d.xp} XP)</option>`).join('') +
      `<option value="custom" ${quest && quest.difficulty === 'custom' ? 'selected' : ''}>Personalizada</option>`;

    const recOptions = Object.entries(RECURRENCES)
      .map(([id, r]) => `
        <label>
          <input type="radio" name="q-recurrence" value="${id}"
                 ${((quest && quest.recurrence) || 'once') === id ? 'checked' : ''}>
          <span class="choice-pill">${this.esc(r.label)}</span>
        </label>`).join('');

    this.open(`
      <div class="modal-title">${quest ? 'EDITAR MISSÃO' : 'NOVA MISSÃO'}</div>
      <form id="quest-form" data-id="${quest ? quest.id : ''}">
        <div class="field">
          <label for="q-title">TÍTULO DA MISSÃO</label>
          <input type="text" id="q-title" maxlength="60" required
                 value="${quest ? this.esc(quest.title) : ''}" placeholder="Ex.: Estudar 30 minutos">
        </div>
        <div class="field">
          <label for="q-desc">DESCRIÇÃO (OPCIONAL)</label>
          <textarea id="q-desc" maxlength="200">${quest ? this.esc(quest.description) : ''}</textarea>
        </div>
        ${catField}
        <div class="form-row">
          <div class="field">
            <label for="q-difficulty">DIFICULDADE</label>
            <select id="q-difficulty">${diffOptions}</select>
          </div>
          <div class="field">
            <label for="q-xp">XP</label>
            <input type="number" id="q-xp" min="1" max="99999" required
                   value="${quest ? quest.xp : DIFFICULTIES.normal.xp}">
          </div>
        </div>
        <div class="field">
          <label>FREQUÊNCIA</label>
          <div class="choice-group">${recOptions}</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
          <button type="submit" class="btn btn-primary">${quest ? 'SALVAR' : 'CRIAR'}</button>
        </div>
      </form>`);
  },

  /* ---------- categoria (criar/editar) ---------- */

  category(cat = null) {
    const currentIcon = cat ? cat.icon : '⭐';
    this.open(`
      <div class="modal-title">${cat ? 'EDITAR CATEGORIA' : 'NOVA CATEGORIA'}</div>
      <form id="cat-form" data-id="${cat ? cat.id : ''}">
        <div class="form-row">
          <div class="field" style="flex:0 0 96px; position:relative">
            <label for="cat-icon-btn">ÍCONE</label>
            <button type="button" class="icon-current" id="cat-icon-btn"
                    data-action="icon-picker-toggle" title="Escolher ícone">
              <span id="cat-icon-preview">${this.esc(currentIcon)}</span>
            </button>
            <input type="hidden" id="cat-icon" value="${this.esc(currentIcon)}">
            <div id="icon-picker" class="icon-picker hidden">
              <div class="picker-search">🔍
                <input type="text" id="icon-search" maxlength="30"
                       placeholder="Procurar ícone..." autocomplete="off">
              </div>
              <div class="picker-body" id="icon-pick-body"></div>
              <button type="button" class="btn btn-block" id="icon-more-btn"
                      data-action="icon-picker-more">MAIS</button>
            </div>
          </div>
          <div class="field">
            <label for="cat-name">NOME</label>
            <input type="text" id="cat-name" maxlength="24" required
                   value="${cat ? this.esc(cat.name) : ''}" placeholder="Ex.: Estudos, Exercícios...">
          </div>
        </div>
        <div class="field">
          <label for="cat-desc">DESCRIÇÃO (OPCIONAL)</label>
          <input type="text" id="cat-desc" maxlength="80"
                 value="${cat ? this.esc(cat.description || '') : ''}"
                 placeholder="O que este atributo representa?">
        </div>
        ${cat ? '<p class="hero-sub" style="font-size:16px">Editar não afeta o XP nem as missões já vinculadas.</p>' : ''}
        <div class="modal-actions">
          <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
          <button type="submit" class="btn btn-primary">${cat ? 'SALVAR' : 'CRIAR'}</button>
        </div>
      </form>`);
  },

  /* ---------- seletor de ícones ---------- */

  _iconGrid(icons) {
    return `<div class="picker-grid">${icons.map(emoji =>
      `<button type="button" class="pick" data-action="icon-pick" data-icon="${emoji}">${emoji}</button>`
    ).join('')}</div>`;
  },

  /** Renderiza o corpo do seletor: busca > favoritos > catálogo completo. */
  renderIconPickerBody(query = '', expanded = false) {
    const body = document.getElementById('icon-pick-body');
    const moreBtn = document.getElementById('icon-more-btn');
    if (!body) return;

    let html;
    const q = Icons.normalize(query);
    if (q) {
      const results = Icons.search(query);
      html = results.length
        ? this._iconGrid(results)
        : '<div class="empty-msg" style="padding:6px">Nada encontrado.</div>';
      if (moreBtn) moreBtn.classList.add('hidden');
    } else if (!expanded) {
      html = this._iconGrid(Icons.favorites);
      if (moreBtn) moreBtn.classList.remove('hidden');
    } else {
      html = Icons.categories.map(group => `
        <div class="picker-group">
          <div class="picker-group-label">${this.esc(group.label.toUpperCase())}</div>
          ${this._iconGrid(group.icons)}
        </div>`).join('');
      if (moreBtn) moreBtn.classList.add('hidden');
    }
    body.innerHTML = html;
  },

  /* ---------- editar personagem ---------- */

  character(player) {
    const avatarOptions = BASIC_AVATARS.map(a => `
      <label>
        <input type="radio" name="char-avatar" value="${a.id}"
               ${(player.avatarId || 'default') === a.id ? 'checked' : ''}>
        <span class="choice-pill choice-avatar">${a.icon}</span>
      </label>`).join('');

    this.open(`
      <div class="modal-title">EDITAR PERSONAGEM</div>
      <form id="edit-char-form">
        <div class="field">
          <label for="ec-name">NOME</label>
          <input type="text" id="ec-name" maxlength="24" required
                 value="${this.esc(player.name)}">
        </div>
        <div class="field">
          <label for="ec-class">CLASSE</label>
          <input type="text" id="ec-class" maxlength="24" required
                 value="${this.esc(player.class)}" placeholder="Ex.: Aventureiro, Monge...">
        </div>
        <div class="field">
          <label>AVATAR</label>
          <div class="choice-group">${avatarOptions}</div>
        </div>
        <p class="hero-sub" style="font-size:16px">
          XP, nível, missões e conquistas refletem seu progresso e não podem ser editados.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
          <button type="submit" class="btn btn-primary">SALVAR</button>
        </div>
      </form>`);
  },

  /**
   * Exclusão de categoria — NUNCA apaga missões silenciosamente.
   * O usuário escolhe: manter sem categoria ou reatribuir.
   */
  deleteCategory(cat) {
    const quests = Game.state.quests.filter(q => q.categoryId === cat.id);
    const others = Categories.all().filter(c => c.id !== cat.id);

    const missionQuestion = quests.length === 0
      ? '<p class="hero-sub">Nenhuma missão vinculada a esta categoria.</p>'
      : `
        <p class="hero-sub"><b>${quests.length} missão(ões)</b> estão vinculadas a ela.</p>
        <div class="field">
          <label>O QUE FAZER COM AS MISSÕES?</label>
          <div class="choice-group choice-column">
            <label>
              <input type="radio" name="del-mode" value="orphan" checked>
              <span class="choice-pill">Manter sem categoria</span>
            </label>
            ${others.length ? `
            <label>
              <input type="radio" name="del-mode" value="reassign">
              <span class="choice-pill">Reatribuir para outra categoria</span>
            </label>` : ''}
          </div>
        </div>
        ${others.length ? `
        <div class="field hidden" id="reassign-field">
          <label for="del-target">NOVA CATEGORIA</label>
          <select id="del-target">
            ${others.map(c => `<option value="${c.id}">${this.esc(c.icon + ' ' + c.name)}</option>`).join('')}
          </select>
        </div>` : ''}`;

    this.open(`
      <div class="modal-title">EXCLUIR CATEGORIA</div>
      <p class="hero-sub">A categoria <b>${this.esc(cat.icon + ' ' + cat.name)}</b> será removida.</p>
      ${missionQuestion}
      <p class="hero-sub" style="font-size:16px">O XP já ganho nesta categoria é mantido.</p>
      <form id="del-cat-form" data-id="${cat.id}">
        <div class="modal-actions">
          <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
          <button type="submit" class="btn btn-danger">EXCLUIR</button>
        </div>
      </form>`);
  },
};

Object.assign(Modals, {

  /* ---------- filtros de missões ---------- */

  questFilters() {
    const diffs = [
      ['all', 'Todas'],
      ['easy', 'Fácil'],
      ['normal', 'Normal'],
      ['hard', 'Difícil'],
      ['epic', 'Épica'],
      ['custom', 'Personalizada'],
    ];
    const sorts = [
      ['newest', 'Mais recentes'],
      ['oldest', 'Mais antigas'],
      ['az', 'A → Z'],
      ['za', 'Z → A'],
    ];
    const curDiff = Screens.questDifficulty || 'all';
    const curSort = Screens.questSort || 'newest';

    const diffPills = diffs.map(([id, label]) => `
      <label>
        <input type="radio" name="qf-diff" value="${id}" ${curDiff === id ? 'checked' : ''}>
        <span class="choice-pill">${this.esc(label)}</span>
      </label>`).join('');

    const sortPills = sorts.map(([id, label]) => `
      <label>
        <input type="radio" name="qf-sort" value="${id}" ${curSort === id ? 'checked' : ''}>
        <span class="choice-pill">${this.esc(label)}</span>
      </label>`).join('');

    this.open(`
      <div class="modal-title">FILTROS — MISSÕES</div>
      <form id="quest-filter-form">
        <div class="field">
          <label>DIFICULDADE</label>
          <div class="choice-group">${diffPills}</div>
        </div>
        <div class="field">
          <label>ORDENAÇÃO</label>
          <div class="choice-group">${sortPills}</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" data-action="quest-filter-clear">LIMPAR</button>
          <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
          <button type="submit" class="btn btn-primary">APLICAR</button>
        </div>
      </form>`);
  },
});

Object.assign(Modals, {

  /* ---------- regrinha (criar/editar) ---------- */

  regra(regra = null) {
    const catOptions =
      `<option value="" ${regra && !regra.categoryId ? 'selected' : ''}>— Sem categoria —</option>` +
      Categories.all().map(c => `
        <option value="${c.id}" ${regra && regra.categoryId === c.id ? 'selected' : ''}>
          ${this.esc(c.icon + ' ' + c.name)}
        </option>`).join('');

    const freqOptions = Object.entries(REGRA_FREQUENCIES)
      .map(([id, f]) => `
        <label>
          <input type="radio" name="r-freq" value="${id}"
                 ${((regra && regra.frequency) || 'daily') === id ? 'checked' : ''}>
          <span class="choice-pill">${this.esc(f.label)}</span>
        </label>`).join('');

    this.open(`
      <div class="modal-title">${regra ? 'EDITAR REGRINHA' : 'NOVA REGRINHA'}</div>
      <form id="regra-form" data-id="${regra ? regra.id : ''}">
        <div class="field">
          <label for="r-title">NOME DA REGRINHA</label>
          <input type="text" id="r-title" maxlength="60" required
                 value="${regra ? this.esc(regra.title) : ''}" placeholder="Ex.: Leitura diária">
        </div>
        <div class="field">
          <label for="r-desc">DESCRIÇÃO (OPCIONAL)</label>
          <textarea id="r-desc" maxlength="200">${regra ? this.esc(regra.description) : ''}</textarea>
        </div>
        <div class="field">
          <label for="r-cat">CATEGORIA (OPCIONAL)</label>
          <select id="r-cat">${catOptions}</select>
        </div>
        <div class="field">
          <label>FREQUÊNCIA</label>
          <div class="choice-group">${freqOptions}</div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="r-penalty">PENALIDADE (GOLD)</label>
            <input type="number" id="r-penalty" min="0" max="9999" required
                   value="${regra ? regra.penalty : 10}">
          </div>
          <div class="field">
            <label for="r-deadline">HORÁRIO LIMITE (OPCIONAL)</label>
            <input type="time" id="r-deadline" value="${regra && regra.deadline ? regra.deadline : ''}">
          </div>
        </div>
        <p class="hero-sub" style="font-size:16px">
          Se um período terminar sem cumprimento, o streak zera e a
          penalidade é descontada do Gold. O horário limite só se aplica
          às regrinhas diárias.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
          <button type="submit" class="btn btn-primary">${regra ? 'SALVAR' : 'CRIAR'}</button>
        </div>
      </form>`);
  },
});
