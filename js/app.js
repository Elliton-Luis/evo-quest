'use strict';

/* =====================================================================
   LifeQuest — bootstrap e ligação de eventos (delegação).
   Fluxo: sem save → criação de personagem; com save → app completo.
   ===================================================================== */

const App = {

  init() {
    this.bindGlobalEvents();
    if (Game.load()) {
      UI.showShell();
      UI.navigate('home');
    } else {
      UI.renderCreation();
    }
  },

  /* ---------- eventos globais (delegação) ---------- */

  bindGlobalEvents() {
    document.addEventListener('click', e => this.handleClick(e));
    document.addEventListener('submit', e => this.handleSubmit(e));
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
      case 'cat-delete': {
        const cat = Game.getCategory(btn.dataset.id);
        if (cat) {
          UI.confirmModal(
            'EXCLUIR CATEGORIA',
            `A categoria <b>${UI.esc(cat.icon + ' ' + cat.name)}</b> e suas missões serão removidas. O XP já ganho é mantido.`,
            'delete-cat:' + cat.id
          );
        }
        break;
      }

      /* primeiro acesso */
      case 'add-samples':
        Game.addSampleQuests();
        UI.navigate('home');
        break;
      case 'go-home':
        UI.navigate('home');
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

  handleSubmit(e) {
    const form = e.target;

    /* criação de personagem */
    if (form.id === 'char-form') {
      e.preventDefault();
      const name = UI.el('#char-name').value.trim();
      const klass = UI.el('#char-class').value;
      if (!name) return;
      Game.createPlayer(name, klass);
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

    /* nova categoria */
    if (form.id === 'cat-form') {
      e.preventDefault();
      const name = UI.el('#cat-name').value;
      const icon = UI.el('#cat-icon').value;
      if (Game.createCategory(name, icon)) {
        UI.toast(`Categoria ${icon} criada!`);
        UI.renderAttributes();
      }
    }
  },

  /* ---------- ações de missão com feedback ---------- */

  completeQuest(id) {
    const ev = Game.completeQuest(id);
    if (!ev) return;
    UI.showCompleteEvents(ev);
    UI.navigate(UI.currentScreen); // atualiza barras/contadores na hora
  },

  reopenQuest(id) {
    Game.reopenQuest(id);
    UI.toast('Missão reaberta', true);
    UI.navigate(UI.currentScreen);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
