'use strict';

/* =====================================================================
   LifeQuest — bootstrap e ligação de eventos (delegação).
   Fluxo: sem save → criação de personagem; com save → app completo.
   ===================================================================== */

const App = {

  init() {
    if (this._initialized) return; // protege contra disparos duplicados
    this._initialized = true;

    this.bindGlobalEvents();
    if (Game.load()) {
      UI.showShell();
      UI.navigate('home');
      UI.flushAchievements(); // condições que passaram a valer com atualizações
    } else {
      UI.renderCreation();
    }
  },

  /* ---------- eventos globais (delegação) ---------- */

  bindGlobalEvents() {
    document.addEventListener('click', e => this.handleClick(e));
    document.addEventListener('submit', e => this.handleSubmit(e));
    document.addEventListener('change', e => this.handleChange(e));
    // Tecla ESC fecha modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') UI.closeModal();
    });
  },

  handleClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case 'nav':
        UI.navigate(btn.dataset.screen);
        break;

      /* missões */
      case 'new-quest':
        UI.openQuestModal(null);
        break;
      case 'quest-toggle': {
        const q = Game.state.quests.find(x => x.id === btn.dataset.id);
        if (!q) break;
        q.done ? this.reopenQuest(q.id) : this.completeQuest(q.id);
        break;
      }
      case 'quest-complete':
        this.completeQuest(btn.dataset.id);
        break;
      case 'quest-reopen':
        this.reopenQuest(btn.dataset.id);
        break;
      case 'quest-edit':
        UI.openQuestModal(Game.state.quests.find(q => q.id === btn.dataset.id));
        break;
      case 'quest-delete':
        UI.confirmModal(
          'EXCLUIR MISSÃO',
          'Esta missão será removida para sempre. O XP já ganho é mantido.',
          'delete-quest:' + btn.dataset.id
        );
        break;
      case 'filter':
        UI.questFilter = btn.dataset.filter;
        UI.renderQuests();
        break;

      /* categorias */
      case 'cat-new':
        UI.openCategoryModal(null);
        break;
      case 'cat-edit':
        UI.openCategoryModal(Game.getCategory(btn.dataset.id));
        break;
      case 'cat-delete': {
        const cat = Game.getCategory(btn.dataset.id);
        if (!cat) break;
        const total = Game.state.quests.filter(q => q.categoryId === cat.id).length;
        const msg = total > 0
          ? `A categoria <b>${UI.esc(cat.icon + ' ' + cat.name)}</b> será removida junto com <b>${total} missão(ões)</b> vinculada(s). O XP já ganho é mantido.`
          : `A categoria <b>${UI.esc(cat.icon + ' ' + cat.name)}</b> será removida. O XP já ganho é mantido.`;
        UI.confirmModal('EXCLUIR CATEGORIA', msg, 'delete-cat:' + cat.id);
        break;
      }

      /* primeiro acesso */
      case 'add-samples':
        Game.addSampleQuests();
        UI.navigate('home');
        UI.flushAchievements();
        break;
      case 'go-home':
        UI.navigate('home');
        UI.flushAchievements();
        break;

      /* modais / overlays */
      case 'modal-backdrop':
        // fecha apenas se o clique foi no fundo escuro, não dentro do modal
        if (e.target === btn) UI.closeModal();
        break;
      case 'modal-cancel':
        UI.closeModal();
        break;
      case 'confirm-ok': {
        const [kind, id] = btn.dataset.confirm.split(':');
        UI.closeModal();
        if (kind === 'delete-quest') {
          Game.deleteQuest(id);
          UI.toast('Missão excluída', true);
          UI.navigate(UI.currentScreen);
        } else if (kind === 'delete-cat') {
          Game.deleteCategory(id);
          UI.toast('Categoria excluída', true);
          UI.navigate(UI.currentScreen);
          UI.flushAchievements();
        } else if (kind === 'reset') {
          Game.reset();
          UI.renderCreation();
        }
        break;
      }
      case 'overlay-close':
        UI.closeOverlay();
        break;

      /* personagem */
      case 'reset-game':
        UI.confirmModal(
          'REINICIAR AVENTURA',
          'Todo o progresso será apagado permanentemente deste navegador.',
          'reset'
        );
        break;
    }
  },

  handleChange(e) {
    // Classe "✨ Personalizado" revela o campo de texto
    if (e.target.id === 'char-class') {
      const custom = UI.el('#char-custom-field');
      if (custom) custom.classList.toggle('hidden', e.target.value !== '__custom');
    }
  },

  handleSubmit(e) {
    const form = e.target;

    /* criação de personagem */
    if (form.id === 'char-form') {
      e.preventDefault();
      const name = UI.el('#char-name').value.trim();
      let klass = UI.el('#char-class').value;
      let isCustom = false;
      if (klass === '__custom') {
        klass = UI.el('#char-custom').value.trim();
        if (!klass) { UI.el('#char-custom').focus(); return; }
        isCustom = true;
      }
      if (!name) return;
      Game.createPlayer(name, klass, isCustom);
      UI.renderAdventureStarted();
      return;
    }

    /* criar/editar missão */
    if (form.id === 'quest-form') {
      e.preventDefault();
      const id = form.dataset.id;
      const data = {
        name: UI.el('#q-name').value,
        desc: UI.el('#q-desc').value,
        categoryId: UI.el('#q-cat').value,
        xp: UI.el('#q-xp').value,
      };
      let ok;
      if (id) {
        ok = !!Game.updateQuest(id, data);
        UI.toast('Missão atualizada');
      } else {
        ok = !!Game.createQuest(data);
        UI.toast('Missão criada');
      }
      UI.closeModal();
      if (ok) UI.navigate(UI.currentScreen);
      return;
    }

    /* criar/editar categoria */
    if (form.id === 'cat-form') {
      e.preventDefault();
      const id = form.dataset.id;
      const data = {
        icon: UI.el('#cat-icon').value,
        name: UI.el('#cat-name').value,
        desc: UI.el('#cat-desc').value,
      };
      if (id) {
        Game.updateCategory(id, data);
        UI.toast('Categoria atualizada');
      } else {
        const cat = Game.createCategory(data.name, data.icon, data.desc);
        if (!cat) return;
        UI.toast(`Categoria ${cat.icon} criada!`);
      }
      UI.closeModal();
      UI.renderAttributes();
      UI.flushAchievements();
    }
  },

  /* ---------- ações de missão com feedback em camadas ---------- */

  completeQuest(id) {
    const cardEl = document.querySelector(
      `.quest-item [data-action="quest-toggle"][data-id="${id}"],
       .quest-item [data-action="quest-complete"][data-id="${id}"]`
    )?.closest('.quest-item');

    const prev = UI.captureStats();
    const ev = Game.completeQuest(id);
    if (!ev) return;

    const animate = !UI.prefersReducedMotion();

    // 1. Feedback imediato no cartão (✓, nome riscado, +XP flutuando)
    if (animate && cardEl) UI.markQuestDone(cardEl, ev.gainedXp);

    // 2. Atualiza barras/contadores animando do valor antigo para o novo
    const delay = animate && cardEl ? 750 : 0;
    setTimeout(() => {
      UI.navigate(UI.currentScreen);
      UI.animateBars(prev);
    }, delay);

    // 3. Overlays (level up / conquistas) depois da animação do cartão
    UI.showCompleteEvents(ev, delay + (ev.categoryLevelUp || ev.playerLevelUp ? 500 : 0));
  },

  reopenQuest(id) {
    Game.reopenQuest(id);
    UI.toast('Missão reaberta', true);
    UI.navigate(UI.currentScreen);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
