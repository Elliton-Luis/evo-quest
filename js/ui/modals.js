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

  quest(quest = null) {
    const cats = Categories.all();
    const catOptions =
      `<option value="" ${quest && !quest.categoryId ? 'selected' : ''}>— Sem categoria —</option>` +
      cats.map(c => `
        <option value="${c.id}" ${quest && quest.categoryId === c.id ? 'selected' : ''}>
          ${this.esc(c.icon + ' ' + c.name)}
        </option>`).join('');

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
        <div class="field">
          <label for="q-cat">CATEGORIA</label>
          <select id="q-cat">${catOptions}</select>
        </div>
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
    this.open(`
      <div class="modal-title">${cat ? 'EDITAR CATEGORIA' : 'NOVA CATEGORIA'}</div>
      <form id="cat-form" data-id="${cat ? cat.id : ''}">
        <div class="form-row">
          <div class="field" style="flex:0 0 80px">
            <label for="cat-icon">ÍCONE</label>
            <input type="text" id="cat-icon" maxlength="4"
                   value="${cat ? this.esc(cat.icon) : '⭐'}">
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
