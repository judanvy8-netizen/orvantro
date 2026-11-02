'use strict';
const assert = require('node:assert/strict');
const { browser, read } = require('./helpers.cjs');
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS', name); }
function setup(hash = '') { const state = browser({ hash }); state.run('experience.js'); return state; }
function selected(state, key) {
  for (const name of ['marginkit', 'insights']) {
    const tab = state.ids.get('tab-' + name), panel = state.ids.get('panel-' + name), active = name === key;
    assert.equal(tab.getAttribute('aria-selected'), String(active));
    assert.equal(tab.tabIndex, active ? 0 : -1);
    assert.equal(panel.hidden, !active);
    assert.equal(tab.getAttribute('aria-controls'), panel.getAttribute('id'));
    assert.equal(panel.getAttribute('aria-labelledby'), tab.getAttribute('id'));
  }
}
test('both product panels remain in source for a no-JavaScript visit', () => {
  const state = browser();
  for (const key of ['marginkit', 'insights']) {
    const panel = state.ids.get('panel-' + key);
    assert.ok(panel); assert.equal(panel.hasAttribute('hidden'), false);
    assert.ok(panel.querySelector('.process-steps'));
  }
  assert.doesNotMatch(read('index.html'), /<html[^>]*class="[^"]*product-tabs-ready/);
});
test('product tab clicks switch one visible panel with matching ARIA state', () => {
  const state = setup(); selected(state, 'marginkit');
  state.ids.get('tab-insights').dispatch('click'); selected(state, 'insights');
  state.ids.get('tab-marginkit').dispatch('click'); selected(state, 'marginkit');
});
test('product tabs support arrow wrapping and Home/End with focused active tabs', () => {
  const state = setup(), first = state.ids.get('tab-marginkit'), last = state.ids.get('tab-insights');
  first.dispatch('keydown', { key: 'ArrowLeft' }); selected(state, 'insights'); assert.equal(last.focused, true);
  last.dispatch('keydown', { key: 'ArrowRight' }); selected(state, 'marginkit'); assert.equal(first.focused, true);
  first.dispatch('keydown', { key: 'End' }); selected(state, 'insights');
  last.dispatch('keydown', { key: 'Home' }); selected(state, 'marginkit');
});
test('deep product links select the correct panel and malformed fragments stay harmless', () => {
  for (const hash of ['#panel-insights', '#diagram-insights', '#%64iagram-insights']) {
    const state = setup(hash); selected(state, 'insights');
    const target = state.ids.get(decodeURIComponent(hash.slice(1)));
    assert.deepEqual(target.scrollCalls, [{ block: 'start', behavior: 'instant' }], 'revealed target must be scrolled into view');
  }
  for (const hash of ['#%FF', '#nonexistent']) {
    const state = setup(hash); selected(state, 'marginkit');
    assert.equal(state.nodes.some(node => node.scrollCalls?.length), false);
  }
  const state = setup(); state.context.location.hash = '#diagram-insights'; state.context.dispatch('hashchange'); selected(state, 'insights');
  assert.deepEqual(state.ids.get('diagram-insights').scrollCalls, [{ block: 'start', behavior: 'instant' }]);
});
test('product steps update exactly one pressed state and its own diagram layer', () => {
  const state = setup();
  for (const key of ['marginkit', 'insights']) {
    const panel = state.ids.get('panel-' + key), steps = panel.querySelectorAll('.process-step'), diagram = state.ids.get('diagram-' + key);
    assert.equal(steps.length, 3);
    for (const step of steps) {
      step.dispatch('click'); assert.equal(diagram.dataset.activeStep, step.dataset.step);
      for (const candidate of steps) assert.equal(candidate.getAttribute('aria-pressed'), String(candidate === step));
    }
  }
});
test('the broad main-content anchor does not open unrelated feedback or data disclosures', () => {
  const state = setup('#main-content');
  const disclosures = ['feedback', 'data-settings'].map(id => state.ids.get(id).closest('details') || state.ids.get(id).querySelector('details'));
  disclosures.forEach(details => assert.equal(details.open, false));
  const home = state.nodes.find(node => node.tagName === 'A' && node.getAttribute('href') === '#main-content');
  home.dispatch('click');
  disclosures.forEach(details => assert.equal(details.open, false, 'repeat click must leave disclosures closed'));
  state.context.location.hash = '#ventures'; state.context.dispatch('hashchange');
  state.context.location.hash = '#main-content'; state.context.dispatch('hashchange');
  disclosures.forEach(details => assert.equal(details.open, false, 'hash navigation must leave disclosures closed'));
});
test('direct and repeated links open feedback and privacy disclosures', () => {
  for (const hash of ['#feedback', '#fb-body', '#data-settings', '#central-allow', '#central-deny']) {
    const state = setup(hash), target = state.ids.get(hash.slice(1));
    const details = target.closest('details') || target.querySelector('details'); assert.equal(details.open, true, hash);
  }
  const state = setup('#feedback'), details = state.ids.get('feedback').querySelector('details'); details.open = false;
  const link = state.nodes.find(node => node.tagName === 'A' && node.getAttribute('href') === '#feedback');
  link.dispatch('click'); assert.equal(details.open, true);
});
console.log(`${passed} product interaction checks passed (Node DOM fixture; browser geometry is outside this suite)`);
