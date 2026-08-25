'use strict';

/* Renderização das telas. Só monta HTML e delega ações via data-action;
   nenhuma regra de jogo aqui dentro. */

const Screens = {
  currentScreen: 'home',
  questFilter: 'all',

  NAV_ITEMS: [
    { id: 'home',   icon: '🏠', label: 'Início' },
    { id: 'quests', icon: '⚔️', label: 'Missões' },
    { id: 'regras', icon: '📜', label: 'Regras' },
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
    try {
      switch (screen) {
        case 'home':     this.home(); break;
        case 'quests':   this.quests(); break;
        case 'attrs':    this.attributes(); break;
        case 'achv':     this.achievements(); break;
        case 'char':     this.character(); break;
        case 'welcome':  this.welcome(); break;
        case 'creation': this.creation(); break;
        case 'shop':     this.shop(); break;
        case 'inventory': this.inventory(); break;
        case 'regras':   this.regras(); break;
      }
    } catch (e) {
      // Nunca deixar a aba "morta": exibe o erro em vez de tela vazia.
      console.error('EvoQuest: falha ao renderizar', screen, e);
      const reload = `<button class="btn btn-primary btn-block" style="margin-top:12px" onclick="location.reload(true)">RECARREGAR APLICATIVO</button>`;
      this.el('#screen').innerHTML = `
        <div class="panel" style="text-align:center">
          <div class="panel-title">⚠ ALGO DEU ERRADO</div>
          <p class="hero-sub">Não foi possível abrir esta tela.<br>
            Seu progresso está salvo — tente recarregar a página.</p>
          ${reload}
        </div>`;
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
          <h1 class="intro-logo">EVOQUEST</h1>
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
        <div>
          <div class="hero-sub">Gold</div>
          <div class="stat-big">🪙 ${this.fmt(Shop.gold())}</div>
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
            <button class="icon-btn" title="Desfazer conclusão"
                    data-action="quest-undo" data-id="${c.id}">↺</button>
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

    const actions = [
      available
        ? `<button class="btn btn-success" data-action="quest-complete" data-id="${q.id}">✓ CONCLUIR</button>`
        : '',
      !available && last
        ? `<button class="btn" data-action="quest-undo" data-id="${last.id}">↺ DESFAZER ÚLTIMA</button>`
        : '',
    ].join('');

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
        <div class="quest-xp">+${q.xp} XP · 🪙 ${Quests.goldFor(q)}</div>
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

    const statLine = (label, value) => `
      <div class="stats-line"><span>${label}</span><b>${value}</b></div>`;

    const equipRow = (slot, fallbackLabel) => {
      const item = Shop.equippedIn(slot);
      return `
        <div class="stats-line">
          <span>${fallbackLabel}</span>
          <b>${item ? this.esc(item.icon + ' ' + item.name) : '—'}</b>
        </div>`;
    };

    this.el('#screen').innerHTML = `
      <div class="panel" style="text-align:center">
        <div class="panel-title">PERSONAGEM</div>
        <div style="font-size:56px">${Shop.avatarIcon()}</div>
        <div class="hero-name" style="font-size:24px; margin-top:6px">${this.esc(p.name)}</div>
        <div class="hero-sub">${this.esc(p.class)}${p.customClass ? ' · personalizada' : ''}</div>
        <div class="stat-big" style="margin-top:12px">NÍVEL ${st.playerLevel}</div>
        <div style="max-width:280px; margin:10px auto 0">
          ${this.bar(st.playerProgress.current, st.playerProgress.needed, 'gold', 'player')}
          <div class="xp-label"><span>XP TOTAL</span><span>${this.fmt(st.totalXp)}</span></div>
        </div>
        <div class="hero-sub" style="color:var(--gold); margin-top:12px">🪙 ${this.fmt(Shop.gold())} Gold</div>
      </div>

      <div class="panel">
        <div class="panel-title">ESTATÍSTICAS</div>
        ${statLine('Nível geral', st.playerLevel)}
        ${statLine('XP total', this.fmt(st.totalXp))}
        ${statLine('Missões concluídas', this.fmt(st.completedQuests))}
        ${statLine('Atributos criados', st.categoriesCount)}
        ${statLine('Conquistas', `${st.unlockedCount}/${st.achievementsTotal}`)}
      </div>

      <div class="panel">
        <div class="panel-title">EQUIPAMENTO</div>
        ${equipRow('head', 'Cabeça')}
        ${equipRow('body', 'Corpo')}
        ${equipRow('accessory', 'Acessório')}
        ${equipRow('background', 'Fundo')}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px">
        <button class="btn btn-block" data-action="edit-char">✎ EDITAR PERSONAGEM</button>
        <button class="btn btn-primary btn-block" data-action="share-progress">📸 COMPARTILHAR PROGRESSO</button>
        <button class="btn btn-block" data-action="open-inventory">🎒 INVENTÁRIO</button>
        <button class="btn btn-block" data-action="open-shop">🛒 LOJA</button>
      </div>

      <div class="panel" style="margin-top:16px">
        <p class="hero-sub" style="margin-bottom:10px; font-size:16px">
          Reiniciar apaga TODO o progresso salvo neste navegador.
        </p>
        <button class="btn btn-danger btn-block" data-action="reset-game">REINICIAR AVENTURA</button>
      </div>`;
  },
});

Object.assign(Screens, {

  /* ---------- loja cosmética ---------- */

  shopTab: 'avatar',

  SHOP_TABS: [
    ['avatar', 'AVATARES'], ['head', 'CABEÇA'], ['body', 'CORPO'],
    ['accessory', 'ACESSÓRIOS'], ['background', 'FUNDOS'],
  ],

  shop() {
    const items = Shop.items(this.shopTab);
    const gold = Shop.gold();

    const cards = items.map(item => {
      const owned = Shop.owns(item.id);
      const locked = Shop.isLocked(item);
      const equipped = Shop.equippedIn(item.type)?.id === item.id;
      const rarity = RARITIES[item.rarity];
      const affordable = item.price !== null && gold >= item.price;

      let footer;
      if (locked) {
        footer = `
          <div class="shop-locked">🔒 BLOQUEADO</div>
          <div class="quest-desc">${this.esc(item.unlockDesc || '')}</div>`;
      } else if (equipped) {
        footer = `<button class="btn btn-success btn-block" data-action="shop-unequip" data-slot="${item.type}">✓ EQUIPADO</button>`;
      } else if (owned) {
        footer = `<div class="quest-meta quest-status">✓ COMPRADO</div>
                  <button class="btn btn-block" data-action="shop-equip" data-id="${item.id}">EQUIPAR</button>`;
      } else {
        footer = `
          <div class="quest-xp" style="padding-top:0">🪙 ${this.fmt(item.price)}</div>
          <button class="btn ${affordable ? 'btn-primary' : ''} btn-block"
                  data-action="shop-buy" data-id="${item.id}" ${affordable ? '' : 'disabled'}>
            ${affordable ? 'COMPRAR' : 'INSUFICIENTE'}
          </button>`;
      }

      return `
        <div class="panel shop-item">
          <div class="shop-icon">${item.icon}</div>
          <div class="quest-name">${this.esc(item.name)}</div>
          <span class="tag tag-r-${item.rarity}">${this.esc(rarity?.label || '')}</span>
          <div style="margin-top:10px">${footer}</div>
        </div>`;
    }).join('');

    this.el('#screen').innerHTML = `
      <div class="panel summary-grid" style="align-items:center">
        <div><div class="hero-sub">Gold</div><div class="stat-big">🪙 ${this.fmt(gold)}</div></div>
        <div class="hero-sub" style="flex:2; text-align:right">Tudo aqui é<br>cosmético — só estilo.</div>
      </div>

      <div class="tabs">
        ${this.SHOP_TABS.map(([id, label]) =>
          `<button class="tab ${this.shopTab === id ? 'active' : ''}"
                   data-action="shop-tab" data-type="${id}">${label}</button>`).join('')}
      </div>

      <div class="shop-grid">${cards}</div>

      <button class="btn btn-block" data-action="open-inventory" style="margin-top:4px">🎒 INVENTÁRIO</button>`;
  },

  /* ---------- inventário ---------- */

  inventory() {
    const owned = Game.state.inventory.owned
      .map(id => Shop.get(id))
      .filter(Boolean);

    const rows = owned.map(item => {
      const equipped = Shop.equippedIn(item.type)?.id === item.id;
      const slotLabel =
        { avatar: 'Avatar', head: 'Cabeça', body: 'Corpo',
          accessory: 'Acessório', background: 'Fundo' }[item.type] || item.type;
      return `
        <div class="quest-item">
          <div class="attr-icon">${item.icon}</div>
          <div class="quest-main">
            <div class="quest-name">${this.esc(item.name)}</div>
            <div class="quest-meta">
              ${slotLabel}
              <span class="tag tag-r-${item.rarity}">${this.esc(RARITIES[item.rarity]?.label || '')}</span>
            </div>
          </div>
          ${equipped
            ? `<button class="btn btn-success" data-action="shop-unequip" data-slot="${item.type}">✓</button>`
            : `<button class="btn" data-action="shop-equip" data-id="${item.id}">EQUIPAR</button>`}
        </div>`;
    }).join('');

    this.el('#screen').innerHTML = `
      <div class="panel">
        <div class="panel-title">🎒 INVENTÁRIO</div>
        ${rows || '<div class="empty-msg">Nenhum item ainda.<br>Visite a loja para começar sua coleção.</div>'}
      </div>
      <button class="btn btn-primary btn-block" data-action="open-shop">🛒 LOJA</button>`;
  },
});

Object.assign(Screens, {

  /* ---------- regrinhas ---------- */

  regraStatus(r) {
    if (Regras.isFulfilledNow(r)) {
      return `<div class="quest-meta quest-status">✓ ${this.esc(REGRA_FREQUENCIES[r.frequency].done)}</div>`;
    }
    const brokenRecently = r.streak === 0 && r.brokenCount > 0;
    let line = brokenRecently
      ? '❌ REGRA QUEBRADA · streak 0'
      : `⏳ Pendente neste período`;
    if (r.frequency === 'daily' && r.deadline && !Regras.isFulfilledNow(r)) {
      line += ` · prazo ${r.deadline}`;
    }
    return `<div class="quest-meta ${brokenRecently ? 'quest-broken' : ''}">${line}</div>`;
  },

  regras() {
    // Avalia quebras antes de renderizar (verificação lazy).
    const breaks = Regras.evaluateAll();
    if (breaks.length) {
      Game.save();
      const total = breaks.reduce((s, b) => s + b.penalty, 0);
      Notify.toast(`❌ ${breaks.length} regrinha(s) quebrada(s) · -${total} 🪙`);
    }

    const list = [...Regras.all()].reverse();
    const items = list.length
      ? list.map(r => this.regraCard(r)).join('')
      : `<div class="empty-msg">Nenhuma regrinha ainda.<br>
         Crie compromissos que você quer manter todos os dias.</div>`;

    const totalBreaks = Regras.all().reduce((s, r) => s + (r.brokenCount || 0), 0);
    const goldLost = Regras.all().reduce((s, r) => s + (r.goldLost || 0), 0);

    this.el('#screen').innerHTML = `
      <div class="panel summary-grid">
        <div>
          <div class="hero-sub">Regrinhas</div>
          <div class="stat-big">${this.fmt(Regras.all().length)}</div>
        </div>
        <div>
          <div class="hero-sub">Quebras</div>
          <div class="stat-big">${this.fmt(totalBreaks)}</div>
        </div>
        <div>
          <div class="hero-sub">Gold perdido</div>
          <div class="stat-big" style="color:var(--red)">-🪙 ${this.fmt(goldLost)}</div>
        </div>
      </div>

      <div class="panel">${items}</div>

      <button class="btn btn-primary btn-block" data-action="regra-new">+ NOVA REGRINHA</button>`;
  },

  regraCard(r) {
    const freq = REGRA_FREQUENCIES[r.frequency];
    const cat = r.categoryId && Categories.get(r.categoryId);
    const streakLabel = `${this.fmt(r.streak)} ${freq.unit}`;

    const meta = [
      cat ? this.esc(cat.icon + ' ' + cat.name) : '<span class="tag">sem categoria</span>',
      `<span class="tag">${this.esc(freq.label)}</span>`,
      r.penalty > 0 ? `<span class="tag tag-hard">-${r.penalty} 🪙</span>` : '',
    ].filter(Boolean).join(' ');

    return `
      <div class="quest-item">
        <div class="quest-check" data-action="regra-fulfill" data-id="${r.id}"
             title="Registrar cumprimento">${Regras.isFulfilledNow(r) ? '☑' : '🔥'}</div>
        <div class="quest-main">
          <div class="quest-name">${this.esc(r.title)}</div>
          ${r.description ? `<div class="quest-desc">${this.esc(r.description)}</div>` : ''}
          <div class="quest-meta">${meta}</div>
          <div class="quest-meta streak-line">🔥 Streak: ${streakLabel}</div>
          ${this.regraStatus(r)}
          <div class="quest-actions">
            ${Regras.isFulfilledNow(r)
              ? ''
              : `<button class="btn btn-success" data-action="regra-fulfill" data-id="${r.id}">✓ CUMPRIR</button>`}
            <button class="btn" data-action="regra-edit" data-id="${r.id}">✎ EDITAR</button>
            <button class="btn btn-danger" data-action="regra-delete" data-id="${r.id}">🗑 EXCLUIR</button>
          </div>
        </div>
      </div>`;
  },
});
