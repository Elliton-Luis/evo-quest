'use strict';

/* =====================================================================
   LifeQuest — camada de interface (DOM). Toda a lógica fica em Game.
   ===================================================================== */

const UI = {
  currentScreen: 'home',
  questFilter: 'all',

  NAV_ITEMS: [
    { id: 'home',   icon: '🏠', label: 'Início' },
    { id: 'quests', icon: '⚔️', label: 'Missões' },
    { id: 'attrs',  icon: '📊', label: 'Atributos' },
    { id: 'achv',   icon: '🏆', label: 'Conquistas' },
    { id: 'char',   icon: '👤', label: 'Personagem' },
  ],

  /* ---------- utilidades ---------- */

  el(sel) { return document.querySelector(sel); },

  esc(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },

  fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
  },

  bar(cur, need, colorClass = '', key = '') {
    const pct = need > 0 ? Math.min(100, (cur / need) * 100) : 100;
    return `<div class="bar"><div class="bar-fill ${colorClass}"${key ? ` data-bar="${key}"` : ''} style="width:${pct}%"></div></div>`;
  },

  /* ---------- shell ---------- */

  showShell() {
    this.el('#topbar').classList.remove('hidden');
    this.el('#nav-mobile').classList.remove('hidden');
    document.body.classList.add('nav-visible');
    this.renderNav();
  },

  hideShell() {
    this.el('#topbar').classList.add('hidden');
    this.el('#nav-mobile').classList.add('hidden');
    document.body.classList.remove('nav-visible');
  },

  renderNav() {
    const html = this.NAV_ITEMS.map(item => `
      <button class="nav-btn ${item.id === this.currentScreen ? 'active' : ''}"
              data-action="nav" data-screen="${item.id}">
        <span>${item.icon}</span>${this.esc(item.label)}
      </button>`).join('');
    this.el('#nav-desktop').innerHTML = html;
    this.el('#nav-mobile').innerHTML = html;
  },

  navigate(screen) {
    this.currentScreen = screen;
    switch (screen) {
      case 'home':   this.renderHome(); break;
      case 'quests': this.renderQuests(); break;
      case 'attrs':  this.renderAttributes(); break;
      case 'achv':   this.renderAchievements(); break;
      case 'char':   this.renderCharacter(); break;
    }
    this.renderNav();
    window.scrollTo(0, 0);
  },

  /* ---------- telas de primeiro acesso ---------- */

  renderCreation() {
    this.hideShell();
    const CLASS_SUGGESTIONS = ['⚔️ Guerreiro', '🧙 Mago', '🏹 Arqueiro',
      '🛡️ Paladino', '💻 Programador', '📚 Estudioso'];
    const options = CLASS_SUGGESTIONS
      .map(c => `<option value="${this.esc(c)}">${this.esc(c)}</option>`).join('') +
      `<option value="__custom">✨ Personalizado</option>`;

    this.el('#screen').innerHTML = `
      <div class="center-screen">
        <div class="intro-box">
          <h1 class="intro-logo">LIFEQUEST</h1>
          <p class="intro-tag">Sua aventura começa agora.</p>
          <div class="panel">
            <form id="char-form">
              <div class="field">
                <label for="char-name">NOME</label>
                <input type="text" id="char-name" maxlength="24"
                       placeholder="Digite seu nome" autocomplete="off" required>
              </div>
              <div class="field">
                <label for="char-class">CLASSE</label>
                <select id="char-class">${options}</select>
              </div>
              <div class="field hidden" id="char-custom-field">
                <label for="char-custom">SUA CLASSE</label>
                <input type="text" id="char-custom" maxlength="24"
                       placeholder="Ex.: Cavaleiro do Código" autocomplete="off">
              </div>
              <button type="submit" class="btn btn-primary btn-block">COMEÇAR AVENTURA</button>
            </form>
          </div>
        </div>
      </div>`;
  },

  renderAdventureStarted() {
    this.showShell();
    this.el('#screen').innerHTML = `
      <div class="center-screen">
        <div class="intro-box">
          <div class="overlay-box" style="animation:none">
            <div class="overlay-icon">🌟</div>
            <div class="overlay-kicker">AVENTURA INICIADA!</div>
            <p class="overlay-sub">Boa sorte, aventureiro.</p>
            <hr class="divider-dash">
            <p class="overlay-sub" style="font-size:17px">
              Deseja começar com algumas missões de exemplo?
              Elas ficam marcadas como <b>[EXEMPLO]</b> e podem ser removidas.
            </p>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px">
              <button class="btn btn-success btn-block" data-action="add-samples">
                ADICIONAR EXEMPLOS
              </button>
              <button class="btn btn-block" data-action="go-home">
                IR PARA O PAINEL
              </button>
            </div>
          </div>
        </div>
      </div>`;
  },

  /* ---------- dashboard ---------- */

  renderHome() {
    const s = Game.state;
    const pStats = statsFromTotalXp(s.player.totalXp);

    const attrsHtml = s.categories.map(cat => {
      const st = statsFromTotalXp(cat.xp);
      return `
        <div class="attr-row">
          <div class="attr-icon">${this.esc(cat.icon)}</div>
          <div class="attr-info">
            <div class="attr-top">
              <span class="attr-name">${this.esc(cat.name)}</span>
              <span class="attr-lvl" data-level="cat:${cat.id}" data-prefix="LVL">LVL ${st.level}</span>
            </div>
            ${this.bar(st.current, st.needed, '', 'cat:' + cat.id)}
            <div class="attr-xp-text">${this.fmt(st.current)} / ${this.fmt(st.needed)} XP</div>
          </div>
        </div>`;
    }).join('');

    const active = s.quests.filter(q => !q.done).slice(0, 5);
    const questsHtml = active.length
      ? active.map(q => {
          const cat = Game.getCategory(q.categoryId);
          return `
            <div class="quest-item">
              <div class="quest-check" data-action="quest-toggle" data-id="${q.id}">□</div>
              <div class="quest-main">
                <div class="quest-name">${this.esc(q.name)}</div>
                <div class="quest-meta">${cat ? this.esc(cat.icon + ' ' + cat.name) : ''}</div>
              </div>
              <div class="quest-xp">+${q.xp} XP</div>
            </div>`;
        }).join('')
      : `<div class="empty-msg">Nenhuma missão ativa.<br>Crie missões na aba ⚔️ Missões.</div>`;

    this.el('#screen').innerHTML = `
      <div class="panel">
        <div class="attr-top">
          <div>
            <div class="hero-name">${this.esc(s.player.name)}</div>
        <div class="hero-sub">${this.esc(s.player.class)}${s.player.customClass ? ' · personalizada' : ''}</div>
          </div>
          <div class="stat-big" data-level="player" data-prefix="Lv.">Lv.${pStats.level}</div>
        </div>
        <div class="xp-label"><span>XP PARA PRÓXIMO NÍVEL</span><span>${this.fmt(pStats.total)} XP</span></div>
        ${this.bar(pStats.current, pStats.needed, 'gold', 'player')}
        <div class="xp-label"><span>Nível ${pStats.level}</span><span>${this.fmt(pStats.current)} / ${this.fmt(pStats.needed)}</span></div>
      </div>

      <div class="panel">
        <div class="panel-title">ATRIBUTOS</div>
        ${attrsHtml}
      </div>

      <div class="panel">
        <div class="panel-title">MISSÕES ATIVAS</div>
        ${questsHtml}
        <button class="btn btn-block" data-action="new-quest" style="margin-top:10px">+ NOVA MISSÃO</button>
      </div>

      <div class="panel summary-grid">
        <div>
          <div class="hero-sub">Missões concluídas</div>
          <div class="stat-big">${this.fmt(s.player.completedCount)}</div>
        </div>
        <div>
          <div class="hero-sub">Conquistas</div>
          <div class="stat-big">${s.achievements.length}/${ACHIEVEMENT_DEFS.length}</div>
        </div>
      </div>`;
  },

  /* ---------- tela de missões ---------- */

  renderQuests() {
    const all = [...Game.state.quests].reverse(); // mais recentes primeiro
    const filtered = all.filter(q =>
      this.questFilter === 'all' ? true :
      this.questFilter === 'pending' ? !q.done : q.done
    );

    const items = filtered.length
      ? filtered.map(q => this.questCard(q)).join('')
      : `<div class="empty-msg">Nenhuma missão aqui.</div>`;

    this.el('#screen').innerHTML = `
      <div class="tabs">
        ${[['all', 'TODAS'], ['pending', 'PENDENTES'], ['done', 'CONCLUÍDAS']].map(([id, label]) =>
          `<button class="tab ${this.questFilter === id ? 'active' : ''}"
                   data-action="filter" data-filter="${id}">${label}</button>`).join('')}
      </div>
      <div class="panel">${items}</div>
      <button class="btn btn-primary btn-block" data-action="new-quest">+ NOVA MISSÃO</button>`;
  },

  questCard(q) {
    const cat = Game.getCategory(q.categoryId);
    const meta = [
      cat ? `${cat.icon} ${this.esc(cat.name)}` : '',
      q.done ? `✓ Concluída` : '□ Pendente',
    ].filter(Boolean).join(' · ');

    return `
      <div class="quest-item">
        <div class="quest-check" data-action="quest-toggle" data-id="${q.id}">${q.done ? '☑' : '□'}</div>
        <div class="quest-main">
          <div class="quest-name ${q.done ? 'done' : ''}">${this.esc(q.name)}</div>
          ${q.desc ? `<div class="quest-desc">${this.esc(q.desc)}</div>` : ''}
          <div class="quest-meta">${meta}</div>
          <div class="quest-actions">
            ${q.done
              ? `<button class="btn" data-action="quest-reopen" data-id="${q.id}">↻ REABRIR</button>`
              : `<button class="btn btn-success" data-action="quest-complete" data-id="${q.id}">✓ CONCLUIR</button>`}
            <button class="btn" data-action="quest-edit" data-id="${q.id}">✎ EDITAR</button>
            <button class="btn btn-danger" data-action="quest-delete" data-id="${q.id}">🗑 EXCLUIR</button>
          </div>
        </div>
        <div class="quest-xp">+${q.xp} XP</div>
      </div>`;
  },

  /* ---------- tela de atributos ---------- */

  renderAttributes() {
    const cards = Game.state.categories.map(cat => {
      const st = statsFromTotalXp(cat.xp);
      return `
        <div class="panel attr-card">
          <div class="attr-top">
            <div class="attr-icon">${this.esc(cat.icon)}</div>
            <div class="quest-main">
              <div class="attr-name">${this.esc(cat.name.toUpperCase())}</div>
              <div class="attr-lvl" data-level="cat:${cat.id}" data-prefix="NÍVEL">NÍVEL ${st.level}</div>
            </div>
            <button class="icon-btn" title="Editar categoria"
                    data-action="cat-edit" data-id="${cat.id}">✎</button>
            <button class="icon-btn" title="Excluir categoria"
                    data-action="cat-delete" data-id="${cat.id}">🗑</button>
          </div>
          ${cat.desc ? `<div class="quest-desc" style="margin-top:4px">${this.esc(cat.desc)}</div>` : ''}
          <div style="margin-top:10px">${this.bar(st.current, st.needed, 'blue', 'cat:' + cat.id)}</div>
          <div class="xp-label"><span>XP DO NÍVEL</span><span>${this.fmt(st.current)} / ${this.fmt(st.needed)}</span></div>
          <div class="stats-line">
            <span>Missões concluídas</span><b>${this.fmt(cat.completedCount)}</b>
          </div>
          <div class="stats-line" style="border-top:none; padding-top:0">
            <span>XP total</span><b>${this.fmt(st.total)}</b>
          </div>
        </div>`;
    }).join('');

    this.el('#screen').innerHTML = `
      ${cards}
      <button class="btn btn-primary btn-block" data-action="cat-new">+ NOVA CATEGORIA</button>`;
  },

  /* ---------- tela de conquistas ---------- */

  renderAchievements() {
    const unlockedIds = new Set(Game.state.achievements.map(a => a.id));
    const dateById = Object.fromEntries(
      Game.state.achievements.map(a => [a.id, a.unlockedAt])
    );

    const sorted = [...ACHIEVEMENT_DEFS].sort((a, b) => {
      const ua = unlockedIds.has(a.id) ? 0 : 1;
      const ub = unlockedIds.has(b.id) ? 0 : 1;
      return ua - ub;
    });

    const items = sorted.map(def => {
      const unlocked = unlockedIds.has(def.id);
      const date = dateById[def.id]
        ? `<div class="ach-date">Desbloqueada em ${new Date(dateById[def.id]).toLocaleDateString('pt-BR')}</div>`
        : '';
      return `
        <div class="ach-item ${unlocked ? '' : 'locked'}">
          <div class="ach-icon">${def.icon}</div>
          <div>
            <div class="ach-name">${unlocked ? '✓ ' : ''}${this.esc(def.name)}</div>
            <div class="ach-desc">${this.esc(def.desc)}</div>
            ${date}
          </div>
        </div>`;
    }).join('');

    this.el('#screen').innerHTML = `
      <div class="panel">
        <div class="panel-title">🏆 CONQUISTAS (${Game.state.achievements.length}/${ACHIEVEMENT_DEFS.length})</div>
        ${items}
      </div>`;
  },

  /* ---------- tela do personagem ---------- */

  renderCharacter() {
    const s = Game.state;
    const pStats = statsFromTotalXp(s.player.totalXp);

    this.el('#screen').innerHTML = `
      <div class="panel" style="text-align:center">
        <div style="font-size:56px">🧙</div>
        <div class="hero-name" style="font-size:24px">${this.esc(s.player.name)}</div>
        <div class="hero-sub">${this.esc(s.player.class)}</div>
        <hr class="divider-dash">
        <div class="stats-line"><span>Nível geral</span><b>${pStats.level}</b></div>
        <div class="stats-line" style="border-top:none;padding-top:0"><span>XP total</span><b>${this.fmt(pStats.total)}</b></div>
        <div class="stats-line" style="border-top:none;padding-top:0"><span>Missões concluídas</span><b>${this.fmt(s.player.completedCount)}</b></div>
        <div class="stats-line" style="border-top:none;padding-top:0">
          <span>Conquistas</span><b>${s.achievements.length}/${ACHIEVEMENT_DEFS.length}</b>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">ZONA DE PERIGO</div>
        <p class="hero-sub" style="margin-bottom:12px">
          Reiniciar apaga TODO o progresso salvo neste navegador.
        </p>
        <button class="btn btn-danger btn-block" data-action="reset-game">REINICIAR AVENTURA</button>
      </div>`;
  },

  /* ---------- modais ---------- */

  openModal(html) {
    this.closeModal();
    const root = this.el('#modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" data-action="modal-backdrop">
        <div class="modal">${html}</div>
      </div>`;
  },

  closeModal() {
    this.el('#modal-root').innerHTML = '';
  },

  openQuestModal(quest = null) {
    const cats = Game.state.categories;
    if (!cats.length) {
      this.toast('Crie uma categoria antes!', true);
      return;
    }

    const catOptions = cats.map(c => `
      <option value="${c.id}" ${quest && quest.categoryId === c.id ? 'selected' : ''}>
        ${this.esc(c.icon + ' ' + c.name)}
      </option>`).join('');

    this.openModal(`
      <div class="modal-title">${quest ? 'EDITAR MISSÃO' : 'NOVA MISSÃO'}</div>
      <form id="quest-form" data-id="${quest ? quest.id : ''}">
        <div class="field">
          <label for="q-name">NOME DA MISSÃO</label>
          <input type="text" id="q-name" maxlength="60" required
                 value="${quest ? this.esc(quest.name) : ''}" placeholder="Ex.: Estudar JavaScript">
        </div>
        <div class="field">
          <label for="q-desc">DESCRIÇÃO (OPCIONAL)</label>
          <textarea id="q-desc" maxlength="200">${quest ? this.esc(quest.desc) : ''}</textarea>
        </div>
        <div class="field">
          <label for="q-cat">CATEGORIA</label>
          <select id="q-cat">${catOptions}</select>
        </div>
        <div class="field">
          <label for="q-xp">XP DA MISSÃO</label>
          <input type="number" id="q-xp" min="1" max="9999" required
                 value="${quest ? quest.xp : 20}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
          <button type="submit" class="btn btn-primary">${quest ? 'SALVAR' : 'CRIAR'}</button>
        </div>
      </form>`);
  },

  openCategoryModal(cat = null) {
    this.openModal(`
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
                   value="${cat ? this.esc(cat.name) : ''}" placeholder="Ex.: Música">
          </div>
        </div>
        <div class="field">
          <label for="cat-desc">DESCRIÇÃO (OPCIONAL)</label>
          <input type="text" id="cat-desc" maxlength="80"
                 value="${cat ? this.esc(cat.desc || '') : ''}"
                 placeholder="Ex.: Estudos e projetos de código">
        </div>
        ${cat ? '<p class="hero-sub" style="font-size:16px">Editar não afeta o XP nem as missões já vinculadas.</p>' : ''}
        <div class="modal-actions">
          <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
          <button type="submit" class="btn btn-primary">${cat ? 'SALVAR' : 'CRIAR'}</button>
        </div>
      </form>`);
  },

  confirmModal(title, message, action) {
    this.openModal(`
      <div class="modal-title">${this.esc(title)}</div>
      <p class="hero-sub">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="modal-cancel">CANCELAR</button>
        <button type="button" class="btn btn-danger" data-action="confirm-ok" data-confirm="${action}">CONFIRMAR</button>
      </div>`);
  },

  /* ---------- feedback: toast ---------- */

  toast(text, gold = false) {
    const root = this.el('#toast-root');
    const t = document.createElement('div');
    t.className = 'toast' + (gold ? ' gold' : '');
    t.textContent = text;
    root.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  },

  /* ---------- animações (CSS transitions; sem bibliotecas) ---------- */

  prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /** Captura nível/XP das barras ANTES de uma mudança, para animar de "antes" → "depois". */
  captureStats() {
    const snap = { player: { ...statsFromTotalXp(Game.state.player.totalXp) } };
    for (const c of Game.state.categories) {
      snap['cat:' + c.id] = { ...statsFromTotalXp(c.xp) };
    }
    return snap;
  },

  _barPct(st) {
    return st.needed > 0 ? Math.min(100, (st.current / st.needed) * 100) : 100;
  },

  /** Move uma barra de `from%` para `to%` usando a transition CSS existente. */
  _tweenBar(fill, from, to, cb) {
    fill.style.transition = 'none';
    fill.style.width = from + '%';
    void fill.offsetWidth; // força reflow para partir do ponto inicial
    fill.style.transition = '';
    requestAnimationFrame(() => { fill.style.width = to + '%'; });
    if (cb) setTimeout(cb, 480);
  },

  /**
   * Anima as barras visíveis a partir do snapshot anterior.
   * Em caso de level up: enche até 100%, pulsa e reinicia no novo nível.
   */
  animateBars(prev) {
    if (this.prefersReducedMotion() || !prev) return;

    document.querySelectorAll('.bar-fill[data-bar]').forEach(fill => {
      const key = fill.dataset.bar;
      const before = prev[key];
      if (!before) return;

      let cur = null;
      if (key === 'player') cur = statsFromTotalXp(Game.state.player.totalXp);
      else {
        const cat = Game.getCategory(key.slice(4));
        if (cat) cur = statsFromTotalXp(cat.xp);
      }
      if (!cur) return;

      const leveledUp = cur.level > before.level;
      if (!leveledUp) {
        this._tweenBar(fill, this._barPct(before), this._barPct(cur));
        return;
      }

      // Sequência de level up: enche → flash → reinicia no novo progresso
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

  /* ---------- feedback: overlays em fila ---------- */

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

    const root = this.el('#overlay-root');
    root.innerHTML = `
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

  /**
   * Aplica os eventos retornados por Game.completeQuest na ordem certa.
   * `overlayDelay` atrasa os overlays para não cobrirem a animação do cartão.
   */
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

    if (overlayDelay > 0 && !this.prefersReducedMotion()) {
      setTimeout(push, overlayDelay);
    } else {
      push();
    }
  },

  /** Verifica conquistas pendentes (ex.: ao carregar o app) e notifica. */
  flushAchievements() {
    const newly = Game.checkAchievements();
    if (!newly.length) return;
    Game.save();
    for (const def of newly) {
      this.pushOverlay({
        type: 'achieve',
        kicker: '🏆 CONQUISTA DESBLOQUEADA!',
        icon: def.icon,
        title: this.esc(def.name),
        sub: this.esc(def.desc),
      });
    }
  },
};
