'use strict';
/* Original ORVANTRO motion system — native canvas, no third-party motion library */
(() => {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('hero-canvas');
  const motionButton = document.getElementById('motion-toggle');
  const progress = document.querySelector('.scroll-progress');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let userPaused = false;
  let inView = true;
  let frame = 0;
  let scrollFrame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let heroScrollProgress = 0;
  let width = 0;
  let height = 0;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let context = null;
  let revealObserver = null;
  let heroObserver = null;
  const pendingReveals = new Set();
  const staticMotion = () => userPaused || reduce.matches;
  const english = () => root.dataset.language === 'en';

  function updateMotionControl() {
    const paused = staticMotion();
    root.classList.toggle('motion-paused', paused);
    if (!motionButton) return;
    motionButton.setAttribute('aria-pressed', String(paused));
    // The OS setting takes precedence; this button does not override it.
    motionButton.disabled = reduce.matches;
    const label = motionButton.querySelector('.motion-label');
    const text = reduce.matches
      ? (english() ? 'Reduced motion' : '움직임 최소화')
      : paused ? (english() ? 'Resume motion' : '움직임 재생')
        : (english() ? 'Pause motion' : '움직임 멈춤');
    if (label) label.textContent = text;
    else motionButton.textContent = text;
    motionButton.setAttribute('aria-label', text);
  }

  function exposeReveals() {
    pendingReveals.forEach(element => element.classList.add('is-visible'));
    pendingReveals.clear();
    if (revealObserver) revealObserver.disconnect();
  }

  function setupReveals() {
    const elements = [...document.querySelectorAll('[data-reveal]')];
    if (!elements.length || !('IntersectionObserver' in window)) return;
    try {
      revealObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          pendingReveals.delete(entry.target);
          revealObserver.unobserve(entry.target);
        }
      }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });
      elements.forEach(element => {
        pendingReveals.add(element);
        revealObserver.observe(element);
      });
      // Progressive enhancement: content is visible unless observer setup succeeded.
      root.classList.add('motion-ready');
      if (staticMotion()) exposeReveals();
    } catch (_) {
      exposeReveals();
      root.classList.remove('motion-ready');
    }
  }

  function updateScroll() {
    scrollFrame = 0;
    const available = root.scrollHeight - root.clientHeight;
    const ratio = available > 0 ? Math.max(0, Math.min(1, window.scrollY / available)) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (hero) {
      const bounds = hero.getBoundingClientRect();
      const heroProgress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height)));
      heroScrollProgress = staticMotion() ? 0 : heroProgress;
      hero.style.setProperty('--hero-progress', String(heroProgress));
      hero.style.setProperty('--hero-shift', staticMotion() ? '0px' : `${-heroProgress * 55}px`);
      // IntersectionObserver is optional; keep scheduling bounded even without it.
      if (!heroObserver) {
        const visualBounds = canvas ? canvas.getBoundingClientRect() : bounds;
        const nextView = visualBounds.bottom > 0 && visualBounds.top < window.innerHeight;
        if (nextView !== inView) {
          inView = nextView;
          syncAnimation();
        }
      }
    }
  }

  function scheduleScroll() {
    if (!scrollFrame && !document.hidden) scrollFrame = window.requestAnimationFrame(updateScroll);
  }

  // Equal-distance samples let the same eight engineered parts assemble each form
  function samplePath(vertices, count = 40) {
    const lengths = [0];
    for (let i = 1; i < vertices.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(vertices[i][0] - vertices[i - 1][0], vertices[i][1] - vertices[i - 1][1]));
    }
    const total = lengths[lengths.length - 1];
    if (!total) return Array.from({ length: count }, () => [...vertices[0]]);
    return Array.from({ length: count }, (_, i) => {
      const distance = total * i / (count - 1);
      let segment = 1;
      while (segment < lengths.length - 1 && lengths[segment] < distance) segment++;
      const amount = (distance - lengths[segment - 1]) / Math.max(0.00001, lengths[segment] - lengths[segment - 1]);
      return vertices[segment - 1].map((value, axis) => value + (vertices[segment][axis] - value) * amount);
    });
  }
  const rest = [[0, 0], [0, 0]];
  const monogramO = [[-.6,-.55],[-.22,-.55],[-.08,-.37],[-.08,.37],[-.22,.55],[-.6,.55],[-.74,.37],[-.74,-.37],[-.6,-.55]];
  const assemblyStates = [
    {
      // A typographic OV monogram is the stable brand state, never a generic orb
      paths: [monogramO, [[.08,-.55],[.39,.55]], [[.39,.55],[.72,-.55]], rest, rest, rest, rest, rest],
      widths: [14,15,15,0,0,0,0,0]
    },
    {
      // Interface architecture: frame, header, navigation and three working lanes
      paths: [
        [[-.76,-.53],[.76,-.53],[.76,.53],[-.76,.53],[-.76,-.53]],
        [[-.76,-.28],[.76,-.28]],
        [[-.35,-.28],[-.35,.53]],
        [[-.12,-.04],[.17,-.04],[.29,.08],[.57,.08]],
        [[-.12,.2],[.4,.2]],
        [[-.12,.36],[.57,.36]],
        [[-.62,-.08],[-.48,-.08],[-.48,.08],[-.62,.08],[-.62,-.08]],
        [[-.62,.24],[-.48,.24]]
      ], widths: [4.5,3,2.5,6,4,4,3,3]
    },
    {
      // Connected routes are diagrams of development direction, not a live product
      paths: [
        [[-.68,0],[-.22,0],[.16,-.4],[.52,-.4]],
        [[-.22,0],[.16,.4],[.52,.4]],
        [[-.22,0],[.52,0]],
        [[-.82,-.12],[-.58,-.12],[-.58,.12],[-.82,.12],[-.82,-.12]],
        [[.52,-.52],[.76,-.52],[.76,-.28],[.52,-.28],[.52,-.52]],
        [[.52,-.12],[.76,-.12],[.76,.12],[.52,.12],[.52,-.12]],
        [[.52,.28],[.76,.28],[.76,.52],[.52,.52],[.52,.28]],
        [[-.15,-.5],[.08,-.5]]
      ], widths: [6,6,4,4,4,4,4,2]
    },
    {
      // A protected core assembled from the same structural parts
      paths: [
        [[0,-.68],[.55,-.45],[.5,.18],[.33,.43],[0,.69],[-.33,.43],[-.5,.18],[-.55,-.45],[0,-.68]],
        [[0,-.48],[.35,-.34],[.32,.14],[.2,.31],[0,.48],[-.2,.31],[-.32,.14],[-.35,-.34],[0,-.48]],
        [[-.19,.01],[-.04,.17],[.24,-.14]],
        [[-.73,-.26],[-.73,.24]],
        [[.73,-.26],[.73,.24]],
        [[-.15,-.83],[.15,-.83]],
        rest,
        rest
      ], widths: [7,2,8,2,2,2,0,0]
    }
  ].map(state => ({ ...state, paths: state.paths.map(path => samplePath(path)) }));
  const assemblyColors = ['#d6f5fb','#8bdce8','#66c9dd','#b5eaf3','#5ab5cf','#b5eaf3','#4b9ebc','#8bdce8'];

  function dimensions() {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, width < 500 ? 1.5 : 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    if (!context || !width || !height) return;
    const ctx = context;
    const time = reduce.matches ? 0 : elapsed;
    const phase = (time % 14000) / 3500;
    const stateIndex = Math.floor(phase);
    if (hero && hero.dataset.heroStage !== String(stateIndex)) hero.dataset.heroStage = String(stateIndex);
    const transition = Math.max(0, Math.min(1, (phase - stateIndex - 0.55) / 0.45));
    const mix = transition * transition * transition * (transition * (transition * 6 - 15) + 10);
    const current = assemblyStates[stateIndex];
    const next = assemblyStates[(stateIndex + 1) % assemblyStates.length];
    const scale = Math.min(width, height) * 0.42 * (1 - heroScrollProgress * 0.025);
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const leanX = staticMotion() ? 0 : easedX * 0.3;
    const leanY = staticMotion() ? 0 : easedY * 0.3;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    // The entire construction is bounded by its own stage, with no page translation
    ctx.beginPath();
    ctx.rect(width * 0.06, height * 0.06, width * 0.88, height * 0.88);
    ctx.clip();
    ctx.translate(centerX, centerY);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'bevel';

    // A quiet rectangular assembly bed grounds the form without orbit-like decoration
    const bed = ctx.createLinearGradient(-scale, -scale, scale, scale);
    bed.addColorStop(0, 'rgba(21,59,77,0.42)');
    bed.addColorStop(1, 'rgba(7,19,31,0.08)');
    ctx.fillStyle = bed;
    ctx.fillRect(-scale * 0.91, -scale * 0.91, scale * 1.82, scale * 1.82);
    ctx.strokeStyle = 'rgba(95,160,183,0.16)';
    ctx.lineWidth = 1;
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x * scale * 0.91, y * scale * 0.72);
      ctx.lineTo(x * scale * 0.91, y * scale * 0.91);
      ctx.lineTo(x * scale * 0.72, y * scale * 0.91);
      ctx.stroke();
    }

    for (let part = 0; part < 8; part++) {
      const thickness = current.widths[part] + (next.widths[part] - current.widths[part]) * mix;
      if (thickness < 0.08) continue;
      const coordinates = current.paths[part].map((point, index) => {
        const destination = next.paths[part][index];
        const x = point[0] + (destination[0] - point[0]) * mix;
        const y = point[1] + (destination[1] - point[1]) * mix;
        return [(x + y * leanX) * scale, (y + x * leanY) * scale];
      });
      const weight = thickness * Math.max(0.65, Math.min(1.2, scale / 225));
      // A short opaque extrusion gives each rail depth without glow or bloom
      for (const depth of [1, 0]) {
        ctx.beginPath();
        coordinates.forEach(([x, y], index) => {
          const px = x + depth * scale * 0.026, py = y + depth * scale * 0.032;
          if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = depth ? '#12354a' : assemblyColors[part];
        ctx.lineWidth = weight + (depth ? 1 : 0);
        ctx.stroke();
      }
    }
    // The full brand name stays present through every architectural state
    ctx.fillStyle = '#b8e1eb';
    ctx.font = `700 ${width < 500 ? 10 : 12}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORVANTRO', 0, scale * 0.82);
    ctx.restore();
    if (hero) hero.classList.add('canvas-ready');
  }

  function animate(timestamp) {
    frame = 0;
    if (!context || staticMotion() || !inView || document.hidden) {
      lastTime = 0;
      return;
    }
    // A 30fps ceiling keeps the decorative layer inexpensive on high-refresh screens.
    if (!lastTime || timestamp - lastTime >= 1000 / 30 - 1) {
      const delta = lastTime ? Math.max(0, timestamp - lastTime) : 0;
      elapsed += delta;
      lastTime = timestamp;
      easedX += (pointerX - easedX) * 0.055;
      easedY += (pointerY - easedY) * 0.055;
      draw();
    }
    frame = window.requestAnimationFrame(animate);
  }

  function syncAnimation() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (context && !staticMotion() && inView && !document.hidden) frame = window.requestAnimationFrame(animate);
    else if (context && inView && !document.hidden) draw();
  }

  if (canvas && hero) {
    try { context = canvas.getContext('2d', { alpha: true }); } catch (_) { context = null; }
    if (context) {
      dimensions();
      if ('ResizeObserver' in window) new ResizeObserver(dimensions).observe(canvas);
      else window.addEventListener('resize', dimensions, { passive: true });
      if ('IntersectionObserver' in window) {
        try {
          heroObserver = new IntersectionObserver(entries => {
            inView = entries[0].isIntersecting;
            syncAnimation();
          }, { threshold: 0 });
          heroObserver.observe(canvas);
        } catch (_) { heroObserver = null; }
      }
      hero.addEventListener('pointermove', event => {
        if (!finePointer.matches || staticMotion()) return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        pointerX = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left - rect.width / 2) / rect.width)) * 0.24;
        pointerY = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top - rect.height / 2) / rect.height)) * 0.18;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; }, { passive: true });
    }
  }

  if (motionButton) {
    motionButton.hidden = false;
    motionButton.addEventListener('click', () => {
      if (reduce.matches) return;
      userPaused = !userPaused;
      updateMotionControl();
      if (userPaused) exposeReveals();
      updateScroll();
      syncAnimation();
    });
  }
  function motionPreferenceChanged() {
    updateMotionControl();
    if (staticMotion()) exposeReveals();
    updateScroll();
    syncAnimation();
  }
  if (reduce.addEventListener) reduce.addEventListener('change', motionPreferenceChanged);
  else if (reduce.addListener) reduce.addListener(motionPreferenceChanged);
  window.addEventListener('orvantro-language-change', updateMotionControl);
  // Also supports locale implementations which do not yet dispatch a custom event.
  new MutationObserver(updateMotionControl).observe(root, { attributes: true, attributeFilter: ['data-language'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && scrollFrame) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = 0;
    }
    if (!document.hidden) scheduleScroll();
    syncAnimation();
  });
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  window.addEventListener('pageshow', scheduleScroll);
  window.addEventListener('orvantro-language-change', scheduleScroll);
  setupReveals();
  updateMotionControl();
  updateScroll();
  syncAnimation();

  // Disclosure navigation. All links stay available when JavaScript is absent.
  const menuButton = document.getElementById('menu-toggle');
  const navigation = document.getElementById('main-nav');
  if (!menuButton || !navigation) return;
  const mobile = window.matchMedia('(max-width: 900px)');
  let open = false;
  function renderMenu() {
    const collapsed = mobile.matches && !open;
    navigation.hidden = collapsed;
    navigation.inert = collapsed;
    menuButton.setAttribute('aria-expanded', String(mobile.matches && open));
    root.classList.toggle('menu-open', mobile.matches && open);
  }
  function closeMenu(returnFocus = false) {
    open = false;
    renderMenu();
    if (returnFocus) menuButton.focus({ preventScroll: true });
  }
  menuButton.addEventListener('click', () => { open = !open; renderMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches && open) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (open && !navigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a[href]')) closeMenu();
  });
  const menuResize = () => closeMenu();
  if (mobile.addEventListener) mobile.addEventListener('change', menuResize);
  else if (mobile.addListener) mobile.addListener(menuResize);
  root.classList.add('menu-ready');
  renderMenu();
})();
