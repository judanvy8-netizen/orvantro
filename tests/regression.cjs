'use strict';
const assert = require('node:assert/strict');
const { read, attributes, browser, settle } = require('./helpers.cjs');
const html = read('index.html');
let passed = 0;
async function test(name, run) { await run(); passed++; console.log('PASS', name); }
function analytics(options = {}) {
  const state = browser(options);
  state.context.ORVANTRO_ANALYTICS = { site: 'orvantro' };
  state.run('orvantro-analytics.js');
  state.run('central-config.js');
  state.run('central-collector.js');
  state.boot();
  return state;
}
(async () => {
  await test('main content and fragment destinations are available without an entry gate', () => {
    const main = html.match(/<main\b[^>]*>/i)?.[0];
    assert.ok(main); assert.equal(Object.hasOwn(attributes(main), 'inert'), false);
    assert.doesNotMatch(html, /id="(?:intro-ui|webgl-canvas)"/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'duplicate ids');
    for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      if (href.startsWith('#')) assert.ok(ids.includes(decodeURIComponent(href.slice(1))), href);
      else assert.match(href, /^(https:\/\/|mailto:)/);
    }
    for (const id of ['main-content', 'ventures', 'premium', 'feedback', 'roadmap', 'community', 'contact', 'data-settings', 'central-allow', 'central-deny']) assert.ok(ids.includes(id), id);
  });
  await test('beta, premium, social and contact targets retain their canonical addresses', () => {
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)];
    const hrefs = links.map(m => m[1]);
    for (const url of ['https://judanvy8-netizen.github.io/marginkit-pro-beta/', 'https://judanvy8-netizen.github.io/marginkit-pro-beta/#premium', 'https://judanvy8-netizen.github.io/orvantro-insights/', 'https://www.youtube.com/@ORVANTRO', 'https://x.com/orvantro', 'https://discord.gg/zu9W5uWmrr', 'https://www.instagram.com/orvantro', 'mailto:orvantro@gmail.com']) assert.ok(hrefs.includes(url), url);
    for (const link of links) if (attributes(link[0]).target === '_blank') {
      const rel = attributes(link[0]).rel?.split(/\s+/); assert.ok(rel?.includes('noopener') && rel.includes('noreferrer'));
    }
  });
  await test('scripts and assets stay local while CSP permits only the existing collection origin', () => {
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    assert.match(csp, /script-src 'self';/); assert.doesNotMatch(csp, /script-src[^;]*(?:unsafe-inline|unsafe-eval)/);
    const connect = csp.match(/connect-src ([^;]+)/)[1].trim().split(/\s+/);
    assert.deepEqual(connect, ["'self'", 'https://orvantro-insights-api.orvantro.workers.dev']);
    for (const [, raw, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) { const attrs = attributes(raw); assert.ok(attrs.src?.startsWith('./')); assert.equal(body.trim(), ''); }
    assert.doesNotMatch(html, /\son(?:click|submit|keydown|load|error)=/i);
  });
  await test('feedback retains deliberate mail composition and excludes private URL parts', () => {
    assert.ok(html.includes('id="feedback-form"'));
    for (const name of ['product', 'rating', 'email', 'body']) assert.ok(html.includes('name="' + name + '"'));
    const state = browser(); state.run('site.js');
    state.context.orvantroSubmitFeedback({ product: 'MarginKit', rating: '만족', email: 'user@example.com', body: '한국어 & newline\nsecond line' });
    const target = new URL(state.context.location.href);
    assert.equal(target.protocol, 'mailto:'); assert.equal(target.pathname, 'orvantro@gmail.com');
    assert.ok(target.searchParams.get('body').includes('한국어 & newline\nsecond line'));
    assert.equal(target.searchParams.get('body').includes('secret=private'), false);
    assert.equal(state.requests.length, 0);
  });
  await test('homepage scripts do not load local diagnostics or mutate existing records before central consent', async () => {
    const files = [...html.matchAll(/<script\b([^>]*)>/g)].map(match => attributes(match[1]).src?.replace(/^\.\//, '').split('?')[0]);
    assert.ok(files.length > 0);
    assert.ok(!files.includes('orvantro-analytics.js'));
    // Previously enabled local history, including old records, must remain untouched
    const priorLocal = {
      orvantro_local_analytics_enabled_v2: 'yes',
      orvantro_local_analytics_v2: JSON.stringify([{ t: 1, site: 'orvantro', type: 'orvantro_pageview', path: '/' }]),
      unrelated: 'retained'
    };
    for (const local of [{}, priorLocal]) {
      const session = { unrelated: 'retained' }, state = browser({ local, session });
      // Run the actual homepage script list at defer readiness, including UI scripts
      state.document.readyState = 'interactive';
      files.forEach(file => state.run(file));
      state.boot(); state.flushFrames(); await settle();
      assert.equal(state.context.OrvantroAnalytics, undefined, 'local diagnostics must not auto-load');
      assert.equal(state.ids.has('analytics-toggle'), false);
      assert.equal(state.ids.has('analytics-status'), false);
      assert.equal(state.context.OrvantroCentral.getStatus().status, 'needs-consent');
      assert.equal(state.requests.length, 0);
      assert.deepEqual(Object.fromEntries(state.context.localStorage.map), local);
      assert.deepEqual(Object.fromEntries(state.context.sessionStorage.map), session);
      assert.deepEqual(state.context.localStorage.mutations, [], 'no initialization writes or deletion');
      assert.deepEqual(state.context.sessionStorage.mutations, []);
    }
  });
  await test('both independent analytics modes are off by default with no network request', async () => {
    const state = analytics(); await settle();
    assert.equal(state.context.OrvantroAnalytics.isEnabled(), false);
    assert.equal(state.context.OrvantroCentral.getStatus().consent, false);
    assert.equal(state.context.OrvantroCentral.getStatus().configured, true);
    assert.equal(state.context.OrvantroCentral.getStatus().status, 'needs-consent');
    assert.equal(state.requests.length, 0); assert.equal(state.context.localStorage.map.size, 0);
  });
  await test('local consent records once without enabling central collection or preserving URL data', () => {
    const state = analytics(), api = state.context.OrvantroAnalytics;
    assert.equal(api.setEnabled(true), true); api.setEnabled(true); api.track('pageview', { secret: 'private' });
    const rows = JSON.parse(JSON.stringify(api.getRing())); assert.equal(rows.length, 1);
    assert.deepEqual(Object.keys(rows[0]).sort(), ['path', 'site', 't', 'type']);
    assert.equal(rows[0].path, '/'); assert.equal(rows[0].site, 'orvantro');
    assert.equal(state.context.OrvantroCentral.getStatus().consent, false); assert.equal(state.requests.length, 0);
    api.setEnabled(false); assert.equal(api.track('pageview'), false);
  });
  await test('local records enforce retention and strip unexpected fields', () => {
    const now = Date.now();
    const records = [
      { t: now - 31 * 86400000, site: 'orvantro', type: 'orvantro_pageview' },
      { t: now, site: 'unknown', type: 'orvantro_pageview' },
      { t: now + 60000, site: 'orvantro', type: 'orvantro_pageview' },
      { t: now, site: 'orvantro', type: 'orvantro_pageview', path: '/secret?token=private', extra: 'private' }
    ];
    const state = analytics({ local: { orvantro_local_analytics_v2: JSON.stringify(records) } });
    const rows = JSON.parse(JSON.stringify(state.context.OrvantroAnalytics.getRing()));
    assert.equal(rows.length, 1); assert.deepEqual(rows[0], { t: now, type: 'orvantro_pageview', site: 'orvantro', path: '/' });
    assert.equal(state.requests.length, 0);
  });
  await test('central consent sends only the minimized payload once and withdrawal clears its session', async () => {
    const state = analytics(), api = state.context.OrvantroCentral;
    api.setConsent(true); await settle();
    assert.equal(state.requests.length, 1); const request = state.requests[0], payload = JSON.parse(request.body);
    assert.equal(request.url, 'https://orvantro-insights-api.orvantro.workers.dev/collect');
    assert.deepEqual(Object.keys(payload).sort(), ['eventId', 'sessionId', 'site', 'v']);
    assert.equal(payload.site, 'orvantro'); assert.equal(payload.v, 2); assert.equal(request.credentials, 'omit'); assert.equal(request.referrerPolicy, 'no-referrer');
    assert.equal(api.getStatus().status, 'sent');
    api.setConsent(true); state.document.dispatch('visibilitychange'); await settle(); assert.equal(state.requests.length, 1);
    assert.equal(state.context.OrvantroAnalytics.isEnabled(), false);
    api.setConsent(false); assert.equal(api.getStatus().consent, false);
    assert.equal(state.context.sessionStorage.getItem('orvantro_central_tab_session_v2:orvantro'), null);
    state.document.dispatch('visibilitychange'); await settle(); assert.equal(state.requests.length, 1);
  });
  await test('browser privacy signals override existing central consent', async () => {
    for (const navigator of [{ globalPrivacyControl: true }, { doNotTrack: '1' }]) {
      const state = analytics({ navigator, local: { 'orvantro_central_consent_v2:orvantro': 'yes' } });
      state.context.OrvantroCentral.setConsent(true); await settle();
      assert.equal(state.context.OrvantroCentral.getStatus().status, 'privacy-preference'); assert.equal(state.requests.length, 0);
    }
  });
  await test('failed collection does not automatically retry on visibility changes', async () => {
    const state = analytics({ networkError: true }); state.context.OrvantroCentral.setConsent(true); await settle();
    assert.equal(state.context.OrvantroCentral.getStatus().status, 'error');
    state.document.dispatch('visibilitychange'); state.document.dispatch('prerenderingchange'); await settle();
    assert.equal(state.requests.length, 1);
  });
  await test('unavailable browser storage keeps both analytics modes inactive', async () => {
    const state = analytics({ blockedStorage: true });
    assert.equal(state.context.OrvantroAnalytics.setEnabled(true), false);
    assert.equal(state.context.OrvantroCentral.setConsent(true), false); await settle();
    assert.equal(state.context.OrvantroCentral.getStatus().consent, false); assert.equal(state.requests.length, 0);
  });
  console.log(`${passed} functional regression checks passed (Node VM and source checks; no live analytics requests)`);
})().catch(error => { console.error(error); process.exitCode = 1; });
