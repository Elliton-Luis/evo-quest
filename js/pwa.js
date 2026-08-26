'use strict';

const PWA = {
  init() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        // If an update is found, prompt is handled via toast; auto-activate on waiting
        if (reg.waiting) this._promptUpdate(reg.waiting);

        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              this._promptUpdate(sw);
            }
          });
        });
      }).catch(() => {});

      // Reload when new SW takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    });
  },

  _promptUpdate(worker) {
    // Minimal UX: toast informing; click reload is implicit via controllerchange
    worker.postMessage('SKIP_WAITING');
  }
};
