import urllib.request
import re
from bs4 import BeautifulSoup
import os

print("Fetching latest PMG.ru homepage...")
req = urllib.request.Request('https://pmg.ru', headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
raw_html = urllib.request.urlopen(req, timeout=20).read().decode('utf-8', errors='ignore')
print(f"Downloaded PMG HTML: {len(raw_html)} bytes")

soup = BeautifulSoup(raw_html, 'html.parser')

# 1. Update relative image, stylesheet and asset links to point to https://pmg.ru
for tag in soup.find_all(['img', 'source', 'a']):
    for attr in ['src', 'srcset', 'href']:
        val = tag.get(attr)
        if val:
            if val.startswith('/uploads/') or val.startswith('/assets/cache_image/') or val.startswith('/local/img/'):
                tag[attr] = 'https://pmg.ru' + val
            elif val.startswith('./local/img/'):
                tag[attr] = 'https://pmg.ru' + val[1:]

# 2. Clean head: remove old links and third-party scripts that cause 404s/CORS
head = soup.find('head')
if head:
    for el in head.find_all(['link', 'script']):
        if el.name == 'link' and el.get('rel') == ['stylesheet']:
            el.decompose()
        elif el.name == 'script' and not el.get('type') == 'application/ld+json':
            el.decompose()

    new_head_content = '''
    <link rel="icon" type="image/svg+xml" href="https://pmg.ru/favicon.svg" />
    <link rel="stylesheet" href="css/pmg_bootstrap.css">
    <link rel="stylesheet" href="css/pmg_app.css">
    <link rel="stylesheet" href="css/pmg_custom.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        corePlugins: {
          preflight: false, // Do not break PMG fonts & layout
        }
      }
    </script>
    <style>
      .crm-modal-fullscreen {
        position: fixed;
        inset: 0;
        z-index: 9999999;
        background: #f1f5f9;
        overflow-y: auto;
        display: none !important;
      }
      .crm-modal-fullscreen.active {
        display: block !important;
      }
      .crm-header-bar {
        background: #0f172a;
        color: #fff;
        padding: 14px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 3px solid #e11d48;
      }
      .calc-pill-pmg {
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        font-weight: 700;
        font-size: 13px;
        color: #334155;
        cursor: pointer;
        transition: all 0.2s;
      }
      .calc-pill-pmg.active, .calc-pill-pmg:hover {
        background: #e35205;
        border-color: #e35205;
        color: #ffffff;
      }
      .header__logo-img {
        height: 52px !important;
        width: auto !important;
      }
      .pmg-crm-btn {
        background: #15803d !important;
        color: #ffffff !important;
        font-weight: 800 !important;
        padding: 8px 16px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(21, 128, 61, 0.3) !important;
        text-decoration: none !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        transition: all 0.2s !important;
        border: none !important;
        cursor: pointer !important;
      }
      .pmg-crm-btn:hover {
        background: #166534 !important;
        color: #ffffff !important;
        transform: translateY(-1px) !important;
      }
    </style>
    '''
    head.append(BeautifulSoup(new_head_content, 'html.parser'))

# 3. Enhance Header with Navigation to Calculator, Tracking, and CRM
header_center = soup.find('div', class_='header__center-wrapper')
if header_center:
    nav_links = '''
    <div class="d-none d-lg-flex align-items-center gap-2 ms-auto me-3">
      <a href="#calculator-online" class="button button--secondary button--small text-nowrap" style="background:#e35205; border-color:#e35205;">
        🖩 Калькулятор заказа
      </a>
      <a href="#tracking-order" class="button button--small text-nowrap" style="background:#1e293b; color:#fff; border:1px solid #475569;">
        🔍 Отследить заказ
      </a>
      <button type="button" onclick="window.PMG_CRM_APP?.openCRM()" class="pmg-crm-btn text-nowrap">
        <span>📊 CRM Производства</span>
        <span class="badge bg-danger rounded-pill" id="headerCrmBadge">14</span>
      </button>
    </div>
    '''
    header_center.append(BeautifulSoup(nav_links, 'html.parser'))

# 4. Enhance Sidebar in First Screen
sidebar = soup.find('div', class_='sidebar--fs')
if sidebar:
    sidebar_tiles = '''
    <div class="tile tile--white mb-2" style="border: 2px solid #16a34a; background: #f0fdf4;">
      <a class="link link--button" href="javascript:void(0)" onclick="window.PMG_CRM_APP?.openCRM()" style="color: #16a34a; font-weight: 800; display:flex; align-items:center; gap:8px;">
        <span style="font-size:20px;">📊</span>
        <div>
          <div>CRM Панель типографии</div>
          <div class="text--gray text--small" style="font-size:11px; color:#15803d;">Воронка заказов и загрузка цеха 24/7</div>
        </div>
      </a>
    </div>
    <div class="tile tile--white mb-2" style="border: 1px solid #cbd5e1;">
      <a class="link link--button" href="#calculator-online" style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:20px;">🖩</span>
        <div>
          <div style="font-weight:700; color:#0f172a;">Онлайн-калькулятор</div>
          <div class="text--gray text--small" style="font-size:11px;">Мгновенный расчет стоимости</div>
        </div>
      </a>
    </div>
    <div class="tile tile--white mb-2" style="border: 1px solid #cbd5e1;">
      <a class="link link--button" href="#tracking-order" style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:20px;">🔍</span>
        <div>
          <div style="font-weight:700; color:#0f172a;">Где мой заказ?</div>
          <div class="text--gray text--small" style="font-size:11px;">Отслеживание готовности онлайн</div>
        </div>
      </a>
    </div>
    '''
    sidebar.insert(0, BeautifulSoup(sidebar_tiles, 'html.parser'))

# 5. Insert Online Printing Calculator and Tracking section
first_screen = soup.find('section', class_=lambda c: c and 'first-screen' in c)
if first_screen:
    calc_html = '''
    <!-- ================= PMG INTERACTIVE PRINTING CALCULATOR ================= -->
    <section class="section" id="calculator-online" style="background:#f8fafc; padding: 60px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <div class="container">
        <div class="text-center mb-5">
          <span style="color:#e35205; font-weight:800; text-transform:uppercase; font-size:12px; letter-spacing:1.5px; background:#ffedd5; padding:4px 12px; border-radius:20px;">
            Онлайн-сервис типографии PMG
          </span>
          <h2 style="font-size: 34px; font-weight: 900; color: #0f172a; margin-top: 12px; letter-spacing:-0.5px;">
            Калькулятор стоимости полиграфии
          </h2>
          <p class="text-muted" style="font-size: 15px; max-width: 650px; margin: 0 auto;">
            Мгновенный расчет стоимости визиток, буклетов, наклеек, упаковки и каталогов с проверкой макета и автоматической регистрацией в CRM-системе.
          </p>
        </div>

        <!-- Product Category Selectors -->
        <div class="d-flex flex-wrap justify-content-center gap-2 mb-4">
          <button type="button" class="calc-tab-btn calc-pill-pmg active" data-product="vizitki">📇 Визитки</button>
          <button type="button" class="calc-tab-btn calc-pill-pmg" data-product="listovki">📄 Листовки и флаеры</button>
          <button type="button" class="calc-tab-btn calc-pill-pmg" data-product="buklety">📖 Буклеты</button>
          <button type="button" class="calc-tab-btn calc-pill-pmg" data-product="stikery">🏷️ Наклейки и стикеры</button>
          <button type="button" class="calc-tab-btn calc-pill-pmg" data-product="katalogi">📚 Каталоги и брошюры</button>
          <button type="button" class="calc-tab-btn calc-pill-pmg" data-product="upakovka">📦 Коробки и упаковка</button>
          <button type="button" class="calc-tab-btn calc-pill-pmg" data-product="pakety">🛍️ Бумажные пакеты</button>
          <button type="button" class="calc-tab-btn calc-pill-pmg" data-product="kalendari">📅 Календари 2026/27</button>
        </div>

        <div class="row g-4 align-items-start">
          <!-- Left: Options -->
          <div class="col-12 col-lg-7">
            <div class="tile tile--white p-4 shadow-sm" style="border: 1px solid #cbd5e1; border-radius: 14px;">
              <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">Параметры печати и отделки</h3>
                <span class="badge bg-light text-muted border">Автоматический расчет</span>
              </div>
              <div id="calcDynamicOptions"></div>
            </div>
          </div>

          <!-- Right: Summary & Order Form -->
          <div class="col-12 col-lg-5">
            <!-- Cost Box -->
            <div style="background: #0f172a; color: white; padding: 24px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);">
              <div class="d-flex justify-content-between align-items-center border-bottom border-slate-700 pb-3">
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing:0.5px;">Итоговая стоимость</div>
                  <div style="font-size: 34px; font-weight: 900; color: #ffffff; letter-spacing:-1px;" id="calcTotalSum">0 ₽</div>
                </div>
                <div class="text-end">
                  <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700;">За 1 шт.</div>
                  <div style="font-size: 18px; font-weight: 800; color: #fb7185;" id="calcPerUnit">0 ₽/шт.</div>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-3 pt-2" style="font-size: 13px;">
                <span style="color:#94a3b8;">Срок готовности:</span>
                <span class="badge bg-amber-400 text-dark fw-bold px-2 py-1" id="calcLeadTime">1-2 рабочих дня</span>
              </div>
              <div id="calcSpecSummary" class="mt-3 pt-3 border-top border-slate-800 text-slate-300" style="font-size: 12px;"></div>
            </div>

            <!-- Upload & Form -->
            <div class="tile tile--white p-4 shadow-sm" style="border: 1px solid #cbd5e1; border-radius: 14px;">
              <h4 style="font-size: 14px; font-weight: 800; color:#0f172a; margin-bottom: 12px;">📎 Прикрепить макет к тиражу</h4>
              
              <div id="calcDropzone" style="border: 2px dashed #94a3b8; padding: 20px; border-radius: 10px; text-align: center; cursor: pointer; background: #f8fafc; transition: all 0.2s;">
                <div style="font-size: 26px;">📤</div>
                <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-top:4px;">Перетащите файл макета сюда</div>
                <div style="font-size: 11px; color: #64748b;">PDF, AI, PSD, CDR, TIFF (автопроверка CMYK / 300 DPI)</div>
                <input type="file" id="calcFileInput" class="d-none" accept=".pdf,.ai,.cdr,.psd,.tiff,.tif,.png,.jpg,.jpeg">
              </div>
              <div id="calcFileList" class="mt-2"></div>

              <form id="calcOrderForm" class="mt-4">
                <div class="row g-2 mb-2">
                  <div class="col-12 col-sm-6">
                    <label class="form-label text-muted fw-bold text-uppercase" style="font-size: 11px;">Ваше имя *</label>
                    <input type="text" id="clientName" class="form-control form-control-sm" placeholder="Иван Иванов" required>
                  </div>
                  <div class="col-12 col-sm-6">
                    <label class="form-label text-muted fw-bold text-uppercase" style="font-size: 11px;">Телефон *</label>
                    <input type="tel" id="clientPhone" class="form-control form-control-sm fw-bold" placeholder="+7 (999) 000-00-00" required>
                  </div>
                </div>

                <div class="row g-2 mb-2">
                  <div class="col-12 col-sm-6">
                    <label class="form-label text-muted fw-bold text-uppercase" style="font-size: 11px;">Email</label>
                    <input type="email" id="clientEmail" class="form-control form-control-sm" placeholder="zakaz@company.ru">
                  </div>
                  <div class="col-12 col-sm-6">
                    <label class="form-label text-muted fw-bold text-uppercase" style="font-size: 11px;">Компания / ИНН</label>
                    <input type="text" id="clientCompany" class="form-control form-control-sm" placeholder="ООО или ИП (для счета)">
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label text-muted fw-bold text-uppercase" style="font-size: 11px;">Комментарий к заказу</label>
                  <input type="text" id="clientComment" class="form-control form-control-sm" placeholder="Пожелания по фольге Kurz, доставке курьером...">
                </div>

                <button type="submit" id="calcSubmitBtn" class="button button--secondary button--full-width" style="background:#e35205; border-color:#e35205; font-weight:800; font-size:15px; padding:12px; border-radius:10px;">
                  Оформить заказ в типографию ➔
                </button>
                <div class="text-center text-muted mt-2" style="font-size: 11px;">
                  Заказ моментально регистрируется в CRM-системе цеха с присвоением трек-номера.
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= ORDER TRACKING WIDGET ================= -->
    <section class="section" id="tracking-order" style="background:#ffffff; padding: 60px 0; border-bottom: 1px solid #e2e8f0;">
      <div class="container">
        <div class="text-center mb-4">
          <span style="color:#e35205; font-weight:800; text-transform:uppercase; font-size:12px; letter-spacing:1.5px; background:#ffedd5; padding:4px 12px; border-radius:20px;">
            Прозрачное производство
          </span>
          <h2 style="font-size: 32px; font-weight: 900; color: #0f172a; margin-top:12px;">Где находится мой тираж?</h2>
          <p class="text-muted" style="font-size: 14px;">Введите номер заказа (например: <strong>PMG-1048</strong>) или контактный телефон:</p>
        </div>

        <div style="max-width: 580px; margin: 0 auto;">
          <div class="input-group input-group-lg shadow-sm" style="border-radius:12px; overflow:hidden;">
            <span class="input-group-text bg-white border-end-0">🔍</span>
            <input type="text" id="trackQueryInput" class="form-control border-start-0 font-monospace" placeholder="Номер заказа (PMG-1048) или телефон...">
            <button type="button" id="trackSubmitBtn" class="btn btn-dark fw-bold px-4" style="background:#0f172a;">Найти тираж</button>
          </div>
          <div id="trackStatusMsg" class="d-none text-center mt-2 font-monospace"></div>
        </div>

        <div id="trackResultBox" class="mt-4 d-none" style="max-width: 860px; margin: 0 auto;"></div>
      </div>
    </section>
    '''
    first_screen.insert_after(BeautifulSoup(calc_html, 'html.parser'))

# 6. Append CRM System Fullscreen Overlay
crm_modal_html = '''
<!-- ================= TYPOGRAPHY CRM FULLSCREEN MODAL ================= -->
<div id="pmgCrmAppModal" class="crm-modal-fullscreen" style="display:none !important;">
  <!-- CRM Top Bar -->
  <div class="crm-header-bar">
    <div class="d-flex align-items-center gap-3">
      <span class="badge bg-danger p-2 fs-6 fw-bold">PMG CRM</span>
      <div>
        <h4 class="mb-0 text-white font-monospace fw-bold" style="font-size:16px;">ТИПОГРАФИЯ PMG • ЦЕХОВОЙ КОМПЛЕКС И ВОРОНКА ЗАКАЗОВ</h4>
        <div class="text-slate-400" style="font-size:11px;">Круглосуточный мониторинг производства 24/7 | Ленинградский проспект 80 к30</div>
      </div>
    </div>

    <!-- Quick stats -->
    <div class="d-flex align-items-center gap-4 text-white font-monospace" style="font-size:13px;">
      <div>Активных: <strong class="text-warning" id="crmKpiActive">0</strong></div>
      <div>Выручка: <strong class="text-success" id="crmKpiRevenue">0 ₽</strong></div>
      <div>Срочные: <strong class="text-danger" id="crmKpiUrgent">0</strong></div>
      <div>Мало бумаги: <strong class="text-warning" id="crmKpiLowMat">0</strong></div>
      <button type="button" onclick="window.PMG_CRM_APP?.closeCRM()" class="btn btn-outline-light btn-sm fw-bold px-3">
        ✕ Закрыть CRM и вернуться на сайт
      </button>
    </div>
  </div>

  <!-- CRM Navigation Subbar -->
  <div class="bg-slate-900 px-4 py-2 border-bottom border-slate-700 d-flex align-items-center gap-2 overflow-x-auto">
    <button type="button" class="btn btn-sm btn-danger fw-bold crm-nav-tab text-nowrap" data-tab="kanban">📋 Воронка заказов (Канбан)</button>
    <button type="button" class="btn btn-sm btn-outline-light fw-bold crm-nav-tab text-nowrap" data-tab="clients">👥 База контрагентов</button>
    <button type="button" class="btn btn-sm btn-outline-light fw-bold crm-nav-tab text-nowrap" data-tab="equipment">🏭 Загрузка оборудования цеха</button>
    <button type="button" class="btn btn-sm btn-outline-light fw-bold crm-nav-tab text-nowrap" data-tab="materials">📦 Склад бумаги и материалов</button>
    <button type="button" class="btn btn-sm btn-outline-light fw-bold crm-nav-tab text-nowrap" data-tab="analytics">📈 Сводная аналитика</button>
  </div>

  <!-- Dynamic Content Container -->
  <div class="p-3" id="crmTabContent"></div>
</div>

<!-- ================= MODALS REQUIRED BY CRM & CALCULATOR ================= -->

<!-- 1. Order Success Modal -->
<div id="orderSuccessModal" class="modal fade show" tabindex="-1" style="display:none; background:rgba(0,0,0,0.65); z-index:99999999;">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content" style="border-radius:14px; border:none; box-shadow:0 16px 48px rgba(0,0,0,0.25);">
      <div class="modal-body p-4 text-center">
        <div style="width:60px; height:60px; border-radius:50%; background:#dcfce7; color:#15803d; font-size:32px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
          ✓
        </div>
        <h3 class="fw-bold mb-2" style="color:#0f172a; font-size:20px;">Заказ успешно зарегистрирован!</h3>
        <p class="text-muted" style="font-size:13px;">Номер присвоен и передан в диспетчерскую CRM типографии PMG.</p>

        <div class="p-3 my-3 text-start font-monospace" style="background:#f8fafc; border-radius:10px; font-size:12px; border:1px solid #e2e8f0;">
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted">Номер заказа:</span>
            <strong class="text-danger fs-6" id="successOrderId">PMG-1048</strong>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted">Продукция:</span>
            <strong class="text-dark" id="successOrderTitle">Визитки</strong>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted">Сумма заказа:</span>
            <strong class="text-dark" id="successOrderSum">0 ₽</strong>
          </div>
          <div class="d-flex justify-content-between">
            <span class="text-muted">Телефон:</span>
            <span class="text-dark" id="successOrderPhone">+7 (999) 000-00-00</span>
          </div>
        </div>

        <div class="d-grid gap-2 mt-4">
          <button type="button" id="successTrackBtn" class="btn btn-dark fw-bold py-2" style="background:#0f172a; border-radius:8px;">
            🔍 Отслеживать прогресс онлайн
          </button>
          <button type="button" id="successCrmBtn" class="btn btn-success fw-bold py-2" onclick="window.PMG_CRM_APP?.openCRM()" style="background:#15803d; border-radius:8px;">
            📊 Открыть заказ в панели CRM
          </button>
          <button type="button" class="btn btn-link text-muted" onclick="document.getElementById('orderSuccessModal').style.display='none'">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 2. Detailed Order Management Modal in CRM -->
<div id="crmOrderDetailModal" class="modal fade show" tabindex="-1" style="display:none; background:rgba(0,0,0,0.7); z-index:999999999; overflow-y:auto;">
  <div class="modal-dialog modal-xl modal-dialog-centered">
    <div class="modal-content" style="border-radius:14px; border:none; box-shadow:0 20px 60px rgba(0,0,0,0.35);">
      
      <!-- Modal Header -->
      <div class="modal-header bg-dark text-white p-3">
        <div>
          <span class="text-white-50 font-monospace text-uppercase" style="font-size:11px;">Технологический наряд заказа</span>
          <h4 class="modal-title font-monospace fw-bold mb-0" id="crmModalOrderId">PMG-1048</h4>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="button" id="crmModalPrintBtn" class="btn btn-sm btn-light fw-bold">
            🖨️ Печать техкарты
          </button>
          <button type="button" class="btn-close btn-close-white" id="crmModalCloseBtn" onclick="document.getElementById('crmOrderDetailModal').style.display='none'"></button>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="modal-body p-4">
        <div class="row g-4">
          <!-- Left: Details & Stage -->
          <div class="col-12 col-lg-7">
            <div class="mb-3">
              <label class="form-label text-muted text-uppercase fw-bold" style="font-size:11px;">Наименование заказа</label>
              <input type="text" id="crmModalOrderTitle" class="form-control fw-bold">
            </div>

            <div class="row g-3 mb-3">
              <div class="col-12 col-sm-6">
                <label class="form-label text-muted text-uppercase fw-bold" style="font-size:11px;">Этап производства</label>
                <select id="crmModalStageSelect" class="form-select fw-bold">
                  <option value="new">📥 Новая заявка</option>
                  <option value="prepress">🔍 Препресс / Макеты</option>
                  <option value="queue">⏳ Очередь на печать</option>
                  <option value="printing">🖨️ В производстве (Печать)</option>
                  <option value="postpress">✂️ Постпечать и отделка</option>
                  <option value="qc_packing">📦 Контроль ОТК и упаковка</option>
                  <option value="delivery">🚚 Готов к выдаче / Доставка</option>
                  <option value="completed">✅ Выполнен и закрыт</option>
                  <option value="cancelled">❌ Отменен</option>
                </select>
              </div>

              <div class="col-12 col-sm-6">
                <label class="form-label text-muted text-uppercase fw-bold" style="font-size:11px;">Печатный станок цеха</label>
                <select id="crmModalMachineSelect" class="form-select">
                  <option value="Heidelberg Speedmaster XL 75-5+L">Heidelberg Speedmaster XL 75 (Офсет)</option>
                  <option value="HP Indigo 7900 Digital Press">HP Indigo 7900 (Цифровой офсет)</option>
                  <option value="Xerox Iridesse Production Press (6 цветов)">Xerox Iridesse (Цифра + металлик)</option>
                  <option value="Mimaki UCJV300-160 УФ плоттер-каттер">Mimaki UCJV300-160 (УФ печать)</option>
                  <option value="Duplo DC-646 Автоматический финишер">Duplo DC-646 (Резка / биговка)</option>
                  <option value="Zünd G3 Цифровой раскроечный комплекс">Zünd G3 (Плоттерная резка)</option>
                  <option value="Пресс для горячего тиснения Heidelberg Tiegel">Heidelberg Tiegel (Тиснение Kurz)</option>
                </select>
              </div>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-12 col-sm-6">
                <label class="form-label text-muted text-uppercase fw-bold" style="font-size:11px;">Ответственный менеджер</label>
                <select id="crmModalManagerSelect" class="form-select">
                  <option value="Дмитрий Воронов">Дмитрий Воронов</option>
                  <option value="Алексей Смирнов">Алексей Смирнов</option>
                  <option value="Марина Лапина">Марина Лапина</option>
                </select>
              </div>

              <div class="col-12 col-sm-6">
                <label class="form-label text-muted text-uppercase fw-bold" style="font-size:11px;">Статус оплаты</label>
                <select id="crmModalPaidSelect" class="form-select fw-bold">
                  <option value="true">● Оплачен полностью (100%)</option>
                  <option value="false">○ Ожидает оплаты</option>
                </select>
              </div>
            </div>

            <!-- Specs Box -->
            <div class="p-3 bg-light rounded-3 border mb-3 font-monospace" style="font-size:12px;">
              <div class="text-muted text-uppercase fw-bold mb-2">Технические характеристики тиража</div>
              <div class="row g-2">
                <div class="col-6"><span class="text-muted">Формат:</span> <strong id="crmModalSpecsFormat"></strong></div>
                <div class="col-6"><span class="text-muted">Тираж:</span> <strong id="crmModalSpecsQty"></strong></div>
                <div class="col-6"><span class="text-muted">Материал:</span> <strong id="crmModalSpecsPaper"></strong></div>
                <div class="col-6"><span class="text-muted">Цветность:</span> <strong id="crmModalSpecsColor"></strong></div>
              </div>
              <div class="mt-2 pt-2 border-top"><span class="text-muted">Отделка:</span> <strong id="crmModalSpecsFinishing"></strong></div>
            </div>

            <div>
              <label class="form-label text-muted text-uppercase fw-bold" style="font-size:11px;">Файлы макета (Preflight)</label>
              <div id="crmModalFilesList"></div>
            </div>
          </div>

          <!-- Right: Client, Finance, Notes -->
          <div class="col-12 col-lg-5">
            <div class="p-3 bg-light rounded-3 border mb-3">
              <span class="text-muted text-uppercase fw-bold d-block mb-1" style="font-size:10px;">Контрагент</span>
              <div class="fw-bold fs-6 text-dark" id="crmModalClientName"></div>
              <div class="text-muted" style="font-size:13px;" id="crmModalClientPhone"></div>
              <div class="text-muted" style="font-size:12px;" id="crmModalClientEmail"></div>
            </div>

            <div class="p-3 bg-dark text-white rounded-3 mb-3">
              <span class="text-white-50 text-uppercase fw-bold d-block mb-2" style="font-size:10px;">Финансовая смета</span>
              <div class="mb-2">
                <label class="text-white-50 text-uppercase" style="font-size:10px;">Сумма для клиента (₽)</label>
                <input type="number" id="crmModalPriceTotal" class="form-control form-control-sm bg-secondary text-white border-0 fw-bold fs-5">
              </div>
              <div>
                <label class="text-white-50 text-uppercase" style="font-size:10px;">Себестоимость материалов (₽)</label>
                <input type="number" id="crmModalPricePrime" class="form-control form-control-sm bg-secondary text-white border-0">
              </div>
            </div>

            <div>
              <label class="form-label text-muted text-uppercase fw-bold" style="font-size:11px;">Журнал заметок цеха</label>
              <div id="crmModalNotesList" class="mb-2" style="max-height:160px; overflow-y:auto;"></div>
              <div class="input-group input-group-sm">
                <input type="text" id="crmModalNewNoteInput" placeholder="Добавить заметку..." class="form-control">
                <button type="button" id="crmModalAddNoteBtn" class="btn btn-dark">ОК</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer p-3 bg-light d-flex justify-content-between">
        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('crmOrderDetailModal').style.display='none'">Отмена</button>
        <button type="button" id="crmModalSaveBtn" class="btn btn-danger fw-bold btn-sm px-4">Сохранить изменения в CRM 💾</button>
      </div>

    </div>
  </div>
</div>

<!-- 3. Fast New Order Modal in CRM -->
<div id="crmNewOrderModal" class="modal fade show" tabindex="-1" style="display:none; background:rgba(0,0,0,0.65); z-index:99999999;">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content" style="border-radius:12px;">
      <div class="modal-header bg-dark text-white p-3">
        <h5 class="modal-title fs-6 fw-bold mb-0">➕ Создать новый заказ в CRM</h5>
        <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('crmNewOrderModal').style.display='none'"></button>
      </div>
      <form id="crmNewOrderForm" class="modal-body p-3 font-monospace" style="font-size:12px;">
        <div class="mb-2">
          <label class="form-label mb-1">Наименование заказа *</label>
          <input type="text" id="crmNewTitle" placeholder="Визитки Touche Cover 500 шт" required class="form-control form-control-sm">
        </div>
        <div class="row g-2 mb-2">
          <div class="col-6">
            <label class="form-label mb-1">Клиент / Компания *</label>
            <input type="text" id="crmNewClientName" placeholder="ООО 'Компания'" required class="form-control form-control-sm">
          </div>
          <div class="col-6">
            <label class="form-label mb-1">Телефон *</label>
            <input type="tel" id="crmNewClientPhone" placeholder="+7 (999) 000-00-00" required class="form-control form-control-sm">
          </div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-6">
            <label class="form-label mb-1">Категория</label>
            <select id="crmNewCategory" class="form-select form-select-sm">
              <option value="визитки">Визитки</option>
              <option value="листовая">Листовки / Буклеты</option>
              <option value="наклейки">Наклейки</option>
              <option value="многостраничная">Каталоги</option>
              <option value="упаковка">Коробки</option>
              <option value="пакеты">Пакеты</option>
              <option value="календари">Календари</option>
            </select>
          </div>
          <div class="col-6">
            <label class="form-label mb-1">Формат</label>
            <input type="text" id="crmNewFormat" placeholder="90х50 мм, А4..." class="form-control form-control-sm">
          </div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-8">
            <label class="form-label mb-1">Материал</label>
            <input type="text" id="crmNewPaper" placeholder="Мелованная 300г / Touche" class="form-control form-control-sm">
          </div>
          <div class="col-4">
            <label class="form-label mb-1">Тираж (шт) *</label>
            <input type="number" id="crmNewQty" value="500" required class="form-control form-control-sm">
          </div>
        </div>
        <div class="row g-2 mb-3">
          <div class="col-6">
            <label class="form-label mb-1">Сумма (₽) *</label>
            <input type="number" id="crmNewPrice" value="5000" required class="form-control form-control-sm fw-bold text-danger">
          </div>
          <div class="col-6">
            <label class="form-label mb-1">Срочность</label>
            <select id="crmNewUrgency" class="form-select form-select-sm">
              <option value="standard">Стандартный срок</option>
              <option value="urgent">⚡ Срочно</option>
            </select>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label mb-1">Станок цеха</label>
          <select id="crmNewMachine" class="form-select form-select-sm">
            <option value="Heidelberg Speedmaster XL 75-5+L">Heidelberg Speedmaster XL 75 (Офсет)</option>
            <option value="HP Indigo 7900 Digital Press">HP Indigo 7900 (Цифра)</option>
            <option value="Xerox Iridesse Production Press (6 цветов)">Xerox Iridesse</option>
            <option value="Mimaki UCJV300-160 УФ плоттер-каттер">Mimaki UCJV300-160</option>
          </select>
        </div>
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('crmNewOrderModal').style.display='none'">Отмена</button>
          <button type="submit" class="btn btn-danger btn-sm fw-bold">Создать заказ</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- 4. Fast New Client Modal in CRM -->
<div id="crmNewClientModal" class="modal fade show" tabindex="-1" style="display:none; background:rgba(0,0,0,0.65); z-index:99999999;">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content" style="border-radius:12px;">
      <div class="modal-header bg-dark text-white p-3">
        <h5 class="modal-title fs-6 fw-bold mb-0">➕ Добавить контрагента в базу CRM</h5>
        <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('crmNewClientModal').style.display='none'"></button>
      </div>
      <form id="crmNewClientForm" class="modal-body p-3 font-monospace" style="font-size:12px;">
        <div class="mb-2">
          <label class="form-label mb-1">Компания / Клиент *</label>
          <input type="text" id="crmNewClientNameInput" placeholder="ООО 'Альфа Ритейл'" required class="form-control form-control-sm">
        </div>
        <div class="row g-2 mb-2">
          <div class="col-6">
            <label class="form-label mb-1">Контактное лицо</label>
            <input type="text" id="crmNewClientPerson" placeholder="Константин Морозов" class="form-control form-control-sm">
          </div>
          <div class="col-6">
            <label class="form-label mb-1">Телефон *</label>
            <input type="tel" id="crmNewClientPhoneInput" placeholder="+7 (999) 000-00-00" required class="form-control form-control-sm">
          </div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-6">
            <label class="form-label mb-1">Email</label>
            <input type="email" id="crmNewClientEmail" placeholder="client@company.ru" class="form-control form-control-sm">
          </div>
          <div class="col-6">
            <label class="form-label mb-1">ИНН</label>
            <input type="text" id="crmNewClientInn" placeholder="7704859123" class="form-control form-control-sm">
          </div>
        </div>
        <div class="row g-2 mb-3">
          <div class="col-6">
            <label class="form-label mb-1">Категория</label>
            <select id="crmNewClientCategory" class="form-select form-select-sm">
              <option value="B2B Корпоративный">B2B Корпоративный</option>
              <option value="HoReCa">HoReCa</option>
              <option value="Рекламное агентство">Рекламное агентство</option>
              <option value="E-Commerce">E-Commerce</option>
            </select>
          </div>
          <div class="col-6">
            <label class="form-label mb-1">Скидочный уровень</label>
            <select id="crmNewClientTier" class="form-select form-select-sm">
              <option value="Базовый 0%">Базовый 0%</option>
              <option value="Silver 5%">Silver 5%</option>
              <option value="Gold 10%">Gold 10%</option>
              <option value="VIP 15%">VIP 15%</option>
            </select>
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('crmNewClientModal').style.display='none'">Отмена</button>
          <button type="submit" class="btn btn-success btn-sm fw-bold">Сохранить</button>
        </div>
      </form>
    </div>
  </div>
</div>
'''
soup.body.append(BeautifulSoup(crm_modal_html, 'html.parser'))

# 7. Clean up old scripts at bottom of body
for s in soup.body.find_all('script'):
    src = s.get('src', '')
    if any(b in src for b in ['bitrix24', 'jquery', 'yii', 'vendors', 'runtime', 'app.f77c03e3', 'search.js', 'ajax-form.js', 'lazy-on-interaction', 'gpt360']):
        s.decompose()

# 8. Add reliable CDN libraries and PMG scripts
clean_scripts = '''
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="js/mockData.js"></script>
<script src="js/api.js"></script>
<script src="js/calculator.js"></script>
<script src="js/tracker.js"></script>
<script src="js/crm.js"></script>

<script>
  // Clean Controller for opening / closing CRM
  window.PMG_CRM_APP = {
    openCRM() {
      const modal = document.getElementById('pmgCrmAppModal');
      if (modal) {
        modal.style.setProperty('display', 'block', 'important');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (window.PMG_CRM) window.PMG_CRM.refresh();
      }
    },
    closeCRM() {
      const modal = document.getElementById('pmgCrmAppModal');
      if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        if (window.location.hash === '#crm') {
          history.pushState("", document.title, window.location.pathname + window.location.search);
        }
      }
    }
  };

  // Swiper slider initialization for PMG hero banner
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swiper !== 'undefined' && document.querySelector('.swiper--main')) {
      new Swiper('.swiper--main', {
        loop: true,
        autoplay: { delay: 4500, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper__button--next', prevEl: '.swiper__button--prev' }
      });
    }

    // Initialize modules
    if (window.PMG_CALCULATOR) window.PMG_CALCULATOR.init();
    if (window.PMG_TRACKER) window.PMG_TRACKER.init();
    if (window.PMG_CRM) window.PMG_CRM.init();

    // Check hash for CRM ONLY if explicitly provided in URL
    if (window.location.hash === '#crm') {
      window.PMG_CRM_APP.openCRM();
    }
  });
</script>
'''
soup.body.append(BeautifulSoup(clean_scripts, 'html.parser'))

# Save to index.html and public/index.html
final_html = str(soup)
out_root = 'C:/Users/pules/.gemini/antigravity/scratch/typography-crm'
with open(os.path.join(out_root, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(final_html)
with open(os.path.join(out_root, 'public', 'index.html'), 'w', encoding='utf-8') as f:
    f.write(final_html)

print("Generated clean, bug-free PMG system in index.html and public/index.html!")
