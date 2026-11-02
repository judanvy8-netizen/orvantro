'use strict';
/* Product selection is progressive enhancement: both products remain readable without JS */
(() => {
  const root = document.documentElement;
  const list = document.querySelector('.product-tabs');
  const tabs = [...document.querySelectorAll('[data-product]')];
  const panels = [...document.querySelectorAll('[data-product-panel]')];
  if (!list || !tabs.length || !panels.length) return;

  function selectProduct(key, focus = false) {
    const selected = tabs.find(tab => tab.dataset.product === key);
    if (!selected) return;
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => {
      const active = panel.dataset.productPanel === key;
      panel.hidden = !active;
      panel.classList.toggle('panel-enter', active);
    });
    if (focus) selected.focus({ preventScroll: true });
  }

  list.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'panel-' + tab.dataset.product);
    tab.addEventListener('click', event => {
      event.preventDefault();
      selectProduct(tab.dataset.product);
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectProduct(tabs[next].dataset.product, true);
    });
  });
  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.tabIndex = 0;
    const diagram = panel.querySelector('.process-diagram');
    const steps = [...panel.querySelectorAll('.process-step')];
    steps.forEach(button => {
      button.addEventListener('click', () => {
        steps.forEach(step => step.setAttribute('aria-pressed', String(step === button)));
        if (diagram) diagram.dataset.activeStep = button.dataset.step;
      });
    });
  });
  document.querySelectorAll('[data-open-product]').forEach(link => {
    link.addEventListener('click', () => selectProduct(link.dataset.openProduct));
  });

  // Direct links reach their content even when a product panel or a disclosure is closed
  function revealDestination() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    if (!target) return;
    const panel = target.closest('[data-product-panel]');
    if (panel) {
      selectProduct(panel.dataset.productPanel);
      // A hash may initially target a hidden panel, before its layout exists
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    const disclosure = target.matches('details') ? target
      : ['feedback', 'data-settings'].includes(target.id) ? target.querySelector('details') : null;
    if (disclosure) disclosure.open = true;
    let parent = target.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
  }
  root.classList.add('product-tabs-ready');
  selectProduct('marginkit');
  revealDestination();
  window.addEventListener('hashchange', revealDestination);
  // Clicking an already-current hash still opens a disclosure the visitor closed
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      if (link.hash === location.hash) revealDestination();
    });
  });
})();

/* Graphs reveal inside stationary product frames without scroll pinning */
(() => {
  const root = document.documentElement;
  const frames = [...document.querySelectorAll('.product-exhibit')];
  if (!frames.length || typeof window.matchMedia !== 'function' ||
      typeof window.requestAnimationFrame !== 'function' ||
      !frames.every(frame => typeof frame.style.setProperty === 'function')) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let request = 0;
  function update() {
    request = 0;
    const still = reduced.matches || root.classList.contains('motion-paused');
    const height = Math.max(window.innerHeight || 1, 1);
    const measurements = frames.map(frame => ({frame, top: frame.getBoundingClientRect().top}));
    measurements.forEach(({frame, top}) => {
      const progress = still ? 1 : Math.max(0, Math.min(1, (height * .95 - top) / (height * .65)));
      frame.style.setProperty('--exhibit-progress', progress.toFixed(4));
    });
  }
  function schedule() {
    if (!request && !document.hidden) request = window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule, {passive: true});
  window.addEventListener('pageshow', schedule);
  window.addEventListener('orvantro-language-change', schedule);
  document.querySelectorAll('[data-product], [data-open-product]').forEach(button => {
    button.addEventListener('click', schedule);
    button.addEventListener('keydown', schedule);
  });
  if (reduced.addEventListener) reduced.addEventListener('change', schedule);
  if (typeof MutationObserver === 'function') {
    new MutationObserver(schedule).observe(root, {attributes:true, attributeFilter:['class']});
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && request) { window.cancelAnimationFrame(request); request = 0; }
    else schedule();
  });
  update();
})();
