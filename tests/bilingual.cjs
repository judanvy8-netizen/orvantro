'use strict';
const assert = require('node:assert/strict');
const { read, attributes, browser, settle } = require('./helpers.cjs');
const html = read('index.html');
let passed = 0;
async function test(name, run) { await run(); passed++; console.log('PASS', name); }
function plain(markup) { return markup.replace(/<[^>]+>/g, ' ').replace(/&(?:nbsp|amp|copy);/g, ' ').replace(/\s+/g, ' ').trim(); }
function controls(options = {}) {
  const state = browser(options);
  for (const file of ['site.js', 'locale.js', 'central-config.js', 'central-collector.js', 'central-controls.js']) state.run(file);
  state.boot();
  return state;
}
(async () => {
  await test('hero wording and visible text follow the punctuation requirement', () => {
    const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    assert.ok(heading); assert.equal(plain(heading), 'CODE TO CREATE CODE TO PROTECT');
    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    const textNodes = [...body.matchAll(/>([^<>]+)</g)].map(m => m[1].trim()).filter(Boolean);
    const copyAttributes = [...body.matchAll(/\b(?:placeholder|aria-label|alt|title)="([^"]*)"/g)].map(m => m[1].trim());
    const offenders = [...textNodes, ...copyAttributes].filter(text => /[.!?。！？]$/.test(text));
    assert.deepEqual(offenders, [], 'visible text must not end in punctuation');
  });
  await test('product, feedback, privacy and development copy remains bilingual in source', () => {
    for (const id of ['ventures', 'premium', 'feedback', 'roadmap', 'community', 'contact']) {
      const section = html.match(new RegExp('<section\\b[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</section>'));
      assert.ok(section, id); assert.match(section[1], /lang="en"/, id);
    }
    for (const match of html.matchAll(/<(?:span|p|div)[^>]*class="[^"]*\btranslation\b[^"]*"[^>]*>/g)) assert.equal(attributes(match[0]).lang, 'en');
    assert.match(plain(html), /Dino Trails/); assert.match(html, /DEVELOPMENT DIRECTION|IN DEVELOPMENT|개발 방향/);
    assert.doesNotMatch(html, /Dino Trails.{0,60}(?:play now|available now|지금 플레이|출시 완료)/i);
    assert.match(html, /Review and send/);
  });
  await test('language choice updates document and controls without persisting a preference or sending data', () => {
    const state = browser(); const events = [];
    state.context.addEventListener('orvantro-language-change', event => events.push(event.detail));
    state.run('locale.js');
    state.choices[1].dispatch('click');
    assert.equal(state.document.documentElement.dataset.language, 'en'); assert.equal(state.document.documentElement.lang, 'en');
    assert.equal(state.choices[1].getAttribute('aria-pressed'), 'true'); assert.equal(state.choices[0].getAttribute('aria-pressed'), 'false');
    assert.equal(events.at(-1)?.language, 'en');
    state.choices[0].dispatch('click'); assert.equal(state.document.documentElement.lang, 'ko');
    assert.equal(state.context.localStorage.map.size, 0); assert.equal(state.context.sessionStorage.map.size, 0); assert.equal(state.requests.length, 0);
  });
  await test('language choice translates form labels and accessible attributes while preserving submitted option values', () => {
    const state = browser();
    const accessibleLabels = state.nodes.filter(node => node.hasAttribute('data-en-aria-label')).map(node => ({node, original: node.getAttribute('aria-label')}));
    assert.ok(accessibleLabels.length > 0);
    state.run('locale.js');
    const options = state.nodes.filter(node => node.tagName === 'OPTION' && node.hasAttribute('data-en'));
    const values = options.map(option => option.getAttribute('value'));
    state.choices[1].dispatch('click');
    assert.equal(state.ids.get('fb-body').getAttribute('placeholder'), state.ids.get('fb-body').getAttribute('data-en-placeholder'));
    assert.equal(state.ids.get('main-nav').getAttribute('aria-label'), 'Main navigation');
    accessibleLabels.forEach(({node}) => assert.equal(node.getAttribute('aria-label'), node.getAttribute('data-en-aria-label')));
    options.forEach(option => assert.equal(option.textContent, option.getAttribute('data-en')));
    assert.deepEqual(options.map(option => option.getAttribute('value')), values);
    state.choices[0].dispatch('click');
    accessibleLabels.forEach(({node, original}) => assert.equal(node.getAttribute('aria-label'), original));
    options.forEach(option => assert.equal(option.textContent, option.getAttribute('data-ko')));
    assert.deepEqual(options.map(option => option.getAttribute('value')), values);
  });
  await test('central settings remain in a closed native footer disclosure in both languages', () => {
    const state = controls(), settings = state.ids.get('data-settings');
    const disclosure = settings.closest('details') || settings.querySelector('details');
    assert.ok(disclosure); assert.ok(disclosure.closest('footer'));
    assert.equal(disclosure.querySelector('summary').querySelector('.translation').getAttribute('lang'), 'en');
    for (const id of ['central-allow', 'central-deny', 'central-consent-status']) assert.equal(state.ids.get(id).closest('details'), disclosure);
    for (const choice of [state.choices[1], state.choices[0]]) {
      choice.dispatch('click');
      assert.equal(disclosure.open, false, 'language choice must not open settings');
      assert.equal(state.context.OrvantroCentral.getStatus().consent, false);
      assert.equal(state.context.OrvantroAnalytics, undefined);
      assert.equal(state.ids.has('analytics-toggle'), false);
    }
    assert.equal(state.requests.length, 0);
    assert.deepEqual(state.context.localStorage.mutations, []);
    assert.deepEqual(state.context.sessionStorage.mutations, []);
  });
  await test('central controls expose localized state and preserve consent/withdrawal behavior', async () => {
    const state = controls(), allow = state.ids.get('central-allow'), deny = state.ids.get('central-deny'), status = state.ids.get('central-consent-status');
    assert.equal(allow.disabled, false); assert.equal(deny.disabled, true);
    assert.equal(state.requests.length, 0); assert.equal(state.context.OrvantroAnalytics, undefined);
    state.choices[1].dispatch('click'); assert.doesNotMatch(status.textContent, /[가-힣]/); assert.match(status.textContent, /off|consent/i);
    allow.dispatch('click'); await settle(); assert.equal(allow.disabled, true); assert.equal(deny.disabled, false); assert.equal(allow.getAttribute('aria-pressed'), 'true');
    assert.equal(state.requests.length, 1);
    assert.doesNotMatch(status.textContent, /[가-힣]/); assert.doesNotMatch(status.textContent, /[.!?]$/);
    state.choices[0].dispatch('click'); assert.match(status.textContent, /방문|통계|집계|조회/);
    deny.dispatch('click'); assert.equal(allow.disabled, false); assert.equal(deny.disabled, true); assert.equal(allow.getAttribute('aria-pressed'), 'false');
    assert.equal(state.context.OrvantroCentral.getStatus().consent, false);
    assert.equal(state.context.sessionStorage.getItem('orvantro_central_tab_session_v2:orvantro'), null);
    state.document.dispatch('visibilitychange'); await settle(); assert.equal(state.requests.length, 1);
  });
  await test('privacy preference disables central consent controls and is explained in English', () => {
    const state = controls({ navigator: { doNotTrack: '1' } }); state.choices[1].dispatch('click');
    assert.equal(state.ids.get('central-allow').disabled, true);
    assert.match(state.ids.get('central-consent-status').textContent, /privacy|tracking/i); assert.equal(state.requests.length, 0);
  });
  console.log(`${passed} bilingual and accessibility-contract checks passed (Node VM and source checks; browser layout checked separately)`);
})().catch(error => { console.error(error); process.exitCode = 1; });
