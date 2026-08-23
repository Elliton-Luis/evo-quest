'use strict';

/* Regrinhas: compromissos recorrentes de comportamento.
   Diferente de Missões — não rende XP/Gold; o objetivo é PRESERVAR o
   streak. Não cumprir um período → regra quebrada (streak zera e a
   penalidade em Gold é aplicada uma única vez por quebra).

   A verificação é "lazy": roda ao abrir o app/renderizar a tela,
   comparando os períodos já transcorridos com os registros de
   cumprimento. Nada de timers ou cron. */

const REGRA_FREQUENCIES = {
  daily:   { label: 'Diária',   unit: 'dias',     done: 'CUMPRIDA HOJE' },
  weekly:  { label: 'Semanal',  unit: 'semanas',  done: 'CUMPRIDA ESTA SEMANA' },
  monthly: { label: 'Mensal',   unit: 'meses',    done: 'CUMPRIDA ESTE MÊS' },
};

const Regras = {
  all() { return Game.state.regras; },

  get(id) { return Game.state.regras.find(r => r.id === id) || null; },

  create({ title, description = '', categoryId = null, frequency = 'daily',
           penalty = 10, deadline = null }) {
    const regra = {
      id: Game.uid(),
      title: (title || '').trim(),
      description: (description || '').trim(),
      categoryId: categoryId && Categories.get(categoryId) ? categoryId : null,
      frequency: REGRA_FREQUENCIES[frequency] ? frequency : 'daily',
      penalty: Math.max(0, Math.floor(Number(penalty) || 0)),
      deadline: this._validTime(deadline), // 'HH:MM' | null (usado no diário)
      createdAt: new Date().toISOString(),
      streak: 0,
      brokenCount: 0,
      goldLost: 0,
      lastBreakKey: null,
      records: [], // histórico: [{id, at}]
    };
    if (!regra.title) return null;
    Game.state.regras.push(regra);
    Game.save();
    return regra;
  },

  update(id, patch) {
    const r = this.get(id);
    if (!r) return null;
    if (patch.title !== undefined) r.title = String(patch.title).trim() || r.title;
    if (patch.description !== undefined) r.description = String(patch.description).trim();
    if (patch.categoryId !== undefined) {
      r.categoryId = patch.categoryId && Categories.get(patch.categoryId) ? patch.categoryId : null;
    }
    if (patch.frequency !== undefined && REGRA_FREQUENCIES[patch.frequency]) r.frequency = patch.frequency;
    if (patch.penalty !== undefined) r.penalty = Math.max(0, Math.floor(Number(patch.penalty) || 0));
    if (patch.deadline !== undefined) r.deadline = this._validTime(patch.deadline);
    Game.save();
    return r;
  },

  remove(id) {
    Game.state.regras = Game.state.regras.filter(r => r.id !== id);
    Game.save();
  },

  _validTime(t) {
    return typeof t === 'string' && /^\d{2}:\d{2}$/.test(t) ? t : null;
  },

  /* ---------- períodos ---------- */

  currentKey(r, now = new Date()) {
    return Quests.periodKey(now, r.frequency);
  },

  fulfilledKeys(r) {
    return new Set(r.records.map(c => Quests.periodKey(c.at, r.frequency)));
  },

  /** Desloca uma chave de período em `delta` períodos (-1 = anterior). */
  shiftKey(key, frequency, delta) {
    const pad = n => String(n).padStart(2, '0');
    if (frequency === 'monthly') {
      const y = +key.slice(0, 4), m = +key.slice(5, 7);
      const d = new Date(y, m - 1 + delta, 15);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    }
    const match = /^(w?)(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    const d = new Date(+match[2], +match[3] - 1, +match[4]);
    d.setDate(d.getDate() + delta * (frequency === 'weekly' ? 7 : 1));
    return match[1] + `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  /** Streak atual: períodos consecutivos cumpridos até agora. */
  streakOf(r, now = new Date()) {
    const keys = this.fulfilledKeys(r);
    const cur = this.currentKey(r, now);
    let k = keys.has(cur) ? cur : this.shiftKey(cur, r.frequency, -1);
    let n = 0;
    while (keys.has(k) && n < 3660) { n++; k = this.shiftKey(k, r.frequency, -1); }
    return n;
  },

  /** A regra já tem registro no período atual? */
  isFulfilledNow(r, now = new Date()) {
    return this.fulfilledKeys(r).has(this.currentKey(r, now));
  },

  fulfill(id, now = new Date()) {
    const r = this.get(id);
    if (!r) return { ok: false };
    if (this.isFulfilledNow(r, now)) return { ok: false, duplicate: true };
    r.records.push({ id: Game.uid(), at: new Date(now).toISOString() });
    r.streak = this.streakOf(r, now);
    Game.save();
    return { ok: true, rule: r };
  },

  /* ---------- avaliação (quebra + penalidade) ---------- */

  /**
   * Avalia todas as regras, aplica penalidades novas (uma única vez por
   * quebra) e retorna os eventos de quebra detectados nesta avaliação.
   */
  evaluateAll(now = new Date()) {
    const events = [];
    for (const r of this.all()) {
      const ev = this.evaluate(r, now);
      if (ev) events.push(ev);
    }
    if (events.length) Game.save();
    return events;
  },

  /**
   * Avalia uma regra contra o relógio atual:
   *  - varre do último período cumprido (ou da criação) até o período
   *    anterior ao atual; qualquer período sem registro = quebra;
   *  - com horário limite no diário, o próprio dia conta como perdido
   *    se o prazo passou sem registro;
   *  - a penalidade é aplicada apenas na PRIMEIRA detecção de cada quebra
   *    (lastBreakKey guarda o período da quebra já processada).
   */
  evaluate(r, now = new Date()) {
    const keys = this.fulfilledKeys(r);
    const cur = this.currentKey(r, now);
    let boundary = this.shiftKey(cur, r.frequency, -1);

    if (r.frequency === 'daily' && r.deadline && !keys.has(cur)) {
      const [h, m] = r.deadline.split(':').map(Number);
      const minutesNow = now.getHours() * 60 + now.getMinutes();
      if (minutesNow >= h * 60 + m) boundary = cur; // prazo de hoje já passou
    }

    const anchor = keys.size
      ? [...keys].sort().pop()
      : Quests.periodKey(r.createdAt, r.frequency);

    // Varre anchor..boundary procurando o primeiro período não cumprido.
    let missed = null;
    let k = anchor;
    for (let i = 0; i < 3660 && k <= boundary; i++) {
      if (!keys.has(k)) { missed = k; break; }
      k = this.shiftKey(k, r.frequency, 1);
    }

    if (!missed) {
      r.streak = this.streakOf(r, now);
      return null;
    }

    // Quebra existente — mas só pune a primeira detecção dela.
    r.streak = 0;
    if (r.lastBreakKey === missed) return null;

    const penalty = r.penalty;
    Game.state.wallet.gold = Math.max(0, Game.state.wallet.gold - penalty);
    r.brokenCount += 1;
    r.goldLost += penalty;
    r.lastBreakKey = missed;

    return { rule: r, missedKey: missed, penalty };
  },
};
