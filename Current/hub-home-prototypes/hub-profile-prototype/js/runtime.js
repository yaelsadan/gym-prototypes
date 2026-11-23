// Small runtime for the exported canvas components: {{holes}}, <sc-if>, <sc-for>, on* events, ref callbacks.
(function () {
  window.DCLogic = class { constructor(props){ this.props = props || {}; this.state = {}; }
    setState(o){ const n = typeof o === 'function' ? o(this.state) : o; Object.assign(this.state, n); if (this.__sched) this.__sched(); } };
  const HOLE = /^\{\{\s*([\w.]+)\s*\}\}$/;
  function look(scope, path){ if (path === 'true') return true; if (path === 'false') return false; return path.split('.').reduce((a, k) => a == null ? undefined : a[k], scope); }
  function subst(str, scope){ return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p) => { const v = look(scope, p); return v == null ? '' : String(v); }); }
  const EV = { change: 'input', click: 'click', scroll: 'scroll', keydown: 'keydown', input: 'input' };
  const SVG = 'http://www.w3.org/2000/svg';
  function render(node, scope, refs, out){
    if (node.nodeType === 3){ out.push(document.createTextNode(subst(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-if'){ const m = HOLE.exec(node.getAttribute('value') || ''); if (m && look(scope, m[1])) node.childNodes.forEach(c => render(c, scope, refs, out)); return; }
    if (tag === 'sc-for'){ const m = HOLE.exec(node.getAttribute('list') || ''); const list = (m && look(scope, m[1])) || []; const as = node.getAttribute('as');
      list.forEach(it => { const s = Object.create(scope); s[as] = it; node.childNodes.forEach(c => render(c, s, refs, out)); }); return; }
    const el = node.namespaceURI === SVG ? document.createElementNS(SVG, node.localName) : document.createElement(tag);
    for (const a of Array.from(node.attributes)){
      const name = a.name, val = a.value, whole = HOLE.exec(val);
      if (name.startsWith('hint-')) continue;
      if (name.startsWith('on') && whole){ const fn = look(scope, whole[1]); if (typeof fn === 'function') el.addEventListener(EV[name.slice(2)] || name.slice(2), e => fn(e)); continue; }
      if (name === 'ref' && whole){ refs.push([whole[1], look(scope, whole[1]), el]); continue; }
      const v = subst(val, scope);
      if (name === 'value' && (tag === 'input' || tag === 'textarea')){ el.value = v; el.setAttribute('value', v); continue; }
      if (name === 'checked'){ const b = whole ? !!look(scope, whole[1]) : true; el.checked = b; if (b) el.setAttribute('checked', ''); continue; }
      try { el.setAttribute(name, v); } catch (e) {}
    }
    const kids = []; node.childNodes.forEach(c => render(c, scope, refs, kids)); kids.forEach(k => el.appendChild(k));
    if (tag === 'textarea' && !node.hasAttribute('value')) el.value = el.textContent;
    out.push(el);
  }
  function pathOf(el, root){ const p = []; while (el && el !== root){ p.unshift(Array.prototype.indexOf.call(el.parentNode.childNodes, el)); el = el.parentNode; } return el === root ? p : null; }
  function atPath(root, p){ let el = root; for (const i of p){ if (!el || !el.childNodes[i]) return null; el = el.childNodes[i]; } return el; }
  window.mountComponent = function (def, props, root){
    const st = document.createElement('style'); st.textContent = def.css; document.head.appendChild(st);
    const tpl = new DOMParser().parseFromString('<!doctype html><body><x-dc>' + def.template + '</x-dc></body>', 'text/html').querySelector('x-dc');
    const Component = new Function('DCLogic', def.script + '\nreturn Component;')(window.DCLogic);
    const comp = new Component(props); comp.props = props;
    const scrolls = {}; let pending = false, refsNow = [];
    function draw(){
      refsNow.forEach(([n, , el]) => { scrolls[n] = el.scrollTop; });
      const a = document.activeElement, fp = a && root.contains(a) ? pathOf(a, root) : null;
      const sel = fp && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
      const refs = [], out = [];
      const scope = Object.assign({}, comp.renderVals());
      tpl.childNodes.forEach(c => render(c, scope, refs, out));
      root.replaceChildren(...out);
      refs.forEach(([n, fn, el]) => { if (typeof fn === 'function') fn(el); if (scrolls[n] != null) el.scrollTop = scrolls[n]; });
      refsNow = refs;
      if (fp){ const t = atPath(root, fp); if (t && t.focus){ t.focus({ preventScroll: true }); if (sel && 'setSelectionRange' in t) try { t.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
    }
    comp.__sched = () => { if (pending) return; pending = true; Promise.resolve().then(() => { pending = false; const prev = Object.assign({}, comp.props); draw(); if (comp.componentDidUpdate) comp.componentDidUpdate(prev); }); };
    draw(); if (comp.componentDidMount) comp.componentDidMount();
    return comp;
  };
})();
