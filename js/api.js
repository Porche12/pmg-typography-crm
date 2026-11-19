// PMG Dual-Mode API Client (Express Backend + GitHub Pages LocalStorage Fallback)
(function() {
  const STORAGE_KEY = 'PMG_TYPOGRAPHY_DB_V1';
  const isStaticHost = window.location.hostname.includes('github.io') || window.location.protocol === 'file:' || !window.location.port;

  // Initialize LocalStorage DB if empty
  function getLocalDB() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    const initial = window.PMG_INITIAL_DB || { settings: {}, clients: [], equipment: [], materials: [], orders: [] };
    saveLocalDB(initial);
    return initial;
  }

  function saveLocalDB(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  }

  // Intercept window.fetch for /api/* on GitHub Pages or static host
  const originalFetch = (typeof window !== 'undefined' && window.fetch) ? window.fetch.bind(window) : (typeof fetch !== 'undefined' ? fetch : null);
  const interceptedFetch = async function(url, options = {}) {
    const urlStr = typeof url === 'string' ? url : (url.url || '');
    
    // If not an /api/ request, use normal fetch
    if (!urlStr.includes('/api/')) {
      return originalFetch ? originalFetch(url, options) : Promise.reject(new Error('Fetch not available'));
    }

    // If on localhost / Express server, attempt normal fetch first
    if (!isStaticHost && originalFetch) {
      try {
        const response = await originalFetch(url, options);
        if (response && response.ok) return response;
      } catch (err) {
        console.warn('Backend fetch failed, falling back to LocalStorage simulation:', err);
      }
    }

    // Static / GitHub Pages Simulated API Engine
    return handleSimulatedAPI(urlStr, options);
  };

  if (typeof window !== 'undefined') {
    window.fetch = interceptedFetch;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.fetch = interceptedFetch;
  }

  function handleSimulatedAPI(url, options) {
    const db = getLocalDB();
    const method = (options.method || 'GET').toUpperCase();
    const cleanUrl = url.split('?')[0];
    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

    let responseData = null;
    let status = 200;

    // 1. Settings
    if (cleanUrl.endsWith('/api/settings')) {
      responseData = db.settings || {};
    }

    // 2. Orders List
    else if (cleanUrl.endsWith('/api/orders') && method === 'GET') {
      let orders = [...(db.orders || [])];
      const stage = params.get('stage');
      const category = params.get('category');
      const urgency = params.get('urgency');
      const search = params.get('search');

      if (stage && stage !== 'all') orders = orders.filter(o => o.stage === stage);
      if (category && category !== 'all') orders = orders.filter(o => o.category === category);
      if (urgency && urgency !== 'all') orders = orders.filter(o => o.specs?.urgency === urgency);
      if (search) {
        const q = search.toLowerCase();
        orders = orders.filter(o =>
          o.id.toLowerCase().includes(q) ||
          (o.title && o.title.toLowerCase().includes(q)) ||
          (o.client?.name && o.client.name.toLowerCase().includes(q)) ||
          (o.client?.phone && o.client.phone.includes(q))
        );
      }
      responseData = orders;
    }

    // 3. Create Order
    else if (cleanUrl.endsWith('/api/orders') && method === 'POST') {
      const nextNum = 1040 + (db.orders || []).length + 1;
      const newId = `ЮУ-${nextNum}`;

      const newOrder = {
        id: newId,
        title: body.title || 'Заказ полиграфии',
        category: body.category || 'листовая',
        categoryName: body.categoryName || 'Полиграфическая продукция',
        client: body.client || { name: 'Заказчик', phone: '' },
        specs: body.specs || {},
        price: body.price || { total: 5000, primeCost: 2000, margin: 3000, paid: false },
        stage: 'new',
        manager: body.manager || 'Дмитрий Воронов',
        machine: body.machine || 'Heidelberg Speedmaster XL 75-5+L',
        preflightStatus: 'approved',
        files: body.files || [],
        notes: body.notes ? [{ author: body.client?.name || 'Клиент', text: body.notes, date: new Date().toLocaleString('ru-RU') }] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.orders.unshift(newOrder);
      saveLocalDB(db);
      responseData = { success: true, order: newOrder };
      status = 201;
    }

    // 4. Update Order (Stage, Machine, Pricing)
    else if (cleanUrl.match(/\/api\/orders\/([A-Za-z0-9_-]+)$/) && method === 'PATCH') {
      const orderId = cleanUrl.match(/\/api\/orders\/([A-Za-z0-9_-]+)$/)[1];
      const idx = (db.orders || []).findIndex(o => o.id === orderId);

      if (idx !== -1) {
        const current = db.orders[idx];
        if (body.stage && body.stage !== current.stage) {
          const stageNames = {
            new: 'Новая заявка', prepress: 'Препресс', queue: 'Очередь печати',
            printing: 'Печать', postpress: 'Постпечать', qc_packing: 'ОТК',
            delivery: 'Готов к выдаче', completed: 'Выполнен', cancelled: 'Отменен'
          };
          if (!current.notes) current.notes = [];
          current.notes.push({
            author: 'Система CRM',
            text: `Статус изменен: ${stageNames[current.stage] || current.stage} ➔ ${stageNames[body.stage] || body.stage}`,
            date: new Date().toLocaleString('ru-RU')
          });
        }
        db.orders[idx] = { ...current, ...body, updatedAt: new Date().toISOString() };
        saveLocalDB(db);
        responseData = { success: true, order: db.orders[idx] };
      } else {
        status = 404;
        responseData = { error: 'Order not found' };
      }
    }

    // 5. Add Note to Order
    else if (cleanUrl.match(/\/api\/orders\/([A-Za-z0-9_-]+)\/notes$/) && method === 'POST') {
      const orderId = cleanUrl.match(/\/api\/orders\/([A-Za-z0-9_-]+)\/notes$/)[1];
      const order = (db.orders || []).find(o => o.id === orderId);
      if (order) {
        if (!order.notes) order.notes = [];
        order.notes.push({
          author: body.author || 'Менеджер CRM',
          text: body.text,
          date: new Date().toLocaleString('ru-RU')
        });
        saveLocalDB(db);
        responseData = { success: true, notes: order.notes };
      } else {
        status = 404;
        responseData = { error: 'Order not found' };
      }
    }

    // 6. Preflight File Upload Simulation
    else if (cleanUrl.endsWith('/api/upload') && method === 'POST') {
      responseData = {
        success: true,
        file: {
          name: 'uploaded_layout_print.pdf',
          size: '18.4 MB',
          preflightStatus: 'approved',
          issues: ['Разрешение 300 DPI проверено', 'Вылеты 2 мм обнаружены', 'Цветовая модель CMYK ISO Coated v2'],
          uploadDate: new Date().toLocaleString('ru-RU')
        }
      };
    }

    // 7. Clients
    else if (cleanUrl.endsWith('/api/clients') && method === 'GET') {
      responseData = db.clients || [];
    }
    else if (cleanUrl.endsWith('/api/clients') && method === 'POST') {
      const newClient = {
        id: `cl-${Date.now().toString().slice(-4)}`,
        name: body.name || 'Новый клиент',
        contactPerson: body.contactPerson || '',
        phone: body.phone || '',
        email: body.email || '',
        inn: body.inn || '',
        category: body.category || 'B2B Корпоративный',
        tier: body.tier || 'Базовый 0%',
        totalOrders: 0,
        totalSpent: 0
      };
      db.clients.unshift(newClient);
      saveLocalDB(db);
      responseData = { success: true, client: newClient };
    }

    // 8. Equipment
    else if (cleanUrl.endsWith('/api/equipment') && method === 'GET') {
      responseData = db.equipment || [];
    }
    else if (cleanUrl.match(/\/api\/equipment\/([A-Za-z0-9_-]+)$/) && method === 'PATCH') {
      const id = cleanUrl.match(/\/api\/equipment\/([A-Za-z0-9_-]+)$/)[1];
      const idx = (db.equipment || []).findIndex(e => e.id === id);
      if (idx !== -1) {
        db.equipment[idx] = { ...db.equipment[idx], ...body };
        saveLocalDB(db);
        responseData = { success: true, machine: db.equipment[idx] };
      }
    }

    // 9. Materials & Warehouse
    else if (cleanUrl.endsWith('/api/materials') && method === 'GET') {
      responseData = db.materials || [];
    }
    else if (cleanUrl.match(/\/api\/materials\/([A-Za-z0-9_-]+)$/) && method === 'PATCH') {
      const id = cleanUrl.match(/\/api\/materials\/([A-Za-z0-9_-]+)$/)[1];
      const idx = (db.materials || []).findIndex(m => m.id === id);
      if (idx !== -1) {
        db.materials[idx] = { ...db.materials[idx], ...body };
        if (db.materials[idx].inStock <= db.materials[idx].minAlert) {
          db.materials[idx].status = 'low';
        } else {
          db.materials[idx].status = 'ok';
        }
        saveLocalDB(db);
        responseData = { success: true, material: db.materials[idx] };
      }
    }

    // 10. Analytics
    else if (cleanUrl.endsWith('/api/analytics')) {
      const orders = db.orders || [];
      const clients = db.clients || [];
      const totalRev = orders.reduce((s, o) => s + (o.price?.total || 0), 0);
      const totalMargin = orders.reduce((s, o) => s + (o.price?.margin || 0), 0);
      const stages = { new: 0, prepress: 0, queue: 0, printing: 0, postpress: 0, qc_packing: 0, delivery: 0, completed: 0, cancelled: 0 };
      orders.forEach(o => { if (stages[o.stage] !== undefined) stages[o.stage]++; });

      responseData = {
        kpis: {
          totalRevenue: totalRev,
          totalMargin,
          marginPercent: totalRev > 0 ? Math.round((totalMargin / totalRev) * 100) : 0,
          activeOrdersCount: orders.filter(o => !['completed', 'cancelled'].includes(o.stage)).length,
          completedOrdersCount: orders.filter(o => o.stage === 'completed').length,
          totalOrdersCount: orders.length,
          avgOrderValue: orders.length > 0 ? Math.round(totalRev / orders.length) : 0,
          avgEquipmentLoad: 78,
          totalClientsCount: clients.length
        },
        stages,
        topClients: [...clients].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5)
      };
    }

    // 11. Order Tracking by ID or Phone
    else if (cleanUrl.includes('/api/track/')) {
      const q = decodeURIComponent(cleanUrl.split('/api/track/')[1] || '').trim().toLowerCase();
      const digitsOnly = q.replace(/\D/g, '');

      const match = (db.orders || []).find(o => {
        const orderMatch = o.id.toLowerCase() === q || o.id.toLowerCase() === `pmg-${q}` || o.id.toLowerCase() === `юу-${q}`;
        const phoneMatch = digitsOnly.length >= 7 && o.client?.phone && o.client.phone.replace(/\D/g, '').includes(digitsOnly);
        return orderMatch || phoneMatch;
      });

      if (match) {
        const roadmap = [
          { key: 'new', label: 'Заявка принята', desc: 'Заказ зарегистрирован в системе' },
          { key: 'prepress', label: 'Проверка макета', desc: 'Препресс-контроль вылетов и цвета' },
          { key: 'queue', label: 'Очередь печати', desc: 'Цветопроба утверждена' },
          { key: 'printing', label: 'В производстве', desc: `Печать на: ${match.machine}` },
          { key: 'postpress', label: 'Постпечать', desc: 'Ламинация, резка, тиснение' },
          { key: 'qc_packing', label: 'Контроль качества', desc: 'Проверка ОТК и упаковка' },
          { key: 'delivery', label: 'Готов к выдаче', desc: 'Ожидает клиента или в доставке' },
          { key: 'completed', label: 'Выполнен', desc: 'Заказ успешно вручен' }
        ];
        let idx = roadmap.findIndex(s => s.key === match.stage);
        if (idx === -1) idx = 0;

        responseData = {
          orderId: match.id,
          title: match.title,
          clientName: match.client?.name || match.client?.contactPerson,
          stage: match.stage,
          stageIndex: idx,
          roadmap,
          specs: match.specs,
          deadline: match.specs?.deadline,
          urgency: match.specs?.urgency,
          createdAt: match.createdAt,
          priceTotal: match.price?.total,
          paid: match.price?.paid
        };
      } else {
        status = 404;
        responseData = { error: 'Заказ не найден. Проверьте номер заказа (напр. ЮУ-1048) или телефон.' };
      }
    } else {
      status = 404;
      responseData = { error: 'Not found' };
    }

    // Return fake Response object
    if (typeof Response !== 'undefined') {
      try {
        return new Response(JSON.stringify(responseData), {
          status,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        // Fallback if Response constructor fails in environment
      }
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData)
    };
  }

  window.PMG_STORAGE = {
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
})();
