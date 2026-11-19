---
version: 1.0.0
name: ipk-yuzhny-ural-design-system
description: >
  Официальная дизайн-система и спецификация визуального стиля для 
  Издательско-полиграфического комплекса «Южный Урал» (г. Оренбург, основан в 1920 году).
  Разработана по стандартам design.md от Google Labs и transitions.dev для исключения 
  «ИИ-слопа» (AI slop) и фиолетовых градиентов. Стиль строгий, индустриальный, 
  высокоточный, вдохновленный классической немецкой и швейцарской полиграфической типографикой.

brand:
  name: "ИПК «Южный Урал»"
  legal: "АО «Издательско-полиграфический комплекс «Южный Урал»"
  founded: 1920
  location: "460000, Россия, г. Оренбург, переулок Свободина, дом 4, корпус 3"
  phones:
    - "+7 (3532) 66-22-11"
    - "+7 (3532) 77-04-12"
  email: "print_ipk@mail.ru"
  website: "https://662211.info"

colors:
  # Primary brand colors
  brand-burgundy: "#8b1e1e"      # Исторический благородный бордовый цвет ИПК с 1920 г.
  brand-burgundy-hover: "#731818"
  brand-orange: "#e35205"        # Индустриальный сигнальный оранжевый (акцент, кнопки действий)
  brand-orange-hover: "#c84704"
  brand-green: "#16a34a"         # Флексопечать, маркировка готовности и экологичность
  brand-green-hover: "#15803d"

  # Neutral & Ink palette
  ink-900: "#0f172a"             # Глубокий типографский угольный цвет для заголовков
  ink-800: "#1e293b"
  ink-700: "#334155"             # Основной цвет текста
  ink-muted: "#64748b"           # Второстепенный текст, описания параметров
  ink-light: "#94a3b8"

  # Surfaces & Borders
  surface-canvas: "#ffffff"
  surface-subtle: "#f8fafc"
  surface-card: "#ffffff"
  surface-dark: "#0f172a"
  border-hairline: "#e2e8f0"
  border-subtle: "#cbd5e1"
  border-active: "#8b1e1e"

  # CMYK Process Printing Reference Tones (Subtle Accents)
  cmyk-cyan: "#00a3e0"
  cmyk-magenta: "#e4007f"
  cmyk-yellow: "#ffd100"
  cmyk-black: "#1e1e1e"

typography:
  display-family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  body-family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  mono-family: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  scale:
    h1: { size: "36px", weight: 900, lineHeight: 1.15, letterSpacing: "-0.03em" }
    h2: { size: "28px", weight: 800, lineHeight: 1.2, letterSpacing: "-0.02em" }
    h3: { size: "20px", weight: 700, lineHeight: 1.3, letterSpacing: "-0.01em" }
    body-lg: { size: "16px", weight: 500, lineHeight: 1.5 }
    body-md: { size: "14px", weight: 400, lineHeight: 1.5 }
    body-sm: { size: "12px", weight: 400, lineHeight: 1.4 }
    tabular: { fontVariantNumeric: "tabular-nums" }

motion:
  tokens:
    duration-quick: "150ms"
    duration-fast: "250ms"
    duration-medium: "350ms"
    duration-slow: "400ms"
    ease-smooth-out: "cubic-bezier(0.22, 1, 0.36, 1)"
    ease-bounce: "cubic-bezier(0.34, 1.36, 0.64, 1)"
  rules:
    - "Все модальные окна открываются с масштабированием 0.96 -> 1.0 за 250ms"
    - "Смена вкладок в калькуляторе и CRM происходит через плавный fade-in 150ms"
    - "Обязательный медиа-запрос prefers-reduced-motion: reduce для доступности"

components:
  header:
    type: "pmg-density-nav"
    topbar: "Оренбург, пер. Свободина, 4, корп. 3 • Пн-Пт 9:00-17:30 • +7 (3532) 66-22-11"
    catalog-menu: "Многоколоночное мегаменю со всеми направлениями полиграфии"
    crm-trigger: "Кнопка «⚙️ CRM и цех» для перехода в производственную систему"
  hero:
    type: "industrial-swiper"
    slides:
      - "Книги и монографии в твердом 7БЦ и мягком переплете (с присвоением ISBN)"
      - "Флексопечать рулонных самоклеящихся этикеток на Mark Andy (350+ ножей)"
      - "Офсетная печать на Heidelberg Speedmaster SM 52-4 (до 15 000 отт/час)"
  calculator:
    type: "interactive-quote-engine"
    categories: ["vizitki", "listovki", "buklety", "stikery", "katalogi", "upakovka", "pakety", "kalendari"]
    features: "Мгновенный авторасчет, скидки за объем, выбор отделки, интеграция в CRM"
  tracker:
    type: "realtime-production-roadmap"
    stages: ["new", "prepress", "queue", "printing", "postpress", "qc_packing", "delivery", "completed"]
  crm:
    type: "fullscreen-manufacturing-modal"
    views: ["kanban", "clients", "equipment", "materials", "analytics"]
    auto-open: false # Строго закрыта при первой загрузке, открытие только по клику
