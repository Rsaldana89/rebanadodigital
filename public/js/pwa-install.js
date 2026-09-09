(() => {
  const worker = document.body?.dataset.pwaWorker || '/sw.js';
  const scope = document.body?.dataset.pwaScope || '/';
  const installButtons = Array.from(document.querySelectorAll('[data-pwa-install]'));
  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function setInstallVisibility(visible) {
    installButtons.forEach(button => { button.hidden = !visible; });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(worker, { scope }).catch(error => {
        console.warn('No fue posible registrar la aplicación instalable.', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    if (!isStandalone()) setInstallVisibility(true);
  });

  installButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      button.disabled = true;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.disabled = false;
      setInstallVisibility(false);
    });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setInstallVisibility(false);
  });

  if (isStandalone()) setInstallVisibility(false);
})();
