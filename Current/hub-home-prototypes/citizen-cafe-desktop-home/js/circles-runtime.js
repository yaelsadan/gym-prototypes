/* Renderer for the Hub Circles modal. Same {{holes}}, sc-if, and sc-for behavior as the prototype.: {{holes}}, <sc-if>, <sc-for>, events, refs. No network. */
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    this.state = Object.assign({}, this.state, typeof patch === 'function' ? patch(this.state) : patch);
    schedule();
  };
  window.DCLogic = DCLogic;

  var inst, tplContent, root, pending = false;
  function get(scope, path) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false;
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }
  function interp(s, scope) {
    return s.replace(/\{\{([^}]+)\}\}/g, function (_, p) { var v = get(scope, p); return v == null || typeof v === 'function' ? '' : String(v); });
  }
  function holeName(v) { return v.replace(/[{}\s]/g, ''); }
  function render(node, scope, parent, refs, inSvg) {
    if (node.nodeType === 3) { parent.appendChild(document.createTextNode(interp(node.textContent, scope))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-if') { if (get(scope, holeName(node.getAttribute('value')))) node.childNodes.forEach(function (ch) { render(ch, scope, parent, refs, inSvg); }); return; }
    if (tag === 'sc-for') {
      var list = get(scope, holeName(node.getAttribute('list'))) || [], as = node.getAttribute('as');
      list.forEach(function (it, i) { var sc = Object.create(scope); sc[as] = it; sc.$index = i; node.childNodes.forEach(function (ch) { render(ch, sc, parent, refs, inSvg); }); });
      return;
    }
    var svg = inSvg || tag === 'svg';
    var el = svg ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
    for (var i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i];
      if (a.name.indexOf('hint-') === 0) continue;
      var ev = /^on([a-z]+)$/i.exec(a.name);
      if (ev) { var f = get(scope, holeName(a.value)); if (typeof f === 'function') el.addEventListener(ev[1].toLowerCase(), f); continue; }
      if (a.name === 'ref') { var r = get(scope, holeName(a.value)); if (typeof r === 'function') refs.push([r, el]); continue; }
      el.setAttribute(a.name, interp(a.value, scope));
    }
    node.childNodes.forEach(function (ch) { render(ch, scope, el, refs, svg); });
    parent.appendChild(el);
  }
  function paint() {
    pending = false;
    var keep = inst._body ? inst._body.scrollTop : 0;
    var refs = [], vals = inst.renderVals(), frag = document.createDocumentFragment();
    tplContent.childNodes.forEach(function (ch) { render(ch, vals, frag, refs, false); });
    root.replaceChildren(frag);
    refs.forEach(function (p) { p[0](p[1]); });
    if (inst._body) inst._body.scrollTop = keep;
    if (inst.componentDidUpdate) inst.componentDidUpdate();
    if (window.onCirclesPaint) window.onCirclesPaint(inst);
  }
  function schedule() { if (!pending && inst) { pending = true; requestAnimationFrame(paint); } }

  window.CirclesApp = {
    mount: function (Component, props) {
      tplContent = document.getElementById('circles-template').content;
      root = document.getElementById('circles-root');
      inst = new Component(props); inst.props = props;
      inst.measure = function () {};            /* QA measuring is off in the export */
      var refs = [], vals = inst.renderVals(), frag = document.createDocumentFragment();
      tplContent.childNodes.forEach(function (ch) { render(ch, vals, frag, refs, false); });
      root.replaceChildren(frag); refs.forEach(function (p) { p[0](p[1]); });
      if (inst.componentDidMount) inst.componentDidMount();
      return inst;
    },
    setState: function (st, after) { inst.state = Object.assign({}, inst.state, st); paint(); if (after) after(inst); },
    paintNow: paint,
    instance: function () { return inst; }
  };
})();
