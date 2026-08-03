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
  const searchClear = document.getElementById('opsSearchClear');
  const emptyFilter = document.getElementById('opsEmptyFilter');
  const filterButtons = document.querySelectorAll('[data-filter-status]');
  const filterLabel = document.getElementById('currentFilterLabel');
  const visibleOpsCount = document.getElementById('visibleOpsCount');
  const boardParams = new URLSearchParams(window.location.search);
  const validStatuses = ['Pendiente', 'Rebanando', 'Listo', 'Entregado', 'Cancelado'];
  const requestedStatus = boardParams.get('estado');
  let currentStatus = validStatuses.includes(requestedStatus) ? requestedStatus : 'Todos';

  if (searchInput && boardParams.get('q')) {
    searchInput.value = boardParams.get('q');
  }

  function syncSearchClear() {
    if (!searchClear) return;
    searchClear.classList.toggle('d-none', !(searchInput?.value || '').trim());
  }

  function applyOpsFilter(statusFromButton) {
    if (!opsList) return;
    if (statusFromButton) currentStatus = statusFromButton;

    const query = (searchInput?.value || '').trim().toLowerCase();
    const cards = Array.from(opsList.querySelectorAll('[data-vale-id]'));
    let visible = 0;

    cards.forEach(card => {
      const status = card.dataset.status || '';
      const search = card.dataset.search || '';
      const statusOk = currentStatus === 'Todos' || status === currentStatus;
      const searchOk = !query || search.includes(query);
      const show = statusOk && searchOk;
      card.hidden = !show;
      card.classList.toggle('d-none', !show);
      card.setAttribute('aria-hidden', show ? 'false' : 'true');
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

    syncSearchClear();
  }

  function buildBoardReturnUrl(focusId) {
    const boardUrl = new URL('/vales/tablero', window.location.origin);
    const selectedDate = document.getElementById('fecha')?.value || boardParams.get('fecha');
    const query = (searchInput?.value || '').trim();

    if (selectedDate) boardUrl.searchParams.set('fecha', selectedDate);
    if (currentStatus !== 'Todos') boardUrl.searchParams.set('estado', currentStatus);
    if (query) boardUrl.searchParams.set('q', query);
    boardUrl.searchParams.set('focus', String(focusId));
    boardUrl.hash = `vale-${focusId}`;

    return `${boardUrl.pathname}${boardUrl.search}${boardUrl.hash}`;
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => applyOpsFilter(btn.dataset.filterStatus));
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => applyOpsFilter());
  }

  if (searchClear && searchInput) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      applyOpsFilter();
      searchInput.focus();
    });
  }

  document.querySelectorAll('.operator-state-form').forEach(form => {
    form.addEventListener('submit', event => {
      if (event.defaultPrevented) return;
      const focusId = form.dataset.focusId || form.closest('[data-vale-id]')?.dataset.valeId;
      const returnInput = form.querySelector('input[name="return_url"]');
      if (focusId && returnInput) returnInput.value = buildBoardReturnUrl(focusId);
    });
  });

  document.querySelectorAll('[data-board-return-link]').forEach(link => {
    link.addEventListener('click', () => {
      const focusId = link.dataset.focusId || link.closest('[data-vale-id]')?.dataset.valeId;
      if (!focusId) return;
      const targetUrl = new URL(link.href, window.location.origin);
      targetUrl.searchParams.set('return_url', buildBoardReturnUrl(focusId));
      link.href = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    });
  });

  if (opsList) {
    const hashFocus = window.location.hash.match(/^#vale-(\d+)$/)?.[1];
    const focusId = boardParams.get('focus') || hashFocus;
    const focusCard = focusId ? document.querySelector(`[data-vale-id="${CSS.escape(String(focusId))}"]`) : null;

    applyOpsFilter(currentStatus);

    if (focusCard) {
      // Si el vale cambió de estado o dejó de coincidir con la búsqueda,
      // se prioriza mostrarlo para no perder el contexto operativo.
      if (focusCard.hidden || focusCard.classList.contains('d-none')) {
        const activeQuery = (searchInput?.value || '').trim().toLowerCase();
        const focusMatchesSearch = !activeQuery || (focusCard.dataset.search || '').includes(activeQuery);
        currentStatus = focusCard.dataset.status || 'Todos';
        if (!focusMatchesSearch && searchInput) searchInput.value = '';
        applyOpsFilter(currentStatus);
      }

      window.requestAnimationFrame(() => {
        focusCard.classList.add('is-return-focus');
        focusCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        window.setTimeout(() => focusCard.focus({ preventScroll: true }), 420);
      });
    }
  }

  // Formulario de comanda: agrega o retira productos sin recargar la página.
  const productsList = document.getElementById('commandProductsList');
  const productTemplate = document.getElementById('commandProductTemplate');
  const addProductButton = document.querySelector('[data-add-product]');
  const productCount = document.getElementById('productCount');

  function refreshProductRows() {
    if (!productsList) return;
    const rows = Array.from(productsList.querySelectorAll('[data-product-row]'));
    rows.forEach((row, index) => {
      const number = row.querySelector('[data-product-number]');
      if (number) number.textContent = String(index + 1);
      const remove = row.querySelector('[data-remove-product]');
      if (remove) {
        remove.disabled = rows.length === 1;
        remove.title = rows.length === 1 ? 'La comanda debe conservar al menos un producto' : 'Quitar producto';
      }
    });
    if (productCount) productCount.textContent = String(rows.length);
  }

  function bindRemoveButton(button) {
    button.addEventListener('click', () => {
      const rows = productsList?.querySelectorAll('[data-product-row]') || [];
      if (rows.length <= 1) return;
      button.closest('[data-product-row]')?.remove();
      refreshProductRows();
    });
  }

  if (productsList) {
    productsList.querySelectorAll('[data-remove-product]').forEach(bindRemoveButton);
    refreshProductRows();
  }

  if (addProductButton && productsList && productTemplate) {
    addProductButton.addEventListener('click', () => {
      const fragment = productTemplate.content.cloneNode(true);
      const row = fragment.querySelector('[data-product-row]');
      const removeButton = fragment.querySelector('[data-remove-product]');
      if (removeButton) bindRemoveButton(removeButton);
      productsList.appendChild(fragment);
      refreshProductRows();
      row?.querySelector('input[name="sku[]"]')?.focus();
    });
  }
});

// Mensajes compactos del modo operativo: se ocultan sin interrumpir el trabajo.
document.querySelectorAll('[data-auto-dismiss]').forEach(alert => {
  const delay = Number(alert.dataset.autoDismiss) || 2600;
  window.setTimeout(() => {
    alert.classList.add('is-hiding');
    window.setTimeout(() => alert.remove(), 220);
  }, delay);
});

// Cierra el menú de acciones de un vale al tocar fuera de él.
document.addEventListener('click', event => {
  document.querySelectorAll('.operator-more-menu[open]').forEach(menu => {
    if (!menu.contains(event.target)) menu.removeAttribute('open');
  });
});
