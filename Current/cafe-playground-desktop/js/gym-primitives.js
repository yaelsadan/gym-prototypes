/* ============================================================================
   GYM PRIMITIVES — shared component builders
   ----------------------------------------------------------------------------
   Ported from the Gym prototypes. Product-neutral: no Cafe or Gym flow logic
   may live here. Everything hangs off one global, GP.

   Sources:
     icon set, hubTipAttrs, initHubTips  ->  student-transition-screens-desktop
     vtClock geometry                    ->  student-practice-rooms-desktop
     tile / footer capsule / modal       ->  student-practice-rooms-desktop
     chat panel markup                   ->  student-main-classroom-desktop
   ========================================================================= */

var GP = (function(){
  'use strict';

  /* ------------------------------------------------------------- icons */
  var I = {
    x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5-3v10l-5-3v-4zM2 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2z"/></svg>',
    mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    blur:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3"/><path d="M6.2 19c1.1-2.8 3.1-4.2 5.8-4.2s4.7 1.4 5.8 4.2"/><path d="M19.2 4.2l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z"/></svg>',
    send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-9 8.3 9 9 0 01-4-1L3 20l1.2-4A8.5 8.5 0 1121 11.5z"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    leave:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>',
    spark:'<svg class="spark" viewBox="0 0 33 33" fill="none"><path d="M16.1513 28.2524C14.6504 22.2425 9.89137 17.5435 3.87845 16.1079C9.85567 14.5552 14.556 9.85523 16.1085 3.8779C17.5439 9.89115 22.2428 14.6499 28.2529 16.1508C22.3122 17.6363 17.6371 22.3118 16.1513 28.2524Z" fill="#F9E24C" stroke="#373230"/></svg>'
  };

  /* ------------------------------------------------------- level palette */
  /* SWATCHES ONLY. This is not a ladder and carries no ordering.
     Source: Checkpoints/student-main-classroom-mobile/docs/TIMELINE_PARTICIPANTS_SHEETS_V1.md,
     which labels it "Level palette (real — sampled)" and states "Not in the
     Design Bible yet". Docs/gym-functional-flow-contract-v1.md additionally
     excludes anything under Checkpoints/ from source of truth.
     So: use this to paint a dot next to a level name. Do not read a sequence,
     a count, a lowest/highest, or a progression out of it. Level ORDER is
     product data and lives with the product that needs it. */
  var LEVEL_PALETTE = {
    red:       {label:'Red',        color:'#F9746B'},
    orange:    {label:'Orange',     color:'#F69601'},
    pink:      {label:'Pink',       color:'#F7A9F4'},
    yellow:    {label:'Yellow',     color:'#FEE300'},
    lightblue: {label:'Light Blue', color:'#90C7FD'},
    blue:      {label:'Blue',       color:'#449CFD'},
    lime:      {label:'Lime',       color:'#D9EF82'},
    green:     {label:'Green',      color:'#7EE07D'},
    darkgreen: {label:'Dark Green', color:'#6E8C58'},
    turquoise: {label:'Turquoise',  color:'#6BBEC4'},
    indigo:    {label:'Indigo',     color:'#8A90FE'}
  };
  function levelMeta(id){
    return LEVEL_PALETTE[id] || {label:String(id||'Unknown'), color:'#9A938C'};
  }
  /* Charcoal-stroked level dot. Same treatment as the Gym Participants row. */
  function levelDot(id){
    return '<span class="level-dot" style="background:' + levelMeta(id).color + '" aria-hidden="true"></span>';
  }

  /* ------------------------------------------------------------ helpers */
  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function mmss(sec){
    sec = Math.max(0, sec|0);
    var m = Math.floor(sec/60), s = sec%60;
    return m + ':' + (s<10?'0':'') + s;
  }
  function initial(name){
    return String(name||'?').trim().charAt(0).toUpperCase();
  }
  /* Canonical hover tooltip contract. */
  function hubTipAttrs(label, wide){
    var safe = String(label).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    return ' data-hub-tip="'+safe+'" aria-label="'+safe+'"' + (wide?' data-hub-wide':'');
  }

  /* -------------------------------------------------------------- tiles */
  /* opts: { alt, turn, camOff, micOff, corner } */
  function tile(name, opts){
    opts = opts || {};
    var cls = 'g-tile'
      + (opts.alt ? ' alt' : '')
      + (opts.turn ? ' turn' : '')
      + (opts.camOff ? ' cam-off' : '');
    var inner = '<span class="who">' + esc(name) + '</span>';
    if(opts.camOff) inner += '<span class="av-big">' + initial(name) + '</span>';
    if(opts.micOff) inner += '<span class="tile-flag">' + I.mic + 'Mic off</span>';
    if(opts.corner) inner += '<div class="tile-corner">' + opts.corner + '</div>';
    return '<div class="' + cls + '">' + inner + '</div>';
  }

  /* -------------------------------------------------------- self-view */
  /* opts: { camOff, micOff, blur, label } */
  function preview(opts){
    opts = opts || {};
    var cls = 'preview'
      + (opts.camOff ? ' cam-off' : '')
      + (!opts.micOff ? ' mic-on' : '')
      + (opts.blur ? ' is-blur' : '');
    var inner = '<div class="vid"></div>'
      + '<span class="you">' + esc(opts.label || 'You') + '</span>';
    if(opts.camOff){
      inner += '<span class="av-face">' + initial(opts.label || 'You') + '</span>'
        + '<span class="camoff-cap">Camera off</span>';
    }
    inner += '<span class="lvl"><i></i><i></i><i></i><i></i><i></i></span>';
    return '<div class="' + cls + '">' + inner + '</div>';
  }

  /* Camera / mic / blur cluster used by the A/V check card. */
  function avTools(state, handlers){
    handlers = handlers || {};
    return '<div class="av-tools">'
      + '<button class="cbtn" onclick="' + (handlers.cam||'') + '"' + hubTipAttrs('Camera') + '>'
        + I.cam + (state.camOff ? '<span class="slash"></span>' : '') + '</button>'
      + '<button class="cbtn" onclick="' + (handlers.mic||'') + '"' + hubTipAttrs('Microphone') + '>'
        + I.mic + (state.micOff ? '<span class="slash"></span>' : '') + '</button>'
      + '<button class="cbtn' + (state.blur?' blur-on':'') + '" onclick="' + (handlers.blur||'') + '"' + hubTipAttrs('Blur background') + '>'
        + I.blur + '</button>'
      + '</div>';
  }

  /* ------------------------------------------------------------ timers */
  /* Ring timer. r=26.5 in a 64 viewBox, so the circumference is 166.5.
     Fill-forward: the yellow arc grows, coral takes over in the last 5s. */
  var CIRC = 166.50;
  function vtClock(sec, total, size){
    var s = Math.max(0, sec|0);
    var t = Math.max(1, total|0);
    var frac = Math.min(1, Math.max(0, (t - s) / t));
    var off = CIRC * (1 - frac);
    var ang = -Math.PI/2 + frac * Math.PI * 2;
    var bx = (32 + 26.5 * Math.cos(ang)).toFixed(2);
    var by = (32 + 26.5 * Math.sin(ang)).toFixed(2);
    var warn = s <= 5 ? ' warn' : '';
    var one = String(s).length === 1 ? ' one' : '';
    return '<div class="clock vt3 ' + (size||'gl') + warn + '" style="--off:' + off.toFixed(2) + '">'
      + '<svg class="ring" viewBox="0 0 64 64">'
        + '<circle class="face" cx="32" cy="32" r="26.5"/>'
        + '<circle class="arc" cx="32" cy="32" r="26.5"/>'
        + '<circle class="ball" cx="' + bx + '" cy="' + by + '" r="4.6"/>'
      + '</svg>'
      + '<span class="num' + one + '">' + s + '</span>'
      + '</div>';
  }

  /* Ambient session time. Flat text, warms to yellow in the final stretch. */
  function timePill(sec, finalAt){
    var isFinal = typeof finalAt === 'number' && sec <= finalAt;
    return '<span class="g-timepill' + (isFinal?' final':'') + '">'
      + I.clock + '<span class="time">' + mmss(sec) + '</span></span>';
  }

  /* ------------------------------------------------------------ footer */
  /* items: array of { icon, label, on, slash, active, onclick }
     end:   optional { label, onclick } */
  function footer(items, end){
    var html = '<div class="g-footer"><div class="footer-capsule">';
    (items||[]).forEach(function(it){
      html += '<button class="rc-btn' + (it.active?' is-active':'') + '" onclick="' + (it.onclick||'') + '"'
        + hubTipAttrs(it.label) + '>' + it.icon
        + (it.slash ? '<span class="slash"></span>' : '') + '</button>';
    });
    html += '</div>';
    if(end){
      html += '<button class="footer-end" onclick="' + (end.onclick||'') + '">'
        + I.leave + '<span>' + esc(end.label) + '</span></button>';
    }
    return html + '</div>';
  }

  /* ------------------------------------------------------------- modal */
  /* opts: { title, body, note, actions:[{label,cls,onclick}], grace:10 } */
  function modal(opts){
    opts = opts || {};
    var html = '<div class="invite-overlay"><div class="invite milky" role="dialog" aria-modal="true">';
    if(opts.title) html += '<h4>' + opts.title + '</h4>';
    if(opts.body) html += '<p>' + opts.body + '</p>';
    if(opts.note) html += '<p class="priv">' + opts.note + '</p>';
    if(opts.actions && opts.actions.length){
      html += '<div class="acts">';
      opts.actions.forEach(function(a){
        html += '<button class="btn ' + (a.cls||'primary') + '" onclick="' + (a.onclick||'') + '">' + a.label + '</button>';
      });
      html += '</div>';
    }
    if(opts.grace) html += '<div class="respline s' + opts.grace + '"><i></i></div>';
    return html + '</div></div>';
  }

  /* ------------------------------------------------------------- toast */
  function toast(text){
    return '<div class="g-toast" role="status"><span class="d"></span>' + esc(text) + '</div>';
  }

  /* ---------------------------------------------------------- loading */
  function loadLine(){ return '<div class="t-loadline" aria-hidden="true"></div>'; }
  function loadDots(){ return '<div class="wl-dots" aria-hidden="true"><i></i><i></i><i></i></div>'; }
  function softLoading(on){
    return on ? '<div class="soft-loading-overlay"><div class="soft-loading-ball"></div></div>' : '';
  }
  function progressDots(total, index){
    var html = '<div class="w-dots" aria-hidden="true">';
    for(var i=0;i<total;i++){
      html += '<i class="' + (i<index?'done':(i===index?'now':'')) + '"></i>';
    }
    return html + '</div>';
  }

  /* -------------------------------------------------------------- chat */
  /* messages: [{ from, own, text }] */
  function chatPanel(title, messages, handlers){
    handlers = handlers || {};
    var body = '';
    (messages||[]).forEach(function(m){
      body += '<div class="m' + (m.own?' own':'') + '">'
        + '<span class="av">' + initial(m.from) + '</span>'
        + '<div class="bd"><div class="nm">' + esc(m.from) + '</div>'
        + '<div class="tx">' + esc(m.text) + '</div></div></div>';
    });
    return '<div class="panel">'
      + '<div class="panel-head"><span class="pt">' + esc(title) + '</span>'
        + '<button class="pclose" onclick="' + (handlers.close||'') + '"' + hubTipAttrs('Close') + '>' + I.x + '</button></div>'
      + '<div class="panel-body" id="chatBody">' + body + '</div>'
      + '<div class="composer">'
        + '<input id="chatInput" placeholder="' + esc(handlers.placeholder || 'Say something…') + '" autocomplete="off">'
        + '<button class="send" onclick="' + (handlers.send||'') + '"' + hubTipAttrs('Send') + '>' + I.send + '</button>'
      + '</div></div>';
  }

  /* ----------------------------------------------------------- tooltips */
  /* Single floating layer inside #frame, positioned on pointerover. */
  function initHubTips(){
    var layer = null, active = null;
    function host(){ return document.getElementById('frame') || document.body; }
    function ensure(){
      var h = host();
      if(layer && layer.isConnected && layer.parentNode === h) return layer;
      if(layer && layer.parentNode) layer.parentNode.removeChild(layer);
      layer = document.createElement('div');
      layer.className = 'hub-tip-layer';
      layer.setAttribute('aria-hidden','true');
      h.appendChild(layer);
      return layer;
    }
    function hide(){ active = null; if(layer) layer.classList.remove('is-on'); }
    function place(el){
      var text = el.getAttribute('data-hub-tip');
      if(!text) return;
      var L = ensure(), h = host();
      var hr = h.getBoundingClientRect(), r = el.getBoundingClientRect();
      active = el;
      L.textContent = text;
      L.classList.toggle('is-wide', el.hasAttribute('data-hub-wide'));
      L.style.left = '0px'; L.style.top = '0px';
      L.classList.add('is-on');
      var left = (r.left + r.right)/2 - hr.left - L.offsetWidth/2;
      var top = r.top - hr.top - L.offsetHeight - 8;
      left = Math.max(6, Math.min(left, hr.width - L.offsetWidth - 6));
      if(top < 6) top = r.bottom - hr.top + 8;
      L.style.left = left + 'px';
      L.style.top = top + 'px';
    }
    document.addEventListener('pointerover', function(e){
      var el = e.target && e.target.closest ? e.target.closest('[data-hub-tip]') : null;
      if(!el){ if(active) hide(); return; }
      if(el !== active) place(el);
    });
    document.addEventListener('pointerdown', hide, true);
    window.addEventListener('scroll', hide, true);
  }

  return {
    I:I, esc:esc, mmss:mmss, initial:initial, hubTipAttrs:hubTipAttrs,
    LEVEL_PALETTE:LEVEL_PALETTE, levelMeta:levelMeta, levelDot:levelDot,
    tile:tile, preview:preview, avTools:avTools,
    vtClock:vtClock, timePill:timePill,
    footer:footer, modal:modal, toast:toast,
    loadLine:loadLine, loadDots:loadDots, softLoading:softLoading, progressDots:progressDots,
    chatPanel:chatPanel, initHubTips:initHubTips
  };
})();
