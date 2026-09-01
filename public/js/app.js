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

  // Catálogo de productos: sugiere la descripción por SKU, pero el texto
  // permanece editable en cada vale o movimiento.
  const productCache = new Map();
  const embeddedProducts = document.getElementById('inventoryProductData');
  if (embeddedProducts) {
    try {
      JSON.parse(embeddedProducts.textContent || '[]').forEach(item => productCache.set(String(item.sku), item));
    } catch (error) {
      // La búsqueda remota sigue disponible si los datos incrustados fallan.
    }
  }

  let productDatalist = document.getElementById('inventoryProductCatalog');
  if (!productDatalist) {
    productDatalist = document.createElement('datalist');
    productDatalist.id = 'inventoryProductCatalog';
    document.body.appendChild(productDatalist);
  }

  function renderProductSuggestions(items) {
    items.forEach(item => productCache.set(String(item.sku), item));
    productDatalist.replaceChildren(...items.map(item => {
      const option = document.createElement('option');
      option.value = item.sku;
      option.textContent = item.descripcion;
      return option;
    }));
  }

  function pairedDescription(input) {
    return input.closest('[data-product-row], .product-aware-form, form')?.querySelector('[data-product-description]');
  }

  async function searchCatalog(input, exact = false) {
    const query = input.value.trim();
    if (!query) return;
    try {
      const response = await fetch(`/inventario/productos/buscar?q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      const items = Array.isArray(payload.productos) ? payload.productos : [];
      renderProductSuggestions(items);
      const match = items.find(item => String(item.sku) === query);
      const description = pairedDescription(input);
      if (match && description && (exact || !description.value.trim())) description.value = match.descripcion;
    } catch (error) {
      // La captura manual debe continuar disponible aun sin autocompletado.
    }
  }

  let productSearchTimer;
  document.addEventListener('focusin', event => {
    const input = event.target.closest?.('[data-product-sku]');
    if (!input) return;
    input.setAttribute('list', productDatalist.id);
    if (!productDatalist.options.length) searchCatalog(input);
  });
  document.addEventListener('input', event => {
    const input = event.target.closest?.('[data-product-sku]');
    if (!input) return;
    const cached = productCache.get(input.value.trim());
    const description = pairedDescription(input);
    if (cached && description && !description.value.trim()) description.value = cached.descripcion;
    window.clearTimeout(productSearchTimer);
    productSearchTimer = window.setTimeout(() => searchCatalog(input), 180);
  });
  document.addEventListener('change', event => {
    const input = event.target.closest?.('[data-product-sku]');
    if (input) searchCatalog(input, true);
  });

  // Pestañas y filtros de la pantalla de inventario.
  const inventoryTabs = Array.from(document.querySelectorAll('[data-inventory-tab]'));
  const inventoryPanels = Array.from(document.querySelectorAll('[data-inventory-panel]'));
  function activateInventoryTab(name) {
    if (!inventoryTabs.length) return;
    const selected = inventoryTabs.some(tab => tab.dataset.inventoryTab === name) ? name : 'existencias';
    inventoryTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.inventoryTab === selected));
    inventoryPanels.forEach(panel => panel.classList.toggle('active', panel.dataset.inventoryPanel === selected));
  }
  inventoryTabs.forEach(tab => tab.addEventListener('click', () => {
    const name = tab.dataset.inventoryTab;
    activateInventoryTab(name);
    window.history.replaceState(null, '', `#${name}`);
  }));
  if (inventoryTabs.length) activateInventoryTab(window.location.hash.slice(1) || 'existencias');

  const inventorySearch = document.querySelector('[data-inventory-search]');
  const negativeOnly = document.querySelector('[data-negative-only]');
  function filterInventoryRows() {
    const query = (inventorySearch?.value || '').trim().toLowerCase();
    const onlyNegative = Boolean(negativeOnly?.checked);
    document.querySelectorAll('[data-inventory-product]').forEach(row => {
      const matchesText = !query || (row.dataset.search || '').includes(query);
      const matchesNegative = !onlyNegative || row.dataset.negative === '1';
      row.hidden = !(matchesText && matchesNegative);
    });
  }
  inventorySearch?.addEventListener('input', filterInventoryRows);
  negativeOnly?.addEventListener('change', filterInventoryRows);

  // Calendario operativo con marcas para días que contienen vales.
  const calendarRoot = document.querySelector('[data-delivery-calendar]');
  if (calendarRoot) {
    const toggle = calendarRoot.querySelector('[data-calendar-toggle]');
    const popover = calendarRoot.querySelector('[data-calendar-popover]');
    const daysGrid = calendarRoot.querySelector('[data-calendar-days]');
    const monthLabel = calendarRoot.querySelector('[data-calendar-month-label]');
    const selectedLabel = calendarRoot.querySelector('[data-calendar-selected-label]');
    const hiddenDate = calendarRoot.querySelector('input[name="fecha"]');
    const selectedIso = calendarRoot.dataset.selectedDate || today;
    const [selectedYear, selectedMonth] = selectedIso.split('-').map(Number);
    let visibleMonth = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const monthCache = new Map();

    function isoDay(year, monthIndex, day) {
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    async function calendarData(year, month) {
      const key = `${year}-${month}`;
      if (monthCache.has(key)) return monthCache.get(key);
      try {
        const response = await fetch(`/vales/calendario/resumen?year=${year}&month=${month}`, { headers: { Accept: 'application/json' } });
        const payload = response.ok ? await response.json() : { dias: {} };
        const data = payload.dias || {};
        monthCache.set(key, data);
        return data;
      } catch (error) {
        return {};
      }
    }

    async function renderCalendar() {
      const year = visibleMonth.getUTCFullYear();
      const monthIndex = visibleMonth.getUTCMonth();
      const data = await calendarData(year, monthIndex + 1);
      monthLabel.textContent = visibleMonth.toLocaleDateString('es-MX', { timeZone: 'UTC', month: 'long', year: 'numeric' });
      daysGrid.replaceChildren();
      const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
      const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
      for (let index = 0; index < firstWeekday; index += 1) {
        const spacer = document.createElement('span');
        spacer.className = 'delivery-calendar-spacer';
        daysGrid.appendChild(spacer);
      }
      for (let day = 1; day <= lastDay; day += 1) {
        const iso = isoDay(year, monthIndex, day);
        const summary = data[iso];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'delivery-calendar-day';
        button.dataset.date = iso;
        if (iso === selectedIso) button.classList.add('is-selected');
        if (iso === today) button.classList.add('is-today');
        const number = document.createElement('span');
        number.textContent = String(day);
        button.appendChild(number);
        if (summary?.total) {
          button.classList.add('has-vales');
          const badge = document.createElement('strong');
          badge.textContent = String(summary.total);
          button.appendChild(badge);
          const detail = Object.entries(summary.estados || {}).map(([status, count]) => `${status}: ${count}`).join(' · ');
          button.title = `${summary.total} vale(s) · ${detail}`;
        } else {
          button.title = 'Sin vales programados';
        }
        button.addEventListener('click', () => {
          hiddenDate.value = iso;
          selectedLabel.textContent = iso.split('-').reverse().join('/');
          popover.hidden = true;
          toggle.setAttribute('aria-expanded', 'false');
          calendarRoot.closest('form')?.requestSubmit();
        });
        daysGrid.appendChild(button);
      }
    }

    toggle.addEventListener('click', () => {
      const opening = popover.hidden;
      popover.hidden = !opening;
      toggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) renderCalendar();
    });
    calendarRoot.querySelector('[data-calendar-prev]').addEventListener('click', () => {
      visibleMonth = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() - 1, 1));
      renderCalendar();
    });
    calendarRoot.querySelector('[data-calendar-next]').addEventListener('click', () => {
      visibleMonth = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 1));
      renderCalendar();
    });
    document.addEventListener('click', event => {
      if (!calendarRoot.contains(event.target)) {
        popover.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      }
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
