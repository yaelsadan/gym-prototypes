/* ============================================================================
   GYM MOBILE PRIMITIVES  —  product-neutral
   ----------------------------------------------------------------------------
   The JavaScript half of the shared mobile language: icons, the phone chrome,
   the video-room shell, the A/V check block and the bottom-sheet builders,
   taken from the Gym mobile prototypes.

   Same boundary rule as gym-mobile.css: nothing here may name a product or
   encode a flow.
   ========================================================================= */
var GM = (function(){

  /* ---------------------------------------------------------------- icons */
  var I = {
    signal :'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 16h3v4H2zM7 12h3v8H7zM12 8h3v12h-3zM17 4h3v16h-3z"/></svg>',
    wifi   :'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 18a2 2 0 110 4 2 2 0 010-4zM5 11a10 10 0 0114 0l-2 2a7 7 0 00-10 0z"/></svg>',
    battery:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="7" width="18" height="10" rx="2.5"/><rect x="4" y="9" width="12" height="6" rx="1" fill="currentColor"/></svg>',
    x      :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    clock  :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cam    :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5-3v10l-5-3v-4zM2 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2z"/></svg>',
    mic    :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    blur   :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3"/><path d="M6.2 19c1.1-2.8 3.1-4.2 5.8-4.2s4.7 1.4 5.8 4.2"/><path d="M19.2 4.2l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z"/></svg>',
    shield :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.4-3 7.4-7 8.5C8 21.4 5 18.4 5 14V6z"/><path d="M12 8v4M12 15h.01"/></svg>',
    check  :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
    search :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    chat   :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a7.5 7.5 0 01-7.5 7.5H8l-4 2.5v-4.2A7.5 7.5 0 014.5 12 7.5 7.5 0 0112 4.5 7.5 7.5 0 0120 12z"/></svg>',
    wheel  :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
    bolt   :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13.4 2.5L4.8 13.4h6L10.6 21.5 19.2 10.6h-6z"/></svg>',
    send   :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12L4 5l3.6 7L4 19z"/><path d="M7.6 12h11.9"/></svg>',
    pin    :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    chevUp :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    chevRt :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    play   :'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause  :'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2"/></svg>',
    skipPrev:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4.2" y="5" width="2.2" height="14" rx=".6"/><path d="M19.4 5.1v13.8L7.4 12z"/></svg>',
    skipNext:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.6 5.1L16.6 12 4.6 18.9V5.1z"/><rect x="17.6" y="5" width="2.2" height="14" rx=".6"/></svg>',
    bookmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.8h10c.7 0 1.2.5 1.2 1.2V20l-6.2-3.3L5.8 20V5c0-.7.5-1.2 1.2-1.2z"/></svg>',
    cards  :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6.4" width="12.5" height="14.2" rx="2.4"/><path d="M8 3.4h9.4a2.4 2.4 0 012.4 2.4v10.4"/></svg>',
    sliders:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h10M18 8h2M4 16h4M12 16h8"/><circle cx="16" cy="8" r="2.2"/><circle cx="10" cy="16" r="2.2"/></svg>',
    headphone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0116 0v3"/><rect x="2.6" y="14" width="4.6" height="6.4" rx="2.1"/><rect x="16.8" y="14" width="4.6" height="6.4" rx="2.1"/></svg>'
  };

  /* -------------------------------------------------------------- helpers */
  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function mmss(sec){
    sec = Math.max(0, sec|0);
    var m = Math.floor(sec/60), s = sec%60;
    return (m<10?'0':'') + m + ':' + (s<10?'0':'') + s;
  }
  function initial(name){ return String(name||'?').trim().charAt(0).toUpperCase(); }

  /* ------------------------------------------------------- level palette */
  /* Sampled Gym level colours. Deliberately an unordered map: no ladder, no
     ordering, no count may be inferred from this object. */
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
  function levelMeta(id){ return LEVEL_PALETTE[id] || {label:String(id||'Unknown'), color:'#9A938C'}; }
  function levelDot(id){
    return '<span class="level-dot" style="background:' + levelMeta(id).color + '" aria-hidden="true"></span>';
  }

  /* ------------------------------------------------------- phone chrome */
  function statusbar(){
    return '<div class="statusbar"><span>9:41</span><span class="glyphs">'
      + I.signal + I.wifi + I.battery + '</span></div>';
  }
  /* mark: any inline SVG or <img> lockup mark supplied by the product layer */
  function lockup(mark, main, sub){
    return '<div class="session-lockup">' + (mark||'')
      + '<div class="session-id"><span class="id-main">' + esc(main) + '</span>'
      + (sub ? '<span class="id-sub">' + esc(sub) + '</span>' : '')
      + '</div></div>';
  }
  function avatarMark(src, alt){
    return '<span class="lockup-avatar"><img src="' + src + '" alt="' + esc(alt||'') + '"></span>';
  }

  /* ---------------------------------------------------------- A/V check */
  function preview(o){
    o = o || {};
    var inner = o.camOff
      ? '<span class="av-face">' + initial(o.label) + '</span><span class="camoff-cap">Camera off</span>'
      : '<div class="vid" style="background-image:url(\'' + o.img + '\')"></div>'
        + (o.blur ? '<div class="vid vid-subject" style="background-image:url(\'' + o.img + '\')"></div>' : '');
    return '<div class="av-preview' + (o.camOff?' cam-off':'') + (!o.camOff && o.blur ? ' is-blur':'') + '">' + inner + '</div>';
  }
  function avTools(st, on){
    function tool(icon, label, slash, cls, click, aria, echo){
      return '<div class="av-tool">'
        + (echo ? '<span class="av-mic-echo" aria-hidden="true"><i class="av-echo-ring"></i>'
            + '<i class="av-echo-ring d2"></i><i class="av-echo-ring d3"></i></span>' : '')
        + '<button class="av-control' + (cls||'') + '" type="button" onclick="' + click + '"'
        + ' aria-label="' + esc(aria) + '">' + icon + (slash?'<span class="slash"></span>':'') + '</button>'
        + '<span class="av-tool-label">' + esc(label) + '</span></div>';
    }
    return '<div class="av-tools">'
      + tool(I.cam,  'Camera', st.camOff, '',                    on.cam,  st.camOff?'Turn camera on':'Turn camera off')
      + tool(I.mic,  'Mic',    st.micOff, '',                    on.mic,  st.micOff?'Turn microphone on':'Turn microphone off', on.echo)
      + tool(I.blur, 'Blur',   false,     st.blur?' blur-on':'', on.blur, st.blur?'Turn background blur off':'Turn background blur on')
      + '</div>';
  }

  /* the Gym replay waveform. `progress` 0..1 fills bars yellow; `live` animates. */
  function wave(progress, live, cls){
    var h = [7,12,17,22,19,14,20,25,22,15,10,17,24,20,14,9,15,22,18,12,17,10,7,12,19];
    var out = '';
    for(var i = 0; i < h.length; i++){
      out += '<i class="' + ((i / h.length) < (progress||0) ? 'on' : '') + '" style="height:' + h[i] + 'px"></i>';
    }
    return '<div class="gm-wave' + (live?' is-live':'') + (cls?' '+cls:'') + '">' + out + '</div>';
  }

  /* -------------------------------------------------------- video room */
  /* Persistent room status. Keeps its own .tval node so a clock tick can write
     in place instead of re-rendering the frame. */
  function roomTime(sec, o){
    o = o || {};
    return '<div class="room-status">'
      + '<div class="room-time' + (o.final?' final':'') + '">'
        + I.clock + (o.cap ? '<span class="cap">' + esc(o.cap) + '</span>' : '')
        + '<span class="tval">' + mmss(sec) + '</span>'
      + '</div>'
      + (o.sub ? '<span class="room-sub">' + esc(o.sub) + '</span>' : '')
      + '</div>';
  }
  function roomHeader(status, onClose){
    return '<div class="header-scrim"></div><div class="rheader">' + (status||'')
      + '<button class="icon-btn" type="button" onclick="' + (onClose||'') + '" aria-label="Leave">' + I.x + '</button>'
      + '</div>';
  }
  /* one half of the vertical stack */
  function half(side, name, o){
    o = o || {};
    var cls = 'rhalf ' + side + (o.camOff?' cam-off':'');
    var bg  = o.camOff ? '' : (' style="background-image:url(\'' + o.img + '\')"');
    var body = o.camOff
      ? '<div class="camoff-body"><span class="av">' + initial(name) + '</span><span class="lbl">Camera off</span></div>'
      : '';
    var flag = o.micOff
      ? '<div class="flag"><span class="ic">' + I.mic + '<span class="sl"></span></span>Mic off</div>' : '';
    return '<div class="' + cls + '"' + bg + '>' + body
      + '<span class="who">' + esc(name) + '</span>' + flag + '</div>';
  }
  /* items: [{icon, cap, slash, on, onclick, cls}] — cls carries product accents.
     A falsy item renders the hairline group divider. */
  function dock(items, end){
    var row = '';
    (items||[]).forEach(function(it){
      if(!it){ row += '<span class="rc-divider" aria-hidden="true"></span>'; return; }
      row += '<div class="rc-item"><button class="rc-btn' + (it.cls||'') + (it.on?' is-on':'') + '"'
        + ' type="button" onclick="' + (it.onclick||'') + '" aria-label="' + esc(it.aria||it.cap) + '">'
        + it.icon + (it.slash?'<span class="slash"></span>':'') + '</button>'
        + '<span class="rc-cap">' + esc(it.cap) + '</span></div>';
    });
    return '<div class="footer-scrim"></div><div class="rfooter">'
      + '<div class="rdock"><div class="rc-row">' + row + '</div></div>'
      + (end ? '<button class="leave-report" type="button" onclick="' + end.onclick + '">'
          + I.shield + '<span>' + esc(end.label) + '</span></button>' : '')
      + '</div>';
  }

  /* ---------------------------------------------------------- flashcards */
  /* The Gym Solo Room deck: a flip card plus the glass nav dock.
     card: {dir, en, he} · st: {revealed, marked, playing} · on: {flip, mark,
     play, prev, next, reveal} */
  function flashcard(card, st, on){
    var mark = '<button class="fc-mark' + (st.marked?' on':'') + '" type="button"'
      + ' onclick="event.stopPropagation();' + on.mark + '" aria-label="Bookmark">' + I.bookmark + '</button>';
    var player = '<div class="fc-player" onclick="event.stopPropagation()">'
      + '<button class="gm-playbtn" type="button" onclick="event.stopPropagation();' + on.play + '"'
      + ' aria-label="' + (st.playing?'Pause':'Play') + '">' + (st.playing?I.pause:I.play) + '</button>'
      + wave(0, st.playing)
      + '<span class="fc-speed">x1</span>'
      + '</div>';
    return '<div class="fc-wrap' + (st.revealed?' is-flip':'') + '">'
      + '<div class="fc-stage"><div class="fc-flip">'
        + '<div class="fc-face fc-q" onclick="' + on.flip + '">' + mark
          + '<div class="fc-body"><div class="fc-dir">' + esc(card.dir) + '</div>'
          + '<div class="fc-en">' + esc(card.en) + '</div></div>'
        + '</div>'
        + '<div class="fc-face fc-a" onclick="' + on.flip + '">' + mark
          + '<div class="fc-body"><div class="fc-ok">Correct answer</div>'
          + '<div class="fc-he" lang="he" dir="rtl">' + esc(card.he) + '</div>' + player + '</div>'
        + '</div>'
      + '</div></div>'
      + '<div class="fc-nav">'
        + '<button class="fc-skip" type="button" onclick="' + on.prev + '" aria-label="Previous">' + I.skipPrev + '</button>'
        + '<button class="fc-cta" type="button" onclick="' + (st.revealed?on.next:on.reveal) + '">'
          + (st.revealed?'Next':'Show answer') + '</button>'
        + '<button class="fc-skip" type="button" onclick="' + on.next + '" aria-label="Next">' + I.skipNext + '</button>'
      + '</div>'
      + '</div>';
  }

  /* ------------------------------------------------------ bottom sheets */
  /* o: {milky, cls, body, acts, resp, bare} — body is raw markup so a product
     can put a rich card inside without a new primitive.
     `bare` drops the scrim: a tool panel over live video must not dim or blur
     the people in it. Decision sheets always keep the scrim. */
  function sheet(o){
    o = o || {};
    return (o.bare ? '' : '<div class="sheet-scrim"' + (o.onScrim ? ' onclick="' + o.onScrim + '"' : '') + '></div>')
      + '<div class="sheet' + (o.milky?' milky':'') + (o.cls?' '+o.cls:'') + '" role="dialog" aria-modal="true">'
        + '<div class="grab"></div>'
        + (o.body || '')
        + (o.acts ? '<div class="acts">' + o.acts + '</div>' : '')
        + (o.resp ? '<div class="respline"><i style="animation-duration:' + o.resp + 's"></i></div>' : '')
      + '</div>';
  }

  /* ---------------------------------------------------------- loading */
  function loadLine(){ return '<div class="loadline"></div>'; }
  function loadDots(){ return '<span class="loaddots"><i></i><i></i><i></i></span>'; }

  /* ------------------------------------------------------------ toast */
  var toastT = null;
  function toast(text){
    var screen = document.getElementById('screen');
    if(!screen) return;
    var old = screen.querySelector('.gm-toast');
    if(old) old.remove();
    var el = document.createElement('div');
    el.className = 'gm-toast';
    el.textContent = text;
    screen.appendChild(el);
    clearTimeout(toastT);
    toastT = setTimeout(function(){ if(el.parentNode) el.remove(); }, 2400);
  }

  return {
    I:I, esc:esc, mmss:mmss, initial:initial,
    LEVEL_PALETTE:LEVEL_PALETTE, levelMeta:levelMeta, levelDot:levelDot,
    statusbar:statusbar, lockup:lockup, avatarMark:avatarMark,
    preview:preview, avTools:avTools, wave:wave, flashcard:flashcard,
    roomTime:roomTime, roomHeader:roomHeader, half:half, dock:dock,
    sheet:sheet, loadLine:loadLine, loadDots:loadDots, toast:toast
  };
})();
