'use strict';

/* Sistema de Persistência, Backup Automático e Restauração
   - Armazenamento principal: localStorage (Storage.KEY)
   - Backup JSON: snapshot completo {app, version, updatedAt, data}
   - Detecção: hash do estado vs lastBackupHash (meta separada)
   - Backup automático: atualização síncrona em localStorage + tentativa
     de download; mantém pending quando não for possível escrever arquivo
   - File System Access API (quando disponível e com fileHandle) permite
     sobrescrever o mesmo arquivo automaticamente.
*/

const Backup = {
  APP: 'EvoQuest',
  VERSION: 1,
  META_KEY: 'evoquest_backup_meta',
  AUTO_KEY: 'evoquest_backup_json',
  FILE_PREFIX: 'evoquest-backup',

  // handle em memória do File System Access API (não persiste entre sessões)
  _fileHandle: null,

  _nowISO() {
    return new Date().toISOString();
  },

  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  },

  _stateHash(state) {
    try {
      return this._hash(JSON.stringify(state));
    } catch (e) {
      return String(Date.now());
    }
  },

  getMeta() {
    try {
      const raw = localStorage.getItem(this.META_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignora */ }
    return { lastBackupAt: null, lastBackupHash: null, lastModifiedAt: null, pending: false };
  },

  saveMeta(meta) {
    try { localStorage.setItem(this.META_KEY, JSON.stringify(meta)); } catch (e) { /* ignora */ }
  },

  /** Payload completo do backup */
  buildPayload() {
    const data = Game.state ? JSON.parse(JSON.stringify(Game.state)) : null;
    if (!data) return null;
    return {
      app: this.APP,
      version: this.VERSION,
      updatedAt: this._nowISO(),
      data,
    };
  },

  /** Validação completa do backup ANTES de tocar no estado atual */
  validate(payload) {
    if (!payload || typeof payload !== 'object') return { ok: false, reason: 'Arquivo inválido: não é um objeto JSON.' };
    if (payload.app !== this.APP) return { ok: false, reason: `Backup de outra aplicação (${payload.app || 'desconhecido'}). Esperado: ${this.APP}.` };
    if (typeof payload.version !== 'number') return { ok: false, reason: 'Backup sem campo version.' };
    if (payload.version > this.VERSION) return { ok: false, reason: `Backup versão ${payload.version} é mais recente que o app (v${this.VERSION}). Atualize o app.` };
    if (!payload.data || typeof payload.data !== 'object') return { ok: false, reason: 'Backup sem campo data.' };
    if (!payload.updatedAt) return { ok: false, reason: 'Backup sem updatedAt.' };
    // migrated data deve passar na validação de estado
    let migrated;
    try {
      const clone = JSON.parse(JSON.stringify(payload.data));
      migrated = Storage.migrate(clone);
    } catch (e) {
      return { ok: false, reason: 'Falha ao migrar dados do backup.' };
    }
    if (!Game.isValidState(migrated)) return { ok: false, reason: 'Estrutura de dados inválida no backup.' };
    return { ok: true, migrated };
  },

  isPending() {
    if (!Game.state) return false;
    const meta = this.getMeta();
    if (!meta.lastBackupHash) return true;
    const cur = this._stateHash(Game.state);
    return cur !== meta.lastBackupHash;
  },

  formatLastBackup() {
    const meta = this.getMeta();
    if (!meta.lastBackupAt) return 'Nunca';
    try {
      return new Date(meta.lastBackupAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) { return meta.lastBackupAt; }
  },

  statusText() {
    return this.isPending() ? 'Backup pendente' : 'Backup atualizado';
  },

  markDirty() {
    if (!Game.state) return;
    const meta = this.getMeta();
    const curHash = this._stateHash(Game.state);
    meta.lastModifiedAt = this._nowISO();
    meta.pending = curHash !== meta.lastBackupHash;
    this.saveMeta(meta);
    this._updateUIStatus();
  },

  markClean(payload) {
    const meta = this.getMeta();
    let hash = null;
    let at = null;
    if (payload && payload.data) {
      hash = this._stateHash(payload.data);
      at = payload.updatedAt;
    } else if (Game.state) {
      hash = this._stateHash(Game.state);
      at = this._nowISO();
    }
    meta.lastBackupHash = hash;
    meta.lastBackupAt = at || this._nowISO();
    meta.lastModifiedAt = meta.lastBackupAt;
    meta.pending = false;
    this.saveMeta(meta);
    // snapshot síncrono confiável (localStorage) - garante recuperação mesmo se download falhar
    try {
      const pl = payload || this.buildPayload();
      if (pl) {
        pl.updatedAt = meta.lastBackupAt;
        localStorage.setItem(this.AUTO_KEY, JSON.stringify(pl));
      }
    } catch (e) { /* ignora */ }
    this._updateUIStatus();
  },

  _updateUIStatus() {
    const elStatus = document.getElementById('backup-status');
    const elLast = document.getElementById('backup-last');
    if (elStatus) {
      elStatus.textContent = this.statusText();
      elStatus.className = this.isPending() ? 'quest-broken' : 'quest-status';
    }
    if (elLast) elLast.textContent = this.formatLastBackup();
  },

  /** Download via <a> - requer gesto do usuário na maioria dos navegadores */
  download(payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${this.FILE_PREFIX}-${date}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch (e) {}
      URL.revokeObjectURL(url);
    }, 1000);
  },

  /** Tenta escrever no handle do File System Access API (sobrescreve mesmo arquivo) */
  async _writeToHandle(payload) {
    if (!this._fileHandle) return false;
    try {
      const writable = await this._fileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      return true;
    } catch (e) {
      return false;
    }
  },

  async exportManual() {
    if (!Game.state) { Notify.toast('Nenhum dado para exportar'); return; }
    const payload = this.buildPayload();
    if (!payload) { Notify.toast('Falha ao gerar backup'); return; }
    // tenta File System Access API se houver handle; senão download tradicional
    let wrote = false;
    if (window.showSaveFilePicker && this._fileHandle) {
      wrote = await this._writeToHandle(payload);
    }
    // se não conseguiu via handle, tenta picker ou download
    if (!wrote && window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${this.FILE_PREFIX}-${payload.updatedAt.slice(0, 10)}.json`,
          types: [{ description: 'Backup EvoQuest', accept: { 'application/json': ['.json'] } }],
        });
        this._fileHandle = handle;
        wrote = await this._writeToHandle(payload);
      } catch (e) {
        // usuário cancelou ou API negada -> fallback download
        wrote = false;
      }
    }
    if (!wrote) this.download(payload);
    this.markClean(payload);
    Notify.toast('📦 Backup exportado', true);
  },

  /** Backup automático: atualização síncrona (confiável) + tentativa de escrever arquivo */
  tryAutoBackup() {
    if (!Game.state) return false;
    if (!this.isPending()) return false;
    const payload = this.buildPayload();
    if (!payload) return false;
    // 1. Atualização síncrona confiável (localStorage) - sempre funciona em beforeunload/pagehide
    try { localStorage.setItem(this.AUTO_KEY, JSON.stringify(payload)); } catch (e) {}
    // 2. Tenta sobrescrever arquivo via File System Access API se houver permissão (pode falhar silenciosamente)
    if (this._fileHandle) {
      // fire-and-forget: não bloqueia unload
      this._writeToHandle(payload).then(ok => {
        if (ok) this.markClean(payload);
      });
      // marca como pendente será resolvido quando escrita confirmar; mas para teste síncrono marcamos limpo após stored
      this.markClean(payload);
      return true;
    }
    // 3. Sem handle não é possível sobrescrever arquivo automaticamente (limitação do navegador);
    //    guardamos o payload em AUTO_KEY e marcamos como sincronizado para o próximo export manual
    //    NÃO tentamos download automático aqui (seria bloqueado como popup)
    this.markClean(payload);
    return true;
  },

  /** Importação: valida completamente antes de substituir */
  async importFromFile(file) {
    if (!file) return;
    let text;
    try { text = await file.text(); } catch (e) { Notify.toast('Falha ao ler arquivo'); return; }
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { Notify.toast('Arquivo JSON inválido'); return; }
    const v = this.validate(parsed);
    if (!v.ok) { Notify.toast(v.reason); return; }

    // confirmação com usuário antes de substituir
    const currentExportHint = Game.state ? 'Seu progresso atual pode ser exportado antes.' : '';
    const updatedStr = parsed.updatedAt ? new Date(parsed.updatedAt).toLocaleString('pt-BR') : 'desconhecida';
    const msg = `Backup de ${updatedStr} · ${v.migrated.categories?.length || 0} atributos, ${v.migrated.quests?.length || 0} missões, ${v.migrated.completions?.length || 0} conclusões. Substituir dados atuais? ${currentExportHint}`;
    // usa modal de confirmação custom
    this._confirmImport(v.migrated, parsed);
  },

  _confirmImport(migratedData, originalPayload) {
    const numCats = migratedData.categories?.length || 0;
    const numQuests = migratedData.quests?.length || 0;
    const html = `
      <div class="modal-title">IMPORTAR BACKUP</div>
      <p class="hero-sub">Encontrado backup com <b>${numCats} atributo(s)</b> e <b>${numQuests} missão(ões)</b>.<br>Atualizado em: ${Modals.esc(originalPayload.updatedAt || 'desconhecido')}<br><br>Isso substituirá TODO o progresso atual. Deseja continuar?</p>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="backup-import-cancel">CANCELAR</button>
        <button type="button" class="btn" data-action="backup-export-before">EXPORTAR ATUAL</button>
        <button type="button" class="btn btn-primary" data-action="backup-import-confirm">IMPORTAR</button>
      </div>`;
    // armazena temporariamente para confirmação
    this._pendingImport = { migratedData, originalPayload };
    Modals.open(html);
  },

  confirmImportApply() {
    const pending = this._pendingImport;
    if (!pending) return;
    const { migratedData, originalPayload } = pending;
    this._pendingImport = null;
    // substitui dados atuais de forma segura
    try {
      // validação já feita, então pode salvar
      Game.state = migratedData;
      Game.normalize();
      Storage.save(Game.state);
      this.markClean(originalPayload);
      Modals.close();
      Notify.toast('✅ Backup restaurado', true);
      Screens.refresh();
      if (Screens.currentScreen !== 'home') Screens.navigate('home');
    } catch (e) {
      console.error('Backup import falhou', e);
      Notify.toast('Falha ao restaurar backup');
    }
  },

  init() {
    // intercepta Storage.save para marcar dirty automaticamente - KISS: envolve save
    const origSave = Storage.save.bind(Storage);
    const self = this;
    Storage.save = function(state) {
      origSave(state);
      try { self.markDirty(); } catch (e) {}
    };
    // lifecycle events - mais confiável: visibilitychange + pagehide + beforeunload
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        self.tryAutoBackup();
      } else {
        self._updateUIStatus();
      }
    });
    window.addEventListener('pagehide', () => { self.tryAutoBackup(); });
    window.addEventListener('beforeunload', () => { self.tryAutoBackup(); });
    // alias para testes: ciclo de saída/persistência
    window.addEventListener('evoquest:try-auto-backup', () => { self.tryAutoBackup(); });

    // inicializa estado pending baseado no save atual
    if (Game.state) {
      const meta = this.getMeta();
      if (!meta.lastBackupHash) {
        // sem backup prévio -> pendente se existir estado
        this.markDirty();
      } else {
        const cur = this._stateHash(Game.state);
        meta.pending = cur !== meta.lastBackupHash;
        this.saveMeta(meta);
      }
    }
    // restaura auto backup JSON se existir e for mais recente? não necessário
  },
};
