'use strict';

/* Ficha de progresso para compartilhamento (Canvas API, sem dependências).
   Gera um PNG 1080×1920 (9:16) a partir dos DADOS do jogo — nunca um
   screenshot — contendo apenas estatísticas públicas. Nunca inclui o
   nome do jogador ou qualquer dado pessoal. */

const ProgressCard = {
  WIDTH: 1080,
  HEIGHT: 1920,
  FILENAME: 'lifequest-progress.png',

  C: {
    bg: '#14141f',
    panel: '#1e1e2e',
    border: '#4a4a68',
    borderLight: '#6a6a90',
    text: '#e8e8d8',
    dim: '#9a9ab2',
    gold: '#ffd75e',
    green: '#7fe07f',
    blue: '#6ecbff',
  },

  MAX_CATEGORIES: 6,

  /**
   * Coleta os dados ATUAIS reutilizando os serviços existentes
   * (Game.stats, Shop, Xp, Regras). Nenhuma segunda fonte de verdade.
   */
  collectData() {
    const st = Game.stats();
    const p = Game.state.player;

    const categories = Categories.all()
      .map(c => {
        const prog = Xp.fromTotal(c.xp);
        return {
          icon: c.icon || '⭐',
          name: c.name || '—',
          level: prog.level,
          pct: prog.needed > 0 ? Math.min(1, prog.current / prog.needed) : 0,
        };
      })
      .sort((a, b) => b.level - a.level)
      .slice(0, this.MAX_CATEGORIES);

    // Maior streak entre as regrinhas (linha oculta se não houver).
    let streak = null;
    for (const r of Regras.all()) {
      if ((r.streak || 0) > 0 && (!streak || r.streak > streak.value)) {
        streak = { value: r.streak, unit: REGRA_FREQUENCIES[r.frequency]?.unit || 'dias' };
      }
    }

    return {
      avatarIcon: Shop.avatarIcon() || '🧑',
      bgIcon: Shop.equippedIn('background')?.icon || null,
      klass: String(p.class || 'Aventureiro').toUpperCase(),
      level: st.playerLevel || 1,
      totalXp: st.totalXp || 0,
      gold: Shop.gold(),
      questsDone: st.completedQuests || 0,
      achievementsUnlocked: st.unlockedCount || 0,
      achievementsTotal: st.achievementsTotal || 0,
      categories,
      streak,
    };
  },

  /** Gera + baixa o PNG. Retorna true em caso de sucesso. */
  async share() {
    try {
      const blob = await this.generate(this.collectData());
      if (!blob) return false;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.FILENAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (e) {
      console.error('EvoQuest: falha ao gerar ficha de progresso.', e);
      return false;
    }
  },

  /** Desenha a ficha e retorna o PNG como Blob (ou null em caso de falha). */
  async generate(data) {
    const canvas = document.createElement('canvas');
    canvas.width = this.WIDTH;
    canvas.height = this.HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Garante as fontes do app antes de desenhar (fallback monospace ok).
    // Corrida contra timeout: nunca trava se document.fonts não resolver.
    try {
      if (document.fonts?.load) {
        await Promise.race([
          Promise.allSettled([
            document.fonts.load('30px "Press Start 2P"'),
            document.fonts.load('40px "VT323"'),
          ]).then(() => document.fonts.ready),
          new Promise(r => setTimeout(r, 1500)),
        ]);
      }
    } catch (_) { /* segue com fallback */ }

    this._draw(ctx, data);
    return new Promise(resolve => {
      try {
        canvas.toBlob(b => resolve(b), 'image/png');
      } catch (_) { resolve(null); }
    });
  },

  /* ---------- composição ---------- */

  _draw(ctx, d) {
    const { WIDTH: W, HEIGHT: H, C } = this;

    // Fundo + vinheta (mesma atmosfera do body do app)
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const vign = ctx.createLinearGradient(0, 0, 0, H);
    vign.addColorStop(0, 'rgba(20,20,31,0)');
    vign.addColorStop(1, 'rgba(10,10,16,.9)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    // Sombra dura + painel central (estilo .panel)
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(72, 96, W - 144, H - 168);
    ctx.fillStyle = C.panel;
    ctx.fillRect(60, 84, W - 120, H - 168);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 8;
    ctx.strokeRect(60, 84, W - 120, H - 168);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(74, 98, W - 148, H - 196);

    const cx = W / 2;

    /* Personagem: elemento principal */
    let y = 400;
    if (d.bgIcon) {
      ctx.globalAlpha = 0.14;
      ctx.font = '340px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.bgIcon, cx, y - 40);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;
    ctx.font = '230px sans-serif';
    ctx.fillStyle = C.text;
    ctx.fillText(d.avatarIcon, cx, y);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    /* Classe */
    ctx.font = '44px "Press Start 2P", monospace';
    ctx.fillStyle = C.gold;
    ctx.fillText(this._fit(ctx, d.klass, W - 260), cx, y + 220);

    /* Nível geral */
    ctx.font = '34px "Press Start 2P", monospace';
    ctx.fillStyle = C.text;
    ctx.fillText(`NÍVEL ${d.level}`, cx, y + 320);

    /* Estatísticas principais */
    const stats = [
      [`⭐`, `${this._fmt(d.totalXp)} XP`],
      [`⚔️`, `${this._fmt(d.questsDone)} MISSÕES`],
      [`🏆`, `${this._fmt(d.achievementsUnlocked)} CONQUISTAS`],
    ];
    if (d.gold > 0) stats.splice(1, 0, [`🪙`, `${this._fmt(d.gold)} GOLD`]);
    if (d.streak) stats.push([`🔥`, `${this._fmt(d.streak.value)} ${d.streak.unit.toUpperCase()}`]);

    let sy = y + 470;
    for (const [icon, label] of stats) {
      ctx.font = '46px sans-serif';
      ctx.fillText(icon, cx - 190, sy);
      ctx.font = '32px "Press Start 2P", monospace';
      ctx.fillStyle = C.dim;
      ctx.textAlign = 'left';
      ctx.fillText(label, cx - 130, sy);
      ctx.textAlign = 'center';
      sy += 104;
    }

    /* Divisor tracejado */
    sy += 24;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(cx - 330, sy);
    ctx.lineTo(cx + 330, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    sy += 70;

    /* Categorias (principais) */
    ctx.textBaseline = 'alphabetic';
    for (const cat of d.categories) {
      ctx.textAlign = 'left';
      ctx.font = '52px "VT323", monospace';
      ctx.fillStyle = C.text;
      const name = this._fit(ctx, `${cat.icon} ${cat.name}`, 560);
      ctx.fillText(name, cx - 360, sy);

      ctx.textAlign = 'right';
      ctx.font = '26px "Press Start 2P", monospace';
      ctx.fillStyle = C.blue;
      ctx.fillText(`Lv.${cat.level}`, cx + 360, sy);

      // barra de progresso fina
      const bx = cx - 360, bw = 720, by = sy + 22;
      ctx.fillStyle = '#101018';
      ctx.strokeStyle = C.borderLight;
      ctx.lineWidth = 3;
      ctx.fillRect(bx, by, bw, 22);
      ctx.strokeRect(bx, by, bw, 22);
      ctx.fillStyle = C.green;
      ctx.fillRect(bx + 4, by + 4, Math.max(0, (bw - 8) * cat.pct), 14);

      sy += 118;
    }

    /* Marca */
    ctx.textAlign = 'center';
    ctx.font = '26px "Press Start 2P", monospace';
    ctx.fillStyle = C.gold;
    ctx.fillText('L I F E Q U E S T', cx, H - 200);

    /* Scanlines sutis sobre tudo */
    ctx.fillStyle = 'rgba(255,255,255,.02)';
    for (let ly = 84; ly < H - 84; ly += 4) {
      ctx.fillRect(60, ly, W - 120, 2);
    }
  },

  /* ---------- helpers ---------- */

  _fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
  },

  /** Reduz a fonte até o texto caber na largura máxima. */
  _fit(ctx, text, maxWidth) {
    let t = String(text ?? '');
    while (ctx.measureText(t).width > maxWidth && t.length > 1) t = t.slice(0, -1);
    return t;
  },
};
