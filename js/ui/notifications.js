'use strict';

/* Feedback visual: toasts, overlays em fila, animação das barras de XP.
   Apenas transform/opacity/width + CSS transitions. Sem bibliotecas. */

const Notify = {
  el(sel) { return document.querySelector(sel); },

  esc(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },

  prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /* ---------- toast ---------- */

  toast(text, gold = false) {
    const root = this.el('#toast-root');
    const t = document.createElement('div');
    t.className = 'toast' + (gold ? ' gold' : '');
    t.textContent = text;
    root.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  },

  /* ---------- overlays em fila (nunca sobrepõem) ---------- */

  _queue: [],
  _overlayOpen: false,

  pushOverlay(o) {
    this._queue.push(o);
    this._nextOverlay();
  },

  _nextOverlay() {
    if (this._overlayOpen || !this._queue.length) return;
    const o = this._queue.shift();
    this._overlayOpen = true;

    this.el('#overlay-root').innerHTML = `
      <div class="overlay-backdrop" data-action="overlay-close">
        <div class="overlay-box ${o.type === 'achieve' ? 'achieve' : 'levelup'}">
          <div class="overlay-kicker">${o.kicker}</div>
          <div class="overlay-icon">${o.icon}</div>
          <div class="overlay-title">${o.title}</div>
          ${o.sub ? `<div class="overlay-sub">${o.sub}</div>` : ''}
          <div class="overlay-hint">▶ TOQUE PARA CONTINUAR</div>
        </div>
      </div>`;
  },

  closeOverlay() {
    this.el('#overlay-root').innerHTML = '';
    this._overlayOpen = false;
    this._nextOverlay();
  },

  /** Eventos de Game.completeQuest → toasts + overlays na ordem certa. */
  showCompleteEvents(ev, overlayDelay = 0) {
    this.toast(`✓ MISSÃO COMPLETA! +${ev.gainedXp} XP`);

    const push = () => {
      if (ev.categoryLevelUp) {
        this.pushOverlay({
          type: 'levelup',
          kicker: '✨ LEVEL UP! ✨',
          icon: ev.category.icon,
          title: `${this.esc(ev.category.name)}<br>Lv.${ev.categoryLevelUp.from} → Lv.${ev.categoryLevelUp.to}`,
        });
      }
      if (ev.playerLevelUp) {
        this.pushOverlay({
          type: 'levelup',
          kicker: '★ LEVEL UP! ★',
          icon: '🌟',
          title: `${this.esc(Game.state.player.name)}<br>Lv.${ev.playerLevelUp.from} → Lv.${ev.playerLevelUp.to}`,
          sub: 'Seu nível geral aumentou!',
        });
      }
      for (const def of ev.unlocked) {
        this.pushOverlay({
          type: 'achieve',
          kicker: '🏆 CONQUISTA DESBLOQUEADA!',
          icon: def.icon,
          title: this.esc(def.name),
          sub: this.esc(def.desc),
        });
      }
    };

    if (overlayDelay > 0 && !this.prefersReducedMotion()) setTimeout(push, overlayDelay);
    else push();
  },

  /* ---------- animação das barras de XP ---------- */

  /** Captura nível/XP ANTES de uma mudança para animar "antes" → "depois". */
  captureStats() {
    const snap = { player: { ...Xp.fromTotal(Game.state.player.totalXp) } };
    for (const c of Game.state.categories) {
      snap['cat:' + c.id] = { ...Xp.fromTotal(c.xp) };
    }
    return snap;
  },

  _barPct(st) {
    return st.needed > 0 ? Math.min(100, (st.current / st.needed) * 100) : 100;
  },

  _tweenBar(fill, from, to, cb) {
    fill.style.transition = 'none';
    fill.style.width = from + '%';
    void fill.offsetWidth; // reflow para partir do ponto inicial
    fill.style.transition = '';
    requestAnimationFrame(() => { fill.style.width = to + '%'; });
    if (cb) setTimeout(cb, 480);
  },

  /**
   * Anima as barras visíveis a partir de um snapshot anterior.
   * Level up: enche até 100% → pulsa dourado → reinicia no novo nível.
   */
  animateBars(prev) {
    if (this.prefersReducedMotion() || !prev) return;

    document.querySelectorAll('.bar-fill[data-bar]').forEach(fill => {
      const key = fill.dataset.bar;
      const before = prev[key];
      if (!before) return;

      let cur = null;
      if (key === 'player') cur = Xp.fromTotal(Game.state.player.totalXp);
      else {
        const cat = Categories.get(key.slice(4));
        if (cat) cur = Xp.fromTotal(cat.xp);
      }
      if (!cur) return;

      if (cur.level <= before.level) {
        this._tweenBar(fill, this._barPct(before), this._barPct(cur));
        return;
      }

      this._tweenBar(fill, this._barPct(before), 100, () => {
        fill.classList.add('flash');
        setTimeout(() => {
          fill.classList.remove('flash');
          this.updateLevelLabels(key, cur.level);
          this._tweenBar(fill, 0, this._barPct(cur));
        }, 280);
      });
    });
  },

  updateLevelLabels(key, level) {
    document.querySelectorAll(`[data-level="${key}"]`).forEach(el => {
      el.textContent = `${el.dataset.prefix || 'Lv.'} ${level}`;
    });
  },

  /** Feedback imediato no cartão da missão antes da tela se atualizar. */
  markQuestDone(cardEl, gainedXp) {
    if (!cardEl) return;
    cardEl.classList.add('done-flash');
    const check = cardEl.querySelector('.quest-check');
    if (check) {
      check.textContent = '☑';
      check.classList.add('pop');
    }
    const name = cardEl.querySelector('.quest-name');
    if (name) name.classList.add('done');

    const float = document.createElement('div');
    float.className = 'float-xp';
    float.textContent = `+${gainedXp} XP`;
    cardEl.appendChild(float);
    setTimeout(() => float.remove(), 950);
  },
};
