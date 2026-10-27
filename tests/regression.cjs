const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'site.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'site.css'), 'utf8');
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS', name); }
function eventTarget() {
  const handlers = new Map();
  return {
    handlers,
    addEventListener(type, fn) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(fn); },
    removeEventListener(type, fn) { handlers.get(type)?.delete(fn); },
    dispatch(type, event = {}) { for (const fn of [...(handlers.get(type) || [])]) fn(event); },
  };
}
function node() {
  const classes = new Set();
  return { ...eventTarget(), style: {}, inert: false, focused: false, hidden: false, attrs: {},
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
    focus() { this.focused = true; }, setAttribute(key, value) { this.attrs[key] = value; },
    hasAttribute(key) { return Object.hasOwn(this.attrs, key); }, scrollIntoView(options) { this.scrollOptions = options; this.scrollCount = (this.scrollCount || 0) + 1; },
  };
}
function setup(options = {}) {
  const ids = new Map(['main-content', 'intro-ui', 'webgl-canvas', 'feedback-form', 'analytics-toggle', 'analytics-status', 'ventures', 'premium', 'feedback', 'roadmap', 'community', 'contact'].map(id => [id, node()]));
  const skip = node();
  const document = { ...eventTarget(), readyState: options.loading ? 'loading' : 'complete', documentElement: node(), body: node(), getElementById: id => ids.get(id), querySelector: () => skip };
  const stats = { render: 0, rendererDispose: 0, resourceDispose: 0, constructions: 0, setSize: 0 };
  const timers = [];
  const frames = new Map();
  let frameId = 0;
  class Object3D {
    constructor() { this.children = []; this.position = { x: 0, y: 0, z: 0 }; this.rotation = { x: 0, y: 0, z: 0 }; this.scale = { x: 1, y: 1, z: 1 }; }
    add(...children) { this.children.push(...children); }
    traverse(fn) { fn(this); for (const child of this.children) child.traverse(fn); }
    updateProjectionMatrix() {}
  }
  class Geometry {
    constructor() { this.attributes = {}; }
    setAttribute(key, value) { this.attributes[key] = value; }
    dispose() { stats.resourceDispose++; }
  }
  class Material { constructor(props) { Object.assign(this, props); } dispose() { stats.resourceDispose++; } }
  class Mesh extends Object3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
  class Renderer {
    constructor() { stats.constructions++; if (options.webglThrows) throw new Error('WebGL unavailable'); }
    setSize() { stats.setSize++; if (options.sizeThrows) throw new Error('Context failed during setup'); }
    setPixelRatio() {}
    render() { stats.render++; if (options.renderThrows) throw new Error('Context lost'); }
    dispose() { stats.rendererDispose++; }
  }
  const context = { ...eventTarget(), document, innerWidth: 1000, innerHeight: 800, devicePixelRatio: 1, location: { origin: 'https://orvantro.com', pathname: '/', search: '?token=secret', hash: options.hash || '#private' },
    matchMedia: () => ({ matches: !!options.reduced }),
    requestAnimationFrame(fn) { const id = ++frameId; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn) { timers.push(fn); return timers.length; },
    clearTimeout(id) { timers[id - 1] = null; },
    FormData: class { constructor(form) { this.form = form; } get(key) { return this.form[key] || ''; } },
  };
  context.window = context;
  if (!options.missingThree) context.THREE = { Scene: Object3D, Group: Object3D, PerspectiveCamera: Object3D, FogExp2: class {}, WebGLRenderer: Renderer,
    DodecahedronGeometry: Geometry, IcosahedronGeometry: Geometry, OctahedronGeometry: Geometry, BufferGeometry: Geometry,
    MeshBasicMaterial: Material, PointsMaterial: Material, Mesh, Points: Mesh, BufferAttribute: class { constructor(array) { this.array = array; } },
  };
  vm.runInNewContext(source, context);
  return { context, ids, skip, document, stats, frames, timers,
    flushFrames() { for (const [id, fn] of [...frames]) { frames.delete(id); fn(); } },
    flushTimers() { for (const fn of timers.splice(0)) if (fn) fn(); } };
}
function assertRevealed(state) {
  assert.equal(state.document.documentElement.classList.contains('intro-active'), false);
  assert.equal(state.ids.get('main-content').inert, false);
  assert.equal(state.ids.get('main-content').classList.contains('visible'), true);
  assert.equal(state.ids.get('main-content').focused, true);
}
test('missing THREE reveals accessible main content', () => assertRevealed(setup({ missingThree: true })));
test('WebGL constructor failure reveals main content', () => assertRevealed(setup({ webglThrows: true })));
test('partial setup failure releases renderer', () => {
  const state = setup({ sizeThrows: true });
  assertRevealed(state);
  assert.equal(state.stats.rendererDispose, 1);
});
test('render failure cancels already scheduled animation', () => {
  const state = setup({ renderThrows: true });
  assertRevealed(state);
  assert.equal(state.frames.size, 0);
  assert.equal(state.stats.rendererDispose, 1);
});
test('reduced motion never constructs WebGL', () => {
  const state = setup({ reduced: true });
  assertRevealed(state);
  assert.equal(state.stats.constructions, 0);
});
test('working intro makes only the intro interactive', () => {
  const state = setup();
  assert.equal(state.document.documentElement.classList.contains('intro-active'), true);
  assert.equal(state.ids.get('main-content').inert, true);
  assert.equal(state.ids.get('intro-ui').focused, true);
});
test('skip releases graphics resources and event handlers', () => {
  const state = setup();
  const queued = [...state.frames.values()][0];
  state.skip.dispatch('click');
  assertRevealed(state);
  assert.equal(state.frames.size, 0);
  assert.equal(state.stats.rendererDispose, 1);
  assert.equal(state.stats.resourceDispose, 8);
  assert.equal(state.context.handlers.get('resize').size, 0);
  assert.equal(state.context.handlers.get('mousemove').size, 0);
  const sizeBefore = state.stats.setSize;
  state.context.dispatch('resize');
  queued();
  assert.equal(state.stats.setSize, sizeBefore);
  assert.equal(state.frames.size, 0);
});
test('click warp terminates and repeated entry is harmless', () => {
  const state = setup();
  state.ids.get('intro-ui').dispatch('click');
  assert.equal(state.timers.length, 1);
  state.flushTimers();
  assertRevealed(state);
  state.context.enterStudio();
  assert.equal(state.stats.rendererDispose, 1);
  assert.equal(state.frames.size, 0);
});
for (const key of ['Enter', ' ']) test('keyboard entry: ' + JSON.stringify(key), () => {
  const state = setup(); let prevented = false;
  state.ids.get('intro-ui').dispatch('keydown', { key, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  state.flushTimers();
  assertRevealed(state);
});
test('skip before load prevents delayed intro takeover', () => {
  const state = setup({ loading: true });
  state.skip.dispatch('click');
  state.context.dispatch('load');
  assertRevealed(state);
  assert.equal(state.stats.constructions, 0);
});
test('no-JavaScript CSS leaves main content and social links visible', () => {
  assert.match(css, /#intro-ui\s*\{\s*display:\s*none;\s*\}\s*#main-content\s*\{\s*opacity:\s*1;\s*transform:\s*none;\s*pointer-events:\s*auto;\s*\}/);
  assert.doesNotMatch(html, /<html[^>]*class="[^"]*intro-active/);
  assert.doesNotMatch(html, /<main[^>]*\binert\b/);
});
test('four social targets exactly match user-provided URLs', () => {
  const actual = [...html.matchAll(/<a class="social-link"[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]);
  assert.deepEqual(actual, [
    'https://www.youtube.com/@ORVANTRO', 'https://x.com/orvantro',
    'https://discord.gg/zu9W5uWmrr', 'https://www.instagram.com/orvantro',
  ]);
  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert.match(match[0], /rel="noopener noreferrer"/);
  assert.match(html, /Discord/);
});
test('local assets and strict script policy avoid external dependencies and telemetry', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  for (const [, attributes, body] of scripts) {
    assert.match(attributes, /\bsrc=/);
    assert.equal(body.trim(), '');
    if (/src="https:/.test(attributes)) {
      assert.match(attributes, /integrity="sha384-[A-Za-z0-9+/=]+"/);
      assert.match(attributes, /crossorigin="anonymous"/);
    }
  }
  assert.doesNotMatch(html, /\son(?:click|submit|keydown|load|error)=/i);
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /connect-src 'none'/);
  assert.doesNotMatch(csp, /script-src[^;]*(?:unsafe-inline|unsafe-eval)/);
  assert.doesNotMatch(html, /(?:src|href)="https:\/\/(?:cdnjs|cdn\.jsdelivr|fonts\.)/);
  const icons = [...html.matchAll(/<img src="\.\/(assets\/icons\/[^\"]+\.svg)"[^>]*>/g)];
  assert.equal(icons.length, 4);
  for (const match of icons) {
    const icon = fs.readFileSync(path.join(root, match[1]), 'utf8');
    assert.match(icon, /<svg/);
    assert.doesNotMatch(icon, /<script|foreignObject|onload=|href=/i);
    assert.match(match[0], /alt=""/);
  }
});
test('feedback does not include query strings or fragments', () => {
  const state = setup({ missingThree: true });
  state.context.orvantroSubmitFeedback({ product: 'test', rating: 'ok', email: 'a@example.com', body: 'hello & bye' });
  const target = new URL(state.context.location.href);
  assert.equal(target.protocol, 'mailto:');
  assert.equal(target.pathname, 'orvantro@gmail.com');
  assert.ok(target.searchParams.get('body').includes('hello & bye'));
  assert.equal(target.searchParams.get('body').includes('token=secret'), false);
  assert.equal(target.searchParams.get('body').includes('#private'), false);
});
test('direct known anchors bypass intro and focus their accessible section', () => {
  for (const id of ['main-content', 'ventures', 'premium', 'feedback', 'roadmap', 'community', 'contact']) {
    const state = setup({ hash: '#' + id, loading: true });
    assertRevealed(state);
    assert.equal(state.ids.get(id).focused, true);
    assert.equal(state.ids.get(id).attrs.tabindex, '-1');
    assert.equal(state.ids.get(id).scrollOptions.block, 'start');
    assert.equal(state.stats.constructions, 0);
    state.context.dispatch('load');
    assert.equal(state.stats.constructions, 0);
  }
});
test('encoded valid anchors resolve while malformed or unknown fragments cannot throw', () => {
  assert.equal(setup({ hash: '#%63ommunity' }).ids.get('community').focused, true);
  for (const hash of ['#%E0%A4%A', '#%FF', '#__proto__', '#%3Cscript%3E']) {
    const state = setup({ hash });
    assert.equal(state.document.documentElement.classList.contains('intro-active'), true);
    assert.equal(state.ids.get('community').focused, false);
  }
});
test('hash navigation reveals section from an active intro', () => {
  const state = setup();
  state.context.location.hash = '#contact';
  state.context.dispatch('hashchange');
  assertRevealed(state);
  assert.equal(state.ids.get('contact').focused, true);
  assert.equal(state.frames.size, 0);
});
test('hash navigation during warp cancels delayed focus takeover', () => {
  const state = setup();
  state.ids.get('intro-ui').dispatch('click');
  state.context.location.hash = '#feedback';
  state.context.dispatch('hashchange');
  state.ids.get('main-content').focused = false;
  state.flushTimers();
  assert.equal(state.ids.get('feedback').focused, true);
  assert.equal(state.ids.get('main-content').focused, false);
  assert.equal(state.stats.rendererDispose, 1);
});
test('direct anchors are reapplied after load and browser page restoration', () => {
  const state = setup({ hash: '#community', loading: true });
  const target = state.ids.get('community');
  const initialCount = target.scrollCount;
  state.context.dispatch('load');
  state.context.dispatch('pageshow');
  target.scrollOptions = null; // Simulate native restoration replacing the early scroll.
  state.flushFrames();
  assert.equal(target.scrollOptions, null);
  state.flushFrames();
  assert.equal(target.scrollOptions.behavior, 'instant');
  assert.equal(target.scrollOptions.block, 'start');
  assert.ok(target.scrollCount > initialCount);
  assert.equal(state.stats.constructions, 0);
  assert.equal(state.frames.size, 0);
});
test('deferred restoration follows the latest valid fragment and ignores invalid fragments', () => {
  const state = setup({ hash: '#community', loading: true });
  state.context.dispatch('pageshow');
  state.context.location.hash = '#contact';
  state.flushFrames();
  state.flushFrames();
  assert.equal(state.ids.get('contact').scrollOptions.behavior, 'instant');
  const count = state.ids.get('community').scrollCount;
  state.context.dispatch('pageshow');
  state.context.location.hash = '#%FF';
  state.flushFrames();
  state.flushFrames();
  assert.equal(state.ids.get('community').scrollCount, count);
  assert.equal(state.frames.size, 0);
});
console.log(`${passed} homepage regression checks passed.`);
