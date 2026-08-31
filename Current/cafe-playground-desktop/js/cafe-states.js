/* ============================================================================
   CAFE — state machine + screens
   ----------------------------------------------------------------------------
   Follows the Gym playground contract: one global ST, one render() that rebuilds
   #frame, setState() for transitions, a 1s clockTick for timed states, hash
   routing for deep links, and a switcher that stays in sync with ST.

   Happy path:
     entry -> searching -> matched -> agreement -> avcheck -> live -> ending
     ending -> searching   (automatically, unless the student opts out)

   Scope: structure, hierarchy and transitions only. No first-use onboarding,
   no Hub integration, no functionality beyond the seven supplied states.
   ========================================================================= */

/* -------------------------------------------------------------- constants */
var ORDER = ['entry','searching','matched','agreement','avcheck','live','ending'];

/* Playground durations. Shortened so a full loop is reviewable in under 90s. */
var DUR = {
  search:8,          // searching -> matched
  matched:4,         // matched -> agreement (a beat to register who it is)
  partnerAgree:3,    // partner accepts this long after the card appears
  session:45,        // live session length
  sessionFinal:15,   // session pill warms to yellow below this
  ending:10          // ending -> searching again
};

var NOTES = {
  entry:'1 · Cafe entry / matching preferences. The three product scope options. Nothing is matching yet.',
  searching:'2 · Searching for a partner. Timed (' + DUR.search + 's here). Auto-advances to Match found. "Stop matching" ends the Cafe matching session.',
  matched:'3 · Match found. A short beat (' + DUR.matched + 's) that reveals who it is, then auto-advances to Session agreement.',
  agreement:'4 · Session agreement. Per-session, per the spec. Waits for you; the partner accepts ' + DUR.partnerAgree + 's in. Both accepted -> A/V check.',
  avcheck:'5 · A/V check. Gym A/V check reused verbatim, Cafe copy. Not timed. "I am ready" -> Live session.',
  live:'6 · Live Cafe session. Ambient session pill (no drill ring). Contextual chat available. At 0:00 -> Session ending.',
  ending:'7 · Session ending. Matching resumes automatically after ' + DUR.ending + 's — no re-entry. Only "Stop matching" ends the Cafe matching session.'
};

/* ------------------------------------------------------- matching scope */
/* Product spec. These three options are exact and are not placeholders. */
var SCOPES = [
  {id:'exact', label:'Exactly my level',    hint:'',                      lower:0, upper:0},
  {id:'below', label:'My level and below',  hint:'up to 3 levels lower',  lower:3, upper:0},
  {id:'above', label:'My level and above',  hint:'up to 3 levels higher', lower:0, upper:3}
];

/* ------------------------------------------- LEVEL LADDER — PRODUCT DATA */
/* TBD. No authoritative level ladder exists in this repo.
   The only full colour list here is a "sampled" visual palette in a
   Checkpoints doc that says outright it is "Not in the Design Bible yet", and
   Docs/gym-functional-flow-contract-v1.md excludes Checkpoints from source of
   truth. An ordering must not be inferred from a swatch list.

   What the Cafe spec DOES define is the bottom edge: Red is the lowest level
   and Orange sits directly above it, which is what makes "up to 3 levels
   lower" resolve to a narrower band for those two. That much is real.

   The spec does NOT define how many levels exist, what follows Orange, or
   what the highest level is. So:
     - LADDER_BOTTOM is specified and load-bearing.
     - LADDER_ABOVE is provisional filler that only exists so the playground
       has something to render. Replace it wholesale when product data lands.
     - LADDER_TOP_KNOWN is false, and no top-edge behaviour is implemented. */
var LADDER_BOTTOM = ['red', 'orange'];
var LADDER_ABOVE = ['pink','yellow','lightblue','blue','lime','green','darkgreen','turquoise','indigo'];
var LADDER = LADDER_BOTTOM.concat(LADDER_ABOVE);
var LADDER_TOP_KNOWN = false;

function ladderIndex(id){
  for(var i=0;i<LADDER.length;i++) if(LADDER[i] === id) return i;
  return -1;
}
function ladderLabel(i){
  return GP.esc(GP.levelMeta(LADDER[Math.max(0, Math.min(LADDER.length-1, i))]).label);
}

/* The eligible band.
   The bottom is clamped, because the spec says so: nothing sits below Red.
   The top is NOT clamped, because we do not know where the ladder ends.
   `renderableHi` exists only so the playground can draw a band; it is a
   limitation of the placeholder data, not a product rule. */
function eligibleBand(){
  var scope = scopeById(ST.prefs.scope);
  var i = ladderIndex(ST.myLevel);
  if(i === -1) i = 0;
  var lo = i - scope.lower;
  var atBottomEdge = lo < 0;
  if(atBottomEdge) lo = 0;
  var hi = i + scope.upper;
  return {
    me:i,
    lo:lo,
    hi:hi,
    /* Specified behaviour: the request ran past the bottom of the ladder. */
    atBottomEdge:atBottomEdge,
    /* Placeholder data ran out. Never surfaced in product UI. */
    beyondPlaceholder:hi > LADDER.length - 1,
    renderableHi:Math.min(hi, LADDER.length - 1)
  };
}

var SEED_CHAT = [
  {from:'Noa', text:'hey! ready when you are'},
  {from:'You', own:true, text:'yes — one sec'}
];

/* ------------------------------------------------------------------ state */
var ST = {
  state:'entry',
  myLevel:'yellow',
  prefs:{scope:'exact'},
  partner:{name:'Noa', level:'yellow'},
  /* True for as long as the Cafe matching session is live. It survives an
     individual chat ending; only an explicit stop or leaving Cafe clears it. */
  matching:false,
  clockOn:true,
  left:0,
  searchElapsed:0,
  youAgreed:false,
  partnerAgreed:false,
  camOff:false,
  micOff:false,
  blur:false,
  perm:'granted',
  chatOpen:false,
  chat:SEED_CHAT.slice(),
  softLoading:false
};

/* ---------------------------------------------------------------- helpers */
function scopeById(id){
  for(var i=0;i<SCOPES.length;i++) if(SCOPES[i].id === id) return SCOPES[i];
  return SCOPES[0];
}
function scopeLabel(){ return GP.esc(scopeById(ST.prefs.scope).label); }

/* Draw a partner from inside the eligible band. Middle of the band, so the
   bottom edge is visible rather than always landing on your own level.
   Bounded by renderableHi because of the placeholder data, not by a rule. */
function drawPartnerLevel(){
  var b = eligibleBand();
  return LADDER[Math.round((b.lo + b.renderableHi) / 2)];
}
function levelChip(id, cls){
  return '<span class="schip ' + (cls||'') + '">'
    + GP.levelDot(id) + GP.esc(GP.levelMeta(id).label) + '</span>';
}
function lockup(){
  return '<div class="lockup">'
    + '<span class="av-round">' + GP.initial(ST.partner.name) + '</span>'
    + '<span class="session-id"><span class="id-main">Cafe</span>'
    + '<span class="id-sub">with ' + GP.esc(ST.partner.name) + '</span></span>'
    + '</div>';
}
/* Cafe cup mark. Stroke weight is heavier than the source artwork so the grid
   still reads at lockup size. Colours come from cafe.css. */
var CAFE_MARK =
  '<svg class="cafe-mark" viewBox="-6 4 386 217" aria-hidden="true">'
    + '<path d="M60 11.5h250a16 16 0 0 1 16 16v119a65 65 0 0 1-65 65H109a65 65 0 0 1-65-65v-119a16 16 0 0 1 16-16z"/>'
    + '<path d="M44 61h-2a40 40 0 0 0-40 40v9a40 40 0 0 0 40 40h2"/>'
    + '<path d="M326 61h2a40 40 0 0 1 40 40v9a40 40 0 0 1-40 40h-2"/>'
    + '<path d="M44 100.5h282M120.5 11.5v89M250 11.5v89"/>'
    + '<path class="pour" d="M120.5 100.5v53.5a52 52 0 0 0 52 52h25.5a52 52 0 0 0 52-52v-53.5"/>'
  + '</svg>';

function lockupSolo(){
  return '<div class="lockup">'
    + CAFE_MARK
    + '<span class="session-id"><span class="id-main">Cafe</span></span>'
    + '</div>';
}

/* ------------------------------------------------------- 1. ENTRY / PREFS */
function screenEntry(){
  var me = GP.levelMeta(ST.myLevel);
  var band = eligibleBand();

  var row = '';
  SCOPES.forEach(function(s){
    row += '<button class="g-choice stacked' + (ST.prefs.scope===s.id ? ' is-on' : '') + '"'
      + ' onclick="setScope(\'' + s.id + '\')">'
      + '<span class="ch-label">' + GP.esc(s.label) + '</span>'
      + (s.hint ? '<span class="ch-hint">' + GP.esc(s.hint) + '</span>' : '')
      + '</button>';
  });

  /* Mentioned only at the specified bottom edge, and only because the choice
     genuinely cannot be honoured in full. There is no top-edge equivalent. */
  var edge = '';
  if(band.atBottomEdge){
    edge = '<p class="pref-edge">'
      + (band.lo === band.hi
        ? 'You\u2019re at the lowest level, so this matches you with '
          + ladderLabel(band.lo) + '.'
        : 'There aren\u2019t three levels below you, so this matches you with '
          + ladderLabel(band.lo) + '\u2013' + ladderLabel(band.hi) + '.')
      + '</p>';
  }

  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<div class="g-panel cafe-entry-panel">'
      + '<h2 class="g-display lg">Fancy a <b>coffee chat</b>?</h2>'
      + '<p class="g-sub">Drop in, get matched with someone, and talk. No lesson, no teacher.</p>'
      + '<div class="pref-groups"><div class="pref-group">'
        + '<span class="pref-label">Who you\u2019d like to meet'
          + '<span class="pref-me">' + GP.levelDot(ST.myLevel) + 'You\u2019re ' + GP.esc(me.label) + '</span>'
        + '</span>'
        + '<div class="pref-row">' + row + '</div>'
        + edge
      + '</div></div>'
      + '<div class="cafe-acts">'
        + '<button class="btn primary" onclick="startSearch()">Find someone</button>'
      + '</div>'
    + '</div>';
}

/* ---------------------------------------------------------- 2. SEARCHING */
function screenSearching(){
  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<div class="cafe-stage"><div class="cafe-search">'
      + '<div class="search-orb" aria-hidden="true">'
        + '<span class="ring"></span><span class="ring"></span><span class="ring"></span>'
        + '<span class="core">' + GP.I.search + '</span>'
      + '</div>'
      + '<div class="cafe-copy">'
        + '<h2 class="g-display">Looking for someone to talk with</h2>'
        + '<p class="g-quiet">' + scopeLabel() + '</p>'
      + '</div>'
      + '<div class="search-meta">'
        + GP.loadDots()
        + '<span class="elapsed" id="searchElapsed">' + GP.mmss(ST.searchElapsed) + '</span>'
      + '</div>'
      + '<div class="cafe-acts">'
        + '<button class="btn ghost" onclick="stopMatching()">Stop matching</button>'
      + '</div>'
    + '</div></div>';
}

/* -------------------------------------------------------- 3. MATCH FOUND */
function screenMatched(){
  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<div class="cafe-stage">'
      + '<div class="match-pair">'
        + '<span class="match-face you enter">Y</span>'
        + '<span class="match-link" aria-hidden="true"></span>'
        + '<span class="match-face enter">' + GP.initial(ST.partner.name) + '</span>'
      + '</div>'
      + '<div class="cafe-copy">'
        + '<h2 class="g-display">Meet <b>' + GP.esc(ST.partner.name) + '</b></h2>'
        + '<p class="g-sub">Say hello.</p>'
      + '</div>'
      + '<div class="match-detail">' + levelChip(ST.partner.level) + '</div>'
    + '</div>';
}

/* --------------------------------------------------- 4. SESSION AGREEMENT */
/* Agreement content is defined by the product spec. It is shown for every
   match, not once at onboarding. Do not relocate it without a product decision. */
var AGREEMENT_TERMS = [
  'Be respectful and welcoming.',
  'Keep your camera on throughout the session.',
  'Make your best effort to speak in Hebrew.',
  'Create a safe and supportive environment for your partner.'
];

function screenAgreement(){
  var list = '';
  AGREEMENT_TERMS.forEach(function(t){
    list += '<li><span class="tick">' + GP.I.check + '</span><span>' + GP.esc(t) + '</span></li>';
  });
  var partnerState = ST.partnerAgreed
    ? '<span class="agree-partner is-in"><span class="av-sm">' + GP.initial(ST.partner.name) + '</span>'
      + GP.esc(ST.partner.name) + ' is in</span>'
    : '<span class="agree-partner"><span class="av-sm">' + GP.initial(ST.partner.name) + '</span>'
      + 'Waiting for ' + GP.esc(ST.partner.name) + '…</span>';
  var youAct = ST.youAgreed
    ? '<button class="btn cream" disabled>You are in</button>'
    : '<button class="btn primary" onclick="agreeYes()">Let\u2019s do it</button>';

  return lockup()
    + '<div class="cafe-shell"></div>'
    + '<div class="cafe-stage">'
      + '<div class="g-card agree-card">'
        + '<h2>Before you sit down</h2>'
        + '<p class="agree-intro">You\u2019re about to talk with ' + GP.esc(ST.partner.name) + '.</p>'
        + '<ul class="agree-terms">' + list + '</ul>'
        + '<div class="agree-foot">'
          + partnerState
          + '<div class="acts">'
            + '<button class="btn ghost" onclick="agreeNo()">Not this one</button>'
            + youAct
          + '</div>'
        + '</div>'
      + '</div>'
    + '</div>';
}

/* --------------------------------------------------------- 5. A/V CHECK */
function screenAvCheck(){
  var permHelper = ST.perm === 'blocked'
    ? '<div class="av-perm av-perm-blocked" role="status">'
      + '<span class="av-perm-mark" aria-hidden="true"></span>'
      + '<div class="av-perm-copy"><p>Camera and microphone access is required to join a Cafe chat. '
      + 'Enable them for this site in your <button type="button" class="av-perm-retry" onclick="setPerm(\'granted\')">browser or site settings</button>.</p></div>'
      + '</div>'
    : (ST.perm === 'needed'
      ? '<button type="button" class="av-perm av-perm-needed" onclick="setPerm(\'granted\')">To join the Cafe, allow camera and microphone access.</button>'
      : '');
  var ready = ST.perm === 'granted';

  return lockup()
    + '<div class="cafe-shell"></div>'
    + '<div class="av-canon">'
      + '<div class="av-head"><h2>Video &amp; audio check</h2></div>'
      + '<div class="g-card av-card"><div class="av-stage">'
        + GP.preview({camOff:ST.camOff, micOff:ST.micOff, blur:ST.blur, label:'You'})
        + GP.avTools(ST, {cam:'toggleCam()', mic:'toggleMic()', blur:'toggleBlur()'})
      + '</div></div>'
      + permHelper
      + '<div class="av-foot">'
        + '<p class="av-privacy">' + GP.esc(ST.partner.name) + ' can see and hear you for the whole chat. Nothing is recorded.</p>'
        + '<div class="acts"><button class="btn primary" onclick="enterCafe()"' + (ready?'':' disabled') + '>I\u2019m ready</button></div>'
      + '</div>'
    + '</div>';
}

/* ------------------------------------------------- 6. LIVE CAFE SESSION */
function screenLive(){
  var chatBtn = {
    icon:GP.I.chat, label:'Chat', active:ST.chatOpen, onclick:'toggleChat()'
  };
  var controls = [
    {icon:GP.I.mic, label:ST.micOff?'Unmute':'Mute', slash:ST.micOff, onclick:'toggleMic()'},
    {icon:GP.I.cam, label:ST.camOff?'Camera on':'Camera off', slash:ST.camOff, onclick:'toggleCam()'},
    chatBtn
  ];

  return '<div class="cafe-shell deep"></div>'
    + '<div class="cafe-topbar">'
      + lockup()
      + '<div class="top-right">' + GP.timePill(ST.left, DUR.sessionFinal) + '</div>'
    + '</div>'
    + '<div class="cafe-tiles' + (ST.chatOpen?' with-panel':'') + '">'
      + '<div class="g-split">'
        + GP.tile(ST.partner.name, {})
        + GP.tile('You', {alt:true, camOff:ST.camOff, micOff:ST.micOff})
      + '</div>'
    + '</div>'
    + (ST.chatOpen ? GP.chatPanel('Chat', ST.chat, {
        close:'toggleChat()', send:'sendChat()', placeholder:'Type to ' + ST.partner.name + '…'
      }) : '')
    + GP.footer(controls, {label:'Leave', onclick:'endSession()'});
}

/* ------------------------------ 7. SESSION ENDING / SEARCHING AGAIN */
/* Per the spec, matching resumes on its own. This screen is an interstitial,
   not a decision point: the student does not re-enter Cafe to keep going.
   The only exit is an explicit stop. */
function screenEnding(){
  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<div class="cafe-stage"><div class="cafe-ending">'
      + '<div class="cafe-copy">'
        + '<h2 class="g-display">That was a good one</h2>'
        + '<p class="g-sub">Hebrew, out loud.</p>'
      + '</div>'
      + '<div class="ending-partner"><span class="av-sm">' + GP.initial(ST.partner.name) + '</span>'
        + 'You talked with ' + GP.esc(ST.partner.name) + '</div>'
      + '<div class="ending-again">' + GP.vtClock(ST.left, DUR.ending, 'sm')
        + '<span>Looking for someone new…</span></div>'
      + '<div class="cafe-acts">'
        + '<button class="btn primary" onclick="searchAgainNow()">Find someone now</button>'
        + '<button class="btn ghost" onclick="stopMatching()">Stop matching</button>'
      + '</div>'
    + '</div></div>';
}

/* ----------------------------------------------------------- transitions */
function seedFor(state){
  ST.softLoading = false;
  if(state === 'entry'){
    ST.matching = false;
    ST.searchElapsed = 0; ST.youAgreed = false; ST.partnerAgreed = false;
    ST.chatOpen = false; ST.chat = SEED_CHAT.slice(); ST.left = 0;
  }
  if(state === 'searching'){
    ST.matching = true;
    ST.left = DUR.search; ST.searchElapsed = 0;
    ST.youAgreed = false; ST.partnerAgreed = false;
  }
  if(state === 'matched'){ ST.left = DUR.matched; ST.partner.level = drawPartnerLevel(); }
  if(state === 'agreement'){ ST.left = DUR.partnerAgree; ST.youAgreed = false; ST.partnerAgreed = false; }
  if(state === 'avcheck'){ ST.left = 0; }
  if(state === 'live'){ ST.left = DUR.session; ST.chat = SEED_CHAT.slice(); }
  if(state === 'ending'){ ST.left = DUR.ending; ST.chatOpen = false; }
}

function setState(state){
  if(ORDER.indexOf(state) === -1) state = 'entry';
  ST.state = state;
  seedFor(state);
  try{ history.replaceState(null, '', '#' + state); }catch(e){}
  render();
}

/* Product actions */
function setScope(id){ ST.prefs.scope = id; render(); }
function setMyLevel(id){ ST.myLevel = id; render(); }
function startSearch(){ setState('searching'); }
/* The one exit. A Cafe matching session ends only here, or when the app closes. */
function stopMatching(){ setState('entry'); }
function agreeYes(){
  ST.youAgreed = true;
  if(ST.partnerAgreed){ setState('avcheck'); return; }
  render();
}
function agreeNo(){ setState('searching'); }
function setPerm(p){ ST.perm = p; render(); }
function toggleCam(){ ST.camOff = !ST.camOff; render(); }
function toggleMic(){ ST.micOff = !ST.micOff; render(); }
function toggleBlur(){ ST.blur = !ST.blur; render(); }
function enterCafe(){ setState('live'); }
/* Ends this chat. Matching stays live and picks up again. */
function endSession(){ setState('ending'); }
function toggleChat(){ ST.chatOpen = !ST.chatOpen; render(); }
function sendChat(){
  var el = document.getElementById('chatInput');
  if(!el) return;
  var text = el.value.trim();
  if(!text) return;
  ST.chat.push({from:'You', own:true, text:text});
  el.value = '';
  render();
}
function searchAgainNow(){ setState('searching'); }

/* ------------------------------------------------------------- the clock */
var TIMED = {searching:1, matched:1, agreement:1, live:1, ending:1};

function clockTick(){
  if(!ST.clockOn || !TIMED[ST.state]) return;

  if(ST.state === 'searching'){
    ST.searchElapsed++;
    ST.left--;
    if(ST.left <= 0){ setState('matched'); return; }
    syncClockUI();
    return;
  }
  if(ST.state === 'matched'){
    ST.left--;
    if(ST.left <= 0){ setState('agreement'); return; }
    return;
  }
  if(ST.state === 'agreement'){
    if(ST.partnerAgreed) return;
    ST.left--;
    if(ST.left <= 0){
      ST.partnerAgreed = true;
      if(ST.youAgreed){ setState('avcheck'); return; }
      render();
    }
    return;
  }
  if(ST.state === 'live'){
    ST.left--;
    if(ST.left <= 0){ setState('ending'); return; }
    syncClockUI();
    return;
  }
  /* Specified behaviour: matching resumes on its own. No re-entry. */
  if(ST.state === 'ending'){
    ST.left--;
    if(ST.left <= 0){ setState('searching'); return; }
    render();
  }
}

/* Patch the clock in place rather than re-rendering, so the live video shell,
   chat scroll position and input focus survive every tick. */
function syncClockUI(){
  if(ST.state === 'searching'){
    var e = document.getElementById('searchElapsed');
    if(e) e.textContent = GP.mmss(ST.searchElapsed);
    return;
  }
  if(ST.state === 'live'){
    var pill = document.querySelector('.g-timepill');
    if(!pill) return;
    var t = pill.querySelector('.time');
    if(t) t.textContent = GP.mmss(ST.left);
    pill.classList.toggle('final', ST.left <= DUR.sessionFinal);
  }
}

/* ----------------------------------------------------------------- render */
function render(){
  var f = document.getElementById('frame');
  if(!f) return;
  var s = ST.state, html = '';
  if(s === 'entry') html = screenEntry();
  else if(s === 'searching') html = screenSearching();
  else if(s === 'matched') html = screenMatched();
  else if(s === 'agreement') html = screenAgreement();
  else if(s === 'avcheck') html = screenAvCheck();
  else if(s === 'live') html = screenLive();
  else if(s === 'ending') html = screenEnding();
  else html = screenEntry();

  f.innerHTML = html + GP.softLoading(ST.softLoading);

  if(ST.chatOpen){
    var body = document.getElementById('chatBody');
    if(body) body.scrollTop = body.scrollHeight;
    var input = document.getElementById('chatInput');
    if(input){
      input.focus();
      input.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') sendChat(); });
    }
  }
  syncSwitcher();
}

/* ------------------------------------------------------------- switcher */
function syncSwitcher(){
  document.querySelectorAll('.sc').forEach(function(b){
    b.classList.toggle('on', b.dataset.sc === ST.state);
  });
  var clockBtn = document.getElementById('clockBtn');
  if(clockBtn){
    clockBtn.classList.toggle('on', ST.clockOn);
    clockBtn.textContent = ST.clockOn ? 'Clock: running' : 'Clock: paused';
  }
  var note = document.getElementById('stateNote');
  if(note){
    var b = eligibleBand();
    note.textContent = (NOTES[ST.state] || '')
      + '  ·  matching ' + (ST.matching?'live':'stopped')
      + ' · you are ' + GP.levelMeta(ST.myLevel).label
      + ' · eligible ' + ladderLabel(b.lo) + '\u2013' + ladderLabel(b.renderableHi)
      + (b.atBottomEdge ? ' (bottom edge — specified)' : '')
      + (b.beyondPlaceholder ? ' (top open — ladder TBD, placeholder ran out)' : '')
      + ' · cam ' + (ST.camOff?'off':'on')
      + ' · mic ' + (ST.micOff?'off':'on')
      + (TIMED[ST.state] ? ' · t-' + ST.left + 's' : '');
  }
}

function toggleClock(){ ST.clockOn = !ST.clockOn; syncSwitcher(); }
function togglePresent(){
  var on = document.body.classList.toggle('present');
  document.getElementById('modeBtn').textContent = on ? 'Exit presentation' : 'Presentation mode';
}
function runHappyPath(){
  ST.clockOn = true;
  setState('entry');
  setTimeout(startSearch, 700);
}

/* ---------------------------------------------------------------- boot */
function applyHash(){
  var h = (location.hash || '').replace('#','');
  if(h && ORDER.indexOf(h) !== -1 && h !== ST.state) setState(h);
}

(function boot(){
  var p = new URLSearchParams(location.search);
  var s = p.get('state') || (location.hash || '').replace('#','');
  if(s && ORDER.indexOf(s) !== -1) ST.state = s;
  if(p.get('mode') === 'presentation') document.body.classList.add('present');
  seedFor(ST.state);

  document.querySelectorAll('.sc').forEach(function(b){
    b.onclick = function(){ setState(b.dataset.sc); };
  });
  window.addEventListener('hashchange', applyHash);

  GP.initHubTips();
  render();
  setInterval(clockTick, 1000);
})();
