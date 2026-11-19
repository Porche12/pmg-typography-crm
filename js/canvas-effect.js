// CMYK Halftone & Rosette Subtle Interactive Canvas Effect
// Inspired by Canvas-UI & Offset Printing Physics (Heidelberg SM 52-4)
(function() {
  const canvas = document.createElement('canvas');
  canvas.id = 'cmykCanvasBackground';
  
  // Find suitable container: hero slider or calculator or document body
  function attachCanvas() {
    const hero = document.querySelector('.section--main-slider') || document.querySelector('#calculator-online');
    if (!hero) return;
    
    hero.style.position = 'relative';
    hero.insertBefore(canvas, hero.firstChild);
    
    let ctx = canvas.getContext('2d');
    let width = canvas.width = hero.offsetWidth;
    let height = canvas.height = hero.offsetHeight;
    
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2, radius: 120 };
    
    window.addEventListener('resize', () => {
      width = canvas.width = hero.offsetWidth;
      height = canvas.height = hero.offsetHeight;
    });

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
    });

    // Subdued CMYK dot grid
    const dotSpacing = 28;
    const colors = [
      'rgba(0, 163, 224, 0.12)',   // Cyan
      'rgba(228, 0, 127, 0.10)',   // Magenta
      'rgba(255, 209, 0, 0.10)',   // Yellow
      'rgba(15, 23, 42, 0.08)'     // Black / Charcoal
    ];

    function draw() {
      // Smooth lerp mouse
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / dotSpacing);
      const rows = Math.ceil(height / dotSpacing);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * dotSpacing;
          const y = j * dotSpacing;
          
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Dot size modulated slightly near cursor
          let r = 1.4;
          if (dist < mouse.radius) {
            const factor = 1 - (dist / mouse.radius);
            r = 1.4 + factor * 2.2;
          }

          const colorIdx = (i + j) % colors.length;
          ctx.fillStyle = colors[colorIdx];
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      requestAnimationFrame(draw);
    }

    // Only run if not prefers-reduced-motion
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(draw);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachCanvas);
  } else {
    attachCanvas();
  }
})();
