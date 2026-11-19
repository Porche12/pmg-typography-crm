// Master Controller for IPK Yuzhny Ural Portal
(function() {
  let catalogData = null;

  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize submodules
    if (window.URAL_SECURITY) window.URAL_SECURITY.bindPhoneInputs();
    if (window.URAL_CALC) window.URAL_CALC.init();
    if (window.URAL_SIMULATOR) window.URAL_SIMULATOR.init();
    if (window.URAL_PREFLIGHT) window.URAL_PREFLIGHT.init();

    // 2. Fetch catalog and initialize UI
    await loadCatalog();
    initNavigation();
    initModals();
    initTracker();
  });

  async function loadCatalog() {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        catalogData = await res.json();
        renderCatalogGrid('all');
      }
    } catch (e) {
      console.warn('Could not load remote catalog, using local DOM fallback');
    }
  }

  function renderCatalogGrid(filterCategory) {
    const grid = document.getElementById('catalogGridContainer');
    if (!grid || !catalogData || !catalogData.categories) return;

    let items = catalogData.categories;
    if (filterCategory && filterCategory !== 'all') {
      if (filterCategory === 'books') items = items.filter(c => ['books', 'magazines'].includes(c.id));
      else if (filterCategory === 'labels') items = items.filter(c => ['flexo-labels', 'boxes'].includes(c.id));
      else if (filterCategory === 'marketing') items = items.filter(c => ['booklets', 'flyers', 'calendars', 'roll-up', 'backlit'].includes(c.id));
      else if (filterCategory === 'corporate') items = items.filter(c => ['business-cards', 'folders', 'stamps', 'blanks', 'souvenirs'].includes(c.id));
    }

    renderCards(items);
  }

  function renderCards(items) {
    const grid = document.getElementById('catalogGridContainer');
    if (!grid) return;

    grid.innerHTML = items.map(cat => `
      <div class="pmg-card">
        <div>
          <div class="pmg-card-img-wrap">
            <span class="pmg-card-badge">${cat.badge}</span>
            <img src="${cat.image}" alt="${cat.name}">
          </div>
          <h3 class="pmg-card-title">${cat.name}</h3>
          <p class="pmg-card-desc">${cat.description}</p>
          <div class="pmg-card-meta">
            <span>⏱ ${cat.leadTime}</span>
            <span>•</span>
            <span>Мин: от ${cat.minQty} шт.</span>
          </div>
        </div>
        <div>
          <div class="pmg-card-footer">
            <div class="pmg-card-price-block">
              <div class="label">Стоимость</div>
              <div class="price">${cat.startingPrice}</div>
            </div>
            <button type="button" class="btn btn-sm btn-red" onclick="window.URAL_APP?.selectCategoryForCalc('${cat.id}')">
              Рассчитать ➔
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function handleSearch(query) {
    if (!catalogData || !catalogData.categories) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      renderCatalogGrid('all');
      return;
    }
    const matched = catalogData.categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.specs.some(s => s.toLowerCase().includes(q))
    );
    renderCards(matched);
  }

  function initNavigation() {
    // Header shadow on scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header?.classList.add('scrolled');
      } else {
        header?.classList.remove('scrolled');
      }
    });

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('mainNavMenu');
    mobileBtn?.addEventListener('click', () => {
      navMenu?.classList.toggle('open');
    });

    // Close mobile menu on click
    navMenu?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navMenu?.classList.remove('open'));
    });

    // Catalog Filter Buttons
    document.querySelectorAll('[data-catalog-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-catalog-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCatalogGrid(btn.dataset.catalogFilter);
      });
    });
  }

  function initModals() {
    // Close modal on overlay click or close button
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-overlay')?.classList.remove('active');
      });
    });

    // ESC key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });

    // Order Form Submit
    const orderForm = document.getElementById('orderModalForm');
    orderForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = orderForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const payload = {
        name: window.URAL_SECURITY?.sanitize(document.getElementById('orderClientName').value),
        phone: window.URAL_SECURITY?.sanitize(document.getElementById('orderClientPhone').value),
        email: window.URAL_SECURITY?.sanitize(document.getElementById('orderClientEmail').value),
        company: window.URAL_SECURITY?.sanitize(document.getElementById('orderClientCompany').value),
        category: document.getElementById('orderCategoryHidden').value || 'Печать полиграфии',
        specs: window.URAL_CALC?.getState() || {},
        comment: window.URAL_SECURITY?.sanitize(document.getElementById('orderClientComment').value),
        files: window.URAL_PREFLIGHT?.getUploadedFiles() || []
      };

      try {
        const res = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          document.getElementById('orderModal')?.classList.remove('active');
          showToast(`Заказ № ${data.orderId} успешно принят! Технолог свяжется с вами.`, 'success');
          orderForm.reset();
        } else {
          showToast(data.error || 'Ошибка при отправке заказа', 'error');
        }
      } catch (err) {
        showToast('Сервер временно недоступен. Пожалуйста, позвоните нам: +7 (3532) 66-22-11', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    // Callback Form Submit
    const callbackForm = document.getElementById('callbackModalForm');
    callbackForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = callbackForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const payload = {
        name: window.URAL_SECURITY?.sanitize(document.getElementById('cbName').value),
        phone: window.URAL_SECURITY?.sanitize(document.getElementById('cbPhone').value),
        question: window.URAL_SECURITY?.sanitize(document.getElementById('cbQuestion').value)
      };

      try {
        const res = await fetch('/api/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          document.getElementById('callbackModal')?.classList.remove('active');
          showToast(data.message, 'success');
          callbackForm.reset();
        } else {
          showToast(data.error || 'Ошибка при заказе звонка', 'error');
        }
      } catch (err) {
        showToast('Сервер временно недоступен', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function initTracker() {
    const trackBtn = document.getElementById('trackerSearchBtn');
    const trackInput = document.getElementById('trackerSearchInput');
    const trackResult = document.getElementById('trackerResultBox');

    trackBtn?.addEventListener('click', async () => {
      const q = trackInput?.value.trim();
      if (!q) {
        showToast('Введите номер заказа (напр. ЮУ-2026-1048) или телефон', 'error');
        return;
      }

      try {
        const res = await fetch(`/api/orders/track/${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          const ord = data.order;
          trackResult.innerHTML = `
            <div style="background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 8px; padding: 20px; margin-top: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; color: #15803D;">Заказ ${ord.id}</span>
                <span style="background: #16A34A; color: #fff; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">${ord.status}</span>
              </div>
              <div style="font-size: 0.9rem; color: #374151;">Заказчик: <strong>${ord.clientName}</strong> | Тип: <strong>${ord.category}</strong></div>
              <div style="font-size: 0.825rem; color: #4B5563; margin-top: 6px;">Ответственный: <strong>${ord.assignedManager}</strong></div>
              <div style="font-size: 0.8rem; color: #6B7280; margin-top: 4px; font-family: var(--font-mono);">Принят в работу: ${new Date(ord.createdAt).toLocaleString('ru-RU')}</div>
            </div>
          `;
        } else {
          trackResult.innerHTML = `
            <div style="background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 8px; padding: 16px; margin-top: 18px; color: #991B1B;">
              ${data.error || 'Заказ не найден. Проверьте правильность введенного номера.'}
            </div>
          `;
        }
      } catch (e) {
        showToast('Ошибка связи с сервером', 'error');
      }
    });
  }

  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠️'}</span> <div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  window.URAL_APP = {
    showToast,
    handleSearch,
    openOrderModal(params = {}) {
      const modal = document.getElementById('orderModal');
      if (!modal) return;

      if (params.category) {
        const catHidden = document.getElementById('orderCategoryHidden');
        const catTitle = document.getElementById('orderModalCategoryTitle');
        if (catHidden) catHidden.value = params.category;
        if (catTitle) catTitle.innerText = `Заявка: ${params.category}`;
      }
      modal.classList.add('active');
    },
    openCallbackModal() {
      document.getElementById('callbackModal')?.classList.add('active');
    },
    selectCategoryForCalc(catId) {
      if (window.URAL_CALC) {
        window.URAL_CALC.setCategory(catId);
        const section = document.getElementById('calculator-section');
        section?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
})();
