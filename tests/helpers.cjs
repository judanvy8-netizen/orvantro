'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m => [m[1], m[2] ?? m[3] ?? m[4] ?? '']));
}
function eventTarget() {
  const events = new Map();
  return {
    events,
    addEventListener(type, fn) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(fn); },
    removeEventListener(type, fn) { events.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of [...(events.get(event.type) || [])]) fn(event); return true; },
    dispatch(type, extras = {}) { return this.dispatchEvent({ type, target: this, currentTarget: this, preventDefault() {}, ...extras }); }
  };
}
function matches(el, selector) {
  const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
  if (tag && el.tagName !== tag.toUpperCase()) return false;
  const id = selector.match(/#([\w-]+)/)?.[1];
  if (id && !selector.includes('[href') && el.getAttribute('id') !== id) return false;
  for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!el.classList.contains(name)) return false;
  for (const [, key, op, value] of selector.matchAll(/\[([\w-]+)(?:(\^?=)["']?([^\]"']*)["']?)?\]/g)) {
    const actual = el.getAttribute(key); if (actual === null) return false;
    if (op === '=' && actual !== value) return false;
    if (op === '^=' && !actual.startsWith(value)) return false;
  }
  return true;
}
function descendants(el) { return el.children.flatMap(child => [child, ...descendants(child)]); }
function element(tagName = 'DIV', attrs = {}) {
  const classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
  const el = {
    ...eventTarget(), tagName, attrs: { ...attrs }, dataset: {}, style: { setProperty(key, value) { this[key] = String(value); } }, hidden: false, disabled: false, inert: false,
    textContent: '', children: [], childNodes: [], parentElement: null,
    classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle(x, on) { const yes = on ?? !classes.has(x); yes ? classes.add(x) : classes.delete(x); return yes; } },
    get id() { return this.getAttribute('id') || ''; },
    set id(value) { this.setAttribute('id', value); },
    get open() { return this.hasAttribute('open'); },
    set open(value) { value ? this.setAttribute('open', '') : this.removeAttribute('open'); },
    getAttribute(key) { return this.attrs[key] ?? null; },
    setAttribute(key, value) { this.attrs[key] = String(value); if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value); },
    hasAttribute(key) { return Object.hasOwn(this.attrs, key); },
    removeAttribute(key) { delete this.attrs[key]; },
    focus() { this.focused = true; }, scrollIntoView(options) { this.scrollOptions = options; (this.scrollCalls ||= []).push({ ...options }); },
    matches(selector) { return matches(this, selector); },
    closest(selector) { let node = this; while (node) { if (matches(node, selector)) return node; node = node.parentElement; } return null; },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) { return descendants(this).filter(node => selector.split(',').some(part => matches(node, part.trim()))); },
    get hash() { return new URL(this.getAttribute('href') || '', 'https://preview.invalid/').hash; },
    prepend(node) { this.childNodes.unshift(node); }, appendChild(node) { this.childNodes.push(node); return node; }, before() {},
    getBoundingClientRect() { return { top: 0, left: 0, width: 1000, height: 800, bottom: 800 }; }
  };
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}
function storage(initial = {}, blocked = false) {
  const map = new Map(Object.entries(initial));
  const mutations = [];
  return { map, mutations,
    getItem(key) { if (blocked) throw Error('storage unavailable'); return map.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('storage unavailable'); mutations.push(['set', key, String(value)]); map.set(key, String(value)); },
    removeItem(key) { if (blocked) throw Error('storage unavailable'); mutations.push(['remove', key]); map.delete(key); },
    clear() { mutations.push(['clear']); map.clear(); }
  };
}
function browser(options = {}) {
  const html = read('index.html');
  const nodes = [], stack = [];
  const voids = new Set(['AREA','BASE','BR','COL','EMBED','HR','IMG','INPUT','LINK','META','PARAM','SOURCE','TRACK','WBR']);
  for (const token of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)) {
    const tag = token[1].toUpperCase();
    if (token[0].startsWith('</')) { const at = stack.map(node => node.tagName).lastIndexOf(tag); if (at >= 0) stack.length = at; continue; }
    const node = element(tag, attributes(token[0])); nodes.push(node);
    if (stack.length) { node.parentElement = stack.at(-1); node.parentElement.children.push(node); }
    if (!voids.has(tag) && !token[0].endsWith('/>')) stack.push(node);
  }
  const ids = new Map(nodes.filter(el => el.hasAttribute('id')).map(el => [el.getAttribute('id'), el]));
  const choices = nodes.filter(el => el.hasAttribute('data-language-choice'));
  const document = { ...eventTarget(), readyState: 'loading', visibilityState: 'visible', prerendering: false,
    documentElement: element('HTML', { lang: 'ko' }), body: element('BODY'), activeElement: null,
    getElementById: id => ids.get(id) || null,
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) { if (selector === '.translation') return []; return nodes.filter(node => selector.split(',').some(part => matches(node, part.trim()))); },
    createElement: tag => element(tag.toUpperCase())
  };
  const requests = [];
  const frames = new Map();
  let frameId = 0, uuidId = 0;
  const context = { ...eventTarget(), document,
    localStorage: storage(options.local, options.blockedStorage), sessionStorage: storage(options.session, options.blockedStorage),
    navigator: { ...(options.navigator || {}) }, location: { origin: 'https://preview.invalid', pathname: '/', search: '?secret=private', hash: options.hash || '', href: 'https://preview.invalid/?secret=private' },
    URL, Date, console, Promise,
    crypto: { randomUUID() { return '12345678-1234-4123-8123-' + String(++uuidId).padStart(12, '0'); } },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    MutationObserver: class { observe() {} disconnect() {} },
    FormData: class { constructor(form) { this.form = form; } get(name) { return this.form[name] ?? ''; } },
    matchMedia() { return { ...eventTarget(), matches: !!options.reduced }; },
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn) { return setTimeout(fn, 0); }, clearTimeout,
    async fetch(url, init) { requests.push({ url, ...init }); if (options.networkError) throw Error('offline'); return { ok: true, json: async () => options.ack ?? { accepted: true } }; }
  };
  context.window = context;
  context.globalThis = context;
  const sandbox = vm.createContext(context);
  return { context, document, choices, ids, nodes, requests, frames,
    run(file) { vm.runInContext(read(file), sandbox, { filename: file }); },
    boot() { document.readyState = 'interactive'; document.dispatch('DOMContentLoaded'); context.dispatch('DOMContentLoaded'); },
    flushFrames() { for (const [id, fn] of [...frames]) { frames.delete(id); fn(1000); } }
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
module.exports = { root, read, attributes, browser, settle };
