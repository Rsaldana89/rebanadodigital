(() => {
  const root = document.querySelector('[data-state-chime-scope]');
  if (!root) return;

  const scope = root.dataset.stateChimeScope || 'default';
  const endpoint = root.dataset.stateChimeEndpoint || '';
  const pollMs = Number(root.dataset.stateChimePollMs || 8000);
  const PREF_KEY = 'chc-rebanado-state-chime-enabled';
  const SNAPSHOT_KEY = `chc-rebanado-state-snapshot:${scope}`;
  const SNAPSHOT_MAX_AGE = 3 * 60 * 1000;
  const buttons = Array.from(document.querySelectorAll('[data-state-chime-toggle]'));

  let enabled = true;
  let audioContext = null;
  let audioBlocked = false;
  let knownStates = collectStates();
  let pollTimer = null;

  try {
    const savedPreference = window.localStorage.getItem(PREF_KEY);
    enabled = savedPreference !== 'off';
  } catch (error) {}

  function collectStates() {
    const map = new Map();
    document.querySelectorAll('[data-vale-id][data-status]').forEach(card => {
      const id = String(card.dataset.valeId || '').trim();
      const status = String(card.dataset.status || '').trim();
      if (id && status && !map.has(id)) map.set(id, status);
    });
    return map;
  }

  function mapToObject(map) {
    return Object.fromEntries(Array.from(map.entries()));
  }

  function readSnapshot() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SNAPSHOT_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object' || typeof parsed.savedAt !== 'number' || !parsed.states) return null;
      if (Date.now() - parsed.savedAt > SNAPSHOT_MAX_AGE) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveSnapshot(map = knownStates) {
    try {
      window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
        savedAt: Date.now(),
        states: mapToObject(map)
      }));
    } catch (error) {}
  }

  function compareWithStoredSnapshot() {
    const previous = readSnapshot();
    if (!previous) {
      saveSnapshot();
      return [];
    }

    const changes = [];
    Object.entries(previous.states).forEach(([id, oldStatus]) => {
      const newStatus = knownStates.get(String(id));
      if (newStatus && oldStatus && newStatus !== oldStatus) {
        changes.push({ id: String(id), from: oldStatus, to: newStatus });
      }
    });

    saveSnapshot();
    return changes;
  }

  function ensureAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContext) audioContext = new AudioCtx();
    return audioContext;
  }

  async function unlockAudio() {
    if (!enabled) return false;
    try {
      const ctx = ensureAudioContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') await ctx.resume();
      audioBlocked = ctx.state !== 'running';
      updateButtons();
      return !audioBlocked;
    } catch (error) {
      audioBlocked = true;
      updateButtons();
      return false;
    }
  }

  function tone(ctx, destination, frequency, start, duration, gainValue, type = 'triangle') {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue * 0.58), start + Math.max(0.05, duration * 0.42));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }

  function createChimeOutput(ctx, start, masterLevel) {
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();

    master.gain.setValueAtTime(masterLevel, start);
    compressor.threshold.setValueAtTime(-18, start);
    compressor.knee.setValueAtTime(16, start);
    compressor.ratio.setValueAtTime(5, start);
    compressor.attack.setValueAtTime(0.004, start);
    compressor.release.setValueAtTime(0.18, start);

    master.connect(compressor);
    compressor.connect(ctx.destination);
    return master;
  }

  async function playChime({ preview = false } = {}) {
    if (!enabled) return false;
    const ready = await unlockAudio();
    if (!ready) return false;

    try {
      const ctx = ensureAudioContext();
      const now = ctx.currentTime + 0.015;
      const isWarehouse = scope === 'warehouse';
      const previewScale = preview ? 0.88 : 1;
      const output = createChimeOutput(ctx, now, isWarehouse ? 0.98 : 0.78);

      if (isWarehouse) {
        // V19.0.22: alerta de almacén más fuerte y evidente para TV.
        // Frecuencias medias + armónicos para que se escuche bien en bocinas pequeñas.
        tone(ctx, output, 659.25, now,        0.34, 0.34 * previewScale, 'triangle');
        tone(ctx, output, 1318.51, now,       0.24, 0.13 * previewScale, 'sine');
        tone(ctx, output, 880.00, now + 0.21, 0.38, 0.36 * previewScale, 'triangle');
        tone(ctx, output, 1760.00, now + 0.21,0.27, 0.13 * previewScale, 'sine');
        tone(ctx, output, 1046.50, now + 0.46,0.48, 0.39 * previewScale, 'triangle');
        tone(ctx, output, 2093.00, now + 0.46,0.34, 0.14 * previewScale, 'sine');
        tone(ctx, output, 1318.51, now + 0.79,0.34, 0.28 * previewScale, 'triangle');
      } else {
        // En el tablero operativo también se refuerza, pero con menor intensidad que la TV.
        tone(ctx, output, 740.00, now,        0.30, 0.24 * previewScale, 'triangle');
        tone(ctx, output, 987.77, now + 0.18, 0.34, 0.25 * previewScale, 'triangle');
        tone(ctx, output, 1318.51, now + 0.39,0.40, 0.22 * previewScale, 'triangle');
      }

      audioBlocked = false;
      updateButtons();
      return true;
    } catch (error) {
      audioBlocked = true;
      updateButtons();
      return false;
    }
  }

  function updateButtons() {
    buttons.forEach(button => {
      const icon = button.querySelector('[data-state-chime-icon]');
      const label = button.querySelector('[data-state-chime-label]');
      button.classList.toggle('is-muted', !enabled);
      button.classList.toggle('needs-activation', enabled && audioBlocked);
      button.setAttribute('aria-pressed', String(enabled));

      if (!enabled) {
        if (icon) { const use = icon.querySelector('use'); if (use) use.setAttribute('href', '#icon-bell-off'); else icon.className = 'bi bi-bell-slash-fill'; }
        if (label) label.textContent = 'Sin sonido';
        button.title = 'Activar campanita al cambiar el estado de un vale';
      } else if (audioBlocked) {
        if (icon) { const use = icon.querySelector('use'); if (use) use.setAttribute('href', '#icon-bell'); else icon.className = 'bi bi-bell-fill'; }
        if (label) label.textContent = 'Activar sonido';
        button.title = 'El navegador bloqueó el audio. Haz clic para activarlo.';
      } else {
        if (icon) { const use = icon.querySelector('use'); if (use) use.setAttribute('href', '#icon-bell'); else icon.className = 'bi bi-bell-fill'; }
        if (label) label.textContent = 'Sonido';
        button.title = 'Campanita activa al cambiar el estado de un vale';
      }
    });
  }

  function registerChanges(changes) {
    if (!changes.length) return;
    playChime();
    document.dispatchEvent(new CustomEvent('chc:vale-state-change', { detail: { scope, changes } }));
  }

  async function pollStates() {
    if (!endpoint || document.hidden || !knownStates.size) return;
    const ids = Array.from(knownStates.keys()).slice(0, 250);
    if (!ids.length) return;

    try {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('ids', ids.join(','));
      const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.ok || !Array.isArray(payload.items)) return;

      const changes = [];
      payload.items.forEach(item => {
        const id = String(item.id || '').trim();
        const nextStatus = String(item.estado || '').trim();
        if (!id || !nextStatus) return;
        const previousStatus = knownStates.get(id);
        if (previousStatus && previousStatus !== nextStatus) {
          changes.push({ id, from: previousStatus, to: nextStatus });
        }
        knownStates.set(id, nextStatus);
      });

      saveSnapshot();
      registerChanges(changes);
    } catch (error) {
      // La campanita es una ayuda visual/sonora; una falla de polling no debe afectar la operación.
    }
  }

  buttons.forEach(button => {
    button.addEventListener('click', async event => {
      event.preventDefault();

      if (enabled && audioBlocked) {
        const unlocked = await unlockAudio();
        if (unlocked) await playChime({ preview: true });
        return;
      }

      enabled = !enabled;
      try {
        window.localStorage.setItem(PREF_KEY, enabled ? 'on' : 'off');
      } catch (error) {}

      if (enabled) {
        await unlockAudio();
        await playChime({ preview: true });
      }
      updateButtons();
    });
  });

  const passiveUnlock = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', passiveUnlock, true);
    window.removeEventListener('keydown', passiveUnlock, true);
  };
  window.addEventListener('pointerdown', passiveUnlock, true);
  window.addEventListener('keydown', passiveUnlock, true);

  updateButtons();
  registerChanges(compareWithStoredSnapshot());

  if (endpoint && Number.isFinite(pollMs) && pollMs >= 4000) {
    pollTimer = window.setInterval(pollStates, pollMs);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) pollStates();
    });
  }

  window.addEventListener('beforeunload', () => {
    saveSnapshot();
    if (pollTimer) window.clearInterval(pollTimer);
  });
})();
