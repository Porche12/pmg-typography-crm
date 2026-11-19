// Automated Verification Test Suite for PMG Typography & CRM Portal
const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, raw: body });
        } catch {
          resolve({ status: res.statusCode, data: body, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PMG TYPOGRAPHY & CRM TEST SUITE ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Check Homepage
    const home = await request({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
    assert(home.status === 200, 'GET / returns 200 OK');
    assert(home.raw.includes('ТИПОГРАФИЯ PMG'), 'Homepage contains brand title "ТИПОГРАФИЯ PMG"');
    assert(home.raw.includes('calcOrderForm'), 'Homepage contains interactive order calculator form');
    assert(home.raw.includes('crmTabContent'), 'Homepage contains CRM container');

    // 2. Settings API
    const settings = await request({ hostname: 'localhost', port: 3000, path: '/api/settings', method: 'GET' });
    assert(settings.status === 200 && settings.data.companyName === 'Типография PMG', 'GET /api/settings returns company info');

    // 3. Orders API
    const orders = await request({ hostname: 'localhost', port: 3000, path: '/api/orders', method: 'GET' });
    assert(orders.status === 200 && Array.isArray(orders.data) && orders.data.length >= 10, `GET /api/orders returns ${orders.data.length} orders`);

    // 4. Clients API
    const clients = await request({ hostname: 'localhost', port: 3000, path: '/api/clients', method: 'GET' });
    assert(clients.status === 200 && Array.isArray(clients.data) && clients.data.length >= 5, `GET /api/clients returns ${clients.data.length} clients`);

    // 5. Equipment API
    const eq = await request({ hostname: 'localhost', port: 3000, path: '/api/equipment', method: 'GET' });
    assert(eq.status === 200 && eq.data.some(m => m.name.includes('Heidelberg')), 'GET /api/equipment returns Heidelberg Speedmaster');

    // 6. Materials API
    const mat = await request({ hostname: 'localhost', port: 3000, path: '/api/materials', method: 'GET' });
    assert(mat.status === 200 && mat.data.length >= 7, `GET /api/materials returns ${mat.data.length} warehouse materials`);

    // 7. Analytics API
    const anal = await request({ hostname: 'localhost', port: 3000, path: '/api/analytics', method: 'GET' });
    assert(anal.status === 200 && anal.data.kpis && anal.data.kpis.totalRevenue > 0, `GET /api/analytics returns total revenue: ${anal.data.kpis.totalRevenue} ₽`);
    assert(anal.data.stages && anal.data.stages.printing > 0, 'Analytics has orders in "printing" stage');

    // 8. Tracking API
    const track = await request({ hostname: 'localhost', port: 3000, path: '/api/track/PMG-1048', method: 'GET' });
    assert(track.status === 200 && track.data.orderId === 'PMG-1048', 'GET /api/track/PMG-1048 returns order roadmap');
    assert(track.data.roadmap && track.data.roadmap.length === 8, 'Tracking has 8 production roadmap stages');

    // 9. Create New Order via Calculator API
    const newOrderPayload = {
      title: 'Визитки Touche Cover с золотым тиснением (Автотест)',
      category: 'визитки',
      categoryName: 'Визитки',
      client: {
        name: 'ООО «Автотест Холдинг»',
        contactPerson: 'Алексей Тестов',
        phone: '+7 (999) 777-66-55',
        email: 'test@autotest.ru'
      },
      specs: {
        format: '90х50 мм',
        paper: 'Touche Cover Черный 301г',
        quantity: 500,
        colorSides: '4+0',
        finishing: ['Тиснение фольгой Kurz', 'Скругление 4-х углов'],
        urgency: 'urgent'
      },
      price: {
        total: 16500,
        perUnit: '33.0',
        primeCost: 6500,
        margin: 10000,
        paid: false
      }
    };

    const createRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, newOrderPayload);

    assert(createRes.status === 201 && createRes.data.order && createRes.data.order.id.startsWith('PMG-'), `POST /api/orders created order with ID: ${createRes.data?.order?.id}`);
    const createdOrderId = createRes.data.order.id;

    // 10. Update Stage in Kanban (PATCH)
    const patchRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/orders/${createdOrderId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, { stage: 'printing', machine: 'HP Indigo 7900 Digital Press' });

    assert(patchRes.status === 200 && patchRes.data.order.stage === 'printing', `PATCH /api/orders/${createdOrderId} moved order to stage "printing"`);

    // 11. Verify tracking reflects the new stage
    const trackNew = await request({ hostname: 'localhost', port: 3000, path: `/api/track/${createdOrderId}`, method: 'GET' });
    assert(trackNew.status === 200 && trackNew.data.stage === 'printing', `Tracker verified: ${createdOrderId} is in stage "printing"`);

    // 12. Add Note to Order
    const noteRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/orders/${createdOrderId}/notes`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { author: 'Мастер цеха', text: 'Печать выполнена на HP Indigo, тираж передан на тиснение.' });

    assert(noteRes.status === 200 && noteRes.data.notes.some(n => n.text.includes('HP Indigo')), 'POST /api/orders/:id/notes added note to timeline');

    // 13. Warehouse stock replenishment
    const matPatch = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/materials/mat-1',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, { inStock: 50000 });
    assert(matPatch.status === 200 && matPatch.data.material.inStock === 50000, 'PATCH /api/materials/mat-1 updated warehouse inventory');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log(`\n--- TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
