'use strict';

/* Bootstrap e ligação de eventos (delegação global).
   Fluxo: sem save → criação de personagem → boas-vindas (0 categorias);
   com save → app completo. */

const App = {

  init() {
    if (this._initialized) return; // protege contra disparos duplicados
    this._initialized = true;

    document.addEventListener('click', e => this.handleClick(e));
    document.addEventListener('submit', e => this.handleSubmit(e));
    document.addEventListener('change', e => this.handleChange(e));
    document.addEventListener('input', e => this.handleInput(e));
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      // ESC fecha o seletor de ícones primeiro; só então o modal.
      const picker = document.getElementById('icon-picker');
      if (picker && !picker.classList.contains('hidden')) {
        picker.classList.add('hidden');
        return;
      }
      Modals.close();
    });

    if (Game.load()) {
      Screens.showShell();
      // Save antigo sem nenhuma categoria? Convida a criar na tela de boas-vindas.
      Screens.navigate(Game.state.categories.length === 0 && !Game.state.completions.length
        ? 'welcome' : 'home');
      this.flushAchievements();
      // Verifica regrinhas quebradas enquanto o app esteve fechado.
      const breaks = Regras.evaluateAll();
      if (breaks.length) {
        const total = breaks.reduce((s, b) => s + b.penalty, 0);
        Notify.toast(`❌ ${breaks.length} regrinha(s) quebrada(s) · -${total} 🪙`);
      }
    } else {
      Screens.navigate('creation');
    }
  },

  /* ---------- delegação de eventos ---------- */

  handleClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case 'nav':
        Screens.navigate(btn.dataset.screen);
        break;
      case 'welcome-home':
        Screens.navigate('home');
        break;

      /* missões */
      case 'new-quest':
        Modals.quest(null);
        break;
      case 'quest-toggle': {
        const q = Quests.get(btn.dataset.id);
        if (q && Quests.isAvailable(q)) this.completeQuest(q.id);
        break;
      }
      case 'quest-complete':
        this.completeQuest(btn.dataset.id);
        break;
      case 'quest-undo': {
        const prev = Notify.captureStats();
        const undone = Game.undoCompletion(btn.dataset.id);
        if (!undone) break;
        Notify.toast('↺ Conclusão desfeita', true);
        Screens.refresh();
        Notify.animateBars(prev);
        break;
      }
      case 'quest-edit':
        Modals.quest(Quests.get(btn.dataset.id));
        break;
      case 'quest-delete':
        Modals.confirm(
          'EXCLUIR MISSÃO',
          'Esta missão será removida para sempre. O XP já ganho e o histórico são mantidos.',
          'delete-quest:' + btn.dataset.id
        );
        break;
      case 'filter':
        Screens.questFilter = btn.dataset.filter;
        Screens.quests();
        break;

      /* categorias */
      case 'cat-new':
        Modals.category(null);
        break;
      case 'cat-edit':
        Modals.category(Categories.get(btn.dataset.id));
        break;
      case 'cat-delete': {
        const cat = Categories.get(btn.dataset.id);
        if (cat) Modals.deleteCategory(cat); // nunca apaga missões silenciosamente
        break;
      }

      /* loja / inventário */
      case 'shop-tab':
        Screens.shopTab = btn.dataset.type;
        Screens.shop();
        break;
      case 'shop-buy': {
        const result = Shop.buy(btn.dataset.id);
        if (result.ok) Notify.toast(`🛒 ${result.item.name} comprado!`, true);
        else if (result.reason === 'poor') Notify.toast('Gold insuficiente');
        else Notify.toast('Item indisponível');
        Screens.refresh();
        break;
      }
      case 'shop-equip':
        if (Shop.equip(btn.dataset.id)) Notify.toast('Item equipado', true);
        Screens.refresh();
        break;
      case 'shop-unequip':
        if (Shop.unequip(btn.dataset.slot)) Notify.toast('Item desequipado');
        Screens.refresh();
        break;

      /* regrinhas */
      case 'regra-new':
        Modals.regra(null);
        break;
      case 'regra-edit':
        Modals.regra(Regras.get(btn.dataset.id));
        break;
      case 'regra-fulfill': {
        const result = Regras.fulfill(btn.dataset.id);
        if (result.ok) {
          const r = result.rule;
          Notify.toast(`🔥 ${r.title}: ${REGRA_FREQUENCIES[r.frequency].done.toLowerCase()}`, true);
        } else if (result.duplicate) {
          Notify.toast('Já registrada neste período');
        }
        Screens.refresh();
        break;
      }
      case 'regra-delete':
        Modals.confirm(
          'EXCLUIR REGRINHA',
          'A regrinha e seu histórico de streak serão removidos. Gold não é devolvido.',
          'delete-regra:' + btn.dataset.id
        );
        break;

      /* seletor de ícones */
      case 'icon-picker-toggle': {
        const picker = Screens.el('#icon-picker');
        if (!picker) break;
        const opening = picker.classList.contains('hidden');
        picker.classList.toggle('hidden', !opening);
        if (opening) {
          Modals.renderIconPickerBody('', false);
          const search = Screens.el('#icon-search');
          if (search) search.focus();
        }
        break;
      }
      case 'icon-picker-more': {
        const picker = Screens.el('#icon-picker');
        if (picker) picker.dataset.expanded = '1';
        Modals.renderIconPickerBody(Screens.el('#icon-search').value, true);
        break;
      }
      case 'icon-pick': {
        const emoji = btn.dataset.icon;
        const input = Screens.el('#cat-icon');
        if (input && emoji) input.value = emoji;
        const preview = Screens.el('#cat-icon-preview');
        if (preview && emoji) preview.textContent = emoji;
        const picker = Screens.el('#icon-picker');
        if (picker) { picker.classList.add('hidden'); delete picker.dataset.expanded; }
        const search = Screens.el('#icon-search');
        if (search) search.value = '';
        break;
      }

      /* modais / overlays */
      case 'modal-backdrop':
        if (e.target === btn) Modals.close();
        break;
      case 'modal-cancel':
        Modals.close();
        break;
      case 'confirm-ok': {
        const [kind, id] = btn.dataset.confirm.split(':');
        Modals.close();
        if (kind === 'delete-quest') {
          Quests.remove(id);
          Notify.toast('Missão excluída', true);
          Screens.refresh();
          this.flushAchievements(); // arsenal/planejador contam cadastro
        } else if (kind === 'delete-regra') {
          Regras.remove(id);
          Notify.toast('Regrinha excluída', true);
          Screens.refresh();
        } else if (kind === 'reset') {
          Game.reset();
          Screens.navigate('creation');
        }
        break;
      }
      case 'overlay-close':
        Notify.closeOverlay();
        break;

      /* personagem */
      case 'edit-char':
        Modals.character(Game.state.player);
        break;
      case 'open-shop':
        Screens.navigate('shop');
        break;
      case 'open-inventory':
        Screens.navigate('inventory');
        break;
      case 'reset-game':
        Modals.confirm(
          'REINICIAR AVENTURA',
          'Todo o progresso será apagado permanentemente deste navegador.',
          'reset'
        );
        break;
    }
  },

  handleChange(e) {
    const t = e.target;

    // Classe "✨ Personalizado" revela o campo de texto
    if (t.id === 'char-class') {
      const field = Screens.el('#char-custom-field');
      if (field) field.classList.toggle('hidden', t.value !== '__custom');
    }

    // Dificuldade preenche o XP automaticamente; o usuário pode alterar depois.
    if (t.id === 'q-difficulty') {
      const preset = DIFFICULTIES[t.value];
      if (preset) Screens.el('#q-xp').value = preset.xp;
    }

    // Exclusão de categoria: mostrar select ao escolher reatribuir
    if (t.name === 'del-mode') {
      const field = Screens.el('#reassign-field');
      if (field) field.classList.toggle('hidden', t.value !== 'reassign');
    }
  },

  handleInput(e) {
    // Filtro em tempo real do seletor de ícones
    if (e.target.id === 'icon-search') {
      const picker = Screens.el('#icon-picker');
      const expanded = !!picker && picker.dataset.expanded === '1';
      Modals.renderIconPickerBody(e.target.value, expanded);
    }
  },

  handleSubmit(e) {
    const form = e.target;

    /* criação de personagem */
    if (form.id === 'char-form') {
      e.preventDefault();
      const name = Screens.el('#char-name').value.trim();
      let klass = Screens.el('#char-class').value;
      let isCustom = false;
      if (klass === '__custom') {
        klass = Screens.el('#char-custom').value.trim();
        if (!klass) { Screens.el('#char-custom').focus(); return; }
        isCustom = true;
      }
      if (!name) return;
      Game.createPlayer(name, klass, isCustom);
      Screens.navigate('welcome'); // 0 categorias: convida a criar atributos
      return;
    }

    /* editar personagem (nome, classe, avatar — nunca progresso) */
    if (form.id === 'edit-char-form') {
      e.preventDefault();
      const name = Screens.el('#ec-name').value.trim();
      const klass = Screens.el('#ec-class').value.trim();
      if (!name || !klass) return;
      const av = form.querySelector('input[name="char-avatar"]:checked');
      Game.updatePlayer({ name, class: klass, avatarId: av ? av.value : 'default' });
      Modals.close();
      Notify.toast('Personagem atualizado');
      Screens.refresh();
      return;
    }

    /* criar/editar categoria */
    if (form.id === 'cat-form') {
      e.preventDefault();
      const id = form.dataset.id;
      const data = {
        icon: Screens.el('#cat-icon').value,
        name: Screens.el('#cat-name').value,
        description: Screens.el('#cat-desc').value,
      };
      if (id) {
        Categories.update(id, data);
        Notify.toast('Categoria atualizada');
      } else {
        const cat = Categories.create(data);
        if (!cat) return;
        Notify.toast(`Categoria ${cat.icon} criada!`);
      }
      Modals.close();
      Screens.currentScreen === 'welcome'
        ? Screens.welcome()   // mostra a lista crescendo na tela de boas-vindas
        : Screens.refresh();
      this.flushAchievements();
      return;
    }

    /* excluir categoria (com destino das missões) */
    if (form.id === 'del-cat-form') {
      e.preventDefault();
      const modeEl = form.querySelector('input[name="del-mode"]:checked');
      const mode = modeEl ? modeEl.value : 'orphan';
      const target = Screens.el('#del-target');
      Categories.remove(form.dataset.id, { mode, targetId: target ? target.value : null });
      Modals.close();
      Notify.toast('Categoria excluída', true);
      Screens.refresh();
      this.flushAchievements();
      return;
    }

    /* criar/editar regrinha */
    if (form.id === 'regra-form') {
      e.preventDefault();
      const id = form.dataset.id;
      const freq = form.querySelector('input[name="r-freq"]:checked');
      const data = {
        title: Screens.el('#r-title').value,
        description: Screens.el('#r-desc').value,
        categoryId: Screens.el('#r-cat').value || null,
        frequency: freq ? freq.value : 'daily',
        penalty: Screens.el('#r-penalty').value,
        deadline: Screens.el('#r-deadline').value || null,
      };
      if (id) {
        Regras.update(id, data);
        Notify.toast('Regrinha atualizada');
      } else {
        const r = Regras.create(data);
        if (!r) return;
        Notify.toast(`📜 ${r.title} criada!`);
      }
      Modals.close();
      Screens.refresh();
      return;
    }

    /* criar/editar missão */
    if (form.id === 'quest-form') {
      e.preventDefault();
      const id = form.dataset.id;
      const rec = form.querySelector('input[name="q-recurrence"]:checked');
      const data = {
        title: Screens.el('#q-title').value,
        description: Screens.el('#q-desc').value,
        categoryId: Screens.el('#q-cat').value || null,
        difficulty: Screens.el('#q-difficulty').value,
        xp: Screens.el('#q-xp').value,
        recurrence: rec ? rec.value : 'once',
      };
      let ok;
      if (id) {
        ok = !!Quests.update(id, data);
        Notify.toast('Missão atualizada');
      } else {
        ok = !!Quests.create(data);
        Notify.toast('Missão criada');
      }
      Modals.close();
      if (ok) Screens.refresh();
      this.flushAchievements(); // primeira jornada / arsenal etc.
    }
  },

  /* ---------- conclusão de missão com feedback em camadas ---------- */

  completeQuest(id) {
    const cardEl = document.querySelector(
      `.quest-item [data-action="quest-toggle"][data-id="${id}"],
       .quest-item [data-action="quest-complete"][data-id="${id}"]`
    )?.closest('.quest-item');

    const prev = Notify.captureStats();
    const ev = Game.completeQuest(id);
    if (!ev) return;

    const animate = !Notify.prefersReducedMotion();

    // 1. Feedback imediato no cartão
    if (animate && cardEl) Notify.markQuestDone(cardEl, ev.gainedXp);

    // 2. Barras/contadores animam do valor antigo para o novo
    const delay = animate && cardEl ? 750 : 0;
    setTimeout(() => {
      Screens.refresh();
      Notify.animateBars(prev);
    }, delay);

    // 3. Overlays (level up / conquistas) depois da animação do cartão
    const overlayDelay = delay + (ev.categoryLevelUp || ev.playerLevelUp ? 500 : 0);
    Notify.showCompleteEvents(ev, overlayDelay);
  },

  /** Verifica conquistas pendentes e notifica em fila (+bônus de Gold). */
  flushAchievements() {
    const newly = Achievements.check(Game.state);
    if (!newly.length) return;
    Game.state.wallet.gold += newly.length * ECONOMY.achievementBonus;
    Game.save();
    Notify.toast(`🏆 +${newly.length * ECONOMY.achievementBonus} Gold`, true);
    for (const def of newly) {
      Notify.pushOverlay({
        type: 'achieve',
        kicker: '🏆 CONQUISTA DESBLOQUEADA!',
        icon: def.icon,
        title: Modals.esc(def.name),
        sub: Modals.esc(def.desc),
      });
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
