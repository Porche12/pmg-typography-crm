// Tactile Finishes Simulator for IPK Yuzhny Ural
(function() {
  const FINISH_EFFECTS = {
    gold: {
      title: 'Тиснение горячей золотой фольгой Kurz',
      techName: 'Hot Foil Stamping (Германия)',
      desc: 'Прецизионное тиснение металлизированной зеркальной фольгой на немецких тигельных прессах. Дает благородный металлический блеск, устойчивый к истиранию.',
      icon: 'images/finish-gold.svg',
      sampleText: 'ЮЖНЫЙ УРАЛ • 1920',
      sampleSub: 'ЗОЛОТОЕ ТИСНЕНИЕ KURZ'
    },
    uv: {
      title: 'Выборочный глянцевый 3D УФ-лак',
      techName: 'Spot 3D UV Varnish',
      desc: 'Нанесение высокоглянцевого УФ-лака с эффектом объема (до 60 мкм). Создает яркий тактильный контраст между матовой поверхностью и зеркальным глянцем.',
      icon: 'images/finish-uv.svg',
      sampleText: 'ОФСЕТНЫЙ ГЛЯНЕЦ',
      sampleSub: 'ТАКТИЛЬНЫЙ РЕЛЬЕФ 60 МКМ'
    },
    emboss: {
      title: 'Конгревное рельефное тиснение',
      techName: 'Embossing & Debossing',
      desc: 'Выдавливание объемного изображения с помощью матрицы и патрицы. Бумага приобретает изысканный скульптурный барельеф без использования красок.',
      icon: 'images/finish-emboss.svg',
      sampleText: 'СКУЛЬПТУРНЫЙ КОНГРЕВ',
      sampleSub: 'БАРЕЛЬЕФНЫЙ ОТТИСК'
    },
    softtouch: {
      title: 'Бархатная ламинация Soft-Touch',
      techName: 'Silky Velvet Lamination',
      desc: 'Сверхматовая пленка с шелковистым тактильным эффектом персиковой кожи. Исключает блики, следы пальцев и придает изделию роскошное ощущение премиум-класса.',
      icon: 'images/finish-softtouch.svg',
      sampleText: 'SOFT-TOUCH ПРЕМИУМ',
      sampleSub: 'ТАКТИЛЬНЫЙ БАРХАТ'
    }
  };

  let currentFinish = 'gold';

  function init() {
    bindEvents();
    renderFinish(currentFinish);
  }

  function bindEvents() {
    document.querySelectorAll('[data-finish-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.dataset.finishType;
        if (FINISH_EFFECTS[type]) {
          currentFinish = type;
          document.querySelectorAll('[data-finish-type]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderFinish(type);
        }
      });
    });
  }

  function renderFinish(type) {
    const data = FINISH_EFFECTS[type];
    if (!data) return;

    const stage = document.getElementById('finishStageCard');
    const title = document.getElementById('finishDetailTitle');
    const tech = document.getElementById('finishDetailTech');
    const desc = document.getElementById('finishDetailDesc');
    const textLayer = document.getElementById('finishSampleText');
    const subLayer = document.getElementById('finishSampleSub');

    if (title) title.innerText = data.title;
    if (tech) tech.innerText = data.techName;
    if (desc) desc.innerText = data.desc;

    if (textLayer) {
      textLayer.innerText = data.sampleText;
      textLayer.className = type === 'gold' ? 'foil-layer' : (type === 'uv' ? 'uv-gloss-layer' : 'emboss-layer');
    }
    if (subLayer) subLayer.innerText = data.sampleSub;

    if (stage) {
      stage.style.backgroundImage = `url('${data.icon}')`;
      stage.style.backgroundRepeat = 'no-repeat';
      stage.style.backgroundPosition = 'center 20px';
      stage.style.backgroundSize = '70px 70px';
    }
  }

  window.URAL_SIMULATOR = {
    init,
    setFinish: renderFinish
  };
})();
