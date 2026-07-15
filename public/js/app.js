document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;

  document.querySelectorAll('.navbar-nav .nav-link[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '/logout' || href.startsWith('http')) return;
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });


  // Mostrar u ocultar la contraseña en el login.
  const passwordInput = document.querySelector('[data-password-input]');
  const passwordToggle = document.querySelector('[data-password-toggle]');

  if (passwordInput && passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      const showing = passwordInput.type === 'text';
      passwordInput.type = showing ? 'password' : 'text';
      passwordToggle.setAttribute('aria-pressed', showing ? 'false' : 'true');
      passwordToggle.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
      const icon = passwordToggle.querySelector('i');
      if (icon) icon.className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
      passwordInput.focus();
    });
  }

  // Recordar el acceso únicamente en el navegador actual.
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.querySelector('[data-login-username]');
  const rememberLogin = document.querySelector('[data-remember-login]');
  const savedLoginKey = 'chcRebanadoRememberedLogin';

  if (loginForm && loginUsername && passwordInput && rememberLogin) {
    try {
      const savedLogin = JSON.parse(localStorage.getItem(savedLoginKey) || 'null');
      if (savedLogin && typeof savedLogin.username === 'string' && typeof savedLogin.password === 'string') {
        loginUsername.value = savedLogin.username;
        passwordInput.value = savedLogin.password;
        rememberLogin.checked = true;
      }
    } catch (error) {
      localStorage.removeItem(savedLoginKey);
    }

    loginForm.addEventListener('submit', () => {
      if (rememberLogin.checked) {
        localStorage.setItem(savedLoginKey, JSON.stringify({
          username: loginUsername.value,
          password: passwordInput.value
        }));
      } else {
        localStorage.removeItem(savedLoginKey);
      }
    });
  }

  // Fecha de hoy para formularios nuevos, sin sobrescribir valores existentes.
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');

  document.querySelectorAll('[data-default-today]').forEach(input => {
    if (!input.value) input.value = today;
  });

  // Confirmaciones simples para acciones sensibles.
  document.querySelectorAll('form[data-confirm]').forEach(form => {
    form.addEventListener('submit', event => {
      const message = form.dataset.confirm || '¿Confirmar esta acción?';
      if (!window.confirm(message)) event.preventDefault();
    });
  });

  const opsList = document.getElementById('opsList');
  const searchInput = document.getElementById('opsSearch');
  const emptyFilter = document.getElementById('opsEmptyFilter');
  const filterButtons = document.querySelectorAll('[data-filter-status]');
  const filterLabel = document.getElementById('currentFilterLabel');
  const visibleOpsCount = document.getElementById('visibleOpsCount');
  let currentStatus = 'Todos';

  function applyOpsFilter(statusFromButton) {
    if (!opsList) return;
    if (statusFromButton) currentStatus = statusFromButton;

    const query = (searchInput?.value || '').trim().toLowerCase();
    const cards = Array.from(document.querySelectorAll('.op-vale-card'));
    let visible = 0;

    cards.forEach(card => {
      const status = card.dataset.status || '';
      const search = card.dataset.search || '';
      const statusOk = currentStatus === 'Todos' || status === currentStatus;
      const searchOk = !query || search.includes(query);
      const show = statusOk && searchOk;
      card.classList.toggle('d-none', !show);
      if (show) visible += 1;
    });

    if (emptyFilter) {
      emptyFilter.classList.toggle('d-none', visible !== 0 || cards.length === 0);
    }
    if (filterLabel) filterLabel.textContent = currentStatus;
    if (visibleOpsCount) visibleOpsCount.textContent = visible;

    filterButtons.forEach(btn => {
      const selected = btn.dataset.filterStatus === currentStatus;
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => applyOpsFilter(btn.dataset.filterStatus));
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => applyOpsFilter());
  }

  if (opsList) {
    const hashStatus = decodeURIComponent(window.location.hash.replace('#', ''));
    const validStatuses = ['Pendiente', 'Rebanando', 'Listo', 'Entregado', 'Cancelado'];
    applyOpsFilter(validStatuses.includes(hashStatus) ? hashStatus : 'Todos');
  }
});
