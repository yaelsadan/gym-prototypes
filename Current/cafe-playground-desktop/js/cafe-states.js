/* ============================================================================
   CAFE — state machine + screens
   ----------------------------------------------------------------------------
   Follows the Gym playground contract: one global ST, one render() that rebuilds
   #frame, setState() for transitions, a 1s clockTick for timed states, hash
   routing for deep links, and a switcher that stays in sync with ST.

   Canonical path (settled on mobile, adapted here):
     entry -> avcheck -> searching -> (hub / flashcards, matching continues)
            -> matched -> agreement -> live -> ending -> hub

   A/V check sits before matching and runs on every Café entry. Its CTA is the
   actual "Start matching" action.

   Matching is a background process. It starts at the end of the A/V check and
   stops only on an explicit "Stop matching". One chat ending never stops it.

   Entry / Preferences is unchanged in this pass.
   ========================================================================= */

/* -------------------------------------------------------------- constants */
var ORDER = ['entry','avcheck','searching','hub','flashcards','matched','agreement','live','ending'];

var IMG_PARTNER = '../student-main-classroom-desktop/assets/teacher-gai.png';
var IMG_YOU     = '../student-main-classroom-desktop/assets/pip-you.png';
var IMG_FACE_A  = '../student-main-classroom-desktop/assets/dana.png';
var IMG_FACE_B  = '../student-main-classroom-desktop/assets/teacher-yael.png';
var MAP_SRC     = '../cafe-playground-mobile/World%20map.svg';

/* Playground durations. The session is the real 6 minutes so the clock reads
   truthfully; search / offer / ending are shortened so a loop is reviewable. */
var DUR = {
  searchTo:22,
  exploreAfter:14,
  offer:30,
  partnerConfirm:4,
  session:360,
  sessionFinal:30,
  ending:7,
  partnerOffWait:9
};

var SEARCH_COPY = 'We\u2019ll tell you the moment someone\u2019s free.';
var SEARCH_COPY_LATE = 'Still looking. You can practice or explore while we keep matching you.';

var INTERVIEW = false;

var NOTES = {
  entry:'1 · Cafe entry / matching preferences. The three product scope options. Nothing is matching yet.',
  avcheck:'2 · A/V check, before matching and mandatory on every entry. Its CTA is the real "Start matching".',
  searching:'3 · Active search. Matching is felt first. After ~14s, Flashcards shifts left and Explore joins the same rail.',
  hub:'3b · Placeholder Hub carrying the persistent matching indicator. The Hub itself is not designed in this pass.',
  flashcards:'3c · Optional practice while waiting. Matching stays visible. A match interrupts it; declining returns here.',
  matched:'4 · Match found. A 30s interrupt over whatever you were doing. Accept keeps the same surface and waits for the partner.',
  agreement:'5 · Session agreement. Only after both accepted. Four principles to scan, one acknowledgement that enables the CTA. No decline.',
  live:'6 · Live Cafe. Two-person desktop tiles. Dock: Wheel · Challenge · Text, then Camera · Mic.',
  ending:'7 · Ending. Matching never stopped, so there is no "find someone now" — it requeues on its own.'
};

/* ------------------------------------------------------- matching scope */
/* Product spec. These three options are exact and are not placeholders.
   Entry still uses them; searching Edit opens the same set. */
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

/* -------------------------------------------------------------- partner */
var PARTNER = {
  name:'Daniel',
  level:'pink',
  location:'Berlin, Germany',
  img:IMG_PARTNER,
  ice:{
    label:'Why do they study Hebrew?',
    text:'I want to speak with my family in their own language, and to feel at home when I visit.'
  }
};

var LEVEL_ICONS = {
  red:'../cafe-playground-mobile/assets/level-red.png',
  orange:'../cafe-playground-mobile/assets/level-orange.png',
  pink:'assets/level-pink.png',
  yellow:'../cafe-playground-mobile/assets/level-yellow.png',
  lightblue:'../cafe-playground-mobile/assets/level-lightblue.png',
  blue:'../cafe-playground-mobile/assets/level-blue.png',
  lime:'../cafe-playground-mobile/assets/level-lime.png'
};
var IMG_PIN = 'assets/location-pin.png';

/* Content of the agreement is product-specified. This is the only copy of it.
   Four principles to scan, then one acknowledgement. No per-item ticks. */
var AGREEMENT_TERMS = [
  {icon:'welcome', lead:'Mistakes are welcome',          support:'Everyone here is learning.'},
  {icon:'hebrew',  lead:'Give Hebrew your best shot',    support:'Even a few words count.'},
  {icon:'present', lead:'Stay present for six minutes',  support:'Keep your camera and mic on.'},
  {icon:'kind',    lead:'Be kind to your partner',       support:'Help make the conversation feel safe and supportive.'}
];

var ACTIVITY = {
  title:'Order a coffee, out loud',
  body:'Ask for what you would actually drink. Your partner is the barista.'
};

var DEVICES = {
  camera:{label:'Camera', icon:'cam', options:['FaceTime HD Camera','Continuity Camera'], value:'FaceTime HD Camera'},
  mic:{label:'Microphone', icon:'mic', options:['AirPods Pro','MacBook Pro Microphone'], value:'AirPods Pro'},
  output:{label:'Speaker', icon:'headphone', options:['AirPods Pro','MacBook Pro Speakers'], value:'AirPods Pro'}
};

var DECK = [
  {dir:'Translate to Hebrew', en:'Coffee',      he:'\u05e7\u05e4\u05d4'},
  {dir:'Translate to Hebrew', en:'Thank you',   he:'\u05ea\u05d5\u05d3\u05d4'},
  {dir:'Translate to Hebrew', en:'Good morning',he:'\u05d1\u05d5\u05e7\u05e8 \u05d8\u05d5\u05d1'},
  {dir:'Translate to Hebrew', en:'Friend',      he:'\u05d7\u05d1\u05e8'},
  {dir:'Translate to Hebrew', en:'Water',       he:'\u05de\u05d9\u05dd'}
];

/* Cafe-only icons. Shared GP.I stays product-neutral. */
var CI = {
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  chevRt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2"/></svg>',
  skipPrev:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4.2" y="5" width="2.2" height="14" rx=".6"/><path d="M19.4 5.1v13.8L7.4 12z"/></svg>',
  skipNext:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.6 5.1L16.6 12 4.6 18.9V5.1z"/><rect x="17.6" y="5" width="2.2" height="14" rx=".6"/></svg>',
  bookmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.8h10c.7 0 1.2.5 1.2 1.2V20l-6.2-3.3L5.8 20V5c0-.7.5-1.2 1.2-1.2z"/></svg>',
  wheel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13.4 2.5L4.8 13.4h6L10.6 21.5 19.2 10.6h-6z"/></svg>'
};

/* ------------------------------------------------------------------ state */
var ST = {
  state:'entry',
  myLevel:'yellow',
  prefs:{scope:'exact'},
  partner:{name:PARTNER.name, level:PARTNER.level},
  /* what the match interrupt is layered over */
  bg:'hub',
  /* True for as long as the Cafe matching session is live. It survives an
     individual chat ending; only an explicit stop or leaving Cafe clears it. */
  matching:false,
  matchPhase:'offer',
  matchLayout:'open',
  offerLeft:DUR.offer,
  clockOn:true,
  left:0,
  searchElapsed:0,
  exploreShown:false,
  closeSheet:false,
  camOff:false,
  micOff:false,
  blur:false,
  perm:'granted',
  mic:{phase:'idle', left:0, pos:0},
  devSheet:false,
  levelsSheet:false,
  card:0, cardRevealed:false, cardMarked:false, cardPlaying:false,
  textOpen:false,
  textLog:[],
  leaveSheet:false,
  keepOnSheet:false,
  partnerOffSheet:false,
  partnerCamOff:false,
  partnerMicOff:false,
  partnerOffFind:false,
  agreed:false,
  dockTip:false,
  dockTipSeen:false,
  softLoading:false
};

/* ---------------------------------------------------------------- helpers */
function scopeById(id){
  for(var i=0;i<SCOPES.length;i++) if(SCOPES[i].id === id) return SCOPES[i];
  return SCOPES[0];
}
function scopeLabel(){ return GP.esc(scopeById(ST.prefs.scope).label); }
function searchScopeLabel(){
  var id = ST.prefs.scope;
  if(id === 'exact') return 'My level only';
  return GP.esc(scopeById(id).label);
}

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
    + '<span class="av-round"><img src="' + PARTNER.img + '" alt=""></span>'
    + '<span class="session-id"><span class="id-main">Cafe</span>'
    + '<span class="id-sub">with ' + GP.esc(PARTNER.name) + '</span></span>'
    + '</div>';
}
/* Two-cup Café mark. Same supplied artwork as the mobile lockup. */
var CAFE_MARK =
  '<img class="cafe-mark" src="../cafe-playground-mobile/cafe-mark.png" alt="" aria-hidden="true">';

function lockupSolo(){
  return '<div class="lockup">'
    + CAFE_MARK
    + '<span class="session-id"><span class="id-main">Cafe</span></span>'
    + '</div>';
}

function cafeDialog(opts){
  opts = opts || {};
  var overlayClick = opts.onScrim
    ? ' onclick="if(event.target===this)' + opts.onScrim + '"'
    : '';
  return '<div class="invite-overlay cafe-overlay"' + overlayClick + '>'
    + '<div class="invite milky ' + (opts.cls||'') + '" role="dialog" aria-modal="true">'
    + (opts.title ? '<h4>' + opts.title + '</h4>' : '')
    + (opts.body || '')
    + (opts.acts ? '<div class="acts">' + opts.acts + '</div>' : '')
    + (opts.footer || '')
    + (opts.resp ? '<div class="respline"><i style="animation-duration:' + opts.resp + 's"></i></div>' : '')
    + '</div></div>';
}

function cafeFooter(items, end){
  var html = '<div class="g-footer"><div class="footer-capsule">';
  (items||[]).forEach(function(it){
    if(it.divider){
      html += '<span class="rc-div" aria-hidden="true"></span>';
      return;
    }
    html += '<button class="rc-btn' + (it.active?' is-active':'') + (it.accent?' accent':'') + '" type="button" onclick="'
      + (it.onclick||'') + '"' + GP.hubTipAttrs(it.label) + '>' + it.icon
      + (it.slash ? '<span class="slash"></span>' : '') + '</button>';
  });
  html += '</div>';
  if(end){
    html += '<button class="footer-end" type="button" onclick="' + (end.onclick||'') + '">'
      + GP.I.leave + '<span>' + GP.esc(end.label) + '</span></button>';
  }
  return html + '</div>';
}

function cafeTile(name, opts){
  opts = opts || {};
  var cls = 'g-tile cafe-tile'
    + (opts.alt ? ' alt' : '')
    + (opts.camOff ? ' cam-off' : '');
  var inner = '';
  if(opts.img && !opts.camOff){
    inner += '<div class="vid" style="background-image:url(\'' + opts.img + '\')"></div>';
  }
  inner += '<span class="who">' + GP.esc(name) + '</span>';
  if(opts.camOff) inner += '<span class="av-big">' + GP.initial(name) + '</span>';
  if(opts.micOff) inner += '<span class="tile-flag">' + GP.I.mic + 'Mic off</span>';
  return '<div class="' + cls + '">' + inner + '</div>';
}

function cafePreview(){
  var html = GP.preview({camOff:ST.camOff, micOff:ST.micOff, blur:ST.blur, label:'You'});
  if(!ST.camOff){
    html = html.replace(
      '<div class="vid"></div>',
      '<div class="vid" style="background-image:url(\'' + IMG_YOU + '\')"></div>'
    );
  }
  return html;
}

function cafeAvTools(){
  var liveMic = (ST.perm === 'granted' && !ST.micOff);
  return '<div class="av-tools">'
    + '<button class="cbtn" type="button" onclick="toggleCam()"' + GP.hubTipAttrs('Camera') + '>'
      + GP.I.cam + (ST.camOff ? '<span class="slash"></span>' : '') + '</button>'
    + '<div class="av-mic-wrap">'
      + (liveMic
        ? '<span class="av-mic-echo" aria-hidden="true"><i class="av-echo-ring"></i>'
          + '<i class="av-echo-ring d2"></i><i class="av-echo-ring d3"></i></span>'
        : '')
      + '<button class="cbtn" type="button" onclick="toggleMic()"' + GP.hubTipAttrs('Microphone') + '>'
        + GP.I.mic + (ST.micOff ? '<span class="slash"></span>' : '') + '</button>'
    + '</div>'
    + '<button class="cbtn' + (ST.blur?' blur-on':'') + '" type="button" onclick="toggleBlur()"'
      + GP.hubTipAttrs('Blur background') + '>' + GP.I.blur + '</button>'
    + '</div>';
}

function cafeWave(live, rec){
  var h = [7,12,17,22,19,14,20,25,22,15,10,17,24,20,14,9,15,22,18,12,17,10,7,12,19];
  var out = '';
  for(var i=0;i<h.length;i++){
    out += '<i style="height:' + h[i] + 'px"></i>';
  }
  return '<div class="cafe-wave' + (live?' is-live':'') + (rec?' is-rec':'') + '">' + out + '</div>';
}

function cafeCardsIcon(){
  var back = 'M22.3808 7.78128L46.026 11.7121C48.6139 12.1423 50.3567 14.5878 49.9187 17.1743L44.186 51.0293C43.7478 53.6156 41.295 55.3639 38.7073 54.9337L15.0621 51.0029C12.4744 50.5728 10.7317 48.127 11.1694 45.5407L16.9021 11.6857C17.3401 9.09913 19.793 7.35108 22.3808 7.78128Z';
  var front = 'M4.94493 6.21876L28.3942 1.27471C30.9612 0.733506 33.4886 2.37401 34.0394 4.93888L41.2505 38.5161C41.8013 41.0809 40.1669 43.5989 37.6 44.1401L14.1507 49.0842C11.5838 49.6254 9.05634 47.9849 8.50551 45.42L1.29448 11.8428C0.760843 9.358 2.27805 6.9169 4.70727 6.27486L4.94493 6.21876Z';
  return '<svg class="wp-cards" viewBox="0 0 51 56" fill="none" aria-hidden="true">'
    + '<defs><mask id="wpCardMask" maskUnits="userSpaceOnUse" x="-8" y="-8" width="67" height="72">'
    + '<rect x="-8" y="-8" width="67" height="72" fill="#000"/>'
    + '<g class="wp-card wp-card-back"><path d="' + back + '" fill="#fff"/></g>'
    + '</mask></defs>'
    + '<g class="wp-card wp-card-front"><path d="' + front + '" fill="#FFE300" mask="url(#wpCardMask)"/></g>'
    + '<g class="wp-card wp-card-back"><path d="' + back + '" stroke="#F7F6EF" stroke-width="1"/></g>'
    + '<g class="wp-card wp-card-front"><path d="' + front + '" stroke="#F7F6EF" stroke-width="1"/></g>'
    + '</svg>';
}

var toastT = null;
function cafeToast(text){
  var f = document.getElementById('frame');
  if(!f) return;
  var old = f.querySelector('.g-toast');
  if(old) old.remove();
  var el = document.createElement('div');
  el.className = 'g-toast';
  el.setAttribute('role','status');
  el.innerHTML = '<span class="d"></span>' + GP.esc(text);
  f.appendChild(el);
  clearTimeout(toastT);
  toastT = setTimeout(function(){ if(el.parentNode) el.remove(); }, 2400);
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

/* --------------------------------------------------------- 2. A/V CHECK */
function permHelper(){
  if(ST.perm === 'needed'){
    return '<button type="button" class="av-perm av-perm-needed" onclick="setPerm(\'granted\')">'
      + 'To join a Caf\u00e9 chat, allow camera and microphone access.</button>';
  }
  if(ST.perm === 'blocked'){
    return '<div class="av-perm av-perm-blocked" role="status">'
      + '<span class="av-perm-mark" aria-hidden="true"></span>'
      + '<div class="av-perm-copy"><p>Camera and microphone access is required to talk in Caf\u00e9. '
      + 'Enable them for this site in your <button type="button" class="av-perm-retry" onclick="setPerm(\'granted\')">browser or site settings</button>.</p></div>'
      + '</div>';
  }
  return '';
}

function micTest(){
  var m = ST.mic, title, sub, btn, extra = '';
  if(m.phase === 'recording'){
    title = 'Listening\u2026';
    sub = cafeWave(true, true);
    btn = '<button class="cafe-playbtn" type="button" onclick="micStop()" aria-label="Stop">' + CI.pause + '</button>';
    extra = '<span class="mt-count">' + m.left + 's</span>';
  } else if(m.phase === 'playing'){
    title = 'Playing back\u2026';
    sub = cafeWave(true, false);
    btn = '<button class="cafe-playbtn" type="button" onclick="micPause()" aria-label="Pause">' + CI.pause + '</button>';
    extra = '<button class="mic-redo" type="button" onclick="micRecord()">Redo</button>';
  } else if(m.phase === 'ready'){
    title = 'Hear yourself';
    sub = '<span class="av-row-sub">Check the volume sounds right</span>';
    btn = '<button class="cafe-playbtn" type="button" onclick="micPlay()" aria-label="Play back">' + CI.play + '</button>';
    extra = '<button class="mic-redo" type="button" onclick="micRecord()">Redo</button>';
  } else {
    title = 'Test your mic';
    sub = '<span class="av-row-sub">Say something and hear it back</span>';
    btn = '<button class="cafe-playbtn" type="button" onclick="micRecord()" aria-label="Test your mic">' + GP.I.mic + '</button>';
  }
  return '<div class="av-row mic-test' + (m.phase === 'idle' ? '' : ' is-live') + '">'
    + btn
    + '<span class="av-row-copy"><span class="av-row-title">' + title + '</span>' + sub + '</span>'
    + extra
    + '</div>';
}

function avSettingsLink(){
  return '<button type="button" class="av-settings" onclick="openDevices()">'
    + 'Audio &amp; camera settings'
    + '<span class="chev" aria-hidden="true">' + CI.chevRt + '</span>'
    + '</button>';
}

function devicesSheet(){
  var groups = '';
  ['camera','mic','output'].forEach(function(key){
    var d = DEVICES[key], opts = '';
    d.options.forEach(function(o){
      opts += '<button type="button" class="dev-opt' + (o === d.value ? ' is-on' : '') + '"'
        + ' onclick="pickDevice(\'' + key + '\',\'' + o.replace(/'/g,"\\'") + '\')">'
        + '<span>' + GP.esc(o) + '</span><span class="tick">' + GP.I.check + '</span></button>';
    });
    groups += '<div class="dev-group"><span class="dev-group-label">' + GP.esc(d.label) + '</span>' + opts + '</div>';
  });
  var body = '<div class="dev-grid">' + groups
    + '<div class="dev-group dev-test"><span class="dev-group-label">Microphone test</span>' + micTest() + '</div>'
    + '</div>';
  return cafeDialog({
    milky:true,
    cls:'dev-dialog',
    onScrim:'closeDevices()',
    title:'Audio &amp; camera settings',
    body:body,
    acts:'<button class="btn primary" type="button" onclick="closeDevices()">Done</button>'
  });
}

function screenAvCheck(){
  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<main class="av-canon cafe-av">'
      + '<header class="av-head"><h2>Ready to be seen?</h2></header>'
      + '<section class="g-card av-card" aria-label="Camera and microphone check"><div class="av-stage">'
        + cafePreview()
        + cafeAvTools()
      + '</div></section>'
      + permHelper()
      + '<footer class="av-foot">'
        + avSettingsLink()
        + '<p class="av-privacy">Your partner will see and hear you for the whole chat. Nothing is recorded.</p>'
        + '<div class="acts"><button class="btn primary" type="button" onclick="startMatching()"'
          + (ST.perm === 'granted' ? '' : ' disabled') + '>Start matching</button></div>'
      + '</footer>'
    + '</main>'
    + (ST.devSheet ? devicesSheet() : '');
}

/* ---------------------------------------------------------- 3. SEARCHING */
function prefEdgeLine(){
  var band = eligibleBand();
  if(!band.atBottomEdge) return '';
  return '<p class="pref-edge">'
    + (band.lo === band.hi
      ? 'You\u2019re at the lowest level, so this matches you with ' + ladderLabel(band.lo) + '.'
      : 'There aren\u2019t three levels below you, so this matches you with '
        + ladderLabel(band.lo) + '\u2013' + ladderLabel(band.hi) + '.')
    + '</p>';
}

function levelsSheet(){
  var row = '';
  SCOPES.forEach(function(s){
    row += '<button class="g-choice stacked ink' + (ST.prefs.scope===s.id ? ' is-on' : '') + '" type="button"'
      + ' onclick="setScope(\'' + s.id + '\')">'
      + '<span class="ch-label">' + GP.esc(s.label) + '</span>'
      + (s.hint ? '<span class="ch-hint">' + GP.esc(s.hint) + '</span>' : '')
      + '</button>';
  });
  return cafeDialog({
    milky:true,
    cls:'levels-dialog',
    onScrim:'closeLevels()',
    title:'Who would you like to meet?',
    body:'<div class="pref-row">' + row + '</div>' + prefEdgeLine(),
    acts:'<button class="btn primary" type="button" onclick="closeLevels()">Keep searching</button>'
  });
}

function searchMap(uid){
  uid = uid || 'echoFade';
  var faces = {2:IMG_FACE_A, 5:IMG_FACE_B};
  var pins = [[18,48],[24,42],[36,70],[50,28],[48,42],[72,30]];
  var pinHtml = pins.map(function(p, i){
    var n = i + 1;
    var face = faces[n];
    return '<span class="search-pin p' + n + (face ? ' has-face' : '')
      + '" style="left:' + p[0] + '%;top:' + p[1] + '%">'
      + '<span class="pin-dot"></span>'
      + (face ? '<span class="pin-face"><img src="' + face + '" alt=""></span>' : '')
      + '</span>';
  }).join('');
  return '<div class="search-map" aria-hidden="true">'
    + '<img class="search-map-art" src="' + MAP_SRC + '" alt="">'
    + '<svg class="search-echoes" viewBox="0 0 616 275" focusable="false">'
      + '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="1" y2="0">'
        + '<stop offset="0" stop-color="#F7F6EF" stop-opacity="0"/>'
        + '<stop offset=".16" stop-color="#F7F6EF" stop-opacity=".5"/>'
        + '<stop offset=".5" stop-color="#F7F6EF" stop-opacity=".85"/>'
        + '<stop offset=".84" stop-color="#F7F6EF" stop-opacity=".5"/>'
        + '<stop offset="1" stop-color="#F7F6EF" stop-opacity="0"/>'
      + '</linearGradient></defs>'
      + '<path class="search-echo" d="M36 232 A 290 78 0 0 1 580 232" stroke="url(#' + uid + ')"/>'
      + '<path class="search-echo e2" d="M22 236 A 298 102 0 0 1 594 236" stroke="url(#' + uid + ')"/>'
      + '<path class="search-echo e3" d="M48 228 A 284 62 0 0 1 568 228" stroke="url(#' + uid + ')"/>'
      + '<path class="search-echo e4" d="M16 240 A 302 118 0 0 1 600 240" stroke="url(#' + uid + ')"/>'
      + '<path class="search-echo e5" d="M42 234 A 288 88 0 0 1 574 234" stroke="url(#' + uid + ')"/>'
    + '</svg>'
    + pinHtml
  + '</div>';
}

function searchExploreReady(){
  return !!(ST.exploreShown || ST.searchElapsed >= DUR.exploreAfter);
}

function searchScopeLine(){
  var b = eligibleBand();
  var n = b.renderableHi - b.lo + 1;
  var meta = n <= 1 ? 'Matching with: My level only' : ('Matching across ' + n + ' levels');
  return '<p class="search-summary">'
    + '<span>' + meta + '</span>'
    + '<span class="search-summary-sep" aria-hidden="true">\u00b7</span>'
    + '<button type="button" class="edit" onclick="openLevels()">Edit levels</button>'
    + '</p>';
}

function searchPracticeBtn(){
  return '<button type="button" class="wait-practice" onclick="openFlashcards()">'
    + '<span class="wp-icon" aria-hidden="true">' + cafeCardsIcon() + '</span>'
    + '<span class="wp-copy">'
      + '<span class="wp-kicker">While you wait</span>'
      + '<span class="wp-title">Practice flashcards</span>'
    + '</span>'
    + '<span class="chev" aria-hidden="true">' + CI.chevRt + '</span>'
    + '</button>';
}

function searchSupportCopy(late){
  return '<div class="search-support" aria-live="polite">'
    + '<p class="search-support-msg' + (late ? '' : ' is-on') + '" id="searchSupportA">' + SEARCH_COPY + '</p>'
    + '<p class="search-support-msg' + (late ? ' is-on' : '') + '" id="searchSupportB">' + SEARCH_COPY_LATE + '</p>'
    + '</div>';
}

function searchExploreBtn(late){
  return '<button type="button" class="search-explore" id="searchExplore" onclick="keepExploring()"'
    + (late ? '' : ' tabindex="-1" aria-hidden="true"')
    + '>Explore while we match</button>';
}

function searchActionRail(){
  var late = searchExploreReady();
  return '<div class="search-actions" id="searchActions">'
    + searchPracticeBtn()
    + searchExploreBtn(late)
    + '</div>';
}

function searchCloseBtn(icon){
  return '<button type="button" class="search-close" id="searchClose"'
    + ' aria-label="Close matching" aria-haspopup="dialog" aria-controls="searchClosePop"'
    + ' aria-expanded="' + (ST.closeSheet ? 'true' : 'false') + '"'
    + ' onclick="openCloseDecision()">' + icon + '</button>';
}

function closeDecisionMarkup(){
  return '<div class="search-close-scrim" id="searchCloseScrim" onclick="dismissCloseDecision()"></div>'
    + '<div class="search-close-pop" id="searchClosePop" role="dialog" aria-modal="true"'
      + ' aria-labelledby="searchCloseTitle" aria-describedby="searchCloseBody">'
      + '<button type="button" class="search-close-dismiss" onclick="dismissCloseDecision()" aria-label="Cancel">'
        + GP.I.x + '</button>'
      + '<h4 id="searchCloseTitle">What would you like to do?</h4>'
      + '<p id="searchCloseBody">We can keep looking while you explore the Hub, or stop matching altogether.</p>'
      + '<div class="acts">'
        + '<button class="btn primary" type="button" onclick="keepMatchingExplore()">Keep matching &amp; explore</button>'
        + '<button class="btn cream" type="button" onclick="stopMatching()">Stop matching</button>'
        + '<button class="btn ghost-ink search-close-cancel" type="button" onclick="dismissCloseDecision()">Cancel</button>'
      + '</div>'
    + '</div>';
}

function screenSearching(){
  var late = searchExploreReady();
  return lockupSolo()
    + searchCloseBtn(GP.I.x)
    + '<div class="cafe-shell"></div>'
    + '<main class="cafe-stage searching-stage' + (late ? ' is-late is-ready' : '') + '">'
      + '<div class="search-hero">'
        + '<div class="search-stack">'
          + searchMap('echoFade')
          + '<div class="search-status">'
            + '<h2 class="g-display">Looking for a partner\u2026</h2>'
            + searchSupportCopy(late)
          + '</div>'
          + searchActionRail()
          + searchScopeLine()
        + '</div>'
      + '</div>'
    + '</main>'
    + (ST.levelsSheet ? levelsSheet() : '')
    + (ST.closeSheet ? closeDecisionMarkup() : '');
}

function cafeFlashcard(card){
  var st = {revealed:ST.cardRevealed, marked:ST.cardMarked, playing:ST.cardPlaying};
  var mark = '<button class="fc-mark' + (st.marked?' on':'') + '" type="button"'
    + ' onclick="event.stopPropagation();cardMark()" aria-label="Bookmark">' + CI.bookmark + '</button>';
  var player = '<div class="fc-player" onclick="event.stopPropagation()">'
    + '<button class="cafe-playbtn" type="button" onclick="event.stopPropagation();cardPlay()"'
    + ' aria-label="' + (st.playing?'Pause':'Play') + '">' + (st.playing?CI.pause:CI.play) + '</button>'
    + cafeWave(st.playing, false)
    + '<span class="fc-speed">x1</span>'
    + '</div>';
  return '<div class="fc-wrap' + (st.revealed?' is-flip':'') + '">'
    + '<div class="fc-stage"><div class="fc-flip">'
      + '<div class="fc-face fc-q" onclick="cardFlip()">' + mark
        + '<div class="fc-body"><div class="fc-dir">' + GP.esc(card.dir) + '</div>'
        + '<div class="fc-en">' + GP.esc(card.en) + '</div></div>'
      + '</div>'
      + '<div class="fc-face fc-a" onclick="cardFlip()">' + mark
        + '<div class="fc-body"><div class="fc-ok">Correct answer</div>'
        + '<div class="fc-he" lang="he" dir="rtl">' + GP.esc(card.he) + '</div>' + player + '</div>'
      + '</div>'
    + '</div></div>'
    + '<div class="fc-nav">'
      + '<button class="fc-skip" type="button" onclick="cardPrev()" aria-label="Previous">' + CI.skipPrev + '</button>'
      + '<button class="fc-cta" type="button" onclick="' + (st.revealed?'cardNext()':'cardReveal()') + '">'
        + (st.revealed?'Next':'Show answer') + '</button>'
      + '<button class="fc-skip" type="button" onclick="cardNext()" aria-label="Next">' + CI.skipNext + '</button>'
    + '</div>'
    + '</div>';
}

function screenFlashcards(){
  var card = DECK[((ST.card % DECK.length) + DECK.length) % DECK.length];
  return '<div class="cafe-shell"></div>'
    + '<div class="fc-screen">'
      + '<div class="fc-top">'
        + '<button class="icon-btn" type="button" onclick="closeFlashcards()" aria-label="Back to searching">' + GP.I.x + '</button>'
        + '<span class="fc-status"><span class="mi-dot" aria-hidden="true"></span>Still looking for a partner\u2026</span>'
        + '<button class="btn ghost sm fc-close" type="button" onclick="closeFlashcards()">Close</button>'
      + '</div>'
      + cafeFlashcard(card)
    + '</div>';
}

function matchIndicator(){
  return '<button type="button" class="match-indicator" onclick="openSearch()">'
    + '<span class="mi-dot" aria-hidden="true"></span>'
    + '<span class="mi-copy">'
      + '<span class="mi-title">Caf\u00e9</span>'
      + '<span class="mi-line">Finding your Caf\u00e9 partner...</span>'
    + '</span>'
    + '<span class="mi-chev" aria-hidden="true">' + CI.chevRt + '</span>'
    + '</button>';
}

function screenHub(){
  return '<div class="hub-mock">'
      + '<aside class="hub-rail" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></aside>'
      + '<div class="hub-main">'
        + '<div class="hub-stamp">Hub \u2014 placeholder, not designed in this pass</div>'
        + '<div class="hub-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>'
        + (ST.matching ? matchIndicator() : '')
      + '</div>'
    + '</div>';
}

/* -------------------------------------------------------- 4. MATCH FOUND */
function matchLevelFact(id){
  var meta = GP.levelMeta(id);
  var icon = LEVEL_ICONS[id]
    ? '<img class="fact-ico" src="' + LEVEL_ICONS[id] + '" alt="" aria-hidden="true">'
    : GP.levelDot(id);
  return '<span class="fact fact-level">'
    + icon + GP.esc(meta.label) + '</span>';
}

function setMatchLayout(id){
  ST.matchLayout = id === 'framed' ? 'framed' : 'open';
  if(ST.state !== 'matched'){
    ST.matching = true;
    ST.bg = 'hub';
    setState('matched');
    return;
  }
  render();
}

function matchSheet(){
  var accepted = (ST.matchPhase === 'accepted');
  var low = ST.offerLeft <= 10;
  var framed = ST.matchLayout === 'framed';
  var card = '<div class="match-card' + (accepted?' is-waiting':'') + (framed?' is-framed':'') + '">'
    + '<div class="match-intro">'
      + '<span class="match-photo"><img src="' + PARTNER.img + '" alt="' + GP.esc(PARTNER.name) + '"></span>'
      + '<div class="match-who">'
        + '<h4 class="match-name">' + GP.esc(PARTNER.name) + '</h4>'
        + '<div class="match-facts">'
          + matchLevelFact(PARTNER.level)
          + '<span class="fact fact-place"><img class="fact-pin" src="' + IMG_PIN + '" alt="" aria-hidden="true">' + GP.esc(PARTNER.location) + '</span>'
        + '</div>'
      + '</div>'
    + '</div>'
    + '<div class="ice">'
      + '<span class="ice-label">' + GP.esc(PARTNER.ice.label) + '</span>'
      + '<span class="ice-text">' + GP.esc(PARTNER.ice.text) + '</span>'
    + '</div>'
    + (accepted
        ? '<div class="match-waiting">'
          + '<p class="mw-line">Waiting for ' + GP.esc(PARTNER.name) + ' to confirm\u2026</p>'
          + GP.loadLine()
          + '</div>'
        : '')
    + '</div>';

  var acts = accepted
    ? '<button class="btn cream" type="button" onclick="declineMatch()">Keep looking instead</button>'
    : '<button class="btn primary" type="button" onclick="acceptMatch()">Meet ' + GP.esc(PARTNER.name) + '</button>'
      + '<button class="btn cream" type="button" onclick="declineMatch()">Keep looking</button>';

  var footer = accepted ? ''
    : '<div class="match-timer' + (low?' is-low':'') + '">'
      + '<span class="match-timer-num" id="offerNum">' + ST.offerLeft + 's</span>'
      + '<div class="respline"><i style="animation-duration:' + ST.offerLeft + 's"></i></div>'
    + '</div>';

  return cafeDialog({
    milky:true,
    cls:'match-dialog',
    title:'We found you a Caf\u00e9 partner!',
    body:card,
    acts:acts,
    footer:footer
  });
}

function screenMatched(){
  var behind = screenHub();
  if(ST.bg === 'searching') behind = screenSearching();
  else if(ST.bg === 'flashcards') behind = screenFlashcards();
  return behind + matchSheet();
}

/* --------------------------------------------------- 5. SESSION AGREEMENT */
function agreeIcon(kind){
  var paths = {
    welcome:'<path d="M12 3.6v2.4M12 18v2.4M3.6 12h2.4M18 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M17.8 6.2l-1.7 1.7M7.9 16.1l-1.7 1.7"/><circle cx="12" cy="12" r="2.8"/>',
    hebrew:'<path d="M5.5 8.2h10a2.8 2.8 0 010 5.6h-4.2L7.2 17.2v-3.4H5.5a2.8 2.8 0 010-5.6z"/>',
    present:'<circle cx="12" cy="12" r="7.4"/><path d="M12 8.2v4.1l2.5 1.5"/>',
    kind:'<path d="M12 18.2S6 14.2 6 10.4A3.2 3.2 0 0112 8.6a3.2 3.2 0 016 1.8c0 3.8-6 7.8-6 7.8z"/>'
  };
  return '<span class="agree-mark" aria-hidden="true">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + (paths[kind] || '') + '</svg></span>';
}

function screenAgreement(){
  var list = '';
  AGREEMENT_TERMS.forEach(function(t){
    list += '<li>'
      + agreeIcon(t.icon)
      + '<span class="agree-copy"><span class="agree-lead">' + GP.esc(t.lead) + '</span>'
      + '<span class="agree-support">' + GP.esc(t.support) + '</span></span>'
    + '</li>';
  });
  var ack = '<label class="agree-ack' + (ST.agreed?' is-on':'') + '">'
      + '<span class="agree-check">'
        + '<input id="agreeAck" type="checkbox"' + (ST.agreed?' checked':'') + ' onchange="onAgreeAck(this)">'
        + '<span class="agree-box" aria-hidden="true"></span>'
      + '</span>'
      + '<span class="agree-ack-copy">I\u2019m ready to show up for my partner.</span>'
    + '</label>';
  return lockup()
    + '<div class="cafe-shell"></div>'
    + cafeDialog({
        milky:true,
        cls:'agree-dialog',
        title:'Before you sit down',
        body:'<p class="agree-intro">Before jumping into the Caf\u00e9, here\u2019s what we\u2019re both agreeing to:</p>'
          + '<ul class="agree-list">' + list + '</ul>'
          + ack,
        acts:'<button class="btn primary" id="agreeCta" type="button" onclick="enterCafe()"'
          + (ST.agreed?'':' disabled') + '>Caf\u00e9 time!</button>'
      });
}

/* ------------------------------------------------- 6. LIVE CAFE SESSION */
function textSheet(){
  var log = '';
  ST.textLog.forEach(function(m){
    log += '<div class="ts-msg' + (m.own?' own':'') + '">' + GP.esc(m.text) + '</div>';
  });
  return '<aside class="panel cafe-text-panel" aria-label="Activity and text">'
    + '<div class="panel-head"><span class="pt">Right now</span>'
      + '<button class="pclose" type="button" onclick="closeText()" aria-label="Close"'
      + GP.hubTipAttrs('Close') + '>' + GP.I.x + '</button></div>'
    + '<div class="ts-activity"><div class="ts-title">' + GP.esc(ACTIVITY.title) + '</div>'
    + '<div class="ts-body">' + GP.esc(ACTIVITY.body) + '</div></div>'
    + (log ? '<div class="ts-log" id="tsLog">' + log + '</div>' : '')
    + '<div class="composer">'
      + '<input id="tsInput" type="text" placeholder="Spell it, or type a short answer\u2026" autocomplete="off">'
      + '<button class="send" type="button" onclick="sendText()"' + GP.hubTipAttrs('Send') + '>' + GP.I.send + '</button>'
    + '</div>'
    + '<p class="ts-note">Nothing here is saved after this chat.</p>'
    + '</aside>';
}

function leaveSheet(){
  return cafeDialog({
    milky:true,
    cls:'leave-dialog',
    onScrim:'closeLeave()',
    title:'End this Caf\u00e9?',
    body:'<p>If something feels wrong or uncomfortable, you can leave right away \u2014 and let the team know what happened.</p>',
    acts:'<button class="btn danger-soft" type="button" onclick="endSession()">End session</button>'
      + '<button class="btn cream" type="button" onclick="endSession()">Report an issue</button>'
      + '<button class="btn cream" type="button" onclick="closeLeave()">Stay</button>'
  });
}

function keepOnSheet(){
  return cafeDialog({
    milky:true,
    cls:'keep-on-dialog',
    onScrim:'closeKeepOn()',
    title:'Caf\u00e9 needs the camera and mic on to keep going.',
    body:'<p class="keep-on-q">Want to leave the session?</p>',
    acts:'<button class="btn primary" type="button" onclick="closeKeepOn()">Stay</button>'
      + '<button class="btn cream" type="button" onclick="endSession()">Leave</button>'
  });
}

function partnerOffSheet(){
  return cafeDialog({
    milky:true,
    cls:'partner-off-dialog' + (ST.partnerOffFind?' is-wait':''),
    title:GP.esc(PARTNER.name) + '\u2019s camera or mic seems to be off.',
    body:'<p>We\u2019ll find you a new partner if they don\u2019t come back soon.</p>'
      + '<div class="po-status" role="status" aria-live="polite">'
        + '<span class="po-spin" aria-hidden="true"></span>'
        + '<span class="po-status-copy">Trying to reconnect\u2026</span>'
      + '</div>'
      + '<div class="po-acts" aria-hidden="' + (ST.partnerOffFind?'false':'true') + '">'
        + '<button class="btn cream po-find" type="button" onclick="findNewPartner()">Find me a new partner</button>'
      + '</div>'
  });
}

function dockTipHtml(){
  return '<button class="dock-tip" type="button" onclick="dismissDockTip()">'
    + '<span class="dock-tip-copy">Stuck? Lean on the toolbar for topics and exercises.</span>'
    + '<span class="dock-tip-arrow" aria-hidden="true"></span>'
    + '</button>';
}

function screenLive(){
  var controls = [
    {icon:CI.wheel, label:'Spin the Wheel', accent:true, onclick:'openWheel()'},
    {icon:CI.bolt,  label:'Challenge mode', onclick:'openChallenge()'},
    {icon:GP.I.chat, label:'Activity and text', active:ST.textOpen, onclick:'toggleText()'},
    {divider:true},
    {icon:GP.I.cam, label:ST.camOff?'Turn camera on':'Turn camera off', slash:ST.camOff, onclick:'toggleCam()'},
    {icon:GP.I.mic, label:ST.micOff?'Unmute':'Mute', slash:ST.micOff, onclick:'toggleMic()'}
  ];
  var dock = cafeFooter(controls, {label:'Leave & report', onclick:'openLeave()'});
  var sheetOpen = ST.textOpen || ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet;
  if(ST.dockTip && !sheetOpen){
    dock = dock.replace('<div class="g-footer">', '<div class="g-footer">' + dockTipHtml());
  }

  return '<div class="cafe-shell deep"></div>'
    + '<div class="cafe-topbar">'
      + lockup()
      + '<div class="top-right">' + GP.timePill(ST.left, DUR.sessionFinal) + '</div>'
    + '</div>'
    + '<div class="cafe-tiles' + (ST.textOpen?' with-panel':'') + '">'
      + '<div class="g-split">'
        + cafeTile(PARTNER.name, {img:PARTNER.img, camOff:ST.partnerCamOff, micOff:ST.partnerMicOff})
        + cafeTile('You', {alt:true, img:IMG_YOU, camOff:ST.camOff, micOff:ST.micOff})
      + '</div>'
    + '</div>'
    + (ST.textOpen ? textSheet() : '')
    + dock
    + (ST.leaveSheet ? leaveSheet() : '')
    + (ST.keepOnSheet ? keepOnSheet() : '')
    + (ST.partnerOffSheet ? partnerOffSheet() : '');
}

/* ------------------------------ 7. SESSION ENDING / SEARCHING AGAIN */
function screenEnding(){
  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<main class="cafe-stage cafe-ending">'
      + '<div class="ending-copy">'
        + '<h2 class="g-display">That was a good one</h2>'
        + '<p class="g-sub">Six minutes of Hebrew, out loud.</p>'
      + '</div>'
      + '<div class="ending-row">'
        + '<span class="end-partner"><span class="av-sm"><img src="' + PARTNER.img + '" alt=""></span>'
          + 'You talked with ' + GP.esc(PARTNER.name) + '</span>'
        + '<div class="end-again">' + GP.loadDots() + '<span>Looking for your next partner\u2026</span></div>'
      + '</div>'
      + '<div class="cafe-acts">'
        + '<button class="btn ghost" type="button" onclick="stopMatching()">Stop matching</button>'
      + '</div>'
    + '</main>';
}

/* ----------------------------------------------------------- transitions */
function seedFor(state){
  ST.softLoading = false;
  if(state === 'entry'){
    ST.matching = false;
    ST.searchElapsed = 0;
    ST.exploreShown = false;
    ST.closeSheet = false;
    ST.textOpen = false; ST.textLog = [];
    ST.leaveSheet = false; ST.keepOnSheet = false;
    ST.agreed = false; ST.left = 0;
    ST.levelsSheet = false; ST.devSheet = false;
    ST.dockTip = false; ST.dockTipSeen = false;
    clearPartnerOff();
    clearTimeout(dockTipT); dockTipT = null;
  }
  if(state === 'avcheck'){ ST.left = 0; ST.devSheet = false; micReset(); }
  if(state === 'searching'){
    ST.matching = true; ST.left = DUR.searchTo; ST.levelsSheet = false;
    ST.closeSheet = false;
    clearPartnerOff();
  }
  if(state === 'hub'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'flashcards'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'matched'){
    ST.matchPhase = 'offer';
    ST.offerLeft = DUR.offer;
    ST.levelsSheet = false;
    ST.partner.name = PARTNER.name;
    ST.partner.level = PARTNER.level;
  }
  if(state === 'agreement'){ ST.agreed = false; }
  if(state === 'live'){
    ST.left = DUR.session; ST.textLog = []; ST.textOpen = false;
    ST.leaveSheet = false; ST.keepOnSheet = false;
    clearPartnerOff();
    if(!ST.dockTipSeen) armDockTip();
    else ST.dockTip = false;
  }
  if(state === 'ending'){
    ST.left = DUR.ending; ST.textOpen = false; ST.leaveSheet = false;
    ST.keepOnSheet = false; clearPartnerOff();
  }
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
/* Entry CTA is unchanged. Destination is now A/V check — matching starts there. */
function startSearch(){ setState('avcheck'); }
function startMatching(){
  if(ST.perm !== 'granted') return;
  ST.searchElapsed = 0;
  ST.exploreShown = false;
  ST.closeSheet = false;
  setState('searching');
}
function stopMatching(){
  ST.closeSheet = false;
  ST.exploreShown = false;
  setState('entry');
  cafeToast('Matching stopped.');
}

function openLevels(){ ST.levelsSheet = true; render(); }
function closeLevels(){ ST.levelsSheet = false; render(); }

function keepExploring(){
  ST.closeSheet = false;
  ST.state = 'hub';
  if(ST.matching && ST.left <= 0) ST.left = DUR.searchTo;
  try{ history.replaceState(null,'','#hub'); }catch(e){}
  render();
}
function keepMatchingExplore(){ keepExploring(); }
function openSearch(){
  ST.closeSheet = false;
  ST.state = 'searching';
  try{ history.replaceState(null,'','#searching'); }catch(e){}
  render();
}

function openCloseDecision(){
  if(ST.state !== 'searching') return;
  if(ST.closeSheet){ dismissCloseDecision(); return; }
  ST.closeSheet = true;
  if(document.getElementById('searchClosePop')) return;
  var host = document.getElementById('frame');
  if(!host) return;
  host.insertAdjacentHTML('beforeend', closeDecisionMarkup());
  var btn = document.getElementById('searchClose');
  if(btn) btn.setAttribute('aria-expanded', 'true');
  bindCloseDecisionFocus();
}
function dismissCloseDecision(){
  ST.closeSheet = false;
  var pop = document.getElementById('searchClosePop');
  var scrim = document.getElementById('searchCloseScrim');
  if(pop) pop.remove();
  if(scrim) scrim.remove();
  var btn = document.getElementById('searchClose');
  if(btn){
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }
}
function bindCloseDecisionFocus(){
  var pop = document.getElementById('searchClosePop');
  if(!pop) return;
  var nodes = pop.querySelectorAll('button:not([disabled])');
  if(!nodes.length) return;
  var primary = pop.querySelector('.btn.primary');
  (primary || nodes[0]).focus();
  if(pop._trap) pop.removeEventListener('keydown', pop._trap);
  pop._trap = function(e){
    if(e.key !== 'Tab') return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  pop.addEventListener('keydown', pop._trap);
}

function revealExplore(){
  if(ST.searchElapsed < DUR.exploreAfter) return;
  ST.exploreShown = true;
  if(ST.state !== 'searching') return;
  var stage = document.querySelector('.searching-stage');
  if(!stage || stage.classList.contains('is-late')) return;
  stage.classList.add('is-late');
  var a = document.getElementById('searchSupportA');
  var b = document.getElementById('searchSupportB');
  if(a) a.classList.remove('is-on');
  if(b) b.classList.add('is-on');
  var explore = document.getElementById('searchExplore');
  if(explore){
    explore.removeAttribute('aria-hidden');
    explore.removeAttribute('tabindex');
  }
}

function offerMatch(){
  ST.bg = (ST.state === 'flashcards') ? 'flashcards'
        : (ST.state === 'searching') ? 'searching' : 'hub';
  setState('matched');
}
function acceptMatch(){
  if(ST.state !== 'matched') return;
  ST.matchPhase = 'accepted';
  ST.left = DUR.partnerConfirm;
  render();
}
function declineMatch(){
  ST.matching = true;
  ST.left = DUR.searchTo;
  ST.searchElapsed = 0;
  ST.exploreShown = false;
  ST.closeSheet = false;
  ST.state = ST.bg;
  try{ history.replaceState(null, '', '#' + ST.state); }catch(e){}
  render();
}
function partnerDeclines(){
  declineMatch();
  cafeToast(PARTNER.name + ' kept looking. Still matching\u2026');
}
function bothAccepted(){ setState('agreement'); }

function onAgreeAck(el){
  ST.agreed = !!(el && el.checked);
  var btn = document.getElementById('agreeCta');
  if(btn) btn.disabled = !ST.agreed;
  var row = el && el.closest('.agree-ack');
  if(row) row.classList.toggle('is-on', ST.agreed);
}
function enterCafe(){ if(!ST.agreed) return; setState('live'); }

function setPerm(p){ ST.perm = p; render(); }
function toggleCam(){
  dismissDockTip();
  if(ST.state === 'live' && !ST.camOff){
    ST.keepOnSheet = true;
    ST.leaveSheet = false;
    ST.partnerOffSheet = false;
    clearTimeout(partnerOffT);
    render();
    return;
  }
  ST.camOff = !ST.camOff;
  render();
}
function toggleMic(){
  dismissDockTip();
  ST.micOff = !ST.micOff;
  if(ST.micOff) micReset();
  render();
}
function toggleBlur(){ ST.blur = !ST.blur; render(); }

var MIC_LEN = 4;
function micReset(){ ST.mic = {phase:'idle', left:0, pos:0}; }
function micRecord(){
  if(ST.micOff){ cafeToast('Turn your microphone on to test it'); return; }
  ST.mic = {phase:'recording', left:MIC_LEN, pos:0};
  render();
}
function micStop(){ ST.mic.phase = 'ready'; ST.mic.pos = 0; render(); }
function micPlay(){ ST.mic.phase = 'playing'; ST.mic.pos = 0; render(); }
function micPause(){ ST.mic.phase = 'ready'; render(); }

function openDevices(){ ST.devSheet = true; render(); }
function closeDevices(){ ST.devSheet = false; render(); }
function pickDevice(key, value){ DEVICES[key].value = value; render(); }

function openFlashcards(){ ST.closeSheet = false; setState('flashcards'); }
function closeFlashcards(){ ST.state = 'searching'; try{ history.replaceState(null,'','#searching'); }catch(e){} render(); }
function cardReveal(){ ST.cardRevealed = true; render(); }
function cardFlip(){ ST.cardRevealed = !ST.cardRevealed; ST.cardPlaying = false; render(); }
function cardMark(){ ST.cardMarked = !ST.cardMarked; render(); }
function cardPlay(){ ST.cardPlaying = !ST.cardPlaying; render(); }
function cardStep(d){ ST.card += d; ST.cardRevealed = false; ST.cardMarked = false; ST.cardPlaying = false; render(); }
function cardPrev(){ cardStep(-1); }
function cardNext(){ cardStep(1); }

function openWheel(){ dismissDockTip(); cafeToast('Spin the Wheel \u2014 entry point only in this pass'); }
function openChallenge(){ dismissDockTip(); cafeToast('Challenge mode \u2014 entry point only in this pass'); }

function toggleText(){ dismissDockTip(); ST.textOpen = !ST.textOpen; render(); }
function closeText(){ ST.textOpen = false; render(); }
function toggleChat(){ toggleText(); }
function sendText(){
  var el = document.getElementById('tsInput');
  if(!el) return;
  var text = el.value.trim();
  if(!text) return;
  ST.textLog.push({own:true, text:text});
  el.value = '';
  render();
}

function openLeave(){ dismissDockTip(); ST.leaveSheet = true; ST.keepOnSheet = false; ST.partnerOffSheet = false; clearTimeout(partnerOffT); render(); }
function closeLeave(){ ST.leaveSheet = false; render(); }
function closeKeepOn(){ ST.keepOnSheet = false; render(); }

var partnerOffT = null;
var dockTipT = null;
function armDockTip(){
  ST.dockTip = true;
  clearTimeout(dockTipT);
  dockTipT = setTimeout(function(){
    dockTipT = null;
    dismissDockTip();
  }, 8000);
}
function dismissDockTip(){
  clearTimeout(dockTipT);
  dockTipT = null;
  if(!ST.dockTip) return;
  ST.dockTip = false;
  ST.dockTipSeen = true;
  var el = document.querySelector('.dock-tip');
  if(!el) return;
  el.classList.add('is-out');
  el.setAttribute('disabled','');
  setTimeout(function(){ if(el.parentNode) el.remove(); }, 220);
}
function replayDockTip(){
  ST.dockTipSeen = false;
  if(ST.state !== 'live'){ setState('live'); return; }
  armDockTip();
  render();
}
function clearPartnerOff(){
  clearTimeout(partnerOffT);
  partnerOffT = null;
  ST.partnerOffSheet = false;
  ST.partnerOffFind = false;
  ST.partnerCamOff = false;
  ST.partnerMicOff = false;
}
function schedulePartnerOffFind(){
  clearTimeout(partnerOffT);
  partnerOffT = setTimeout(function(){
    partnerOffT = null;
    if(!ST.partnerOffSheet) return;
    ST.partnerOffFind = true;
    var el = document.querySelector('.partner-off-dialog');
    if(el){
      el.classList.add('is-wait');
      var acts = el.querySelector('.po-acts');
      if(acts) acts.setAttribute('aria-hidden','false');
    }
  }, DUR.partnerOffWait * 1000);
}
function partnerDropped(){
  dismissDockTip();
  if(ST.state !== 'live'){
    ST.state = 'live';
    seedFor('live');
    try{ history.replaceState(null, '', '#live'); }catch(e){}
  }
  ST.partnerCamOff = true;
  ST.partnerMicOff = true;
  ST.partnerOffSheet = true;
  ST.partnerOffFind = false;
  ST.leaveSheet = false;
  ST.keepOnSheet = false;
  schedulePartnerOffFind();
  render();
}
function partnerReconnected(){
  if(!ST.partnerOffSheet && !ST.partnerCamOff && !ST.partnerMicOff) return;
  clearPartnerOff();
  render();
}
function findNewPartner(){
  clearPartnerOff();
  setState('searching');
}
function endSession(){ ST.leaveSheet = false; ST.keepOnSheet = false; clearPartnerOff(); setState('ending'); }
function jumpFinal(){ if(ST.state !== 'live') setState('live'); ST.left = 20; render(); }

/* ------------------------------------------------------------- the clock */
var TIMED = {avcheck:1, searching:1, hub:1, flashcards:1, matched:1, live:1, ending:1};

function clockTick(){
  if(!ST.clockOn || !TIMED[ST.state]) return;
  var s = ST.state;

  if(s === 'avcheck'){
    if(ST.mic.phase === 'recording'){
      ST.mic.left--;
      if(ST.mic.left <= 0){ micStop(); return; }
      syncClockUI();
    } else if(ST.mic.phase === 'playing'){
      ST.mic.pos++;
      if(ST.mic.pos >= MIC_LEN){ micPause(); return; }
      render();
    }
    return;
  }
  if(s === 'searching' || s === 'hub' || s === 'flashcards'){
    if(!ST.matching) return;
    ST.searchElapsed++;
    ST.left--;
    if(ST.left <= 0){ offerMatch(); return; }
    if(s === 'searching') revealExplore();
    else if(ST.searchElapsed >= DUR.exploreAfter) ST.exploreShown = true;
    syncClockUI();
    return;
  }
  if(s === 'matched'){
    if(ST.matchPhase === 'accepted'){
      ST.left--;
      if(ST.left <= 0){ bothAccepted(); }
      return;
    }
    ST.offerLeft--;
    if(ST.offerLeft <= 0){
      declineMatch();
      cafeToast('The window closed. Still matching\u2026');
      return;
    }
    syncClockUI();
    return;
  }
  if(s === 'live'){
    ST.left--;
    if(ST.left <= 0){ setState('ending'); return; }
    syncClockUI();
    return;
  }
  if(s === 'ending'){
    ST.left--;
    if(ST.left <= 0){ keepExploring(); return; }
  }
}

function syncClockUI(){
  if(ST.state === 'searching'){
    syncSwitcher();
    return;
  }
  if(ST.state === 'avcheck'){
    var mc = document.querySelector('.mic-test .mt-count');
    if(mc) mc.textContent = ST.mic.left + 's';
    return;
  }
  if(ST.state === 'matched'){
    var n = document.getElementById('offerNum');
    if(n) n.textContent = ST.offerLeft + 's';
    var t = document.querySelector('.match-timer');
    if(t) t.classList.toggle('is-low', ST.offerLeft <= 10);
    syncSwitcher();
    return;
  }
  if(ST.state === 'live'){
    var pill = document.querySelector('.g-timepill');
    if(pill){
      var t = pill.querySelector('.time');
      if(t) t.textContent = GP.mmss(ST.left);
      pill.classList.toggle('final', ST.left <= DUR.sessionFinal);
    }
  }
  syncSwitcher();
}

/* ----------------------------------------------------------------- render */
function render(){
  var f = document.getElementById('frame');
  if(!f) return;
  var s = ST.state, html = '';
  if(s === 'entry') html = screenEntry();
  else if(s === 'avcheck') html = screenAvCheck();
  else if(s === 'searching') html = screenSearching();
  else if(s === 'hub') html = screenHub();
  else if(s === 'flashcards') html = screenFlashcards();
  else if(s === 'matched') html = screenMatched();
  else if(s === 'agreement') html = screenAgreement();
  else if(s === 'live') html = screenLive();
  else if(s === 'ending') html = screenEnding();
  else html = screenEntry();

  f.innerHTML = html + GP.softLoading(ST.softLoading);
  f.classList.toggle('on-light', s === 'hub' || (s === 'matched' && ST.bg === 'hub'));

  if(ST.textOpen){
    var log = document.getElementById('tsLog');
    if(log) log.scrollTop = log.scrollHeight;
    var input = document.getElementById('tsInput');
    if(input){
      input.focus();
      input.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') sendText(); });
    }
  }
  if(ST.closeSheet && ST.state === 'searching') bindCloseDecisionFocus();
  syncSwitcher();
}

/* ------------------------------------------------------------- switcher */
function syncSwitcher(){
  document.querySelectorAll('.sc').forEach(function(b){
    b.classList.toggle('on', b.dataset.sc === ST.state);
  });
  document.querySelectorAll('[data-match-layout]').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-match-layout') === ST.matchLayout);
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
      + (ST.state === 'matched' ? ' · offer ' + ST.offerLeft + 's (' + ST.matchPhase + ')' : '')
      + (ST.state === 'live' ? ' · ' + GP.mmss(ST.left) + ' left' : '')
      + (TIMED[ST.state] && ST.state !== 'live' && ST.state !== 'matched' ? ' · t-' + ST.left + 's' : '');
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
  setTimeout(startMatching, 2200);
}

function onCafeKey(ev){
  if(ev.key !== 'Escape') return;
  if(ST.closeSheet){ dismissCloseDecision(); return; }
  if(ST.devSheet){ closeDevices(); return; }
  if(ST.levelsSheet){ closeLevels(); return; }
  if(ST.textOpen && ST.state === 'live'){ closeText(); return; }
  if(ST.leaveSheet){ closeLeave(); return; }
  if(ST.keepOnSheet){ closeKeepOn(); return; }
  if(ST.state === 'flashcards'){ closeFlashcards(); }
}

function reviewSearchInitial(){
  ST.clockOn = false;
  ST.matching = true;
  ST.searchElapsed = 0;
  ST.exploreShown = false;
  ST.closeSheet = false;
  setState('searching');
}
function reviewSearchExplore(){
  ST.clockOn = false;
  ST.matching = true;
  ST.closeSheet = false;
  setState('searching');
  ST.searchElapsed = DUR.exploreAfter;
  ST.exploreShown = true;
  render();
}
function reviewSearchClose(){
  ST.clockOn = false;
  ST.matching = true;
  setState('searching');
  openCloseDecision();
}
function reviewHubMatching(){
  ST.clockOn = false;
  ST.matching = true;
  ST.searchElapsed = DUR.exploreAfter;
  ST.exploreShown = true;
  ST.closeSheet = false;
  keepExploring();
}
function reviewMatchingStopped(){
  ST.clockOn = false;
  stopMatching();
}

/* ---------------------------------------------------------------- boot */
function applyHash(){
  if(INTERVIEW) return;
  var h = (location.hash || '').replace('#','');
  if(h && ORDER.indexOf(h) !== -1 && h !== ST.state) setState(h);
}

(function boot(){
  var p = new URLSearchParams(location.search);
  INTERVIEW = p.get('mode') === 'interview';
  if(INTERVIEW){
    document.body.classList.add('present', 'interview');
    ST.state = 'entry';
    try{ history.replaceState(null, '', location.pathname + '?mode=interview#entry'); }catch(e){}
  } else {
    var s = p.get('state') || (location.hash || '').replace('#','');
    if(s && ORDER.indexOf(s) === -1) s = '';
    if(s) ST.state = s;
    if(p.get('mode') === 'presentation') document.body.classList.add('present');
  }
  seedFor(ST.state);

  document.querySelectorAll('.sc').forEach(function(b){
    b.onclick = function(){
      if(INTERVIEW) return;
      var v = b.dataset.sc;
      if(v === 'matched'){ ST.matching = true; ST.bg = 'hub'; }
      if(v === 'hub' || v === 'flashcards') ST.matching = true;
      if(v === 'searching'){
        ST.matching = true;
        ST.searchElapsed = 0;
        ST.exploreShown = false;
        ST.closeSheet = false;
      }
      setState(v);
    };
  });
  window.addEventListener('hashchange', applyHash);
  document.addEventListener('keydown', onCafeKey);

  GP.initHubTips();
  render();
  if(!INTERVIEW){
    var review = p.get('review');
    if(review === 'search-initial') reviewSearchInitial();
    else if(review === 'search-explore') reviewSearchExplore();
    else if(review === 'search-close') reviewSearchClose();
    else if(review === 'hub-matching') reviewHubMatching();
    else if(review === 'stopped') reviewMatchingStopped();
  }
  setInterval(clockTick, 1000);
})();
