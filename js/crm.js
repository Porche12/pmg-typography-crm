// PMG Industrial Typography CRM System
(function() {
  const crmState = {
    activeTab: 'kanban', // 'kanban', 'clients', 'equipment', 'materials', 'analytics'
    orders: [],
    clients: [],
    equipment: [],
    materials: [],
    analytics: null,
    searchQuery: '',
    urgencyFilter: 'all',
    categoryFilter: 'all',
    currentOrderModal: null
  };

  const STAGES = [
    { key: 'new', label: 'Новые заявки', color: 'border-blue-400 bg-blue-50/50', badgeColor: 'bg-blue-100 text-blue-700' },
    { key: 'prepress', label: 'Препресс / Макеты', color: 'border-purple-400 bg-purple-50/50', badgeColor: 'bg-purple-100 text-purple-700' },
    { key: 'queue', label: 'Очередь в печать', color: 'border-amber-400 bg-amber-50/50', badgeColor: 'bg-amber-100 text-amber-700' },
    { key: 'printing', label: 'В производстве', color: 'border-rose-400 bg-rose-50/50', badgeColor: 'bg-rose-100 text-rose-700' },
    { key: 'postpress', label: 'Постпечать и отделка', color: 'border-indigo-400 bg-indigo-50/50', badgeColor: 'bg-indigo-100 text-indigo-700' },
    { key: 'qc_packing', label: 'Контроль ОТК', color: 'border-teal-400 bg-teal-50/50', badgeColor: 'bg-teal-100 text-teal-700' },
    { key: 'delivery', label: 'Готов к выдаче', color: 'border-orange-400 bg-orange-50/50', badgeColor: 'bg-orange-100 text-orange-700' },
    { key: 'completed', label: 'Выполнен и закрыт', color: 'border-emerald-400 bg-emerald-50/50', badgeColor: 'bg-emerald-100 text-emerald-700' }
  ];

  // Fetch all initial data from backend
  async function loadCRMData() {
    try {
      const [ordersRes, clientsRes, eqRes, matRes, analRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/clients'),
        fetch('/api/equipment'),
        fetch('/api/materials'),
        fetch('/api/analytics')
      ]);

      crmState.orders = await ordersRes.json();
      crmState.clients = await clientsRes.json();
      crmState.equipment = await eqRes.json();
      crmState.materials = await matRes.json();
      crmState.analytics = await analRes.json();

      updateKPIHeader();
      renderCurrentTab();
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    }
  }

  // Header quick statistics
  function updateKPIHeader() {
    const kpiActive = document.getElementById('crmKpiActive');
    const kpiRevenue = document.getElementById('crmKpiRevenue');
    const kpiUrgent = document.getElementById('crmKpiUrgent');
    const kpiLowMat = document.getElementById('crmKpiLowMat');

    if (!crmState.analytics) return;

    const k = crmState.analytics.kpis;
    if (kpiActive) kpiActive.innerText = k.activeOrdersCount || 0;
    if (kpiRevenue) kpiRevenue.innerText = `${(k.totalRevenue || 0).toLocaleString('ru-RU')} ₽`;

    const urgentCount = crmState.orders.filter(o => o.specs?.urgency === 'urgent' && !['completed', 'cancelled'].includes(o.stage)).length;
    if (kpiUrgent) kpiUrgent.innerText = urgentCount;

    const lowMatCount = crmState.materials.filter(m => m.status === 'low').length;
    if (kpiLowMat) kpiLowMat.innerText = lowMatCount;
  }

  // Switch tabs
  function switchTab(tabKey) {
    crmState.activeTab = tabKey;
    document.querySelectorAll('.crm-nav-tab').forEach(btn => {
      if (btn.dataset.tab === tabKey) {
        btn.classList.add('bg-rose-600', 'text-white', 'shadow-sm');
        btn.classList.remove('text-slate-400', 'hover:text-slate-200', 'hover:bg-slate-800');
      } else {
        btn.classList.remove('bg-rose-600', 'text-white', 'shadow-sm');
        btn.classList.add('text-slate-400', 'hover:text-slate-200', 'hover:bg-slate-800');
      }
    });

    renderCurrentTab();
  }

  function renderCurrentTab() {
    const container = document.getElementById('crmTabContent');
    if (!container) return;

    if (crmState.activeTab === 'kanban') renderKanban(container);
    else if (crmState.activeTab === 'clients') renderClients(container);
    else if (crmState.activeTab === 'equipment') renderEquipment(container);
    else if (crmState.activeTab === 'materials') renderMaterials(container);
    else if (crmState.activeTab === 'analytics') renderAnalytics(container);
  }

  // ================= 1. KANBAN BOARD =================
  function renderKanban(container) {
    // Filter orders
    let filtered = [...crmState.orders];
    if (crmState.searchQuery) {
      const q = crmState.searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.title && o.title.toLowerCase().includes(q)) ||
        (o.client?.name && o.client.name.toLowerCase().includes(q)) ||
        (o.client?.phone && o.client.phone.includes(q))
      );
    }
    if (crmState.urgencyFilter !== 'all') {
      filtered = filtered.filter(o => o.specs?.urgency === crmState.urgencyFilter);
    }
    if (crmState.categoryFilter !== 'all') {
      filtered = filtered.filter(o => o.category === crmState.categoryFilter);
    }

    let html = `
      <!-- Kanban Controls & Filter Bar -->
      <div class="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative w-64">
            <input type="text" id="crmSearchInput" placeholder="Поиск заказа, клиента, телефона..." value="${crmState.searchQuery}" class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500">
            <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>

          <select id="crmUrgencySelect" class="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700">
            <option value="all" ${crmState.urgencyFilter === 'all' ? 'selected' : ''}>Все срочности</option>
            <option value="urgent" ${crmState.urgencyFilter === 'urgent' ? 'selected' : ''}>⚡ Только срочные</option>
            <option value="standard" ${crmState.urgencyFilter === 'standard' ? 'selected' : ''}>Стандартные сроки</option>
          </select>

          <select id="crmCategorySelect" class="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700">
            <option value="all" ${crmState.categoryFilter === 'all' ? 'selected' : ''}>Все категории</option>
            <option value="визитки" ${crmState.categoryFilter === 'визитки' ? 'selected' : ''}>Визитки</option>
            <option value="листовая" ${crmState.categoryFilter === 'листовая' ? 'selected' : ''}>Листовки / Буклеты</option>
            <option value="наклейки" ${crmState.categoryFilter === 'наклейки' ? 'selected' : ''}>Наклейки</option>
            <option value="многостраничная" ${crmState.categoryFilter === 'многостраничная' ? 'selected' : ''}>Каталоги / Книги</option>
            <option value="упаковка" ${crmState.categoryFilter === 'упаковка' ? 'selected' : ''}>Коробки / Упаковка</option>
            <option value="пакеты" ${crmState.categoryFilter === 'пакеты' ? 'selected' : ''}>Пакеты</option>
            <option value="календари" ${crmState.categoryFilter === 'календари' ? 'selected' : ''}>Календари</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <button id="crmRefreshBtn" class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium flex items-center gap-1 transition">
            🔄 Обновить
          </button>
          <button id="crmNewOrderBtn" class="px-3.5 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1 shadow-sm transition">
            ➕ Создать заказ в CRM
          </button>
        </div>
      </div>

      <!-- Kanban Columns Horizontal Scroll -->
      <div class="flex gap-4 overflow-x-auto pb-6 select-none" style="min-height: calc(100vh - 280px);">
        ${STAGES.map(stage => {
          const colOrders = filtered.filter(o => o.stage === stage.key);
          const stageSum = colOrders.reduce((sum, o) => sum + (o.price?.total || 0), 0);

          return `
            <div class="kanban-col flex flex-col rounded-xl overflow-hidden shadow-sm" data-stage="${stage.key}">
              <!-- Column Header -->
              <div class="p-3 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-10">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full ${stage.badgeColor.replace('text-', 'bg-')}"></span>
                  <span class="font-bold text-xs text-slate-800">${stage.label}</span>
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold ${stage.badgeColor}">${colOrders.length}</span>
                </div>
                <span class="text-[11px] font-bold text-slate-500">${(stageSum / 1000).toFixed(stageSum > 100000 ? 0 : 1)}k ₽</span>
              </div>

              <!-- Column Drop Area / Cards list -->
              <div class="kanban-cards-container p-2.5 flex-1 space-y-2.5 overflow-y-auto min-h-[160px]" data-stage="${stage.key}">
                ${colOrders.map(order => renderOrderCard(order)).join('')}
                ${colOrders.length === 0 ? `
                  <div class="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400">
                    Перетащите заказ сюда
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;
    bindKanbanEvents();
  }

  function renderOrderCard(order) {
    const isUrgent = order.specs?.urgency === 'urgent';
    const deadlineStr = order.specs?.deadline
      ? new Date(order.specs.deadline).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Без срока';

    return `
      <div class="kanban-card bg-white p-3 rounded-xl border ${isUrgent ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200/90'} shadow-sm" draggable="true" data-id="${order.id}">
        <!-- Top row: ID, Urgency, Category -->
        <div class="flex items-center justify-between gap-1 mb-1.5">
          <div class="flex items-center gap-1.5">
            <span class="font-black text-xs text-slate-900">${order.id}</span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">${order.categoryName || order.category}</span>
          </div>
          ${isUrgent ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 animate-pulse">⚡ СРОЧНО</span>' : ''}
        </div>

        <!-- Order Title -->
        <div class="font-bold text-xs text-slate-800 line-clamp-2 hover:text-rose-600 cursor-pointer order-title-click" data-id="${order.id}">
          ${order.title}
        </div>

        <!-- Client & Specs -->
        <div class="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate">
          <span>👤 ${order.client?.name || order.client?.contactPerson || 'Клиент'}</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-0.5 truncate">
          ${order.specs?.format || ''} • ${order.specs?.quantity || 1} шт.
        </div>

        <!-- Machine badge if assigned -->
        ${order.machine && order.machine !== 'Определяется на препрессе' ? `
          <div class="mt-2 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium truncate flex items-center gap-1">
            <span>⚙️</span> <span class="truncate">${order.machine}</span>
          </div>
        ` : ''}

        <!-- Bottom Row: Deadline & Price -->
        <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-[10px] text-slate-400 font-medium">⏳ ${deadlineStr}</span>
          <span class="font-black text-rose-600">${(order.price?.total || 0).toLocaleString('ru-RU')} ₽</span>
        </div>

        <!-- Quick stage move arrow buttons -->
        <div class="mt-2 flex items-center justify-between pt-1 border-t border-slate-100/60">
          <button type="button" class="quick-prev-stage text-[10px] text-slate-400 hover:text-slate-700 px-1 font-bold" data-id="${order.id}">◀ Назад</button>
          <button type="button" class="open-order-modal text-[10px] text-rose-600 hover:text-rose-700 font-bold px-1" data-id="${order.id}">Детали ↗</button>
          <button type="button" class="quick-next-stage text-[10px] text-emerald-600 hover:text-emerald-700 px-1 font-bold" data-id="${order.id}">Далее ▶</button>
        </div>
      </div>
    `;
  }

  // Bind drag & drop and filter events
  function bindKanbanEvents() {
    // Search
    const searchInput = document.getElementById('crmSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        crmState.searchQuery = e.target.value;
        renderKanban(document.getElementById('crmTabContent'));
      });
    }

    // Urgency & Category
    const urgSelect = document.getElementById('crmUrgencySelect');
    if (urgSelect) {
      urgSelect.addEventListener('change', (e) => {
        crmState.urgencyFilter = e.target.value;
        renderKanban(document.getElementById('crmTabContent'));
      });
    }
    const catSelect = document.getElementById('crmCategorySelect');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        crmState.categoryFilter = e.target.value;
        renderKanban(document.getElementById('crmTabContent'));
      });
    }

    // Refresh
    const refreshBtn = document.getElementById('crmRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => loadCRMData());
    }

    // New Order in CRM
    const newOrderBtn = document.getElementById('crmNewOrderBtn');
    if (newOrderBtn) {
      newOrderBtn.addEventListener('click', () => openNewOrderModal());
    }

    // Open detail modal clicks
    document.querySelectorAll('.open-order-modal, .order-title-click').forEach(el => {
      el.addEventListener('click', () => {
        openOrderModal(el.dataset.id);
      });
    });

    // Quick move stage
    document.querySelectorAll('.quick-next-stage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        advanceOrderStage(btn.dataset.id, 1);
      });
    });
    document.querySelectorAll('.quick-prev-stage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        advanceOrderStage(btn.dataset.id, -1);
      });
    });

    // Drag & Drop
    let draggedOrderId = null;
    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedOrderId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', draggedOrderId);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
    });

    document.querySelectorAll('.kanban-cards-container').forEach(container => {
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.classList.add('bg-slate-200/60');
      });
      container.addEventListener('dragleave', () => {
        container.classList.remove('bg-slate-200/60');
      });
      container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.classList.remove('bg-slate-200/60');
        const targetStage = container.dataset.stage;
        if (draggedOrderId && targetStage) {
          updateOrderStage(draggedOrderId, targetStage);
        }
      });
    });
  }

  // Update order stage via API
  async function updateOrderStage(orderId, newStage) {
    const order = crmState.orders.find(o => o.id === orderId);
    if (!order || order.stage === newStage) return;

    // Optimistic local update
    order.stage = newStage;
    renderKanban(document.getElementById('crmTabContent'));

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      const data = await res.json();
      if (data.success && data.order) {
        // Sync with server order
        const idx = crmState.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) crmState.orders[idx] = data.order;
        updateKPIHeader();
      }
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  }

  function advanceOrderStage(orderId, direction) {
    const order = crmState.orders.find(o => o.id === orderId);
    if (!order) return;

    const stageKeys = STAGES.map(s => s.key);
    let curIdx = stageKeys.indexOf(order.stage);
    if (curIdx === -1) curIdx = 0;

    let nextIdx = curIdx + direction;
    if (nextIdx >= 0 && nextIdx < stageKeys.length) {
      updateOrderStage(orderId, stageKeys[nextIdx]);
    }
  }

  // ================= 2. CLIENTS MANAGEMENT =================
  function renderClients(container) {
    let clients = [...crmState.clients];

    let html = `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 class="text-lg font-bold text-slate-900">База клиентов и контрагентов</h3>
            <p class="text-xs text-slate-500">Управление профилями, скидочными условиями и историей заказов</p>
          </div>
          <button id="addClientBtn" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm">
            ➕ Добавить контрагента
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th class="py-3 px-3">Клиент / Компания</th>
                <th class="py-3 px-3">Контактное лицо</th>
                <th class="py-3 px-3">Телефон / Email</th>
                <th class="py-3 px-3">Категория</th>
                <th class="py-3 px-3">Статус / Скидка</th>
                <th class="py-3 px-3 text-right">Заказов (LTV)</th>
                <th class="py-3 px-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${clients.map(c => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="py-3 px-3">
                    <strong class="font-bold text-slate-900 block">${c.name}</strong>
                    <span class="text-[10px] text-slate-400">ИНН: ${c.inn || 'Не указан'}</span>
                  </td>
                  <td class="py-3 px-3 font-medium text-slate-700">${c.contactPerson || '—'}</td>
                  <td class="py-3 px-3">
                    <div class="font-medium text-slate-800">${c.phone || '—'}</div>
                    <div class="text-slate-400 text-[10px]">${c.email || '—'}</div>
                  </td>
                  <td class="py-3 px-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">${c.category}</span>
                  </td>
                  <td class="py-3 px-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.tier?.includes('VIP') ? 'bg-purple-100 text-purple-700' : (c.tier?.includes('Gold') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}">
                      ${c.tier || 'Базовый 0%'}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-right">
                    <div class="font-black text-slate-900">${(c.totalSpent || 0).toLocaleString('ru-RU')} ₽</div>
                    <div class="text-[10px] text-slate-400">${c.totalOrders || 0} тиражей</div>
                  </td>
                  <td class="py-3 px-3 text-right">
                    <button class="filter-client-orders text-xs text-rose-600 hover:text-rose-700 font-bold px-1.5" data-name="${c.name}">Заказы</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Filter by client orders
    document.querySelectorAll('.filter-client-orders').forEach(btn => {
      btn.addEventListener('click', () => {
        crmState.searchQuery = btn.dataset.name;
        switchTab('kanban');
      });
    });

    document.getElementById('addClientBtn')?.addEventListener('click', () => {
      openNewClientModal();
    });
  }

  // ================= 3. EQUIPMENT PARK =================
  function renderEquipment(container) {
    let eq = [...crmState.equipment];

    let html = `
      <div class="space-y-4">
        <div class="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
          <div>
            <h3 class="text-lg font-bold text-slate-900">Производственный парк ИПК «Южный Урал»</h3>
            <p class="text-xs text-slate-500">Мониторинг загрузки печатных и постпечатных машин в цеху 24/7</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 font-semibold">Средняя загрузка парка</span>
            <div class="text-xl font-black text-rose-600">${crmState.analytics?.kpis?.avgEquipmentLoad || 70}%</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${eq.map(machine => {
            const isRunning = machine.status === 'running';
            const isIdle = machine.status === 'idle';

            return `
              <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">${machine.origin}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isRunning ? 'bg-emerald-100 text-emerald-700' : (isIdle ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}">
                      ${isRunning ? '● В РАБОТЕ' : (isIdle ? '○ ГОТОВ' : '▲ ТЕХОБСЛУЖИВАНИЕ')}
                    </span>
                  </div>

                  <h4 class="font-black text-sm text-slate-900">${machine.name}</h4>
                  <div class="text-xs text-slate-500 mt-0.5">${machine.type} • Скорость: ${machine.speed}</div>

                  <!-- Utilization Bar -->
                  <div class="mt-4">
                    <div class="flex justify-between text-xs font-semibold mb-1">
                      <span class="text-slate-500">Загрузка смены</span>
                      <span class="text-slate-800 font-bold">${machine.loadPercent}%</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div class="h-2 rounded-full ${machine.loadPercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'}" style="width: ${machine.loadPercent}%"></div>
                    </div>
                  </div>

                  <!-- Current running job -->
                  <div class="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Текущий тираж:</span>
                    <strong class="text-slate-800 line-clamp-1">${machine.currentJob || 'Нет активного задания'}</strong>
                    <div class="text-[10px] text-slate-400 mt-0.5">В очереди: ${machine.queueCount || 0} тиражей</div>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span class="text-[10px] text-slate-400">ТО: ${machine.lastMaintenance}</span>
                  <button type="button" class="toggle-eq-status text-xs text-rose-600 hover:text-rose-700 font-bold" data-id="${machine.id}">
                    Изменить статус ⚙️
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Toggle machine status
    document.querySelectorAll('.toggle-eq-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const machine = crmState.equipment.find(e => e.id === id);
        if (!machine) return;

        const nextStatus = machine.status === 'running' ? 'idle' : (machine.status === 'idle' ? 'running' : 'idle');
        const nextText = nextStatus === 'running' ? 'В работе по графику' : 'Готов к загрузке тиража';

        await fetch(`/api/equipment/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus, statusText: nextText })
        });
        loadCRMData();
      });
    });
  }

  // ================= 4. MATERIALS & WAREHOUSE =================
  function renderMaterials(container) {
    let mat = [...crmState.materials];

    let html = `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 class="text-lg font-bold text-slate-900">Склад бумаги и расходных материалов</h3>
            <p class="text-xs text-slate-500">Автоматический учет остатков бумаги, фольги, ламината и картона</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-700">
              Мало на складе: ${mat.filter(m => m.status === 'low').length} поз.
            </span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th class="py-3 px-3">Материал</th>
                <th class="py-3 px-3">Категория</th>
                <th class="py-3 px-3">Ед. изм.</th>
                <th class="py-3 px-3 text-right">Остаток на складе</th>
                <th class="py-3 px-3 text-right">Мин. порог</th>
                <th class="py-3 px-3">Статус</th>
                <th class="py-3 px-3 text-right">Пополнение</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${mat.map(m => {
                const isLow = m.status === 'low';
                return `
                  <tr class="hover:bg-slate-50 transition ${isLow ? 'bg-rose-50/40' : ''}">
                    <td class="py-3 px-3 font-bold text-slate-900">${m.name}</td>
                    <td class="py-3 px-3 text-slate-600">${m.category}</td>
                    <td class="py-3 px-3 text-slate-500">${m.unit}</td>
                    <td class="py-3 px-3 text-right font-black ${isLow ? 'text-rose-600' : 'text-slate-800'}">
                      ${m.inStock.toLocaleString('ru-RU')}
                    </td>
                    <td class="py-3 px-3 text-right text-slate-400">${m.minAlert.toLocaleString('ru-RU')}</td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isLow ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}">
                        ${isLow ? '⚠️ ТРЕБУЕТСЯ ЗАКАЗ' : 'В НОРМЕ'}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right space-x-1">
                      <button class="replenish-mat-btn px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold" data-id="${m.id}" data-amount="1000">+1 000</button>
                      <button class="replenish-mat-btn px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold" data-id="${m.id}" data-amount="5000">+5 000</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Replenish stock
    document.querySelectorAll('.replenish-mat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const add = Number(btn.dataset.amount);
        const item = crmState.materials.find(m => m.id === id);
        if (!item) return;

        const newStock = item.inStock + add;
        await fetch(`/api/materials/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inStock: newStock })
        });
        loadCRMData();
      });
    });
  }

  // ================= 5. ANALYTICS =================
  function renderAnalytics(container) {
    if (!crmState.analytics) return;
    const a = crmState.analytics;
    const k = a.kpis;

    let html = `
      <div class="space-y-6">
        <!-- 4 Top Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400">Общая выручка</span>
            <div class="text-2xl font-black text-slate-900 mt-1">${(k.totalRevenue || 0).toLocaleString('ru-RU')} ₽</div>
            <div class="text-xs text-emerald-600 font-semibold mt-1">Чистая маржа: ${(k.totalMargin || 0).toLocaleString('ru-RU')} ₽ (${k.marginPercent}%)</div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400">Средний чек тиража</span>
            <div class="text-2xl font-black text-rose-600 mt-1">${(k.avgOrderValue || 0).toLocaleString('ru-RU')} ₽</div>
            <div class="text-xs text-slate-500 mt-1">Всего заказов: ${k.totalOrdersCount} шт.</div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400">В производстве сейчас</span>
            <div class="text-2xl font-black text-slate-900 mt-1">${k.activeOrdersCount} заказов</div>
            <div class="text-xs text-blue-600 font-semibold mt-1">Выполнено: ${k.completedOrdersCount} заказов</div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400">База контрагентов</span>
            <div class="text-2xl font-black text-slate-900 mt-1">${k.totalClientsCount} компаний</div>
            <div class="text-xs text-slate-500 mt-1">Средняя загрузка цеха: ${k.avgEquipmentLoad}%</div>
          </div>
        </div>

        <!-- Breakdown by Stage & Category -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Stages breakdown -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 class="font-bold text-sm text-slate-900 mb-4">Воронка производства по этапам</h4>
            <div class="space-y-3">
              ${STAGES.map(s => {
                const count = a.stages[s.key] || 0;
                const pct = k.totalOrdersCount > 0 ? Math.round((count / k.totalOrdersCount) * 100) : 0;
                return `
                  <div>
                    <div class="flex justify-between text-xs font-semibold mb-1">
                      <span class="text-slate-700">${s.label}</span>
                      <span class="text-slate-900 font-bold">${count} шт. (${pct}%)</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div class="h-2 rounded-full bg-rose-600" style="width: ${pct}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Top Clients -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 class="font-bold text-sm text-slate-900 mb-4">Топ-5 ключевых клиентов типографии</h4>
            <div class="space-y-3">
              ${(a.topClients || []).map((c, i) => `
                <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">#${i + 1}</span>
                    <div>
                      <div class="font-bold text-xs text-slate-900">${c.name}</div>
                      <div class="text-[10px] text-slate-400">${c.category} • ${c.tier}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-black text-xs text-rose-600">${(c.totalSpent || 0).toLocaleString('ru-RU')} ₽</div>
                    <div class="text-[10px] text-slate-400">${c.totalOrders} заказов</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // ================= 6. DETAILED ORDER MODAL =================
  function openOrderModal(orderId) {
    const order = crmState.orders.find(o => o.id === orderId);
    if (!order) return;

    crmState.currentOrderModal = order;
    const modal = document.getElementById('crmOrderDetailModal');
    if (!modal) return;

    document.getElementById('crmModalOrderId').innerText = order.id;
    document.getElementById('crmModalOrderTitle').value = order.title;
    document.getElementById('crmModalStageSelect').value = order.stage;
    document.getElementById('crmModalManagerSelect').value = order.manager || 'Дмитрий Воронов';
    document.getElementById('crmModalMachineSelect').value = order.machine || 'Heidelberg Speedmaster XL 75-5+L';
    document.getElementById('crmModalPriceTotal').value = order.price?.total || 0;
    document.getElementById('crmModalPricePrime').value = order.price?.primeCost || 0;
    document.getElementById('crmModalPaidSelect').value = order.price?.paid ? 'true' : 'false';

    // Client card
    document.getElementById('crmModalClientName').innerText = order.client?.name || order.client?.contactPerson || '—';
    document.getElementById('crmModalClientPhone').innerText = order.client?.phone || '—';
    document.getElementById('crmModalClientEmail').innerText = order.client?.email || '—';

    // Specs
    document.getElementById('crmModalSpecsFormat').innerText = order.specs?.format || '—';
    document.getElementById('crmModalSpecsPaper').innerText = order.specs?.paper || '—';
    document.getElementById('crmModalSpecsQty').innerText = `${order.specs?.quantity || 1} шт.`;
    document.getElementById('crmModalSpecsColor').innerText = order.specs?.colorSides || '—';
    document.getElementById('crmModalSpecsFinishing').innerText = (order.specs?.finishing || []).join(', ') || 'Без доп. отделки';

    // Files list
    const filesBox = document.getElementById('crmModalFilesList');
    if (filesBox) {
      if (!order.files || order.files.length === 0) {
        filesBox.innerHTML = '<span class="text-slate-400 text-xs">Файлы макета не прикреплены</span>';
      } else {
        filesBox.innerHTML = order.files.map(f => `
          <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <span class="font-medium text-slate-800">📄 ${f.name} (${f.size})</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">ОК к печати</span>
          </div>
        `).join('');
      }
    }

    // Notes timeline
    renderOrderModalNotes(order);

    modal.classList.remove('hidden');
  }

  function renderOrderModalNotes(order) {
    const notesBox = document.getElementById('crmModalNotesList');
    if (!notesBox) return;

    if (!order.notes || order.notes.length === 0) {
      notesBox.innerHTML = '<div class="text-xs text-slate-400 py-2">Заметок пока нет</div>';
      return;
    }

    notesBox.innerHTML = order.notes.map(n => `
      <div class="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs">
        <div class="flex justify-between text-[10px] text-slate-400 mb-1">
          <strong class="text-slate-700 font-semibold">${n.author}</strong>
          <span>${n.date}</span>
        </div>
        <div class="text-slate-800">${n.text}</div>
      </div>
    `).join('');
  }

  // Save changes from Order Modal
  async function saveOrderModalChanges() {
    const order = crmState.currentOrderModal;
    if (!order) return;

    const title = document.getElementById('crmModalOrderTitle').value;
    const stage = document.getElementById('crmModalStageSelect').value;
    const manager = document.getElementById('crmModalManagerSelect').value;
    const machine = document.getElementById('crmModalMachineSelect').value;
    const total = Number(document.getElementById('crmModalPriceTotal').value);
    const primeCost = Number(document.getElementById('crmModalPricePrime').value);
    const paid = document.getElementById('crmModalPaidSelect').value === 'true';

    const updates = {
      title,
      stage,
      manager,
      machine,
      price: {
        ...order.price,
        total,
        primeCost,
        margin: total - primeCost,
        paid
      }
    };

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('crmOrderDetailModal')?.classList.add('hidden');
        loadCRMData();
      }
    } catch (err) {
      console.error('Error saving order modal:', err);
    }
  }

  // Add note inside order modal
  async function addOrderNote() {
    const order = crmState.currentOrderModal;
    const input = document.getElementById('crmModalNewNoteInput');
    if (!order || !input || !input.value.trim()) return;

    const text = input.value.trim();
    try {
      const res = await fetch(`/api/orders/${order.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'Менеджер CRM', text })
      });
      const data = await res.json();
      if (data.success && data.notes) {
        order.notes = data.notes;
        renderOrderModalNotes(order);
        input.value = '';
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  }

  // Printable Tech Card (Техкарта / Наряд на производство)
  function printTechCard() {
    const order = crmState.currentOrderModal;
    if (!order) return;

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Технологическая карта — ${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #f4f4f4; }
          .barcode { margin-top: 25px; padding: 15px; border: 2px dashed #000; text-align: center; font-family: monospace; font-size: 18px; letter-spacing: 4px; }
          .stamp { margin-top: 40px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">ИПК «ЮЖНЫЙ УРАЛ» • ТЕХНОЛОГИЧЕСКИЙ НАРЯД № ${order.id}</div>
            <div>460000, г. Оренбург, пер. Свободина, 4, корп. 3 • Тел: +7 (3532) 66-22-11</div>
          </div>
          <div style="text-align: right;">
            <div>Дата запуска: ${new Date(order.createdAt).toLocaleDateString('ru-RU')}</div>
            <div style="font-weight: bold; color: ${order.specs?.urgency === 'urgent' ? 'red' : 'black'};">
              ${order.specs?.urgency === 'urgent' ? '⚡ СРОЧНЫЙ ТИРАЖ' : 'СТАНДАРТ'}
            </div>
          </div>
        </div>

        <h3>1. ПАРАМЕТРЫ ЗАКАЗА</h3>
        <table>
          <tr><th>Наименование</th><td>${order.title}</td></tr>
          <tr><th>Заказчик</th><td>${order.client?.name || order.client?.contactPerson} (${order.client?.phone || ''})</td></tr>
          <tr><th>Формат</th><td>${order.specs?.format || 'Стандарт'}</td></tr>
          <tr><th>Тираж</th><td><strong>${order.specs?.quantity || 1} шт.</strong></td></tr>
          <tr><th>Материал</th><td>${order.specs?.paper || ''}</td></tr>
          <tr><th>Цветность</th><td>${order.specs?.colorSides || ''}</td></tr>
          <tr><th>Постпечать</th><td>${(order.specs?.finishing || []).join(', ') || 'Без отделки'}</td></tr>
          <tr><th>Цеховое оборудование</th><td><strong>${order.machine || 'HP Indigo / Heidelberg'}</strong></td></tr>
          <tr><th>Ответственный менеджер</th><td>${order.manager || 'Дмитрий Воронов'}</td></tr>
          <tr><th>Дедлайн отгрузки</th><td><strong>${new Date(order.specs?.deadline || Date.now()).toLocaleString('ru-RU')}</strong></td></tr>
        </table>

        <div class="barcode">
          *${order.id}* [YU-PROD-PRINT]
        </div>

        <div class="stamp">
          <div>Ответственный мастер смены: _______________</div>
          <div>Контроль качества ОТК: _______________</div>
        </div>

        <script>
          window.print();
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // ================= 7. FAST NEW ORDER IN CRM MODAL =================
  function openNewOrderModal() {
    const modal = document.getElementById('crmNewOrderModal');
    if (!modal) return;
    modal.classList.remove('hidden');
  }

  function openNewClientModal() {
    const modal = document.getElementById('crmNewClientModal');
    if (!modal) return;
    modal.classList.remove('hidden');
  }

  // Expose API
  window.PMG_CRM = {
    init() {
      // Bind navigation tabs
      document.querySelectorAll('.crm-nav-tab').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
      });

      // Bind modal buttons
      document.getElementById('crmModalSaveBtn')?.addEventListener('click', saveOrderModalChanges);
      document.getElementById('crmModalCloseBtn')?.addEventListener('click', () => {
        document.getElementById('crmOrderDetailModal')?.classList.add('hidden');
      });
      document.getElementById('crmModalAddNoteBtn')?.addEventListener('click', addOrderNote);
      document.getElementById('crmModalPrintBtn')?.addEventListener('click', printTechCard);

      // Fast new order modal submission
      const newOrderForm = document.getElementById('crmNewOrderForm');
      if (newOrderForm) {
        newOrderForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = document.getElementById('crmNewTitle').value;
          const clientName = document.getElementById('crmNewClientName').value;
          const clientPhone = document.getElementById('crmNewClientPhone').value;
          const category = document.getElementById('crmNewCategory').value;
          const format = document.getElementById('crmNewFormat').value;
          const paper = document.getElementById('crmNewPaper').value;
          const qty = Number(document.getElementById('crmNewQty').value) || 100;
          const total = Number(document.getElementById('crmNewPrice').value) || 5000;
          const machine = document.getElementById('crmNewMachine').value;
          const urgency = document.getElementById('crmNewUrgency').value;

          const payload = {
            title,
            category,
            client: { name: clientName, phone: clientPhone },
            specs: { format, paper, quantity: qty, urgency },
            price: { total, primeCost: Math.round(total * 0.4), margin: Math.round(total * 0.6), paid: false },
            machine
          };

          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            document.getElementById('crmNewOrderModal')?.classList.add('hidden');
            loadCRMData();
          }
        });
      }

      // Fast new client modal submission
      const newClientForm = document.getElementById('crmNewClientForm');
      if (newClientForm) {
        newClientForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = document.getElementById('crmNewClientNameInput').value;
          const contactPerson = document.getElementById('crmNewClientPerson').value;
          const phone = document.getElementById('crmNewClientPhoneInput').value;
          const email = document.getElementById('crmNewClientEmail').value;
          const inn = document.getElementById('crmNewClientInn').value;
          const category = document.getElementById('crmNewClientCategory').value;
          const tier = document.getElementById('crmNewClientTier').value;

          const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, contactPerson, phone, email, inn, category, tier })
          });
          const data = await res.json();
          if (data.success) {
            document.getElementById('crmNewClientModal')?.classList.add('hidden');
            loadCRMData();
          }
        });
      }

      loadCRMData();
    },
    openOrderModal,
    switchTab,
    refresh: loadCRMData
  };
})();
