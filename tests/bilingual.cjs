'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'site.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'site.js'), 'utf8');
let passed = 0;
function test(name, fn) { fn(); console.log('PASS', name); passed++; }
test('brand names remain English while Korean descriptions remain', () => {
  assert.match(html, /<title>ORVANTRO<\/title>/);
  assert.match(html, /property="og:title" content="ORVANTRO"/);
  assert.doesNotMatch(html, /오르반트로/);
  assert.match(html, /소프트웨어·게임·보안 기술/);
  assert.match(html, /Software · Games · Security/);
  assert.match(html, /Enterprise security products and services are future goals/);
  assert.match(html, /<html lang="ko"/);
});
test('all product and safety sections have English copy available without JavaScript', () => {
  for (const id of ['ventures', 'premium', 'feedback', 'roadmap', 'community', 'contact']) {
    const section = html.match(new RegExp('<section id="' + id + '"[^>]*>([\\s\\S]*?)</section>'));
    assert.ok(section, id); assert.match(section[1], /lang="en"/, id);
  }
  assert.match(html, /Off by default/);
  assert.match(html, /No data is sent to external analytics services/);
  assert.match(html, /Central server setup pending/);
  assert.match(html, /payments, subscriptions and transactions are not available/);
  assert.match(html, /Review and send the message yourself/);
});
test('English copy does not claim localization of calculations or browser certification', () => {
  assert.doesNotMatch(html, /all browsers supported|tax compliant|globally available|all currencies/i);
});
test('English text uses explicit language annotations', () => {
  const translations = [...html.matchAll(/<(?:span|p)[^>]*class="translation"[^>]*>/g)];
  assert.ok(translations.length >= 25);
  for (const match of translations) assert.match(match[0], /lang="en"/);
});
test('feedback still requires deliberate mail composition, not external submission', () => {
  assert.match(html, /<form id="feedback-form">/);
  for (const name of ['product', 'rating', 'email', 'body']) assert.match(html, new RegExp('name="' + name + '"'));
  assert.match(html, /value="매우 만족">매우 만족 \/ Very satisfied/);
  assert.match(html, /maxlength="2000" required/);
  assert.match(js, /window\.location\.href = 'mailto:orvantro@gmail.com/);
});
test('local visit-recording control explains both states in both languages', () => {
  for (const text of ['Enable local visit history', 'Disable local visit history', 'Recording only in this browser.', 'Visit recording is off.']) assert.ok(js.includes(text), text);
  assert.match(html, /aria-pressed="false"/);
});
test('internal fragment destinations exist and external links stay HTTPS or mailto', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    if (href.startsWith('#')) assert.ok(ids.has(href.slice(1)), href);
    else assert.match(href, /^(https:\/\/|mailto:)/);
  }
});
test('static responsive safeguards allow longer bilingual labels to wrap', () => {
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1.0"/);
  assert.match(css, /max-width: 640px/);
  assert.match(css, /\.btn \{ flex-direction: column;[^}]*max-width: 100%;[^}]*white-space: normal/);
  assert.match(css, /\.venture > \*, \.feedback-box \.grid > \* \{ min-width: 0; \}/);
});
test('network remains disabled until server deployment and central consent stays separate', () => {
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /id="central-allow"[^>]*disabled/);
  assert.match(fs.readFileSync(path.join(root, 'central-config.js'), 'utf8'), /enabled: false/);
  assert.doesNotMatch(html, /<script[^>]+src="https:/);
  assert.doesNotMatch(js, /navigator\.language|language.*localStorage|localStorage.*language/);
});
console.log(`${passed} bilingual baseline checks passed (static; not browser or device certification).`);
