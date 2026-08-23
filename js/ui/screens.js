'use strict';

/* Renderização das telas. Só monta HTML e delega ações via data-action;
   nenhuma regra de jogo aqui dentro. */

const Screens = {
  currentScreen: 'home',
  questFilter: 'all',

  NAV_ITEMS: [
    { id: 'home',   icon: '🏠', label: 'Início' },
    { id: 'quests', icon: '⚔️', label: 'Missões' },
    { id: 'attrs',  icon: '📊', label: 'Atributos' },
    { id: 'achv',   icon: '🏆', label: 'Conquistas' },
    { id: 'char',   icon: '👤', label: 'Personagem' },
  ],

  /* ---------- helpers ---------- */

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

  catName(catId) {
    const cat = catId && Categories.get(catId);
    return cat ? `${cat.icon} ${cat.name}` : '— Sem categoria —';
  },

  /* ---------- shell / navegação ---------- */

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
      case 'home':     this.home(); break;
      case 'quests':   this.quests(); break;
      case 'attrs':    this.attributes(); break;
      case 'achv':     this.achievements(); break;
      case 'char':     this.character(); break;
      case 'welcome':  this.welcome(); break;
      case 'creation': this.creation(); break;
    }
    if (screen !== 'creation') this.renderNav();
    window.scrollTo(0, 0);
  },

  refresh() {
    this.navigate(this.currentScreen);
  },

  /* ---------- primeiro acesso ---------- */

  creation() {
    this.hideShell();
    const SUGGESTIONS = ['⚔️ Guerreiro', '🧙 Mago', '🏹 Arqueiro',
      '🛡️ Paladino', '💻 Programador', '📚 Estudioso'];
    const options = SUGGESTIONS
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
                       placeholder="Ex.: Aventureiro, Monge..." autocomplete="off">
              </div>
              <button type="submit" class="btn btn-primary btn-block">COMEÇAR AVENTURA</button>
            </form>
          </div>
        </div>
      </div>`;
  },

  /** Tela pós-criação: incentiva criar os próprios atributos (começa com 0). */
  welcome() {
    this.showShell();
    const cats = Categories.all().map(c => `
      <div class="attr-row">
        <div class="attr-icon">${this.esc(c.icon)}</div>
        <div class="quest-main"><span class="attr-name">${this.esc(c.name)}</span></div>
        <span class="attr-lvl">LVL 1</span>
      </div>`).join('');

    this.el('#screen').innerHTML = `
      <div class="center-screen">
        <div class="intro-box">
          <h2 class="intro-logo" style="font-size:16px">COMECE SUA AVENTURA</h2>
          <p class="intro-tag">Crie os atributos que representam sua vida.<br>
            Ex.: Estudos, Leitura, Exercícios, Projetos...</p>
          ${cats ? `<div class="panel">${cats}</div>` : ''}
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px">
            <button class="btn btn-primary btn-block" data-action="cat-new">+ CRIAR CATEGORIA</button>
            <button class="btn btn-block" data-action="welcome-home">IR PARA O PAINEL</button>
          </div>
        </div>
      </div>`;
  },

  /* ---------- dashboard ---------- */

  home() {
    const st = Game.stats();
    const p = st.playerProgress;

    const catRows = Categories.all().map(cat => {
      const s = Xp.fromTotal(cat.xp);
      return `
        <div class="attr-row">
          <div class="attr-icon">${this.esc(cat.icon)}</div>
          <div class="attr-info">
            <div class="attr-top">
              <span class="attr-name">${this.esc(cat.name)}</span>
              <span class="attr-lvl" data-level="cat:${cat.id}" data-prefix="LVL">LVL ${s.level}</span>
            </div>
            ${this.bar(s.current, s.needed, '', 'cat:' + cat.id)}
            <div class="attr-xp-text">${this.fmt(s.current)} / ${this.fmt(s.needed)} XP</div>
          </div>
        </div>`;
    }).join('');

    const attrsPanel = catRows
      ? `<div class="panel">
           <div class="panel-title">ATRIBUTOS</div>
           ${catRows}
         </div>`
      : `<div class="panel">
           <div class="panel-title">ATRIBUTOS</div>
           <div class="empty-msg">Nenhum atributo ainda.<br>Crie o primeiro para começar a ganhar XP.</div>
           <button class="btn btn-primary btn-block" data-action="cat-new" style="margin-top:10px">+ CRIAR CATEGORIA</button>
         </div>`;

    const active = Quests.availableQuests().slice(0, 5);
    const questsHtml = active.length
      ? active.map(q => this.questRow(q)).join('')
      : `<div class="empty-msg">Nenhuma missão disponível.<br>Crie missões na aba ⚔️ Missões.</div>`;

    this.el('#screen').innerHTML = `
      <div class="panel">
        <div class="attr-top">
          <div>
            <div class="hero-name">${this.esc(Game.state.player.name)}</div>
            <div class="hero-sub">${this.esc(Game.state.player.class)}${Game.state.player.customClass ? ' · personalizada' : ''}</div>
          </div>
          <div class="stat-big" data-level="player" data-prefix="Lv.">Lv.${p.level}</div>
        </div>
        <div class="xp-label"><span>XP PARA PRÓXIMO NÍVEL</span><span>${this.fmt(p.total)} XP</span></div>
        ${this.bar(p.current, p.needed, 'gold', 'player')}
        <div class="xp-label"><span>Nível ${p.level}</span><span>${this.fmt(p.current)} / ${this.fmt(p.needed)}</span></div>
      </div>

      ${attrsPanel}

      <div class="panel">
        <div class="panel-title">MISSÕES ATIVAS</div>
        ${questsHtml}
        <button class="btn btn-block" data-action="new-quest" style="margin-top:10px">+ NOVA MISSÃO</button>
      </div>

      <div class="panel summary-grid">
        <div>
          <div class="hero-sub">Missões concluídas</div>
          <div class="stat-big">${this.fmt(st.completedQuests)}</div>
        </div>
        <div>
          <div class="hero-sub">Conquistas</div>
          <div class="stat-big">${st.unlockedCount}/${st.achievementsTotal}</div>
        </div>
      </div>`;
  },

  questRow(q) {
    return `
      <div class="quest-item">
        <div class="quest-check" data-action="quest-toggle" data-id="${q.id}">□</div>
        <div class="quest-main">
          <div class="quest-name">${this.esc(q.title)}</div>
          <div class="quest-meta">${this.esc(this.catName(q.categoryId))} · +${q.xp} XP</div>
        </div>
      </div>`;
  },
};

Object.assign(Screens, {

  /* ---------- tela de missões ---------- */

  quests() {
    const FILTERS = [
      ['all', 'TODAS'], ['pending', 'PENDENTES'],
      ['done', 'CONCLUÍDAS'], ['history', 'HISTÓRICO'],
    ];

    let content;
    if (this.questFilter === 'history') {
      content = this.historyList();
    } else {
      const all = [...Quests.all()].reverse();
      const list = all.filter(q =>
        this.questFilter === 'pending' ? Quests.isAvailable(q) :
        this.questFilter === 'done' ? !Quests.isAvailable(q) : true
      );
      content = `<div class="panel">${
        list.length ? list.map(q => this.questCard(q)).join('')
                    : '<div class="empty-msg">Nenhuma missão aqui.</div>'
      }</div>`;
    }

    this.el('#screen').innerHTML = `
      <div class="tabs">
        ${FILTERS.map(([id, label]) =>
          `<button class="tab ${this.questFilter === id ? 'active' : ''}"
                   data-action="filter" data-filter="${id}">${label}</button>`).join('')}
      </div>
      ${content}
      <button class="btn btn-primary btn-block" data-action="new-quest">+ NOVA MISSÃO</button>`;
  },

  historyList() {
    const items = [...Game.state.completions]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 100)
      .map(c => {
        const q = c.questId && Quests.get(c.questId);
        const title = q ? q.title : (c.questId ? 'Missão removida' : 'Missão (histórico antigo)');
        const when = new Date(c.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const recLabel = c.recurrence !== 'once' && RECURRENCES[c.recurrence]
          ? ' · ' + RECURRENCES[c.recurrence].label : '';
        return `
          <div class="quest-item">
            <div class="quest-check">✓</div>
            <div class="quest-main">
              <div class="quest-name done">${this.esc(title)}</div>
              <div class="quest-meta">${when}${recLabel}</div>
            </div>
            <div class="quest-xp">+${c.xp} XP</div>
          </div>`;
      }).join('');

    return `<div class="panel">
      <div class="panel-title">HISTÓRICO (${this.fmt(Game.state.completions.length)})</div>
      ${items || '<div class="empty-msg">Nenhuma conclusão registrada ainda.</div>'}
    </div>`;
  },

  questCard(q) {
    const diff = DIFFICULTIES[q.difficulty];
    const available = Quests.isAvailable(q);
    const last = Quests.lastCompletion(q.id);
    const onceDone = q.recurrence === 'once' && last;

    let statusHtml = '';
    if (!available) {
      statusHtml = onceDone
        ? '<div class="quest-meta quest-status">✓ Concluída</div>'
        : `<div class="quest-meta quest-status">✓ ${this.esc(Quests.doneLabel(q.recurrence))} · volta ${this.esc(Quests.nextLabel(q.recurrence))}</div>`;
    }

    const meta = [
      this.esc(this.catName(q.categoryId)),
      `<span class="tag tag-${q.difficulty}">${this.esc(diff?.label || 'Normal')}</span>`,
      q.recurrence !== 'once'
        ? `<span class="tag">${this.esc(RECURRENCES[q.recurrence].label)}</span>` : '',
    ].filter(Boolean).join(' ');

    const actions = available
      ? `<button class="btn btn-success" data-action="quest-complete" data-id="${q.id}">✓ CONCLUIR</button>`
      : '';

    return `
      <div class="quest-item">
        <div class="quest-check" data-action="quest-toggle" data-id="${q.id}">${available ? '□' : '☑'}</div>
        <div class="quest-main">
          <div class="quest-name ${onceDone ? 'done' : ''}">${this.esc(q.title)}</div>
          ${q.description ? `<div class="quest-desc">${this.esc(q.description)}</div>` : ''}
          <div class="quest-meta">${meta}</div>
          ${statusHtml}
          <div class="quest-actions">
            ${actions}
            <button class="btn" data-action="quest-edit" data-id="${q.id}">✎ EDITAR</button>
            <button class="btn btn-danger" data-action="quest-delete" data-id="${q.id}">🗑 EXCLUIR</button>
          </div>
        </div>
        <div class="quest-xp">+${q.xp} XP</div>
      </div>`;
  },

  /* ---------- atributos ---------- */

  attributes() {
    const cards = Categories.all().map(cat => {
      const s = Xp.fromTotal(cat.xp);
      return `
        <div class="panel attr-card">
          <div class="attr-top">
            <div class="attr-icon">${this.esc(cat.icon)}</div>
            <div class="quest-main">
              <div class="attr-name">${this.esc(cat.name.toUpperCase())}</div>
              <div class="attr-lvl" data-level="cat:${cat.id}" data-prefix="NÍVEL">NÍVEL ${s.level}</div>
            </div>
            <button class="icon-btn" title="Editar categoria"
                    data-action="cat-edit" data-id="${cat.id}">✎</button>
            <button class="icon-btn" title="Excluir categoria"
                    data-action="cat-delete" data-id="${cat.id}">🗑</button>
          </div>
          ${cat.description ? `<div class="quest-desc" style="margin-top:4px">${this.esc(cat.description)}</div>` : ''}
          <div style="margin-top:10px">${this.bar(s.current, s.needed, 'blue', 'cat:' + cat.id)}</div>
          <div class="xp-label"><span>XP DO NÍVEL</span><span>${this.fmt(s.current)} / ${this.fmt(s.needed)}</span></div>
          <div class="stats-line" style="border-top:none;padding-top:0">
            <span>XP total</span><b>${this.fmt(s.total)}</b>
          </div>
        </div>`;
    }).join('');

    this.el('#screen').innerHTML = `
      ${cards}
      <button class="btn btn-primary btn-block" data-action="cat-new">+ NOVA CATEGORIA</button>`;
  },

  /* ---------- conquistas ---------- */

  achievements() {
    const st = Game.stats();
    const unlockedIds = new Set(Game.state.achievements.map(a => a.id));
    const dateById = Object.fromEntries(
      Game.state.achievements.map(a => [a.id, a.unlockedAt])
    );

    const sorted = [...Achievements.defs].sort((a, b) => {
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
        <div class="panel-title">🏆 CONQUISTAS (${st.unlockedCount}/${st.achievementsTotal})</div>
        ${items}
      </div>`;
  },

  /* ---------- personagem ---------- */

  character() {
    const st = Game.stats();
    const p = Game.state.player;

    this.el('#screen').innerHTML = `
      <div class="panel" style="text-align:center">
        <div style="font-size:56px">🧙</div>
        <div class="hero-name" style="font-size:24px">${this.esc(p.name)}</div>
        <div class="hero-sub">${this.esc(p.class)}${p.customClass ? ' · personalizada' : ''}</div>
        <hr class="divider-dash">
        <div class="stats-line"><span>Nível geral</span><b>${st.playerLevel}</b></div>
        <div class="stats-line" style="border-top:none;padding-top:0"><span>XP total</span><b>${this.fmt(st.totalXp)}</b></div>
        <div class="stats-line" style="border-top:none;padding-top:0"><span>Missões concluídas</span><b>${this.fmt(st.completedQuests)}</b></div>
        <div class="stats-line" style="border-top:none;padding-top:0"><span>Atributos criados</span><b>${st.categoriesCount}</b></div>
        <div class="stats-line" style="border-top:none;padding-top:0"><span>Missões cadastradas</span><b>${st.questsCount}</b></div>
        <div class="stats-line" style="border-top:none;padding-top:0">
          <span>Conquistas</span><b>${st.unlockedCount}/${st.achievementsTotal}</b>
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
});
