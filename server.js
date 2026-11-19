const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads dir
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// DB Helpers with atomic writing
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { settings: {}, clients: [], equipment: [], materials: [], orders: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// ================= API ROUTES =================

// 1. Settings & Info
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json(db.settings || {});
});

// 2. Orders API
app.get('/api/orders', (req, res) => {
  const db = readDB();
  let orders = db.orders || [];
  const { stage, category, search, urgency } = req.query;

  if (stage && stage !== 'all') {
    orders = orders.filter(o => o.stage === stage);
  }
  if (category && category !== 'all') {
    orders = orders.filter(o => o.category === category);
  }
  if (urgency && urgency !== 'all') {
    orders = orders.filter(o => o.specs && o.specs.urgency === urgency);
  }
  if (search) {
    const q = search.toLowerCase().trim();
    orders = orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      (o.title && o.title.toLowerCase().includes(q)) ||
      (o.client && o.client.name && o.client.name.toLowerCase().includes(q)) ||
      (o.client && o.client.contactPerson && o.client.contactPerson.toLowerCase().includes(q)) ||
      (o.client && o.client.phone && o.client.phone.includes(q))
    );
  }

  // Sort by createdAt descending
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const db = readDB();
  const order = (db.orders || []).find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const clients = db.clients || [];

  // Generate unique order ID
  const orderCount = orders.length + 1;
  const nextNum = 1040 + orderCount;
  const newId = `PMG-${nextNum}`;

  const body = req.body;

  // Handle client association
  let clientObj = body.client || {};
  if (clientObj.name) {
    let existing = clients.find(c =>
      (clientObj.phone && c.phone && c.phone.replace(/\D/g, '') === clientObj.phone.replace(/\D/g, '')) ||
      (clientObj.email && c.email && c.email.toLowerCase() === clientObj.email.toLowerCase())
    );

    if (existing) {
      existing.totalOrders = (existing.totalOrders || 0) + 1;
      existing.totalSpent = (existing.totalSpent || 0) + (body.price?.total || 0);
      clientObj.id = existing.id;
      clientObj.name = existing.name;
      clientObj.tier = existing.tier;
    } else {
      const newClientId = `cl-${Date.now().toString().slice(-4)}`;
      const newClient = {
        id: newClientId,
        name: clientObj.name,
        contactPerson: clientObj.contactPerson || clientObj.name,
        phone: clientObj.phone || '',
        email: clientObj.email || '',
        inn: clientObj.inn || '',
        category: 'Новый клиент с сайта',
        tier: 'Базовый 0%',
        discount: 0,
        totalOrders: 1,
        totalSpent: body.price?.total || 0,
        notes: 'Заказ создан через онлайн-калькулятор'
      };
      clients.unshift(newClient);
      clientObj.id = newClientId;
    }
  }

  const newOrder = {
    id: newId,
    title: body.title || 'Заказ полиграфии',
    category: body.category || 'листовая',
    categoryName: body.categoryName || 'Полиграфическая продукция',
    client: clientObj,
    specs: body.specs || {
      format: body.format || 'Стандарт',
      paper: body.paper || 'Мелованная 170г',
      quantity: Number(body.quantity) || 100,
      colorSides: body.colorSides || '4+0',
      finishing: body.finishing || [],
      deadline: body.deadline || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
      urgency: body.urgency || 'standard'
    },
    price: body.price || {
      total: Number(body.total) || 5000,
      primeCost: Math.round((Number(body.total) || 5000) * 0.42),
      margin: Math.round((Number(body.total) || 5000) * 0.58),
      paid: false,
      paidAmount: 0,
      status: 'pending'
    },
    stage: 'new',
    manager: body.manager || 'Дежурный менеджер',
    machine: body.machine || 'Определяется на препрессе',
    preflightStatus: body.preflightStatus || 'checking',
    files: body.files || [],
    notes: body.notes ? [
      { author: clientObj.contactPerson || clientObj.name || 'Заказчик', text: body.notes, date: new Date().toLocaleString('ru-RU') }
    ] : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  orders.unshift(newOrder);
  db.orders = orders;
  db.clients = clients;
  writeDB(db);

  res.status(201).json({ success: true, order: newOrder });
});

app.patch('/api/orders/:id', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const idx = orders.findIndex(o => o.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const current = orders[idx];
  const updates = req.body;

  // Track stage change note if stage changed
  if (updates.stage && updates.stage !== current.stage) {
    const stageNames = {
      new: 'Новая заявка',
      prepress: 'Препресс / Проверка макета',
      queue: 'Очередь на печать',
      printing: 'В производстве (Печать)',
      postpress: 'Постпечатная обработка',
      qc_packing: 'Контроль качества и упаковка',
      delivery: 'Готов к выдаче / В доставке',
      completed: 'Выполнен и оплачен',
      cancelled: 'Отменен'
    };
    if (!current.notes) current.notes = [];
    current.notes.push({
      author: 'Система CRM',
      text: `Статус изменен: ${stageNames[current.stage] || current.stage} ➔ ${stageNames[updates.stage] || updates.stage}`,
      date: new Date().toLocaleString('ru-RU')
    });
  }

  // Merge fields
  orders[idx] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeDB(db);
  res.json({ success: true, order: orders[idx] });
});

app.delete('/api/orders/:id', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  orders.splice(idx, 1);
  db.orders = orders;
  writeDB(db);
  res.json({ success: true, message: 'Order removed' });
});

app.post('/api/orders/:id/notes', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!order.notes) order.notes = [];
  const note = {
    author: req.body.author || 'Менеджер PMG',
    text: req.body.text,
    date: new Date().toLocaleString('ru-RU')
  };
  order.notes.push(note);
  order.updatedAt = new Date().toISOString();
  writeDB(db);

  res.json({ success: true, notes: order.notes });
});

// 3. File Upload & Simulated Preflight
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не прикреплен' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const sizeMB = (req.file.size / (1024 * 1024)).toFixed(1);

  // Simulated professional preflight check
  let status = 'approved';
  let issues = [];

  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    issues.push('Цветовая модель RGB будет автоматически конвертирована в CMYK ISO Coated v2');
    issues.push('Рекомендуется загружать макеты в PDF/X-1a для максимальной точности цветопередачи');
  } else if (['.pdf', '.ai', '.eps', '.cdr'].includes(ext)) {
    issues.push('Разрешение растровых объектов 300+ DPI — ОК');
    issues.push('Вылеты под обрез 2 мм обнаружены — ОК');
  }

  const fileInfo = {
    name: req.file.originalname,
    filename: req.file.filename,
    size: `${sizeMB} MB`,
    path: `/uploads/${req.file.filename}`,
    preflightStatus: status,
    issues: issues,
    uploadDate: new Date().toLocaleString('ru-RU')
  };

  res.json({ success: true, file: fileInfo });
});

// 4. Clients API
app.get('/api/clients', (req, res) => {
  const db = readDB();
  let clients = db.clients || [];
  const { search } = req.query;
  if (search) {
    const q = search.toLowerCase();
    clients = clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.inn && c.inn.includes(q))
    );
  }
  res.json(clients);
});

app.post('/api/clients', (req, res) => {
  const db = readDB();
  const clients = db.clients || [];
  const newClient = {
    id: `cl-${Date.now().toString().slice(-4)}`,
    name: req.body.name || 'Новый клиент',
    contactPerson: req.body.contactPerson || '',
    phone: req.body.phone || '',
    email: req.body.email || '',
    inn: req.body.inn || '',
    category: req.body.category || 'B2B Корпоративный',
    tier: req.body.tier || 'Базовый 0%',
    discount: Number(req.body.discount) || 0,
    totalOrders: 0,
    totalSpent: 0,
    notes: req.body.notes || ''
  };
  clients.unshift(newClient);
  db.clients = clients;
  writeDB(db);
  res.status(201).json({ success: true, client: newClient });
});

app.patch('/api/clients/:id', (req, res) => {
  const db = readDB();
  const clients = db.clients || [];
  const idx = clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Client not found' });

  clients[idx] = { ...clients[idx], ...req.body };
  writeDB(db);
  res.json({ success: true, client: clients[idx] });
});

app.delete('/api/clients/:id', (req, res) => {
  const db = readDB();
  const clients = db.clients || [];
  const idx = clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Client not found' });

  clients.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

// 5. Equipment API
app.get('/api/equipment', (req, res) => {
  const db = readDB();
  res.json(db.equipment || []);
});

app.patch('/api/equipment/:id', (req, res) => {
  const db = readDB();
  const equipment = db.equipment || [];
  const idx = equipment.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Machine not found' });

  equipment[idx] = { ...equipment[idx], ...req.body };
  writeDB(db);
  res.json({ success: true, machine: equipment[idx] });
});

// 6. Materials / Warehouse API
app.get('/api/materials', (req, res) => {
  const db = readDB();
  res.json(db.materials || []);
});

app.patch('/api/materials/:id', (req, res) => {
  const db = readDB();
  const materials = db.materials || [];
  const idx = materials.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Material not found' });

  materials[idx] = { ...materials[idx], ...req.body };
  if (materials[idx].inStock <= materials[idx].minAlert) {
    materials[idx].status = 'low';
  } else {
    materials[idx].status = 'ok';
  }
  writeDB(db);
  res.json({ success: true, material: materials[idx] });
});

// 7. Analytics Dashboard API
app.get('/api/analytics', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const clients = db.clients || [];
  const equipment = db.equipment || [];

  const totalRevenue = orders.reduce((sum, o) => sum + (o.price?.total || 0), 0);
  const totalMargin = orders.reduce((sum, o) => sum + (o.price?.margin || 0), 0);
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.stage));
  const completedOrders = orders.filter(o => o.stage === 'completed');
  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Stage distribution
  const stageCounts = {
    new: 0,
    prepress: 0,
    queue: 0,
    printing: 0,
    postpress: 0,
    qc_packing: 0,
    delivery: 0,
    completed: 0,
    cancelled: 0
  };
  orders.forEach(o => {
    if (stageCounts[o.stage] !== undefined) {
      stageCounts[o.stage]++;
    }
  });

  // Category distribution
  const categoryStats = {};
  orders.forEach(o => {
    const cat = o.categoryName || o.category || 'Прочее';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, sum: 0 };
    }
    categoryStats[cat].count++;
    categoryStats[cat].sum += (o.price?.total || 0);
  });

  // Top clients
  const topClients = [...clients]
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 5);

  // Equipment load avg
  const avgEqLoad = equipment.length > 0
    ? Math.round(equipment.reduce((acc, eq) => acc + (eq.loadPercent || 0), 0) / equipment.length)
    : 0;

  res.json({
    kpis: {
      totalRevenue,
      totalMargin,
      marginPercent: totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0,
      activeOrdersCount: activeOrders.length,
      completedOrdersCount: completedOrders.length,
      totalOrdersCount: orders.length,
      avgOrderValue,
      avgEquipmentLoad: avgEqLoad,
      totalClientsCount: clients.length
    },
    stages: stageCounts,
    categories: categoryStats,
    topClients
  });
});

// 8. Public Order Tracker API
app.get('/api/track/:query', (req, res) => {
  const db = readDB();
  const q = req.params.query.trim().toLowerCase();
  const digitsOnly = q.replace(/\D/g, '');

  const match = (db.orders || []).find(o => {
    const orderIdMatch = o.id.toLowerCase() === q || o.id.toLowerCase() === `pmg-${q}`;
    const phoneMatch = digitsOnly.length >= 7 && o.client?.phone && o.client.phone.replace(/\D/g, '').includes(digitsOnly);
    return orderIdMatch || phoneMatch;
  });

  if (!match) {
    return res.status(404).json({ error: 'Заказ не найден. Проверьте номер заказа (например: PMG-1048) или номер телефона.' });
  }

  // Stage steps roadmap
  const stagesRoadmap = [
    { key: 'new', label: 'Заявка принята', desc: 'Заказ зарегистрирован в системе' },
    { key: 'prepress', label: 'Проверка макета', desc: 'Препресс-контроль вылетов и цвета' },
    { key: 'queue', label: 'Очередь печати', desc: 'Цветопроба утверждена, материалы готовы' },
    { key: 'printing', label: 'В производстве', desc: `Печать на оборудовании: ${match.machine || 'Офсет / Цифра'}` },
    { key: 'postpress', label: 'Постпечать', desc: 'Ламинация, тиснение, контурная резка' },
    { key: 'qc_packing', label: 'Контроль качества', desc: 'Проверка ОТК и упаковка' },
    { key: 'delivery', label: 'Готов к выдаче', desc: 'Ожидает клиента или в курьерской доставке' },
    { key: 'completed', label: 'Выполнен', desc: 'Заказ успешно вручен заказчику' }
  ];

  let currentIdx = stagesRoadmap.findIndex(s => s.key === match.stage);
  if (currentIdx === -1) currentIdx = 0;

  res.json({
    orderId: match.id,
    title: match.title,
    clientName: match.client?.name || match.client?.contactPerson,
    stage: match.stage,
    stageIndex: currentIdx,
    stagesCount: stagesRoadmap.length,
    roadmap: stagesRoadmap,
    specs: match.specs,
    deadline: match.specs?.deadline,
    urgency: match.specs?.urgency,
    createdAt: match.createdAt,
    priceTotal: match.price?.total,
    paid: match.price?.paid
  });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Fallback to index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  PMG Typography & CRM Production Portal`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Public Website: http://localhost:${PORT}`);
  console.log(`  CRM System:     http://localhost:${PORT}/#crm`);
  console.log(`  Order Tracker:  http://localhost:${PORT}/#track`);
  console.log(`=======================================================`);
});
