// PMG Real-time Client Order Tracking Widget
(function() {
  async function trackOrder(query) {
    const q = (query || document.getElementById('trackQueryInput')?.value || '').trim();
    const resultBox = document.getElementById('trackResultBox');
    const statusMsg = document.getElementById('trackStatusMsg');

    if (!q) {
      if (statusMsg) {
        statusMsg.innerText = 'Пожалуйста, укажите номер заказа (например: ЮУ-1048) или телефон.';
        statusMsg.className = 'text-sm text-rose-600 mt-2 block';
      }
      return;
    }

    if (statusMsg) {
      statusMsg.innerText = 'Поиск заказа в производственной базе ИПК «Южный Урал»...';
      statusMsg.className = 'text-sm text-slate-500 mt-2 block';
    }

    try {
      const res = await fetch(`/api/track/${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        if (statusMsg) {
          statusMsg.innerText = data.error || 'Заказ с такими данными не найден. Проверьте правильность ввода.';
          statusMsg.className = 'text-sm text-rose-600 mt-2 block';
        }
        if (resultBox) resultBox.classList.add('hidden');
        return;
      }

      // Hide message, show rich card
      if (statusMsg) statusMsg.className = 'hidden';
      if (resultBox) {
        renderTrackingResult(data, resultBox);
        resultBox.classList.remove('hidden');
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      console.error('Tracking fetch error:', err);
      if (statusMsg) {
        statusMsg.innerText = 'Сбой сети при запросе к серверу. Попробуйте снова.';
        statusMsg.className = 'text-sm text-rose-600 mt-2 block';
      }
    }
  }

  function renderTrackingResult(order, container) {
    const stageIcons = {
      new: '📥',
      prepress: '🔍',
      queue: '⏳',
      printing: '🖨️',
      postpress: '✂️',
      qc_packing: '📦',
      delivery: '🚚',
      completed: '✅'
    };

    const urgencyBadge = order.urgency === 'urgent'
      ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">⚡ СРОЧНЫЙ ТИРАЖ</span>'
      : '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Стандартный срок</span>';

    const deadlineFormatted = order.deadline
      ? new Date(order.deadline).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      : 'В графике производства';

    let html = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Заказ ИПК «Южный Урал»</span>
              ${urgencyBadge}
            </div>
            <h3 class="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <span>${order.orderId}</span>
              <span class="text-slate-300 font-normal">|</span>
              <span class="text-lg font-semibold text-slate-700 truncate">${order.title}</span>
            </h3>
            <div class="text-xs text-slate-500 mt-1">Заказчик: <strong class="text-slate-700">${order.clientName || 'Контрагент'}</strong> • Создан: ${new Date(order.createdAt).toLocaleDateString('ru-RU')}</div>
          </div>
          <div class="text-left md:text-right">
            <div class="text-xs text-slate-400 uppercase font-semibold">Сумма заказа</div>
            <div class="text-2xl font-black text-rose-600">${order.priceTotal?.toLocaleString('ru-RU') || '0'} ₽</div>
            <div class="text-xs ${order.paid ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-medium'}">
              ${order.paid ? '● Оплачен полностью' : '○ Ожидает оплаты / закрывающих актов'}
            </div>
          </div>
        </div>

        <!-- Visual Stepper Progress Bar -->
        <div class="py-8">
          <div class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Текущий статус на производстве</div>
          
          <div class="relative">
            <!-- Progress Line Background -->
            <div class="absolute top-5 left-0 right-0 h-1 bg-slate-200 z-0"></div>
            <!-- Active Fill Line -->
            <div class="absolute top-5 left-0 h-1 bg-emerald-500 transition-all duration-700 z-0" style="width: ${Math.min(100, (order.stageIndex / (order.roadmap.length - 1)) * 100)}%;"></div>

            <!-- Steps -->
            <div class="relative z-10 grid grid-cols-4 sm:grid-cols-8 gap-2 text-center">
              ${order.roadmap.map((step, idx) => {
                const isPassed = idx < order.stageIndex;
                const isCurrent = idx === order.stageIndex;
                let circleClass = 'bg-slate-100 text-slate-400 border-2 border-slate-300';
                if (isPassed) circleClass = 'bg-emerald-500 text-white border-2 border-emerald-500';
                if (isCurrent) circleClass = 'bg-rose-600 text-white border-4 border-rose-200 ring-2 ring-rose-500 animate-pulse';

                return `
                  <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition ${circleClass}">
                      ${isPassed ? '✓' : (stageIcons[step.key] || idx + 1)}
                    </div>
                    <div class="mt-2 text-[11px] font-bold leading-tight ${isCurrent ? 'text-rose-600 font-black' : (isPassed ? 'text-slate-800' : 'text-slate-400')}">
                      ${step.label}
                    </div>
                    <div class="hidden sm:block text-[9px] text-slate-400 mt-0.5 leading-snug">
                      ${step.desc}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-6">
          <div class="bg-white p-4 rounded-xl border border-slate-200/80">
            <div class="text-[11px] uppercase font-bold text-slate-400">Характеристики печати</div>
            <div class="text-sm font-semibold text-slate-800 mt-1">${order.specs?.format || 'Стандарт'} • ${order.specs?.quantity || 1} шт.</div>
            <div class="text-xs text-slate-500 mt-0.5">${order.specs?.paper || 'Мелованная бумага'}</div>
          </div>

          <div class="bg-white p-4 rounded-xl border border-slate-200/80">
            <div class="text-[11px] uppercase font-bold text-slate-400">Ориентировочная готовность</div>
            <div class="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5 text-rose-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              ${deadlineFormatted}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">Адрес выдачи: 460000, г. Оренбург, пер. Свободина, 4, корп. 3</div>
          </div>

          <div class="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div class="text-[11px] uppercase font-bold text-slate-400">Связь с производством</div>
              <div class="text-xs text-slate-700 mt-1">Отдел координации тиражей: <strong>+7 (3532) 66-22-11</strong></div>
            </div>
            <div class="mt-2 flex gap-2">
              <button onclick="window.location.hash='crm'; window.PMG_CRM?.openOrderModal('${order.orderId}')" class="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1">
                <span>Панель CRM</span> ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  window.PMG_TRACKER = {
    init() {
      const trackBtn = document.getElementById('trackSubmitBtn');
      const input = document.getElementById('trackQueryInput');

      if (trackBtn) {
        trackBtn.addEventListener('click', () => trackOrder());
      }
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') trackOrder();
        });
      }

      // Check URL query on load
      const hash = window.location.hash;
      if (hash.includes('track=')) {
        const orderId = hash.split('track=')[1].split('&')[0];
        if (orderId) {
          if (input) input.value = orderId;
          trackOrder(orderId);
        }
      }
    },
    trackOrder
  };
})();
