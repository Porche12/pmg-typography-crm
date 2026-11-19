// PMG Typography Portal Main Application
(function() {
  const appState = {
    currentView: 'public', // 'public' or 'crm'
    catalogFilter: 'all'
  };

  // Switch between Public Site & CRM System
  function setView(viewName) {
    appState.currentView = viewName;

    const publicViewEl = document.getElementById('publicView');
    const crmViewEl = document.getElementById('crmView');
    const navPublicBtn = document.getElementById('navPublicBtn');
    const navCrmBtn = document.getElementById('navCrmBtn');

    if (viewName === 'crm') {
      if (publicViewEl) publicViewEl.classList.add('hidden');
      if (crmViewEl) crmViewEl.classList.remove('hidden');

      if (navCrmBtn) {
        navCrmBtn.classList.add('bg-rose-600', 'text-white', 'shadow-sm');
        navCrmBtn.classList.remove('text-slate-300', 'hover:text-white', 'hover:bg-slate-800');
      }
      if (navPublicBtn) {
        navPublicBtn.classList.remove('bg-rose-600', 'text-white', 'shadow-sm');
        navPublicBtn.classList.add('text-slate-300', 'hover:text-white', 'hover:bg-slate-800');
      }

      window.location.hash = 'crm';
      if (window.PMG_CRM) window.PMG_CRM.refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (crmViewEl) crmViewEl.classList.add('hidden');
      if (publicViewEl) publicViewEl.classList.remove('hidden');

      if (navPublicBtn) {
        navPublicBtn.classList.add('bg-rose-600', 'text-white', 'shadow-sm');
        navPublicBtn.classList.remove('text-slate-300', 'hover:text-white', 'hover:bg-slate-800');
      }
      if (navCrmBtn) {
        navCrmBtn.classList.remove('bg-rose-600', 'text-white', 'shadow-sm');
        navCrmBtn.classList.add('text-slate-300', 'hover:text-white', 'hover:bg-slate-800');
      }

      if (window.location.hash === '#crm') {
        window.location.hash = '';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Render Catalog Grid with Filtering
  function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    if (!grid || !window.PMG_DATA) return;

    let items = window.PMG_DATA.catalog || [];
    if (appState.catalogFilter !== 'all') {
      items = items.filter(i => i.category === appState.catalogFilter);
    }

    grid.innerHTML = items.map(item => `
      <div class="product-card bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between group">
        <div>
          <!-- Image -->
          <div class="relative h-48 overflow-hidden bg-slate-100">
            <img src="${item.img}" alt="${item.title}" class="product-img w-full h-full object-cover">
            <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white">
              ${item.badge}
            </span>
            <span class="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 backdrop-blur-sm text-slate-800 shadow-sm">
              ${item.leadTime}
            </span>
          </div>

          <!-- Content -->
          <div class="p-5">
            <h3 class="text-base font-bold text-slate-900 group-hover:text-rose-600 transition">${item.title}</h3>
            <p class="text-xs font-medium text-slate-500 mt-1">${item.subtitle}</p>
            <p class="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">${item.desc}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
          <div>
            <div class="text-[10px] uppercase font-semibold text-slate-400">Тираж ${item.minRun}</div>
            <div class="text-sm font-black text-rose-600">от ${item.priceFrom.toLocaleString('ru-RU')} ₽</div>
          </div>
          <button type="button" class="catalog-calc-btn px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold transition shadow-sm" data-calc="${item.calcKey}">
            Рассчитать ➔
          </button>
        </div>
      </div>
    `).join('');

    // Bind "Рассчитать" clicks to switch calculator
    document.querySelectorAll('.catalog-calc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.calc;
        if (window.PMG_CALCULATOR) {
          window.PMG_CALCULATOR.selectProduct(key);
        }
        const calcSection = document.getElementById('calculatorSection');
        if (calcSection) {
          calcSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Render Services Showcase
  function renderServices() {
    const container = document.getElementById('servicesContainer');
    if (!container || !window.PMG_DATA) return;

    container.innerHTML = window.PMG_DATA.services.map((s, idx) => `
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
        <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 font-bold flex items-center justify-center text-sm mb-4">
          0${idx + 1}
        </div>
        <h4 class="text-base font-bold text-slate-900">${s.title}</h4>
        <div class="text-xs font-medium text-rose-600 mt-0.5">${s.subtitle}</div>
        <p class="text-xs text-slate-600 mt-2.5 leading-relaxed">${s.desc}</p>
        <ul class="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          ${s.features.map(f => `
            <li class="flex items-center gap-2 text-xs text-slate-700">
              <span class="text-emerald-500 font-bold">✓</span>
              <span>${f}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  }

  // Render Equipment Cards
  function renderEquipmentShowcase() {
    const container = document.getElementById('equipmentShowcase');
    if (!container) return;

    fetch('/api/equipment')
      .then(res => res.json())
      .then(eqList => {
        container.innerHTML = eqList.map(eq => `
          <div class="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">${eq.origin}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${eq.status === 'running' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'}">
                  ${eq.status === 'running' ? '● В РАБОТЕ 24/7' : '○ ГОТОВ К ЗАПУСКУ'}
                </span>
              </div>
              <h4 class="font-bold text-sm text-white mt-1">${eq.name}</h4>
              <p class="text-xs text-slate-400 mt-0.5">${eq.type} • ${eq.speed}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span class="text-slate-400 text-[11px]">Загрузка смены:</span>
              <span class="font-bold text-rose-400">${eq.loadPercent}%</span>
            </div>
          </div>
        `).join('');
      })
      .catch(err => console.error('Error fetching equipment showcase:', err));
  }

  // Render Reviews List
  function renderReviews() {
    const container = document.getElementById('reviewsContainer');
    if (!container || !window.PMG_DATA) return;

    container.innerHTML = window.PMG_DATA.reviews.map(r => `
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-1 text-amber-400 text-xs mb-3">
            ${'★'.repeat(r.rating)}
            <span class="text-slate-400 text-[10px] ml-2 text-slate-500">${r.date}</span>
          </div>
          <p class="text-xs text-slate-700 leading-relaxed italic">"${r.text}"</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100">
          <strong class="font-bold text-xs text-slate-900 block">${r.author}</strong>
          <span class="text-[10px] text-slate-500">${r.company}</span>
        </div>
      </div>
    `).join('');
  }

  // Router & URL Hash synchronization
  function handleHashChange() {
    const hash = window.location.hash;
    if (hash === '#crm') {
      setView('crm');
    } else if (hash.startsWith('#track')) {
      setView('public');
      const trackSection = document.getElementById('trackingSection');
      if (trackSection) {
        trackSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setView('public');
    }
  }

  // Initialize Application
  document.addEventListener('DOMContentLoaded', () => {
    // Navigation switcher buttons
    document.getElementById('navPublicBtn')?.addEventListener('click', () => setView('public'));
    document.getElementById('navCrmBtn')?.addEventListener('click', () => setView('crm'));

    // Catalog category tabs
    document.querySelectorAll('.catalog-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.catalog-tab').forEach(t => {
          t.classList.remove('bg-rose-600', 'text-white', 'shadow-sm');
          t.classList.add('bg-white', 'text-slate-700', 'hover:bg-slate-100');
        });
        tab.classList.add('bg-rose-600', 'text-white', 'shadow-sm');
        tab.classList.remove('bg-white', 'text-slate-700', 'hover:bg-slate-100');

        appState.catalogFilter = tab.dataset.category;
        renderCatalog();
      });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
    }

    // Modal Close click outside or on close buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-overlay')?.classList.add('hidden');
      });
    });

    // Submodules initialization
    if (window.PMG_CALCULATOR) window.PMG_CALCULATOR.init();
    if (window.PMG_TRACKER) window.PMG_TRACKER.init();
    if (window.PMG_CRM) window.PMG_CRM.init();

    renderCatalog();
    renderServices();
    renderEquipmentShowcase();
    renderReviews();

    // Check initial hash
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
  });

  window.PMG_APP = {
    setView
  };
})();
