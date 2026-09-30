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

   Entry / Preferences uses the mobile continuous level spectrum,
   composed horizontally for desktop (Welcome left, preferences right).
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
  sessionCenter:20,
  ending:7,
  partnerOffWait:9
};

var SEARCH_COPY = 'We\u2019ll tell you the moment someone\u2019s free.';

var INTERVIEW = false;

var NOTES = {
  entry:'1 · Cafe entry / matching preferences. Welcome + continuous level spectrum. All eligible levels selected by default. Nothing is matching yet.',
  avcheck:'2 · A/V check, before matching and mandatory on every entry. Its CTA is the real "Start matching".',
  searching:'3 · Active search. Matching is felt first. Flashcards stay optional; the first search line holds for the whole wait.',
  hub:'3b · Placeholder Hub carrying the persistent matching indicator. The Hub itself is not designed in this pass.',
  flashcards:'3c · Optional practice while waiting. Matching stays visible. A match interrupts it; declining returns here.',
  matched:'4 · Match found. A 30s interrupt over whatever you were doing. Accept keeps the same surface and waits for the partner.',
  agreement:'5 · Session agreement. Only after both accepted. Three principles to scan, one acknowledgement that enables the CTA. No decline.',
  live:'6 · Live Cafe. Two-person desktop tiles. Helper tools centered (Chat · Topics · Practice). Camera and mic sit on the right, with Leave. Topics opens the glass wheel; Practice opens one shared exercise card on the seam (Previous · Reveal · Next). Clock: yellow at 0:30, large on the seam at 0:20 (above the card while Practice is open).',
  ending:'7 · Ending. Time flies, then Find me another partner, or Go back to homepage.'
};

/* ------------------------------------------------------- matching scope */
/* Entry and Edit levels share the continuous spectrum (LEVEL_DATA + range).
   setScope remains as a mapping from the old three scopes onto that range. */
var SCOPES = [
  {id:'exact', label:'Exactly my level',    hint:'',                      lower:0, upper:0},
  {id:'below', label:'My level and below',  hint:'up to 3 levels lower',  lower:3, upper:0},
  {id:'above', label:'My level and above',  hint:'up to 3 levels higher', lower:0, upper:3}
];

/* ------------------------------------------- LEVEL DATA — from mobile Café */
/* Placeholder eligible ladder. Yellow is the mock learner so both sides of
   the range are visible. Replace wholesale when product data lands. */
var LEVEL_DATA = {
  source:'placeholder',
  myLevel:'yellow',
  eligible:['red','orange','pink','yellow','lightblue','blue','lime']
};

function myLevelIndex(){
  var i = LEVEL_DATA.eligible.indexOf(LEVEL_DATA.myLevel);
  return i < 0 ? 0 : i;
}
function clampLevelRange(lo, hi){
  var n = LEVEL_DATA.eligible.length;
  var me = myLevelIndex();
  if(n < 1) return [0, 0];
  lo = Math.max(0, Math.min(n - 1, lo|0));
  hi = Math.max(0, Math.min(n - 1, hi|0));
  if(lo > hi){ var t = lo; lo = hi; hi = t; }
  if(lo > me) lo = me;
  if(hi < me) hi = me;
  return [lo, hi];
}
function selectedFromRange(lo, hi){
  return LEVEL_DATA.eligible.slice(lo, hi + 1);
}
function applyLevelRange(lo, hi, opts){
  var r = clampLevelRange(lo, hi);
  ST.rangeLo = r[0];
  ST.rangeHi = r[1];
  ST.selected = selectedFromRange(ST.rangeLo, ST.rangeHi);
  ST.myLevel = LEVEL_DATA.myLevel;
  if(document.getElementById('levelSpectrum')){
    updateSpectrumDOM(opts || {});
    syncSwitcher();
    return;
  }
  render();
}
function ladderLabel(i){
  var ids = LEVEL_DATA.eligible;
  var id = ids[Math.max(0, Math.min(ids.length - 1, i))];
  return GP.esc(GP.levelMeta(id).label);
}

/* Eligible band for searching / partner draw — derived from the spectrum range. */
function eligibleBand(){
  var i = myLevelIndex();
  return {
    me:i,
    lo:ST.rangeLo,
    hi:ST.rangeHi,
    atBottomEdge:ST.rangeLo === 0 && i > 0 && ST.prefs.scope === 'below',
    beyondPlaceholder:false,
    renderableHi:ST.rangeHi
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
  red:'assets/level-icons/level-red.svg',
  orange:'assets/level-icons/level-orange.svg',
  pink:'assets/level-icons/level-pink.svg',
  yellow:'assets/level-icons/level-yellow.svg',
  lightblue:'assets/level-icons/level-lightblue.svg',
  blue:'assets/level-icons/level-blue.svg',
  lime:'assets/level-icons/level-lime.svg'
};
var IMG_PIN = 'assets/location-pin.png';

/* Content of the agreement is product-specified. This is the only copy of it.
   Three principles to scan, then one acknowledgement. No per-item ticks. */
var AGREEMENT_TERMS = [
  {icon:'hebrew',  lead:'Give Hebrew your best shot', support:'Mistakes are welcome!'},
  {icon:'present', lead:'Stay present',               support:'The session is just 6 minutes'},
  {icon:'kind',    lead:'Be kind to your partner',    support:'This is a safe space'}
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
  bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13.4 2.5L4.8 13.4h6L10.6 21.5 19.2 10.6h-6z"/></svg>',
  smile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 007 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>',
  chevUp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  chevDn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  /* Same glyph as Main Classroom footer chat (RAIL.CHAT). */
  chat:'<svg viewBox="0 0 222 222" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M111 194.25C156.974 194.25 194.25 156.978 194.25 111C194.25 65.022 156.978 27.75 111 27.75C65.022 27.75 27.75 65.022 27.75 111C27.75 126.125 31.783 140.308 38.833 152.531L31 184L63 175C76 187 93 194.25 111 194.25Z"/></svg>'
};

/* ------------------------------------------------------------------ state */
var ST = {
  state:'entry',
  myLevel:LEVEL_DATA.myLevel,
  prefs:{scope:'exact'},
  rangeLo:0,
  rangeHi:LEVEL_DATA.eligible.length - 1,
  selected:LEVEL_DATA.eligible.slice(),
  rangeHintSeen:false,
  specHot:-1,
  specActiveHandle:null,
  specInset:true,
  partner:{name:PARTNER.name, level:PARTNER.level},
  /* what the match interrupt is layered over */
  bg:'searching',
  /* True for as long as the Cafe matching session is live. It survives an
     individual chat ending; only an explicit stop or leaving Cafe clears it. */
  matching:false,
  matchPhase:'offer',
  matchLayout:'open',
  matchEnter:false,
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
  devMenu:null,
  levelsSheet:false,
  card:0, cardRevealed:false, cardMarked:false, cardPlaying:false,
  textOpen:false,
  textLog:[],
  textDraft:'',
  chatExpanded:false,
  chatUnread:0,
  chatPreview:null,
  chatDockAnim:null,
  leaveSheet:false,
  keepOnSheet:false,
  partnerOffSheet:false,
  partnerCamOff:false,
  partnerMicOff:false,
  partnerOffFind:false,
  agreed:false,
  dockTip:false,
  dockTipSeen:false,
  welcomeEntranceSeen:false,
  softLoading:false
};

/* ---------------------------------------------------------------- helpers */
function scopeById(id){
  for(var i=0;i<SCOPES.length;i++) if(SCOPES[i].id === id) return SCOPES[i];
  return SCOPES[0];
}
function scopeLabel(){ return GP.esc(scopeById(ST.prefs.scope).label); }
function searchScopeLabel(){
  var n = ST.rangeHi - ST.rangeLo + 1;
  if(n <= 1) return 'My level only';
  return 'Across ' + n + ' levels';
}

/* Draw a partner from inside the eligible band. Middle of the band, so the
   bottom edge is visible rather than always landing on your own level.
   Bounded by renderableHi because of the placeholder data, not by a rule. */
function drawPartnerLevel(){
  if(ST.selected && ST.selected.length){
    if(ST.selected.indexOf(PARTNER.level) !== -1) return PARTNER.level;
    return ST.selected[Math.floor(ST.selected.length / 2)];
  }
  return LEVEL_DATA.myLevel;
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

/* brandHidden keeps the lockup's space while the Welcome entrance owns the
   brand: the mark and the word are invisible until the opening mark flies up
   here, so the header never shows a second pair of cups and never shifts
   sideways when the brand arrives. */
function lockupSolo(brandHidden){
  return '<div class="lockup' + (brandHidden ? ' is-brand-hidden' : '') + '">'
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

function cafeControlBtn(it){
  if(it.divider) return '<span class="rc-div" aria-hidden="true"></span>';
  return '<button class="rc-btn' + (it.active?' is-active':'') + (it.accent?' accent':'')
    + (it.chat?' is-chat':'') + (it.badge?' has-unread':'') + '" type="button" onclick="'
    + (it.onclick||'') + '"' + GP.hubTipAttrs(it.label) + '>' + it.icon
    + (it.slash ? '<span class="slash"></span>' : '')
    + (it.badge ? '<span class="chat-badge">' + GP.esc(String(it.badge)) + '</span>' : '')
    + '</button>';
}
function cafeFooter(items, end, extras){
  extras = extras || {};
  var chatOpen = !!extras.chatOpen;
  var html = '<div class="g-footer">';
  if(extras.av && extras.av.length){
    html += '<div class="footer-av">';
    extras.av.forEach(function(it){ html += cafeControlBtn(it); });
    html += '</div>';
  }
  html += '<div class="footer-capsule' + (chatOpen && extras.chatAnim !== 'in' ? ' is-chat-open' : '') + '">';
  html += '<div class="footer-glass" aria-hidden="true"></div>';
  if(extras.preview) html += extras.preview;
  if(extras.overlay) html += extras.overlay;
  if(extras.composer) html += '<div class="cafe-composer-slot">' + extras.composer + '</div>';
  html += '<div class="footer-controls">';
  (items||[]).forEach(function(it){ html += cafeControlBtn(it); });
  html += '</div></div>';
  if(end){
    html += '<button class="footer-end" type="button" onclick="' + (end.onclick||'') + '"'
      + GP.hubTipAttrs(end.label) + '>' + GP.I.leave + '</button>';
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

/* Static Café cups mark — same final artwork as mobile Welcome. */
var CAFE_ICON_YELLOW_D = 'M269.50 42.50 L270.50 42.50 L270.50 51.50 L269.50 52.50 L269.50 59.50 L268.50 60.50 L268.50 66.50 L267.50 67.50 L267.50 71.50 L266.50 72.50 L266.50 75.50 L265.50 76.50 L265.50 79.50 L264.50 80.50 L264.50 82.50 L263.50 83.50 L263.50 86.50 L262.50 87.50 L262.50 89.50 L261.50 90.50 L261.50 92.50 L259.50 95.50 L259.50 97.50 L258.50 98.50 L258.50 100.50 L257.50 101.50 L257.50 102.50 L256.50 103.50 L256.50 104.50 L255.50 105.50 L255.50 106.50 L254.50 107.50 L254.50 108.50 L253.50 109.50 L253.50 110.50 L252.50 111.50 L251.50 114.50 L249.50 116.50 L249.50 117.50 L248.50 118.50 L247.50 118.50 L243.50 114.50 L242.50 114.50 L233.50 105.50 L233.50 104.50 L228.50 99.50 L228.50 98.50 L225.50 95.50 L225.50 94.50 L221.50 89.50 L221.50 88.50 L220.50 87.50 L219.50 84.50 L217.50 82.50 L217.50 81.50 L216.50 80.50 L216.50 78.50 L215.50 77.50 L215.50 76.50 L213.50 73.50 L213.50 71.50 L211.50 68.50 L211.50 66.50 L210.50 65.50 L210.50 63.50 L209.50 62.50 L209.50 60.50 L208.50 59.50 L208.50 57.50 L207.50 56.50 L207.50 53.50 L206.50 52.50 L206.50 49.50 L205.50 48.50 L216.50 48.50 L217.50 47.50 L234.50 47.50 L235.50 46.50 L246.50 46.50 L247.50 45.50 L256.50 45.50 L257.50 44.50 L263.50 44.50 L264.50 43.50 L268.50 43.50 Z';
var CAFE_ICON_STROKE_D = 'M268.50 0.50 L367.50 0.50 L368.50 1.50 L389.50 1.50 L390.50 2.50 L404.50 2.50 L405.50 3.50 L415.50 3.50 L416.50 4.50 L423.50 4.50 L424.50 5.50 L429.50 5.50 L430.50 6.50 L433.50 6.50 L437.50 8.50 L438.50 10.50 L438.50 18.50 L437.50 19.50 L437.50 22.50 L438.50 23.50 L440.50 23.50 L441.50 22.50 L450.50 22.50 L451.50 23.50 L454.50 23.50 L458.50 25.50 L460.50 27.50 L461.50 27.50 L467.50 33.50 L470.50 39.50 L470.50 41.50 L471.50 42.50 L471.50 54.50 L466.50 64.50 L461.50 69.50 L460.50 69.50 L456.50 72.50 L454.50 72.50 L444.50 77.50 L442.50 77.50 L439.50 79.50 L437.50 79.50 L434.50 81.50 L432.50 81.50 L427.50 84.50 L425.50 84.50 L422.50 86.50 L420.50 86.50 L418.50 88.50 L418.50 89.50 L416.50 91.50 L416.50 92.50 L414.50 94.50 L414.50 95.50 L412.50 97.50 L410.50 101.50 L406.50 105.50 L406.50 106.50 L394.50 118.50 L393.50 118.50 L385.50 125.50 L384.50 125.50 L379.50 129.50 L376.50 130.50 L374.50 132.50 L364.50 137.50 L362.50 137.50 L359.50 139.50 L357.50 139.50 L356.50 140.50 L354.50 140.50 L350.50 142.50 L347.50 142.50 L346.50 143.50 L343.50 143.50 L342.50 144.50 L338.50 144.50 L337.50 145.50 L331.50 145.50 L330.50 146.50 L303.50 146.50 L302.50 145.50 L296.50 145.50 L295.50 144.50 L292.50 144.50 L291.50 143.50 L284.50 142.50 L283.50 141.50 L281.50 141.50 L280.50 140.50 L275.50 139.50 L272.50 137.50 L270.50 137.50 L260.50 132.50 L258.50 130.50 L255.50 129.50 L253.50 127.50 L249.50 125.50 L241.50 134.50 L241.50 135.50 L226.50 149.50 L225.50 149.50 L219.50 154.50 L216.50 155.50 L214.50 157.50 L198.50 165.50 L196.50 165.50 L195.50 166.50 L193.50 166.50 L192.50 167.50 L190.50 167.50 L189.50 168.50 L187.50 168.50 L183.50 170.50 L179.50 170.50 L178.50 171.50 L174.50 171.50 L173.50 172.50 L167.50 172.50 L166.50 173.50 L142.50 173.50 L141.50 172.50 L135.50 172.50 L134.50 171.50 L125.50 170.50 L124.50 169.50 L122.50 169.50 L121.50 168.50 L119.50 168.50 L118.50 167.50 L116.50 167.50 L115.50 166.50 L110.50 165.50 L94.50 157.50 L92.50 155.50 L91.50 155.50 L89.50 153.50 L85.50 151.50 L82.50 148.50 L81.50 148.50 L67.50 135.50 L67.50 134.50 L62.50 129.50 L62.50 128.50 L59.50 125.50 L59.50 124.50 L51.50 113.50 L47.50 111.50 L45.50 111.50 L42.50 109.50 L40.50 109.50 L37.50 107.50 L35.50 107.50 L25.50 102.50 L23.50 102.50 L20.50 100.50 L18.50 100.50 L12.50 97.50 L10.50 95.50 L9.50 95.50 L3.50 88.50 L1.50 84.50 L1.50 82.50 L0.50 81.50 L0.50 69.50 L1.50 68.50 L2.50 63.50 L4.50 61.50 L4.50 60.50 L11.50 53.50 L17.50 50.50 L19.50 50.50 L20.50 49.50 L31.50 49.50 L33.50 50.50 L34.50 49.50 L34.50 45.50 L33.50 44.50 L33.50 36.50 L35.50 34.50 L37.50 34.50 L38.50 33.50 L41.50 33.50 L42.50 32.50 L46.50 32.50 L47.50 31.50 L54.50 31.50 L55.50 30.50 L64.50 30.50 L65.50 29.50 L78.50 29.50 L79.50 28.50 L98.50 28.50 L99.50 27.50 L143.50 27.50 L144.50 26.50 L164.50 26.50 L165.50 27.50 L196.50 27.50 L197.50 26.50 L197.50 20.50 L196.50 19.50 L196.50 10.50 L197.50 8.50 L201.50 6.50 L205.50 6.50 L206.50 5.50 L211.50 5.50 L212.50 4.50 L219.50 4.50 L220.50 3.50 L230.50 3.50 L231.50 2.50 L244.50 2.50 L245.50 1.50 L267.50 1.50 Z M202.50 15.50 L202.50 14.50 L200.50 15.50 L200.50 23.50 L202.50 27.50 L210.50 27.50 L211.50 28.50 L230.50 28.50 L231.50 29.50 L243.50 29.50 L244.50 30.50 L254.50 30.50 L255.50 31.50 L261.50 31.50 L262.50 32.50 L267.50 32.50 L268.50 33.50 L273.50 34.50 L275.50 36.50 L275.50 46.50 L274.50 47.50 L274.50 56.50 L273.50 57.50 L273.50 63.50 L272.50 64.50 L272.50 69.50 L271.50 70.50 L271.50 73.50 L270.50 74.50 L270.50 77.50 L269.50 78.50 L268.50 85.50 L267.50 86.50 L267.50 88.50 L266.50 89.50 L266.50 91.50 L265.50 92.50 L264.50 97.50 L262.50 100.50 L262.50 102.50 L255.50 116.50 L251.50 121.50 L254.50 124.50 L260.50 127.50 L262.50 129.50 L270.50 133.50 L272.50 133.50 L275.50 135.50 L277.50 135.50 L278.50 136.50 L280.50 136.50 L281.50 137.50 L283.50 137.50 L287.50 139.50 L290.50 139.50 L291.50 140.50 L295.50 140.50 L296.50 141.50 L300.50 141.50 L301.50 142.50 L310.50 142.50 L311.50 143.50 L323.50 143.50 L324.50 142.50 L333.50 142.50 L334.50 141.50 L339.50 141.50 L340.50 140.50 L347.50 139.50 L348.50 138.50 L350.50 138.50 L351.50 137.50 L353.50 137.50 L354.50 136.50 L359.50 135.50 L364.50 132.50 L366.50 132.50 L370.50 130.50 L372.50 128.50 L380.50 124.50 L383.50 121.50 L384.50 121.50 L387.50 118.50 L388.50 118.50 L400.50 107.50 L400.50 106.50 L406.50 100.50 L406.50 99.50 L409.50 96.50 L409.50 95.50 L415.50 87.50 L421.50 75.50 L421.50 73.50 L423.50 70.50 L423.50 68.50 L424.50 67.50 L424.50 65.50 L425.50 64.50 L425.50 62.50 L426.50 61.50 L426.50 59.50 L428.50 55.50 L429.50 48.50 L430.50 47.50 L430.50 43.50 L431.50 42.50 L431.50 38.50 L432.50 37.50 L432.50 32.50 L433.50 31.50 L433.50 23.50 L434.50 22.50 L434.50 15.50 L433.50 14.50 L432.50 15.50 L429.50 15.50 L428.50 16.50 L422.50 16.50 L421.50 17.50 L414.50 17.50 L413.50 18.50 L403.50 18.50 L402.50 19.50 L387.50 19.50 L386.50 20.50 L363.50 20.50 L362.50 21.50 L272.50 21.50 L271.50 20.50 L248.50 20.50 L247.50 19.50 L232.50 19.50 L231.50 18.50 L221.50 18.50 L220.50 17.50 L212.50 17.50 L211.50 16.50 L206.50 16.50 L205.50 15.50 L203.50 15.50 Z M40.50 42.50 L40.50 41.50 L38.50 41.50 L37.50 42.50 L37.50 49.50 L38.50 50.50 L38.50 58.50 L39.50 59.50 L39.50 64.50 L40.50 65.50 L40.50 69.50 L41.50 70.50 L41.50 74.50 L42.50 75.50 L43.50 82.50 L44.50 83.50 L44.50 85.50 L45.50 86.50 L45.50 88.50 L46.50 89.50 L46.50 91.50 L47.50 92.50 L48.50 97.50 L51.50 102.50 L51.50 104.50 L55.50 112.50 L57.50 114.50 L58.50 117.50 L63.50 123.50 L63.50 124.50 L66.50 127.50 L66.50 128.50 L83.50 145.50 L84.50 145.50 L87.50 148.50 L88.50 148.50 L96.50 154.50 L110.50 161.50 L112.50 161.50 L115.50 163.50 L117.50 163.50 L121.50 165.50 L124.50 165.50 L125.50 166.50 L128.50 166.50 L129.50 167.50 L133.50 167.50 L134.50 168.50 L139.50 168.50 L140.50 169.50 L168.50 169.50 L169.50 168.50 L175.50 168.50 L176.50 167.50 L179.50 167.50 L180.50 166.50 L187.50 165.50 L188.50 164.50 L193.50 163.50 L196.50 161.50 L198.50 161.50 L212.50 154.50 L214.50 152.50 L215.50 152.50 L217.50 150.50 L221.50 148.50 L225.50 144.50 L226.50 144.50 L243.50 127.50 L243.50 126.50 L246.50 123.50 L241.50 118.50 L240.50 118.50 L228.50 106.50 L228.50 105.50 L224.50 101.50 L224.50 100.50 L221.50 97.50 L221.50 96.50 L217.50 91.50 L209.50 75.50 L209.50 73.50 L207.50 70.50 L207.50 68.50 L206.50 67.50 L206.50 65.50 L205.50 64.50 L205.50 62.50 L203.50 58.50 L203.50 55.50 L202.50 54.50 L202.50 51.50 L201.50 50.50 L201.50 48.50 L200.50 47.50 L192.50 47.50 L191.50 48.50 L116.50 48.50 L115.50 47.50 L89.50 47.50 L88.50 46.50 L72.50 46.50 L71.50 45.50 L60.50 45.50 L59.50 44.50 L51.50 44.50 L50.50 43.50 L44.50 43.50 L43.50 42.50 L41.50 42.50 Z M206.50 31.50 L206.50 30.50 L102.50 30.50 L101.50 31.50 L81.50 31.50 L80.50 32.50 L67.50 32.50 L66.50 33.50 L56.50 33.50 L55.50 34.50 L48.50 34.50 L47.50 35.50 L43.50 35.50 L42.50 36.50 L39.50 36.50 L38.50 37.50 L41.50 39.50 L45.50 39.50 L46.50 40.50 L52.50 40.50 L53.50 41.50 L61.50 41.50 L62.50 42.50 L74.50 42.50 L75.50 43.50 L92.50 43.50 L93.50 44.50 L122.50 44.50 L123.50 45.50 L185.50 45.50 L186.50 44.50 L216.50 44.50 L217.50 43.50 L234.50 43.50 L235.50 42.50 L246.50 42.50 L247.50 41.50 L255.50 41.50 L256.50 40.50 L262.50 40.50 L263.50 39.50 L267.50 39.50 L270.50 37.50 L269.50 36.50 L266.50 36.50 L265.50 35.50 L260.50 35.50 L259.50 34.50 L252.50 34.50 L251.50 33.50 L242.50 33.50 L241.50 32.50 L228.50 32.50 L227.50 31.50 L207.50 31.50 Z M341.50 4.50 L341.50 3.50 L293.50 3.50 L292.50 4.50 L258.50 4.50 L257.50 5.50 L240.50 5.50 L239.50 6.50 L226.50 6.50 L225.50 7.50 L217.50 7.50 L216.50 8.50 L210.50 8.50 L209.50 9.50 L204.50 9.50 L203.50 10.50 L205.50 12.50 L210.50 12.50 L211.50 13.50 L217.50 13.50 L218.50 14.50 L227.50 14.50 L228.50 15.50 L241.50 15.50 L242.50 16.50 L261.50 16.50 L262.50 17.50 L305.50 17.50 L306.50 18.50 L328.50 18.50 L329.50 17.50 L372.50 17.50 L373.50 16.50 L392.50 16.50 L393.50 15.50 L406.50 15.50 L407.50 14.50 L416.50 14.50 L417.50 13.50 L423.50 13.50 L424.50 12.50 L429.50 12.50 L430.50 11.50 L429.50 9.50 L425.50 9.50 L424.50 8.50 L418.50 8.50 L417.50 7.50 L408.50 7.50 L407.50 6.50 L395.50 6.50 L394.50 5.50 L376.50 5.50 L375.50 4.50 L342.50 4.50 Z M271.50 42.50 L271.50 41.50 L269.50 41.50 L268.50 42.50 L264.50 42.50 L263.50 43.50 L257.50 43.50 L256.50 44.50 L248.50 44.50 L247.50 45.50 L236.50 45.50 L235.50 46.50 L219.50 46.50 L218.50 47.50 L206.50 47.50 L205.50 48.50 L205.50 51.50 L206.50 52.50 L206.50 55.50 L208.50 59.50 L208.50 62.50 L210.50 65.50 L210.50 67.50 L213.50 73.50 L213.50 75.50 L219.50 87.50 L221.50 89.50 L221.50 90.50 L223.50 92.50 L225.50 96.50 L228.50 99.50 L228.50 100.50 L232.50 104.50 L232.50 105.50 L241.50 114.50 L242.50 114.50 L247.50 119.50 L248.50 119.50 L252.50 114.50 L258.50 102.50 L258.50 100.50 L260.50 97.50 L260.50 95.50 L261.50 94.50 L261.50 92.50 L262.50 91.50 L262.50 89.50 L263.50 88.50 L263.50 86.50 L265.50 82.50 L265.50 79.50 L266.50 78.50 L266.50 75.50 L267.50 74.50 L267.50 71.50 L268.50 70.50 L268.50 66.50 L269.50 65.50 L269.50 59.50 L270.50 58.50 L270.50 51.50 L271.50 50.50 L271.50 43.50 Z M452.50 27.50 L452.50 26.50 L440.50 26.50 L437.50 28.50 L436.50 30.50 L436.50 36.50 L435.50 37.50 L435.50 42.50 L434.50 43.50 L434.50 46.50 L433.50 47.50 L433.50 50.50 L432.50 51.50 L431.50 58.50 L430.50 59.50 L430.50 61.50 L429.50 62.50 L429.50 64.50 L428.50 65.50 L427.50 70.50 L425.50 73.50 L425.50 75.50 L422.50 80.50 L423.50 81.50 L427.50 79.50 L429.50 79.50 L432.50 77.50 L434.50 77.50 L437.50 75.50 L439.50 75.50 L444.50 72.50 L446.50 72.50 L449.50 70.50 L451.50 70.50 L457.50 67.50 L459.50 65.50 L460.50 65.50 L465.50 59.50 L467.50 55.50 L467.50 51.50 L468.50 50.50 L467.50 41.50 L465.50 37.50 L463.50 35.50 L463.50 34.50 L459.50 30.50 L453.50 27.50 Z M26.50 53.50 L26.50 52.50 L24.50 53.50 L19.50 53.50 L13.50 56.50 L7.50 62.50 L4.50 68.50 L4.50 72.50 L3.50 73.50 L3.50 77.50 L4.50 78.50 L4.50 81.50 L5.50 82.50 L5.50 84.50 L6.50 86.50 L14.50 94.50 L18.50 96.50 L20.50 96.50 L23.50 98.50 L25.50 98.50 L35.50 103.50 L37.50 103.50 L40.50 105.50 L42.50 105.50 L47.50 108.50 L49.50 107.50 L46.50 102.50 L46.50 100.50 L43.50 94.50 L43.50 92.50 L41.50 88.50 L41.50 85.50 L39.50 81.50 L39.50 78.50 L38.50 77.50 L38.50 74.50 L37.50 73.50 L37.50 69.50 L36.50 68.50 L36.50 63.50 L35.50 62.50 L35.50 56.50 L32.50 53.50 L27.50 53.50 Z';
function cafeIconFinalMarkup(){
  return '<g class="cafe-icon-final">'
    + '<path fill="#F9E24C" d="' + CAFE_ICON_YELLOW_D + '"/>'
    + '<path fill="#F7F6EF" fill-rule="evenodd" d="' + CAFE_ICON_STROKE_D + '"/>'
    + '</g>';
}
function cafeCupsSvg(cls){
  return '<svg class="cafe-cups' + (cls?' '+cls:'') + '" viewBox="0 0 472 174" fill="none" overflow="visible" aria-hidden="true">'
    + cafeIconFinalMarkup()
    + '</svg>';
}

function rangeFeedbackCopy(){
  var ids = LEVEL_DATA.eligible;
  var n = ids.length;
  var span = ST.rangeHi - ST.rangeLo + 1;
  if(span >= n){
    return 'All levels selected - your best chance of meeting someone';
  }
  if(span === 1){
    return 'Matching you with other Yellow-level learners';
  }
  if(span <= 2){
    return 'A wider range may help you meet someone faster';
  }
  if(span >= Math.ceil(n * 0.6)){
    return 'Great range - you\u2019re more likely to meet someone quickly';
  }
  var lo = GP.levelMeta(ids[ST.rangeLo]).label;
  var hi = GP.levelMeta(ids[ST.rangeHi]).label;
  return 'Matching you from ' + lo + ' through ' + hi;
}

function specRingFor(color){
  var hex = String(color || '').replace('#','');
  if(hex.length !== 6) return 'rgba(55,50,48,.26)';
  var r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  var l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.58 ? 'rgba(55,50,48,.28)' : 'rgba(247,246,239,.34)';
}

function spectrumNodeHtml(id, index){
  var meta = GP.levelMeta(id);
  var mine = id === LEVEL_DATA.myLevel;
  var on = index >= ST.rangeLo && index <= ST.rangeHi;
  var label = meta.label + (mine ? ', your level' : '');
  var icon = LEVEL_ICONS[id]
    ? '<img class="spec-ico" src="' + LEVEL_ICONS[id] + '" alt="" aria-hidden="true" draggable="false">'
    : '';
  return '<button type="button" class="spec-node' + (on?' is-on':'') + (mine?' is-you':'') + '"'
    + ' data-idx="' + index + '" data-id="' + id + '"'
    + ' style="--lvl:' + meta.color + ';--spec-ring:' + specRingFor(meta.color) + '"'
    + ' aria-pressed="' + on + '"'
    + ' aria-label="' + GP.esc(label) + '"'
    + ' onclick="tapSpectrumLevel(' + index + ')">'
    + '<span class="spec-dot" aria-hidden="true">' + icon + '</span>'
  + '</button>';
}

/* Inverted arch ∩. Two symmetric cubics (ellipse quarters) so Yellow sits
   at the geometric apex and path-length midpoint. Handles travel the full
   path; nodes sit on an inset equal-length span, never under a handle. */
var SPEC_VB = {
  w:360,
  h:248,
  d:'M30 222 C30 155.77 97.21 102 180 102 C262.79 102 330 155.77 330 222'
};
var SPEC_GLASS_CAP = 56;
function specArcD(){ return SPEC_VB.d; }
function specRoot(){ return document.getElementById('levelSpectrum'); }
function specPadT(root){
  if(root && root._padT != null) return root._padT;
  return 0.085;
}
function specIndexToT(index, n, padT){
  n = n == null ? LEVEL_DATA.eligible.length : n;
  if(padT == null) padT = specPadT(specRoot());
  if(n < 2) return 0.5;
  return padT + index * (1 - 2 * padT) / (n - 1);
}
function specTToIndex(t, n, padT){
  n = n == null ? LEVEL_DATA.eligible.length : n;
  if(n < 2) return 0;
  if(padT == null) padT = specPadT(specRoot());
  var usable = 1 - 2 * padT;
  if(usable <= 0) return 0;
  var u = (t - padT) / usable;
  return Math.round(Math.max(0, Math.min(1, u)) * (n - 1));
}
function specSlotT(side, idx, n, padT){
  n = n == null ? LEVEL_DATA.eligible.length : n;
  if(padT == null) padT = specPadT(specRoot());
  if(side === 'lo'){
    if(idx <= 0) return 0;
    return (specIndexToT(idx - 1, n, padT) + specIndexToT(idx, n, padT)) / 2;
  }
  if(idx >= n - 1) return 1;
  return (specIndexToT(idx, n, padT) + specIndexToT(idx + 1, n, padT)) / 2;
}
function specYellowGuardT(root, side, n, me, padT){
  var slot = specSlotT(side, me, n, padT);
  var path = root && root.querySelector('.spec-hair');
  var pts = root && root._pts;
  if(!path || !pts || !pts[me]) return slot;
  var clear = specPxToVb(root, 20 + 11 + 8);
  var guarded = specTBeyondNode(path, pts[me], pts[me].t, side === 'lo' ? -1 : 1, clear);
  if(side === 'lo') return Math.min(slot, guarded);
  return Math.max(slot, guarded);
}
function specClampHandleT(side, t, n, me, padT){
  if(padT == null) padT = specPadT(specRoot());
  var root = specRoot();
  var loMax = specYellowGuardT(root, 'lo', n, me, padT);
  var hiMin = specYellowGuardT(root, 'hi', n, me, padT);
  if(side === 'lo') return Math.max(0, Math.min(loMax, t));
  return Math.max(hiMin, Math.min(1, t));
}
function specRangeFromHandles(loT, hiT, n, me, padT){
  var lo = me, hi = me;
  var i, nt;
  for(i = 0; i < n; i++){
    nt = specIndexToT(i, n, padT);
    if(nt + 0.0008 >= loT && nt - 0.0008 <= hiT){
      if(i < lo) lo = i;
      if(i > hi) hi = i;
    }
  }
  if(lo > me) lo = me;
  if(hi < me) hi = me;
  return [lo, hi];
}
function specPxToVb(root, px){
  var stage = root && root.querySelector('.spec-stage');
  var w = stage ? stage.getBoundingClientRect().width : SPEC_VB.w;
  return px * SPEC_VB.w / Math.max(1, w);
}
function specPathNormalIn(path, t){
  var len = path.getTotalLength();
  var along = len * Math.max(0, Math.min(1, t));
  var p = path.getPointAtLength(along);
  var p2 = path.getPointAtLength(Math.max(0, Math.min(len, along + 2)));
  var dx = p2.x - p.x, dy = p2.y - p.y;
  var L = Math.hypot(dx, dy) || 1;
  var nx = -dy / L, ny = dx / L;
  if(nx * (180 - p.x) + ny * (248 - p.y) < 0){ nx = -nx; ny = -ny; }
  return {x:p.x, y:p.y, nx:nx, ny:ny};
}
function specTBeyondNode(path, nodePt, startT, dir, minDist){
  var len = path.getTotalLength();
  var t = startT;
  var step = dir * 0.0035;
  var i, p, d;
  for(i = 0; i < 90; i++){
    t += step;
    if(t <= 0) return 0;
    if(t >= 1) return 1;
    p = path.getPointAtLength(len * t);
    d = Math.hypot(p.x - nodePt.x, p.y - nodePt.y);
    if(d >= minDist) return t;
  }
  return Math.max(0, Math.min(1, t));
}
function specRestHandleT(root, side, idx, n, padT){
  n = n == null ? LEVEL_DATA.eligible.length : n;
  if(padT == null) padT = specPadT(root);
  var me = myLevelIndex();
  if(idx === me) return specYellowGuardT(root, side, n, me, padT);
  return specSlotT(side, idx, n, padT);
}
function specHandlePoint(root, t, nudge){
  var path = root.querySelector('.spec-hair');
  if(!path) return {x:0, y:0};
  var nrm = specPathNormalIn(path, t);
  var x = nrm.x, y = nrm.y;
  if(!nudge) return {x:x, y:y};
  var knobR = specPxToVb(root, 11);
  var gap = specPxToVb(root, 4);
  var need = 0;
  root.querySelectorAll('.spec-node').forEach(function(node){
    var pill = node.querySelector('.spec-dot');
    if(!pill) return;
    var r = pill.getBoundingClientRect();
    var stage = root.querySelector('.spec-stage').getBoundingClientRect();
    var pcx = (r.left + r.width / 2 - stage.left) / stage.width * SPEC_VB.w;
    var pcy = (r.top + r.height / 2 - stage.top) / stage.height * SPEC_VB.h;
    var rx = specPxToVb(root, r.width / 2);
    var ry = specPxToVb(root, r.height / 2);
    var dx = Math.max(Math.abs(x - pcx) - rx, 0);
    var dy = Math.max(Math.abs(y - pcy) - ry, 0);
    var outside = Math.hypot(dx, dy);
    var overlap = knobR + gap - outside;
    if(Math.abs(x - pcx) <= rx && Math.abs(y - pcy) <= ry){
      overlap = knobR + gap + Math.min(rx - Math.abs(x - pcx), ry - Math.abs(y - pcy));
    }
    if(overlap > need) need = overlap;
  });
  need = Math.min(need, specPxToVb(root, 18));
  return {x: x + nrm.nx * need, y: y + nrm.ny * need};
}
function specNearestSlot(side, t, n, me, padT){
  var from = side === 'lo' ? 0 : me;
  var to = side === 'lo' ? me : n - 1;
  var i, best = from, bestD = Infinity, s, d;
  for(i = from; i <= to; i++){
    s = specSlotT(side, i, n, padT);
    d = Math.abs(s - t);
    if(d < bestD){ bestD = d; best = i; }
  }
  return best;
}
function levelSpectrum(){
  var ids = LEVEL_DATA.eligible;
  var me = myLevelIndex();
  var nodes = '';
  var tips = '';
  ids.forEach(function(id, i){
    nodes += spectrumNodeHtml(id, i);
    var meta = GP.levelMeta(id);
    var mine = id === LEVEL_DATA.myLevel;
    tips += '<div class="spec-tip" data-idx="' + i + '" data-id="' + id + '">'
      + '<span class="spec-tip-card">'
        + '<span class="spec-tip-name">' + GP.esc(meta.label) + '</span>'
        + (mine ? '<span class="spec-tip-you">You</span>' : '')
      + '</span>'
      + '<span class="spec-tip-anchor" aria-hidden="true"></span>'
    + '</div>';
  });
  var loLabel = GP.esc(GP.levelMeta(ids[ST.rangeLo]).label);
  var hiLabel = GP.esc(GP.levelMeta(ids[ST.rangeHi]).label);
  return '<div class="level-spectrum" id="levelSpectrum" role="group"'
    + ' aria-labelledby="cafeLevelsHeading" aria-describedby="specHintSr">'
    + '<div class="spec-board">'
      + '<div class="spec-stage">'
        + '<svg class="spec-svg" viewBox="0 0 ' + SPEC_VB.w + ' ' + SPEC_VB.h + '" overflow="visible" aria-hidden="true" focusable="false">'
          + '<defs>'
            + '<filter id="cafeSpecInset" x="-48" y="-48" width="456" height="344" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">'
              + '<feGaussianBlur in="SourceAlpha" stdDeviation="4.5" result="blur"/>'
              + '<feComposite in="blur" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="inner"/>'
              + '<feFlood flood-color="#000000" flood-opacity="0.32" result="color"/>'
              + '<feComposite in="color" in2="inner" operator="in" result="shadow"/>'
              + '<feComposite in="shadow" in2="SourceGraphic" operator="over"/>'
            + '</filter>'
          + '</defs>'
          + '<path class="spec-track" d="' + specArcD() + '"' + (ST.specInset === false ? '' : ' filter="url(#cafeSpecInset)"') + '/>'
          + '<path class="spec-hair" d="' + specArcD() + '"/>'
          + '<path class="spec-glass spec-glass-shadow" d="' + specArcD() + '" transform="translate(0 7)"/>'
          + '<path class="spec-glass spec-glass-contact" d="' + specArcD() + '" transform="translate(0 3)"/>'
          + '<path class="spec-glass spec-glass-body" d="' + specArcD() + '"/>'
          + '<path class="spec-glass spec-glass-volume" d="' + specArcD() + '"/>'
          + '<path class="spec-glass spec-glass-lower" d="' + specArcD() + '" transform="translate(0.8 2.2)"/>'
          + '<path class="spec-glass spec-glass-rim" d="' + specArcD() + '" transform="translate(-1.4 -2.1)"/>'
        + '</svg>'
        + '<div class="spec-nodes">' + nodes + '</div>'
        + '<button type="button" class="spec-handle spec-handle-lo" id="specHandleLo"'
          + ' role="slider" aria-label="Lower end of matching range"'
          + ' aria-valuemin="0" aria-valuemax="' + me + '" aria-valuenow="' + ST.rangeLo + '"'
          + ' aria-valuetext="' + loLabel + '">'
          + '<span class="spec-knob" aria-hidden="true"></span>'
        + '</button>'
        + '<button type="button" class="spec-handle spec-handle-hi" id="specHandleHi"'
          + ' role="slider" aria-label="Higher end of matching range"'
          + ' aria-valuemin="' + me + '" aria-valuemax="' + (ids.length - 1) + '" aria-valuenow="' + ST.rangeHi + '"'
          + ' aria-valuetext="' + hiLabel + '">'
          + '<span class="spec-knob" aria-hidden="true"></span>'
        + '</button>'
        + '<p class="spec-hint' + (ST.rangeHintSeen ? ' is-faded' : '') + '" id="specHintVis"'
          + ' aria-hidden="' + (ST.rangeHintSeen ? 'true' : 'false') + '">'
          + '<span class="spec-hint-arrow spec-hint-arrow-lo" aria-hidden="true">' + CI.chevRt + '</span>'
          + '<span class="spec-hint-copy">Drag the edges<br>to adjust your range</span>'
          + '<span class="spec-hint-arrow spec-hint-arrow-hi" aria-hidden="true">' + CI.chevRt + '</span>'
        + '</p>'
      + '</div>'
      + '<div class="spec-labels" id="specLabels" aria-hidden="true">' + tips + '</div>'
      + '<div class="spec-orient spec-orient-ends" aria-hidden="true">'
        + '<span><span class="spec-orient-full">Below<br>your level</span><span class="spec-orient-short">Lower<br>levels</span></span>'
        + '<span><span class="spec-orient-full">Above<br>your level</span><span class="spec-orient-short">Higher<br>levels</span></span>'
      + '</div>'
    + '</div>'
    + '<p class="spec-sr" id="specHintSr">Drag either handle to adjust a continuous matching range. Your level always stays inside it.</p>'
  + '</div>';
}
function applySpecPreviewVisuals(root){
  if(!root || specDrag) return;
  root.querySelectorAll('.spec-handle').forEach(function(el){
    el.classList.toggle('is-active', false);
    el.classList.toggle('is-pressed', false);
  });
  if(ST.specActiveHandle === 'lo'){
    var lo = document.getElementById('specHandleLo');
    if(lo) lo.classList.add('is-active');
  }
  if(ST.specActiveHandle === 'hi'){
    var hi = document.getElementById('specHandleHi');
    if(hi) hi.classList.add('is-active');
  }
}

var specDrag = null;
var specSettle = 0;
var specDidDrag = false;
function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function specPoints(svg){
  var path = (svg && svg.querySelector('.spec-hair')) || (svg && svg.querySelector('.spec-track'));
  if(!path || !path.getTotalLength) return [];
  var len = path.getTotalLength();
  var n = LEVEL_DATA.eligible.length;
  var padT = specPadT(specRoot());
  var pts = [];
  for(var i = 0; i < n; i++){
    var t = specIndexToT(i, n, padT);
    var p = path.getPointAtLength(len * t);
    pts.push({x:p.x, y:p.y, t:t, len:len * t, total:len});
  }
  return pts;
}
function layoutSpectrum(){
  var root = document.getElementById('levelSpectrum');
  if(!root) return;
  var svg = root.querySelector('.spec-svg');
  var path = svg && svg.querySelector('.spec-hair');
  if(path && path.getTotalLength){
    var len = path.getTotalLength();
    root._padT = Math.max(0.078, Math.min(0.12, 48 / len));
  }
  var pts = specPoints(svg);
  root._pts = pts;
  var vbW = SPEC_VB.w, vbH = SPEC_VB.h;
  pts.forEach(function(p, i){
    var node = root.querySelector('.spec-node[data-idx="' + i + '"]');
    if(!node) return;
    node.style.left = (p.x / vbW * 100) + '%';
    node.style.top = (p.y / vbH * 100) + '%';
  });
  updateSpectrumDOM();
}
function setFeedbackCopy(text, immediate){
  var live = document.getElementById('specFeedback');
  if(!live) return;
  live.setAttribute('data-copy', text);
  if(live.textContent === text){
    live.classList.remove('is-swap');
    return;
  }
  live.textContent = text;
  if(immediate || specDrag || prefersReducedMotion()){
    live.classList.remove('is-swap');
    return;
  }
  live.classList.remove('is-swap');
  void live.offsetWidth;
  live.classList.add('is-swap');
  window.setTimeout(function(){ live.classList.remove('is-swap'); }, 180);
}
function fadeRangeHint(){
  ST.rangeHintSeen = true;
  var hint = document.getElementById('specHintVis');
  if(hint){
    hint.classList.add('is-faded');
    hint.setAttribute('aria-hidden', 'true');
  }
}
function updateGlassPath(root, loT, hiT){
  var path = root.querySelector('.spec-hair');
  if(!path || !path.getTotalLength) return;
  var len = path.getTotalLength();
  var t0 = Math.max(0, Math.min(1, loT));
  var t1 = Math.max(0, Math.min(1, hiT));
  if(t1 < t0){ var s = t0; t0 = t1; t1 = s; }
  var span = Math.max(1, len * (t1 - t0));
  var cap = Math.min(SPEC_GLASS_CAP, Math.max(0, span - 10));
  var selected = Math.max(2, span - cap);
  var start = len * t0 + cap / 2;
  var dash = selected + ' ' + len;
  var off = String(-start);
  root.querySelectorAll('.spec-glass').forEach(function(g){
    g.setAttribute('stroke-dasharray', dash);
    g.setAttribute('stroke-dashoffset', off);
  });
}
function specPathPoint(path, t){
  var len = path.getTotalLength();
  var along = len * Math.max(0, Math.min(1, t));
  return path.getPointAtLength(along);
}
function placeHandleAt(el, xPct, yPct, snapping){
  if(!el) return;
  el.classList.toggle('is-snap', !!snapping);
  el.style.left = xPct;
  el.style.top = yPct;
}
function syncHandleAria(el, now, min, max, label){
  if(!el) return;
  el.setAttribute('aria-valuenow', String(now));
  el.setAttribute('aria-valuemin', String(min));
  el.setAttribute('aria-valuemax', String(max));
  el.setAttribute('aria-valuetext', label);
}
function specTipsOverlap(a, b, padX, padY){
  return !(a.right < b.left + padX || a.left > b.right - padX || a.bottom < b.top + padY || a.top > b.bottom - padY);
}
function layoutSpecLabels(root){
  var board = root.querySelector('.spec-board');
  var host = root.closest('.levels-dialog')
    || document.querySelector('.cafe-entry-prefs')
    || document.getElementById('frame');
  if(!board || !host) return;
  var boardBox = board.getBoundingClientRect();
  var hostBox = host.getBoundingClientRect();
  var pad = 12;
  var me = myLevelIndex();
  var hot = ST.specHot;
  var lo = ST.rangeLo, hi = ST.rangeHi;
  var visible = {};
  visible[me] = 'you';
  if(hot >= 0 && hot !== me) visible[hot] = 'hot';
  var placed = [];
  root.querySelectorAll('.spec-tip').forEach(function(tip){
    var i = parseInt(tip.getAttribute('data-idx'), 10);
    var kind = visible[i];
    tip.classList.toggle('is-on', !!kind);
    tip.classList.toggle('is-you', kind === 'you');
    tip.classList.toggle('is-hot', kind === 'hot' || (kind && i === hot));
    tip.classList.toggle('is-bound', kind === 'bound');
    tip.style.setProperty('--tip-shift', '0px');
    tip.style.setProperty('--tip-lift', '0px');
    if(!kind) return;
    var node = root.querySelector('.spec-node[data-idx="' + i + '"]');
    if(!node) return;
    var nb = node.getBoundingClientRect();
    tip.style.left = (nb.left + nb.width / 2 - boardBox.left) + 'px';
    tip.style.top = (nb.top - boardBox.top) + 'px';
    placed.push({
      el: tip,
      i: i,
      pri: kind === 'you' ? 1 : kind === 'hot' || i === hot ? 2 : 3
    });
  });
  function applyShift(el, extra){
    el.style.setProperty('--tip-shift', extra + 'px');
    var r = el.getBoundingClientRect();
    var shift = extra;
    if(r.left < hostBox.left + pad) shift += (hostBox.left + pad) - r.left;
    if(r.right > hostBox.right - pad) shift += (hostBox.right - pad) - r.right;
    el.style.setProperty('--tip-shift', shift + 'px');
    return shift;
  }
  placed.forEach(function(p){ applyShift(p.el, 0); });
  placed.sort(function(a, b){ return a.pri - b.pri; });
  var kept = [];
  placed.forEach(function(p){
    if(!p.el.classList.contains('is-on')) return;
    var extra = 0;
    var lift = 0;
    var tries;
    for(tries = 0; tries < 5; tries++){
      applyShift(p.el, extra);
      p.el.style.setProperty('--tip-lift', lift + 'px');
      var ra = p.el.getBoundingClientRect();
      var hit = null;
      kept.some(function(k){
        if(specTipsOverlap(ra, k.el.getBoundingClientRect(), 8, 4)){
          hit = k;
          return true;
        }
        return false;
      });
      if(!hit || p.pri === 1) break;
      var hb = hit.el.getBoundingClientRect();
      lift = Math.min(64, lift + Math.max(22, Math.ceil(ra.bottom - hb.top) + 6));
      extra += (ra.left + ra.width / 2 < hb.left + hb.width / 2) ? -18 : 18;
    }
    applyShift(p.el, extra);
    p.el.style.setProperty('--tip-lift', lift + 'px');
    var still = kept.some(function(k){
      return specTipsOverlap(p.el.getBoundingClientRect(), k.el.getBoundingClientRect(), 8, 4);
    });
    if(still && p.pri === 2 && p.i !== lo && p.i !== hi && p.i !== me){
      p.el.classList.remove('is-on', 'is-hot', 'is-bound');
      return;
    }
    kept.push(p);
  });
}
function updateSpectrumDOM(opts){
  opts = opts || {};
  var root = document.getElementById('levelSpectrum');
  if(!root) return;
  var ids = LEVEL_DATA.eligible;
  var n = ids.length;
  var me = myLevelIndex();
  var hot = ST.specHot;
  var padT = specPadT(root);
  var liveT = opts.liveT;
  root.querySelectorAll('.spec-node').forEach(function(node){
    var i = parseInt(node.getAttribute('data-idx'), 10);
    var on = i >= ST.rangeLo && i <= ST.rangeHi;
    var bound = i === ST.rangeLo || i === ST.rangeHi;
    node.classList.toggle('is-on', on);
    node.classList.toggle('is-hot', i === hot);
    node.classList.toggle('is-bound', bound);
    node.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  var loT = liveT ? liveT.lo : specRestHandleT(root, 'lo', ST.rangeLo, n, padT);
  var hiT = liveT ? liveT.hi : specRestHandleT(root, 'hi', ST.rangeHi, n, padT);
  if(loT > hiT){
    var mid = (loT + hiT) / 2;
    loT = Math.min(loT, mid);
    hiT = Math.max(hiT, mid);
  }
  updateGlassPath(root, loT, hiT);
  function placeHandle(el, t){
    if(!el) return;
    var pt = specHandlePoint(root, t, !liveT);
    placeHandleAt(el, (pt.x / SPEC_VB.w * 100) + '%', (pt.y / SPEC_VB.h * 100) + '%', !!opts.snapping);
  }
  var loEl = document.getElementById('specHandleLo');
  var hiEl = document.getElementById('specHandleHi');
  placeHandle(loEl, loT);
  placeHandle(hiEl, hiT);
  syncHandleAria(loEl, ST.rangeLo, 0, me, GP.levelMeta(ids[ST.rangeLo]).label);
  syncHandleAria(hiEl, ST.rangeHi, me, n - 1, GP.levelMeta(ids[ST.rangeHi]).label);
  applySpecPreviewVisuals(root);
  setFeedbackCopy(rangeFeedbackCopy(), !!liveT);
  layoutSpecLabels(root);
}
function specClientToVb(svg, clientX, clientY){
  if(!svg || !svg.createSVGPoint || !svg.getScreenCTM) return null;
  var ctm = svg.getScreenCTM();
  if(!ctm) return null;
  var pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(ctm.inverse());
}
function specClosestOnPath(path, x, y){
  var len = path.getTotalLength();
  var samples = 60;
  var bestL = 0, bestD = Infinity, bestP = path.getPointAtLength(0);
  var i, l, p, d;
  for(i = 0; i <= samples; i++){
    l = len * i / samples;
    p = path.getPointAtLength(l);
    d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if(d < bestD){ bestD = d; bestL = l; bestP = p; }
  }
  var step = len / samples;
  for(i = 0; i < 7; i++){
    step *= 0.5;
    var left = Math.max(0, bestL - step);
    var right = Math.min(len, bestL + step);
    var pl = path.getPointAtLength(left);
    var pr = path.getPointAtLength(right);
    var dl = (pl.x - x) * (pl.x - x) + (pl.y - y) * (pl.y - y);
    var dr = (pr.x - x) * (pr.x - x) + (pr.y - y) * (pr.y - y);
    if(dl < bestD){ bestD = dl; bestL = left; bestP = pl; }
    if(dr < bestD){ bestD = dr; bestL = right; bestP = pr; }
  }
  return {t: bestL / len, x:bestP.x, y:bestP.y, len:len, along:bestL};
}
function specPointFromEvent(root, clientX, clientY){
  var svg = root && root.querySelector('.spec-svg');
  var path = svg && svg.querySelector('.spec-hair');
  if(!path || !path.getTotalLength) return null;
  var loc = specClientToVb(svg, clientX, clientY);
  if(!loc) return null;
  return specClosestOnPath(path, loc.x, loc.y);
}
function nearestSpecIndex(root, clientX, clientY){
  var hit = specPointFromEvent(root, clientX, clientY);
  if(!hit) return 0;
  return specTToIndex(hit.t);
}
function hapticTick(){
  try{ if(navigator.vibrate) navigator.vibrate(8); }catch(e){}
}
function tapSpectrumLevel(index){
  var n = LEVEL_DATA.eligible.length;
  if(index < 0 || index >= n) return;
  if(specDrag || specDidDrag) return;
  fadeRangeHint();
  ST.specPreview = 'live';
  ST.specActiveHandle = null;
  ST.specHot = index;
  var me = myLevelIndex();
  if(index !== me){
    if(index < me) applyLevelRange(index, ST.rangeHi);
    else applyLevelRange(ST.rangeLo, index);
  } else {
    updateSpectrumDOM();
  }
  window.setTimeout(function(){
    if(ST.specHot === index && !specDrag){
      ST.specHot = -1;
      updateSpectrumDOM();
    }
  }, 420);
}
function specEaseOutSoftBack(t){
  var c1 = 0.26;
  var c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function specLockScroll(on){
  var screen = document.getElementById('frame');
  var root = document.getElementById('levelSpectrum');
  if(screen) screen.classList.toggle('is-spec-dragging', !!on);
  if(root) root.classList.toggle('is-dragging', !!on);
}
function specApplyLiveRange(side, t){
  var n = LEVEL_DATA.eligible.length;
  var me = myLevelIndex();
  var padT = specPadT(specRoot());
  t = specClampHandleT(side, t, n, me, padT);
  var loT = side === 'lo' ? t : specRestHandleT(specRoot(), 'lo', ST.rangeLo, n, padT);
  var hiT = side === 'hi' ? t : specRestHandleT(specRoot(), 'hi', ST.rangeHi, n, padT);
  if(loT > hiT){
    if(side === 'lo') loT = hiT;
    else hiT = loT;
  }
  var range = specRangeFromHandles(loT, hiT, n, me, padT);
  ST.rangeLo = range[0];
  ST.rangeHi = range[1];
  ST.selected = selectedFromRange(ST.rangeLo, ST.rangeHi);
  var hot = specTToIndex(t, n, padT);
  if(hot !== me && specDrag && specDrag.lastHot !== hot) hapticTick();
  ST.specHot = hot;
  if(specDrag){
    specDrag.lastHot = hot;
    specDrag.t = t;
    specDrag.loT = loT;
    specDrag.hiT = hiT;
  }
  updateSpectrumDOM({liveT:{lo:loT, hi:hiT}});
}
function specSettleTo(side, fromT, toT){
  if(specSettle){ cancelAnimationFrame(specSettle); specSettle = 0; }
  var n = LEVEL_DATA.eligible.length;
  var padT = specPadT(specRoot());
  var loT = side === 'lo' ? toT : specRestHandleT(specRoot(), 'lo', ST.rangeLo, n, padT);
  var hiT = side === 'hi' ? toT : specRestHandleT(specRoot(), 'hi', ST.rangeHi, n, padT);
  function finish(){
    ST.specHot = -1;
    ST.specActiveHandle = null;
    updateSpectrumDOM();
    syncSwitcher();
  }
  if(prefersReducedMotion() || Math.abs(toT - fromT) < 0.003){
    finish();
    return;
  }
  var start = performance.now();
  var dur = 210;
  function frame(now){
    var p = Math.min(1, (now - start) / dur);
    var e = specEaseOutSoftBack(p);
    var t = fromT + (toT - fromT) * e;
    var liveLo = side === 'lo' ? t : loT;
    var liveHi = side === 'hi' ? t : hiT;
    updateSpectrumDOM({liveT:{lo:liveLo, hi:liveHi}, snapping:p > 0.72});
    if(p < 1) specSettle = requestAnimationFrame(frame);
    else {
      specSettle = 0;
      finish();
    }
  }
  specSettle = requestAnimationFrame(frame);
}
function specOnHandleMove(e){
  if(!specDrag || e.pointerId !== specDrag.pointerId) return;
  e.preventDefault();
  var dx = e.clientX - specDrag.startX;
  var dy = e.clientY - specDrag.startY;
  if((dx * dx + dy * dy) > 9) specDidDrag = true;
  var hit = specPointFromEvent(specDrag.root, e.clientX, e.clientY);
  if(!hit) return;
  specApplyLiveRange(specDrag.side, hit.t);
}
function specOnHandleUp(e){
  if(!specDrag || e.pointerId !== specDrag.pointerId) return;
  e.preventDefault();
  var drag = specDrag;
  try{ drag.el.releasePointerCapture(e.pointerId); }catch(ex){}
  drag.el.removeEventListener('pointermove', specOnHandleMove);
  drag.el.removeEventListener('pointerup', specOnHandleUp);
  drag.el.removeEventListener('pointercancel', specOnHandleUp);
  drag.el.classList.remove('is-pressed', 'is-active');
  specLockScroll(false);
  var n = LEVEL_DATA.eligible.length;
  var me = myLevelIndex();
  var padT = specPadT(drag.root);
  var fromT = drag.t;
  var snapIdx = specNearestSlot(drag.side, fromT, n, me, padT);
  var next = drag.side === 'lo'
    ? clampLevelRange(snapIdx, ST.rangeHi)
    : clampLevelRange(ST.rangeLo, snapIdx);
  ST.rangeLo = next[0];
  ST.rangeHi = next[1];
  ST.selected = selectedFromRange(ST.rangeLo, ST.rangeHi);
  var toT = specRestHandleT(drag.root, drag.side, drag.side === 'lo' ? ST.rangeLo : ST.rangeHi, n, padT);
  specDrag = null;
  specSettleTo(drag.side, fromT, toT);
  window.setTimeout(function(){ specDidDrag = false; }, 80);
}
function specOnHandleDown(e){
  if(e.button != null && e.button !== 0) return;
  var el = e.currentTarget;
  var root = document.getElementById('levelSpectrum');
  if(!root || !el) return;
  e.preventDefault();
  e.stopPropagation();
  if(specSettle){ cancelAnimationFrame(specSettle); specSettle = 0; }
  fadeRangeHint();
  ST.specPreview = 'live';
  ST.specActiveHandle = el.id === 'specHandleLo' ? 'lo' : 'hi';
  specDidDrag = false;
  var n = LEVEL_DATA.eligible.length;
  var padT = specPadT(root);
  var t = specRestHandleT(root, ST.specActiveHandle, ST.specActiveHandle === 'lo' ? ST.rangeLo : ST.rangeHi, n, padT);
  specDrag = {
    side: ST.specActiveHandle,
    pointerId: e.pointerId,
    el: el,
    root: root,
    startX: e.clientX,
    startY: e.clientY,
    t: t,
    loT: specRestHandleT(root, 'lo', ST.rangeLo, n, padT),
    hiT: specRestHandleT(root, 'hi', ST.rangeHi, n, padT),
    lastHot: ST.specActiveHandle === 'lo' ? ST.rangeLo : ST.rangeHi
  };
  el.classList.add('is-pressed', 'is-active');
  specLockScroll(true);
  try{ el.setPointerCapture(e.pointerId); }catch(ex){}
  el.addEventListener('pointermove', specOnHandleMove);
  el.addEventListener('pointerup', specOnHandleUp);
  el.addEventListener('pointercancel', specOnHandleUp);
}
function specOnHandleKey(e){
  var side = e.currentTarget.id === 'specHandleLo' ? 'lo' : 'hi';
  var me = myLevelIndex();
  var n = LEVEL_DATA.eligible.length;
  var lo = ST.rangeLo, hi = ST.rangeHi;
  var key = e.key;
  if(side === 'lo'){
    if(key === 'ArrowLeft' || key === 'ArrowDown') lo -= 1;
    else if(key === 'ArrowRight' || key === 'ArrowUp') lo += 1;
    else if(key === 'Home') lo = 0;
    else if(key === 'End') lo = me;
    else return;
  } else {
    if(key === 'ArrowLeft' || key === 'ArrowDown') hi -= 1;
    else if(key === 'ArrowRight' || key === 'ArrowUp') hi += 1;
    else if(key === 'Home') hi = me;
    else if(key === 'End') hi = n - 1;
    else return;
  }
  e.preventDefault();
  fadeRangeHint();
  ST.specPreview = 'live';
  ST.specActiveHandle = null;
  ST.specHot = -1;
  applyLevelRange(lo, hi);
}
var entryCleanup = [];
function unbindEntrySpectrum(){
  if(specSettle){ cancelAnimationFrame(specSettle); specSettle = 0; }
  specDrag = null;
  specDidDrag = false;
  entryCleanup.forEach(function(fn){ try{ fn(); }catch(e){} });
  entryCleanup = [];
  specLockScroll(false);
}
function bindSpectrum(host){
  var root = document.getElementById('levelSpectrum');
  if(!root) return;
  layoutSpectrum();
  var lo = document.getElementById('specHandleLo');
  var hi = document.getElementById('specHandleHi');
  function bindHandle(el){
    if(!el) return;
    el.addEventListener('pointerdown', specOnHandleDown);
    el.addEventListener('keydown', specOnHandleKey);
    el.addEventListener('click', function(ev){
      if(specDidDrag){ ev.preventDefault(); ev.stopPropagation(); }
    });
  }
  bindHandle(lo);
  bindHandle(hi);
  function onNodeFocus(ev){
    var node = ev.target.closest && ev.target.closest('.spec-node');
    if(!node) return;
    ST.specHot = parseInt(node.getAttribute('data-idx'), 10);
    layoutSpecLabels(root);
  }
  function onNodeBlur(ev){
    var node = ev.target.closest && ev.target.closest('.spec-node');
    if(!node || specDrag) return;
    if(ST.specHot === parseInt(node.getAttribute('data-idx'), 10)){
      ST.specHot = -1;
      layoutSpecLabels(root);
    }
  }
  root.addEventListener('focusin', onNodeFocus);
  root.addEventListener('focusout', onNodeBlur);
  function onNodeHover(ev){
    var node = ev.target.closest && ev.target.closest('.spec-node');
    if(!node || specDrag) return;
    ST.specHot = parseInt(node.getAttribute('data-idx'), 10);
    layoutSpecLabels(root);
  }
  function onNodeUnhover(ev){
    var node = ev.target.closest && ev.target.closest('.spec-node');
    if(!node || specDrag) return;
    if(document.activeElement === node) return;
    if(ST.specHot === parseInt(node.getAttribute('data-idx'), 10)){
      ST.specHot = -1;
      layoutSpecLabels(root);
    }
  }
  root.addEventListener('pointerenter', onNodeHover, true);
  root.addEventListener('pointerleave', onNodeUnhover, true);
  entryCleanup.push(function(){
    root.removeEventListener('focusin', onNodeFocus);
    root.removeEventListener('focusout', onNodeBlur);
    root.removeEventListener('pointerenter', onNodeHover, true);
    root.removeEventListener('pointerleave', onNodeUnhover, true);
  });
  function onResize(){ if(!specDrag) layoutSpectrum(); }
  window.addEventListener('resize', onResize);
  entryCleanup.push(function(){ window.removeEventListener('resize', onResize); });
  if(typeof ResizeObserver !== 'undefined'){
    var ro = new ResizeObserver(onResize);
    ro.observe(root);
    entryCleanup.push(function(){ ro.disconnect(); });
  }
}

/* =========================================================================
   WELCOME ENTRANCE — approved Café animation · hybrid-1
   The motion is the locked playground checkpoint
   ?restore=cafe-welcome-approved-hybrid-1, mounted from the same generated
   renderer the mobile Café uses: ../cafe-playground-mobile/js/cafe-welcome-anim.js.
   Playback rate, the copy cue, the closing reduction of the mark and the
   readable hold all come from that module's approved PLAY block, so the two
   surfaces play the identical gesture at the identical speed and neither can
   drift. Nothing about the choreography is reinterpreted here. This surface
   decides only where the mark sits, when the split layout arrives, and how the
   brand lands in the header.
   ========================================================================= */
/* Fallback for the readable hold the shared module carries. */
var DESKTOP_WELCOME_HOLD_MS = 750;
/* Reduced motion, or a missing renderer: the finished mark and the copy are
   shown together and read briefly before the split arrives. */
var DESKTOP_WELCOME_STILL_MS = 620;
/* The split reveal — text into the left panel, levels into the right, the mark
   into the header — and the shortened one an early advance gets. */
var DESKTOP_WELCOME_REVEAL_MS = 760;
var DESKTOP_WELCOME_SHORT_MS = 420;
var DESKTOP_WELCOME_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
var DESKTOP_WELCOME_SLIDE = {
  mark: {delay:0, duration:740},
  title:{delay:70, duration:640},
  copy: {delay:150, duration:600}
};
var DESKTOP_WELCOME_SLIDE_SHORT = {
  mark: {delay:0, duration:408},
  title:{delay:36, duration:352},
  copy: {delay:80, duration:330}
};
var desktopWelcomeAdvancing = false;
/* Playback state. The millisecond on screen is kept so an early advance can
   resolve the gesture from where it actually is. */
var desktopWelcomeAnim = 0;
var desktopWelcomeResolve = null;
var desktopWelcomeLastMs = 0;
var desktopBrandFlight = null;

function cafeAnimApi(){ return window.CafeWelcomeAnim || null; }
function desktopReducedMotion(){
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
/* The approved animation, or the approved static mark if the renderer is not
   loaded — the screen still reads, it simply does not move. */
function desktopWelcomeMarkup(){
  var api = cafeAnimApi();
  return api ? api.markup() : cafeCupsSvg('is-static');
}
function desktopWelcomeHoldMs(){
  var api = cafeAnimApi();
  return api ? api.PLAY.HOLD_MS : DESKTOP_WELCOME_HOLD_MS;
}
function desktopSmooth01(t){
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

/* One layout pass for the mark. While the gesture plays it is drawn at its
   stage size reduced by the approved closing curve; the flight to the header
   takes the same box over from there, so the reduction and the flight read as
   one continuous shrink. Sized by its own box rather than by transform:scale,
   so it is drawn at its true size on every frame and lands rasterised exactly
   as the header's own copy is. */
function layoutDesktopWelcomeMark(scale){
  if(desktopBrandFlight) return;
  var stage = document.getElementById('cafeEntryHero');
  var mark = document.getElementById('cafeEntryMark');
  if(!stage || !mark) return;
  var w = stage.clientWidth, h = stage.clientHeight;
  if(!w) return;
  var mw = w * scale, mh = h * scale;
  mark.style.width = mw + 'px';
  mark.style.height = mh + 'px';
  mark.style.transform = 'translate(' + ((w - mw) / 2) + 'px,' + ((h - mh) / 2) + 'px)';
}
function paintDesktopWelcomeFrame(ms){
  var api = cafeAnimApi();
  var mark = document.getElementById('cafeEntryMark');
  if(!api || !mark) return;
  api.frame(mark, ms);
  layoutDesktopWelcomeMark(api.markScaleAt(ms));
}
function revealDesktopWelcomeCopy(main){
  if(main) main.classList.add('is-copy-in');
}
function stopDesktopWelcomeAnim(){
  if(desktopWelcomeAnim) cancelAnimationFrame(desktopWelcomeAnim);
  desktopWelcomeAnim = 0;
  desktopWelcomeResolve = null;
}
/* Reduced motion, or no renderer: the approved final mark at its settled size,
   with the copy alongside it. No gesture. */
function settleDesktopWelcomeAnim(main){
  var api = cafeAnimApi();
  stopDesktopWelcomeAnim();
  if(api){
    desktopWelcomeLastMs = api.TOTAL_MS;
    paintDesktopWelcomeFrame(api.TOTAL_MS);
  }
  revealDesktopWelcomeCopy(main);
}
/* Returns the playback length, or 0 when nothing is being played. */
function playDesktopWelcomeAnim(main){
  var api = cafeAnimApi();
  stopDesktopWelcomeAnim();
  desktopWelcomeLastMs = 0;
  if(!api || !document.getElementById('cafeEntryMark')){
    revealDesktopWelcomeCopy(main);
    return 0;
  }
  if(desktopReducedMotion()){
    settleDesktopWelcomeAnim(main);
    return 0;
  }
  var total = api.TOTAL_MS, play = api.PLAY, t0 = performance.now();
  /* First frame painted before the clock starts, so the entry never flashes the
     finished mark and then restarts. */
  paintDesktopWelcomeFrame(0);
  desktopWelcomeAnim = requestAnimationFrame(function tick(now){
    var ms = api.sourceAt(now - t0);
    if(desktopWelcomeResolve){
      /* Advanced early: the remaining span is run out on its own easing from
         wherever the mark had got to, rather than cut to the final frame. */
      var r = desktopSmooth01((now - desktopWelcomeResolve.at) / play.RESOLVE_MS);
      ms = desktopWelcomeResolve.from + (total - desktopWelcomeResolve.from) * r;
    }
    if(ms > total) ms = total;
    desktopWelcomeLastMs = ms;
    paintDesktopWelcomeFrame(ms);
    if(ms >= play.COPY_MS) revealDesktopWelcomeCopy(main);
    if(ms >= total){
      desktopWelcomeAnim = 0;
      desktopWelcomeResolve = null;
      revealDesktopWelcomeCopy(main);
      return;
    }
    desktopWelcomeAnim = requestAnimationFrame(tick);
  });
  return api.playDuration();
}
function resolveDesktopWelcomeAnim(main){
  /* If the copy had not been cued yet it still fades in rather than appearing
     all at once alongside the split layout. */
  if(main && !main.classList.contains('is-copy-in')) main.classList.add('is-copy-late');
  revealDesktopWelcomeCopy(main);
  if(!desktopWelcomeAnim || desktopWelcomeResolve) return;
  desktopWelcomeResolve = {from: desktopWelcomeLastMs, at: performance.now()};
}

/* ------------------------------------------------- the mark into the header
   The finished mark becomes the header's mark: the same node travels there and
   parks on the box the lockup has been reserving for it. So there is never a
   second cups illustration on screen, nothing crossfades at the end of the
   flight, and the settled Welcome panel holds the text alone. */
function desktopBrandLockup(){
  return document.querySelector('.frame.is-entry .lockup') || document.querySelector('.lockup');
}
function desktopMarkAspect(mark){
  var svg = mark && mark.querySelector('svg');
  var vb = svg && svg.viewBox && svg.viewBox.baseVal;
  return vb && vb.width && vb.height ? vb.width / vb.height : 118 / 44;
}
function parkDesktopBrandMark(){
  var mark = document.querySelector('.cafe-brand-fly');
  var lock = mark && mark.parentNode;
  var dest = lock && lock.querySelector && lock.querySelector('.cafe-mark');
  if(!mark || !dest) return;
  var lockBox = lock.getBoundingClientRect();
  var to = dest.getBoundingClientRect();
  if(!to.width) return;
  var h = to.width / desktopMarkAspect(mark);
  mark.style.transition = 'none';
  mark.style.transform = 'none';
  mark.style.left = (to.left - lockBox.left) + 'px';
  mark.style.top = (to.top + to.height / 2 - h / 2 - lockBox.top) + 'px';
  mark.style.width = to.width + 'px';
  mark.style.height = h + 'px';
  void mark.offsetWidth;
  /* Parked: it now carries the same soft lift as the header art everywhere else
     in Café. Not while it is flying — the gesture renders as approved. */
  mark.style.transition = 'filter 220ms ease';
  mark.classList.add('is-parked');
}
/* Lift the mark out of the composition onto the header lockup, still drawn at
   the size and place it had. Measured before the split layout is applied. */
function beginDesktopBrandFlight(from){
  desktopBrandFlight = null;
  var mark = document.getElementById('cafeEntryMark');
  var lock = desktopBrandLockup();
  var dest = lock && lock.querySelector('.cafe-mark');
  if(!mark || !lock || !dest || !from || !from.width) return false;
  var lockBox = lock.getBoundingClientRect();
  var to = dest.getBoundingClientRect();
  if(!to.width) return false;
  /* Matched on width: the header art and the renderer draw the same cups in a
     hair-different box, and width is what the eye reads. */
  var w1 = to.width, h1 = to.width / desktopMarkAspect(mark);
  var x0 = from.left - lockBox.left, y0 = from.top - lockBox.top;
  desktopBrandFlight = {
    mark: mark, lock: lock,
    w1: w1, h1: h1,
    dx: (to.left - lockBox.left) - x0,
    dy: (to.top + to.height / 2 - h1 / 2 - lockBox.top) - y0
  };
  mark.className = 'cafe-brand-fly';
  lock.appendChild(mark);
  mark.style.transition = 'none';
  mark.style.left = x0 + 'px';
  mark.style.top = y0 + 'px';
  mark.style.width = from.width + 'px';
  mark.style.height = from.height + 'px';
  mark.style.transform = 'none';
  void mark.offsetWidth;
  return true;
}
function runDesktopBrandFlight(ms){
  var f = desktopBrandFlight;
  if(!f) return;
  var ease = ' ' + ms + 'ms ' + DESKTOP_WELCOME_EASE;
  f.mark.style.transition = 'width' + ease + ', height' + ease + ', transform' + ease;
  f.mark.style.width = f.w1 + 'px';
  f.mark.style.height = f.h1 + 'px';
  f.mark.style.transform = 'translate(' + f.dx.toFixed(2) + 'px,' + f.dy.toFixed(2) + 'px)';
  /* The word joins late in the flight, so the mark arrives first and the lockup
     completes itself rather than announcing itself. */
  var word = f.lock.querySelector('.session-id');
  if(word) word.style.transitionDelay = Math.round(ms * 0.46) + 'ms';
  f.lock.classList.add('is-brand-in');
}

function welcomeFlyItems(main){
  return [
    {el: main.querySelector('.cafe-welcome-fly-title'), key:'title'},
    {el: main.querySelector('.cafe-welcome-fly-copy'), key:'copy'}
  ];
}

function clearWelcomeSlide(main){
  if(!main) return;
  welcomeFlyItems(main).forEach(function(item){
    if(!item.el) return;
    item.el.style.transition = '';
    item.el.style.transform = '';
    item.el.style.transformOrigin = '';
    item.el.style.willChange = '';
  });
}

function welcomeRect(el){
  var r = el.getBoundingClientRect();
  return {left:r.left, top:r.top, width:r.width, height:r.height};
}

function playWelcomeSlide(main, shortened){
  var items = welcomeFlyItems(main).filter(function(item){ return item.el; });
  var times = shortened ? DESKTOP_WELCOME_SLIDE_SHORT : DESKTOP_WELCOME_SLIDE;
  var stage = main.querySelector('.cafe-welcome-fly-hero');
  var mark = document.getElementById('cafeEntryMark');
  /* Where each part stands now, before the split layout is applied. */
  var markFrom = mark ? welcomeRect(mark) : null;
  var first = items.map(function(item){ return welcomeRect(item.el); });
  var flying = beginDesktopBrandFlight(markFrom);
  if(stage && stage.parentNode) stage.parentNode.removeChild(stage);
  main.classList.remove('is-intro');
  main.classList.add('is-revealing');
  if(shortened) main.classList.add('is-accelerated');
  if(typeof layoutSpectrum === 'function') layoutSpectrum();
  void main.offsetWidth;
  var maxEnd = flying ? times.mark.delay + times.mark.duration : 0;
  items.forEach(function(item, i){
    var last = welcomeRect(item.el);
    var dx = first[i].left - last.left;
    var dy = first[i].top - last.top;
    var t = times[item.key];
    maxEnd = Math.max(maxEnd, t.delay + t.duration);
    item.el.style.transition = 'none';
    item.el.style.transformOrigin = '0 0';
    item.el.style.willChange = 'transform';
    item.el.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
  });
  window.requestAnimationFrame(function(){
    window.requestAnimationFrame(function(){
      if(!main.isConnected || !desktopWelcomeAdvancing) return;
      items.forEach(function(item){
        var t = times[item.key];
        item.el.style.transition = 'transform ' + t.duration + 'ms ' + DESKTOP_WELCOME_EASE + ' ' + t.delay + 'ms';
        item.el.style.transform = 'translate(0,0)';
      });
      runDesktopBrandFlight(times.mark.duration);
    });
  });
  return maxEnd || (shortened ? DESKTOP_WELCOME_SHORT_MS : DESKTOP_WELCOME_REVEAL_MS);
}

function finishDesktopWelcomeEntrance(main){
  if(!main || !main.isConnected) return;
  var prefs = main.querySelector('.cafe-entry-prefs');
  clearWelcomeSlide(main);
  main.classList.remove('is-intro','is-revealing','is-accelerated','is-copy-in','is-copy-late');
  main.classList.add('is-ready');
  if(prefs){
    prefs.removeAttribute('aria-hidden');
    prefs.inert = false;
  }
  /* The mark ends on the approved final icon, parked on the header's own box. */
  var api = cafeAnimApi();
  var landed = document.querySelector('.cafe-brand-fly');
  stopDesktopWelcomeAnim();
  if(api && landed) api.frame(landed, api.TOTAL_MS);
  desktopBrandFlight = null;
  parkDesktopBrandMark();
  desktopWelcomeAdvancing = false;
}

function advanceDesktopWelcomeEntrance(shortened){
  var main = document.querySelector('.cafe-entry.is-intro');
  if(!main || desktopWelcomeAdvancing) return;
  desktopWelcomeAdvancing = true;
  ST.welcomeEntranceSeen = true;
  var duration;
  if(desktopReducedMotion()){
    /* No flight: the mark leaves the composition and the header brand is simply
       complete, without travel or bounce. */
    var stage = main.querySelector('.cafe-welcome-fly-hero');
    if(stage && stage.parentNode) stage.parentNode.removeChild(stage);
    var lock = desktopBrandLockup();
    if(lock) lock.classList.remove('is-brand-hidden');
    if(shortened) main.classList.add('is-accelerated');
    main.classList.remove('is-intro');
    main.classList.add('is-revealing');
    duration = 220;
  } else {
    duration = playWelcomeSlide(main, !!shortened);
  }
  var done = window.setTimeout(function(){ finishDesktopWelcomeEntrance(main); }, duration + 80);
  entryCleanup.push(function(){
    window.clearTimeout(done);
    clearWelcomeSlide(main);
    desktopWelcomeAdvancing = false;
  });
}

function bindDesktopWelcomeEntrance(){
  var main = document.querySelector('.cafe-entry');
  if(!main) return;
  /* Returning from a later Café state in the same session: the split layout and
     the complete header brand, with no replay. Only a fresh load replays. */
  if(ST.welcomeEntranceSeen){
    finishDesktopWelcomeEntrance(main);
    return;
  }
  desktopWelcomeAdvancing = false;
  desktopBrandFlight = null;
  var played = playDesktopWelcomeAnim(main);
  var wait = played > 0 ? played + desktopWelcomeHoldMs() : DESKTOP_WELCOME_STILL_MS;
  var autoTimer = window.setTimeout(function(){
    advanceDesktopWelcomeEntrance(false);
  }, wait);
  /* Any sign of advancing hands control back at once: the gesture is resolved
     to its finished mark and the split layout arrives on the short timing. */
  function advanceNow(){
    window.clearTimeout(autoTimer);
    resolveDesktopWelcomeAnim(main);
    advanceDesktopWelcomeEntrance(true);
  }
  function interruptPointer(){ advanceNow(); }
  function interruptWheel(){ advanceNow(); }
  function interruptKeyboard(ev){
    if(!main.classList.contains('is-intro')) return;
    if(ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var k = ev.key;
    if(k !== 'Tab' && k !== 'Enter' && k !== ' ' && k !== 'Spacebar'
      && k !== 'ArrowDown' && k !== 'ArrowRight' && k !== 'PageDown') return;
    ev.preventDefault();
    advanceNow();
  }
  function onBrandResize(){
    if(!desktopBrandFlight) parkDesktopBrandMark();
  }
  main.addEventListener('pointerdown', interruptPointer, {once:true});
  main.addEventListener('wheel', interruptWheel, {once:true, passive:true});
  document.addEventListener('keydown', interruptKeyboard, true);
  window.addEventListener('resize', onBrandResize);
  entryCleanup.push(function(){
    window.clearTimeout(autoTimer);
    main.removeEventListener('pointerdown', interruptPointer);
    main.removeEventListener('wheel', interruptWheel);
    document.removeEventListener('keydown', interruptKeyboard, true);
    window.removeEventListener('resize', onBrandResize);
    stopDesktopWelcomeAnim();
  });
}

function screenEntry(){
  /* The opening only runs on a fresh Café entry. Coming back from a later state
     in the same session, the split layout and the header brand are simply
     there: the mark has already made its way to the header, so the Welcome
     panel carries the text and nothing else. */
  var intro = !ST.welcomeEntranceSeen;
  return lockupSolo(intro)
    + '<div class="cafe-shell cafe-shell-entry"></div>'
    + '<main class="cafe-entry' + (intro ? ' is-intro' : ' is-ready') + '" aria-label="Caf\u00e9 entry">'
      + '<div class="cafe-entry-compose">'
        + '<section class="cafe-entry-welcome" aria-label="Welcome">'
          + '<div class="cafe-entry-welcome-lockup">'
            + (intro
              ? '<div class="cafe-welcome-fly cafe-welcome-fly-hero">'
                + '<div class="cafe-entry-hero" id="cafeEntryHero" aria-hidden="true">'
                  + '<div class="cafe-entry-mark" id="cafeEntryMark">' + desktopWelcomeMarkup() + '</div>'
                + '</div>'
              + '</div>'
              : '')
            + '<div class="cafe-welcome-fly cafe-welcome-fly-title">'
              + '<h2 class="cafe-display cafe-welcome-title">Welcome<br><span class="cafe-welcome-line">to the <b>Caf\u00e9</b>!</span></h2>'
            + '</div>'
            + '<div class="cafe-welcome-fly cafe-welcome-fly-copy">'
              + '<p class="cafe-sub cafe-welcome-sub">Grab a coffee and chat with a Hebrew partner from anywhere in the world.</p>'
            + '</div>'
          + '</div>'
        + '</section>'
        + '<div class="cafe-entry-divider" aria-hidden="true"></div>'
        + '<section class="cafe-entry-prefs" aria-labelledby="cafeLevelsHeading"'
          + (ST.welcomeEntranceSeen ? '' : ' aria-hidden="true" inert') + '>'
          + '<div class="pref-copy">'
            + '<h2 class="pref-intro" id="cafeLevelsHeading">Choose partner levels</h2>'
            + '<p class="pref-lead">Wider range, better odds of finding someone.</p>'
          + '</div>'
          + levelSpectrum()
          + '<div class="cafe-entry-acts">'
            + '<button class="btn primary cafe-entry-cta" type="button" onclick="startSearch()"'
              + (ST.selected.length ? '' : ' disabled') + '>Continue</button>'
          + '</div>'
        + '</section>'
      + '</div>'
    + '</main>';
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

function deviceDropdown(key){
  var d = DEVICES[key];
  var open = ST.devMenu === key;
  var opts = '';
  d.options.forEach(function(o){
    opts += '<button type="button" class="dev-dd-opt' + (o === d.value ? ' is-on' : '') + '"'
      + ' role="option" aria-selected="' + (o === d.value ? 'true' : 'false') + '"'
      + ' onclick="pickDevice(\'' + key + '\',\'' + o.replace(/'/g,"\\'") + '\')">'
      + GP.esc(o) + '</button>';
  });
  return '<div class="dev-group">'
    + '<span class="dev-group-label" id="devLbl-' + key + '">' + GP.esc(d.label) + '</span>'
    + '<div class="dev-dd' + (open ? ' is-open' : '') + '">'
      + '<button type="button" class="dev-dd-btn" aria-haspopup="listbox"'
      + ' aria-expanded="' + (open ? 'true' : 'false') + '"'
      + ' aria-labelledby="devLbl-' + key + '"'
      + ' onclick="toggleDevMenu(\'' + key + '\')">'
      + '<span>' + GP.esc(d.value) + '</span>'
      + '<span class="chev" aria-hidden="true">' + CI.chevRt + '</span>'
      + '</button>'
      + (open ? '<div class="dev-dd-menu" role="listbox">' + opts + '</div>' : '')
    + '</div>'
  + '</div>';
}

function devicesSheet(){
  var body = '<div class="dev-grid">'
    + deviceDropdown('camera')
    + deviceDropdown('mic')
    + deviceDropdown('output')
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
      + '<header class="av-head"><h2>Check your setup</h2></header>'
      + '<section class="g-card av-card" aria-label="Camera and microphone check"><div class="av-stage">'
        + cafePreview()
        + cafeAvTools()
      + '</div></section>'
      + permHelper()
      + '<footer class="av-foot">'
        + avSettingsLink()
        + '<div class="acts"><button class="btn primary" type="button" onclick="startMatching()"'
          + (ST.perm === 'granted' ? '' : ' disabled') + '>Start matching</button></div>'
      + '</footer>'
    + '</main>'
    + (ST.devSheet ? devicesSheet() : '');
}

/* ---------------------------------------------------------- 3. SEARCHING */
function levelsSheet(){
  return cafeDialog({
    milky:true,
    cls:'levels-dialog',
    onScrim:'closeLevels()',
    body:'<h4 id="cafeLevelsHeading">Choose partner levels</h4>'
      + '<p class="pool-line">Adding more levels may help you match faster.</p>'
      + levelSpectrum(),
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

function searchSupportCopy(){
  return '<p class="search-support" aria-live="polite">' + SEARCH_COPY + '</p>';
}

function searchActionRail(){
  return '<div class="search-actions" id="searchActions">'
    + searchPracticeBtn()
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
        + '<button class="btn primary" type="button" onclick="keepMatchingExplore()">Keep matching</button>'
        + '<button class="btn cream" type="button" onclick="stopMatching()">Stop matching</button>'
        + '<button class="btn ghost-ink search-close-cancel" type="button" onclick="dismissCloseDecision()">Cancel</button>'
      + '</div>'
    + '</div>';
}

function screenSearching(){
  return lockupSolo()
    + searchCloseBtn(GP.I.x)
    + '<div class="cafe-shell"></div>'
    + '<main class="cafe-stage searching-stage">'
      + '<div class="search-hero">'
        + '<div class="search-stack">'
          + searchMap('echoFade')
          + '<div class="search-status">'
            + '<h2 class="g-display">Looking for a partner\u2026</h2>'
            + searchSupportCopy()
          + '</div>'
          + searchScopeLine()
          + searchActionRail()
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
function matchCupIcon(){
  return '<img class="ice-cup" src="../cafe-playground-mobile/assets/cafe-cup-icon.png" alt="" aria-hidden="true">';
}
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
    ST.bg = 'searching';
    setState('matched');
    return;
  }
  render();
}

/* Gym Ending confetti, same pieces and fall, originated around the partner card. */
function matchConfetti(){
  var C = '#373230';
  var colors = ['#F9E24C','#FFE300','#F69700','#F9746B','#90C7FC','#449CFC','#DAEF81','#7EE07C','#6D8C58','#6BBFC4','#8B90FF','#CEB1FF'];
  var nextKind = {stroke:'circ', circ:'dia', dia:'stroke'};
  function ink(fill){
    return 'fill="'+fill+'" stroke="'+C+'" stroke-width="0.5" vector-effect="non-scaling-stroke"';
  }
  function shape(kind, fill){
    var a = ink(fill);
    if(kind === 'stroke') return '<svg viewBox="0 0 16 6" aria-hidden="true"><rect x="1.2" y="1.9" width="13.6" height="2.2" rx="1.1" '+a+'/></svg>';
    if(kind === 'circ') return '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.55" '+a+'/></svg>';
    return '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.2 L8.8 5 L5 8.8 L1.2 5 Z" '+a+'/></svg>';
  }
  function spin(x,y,deg){
    var r = deg * Math.PI / 180;
    return [Math.round(x*Math.cos(r)-y*Math.sin(r)), Math.round(x*Math.sin(r)+y*Math.cos(r))];
  }
  var bits = [
    {k:'stroke',dx:-80,dy:-92,ex:-122,ey:28,rot0:-16,rot:-38,rot2:18,sc:1.08,s:22,d:.22,dur:2.72},
    {k:'circ',dx:16,dy:-124,ex:48,ey:-40,rot0:8,rot:26,rot2:54,sc:.92,s:13,d:.28,dur:3.08},
    {k:'dia',dx:98,dy:-68,ex:154,ey:36,rot0:18,rot:42,rot2:78,sc:1,s:14,d:.24,dur:2.58},
    {k:'circ',dx:-40,dy:-108,ex:-28,ey:52,rot0:-10,rot:16,rot2:50,sc:1.12,s:16,d:.31,dur:3.18},
    {k:'stroke',dx:114,dy:-30,ex:168,ey:44,rot0:12,rot:34,rot2:14,sc:.95,s:20,d:.26,dur:2.84},
    {k:'dia',dx:-118,dy:-46,ex:-164,ey:22,rot0:-22,rot:-14,rot2:28,sc:1,s:13,d:.34,dur:2.66},
    {k:'circ',dx:56,dy:-96,ex:92,ey:-8,rot0:6,rot:-22,rot2:16,sc:.86,s:12,d:.38,dur:2.48},
    {k:'dia',dx:-12,dy:-120,ex:36,ey:48,rot0:14,rot:32,rot2:64,sc:1.18,s:17,d:.25,dur:3.24},
    {k:'stroke',dx:44,dy:-36,ex:18,ey:56,rot0:-8,rot:18,rot2:48,sc:1,s:21,d:.4,dur:2.76},
    {k:'circ',dx:-72,dy:-80,ex:-118,ey:40,rot0:-14,rot:8,rot2:42,sc:.9,s:15,d:.33,dur:2.96},
    {k:'stroke',dx:8,dy:-62,ex:-42,ey:50,rot0:10,rot:-24,rot2:22,sc:1.05,s:19,d:.29,dur:2.88},
    {k:'dia',dx:78,dy:-116,ex:126,ey:-22,rot0:20,rot:48,rot2:34,sc:.88,s:13,d:.36,dur:3.02}
  ];
  var pieces = [], i, b, p, q;
  for(i=0;i<bits.length;i++){
    b = bits[i];
    pieces.push({k:b.k,dx:b.dx,dy:b.dy,ex:b.ex,ey:b.ey,rot0:b.rot0,rot:b.rot,rot2:b.rot2,sc:b.sc,s:b.s,d:b.d,dur:b.dur,fill:colors[i%colors.length]});
    p = spin(b.dx,b.dy,i%2?124:-132);
    q = spin(b.ex,b.ey,i%2?124:-132);
    pieces.push({
      k:nextKind[b.k],dx:Math.round(p[0]*.88),dy:Math.round(p[1]*.88),
      ex:Math.round(q[0]*.9),ey:Math.round(q[1]*.9+22),
      rot0:b.rot0+(i%2?26:-26),rot:b.rot+(i%2?-22:22),rot2:b.rot2+34,
      sc:b.sc,s:Math.max(11,b.s-3),d:+(b.d+.07).toFixed(2),dur:+(b.dur+.22).toFixed(2),fill:colors[(i+4)%colors.length]
    });
    p = spin(b.dx,b.dy,i%3?228:-214);
    q = spin(b.ex,b.ey,i%3?228:-214);
    pieces.push({
      k:nextKind[nextKind[b.k]],dx:Math.round(p[0]*.78),dy:Math.round(p[1]*.78),
      ex:Math.round(q[0]*.82),ey:Math.round(q[1]*.82+28),
      rot0:b.rot0+(i%2?-18:20),rot:b.rot+(i%2?16:-28),rot2:b.rot2-12,
      sc:+(b.sc*.82).toFixed(2),s:Math.max(10,b.s-5),d:+(b.d+.11).toFixed(2),dur:+(b.dur+.34).toFixed(2),fill:colors[(i+7)%colors.length]
    });
  }
  var origins = [
    {ox:-28,oy:12},{ox:34,oy:-16},{ox:-10,oy:22},{ox:20,oy:8},
    {ox:-36,oy:-8},{ox:12,oy:28},{ox:40,oy:6},{ox:-18,oy:-22}
  ];
  var html = '<span class="match-confetti" aria-hidden="true">';
  var burst = 2.7;
  for(i=0;i<pieces.length;i++){
    b = pieces[i];
    var o = origins[i % origins.length];
    var jx = (i % 5) - 2;
    var jy = (i % 3) - 1;
    var ox = o.ox + jx * 9;
    var oy = o.oy + jy * 11;
    var dx = Math.round(b.dx*burst), dy = Math.round(b.dy*burst);
    var ex = Math.round(b.ex*burst), ey = Math.round(b.ey*burst);
    var mx = Math.round(dx+(ex-dx)*.62), my = Math.round(dy+(ey-dy)*.62);
    var vx = Math.round(dx+(ex-dx)*.84), vy = Math.round(dy+(ey-dy)*.84);
    var lx = Math.round(ex+(i%2?20:-28)), ly = Math.round(ey+(i%2?36:-16)+(i%5)*8);
    var rotm = Math.round(b.rot+(b.rot2-b.rot)*.62), rotv = Math.round(b.rot+(b.rot2-b.rot)*.84);
    html += '<span class="match-cf" style="'
      + '--ox:'+ox+'px;--oy:'+oy+'px;'
      + '--dx:'+dx+'px;--dy:'+dy+'px;--mx:'+mx+'px;--my:'+my+'px;'
      + '--vx:'+vx+'px;--vy:'+vy+'px;--lx:'+lx+'px;--ly:'+ly+'px;'
      + '--rot0:'+b.rot0+'deg;--rot:'+b.rot+'deg;--rotm:'+rotm+'deg;--rotv:'+rotv+'deg;'
      + '--rotl:'+(b.rot2+(i%2?16:-14))+'deg;--sc:'+b.sc+';--s:'+Math.max(9, Math.round(b.s*.78))+'px;--d:'+b.d+'s;--dur:'+b.dur+'s">'
      + shape(b.k, b.fill) + '</span>';
  }
  return html + '</span>';
}

function matchSheet(){
  var accepted = (ST.matchPhase === 'accepted');
  var low = ST.offerLeft <= 10;
  var framed = ST.matchLayout === 'framed';
  var enter = ST.matchEnter ? ' is-enter' : '';
  var card = '<div class="match-card' + (accepted?' is-waiting':'') + (framed?' is-framed':'') + '">'
    + '<img class="match-card-deco" src="assets/vector-41-desktop.png?v=20260914-44" alt="" aria-hidden="true">'
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
      + '<span class="ice-label">' + matchCupIcon() + '<span>' + GP.esc(PARTNER.ice.label) + '</span></span>'
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
    ? '<button class="btn match-keep" type="button" onclick="declineMatch()">Keep looking instead</button>'
    : '<button class="btn primary" type="button" onclick="acceptMatch()">Meet ' + GP.esc(PARTNER.name) + '</button>'
      + '<button class="btn match-keep" type="button" onclick="declineMatch()">Keep looking</button>';

  var footer = accepted ? ''
    : '<div class="match-timer' + (low?' is-low':'') + '">'
      + '<span class="match-timer-num" id="offerNum">' + ST.offerLeft + 's</span>'
      + '<div class="respline"><i style="animation-duration:' + ST.offerLeft + 's"></i></div>'
    + '</div>';

  return '<div class="match-takeover' + enter + '" id="matchTakeover" role="dialog" aria-modal="true" aria-labelledby="matchHeadline">'
    + '<div class="match-scrim"></div>'
    + '<div class="match-stage">'
      + '<h4 class="match-headline" id="matchHeadline"><span class="match-kicker">Congratulations!</span>We found you a <i>Caf\u00e9</i> partner</h4>'
      + '<div class="match-card-wrap">'
        + (ST.matchEnter ? matchConfetti() : '')
        + card
      + '</div>'
      + '<div class="match-acts">' + acts + '</div>'
      + footer
    + '</div>'
  + '</div>';
}

function screenMatched(){
  var behind = screenHub();
  if(ST.bg === 'searching') behind = screenSearching();
  else if(ST.bg === 'flashcards') behind = screenFlashcards();
  return '<div class="match-behind" inert aria-hidden="true">' + behind + '</div>' + matchSheet();
}

/* --------------------------------------------------- 5. SESSION AGREEMENT */
function agreeIcon(kind){
  var src = {
    hebrew:'assets/agree-hebrew.png?v=4',
    present:'assets/agree-clock.png?v=6',
    kind:'assets/agree-hearts.png?v=4'
  }[kind];
  if(!src) return '';
  return '<span class="agree-mark" aria-hidden="true"><img src="' + src + '" alt=""></span>';
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
      + '<span class="agree-ack-copy">100% agree</span>'
    + '</label>';
  var back = '<button type="button" class="agree-back" onclick="backFromAgreement()" aria-label="Back to Match Found">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>'
    + '</button>';
  return lockup()
    + '<div class="cafe-shell"></div>'
    + cafeDialog({
        milky:true,
        cls:'agree-dialog',
        body:'<div class="agree-head">' + back
          + '<h4 id="agreeTitle">Before jumping into the Caf\u00e9\u2026</h4>'
          + '</div>'
          + '<p class="agree-intro">Here\u2019s what we\u2019re both agreeing to:</p>'
          + '<ul class="agree-list">' + list + '</ul>'
          + ack,
        acts:'<button class="btn primary" id="agreeCta" type="button" onclick="enterCafe()"'
          + (ST.agreed?'':' disabled') + '>Yalla, Caf\u00e9 time!</button>'
      });
}

/* ------------------------------------------------- 6. LIVE CAFE SESSION */
function cafeChatSeed(){
  return [
    {s:'partner', n:PARTNER.name, t:'Want to try ordering in Hebrew first?'},
    {s:'own', n:'You', t:'Yes \u2014 I\u2019ll ask for a coffee.'},
    {s:'partner', n:PARTNER.name, t:'Great. How do you spell \u05e7\u05e4\u05d4?'},
    {s:'own', n:'You', t:'Qof, pe, he.'}
  ];
}
function cafeMsgSame(a, b){
  if(!a || !b) return false;
  return (a.s || '') === (b.s || '') && (a.n || a.name || '') === (b.n || b.name || '');
}
function cafeChatMsg(m, opts){
  opts = opts || {};
  var own = m.s === 'own' || m.own;
  var helper = m.s === 'helper';
  var name = own ? 'You' : (m.n || m.name || PARTNER.name);
  var text = m.t || m.text || '';
  var isLead = opts.isLead !== false;
  var cls = 'mo' + (own ? ' is-own' : '') + (helper ? ' is-helper' : '') + (isLead ? ' has-av' : ' cont');
  var haloCol = helper ? '' : (own ? '#DAEF81' : '#90C7FC');
  var halo = haloCol ? '<span class="av-halo" style="background:' + haloCol + '" aria-hidden="true"></span>' : '';
  var nm = helper
    ? (GP.I.spark + (name === 'Helper' || name === 'helper' ? 'Helper' : GP.esc(name) + ' \u00B7 Helper'))
    : GP.esc(name);
  var av = isLead
    ? ('<div class="av-gutter"><span class="av">' + halo + '<span class="av-face">' + GP.esc(GP.initial(name)) + '</span></span></div>')
    : '<div class="av-gutter"></div>';
  return '<div class="' + cls + '">'
    + av
    + '<div class="bd"><div class="nm">' + nm + '</div><div class="tx">' + GP.esc(text) + '</div></div>'
    + '</div>';
}
function cafeChatOverlay(){
  var msgs = ST.textLog || [];
  var canExpand = msgs.length > 3;
  var expanded = !!ST.chatExpanded && canExpand;
  var shown = expanded ? msgs : msgs.slice(-3);
  var html = '';
  shown.forEach(function(m, i){
    var prev = i ? shown[i - 1] : (expanded ? null : msgs[msgs.length - shown.length - 1]);
    html += cafeChatMsg(m, {isLead:!cafeMsgSame(m, prev)});
  });
  var grow = '';
  if(canExpand){
    grow = '<button type="button" class="chat-grow" onclick="toggleChatExpand()" aria-label="'
      + (expanded ? 'Collapse chat' : 'Show earlier messages') + '">'
      + (expanded ? CI.chevDn : CI.chevUp) + '</button>';
  }
  return '<div class="cafe-chat-overlay ' + (expanded?'is-expanded':'is-compact') + '" id="ovl" aria-label="Chat">'
    + grow
    + '<div class="chat-history" id="cafeChatHistory"><div class="chat-stack">' + html + '</div></div>'
    + '</div>';
}
function cafeComposer(){
  var draft = ST.textDraft || '';
  var active = draft.trim() ? ' active' : '';
  return '<div class="cafe-composer">'
    + '<button class="react-btn" type="button" aria-label="Reactions"' + GP.hubTipAttrs('Reactions') + '>' + CI.smile + '</button>'
    + '<input id="cafeChatInput" type="text" placeholder="Message ' + GP.esc(PARTNER.name) + '\u2026" value="' + GP.esc(draft) + '" autocomplete="off">'
    + '<button class="send' + active + '" type="button" onclick="sendText()"' + GP.hubTipAttrs('Send') + '>' + GP.I.send + '</button>'
    + '</div>';
}
function cafeChatPreview(){
  var m = ST.chatPreview;
  if(!m) return '';
  var helper = m.s === 'helper';
  var name = m.n || m.name || PARTNER.name;
  var nm = helper
    ? (name === 'Helper' || name === 'helper' ? 'Helper' : GP.esc(name) + ' \u00B7 Helper')
    : GP.esc(name);
  return '<button type="button" class="cafe-chat-preview' + (helper?' is-helper':'') + '" onclick="openText()">'
    + '<span class="en">' + nm + '</span>'
    + '<span class="tx">' + GP.esc(m.t || m.text || '') + '</span>'
    + '</button>';
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
    + '<span class="dock-tip-copy">Stuck? Lean on the toolbar for topics and exercises</span>'
    + '<span class="dock-tip-arrow" aria-hidden="true"></span>'
    + '</button>';
}

/* Corner clock slides to the seam between the two tiles in the last 20s.
   centerTimerShown keeps a later re-render from replaying that glide. */
var centerTimerShown = false;
function cafeTimePill(){
  var html = GP.timePill(ST.left, DUR.sessionFinal);
  if(ST.left <= DUR.sessionCenter) html = html.replace('class="g-timepill', 'class="g-timepill is-center');
  return html;
}
function armCenterTimer(frame){
  if(ST.state !== 'live' || ST.left > DUR.sessionCenter){
    centerTimerShown = false;
    return;
  }
  if(centerTimerShown) return;
  var pill = frame.querySelector('.g-timepill');
  if(!pill) return;
  centerTimerShown = true;
  pill.classList.remove('is-center');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      if(pill.isConnected && ST.state === 'live' && ST.left <= DUR.sessionCenter){
        pill.classList.add('is-center');
      }
    });
  });
}

function screenLive(){
  var unread = ST.chatUnread > 9 ? '9+' : (ST.chatUnread || 0);
  var sheetOpen = ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet;
  var chatOpen = ST.textOpen && !sheetOpen;
  var helpers = [
    {icon:CI.chat, label:'Chat', chat:true, active:chatOpen, badge:(!chatOpen && unread) ? unread : 0, onclick:'toggleText()'},
    {icon:CI.wheel, label:'Topics', accent:true, onclick:'openWheel()'},
    {icon:CI.bolt,  label:'Practice', onclick:'openChallenge()'}
  ];
  var av = [
    {icon:GP.I.cam, label:ST.camOff?'Turn camera on':'Turn camera off', slash:ST.camOff, onclick:'toggleCam()'},
    {icon:GP.I.mic, label:ST.micOff?'Unmute':'Mute', slash:ST.micOff, onclick:'toggleMic()'}
  ];
  var extras = {
    chatOpen: chatOpen,
    chatAnim: ST.chatDockAnim,
    av: av,
    composer: cafeComposer(),
    overlay: chatOpen ? cafeChatOverlay() : '',
    preview: (!chatOpen && !sheetOpen && ST.chatPreview) ? cafeChatPreview() : ''
  };
  var dock = cafeFooter(helpers, {label:'Leave & report', onclick:'openLeave()'}, extras);
  if(ST.dockTip && !sheetOpen && !ST.textOpen && !ST.chatPreview){
    dock = dock.replace('<div class="g-footer">', '<div class="g-footer">' + dockTipHtml());
  }

  return '<div class="cafe-shell deep"></div>'
    + '<div class="clock-chrome-fade" aria-hidden="true"></div>'
    + '<div class="cafe-topbar">'
      + '<div class="top-right">' + cafeTimePill() + '</div>'
    + '</div>'
    + '<div class="cafe-tiles">'
      + '<div class="g-split">'
        + cafeTile(PARTNER.name, {img:PARTNER.img, camOff:ST.partnerCamOff, micOff:ST.partnerMicOff})
        + cafeTile('You', {alt:true, img:IMG_YOU, camOff:ST.camOff, micOff:ST.micOff})
      + '</div>'
    + '</div>'
    + dock
    + (ST.leaveSheet ? leaveSheet() : '')
    + (ST.keepOnSheet ? keepOnSheet() : '')
    + (ST.partnerOffSheet ? partnerOffSheet() : '');
}

/* =========================================================================
   6b · TOPICS WHEEL  —  CafeTopicsWheel  (desktop)
   The wheel and its behaviour are the approved ones from the Mobile Café
   (Current/cafe-playground-mobile, section 6b). Only the placement is
   desktop-specific:
     · the wheel is ~45% of the stage width, cropped by the bottom edge and
       centred on the seam between the two tiles (the centre of the frame);
     · the result strip is anchored to the whole stage: centred on the seam,
       24px above the conversation toolbar;
     · the helper capsule (Chat / Topics / Practice) steps aside while the
       wheel is open. Camera, Mic and Leave stay where they are.
   It is an overlay layer: it mounts once inside #frame and is re-attached
   after every Live render. Everything it owns (DOM, listeners, timers,
   animation frames, Web Animations) is released in destroy(), which render()
   triggers as soon as the frame leaves Live.
   ========================================================================= */
var CafeTopicsWheel = (function(){
  /* ---------- Content: all 31 supplied topics, Hebrew + English ---------- */
  const TOPICS = [
    ["משהו שחיבר אותי לאנשים שונים","Something that connected me to people from a different background"],
    ["מקרה הזוי שקרה לי","A bizarre incident that happened to me"],
    ["אתגר פיזי או מנטלי קשה","A tough physical or mental challenge"],
    ["ציפייה מוגזמת שהתנפצה","An unrealistic expectation that fell apart"],
    ["הרגל שהייתי רוצה לשנות","An automatic habit I'd like to change"],
    ["אדם יוצא דופן שפגשתי","An exceptional person I met"],
    ["יום שבו הכל היה על הפנים","A day when everything went wrong"],
    ["טעות שעשיתי כי לא נזהרתי","A mistake I made because I wasn't careful"],
    ["לעשות בשביל עצמי מול בשביל אחרים","Doing things for myself vs. for others"],
    ["משהו שפעם היה מסובך והיום בא בקלות","Something that was once complex and now comes easily"],
    ["מקום קסום או מיוחד שגיליתי","A magical or special place I discovered"],
    ["התחלה חדשה במקום חדש","A fresh start in a new place"],
    ["אני והעבודה שלי","Me and my work"],
    ["מכור ל…","Addicted to..."],
    ["בלעדיי / בלעדיו","Without me / without it"],
    ["משהו שהוא כבר מאחוריי","Something that is behind me"],
    ["כמוני / כמוךָ","Like me / like you"],
    ["נמשך יותר מדי זמן","Dragging on / lasting too long"],
    ["מקום שהשתנה","A place that has changed"],
    ["כשהייתי ילד/ה","When I was a child"],
    ["דברים שאני פחות טוב בהם","Things I'm less good at"],
    ["מבחינתי / מכל הבחינות","As far as I'm concerned / in every aspect"],
    ["אתגר פיזי ואתגר מנטלי","Physical vs. mental challenge"],
    ["לדחות / דחיינות","To postpone / procrastination"],
    ["עבודה וזמן פנוי","Workaholism and life balance"],
    ["הדירה הכי גרועה שהייתה לי","The worst apartment I ever had"],
    ["להעביר את הזמן","To pass the time"],
    ["עצה טובה","Good advice"],
    ["מטלות בבית","Household chores"],
    ["הדברים הקטנים שמעצבנים (Pet Peeves)","Pet peeves"],
    ["יום טיפוסי בחיי","A day in my life"]
  ];

  /* ---------- Geometry ---------- */
  const SVGNS = "http://www.w3.org/2000/svg";
  const C = 214, R = 214, N = 8, SEG = 360 / N;
  const W_OUT = 207.6, W_IN = 30, GAP = 5, CORNER = 6;   // wedge geometry (px)
  const RIM_PAD = 17, SIDE_PAD = 11, MIN_R = 92;
  const HIDDEN_FROM = 140, HIDDEN_TO = 220;              // labels re-deal while hidden behind the dock

  /* ---------- Timing ---------- */
  const HOLD_MS = 800, FLY_MS = 720, EN_LAG_MS = 50, STRIP_VISIBLE_MS = 10000, STRIP_FADE_MS = 800;

  /* ---------- Desktop scale ---------- */
  // The wheel is drawn in a 428px space and scaled as a whole (wk), so the
  // curved labels scale with it. It targets 45% of the stage width, and never
  // rises above 62% of the stage height. Keep HE_PX / EN_PX in step with the
  // .tw-strip / .tw-fly type in cafe.css.
  const WHEEL_SHARE = 0.45, WHEEL_MAX_RISE = 0.62, STRIP_GAP = 24;
  const HE_PX = 31, EN_PX = 17.5;

  const mqReduce = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches:false };
  const isReduced = () => !!mqReduce.matches;

  /* ---------- Live state (all reset by destroy) ---------- */
  let layer = null, wheel, spinner, arcs, frost, drop, flap, closeBtn, live, fly;
  let slots = [], queue = [], rot = 0, spinning = false, isOpen = false, selected = -1;
  let rafId = 0, handoffTimer = 0, stripTimer = 0, strip = null, gen = 0;
  let timers = [], listening = false, fontsReady = false, pendingOpen = false;
  let lastTick = 0, flapAngle = 0, wk = 1;
  const layoutCache = new Map();

  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const pt = (r, a) => [C + r * Math.sin(rad(a)), C - r * Math.cos(rad(a))];
  const f2 = n => n.toFixed(2);
  const norm = a => ((a % 360) + 360) % 360;
  const hostEl = () => document.getElementById("frame");

  /* every delayed call goes through here so destroy() can cancel it */
  function later(fn, ms){
    const id = setTimeout(() => { timers = timers.filter(t => t !== id); fn(); }, ms);
    timers.push(id);
    return id;
  }

  /* ---------- Rounded wedge shapes ---------- */
  // point s px along the radial at angle a, shifted `off` px toward decreasing angle
  const P = (s, a, off) => [C + s * Math.sin(rad(a)) - off * Math.cos(rad(a)), C - s * Math.cos(rad(a)) - off * Math.sin(rad(a))];
  function wedgePath(c){
    const h = SEG / 2, g = GAP / 2, d = W_OUT - CORNER;
    const delta = deg(Math.asin((CORNER + g) / d));
    const along = d * Math.cos(rad(delta));
    const lIn = P(W_IN, c - h, -g), lSide = P(along, c - h, -g), lOut = pt(W_OUT, c - h + delta);
    const rOut = pt(W_OUT, c + h - delta), rSide = P(along, c + h, g), rIn = P(W_IN, c + h, g);
    return `M${f2(lIn[0])} ${f2(lIn[1])}L${f2(lSide[0])} ${f2(lSide[1])}` +
      `A${CORNER} ${CORNER} 0 0 1 ${f2(lOut[0])} ${f2(lOut[1])}` +
      `A${W_OUT} ${W_OUT} 0 0 1 ${f2(rOut[0])} ${f2(rOut[1])}` +
      `A${CORNER} ${CORNER} 0 0 1 ${f2(rSide[0])} ${f2(rSide[1])}` +
      `L${f2(rIn[0])} ${f2(rIn[1])}Z`;
  }

  /* ---------- Text layout ---------- */
  const ctx = document.createElement("canvas").getContext("2d");
  const measure = (s, w, size) => { ctx.font = `${w} ${size}px Assistant`; return ctx.measureText(s).width; };
  const avail = r => rad(SEG) * r - 2 * SIDE_PAD;
  const HEB = /[\u0590-\u05FF]/;

  function tokenize(s){
    const raw = s.match(/\([^)]*\)|\S+/g) || [], out = [];
    raw.forEach(t => { if (t === "/" && out.length) out[out.length - 1] += " /"; else out.push(t); });
    return out;
  }
  // returns lines as arrays of tokens
  function wrap(tokens, radii, weight, size){
    const lines = []; let i = 0;
    const fits = (arr, r) => measure(arr.join(" "), weight, size) <= avail(r);
    for (let li = 0; li < radii.length && i < tokens.length; li++) {
      const line = [tokens[i]];
      if (!fits(line, radii[li])) return null;
      i++;
      while (i < tokens.length && fits([...line, tokens[i]], radii[li])) line.push(tokens[i++]);
      lines.push(line);
    }
    if (i < tokens.length) return null;
    for (let k = lines.length - 1; k > 0; k--) {        // avoid a lone last word
      if (lines[k].length === 1 && lines[k - 1].length >= 2) {
        const cand = [lines[k - 1][lines[k - 1].length - 1], ...lines[k]];
        if (fits(cand, radii[k])) { lines[k] = cand; lines[k - 1] = lines[k - 1].slice(0, -1); }
      }
    }
    return lines;
  }
  function layout(idx){
    if (layoutCache.has(idx)) return layoutCache.get(idx);
    const [he, en] = TOPICS[idx];
    const heT = tokenize(he), enT = tokenize(en);
    let best = null;
    // Hebrew is sized so the English line(s) always fit beneath it when the wedge is selected,
    // which means the Hebrew never reflows when the translation appears.
    outer:
    for (const hs of [15, 14.5, 14, 13.5, 13, 12.5, 12]) for (const es of [10.5, 10, 9.5, 9]) {
      const heLead = hs * 1.16, enLead = es * 1.22, r0 = R - RIM_PAD - hs * 0.5;
      const heR = [r0, r0 - heLead, r0 - 2 * heLead];
      for (let hl = 1; hl <= 3; hl++) {
        const heLines = wrap(heT, heR.slice(0, hl), 600, hs);
        if (!heLines || heLines.length !== hl) continue;
        const e0 = heR[hl - 1] - hs * 0.5 - 5 - es * 0.5;
        const enR = [e0, e0 - enLead, e0 - 2 * enLead];
        for (let el = 1; el <= 3; el++) {
          const enLines = wrap(enT, enR.slice(0, el), 400, es);
          if (!enLines || enLines.length !== el || enR[el - 1] < MIN_R) continue;
          best = { hs, es, heLines, enLines, heR, enR }; break outer;
        }
      }
    }
    if (!best) best = { hs: 12, es: 9, heLines: [heT], enLines: [enT], heR: [R - RIM_PAD - 6], enR: [R - RIM_PAD - 22] };
    layoutCache.set(idx, best);
    return best;
  }

  /* Shared arc paths for label lines (drawn at the top, left→right so text sits upright) */
  const arcCache = new Set();
  function arcId(r){
    r = Math.round(r * 10) / 10;
    const id = "twArc" + String(r).replace(".", "_");
    if (!arcCache.has(id)) {
      const half = SEG / 2 - 0.5;
      const [x1, y1] = pt(r, -half), [x2, y2] = pt(r, half);
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("id", id);
      p.setAttribute("d", `M${f2(x1)} ${f2(y1)} A${r} ${r} 0 0 1 ${f2(x2)} ${f2(y2)}`);
      arcs.appendChild(p); arcCache.add(id);
    }
    return id;
  }
  function addLine(g, tokens, r, cls, size, dir){
    const t = document.createElementNS(SVGNS, "text");
    t.setAttribute("class", cls);
    t.setAttribute("font-size", size);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "central");
    t.setAttribute("direction", dir);
    t.style.direction = dir; t.style.unicodeBidi = "plaintext";
    const tp = document.createElementNS(SVGNS, "textPath");
    tp.setAttribute("href", "#" + arcId(r));
    tp.setAttribute("startOffset", "50%");
    tp.textContent = tokens.join(" ");
    t.appendChild(tp); g.appendChild(t);
  }
  function renderLabel(slot){
    const g = slot.g; g.textContent = "";
    const L = layout(slot.topic);
    L.heLines.forEach((s, i) => addLine(g, s, L.heR[i], "he", L.hs, "rtl"));
    L.enLines.forEach((s, i) => addLine(g, s, L.enR[i], "en", L.es, "ltr"));  // visible only when selected
    g.setAttribute("aria-label", TOPICS[slot.topic][0]);
  }

  /* ---------- Mount: the layer is built once, on first open ---------- */
  const DROP_D = "M53.0996 17.1C64.9911 24.9711 89.0992 54.1863 89.0996 68.3871C89.0996 69.0474 89.0645 69.7022 88.9961 70.35C89.0647 71.2577 89.0996 72.1747 89.0996 73.1C89.0996 92.9822 72.9819 109.1 53.0996 109.1C33.2174 109.1 17.0996 92.9822 17.0996 73.1C17.0996 72.1748 17.1336 71.2576 17.2021 70.35C17.1337 69.7022 17.0996 69.0473 17.0996 68.3871C17.1001 54.1863 41.7413 23.9216 53.0996 17.1Z";
  function mount(){
    if (layer) return;
    layer = document.createElement("div");
    layer.className = "tw-layer";
    window.addEventListener("resize", onResize);
    layer.innerHTML =
      '<div class="tw-wheel" aria-hidden="true">' +
        '<div class="tw-glass"></div>' +
        '<div class="tw-frost"></div>' +
        '<svg class="tw-face" viewBox="0 0 428 428" aria-hidden="true">' +
          '<defs>' +
            '<linearGradient id="twRimSheen" x1="120" y1="0" x2="300" y2="428" gradientUnits="userSpaceOnUse">' +
              '<stop offset="0" stop-color="#fff" stop-opacity=".16"/>' +
              '<stop offset=".28" stop-color="#fff" stop-opacity=".05"/>' +
              '<stop offset=".6" stop-color="#fff" stop-opacity="0"/>' +
            '</linearGradient>' +
            '<radialGradient id="twSheen" cx="214" cy="214" r="214" gradientUnits="userSpaceOnUse">' +
              '<stop offset=".55" stop-color="#fff" stop-opacity="0"/>' +
              '<stop offset="1" stop-color="#fff" stop-opacity=".09"/>' +
            '</radialGradient>' +
          '</defs>' +
          '<defs class="tw-arcs"></defs>' +
          '<g class="tw-spinner"></g>' +
          /* glass rim: a clear band outside the inset wedges, faint tint + diffuse reflection, no hard edge */
          '<circle cx="214" cy="214" r="211" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"/>' +
          '<circle cx="214" cy="214" r="211" fill="none" stroke="url(#twRimSheen)" stroke-width="6"/>' +
        '</svg>' +
        '<button class="tw-drop" type="button" aria-label="Spin the wheel">' +
          '<svg viewBox="0 0 107 127" aria-hidden="true">' +
            '<defs>' +
              '<filter id="twDropShadow" x="-30%" y="-30%" width="160%" height="160%">' +
                '<feGaussianBlur in="SourceAlpha" stdDeviation="8.55"/>' +
                '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .25 0"/>' +
                '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>' +
              '</filter>' +
            '</defs>' +
            '<g class="tw-flap">' +
              '<path filter="url(#twDropShadow)" fill="var(--tw-drop)" d="' + DROP_D + '"/>' +
              '<circle class="tw-ring" cx="53.1" cy="73.1" r="41"/>' +
            '</g>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<button class="tw-close" type="button" aria-label="Close topics wheel">' +
        '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12"/></svg>' +
      '</button>' +
      '<div class="tw-fly" aria-hidden="true"></div>' +
      '<div class="tw-sr" aria-live="polite"></div>';

    wheel = layer.querySelector(".tw-wheel");
    spinner = layer.querySelector(".tw-spinner");
    arcs = layer.querySelector(".tw-arcs");
    frost = layer.querySelector(".tw-frost");
    drop = layer.querySelector(".tw-drop");
    flap = layer.querySelector(".tw-flap");
    closeBtn = layer.querySelector(".tw-close");
    fly = layer.querySelector(".tw-fly");
    live = layer.querySelector(".tw-sr");

    // mask (not clip-path) so the backdrop blur itself is confined to the wedges
    const wedgeUnion = Array.from({ length: N }, (_, i) => wedgePath(i * SEG)).join("");
    const maskUrl = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='428' height='428' viewBox='0 0 428 428'><path fill='#000' d='${wedgeUnion}'/></svg>`)}")`;
    frost.style.webkitMaskImage = maskUrl; frost.style.maskImage = maskUrl;
    frost.style.webkitMaskSize = frost.style.maskSize = "428px 428px";
    frost.style.webkitMaskRepeat = frost.style.maskRepeat = "no-repeat";

    drop.addEventListener("click", spin);
    closeBtn.addEventListener("click", () => close());
  }

  /* ---------- Wheel build ---------- */
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function nextTopic(){
    const onWheel = new Set(slots.map(s => s.topic));
    for (let n = 0; n < queue.length; n++) { const t = queue.shift(); queue.push(t); if (!onWheel.has(t)) return t; }
    return queue[0];
  }
  function build(){
    spinner.textContent = "";
    arcs.textContent = ""; arcCache.clear();
    const wedges = document.createElementNS(SVGNS, "g");
    spinner.appendChild(wedges);
    queue = shuffle(TOPICS.map((_, i) => i));
    slots = [];
    for (let i = 0; i < N; i++) {
      const w = document.createElementNS(SVGNS, "path");
      w.setAttribute("class", "tw-wedge"); w.setAttribute("d", wedgePath(i * SEG));
      wedges.appendChild(w);
      const g = document.createElementNS(SVGNS, "g");
      g.setAttribute("class", "tw-lbl");
      g.setAttribute("transform", `rotate(${i * SEG} ${C} ${C})`);
      spinner.appendChild(g);
      const slot = { i, g, w, topic: -1, swapped: false };
      slots.push(slot);
      slot.topic = nextTopic(); renderLabel(slot);
    }
    rot = 0; applyRot();
  }
  const worldAngle = s => norm(s.i * SEG + rot);
  function applyRot(){
    spinner.setAttribute("transform", `rotate(${rot.toFixed(3)} ${C} ${C})`);
    frost.style.transform = `rotate(${rot.toFixed(3)}deg)`;
  }
  function swapHidden(){
    for (const s of slots) {
      const a = worldAngle(s), hidden = a > HIDDEN_FROM && a < HIDDEN_TO;
      if (hidden && !s.swapped) { s.topic = nextTopic(); renderLabel(s); s.swapped = true; }
      else if (!hidden) s.swapped = false;
    }
  }

  /* ---------- Drop "clapper" ---------- */
  const tickIndex = () => Math.floor((rot + SEG / 2) / SEG);
  function updateFlap(){
    const t = tickIndex();
    if (t !== lastTick) { flapAngle = -8; lastTick = t; }
    flapAngle *= 0.8;
    flap.setAttribute("transform", `rotate(${flapAngle.toFixed(2)} 53.1 73.1)`);
  }

  /* ---------- Easing ---------- */
  function bezier(p1x, p1y, p2x, p2y){
    const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t;
    return x => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 32; i++) { t = (lo + hi) / 2; sx(t) < x ? lo = t : hi = t; } return sy(t); };
  }
  const spinEase = bezier(0.34, 0.02, 0.12, 1);
  const settleEase = t => 1 - Math.pow(1 - t, 3);

  /* ---------- Spin ---------- */
  function setSelected(slotIdx){
    slots.forEach(s => { const on = s.i === slotIdx; s.g.classList.toggle("sel", on); s.w.classList.toggle("sel", on); });
    selected = slotIdx;
  }
  function spin(){
    if (spinning || !isOpen) return;
    clearTimeout(handoffTimer);
    spinning = true;
    const reduce = isReduced();
    drop.setAttribute("aria-disabled", "true");
    setSelected(-1);
    const dist = s => Math.min(worldAngle(s), 360 - worldAngle(s));
    const onTop = slots.reduce((b, s) => dist(s) < dist(b) ? s : b);
    let k; do { k = Math.random() * N | 0; } while (k === onTop.i);
    const turns = reduce ? 1 : 4 + (Math.random() * 2 | 0);
    const total = turns * 360 + norm(-k * SEG - rot);
    const overshoot = reduce ? 0 : 3.2, main = reduce ? 1100 : 2750, settle = reduce ? 0 : 380;
    const start = rot, t0 = performance.now(), myGen = gen;
    const frame = now => {
      if (myGen !== gen) return;
      const el = now - t0;
      if (el < main) rot = start + (total + overshoot) * spinEase(el / main);
      else if (el < main + settle) rot = start + total + overshoot * (1 - settleEase((el - main) / settle));
      else { rot = norm(start + total); applyRot(); swapHidden(); lastTick = tickIndex(); finish(k); return; }
      applyRot(); swapHidden(); updateFlap();
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
  }
  function finish(k){
    spinning = false;
    drop.removeAttribute("aria-disabled");
    const myGen = gen;
    const relax = () => {
      if (myGen !== gen || !flap) return;
      flapAngle *= 0.75; flap.setAttribute("transform", `rotate(${flapAngle.toFixed(2)} 53.1 73.1)`);
      if (Math.abs(flapAngle) > .05) requestAnimationFrame(relax);
    };
    relax();
    setSelected(k);
    drop.classList.remove("pop"); void drop.offsetWidth; drop.classList.add("pop");
    const [he, en] = TOPICS[slots[k].topic];
    live.textContent = `Topic: ${he}. ${en}`;
    handoffTimer = later(() => handoff(k), HOLD_MS);
  }

  /* ---------- Handoff: selected wedge text → conversation strip ---------- */
  const layerScale = () => layer.getBoundingClientRect().width / (layer.offsetWidth || 1);

  function applyScale(){
    if (!layer) return;
    const W = layer.offsetWidth, H = layer.offsetHeight;
    if (!W || !H) return;
    wk = Math.max(0.9, Math.min(WHEEL_SHARE * W / (2 * R), WHEEL_MAX_RISE * H / (R + 46)));
    layer.style.setProperty("--tw-k", wk.toFixed(4));
  }

  // The strip belongs to the whole conversation stage: centred on the seam
  // between the two videos, STRIP_GAP above the conversation toolbar. The
  // toolbar is located by layout (offsetTop), not by its painted rect, so the
  // answer is the same while the capsule is stepped aside behind the wheel.
  function placeStrip(el){
    const host = hostEl(), tiles = host ? host.querySelectorAll(".cafe-tile") : [];
    if (!el || !layer) return;
    const sc = layerScale(), lr = layer.getBoundingClientRect();
    let seamX = layer.offsetWidth / 2, stageW = layer.offsetWidth;
    if (tiles.length > 1) {
      const a = tiles[0].getBoundingClientRect(), b = tiles[tiles.length - 1].getBoundingClientRect();
      seamX = ((a.right + b.left) / 2 - lr.left) / sc;
      stageW = (b.right - a.left) / sc;
    }
    const g = host && host.querySelector(".g-footer"), cap = host && host.querySelector(".footer-capsule");
    const capTop = g && cap ? g.offsetTop + cap.offsetTop : layer.offsetHeight - 106;
    el.style.left = seamX + "px";
    el.style.top = (capTop - STRIP_GAP) + "px";          // the strip hangs from this line
    el.style.maxWidth = Math.min(stageW - 64, 880) + "px";
  }

  function removeStrip(fast){
    clearTimeout(stripTimer);
    if (!strip) return;
    const s = strip; strip = null;
    s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 180 : STRIP_FADE_MS, easing: "ease", fill: "forwards" })
      .onfinish = () => s.remove();
  }
  function buildStrip(he, en){
    const el = document.createElement("div");
    el.className = "tw-strip flying";
    el.setAttribute("role", "status");
    const mk = (cls, dir, tokens) => {
      const p = document.createElement("p"); p.className = cls; p.dir = dir;
      tokens.forEach((tk, i) => {
        if (i) p.appendChild(document.createTextNode(" "));
        const s = document.createElement("span"); s.textContent = tk;
        if (dir === "rtl" && !HEB.test(tk)) s.dir = "ltr";
        p.appendChild(s);
      });
      return p;
    };
    el.appendChild(mk("he", "rtl", tokenize(he)));
    el.appendChild(mk("en", "ltr", tokenize(en)));
    return el;
  }
  // centre point + tangent angle of every token on the wheel, in logical order, layer px
  function sourcePositions(lines, radii, size, weight, dir){
    const out = [], space = measure(" ", weight, size);
    const ox = wheel.offsetLeft, oy = wheel.offsetTop;
    lines.forEach((tokens, li) => {
      const r = radii[li];
      const widths = tokens.map(t => measure(t, weight, size));
      const W = widths.reduce((a, b) => a + b, 0) + space * (tokens.length - 1);
      const visual = tokens.map((t, i) => i);
      if (dir === "rtl") visual.reverse();
      let cursor = 0; const pos = [];
      visual.forEach(i => {
        const centre = cursor + widths[i] / 2;
        const a = deg((centre - W / 2) / r);
        const [x, y] = pt(r, a);
        pos[i] = { x: ox + C + (x - C) * wk, y: oy + C + (y - C) * wk, a };   // scaled about the wheel centre
        cursor += widths[i] + space;
      });
      out.push(...pos);
    });
    return out;
  }

  function handoff(k){
    if (!isOpen || spinning || selected !== k) return;
    const slot = slots[k], L = layout(slot.topic), [he, en] = TOPICS[slot.topic];
    removeStrip(true);
    const el = buildStrip(he, en);
    layer.appendChild(el);
    placeStrip(el);
    strip = el;

    if (isReduced()) {
      el.classList.remove("flying");
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "backwards" });
      close(true); armStripTimer(); return;
    }

    const sc = layerScale(), lr = layer.getBoundingClientRect();
    const targets = [...el.querySelectorAll("span")].map(s => {
      const r = s.getBoundingClientRect();
      return { left: (r.left - lr.left) / sc, top: (r.top - lr.top) / sc, w: r.width / sc, h: r.height / sc, span: s };
    });
    const src = [
      ...sourcePositions(L.heLines, L.heR, L.hs, 600, "rtl").map(p => ({ ...p, cls: "he", k: L.hs * wk / HE_PX })),
      ...sourcePositions(L.enLines, L.enR, L.es, 400, "ltr").map(p => ({ ...p, cls: "en", k: L.es * wk / EN_PX }))
    ];

    slot.g.style.opacity = "0";          // the flying words take over from the wedge label
    const anims = [];
    src.forEach((s, i) => {
      const t = targets[i]; if (!t) return;
      const f = document.createElement("span");
      f.className = s.cls; f.textContent = t.span.textContent;
      f.dir = s.cls === "he" && HEB.test(f.textContent) ? "rtl" : "ltr";
      f.style.left = t.left + "px"; f.style.top = t.top + "px";
      fly.appendChild(f);
      const dx = s.x - (t.left + t.w / 2), dy = s.y - (t.top + t.h / 2);
      const toColor = s.cls === "he" ? "var(--tw-yellow)" : "var(--tw-yellow-soft)";
      anims.push(f.animate([
        { transform: `translate(${dx}px, ${dy}px) rotate(${s.a}deg) scale(${s.k})`, color: "var(--tw-yellow)" },
        // columns settle first, rows second: words slide into their final x-slots before the lines merge, so they never collide
        { transform: `translate(${dx * .08}px, ${dy * .5}px) rotate(${s.a * .15}deg) scale(${(s.k + 1) / 2})`, offset: .5 },
        { transform: "none", color: toColor }
      ], { duration: FLY_MS, delay: s.cls === "en" ? EN_LAG_MS : 0, easing: "cubic-bezier(.45,0,.2,1)", fill: "both" }));
    });
    el.animate([{ opacity: 0, transform: "translate(-50%,-100%) scale(.96)" }, { opacity: 1, transform: "translate(-50%,-100%)" }],
      { duration: 380, delay: FLY_MS * .45, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });

    close(true);                          // wheel slides down while the words travel up

    const myGen = gen;
    Promise.all(anims.map(a => a.finished)).then(() => {
      if (myGen !== gen) return;
      if (strip !== el) { fly.textContent = ""; return; }
      el.classList.remove("flying");
      fly.textContent = "";
      armStripTimer();
    }).catch(() => {});
  }
  function armStripTimer(){
    clearTimeout(stripTimer);
    stripTimer = later(() => removeStrip(false), STRIP_VISIBLE_MS);
  }

  /* ---------- Open / close ---------- */
  const topicsBtn = () => document.querySelector("#frame .rc-btn[aria-label=\"Topics\"]");
  function setExpanded(on){
    const b = topicsBtn();
    if (b) b.setAttribute("aria-expanded", on ? "true" : "false");
  }
  function doOpen(){
    const host = hostEl();
    if (isOpen || !host || ST.state !== "live") return;
    mount();
    if (layer.parentNode !== host) host.appendChild(layer);
    host.classList.add("tw-armed");
    applyScale();
    isOpen = true;
    if (!slots.length) build();
    slots.forEach(s => s.g.style.opacity = "");
    wheel.classList.remove("closing");
    wheel.setAttribute("aria-hidden", "false");
    host.classList.add("tw-open");
    setExpanded(true);
    if (!isReduced()) {
      const to = rot, from = rot - 24, t0 = performance.now(), dur = 620, myGen = gen;
      rot = from; applyRot();
      const f = now => {
        if (myGen !== gen) return;
        const p = Math.min(1, (now - t0) / dur);
        rot = from + (to - from) * settleEase(p); applyRot();
        if (p < 1 && isOpen) requestAnimationFrame(f);
        else { rot = norm(to); applyRot(); lastTick = tickIndex(); }
      };
      requestAnimationFrame(f);
    }
    const myOpen = gen;
    requestAnimationFrame(() => { if (myOpen === gen && isOpen) wheel.classList.add("open"); });
    closeBtn.classList.add("show");
    later(() => { if (isOpen) drop.focus({ preventScroll: true }); }, 350);
    listen(true);
  }
  function open(){
    if (isOpen) return;
    if (fontsReady) { doOpen(); return; }
    pendingOpen = true;   // fonts are still loading: measure once they are in
  }
  function close(fromHandoff){
    if (!isOpen) return;
    cancelAnimationFrame(rafId);
    clearTimeout(handoffTimer);
    if (spinning) { spinning = false; drop.removeAttribute("aria-disabled"); rot = norm(rot); applyRot(); }
    isOpen = false;
    listen(false);
    wheel.classList.remove("open"); wheel.classList.add("closing");
    wheel.setAttribute("aria-hidden", "true");
    closeBtn.classList.remove("show");
    setExpanded(false);
    later(() => {
      const host = hostEl();
      if (!isOpen && host) host.classList.remove("tw-open");
    }, fromHandoff === true ? FLY_MS : 200);
    later(() => { if (!isOpen && wheel) { wheel.classList.remove("closing"); slots.forEach(s => s.g.style.opacity = ""); } }, 420);
    later(() => {
      if (isOpen || ST.state !== "live") return;
      const b = topicsBtn();
      if (b) b.focus({ preventScroll: true });
    }, fromHandoff === true ? FLY_MS + 200 : 320);
  }

  /* ---------- Listeners (only while the wheel is open) ---------- */
  function onKey(e){ if (e.key === "Escape") close(); }
  function onScreenClick(e){
    if (!isOpen || spinning || !layer) return;
    if (e.target.closest(".tw-drop,.tw-close,.g-footer,.g-dialog,.cafe-topbar")) return;
    const r = layer.getBoundingClientRect(), s = r.width / (layer.offsetWidth || 1);
    const x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    if (Math.hypot(x - layer.offsetWidth / 2, y - (wheel.offsetTop + C)) > R * wk) close();
  }
  const onResize = () => { applyScale(); if (strip) placeStrip(strip); };
  function listen(on){
    const host = hostEl();
    if (on === listening) return;
    listening = on;
    if (on) {
      document.addEventListener("keydown", onKey);
      if (host) host.addEventListener("click", onScreenClick);
    } else {
      document.removeEventListener("keydown", onKey);
      if (host) host.removeEventListener("click", onScreenClick);
    }
  }

  /* ---------- Lifecycle ---------- */
  // Called by render() after every frame paint. innerHTML wipes the layer out
  // of #frame, so on Live it is put back; off Live everything is released.
  function sync(host, state){
    if (state !== "live") { destroy(); return; }
    host.classList.add("tw-armed");
    if (!layer) return;
    host.appendChild(layer);
    host.classList.toggle("tw-open", isOpen);
    applyScale();
    if (strip) placeStrip(strip);
    if (isOpen) {
      setExpanded(true);
      // another surface took over: a sheet or the chat
      if (ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet || ST.textOpen) close();
    }
  }
  // Releases the DOM, listeners, timers, animation frames and Web Animations.
  function destroy(){
    gen++;
    cancelAnimationFrame(rafId);
    timers.forEach(clearTimeout); timers = [];
    clearTimeout(handoffTimer); clearTimeout(stripTimer);
    window.removeEventListener("resize", onResize);
    listen(false);
    if (layer) {
      try { layer.getAnimations({ subtree: true }).forEach(a => a.cancel()); } catch (e) {}
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }
    const host = hostEl();
    if (host) host.classList.remove("tw-open", "tw-armed");
    layer = wheel = spinner = arcs = frost = drop = flap = closeBtn = live = fly = null;
    slots = []; queue = []; arcCache.clear();
    rot = 0; spinning = false; isOpen = false; selected = -1; strip = null;
    rafId = handoffTimer = stripTimer = 0; flapAngle = 0; lastTick = 0; pendingOpen = false; wk = 1;
  }

  /* ---------- Fonts: measure only once Assistant (Hebrew + Latin) is in ---------- */
  const fontsLoad = document.fonts && document.fonts.load ? Promise.race([
    Promise.all([document.fonts.load('600 15px "Assistant"', "אב"), document.fonts.load('400 10px "Assistant"', "Ab")]),
    new Promise(r => setTimeout(r, 1500))
  ]) : Promise.resolve();
  fontsLoad.then(() => {
    layoutCache.clear();
    fontsReady = true;
    if (pendingOpen) { pendingOpen = false; doOpen(); }
  }).catch(() => { fontsReady = true; });

  return {
    open: open, close: function(){ close(); }, spin: spin, sync: sync, reset: destroy,
    /* read-only inspection for review */
    get state(){
      return {
        rot: rot, spinning: spinning, selected: selected, isOpen: isOpen, strip: strip && strip.textContent,
        topicCount: TOPICS.length,
        slots: slots.map(s => ({ i: s.i, a: worldAngle(s), topic: TOPICS[s.topic][0] }))
      };
    }
  };
})();




/* =========================================================================
   6c · PRACTICE  —  CafePractice  (desktop)
   The interaction is the mobile Café Practice (Current/cafe-playground-mobile,
   section 6c) carried over unchanged: the same exercise data (7 text exercises,
   every third one an audio exercise, 3 silent-timer demo recordings until real
   audio is registered with setAudioExercises), the same one shared state and
   the same actions (open · play · pause · reveal · back · prev · next · go ·
   close), the same flip / swap transitions, the same transport seam
   (connect({send}) / receive(evt); nothing is sent, there is no sync layer),
   and the same audio player logic (real HTMLAudioElement for real sources, a
   silent progress bar for the demo ones).
   Only the placement is desktop-specific: the card surface is centred on the
   seam between the two side-by-side tiles (the centre of the frame), compact,
   with the instruction above it, Previous / Next flanking it and the actions
   straddling its bottom edge. It is an overlay layer: it mounts once inside
   #frame and is re-attached after every Live render, so toggling Camera / Mic
   never rebuilds it or interrupts audio. It sits under the footer and the
   clock, and never blocks either. Chat can stay open beside it; opening Topics
   closes it.
   ========================================================================= */
var CafePractice = (function(){
  /* ---------- Content (identical to mobile) ---------- */
  var PRACTICE_TEXT = [
    {id:'demo-he-1', type:'text', from:'he', to:'en',
     prompt:'הוא לא הבין למה כולם צחקו.',
     answer:'He didn\u2019t understand why everyone was laughing.'},
    {id:'demo-en-1', type:'text', from:'en', to:'he',
     prompt:'Could you say that again, a little more slowly?',
     answer:'אפשר לחזור על זה עוד פעם, קצת יותר לאט?'},
    {id:'demo-he-2', type:'text', from:'he', to:'en',
     prompt:'אם היה לי יותר זמן, הייתי לומד לנגן בגיטרה.',
     answer:'If I had more time, I would learn to play the guitar.'},
    {id:'demo-en-2', type:'text', from:'en', to:'he',
     prompt:'She told me she had never been to Berlin.',
     answer:'היא סיפרה לי שהיא אף פעם לא הייתה בברלין.'},
    {id:'demo-he-3', type:'text', from:'he', to:'en',
     prompt:'איפה הכי כיף לשתות קפה בעיר הזאת?',
     answer:'Where is the nicest place to have coffee in this city?'},
    {id:'demo-en-3', type:'text', from:'en', to:'he',
     prompt:'It took me a while to get used to living far from my family.',
     answer:'לקח לי קצת זמן להתרגל לגור רחוק מהמשפחה שלי.'},
    {id:'demo-he-4', type:'text', from:'he', to:'en',
     prompt:'בשנה האחרונה עברתי דירה פעמיים, ועדיין לא הרגשתי שהמקום הזה הוא בית.',
     answer:'Last year I moved twice, and I still didn\u2019t feel that this place was home.'}
  ];
  var PRACTICE_AUDIO = [];   // {id, src, answer} — real Hebrew audio only
  var PRACTICE_AUDIO_DEMO = [
    {id:'demo-audio-1', type:'audio', from:'he', to:'en', src:null, simulated:true, dur:8,
     answer:'Could you tell me how to get to the station?'},
    {id:'demo-audio-2', type:'audio', from:'he', to:'en', src:null, simulated:true, dur:8,
     answer:'I haven\u2019t seen him since last summer.'},
    {id:'demo-audio-3', type:'audio', from:'he', to:'en', src:null, simulated:true, dur:8,
     answer:'We were going to leave early, but it started to rain.'}
  ];

  /* The deck: every third exercise is an audio one. */
  function deck(){
    var real = PRACTICE_AUDIO.filter(function(e){ return e && e.src && e.answer; })
      .map(function(e){ return {id:e.id, type:'audio', from:'he', to:'en', src:e.src, answer:e.answer}; });
    var audio = real.concat(PRACTICE_AUDIO_DEMO.slice(real.length));
    var out = [];
    PRACTICE_TEXT.forEach(function(t, i){ out.push(t); if(i % 2 === 1 && audio.length) out.push(audio.shift()); });
    return out.concat(audio);
  }
  function idxOf(id){ var d = deck(); for(var i = 0; i < d.length; i++) if(d[i].id === id) return i; return -1; }
  function findEx(id){ var i = idxOf(id); return i < 0 ? null : deck()[i]; }
  function cur(){ return findEx(S.exId) || deck()[0]; }
  function nextId(){ var d = deck(), i = idxOf(S.exId); return d[(i + 1) % d.length].id; }
  function prevId(){ var d = deck(), i = idxOf(S.exId); return d[i <= 0 ? d.length - 1 : i - 1].id; }

  /* ---------- The one shared state ---------- */
  var S = {open:false, exId:null, side:'q', playing:false, seq:0};

  /* ---------- Transport seam (empty on purpose) ---------- */
  var transport = null, queue = [];

  /* ---------- Local view state ---------- */
  var layer = null, group, labelEl, card, front, back, actsQ, actsA;
  var busy = false, gen = 0, needsEnter = false, listening = false, ro = null;
  var audio = null, audioId = null, playerError = false;
  var simTimer = 0, simPos = 0;      // silent progress for the design preview only
  var mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  var reduced = function(){ return !!mqReduce.matches; };
  var hostEl = function(){ return document.getElementById('frame'); };
  var blocked = function(){ return ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet; };
  var P = 'perspective(1200px) ';

  /* ---------- Icons (Practice-local; the desktop primitives have no player set) ---------- */
  var ICON = {
    chevLt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    chevRt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2"/></svg>',
    close:'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M2.6 2.6l6.8 6.8M9.4 2.6l-6.8 6.8"/></svg>'
  };
  function wave(){
    var h = [7,12,17,22,19,14,20,25,22,15,10,17,24,20,14,9,15,22,18,12,17,10,7,12,19], out = '';
    for(var i = 0; i < h.length; i++) out += '<i style="height:' + Math.round(h[i] * 1.2) + 'px"></i>';
    return '<div class="pr-wave">' + out + '</div>';
  }

  /* ---------- Copy ---------- */
  function labelFor(ex, side){
    if(side === 'a') return 'Answer';
    if(ex.type === 'audio') return 'Listen and translate to English';
    return ex.to === 'en' ? 'Translate to English' : 'Translate to Hebrew';
  }
  function sizeClass(text){
    var n = String(text).length;
    return n <= 32 ? 'pr-len-s' : (n <= 70 ? 'pr-len-m' : 'pr-len-l');
  }
  function textHtml(text, lang){
    return '<p class="pr-text ' + sizeClass(text) + '" lang="' + lang + '" dir="' + (lang === 'he' ? 'rtl' : 'ltr') + '">'
      + GP.esc(text) + '</p>';
  }

  /* ---------- DOM ---------- */
  function build(){
    layer = document.createElement('div');
    layer.className = 'pr-layer';
    layer.innerHTML =
      '<div class="pr-group">'
        + '<p class="pr-label" aria-live="polite"></p>'
        + '<div class="pr-card" role="group" aria-label="Practice exercise">'
          + '<button class="pr-close" type="button" data-act="close" aria-label="Close practice">' + ICON.close + '</button>'
          + '<div class="pr-faces">'
            + '<div class="pr-face pr-front"></div>'
            + '<div class="pr-face pr-back"></div>'
          + '</div>'
        + '</div>'
        + '<div class="pr-acts">'
          + '<button class="pr-nav pr-prev" type="button" data-act="prev" aria-label="Previous exercise">' + ICON.chevLt + '</button>'
          + '<div class="pr-acts-q"><button class="pr-btn primary" type="button" data-act="reveal">Reveal answer</button></div>'
          + '<div class="pr-acts-a"><button class="pr-btn" type="button" data-act="back">Back to question</button></div>'
          + '<button class="pr-nav pr-next" type="button" data-act="next" aria-label="Next exercise">' + ICON.chevRt + '</button>'
        + '</div>'
      + '</div>';
    group = layer.querySelector('.pr-group');
    labelEl = layer.querySelector('.pr-label');
    card = layer.querySelector('.pr-card');
    front = layer.querySelector('.pr-front');
    back = layer.querySelector('.pr-back');
    actsQ = layer.querySelector('.pr-acts-q');
    actsA = layer.querySelector('.pr-acts-a');
    /* Only [data-act] controls act, plus the card surface itself, which flips
       from anywhere except the player. Nothing here reaches the frame. */
    layer.addEventListener('click', function(e){
      e.stopPropagation();
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if(!b || !layer.contains(b)){
        if(e.target.closest && e.target.closest('.pr-card') && !e.target.closest('.pr-player')
           && !(window.getSelection && String(window.getSelection()).length))
          dispatch(S.side === 'q' ? 'reveal' : 'back');
        return;
      }
      var act = b.getAttribute('data-act');
      if(act === 'toggle') act = S.playing ? 'pause' : 'play';
      dispatch(act);
    });
    needsEnter = true;
    paint();
  }
  function fillContent(){
    var ex = cur();
    layer.setAttribute('data-type', ex.type);
    front.innerHTML = ex.type === 'audio' ? playerHtml() : textHtml(ex.prompt, ex.from);
    back.innerHTML = textHtml(ex.answer, ex.to);
    simStop();
    if(ex.type === 'audio' && ex.src) loadAudio(ex);
    paintPlayer();
  }
  function showSide(side){
    var ex = cur();
    card.classList.toggle('is-answer', side === 'a');
    front.toggleAttribute('inert', side === 'a');
    back.toggleAttribute('inert', side !== 'a');
    front.setAttribute('aria-hidden', side === 'a' ? 'true' : 'false');
    back.setAttribute('aria-hidden', side === 'a' ? 'false' : 'true');
    actsQ.hidden = side === 'a'; actsQ.toggleAttribute('inert', side === 'a');
    actsA.hidden = side !== 'a'; actsA.toggleAttribute('inert', side !== 'a');
    labelEl.textContent = labelFor(ex, side);
  }
  function paint(){ fillContent(); showSide(S.side); publish(); }
  function refocus(){
    if(!layer) return;
    var a = document.activeElement;
    if(a && a !== document.body && !layer.contains(a)) return;
    var b = layer.querySelector(S.side === 'a' ? '.pr-acts-a [data-act="back"]' : '.pr-acts-q [data-act="reveal"]');
    if(b) b.focus({preventScroll:true});
  }

  /* Attach (idempotent). Runs from open() and from every Live render. */
  function ensure(host){
    if(!host) return;
    if(!layer) build();
    if(layer.parentNode !== host) host.appendChild(layer);
    host.classList.add('pr-open');
    setBtn(true);
    listen(true);
    publish();
    if(!ro && window.ResizeObserver){ ro = new ResizeObserver(publish); ro.observe(card); ro.observe(host); }
    if(needsEnter){
      needsEnter = false;
      if(!reduced()) group.animate([{opacity:0, transform:'translateY(10px) scale(.98)'}, {opacity:1, transform:'none'}],
        {duration:260, easing:'cubic-bezier(.22,.8,.2,1)'});
      else group.animate([{opacity:0}, {opacity:1}], {duration:140});
      refocus();
    }
  }
  function setBtn(on){
    var b = document.querySelector('#frame .rc-btn[aria-label="Practice"]');
    if(!b) return;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function onKey(e){
    if(e.key !== 'Escape' || !S.open || blocked()) return;
    var t = e.target && e.target.tagName;
    if(t === 'INPUT' || t === 'TEXTAREA') return;      // Escape in the chat field is not "close Practice"
    dispatch('close');
  }
  /* Layout hand-off, run whenever the card or frame changes size:
     1. cap the card so its actions always end above the toolbar; long
        sentences scroll inside the card instead of growing it;
     2. tell the final-20s countdown where to sit. It normally lands on the
        seam, which is where this card is, so while Practice is open it hangs
        above the instruction instead (--pr-clock-y on the frame). */
  function publish(){
    var host = hostEl();
    if(!host || !layer || !card) return;
    var hr = host.getBoundingClientRect();
    var hh = host.clientHeight;
    var acts = layer.querySelector('.pr-acts');
    var extent = (acts.offsetHeight || 46) + (parseFloat(getComputedStyle(acts).marginTop) || 0);
    var short = hh < 640;
    var max = Math.max(short ? 96 : 140, Math.min(340, 2 * (hh / 2 - 150 - extent)));
    layer.classList.toggle('is-short', short);
    layer.style.setProperty('--pr-card-max', Math.round(max) + 'px');
    var size = document.body.classList.contains('present') ? 120 : 96;
    var labelTop = labelEl.getBoundingClientRect().top - hr.top;
    var y = Math.max(size * 0.6 + 72, labelTop - 16 - size * 0.6);
    host.style.setProperty('--pr-clock-y', Math.round(y) + 'px');
  }
  function listen(on){
    if(on === listening) return;
    listening = on;
    if(on) document.addEventListener('keydown', onKey); else document.removeEventListener('keydown', onKey);
  }

  /* ---------- Audio (real HTMLAudioElement; demo recordings are a silent timer) ---------- */
  function playerHtml(){
    var ex = cur(), none = !ex.src && !ex.simulated;
    return '<div class="pr-player">'
      + '<button class="pr-play" type="button" data-act="toggle" aria-label="Play Hebrew audio"'
      + (none ? ' aria-disabled="true"' : '') + '>' + ICON.play + '</button>'
      + wave()
      + '</div>';
  }
  function getAudio(){
    if(audio) return audio;
    audio = new Audio();
    audio.preload = 'metadata';
    audio.addEventListener('timeupdate', paintPlayer);
    audio.addEventListener('loadedmetadata', paintPlayer);
    audio.addEventListener('ended', function(){
      S.playing = false;
      try{ audio.currentTime = 0; }catch(e){}
      paintPlayer();
    });
    audio.addEventListener('error', function(){
      if(!audio.getAttribute('src')) return;
      playerError = true; S.playing = false; paintPlayer();
    });
    return audio;
  }
  function loadAudio(ex){
    var a = getAudio();
    if(audioId !== ex.id){
      audioId = ex.id; playerError = false;
      a.src = ex.src; a.load();
    } else {
      try{ a.currentTime = 0; }catch(e){}
    }
  }
  function simPause(){ clearInterval(simTimer); simTimer = 0; }
  function simStop(){ simPause(); simPos = 0; }
  function simStart(){
    var ex = cur(), t0 = performance.now() - simPos * 1000;
    simPause();
    simTimer = setInterval(function(){
      simPos = (performance.now() - t0) / 1000;
      if(simPos >= ex.dur){ simStop(); S.playing = false; }
      paintPlayer();
    }, 80);
  }
  function stopAudio(){
    if(audio){ audio.pause(); try{ audio.currentTime = 0; }catch(e){} }
    simStop();
    S.playing = false;
    paintPlayer();
  }
  function releaseAudio(){
    simStop();
    if(!audio) return;
    audio.pause();
    audio.removeAttribute('src'); audioId = null; playerError = false;
    try{ audio.load(); }catch(e){}
  }
  function paintPlayer(){
    if(!layer) return;
    var p = layer.querySelector('.pr-player');
    if(!p) return;
    var btn = p.querySelector('.pr-play'), wv = p.querySelector('.pr-wave');
    var ex = cur(), sim = !!ex.simulated, none = !ex.src && !sim;
    var dur = sim ? ex.dur : (!none && audio && isFinite(audio.duration) ? audio.duration : 0);
    var pos = sim ? simPos : (!none && audio ? audio.currentTime : 0);
    var ratio = dur ? Math.min(1, pos / dur) : 0;
    var want = S.playing ? 'pause' : 'play';
    if(btn.getAttribute('data-icon') !== want){
      btn.setAttribute('data-icon', want);
      btn.innerHTML = S.playing ? ICON.pause : ICON.play;
      btn.setAttribute('aria-label', S.playing ? 'Pause Hebrew audio' : 'Play Hebrew audio');
    }
    var bars = wv.children;
    for(var i = 0; i < bars.length; i++) bars[i].classList.toggle('on', (i / bars.length) < ratio);
    wv.classList.toggle('is-live', S.playing);
    p.classList.toggle('is-error', playerError);
    btn.disabled = playerError;
    btn.setAttribute('aria-disabled', none ? 'true' : 'false');
    if(!none) btn.removeAttribute('aria-disabled');
  }

  /* ---------- Transitions (one at a time) ---------- */
  function runSwap(kind, mid){
    if(!layer) return;
    busy = true; layer.classList.add('is-busy');
    var my = gen, flip = kind === 'flip';
    var end = function(){
      if(my !== gen) return;
      busy = false;
      if(layer) layer.classList.remove('is-busy');
      refocus();
      drain();
    };
    if(reduced()){ mid(); end(); return; }
    var a1 = card.animate(
      flip ? [{transform:P + 'rotateY(0deg)'}, {transform:P + 'rotateY(90deg)'}]
           : [{opacity:1, transform:'scale(1)'}, {opacity:0, transform:'scale(.97)'}],
      {duration: flip ? 180 : 130, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'});
    a1.onfinish = function(){
      if(my !== gen) return;
      mid();
      a1.cancel();
      var a2 = card.animate(
        flip ? [{transform:P + 'rotateY(-90deg)'}, {transform:P + 'rotateY(0deg)'}]
             : [{opacity:0, transform:'scale(.97)'}, {opacity:1, transform:'scale(1)'}],
        {duration: flip ? 240 : 190, easing:'cubic-bezier(0,0,.2,1)'});
      a2.onfinish = end;
    };
  }
  function drain(){ while(queue.length && !busy && layer) apply(queue.shift()); }

  /* ---------- Actions: the whole shared interaction ---------- */
  function apply(evt){
    var ex;
    switch(evt.type){
      case 'open':
        if(S.open) return false;
        S.exId = (evt.exId && findEx(evt.exId)) ? evt.exId : deck()[0].id;
        S.side = 'q'; S.playing = false; S.open = true;
        /* the wheel and any topic strip give way; chat may stay */
        dismissForPractice();
        ensure(hostEl());
        return true;
      case 'play':
        ex = cur();
        if(!S.open || S.side !== 'q' || ex.type !== 'audio' || !(ex.src || ex.simulated) || S.playing || playerError) return false;
        S.playing = true;
        if(ex.simulated){ simStart(); }
        else {
          var pr = getAudio().play();
          if(pr && pr.catch) pr.catch(function(){ S.playing = false; paintPlayer(); });
        }
        paintPlayer();
        return true;
      case 'pause':
        if(!S.open || !S.playing) return false;
        S.playing = false; if(audio) audio.pause();
        simPause();
        paintPlayer();
        return true;
      case 'reveal':
        if(!S.open || S.side !== 'q') return false;
        stopAudio(); S.side = 'a';
        runSwap('flip', function(){ showSide('a'); });
        return true;
      case 'back':
        if(!S.open || S.side !== 'a') return false;
        S.side = 'q';
        runSwap('flip', function(){ showSide('q'); });
        return true;
      case 'next':
      case 'prev':
      case 'go':
        if(!S.open) return false;
        stopAudio();
        S.exId = (evt.exId && findEx(evt.exId)) ? evt.exId : (evt.type === 'prev' ? prevId() : nextId());
        S.side = 'q';
        runSwap('swap', paint);
        return true;
      case 'close':
        if(!S.open) return false;
        stopAudio();
        S.open = false; queue.length = 0; busy = false; gen++;
        retire(false);
        return true;
    }
    return false;
  }
  var TRANSITIONING = {reveal:1, back:1, next:1, prev:1, go:1};
  function dispatch(type, exId){
    if(type !== 'open' && !S.open) return;
    if(busy && TRANSITIONING[type]) return;          // no duplicate actions mid-flip
    var evt = {type:type, exId:S.exId, seq:S.seq + 1, at:Date.now()};
    if(type === 'open') evt.exId = exId || S.exId || deck()[0].id;
    if(type === 'go') evt.exId = exId;
    if(type === 'next') evt.exId = nextId();
    if(type === 'prev') evt.exId = prevId();
    if(!apply(evt)) return;
    S.seq = evt.seq;
    if(transport && transport.send){ try{ transport.send(evt); }catch(e){} }
  }
  function receive(evt){
    if(!evt || !evt.type) return;
    if(busy && TRANSITIONING[evt.type]){ queue.push(evt); return; }
    if(apply(evt)) S.seq = Math.max(S.seq, evt.seq || 0);
  }

  /* ---------- Leaving ---------- */
  // Fades the layer out (or drops it at once) and clears the host.
  function retire(immediate){
    var l = layer, g = group;
    layer = group = labelEl = card = front = back = actsQ = actsA = null;
    listen(false);
    if(ro){ ro.disconnect(); ro = null; }
    var host = hostEl();
    if(host){ host.classList.remove('pr-open'); host.style.removeProperty('--pr-clock-y'); }
    setBtn(false);
    if(!l) return;
    var drop = function(){ if(l.parentNode) l.parentNode.removeChild(l); };
    if(immediate || reduced()){ drop(); return; }
    l.classList.add('is-closing');
    g.animate([{opacity:1, transform:'none'}, {opacity:0, transform:'translateY(6px) scale(.985)'}],
      {duration:160, easing:'ease-in', fill:'forwards'});
    setTimeout(drop, 190);
  }
  // Session left Live: release everything, including the audio element.
  function reset(){
    gen++;
    var l = layer;
    if(l){ try{ l.getAnimations({subtree:true}).forEach(function(a){ a.cancel(); }); }catch(e){} }
    retire(true);
    releaseAudio();
    S.open = false; S.exId = null; S.side = 'q'; S.playing = false;
    queue.length = 0; busy = false; needsEnter = false;
  }
  // Called by render() after every frame paint.
  function sync(host, state){
    if(state !== 'live'){ if(S.open || layer || audio) reset(); return; }
    if(!S.open) return;
    ensure(host);                                        // chat may be open alongside: Practice is unchanged
    var b = blocked();
    layer.classList.toggle('is-suspended', b);
    if(b && S.playing) dispatch('pause');
  }

  return {
    open: function(){ if(S.open){ refocus(); return; } dispatch('open'); },
    close: function(){ dispatch('close'); },
    dismiss: function(){ if(S.open) dispatch('close'); },
    previewAudio: function(){
      var a = deck().filter(function(e){ return e.type === 'audio'; })[0];
      if(!a) return;
      if(S.open) dispatch('go', a.id); else dispatch('open', a.id);
    },
    sync: sync, reset: reset,
    receive: receive,
    connect: function(t){ transport = t || null; },
    setAudioExercises: function(list){ PRACTICE_AUDIO = (list || []).filter(function(e){ return e && e.id && e.src && e.answer; }); },
    /* read-only inspection for review */
    get state(){ return {open:S.open, exId:S.exId, side:S.side, playing:S.playing, seq:S.seq, busy:busy, deck:deck().length}; }
  };
})();

/* Opening Practice reuses the existing cleanup: CafeTopicsWheel.reset() releases
   the wheel and any selected-topic strip. Chat is a separate, personal surface
   and is left alone. */
function dismissForPractice(){
  CafeTopicsWheel.reset();
  var tb = document.querySelector('#frame .rc-btn[aria-label="Topics"]');
  if(tb) tb.setAttribute('aria-expanded', 'false');
}
/* Prototype control: draw the audio exercise design without a recording. */
function previewPracticeAudio(){
  if(ST.state !== 'live') setState('live');
  dismissDockTip();
  CafePractice.previewAudio();
}


/* ------------------------------ 7. SESSION ENDING / SEARCHING AGAIN */
function endingConfetti(){
  var C = '#373230';
  var colors = ['#F9E24C','#FFE300','#F69700','#F9746B','#90C7FC','#449CFC','#DAEF81','#7EE07C','#6BBFC4','#CEB1FF'];
  function ink(fill){
    return 'fill="'+fill+'" stroke="'+C+'" stroke-width="0.5" vector-effect="non-scaling-stroke"';
  }
  function shape(kind, fill){
    var a = ink(fill);
    if(kind === 'stroke') return '<svg viewBox="0 0 16 6" aria-hidden="true"><rect x="1.2" y="1.9" width="13.6" height="2.2" rx="1.1" '+a+'/></svg>';
    if(kind === 'circ') return '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.55" '+a+'/></svg>';
    return '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.2 L8.8 5 L5 8.8 L1.2 5 Z" '+a+'/></svg>';
  }
  var kinds = ['stroke','circ','dia'];
  var html = '<span class="ending-confetti" aria-hidden="true">';
  var i, x, drift, rot0, rot, size, delay, dur, kind;
  for(i=0;i<28;i++){
    x = 4 + (i * 3.4) % 92;
    drift = (i % 2 ? 18 : -22) + (i % 5) * 4;
    rot0 = (i % 2 ? -18 : 14) + (i % 7);
    rot = rot0 + (i % 2 ? 120 : -140);
    size = 10 + (i % 6) * 2;
    delay = (i % 9) * 0.12;
    dur = 3.4 + (i % 5) * 0.38;
    kind = kinds[i % 3];
    html += '<span class="ending-cf" style="--x:'+x+'%;--drift:'+drift+'px;--rot0:'+rot0+'deg;--rot:'+rot+'deg;--s:'+size+'px;--d:'+delay+'s;--dur:'+dur+'s">'
      + shape(kind, colors[i % colors.length]) + '</span>';
  }
  return html + '</span>';
}

function screenEnding(){
  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<main class="cafe-stage cafe-ending">'
      + endingConfetti()
      + '<div class="ending-copy">'
        + '<h2 class="g-display">Time flies!</h2>'
        + '<p class="g-sub">You and ' + GP.esc(PARTNER.name) + ' just spoke Hebrew for 6 minutes.</p>'
      + '</div>'
      + '<div class="cafe-acts ending-acts">'
        + '<button class="btn primary" type="button" onclick="matchAgain()">Find me another partner</button>'
        + '<button class="text-cta" type="button" onclick="leaveCafeHome()">Go back to homepage</button>'
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
    ST.levelsSheet = false; ST.devSheet = false; ST.devMenu = null;
    ST.dockTip = false; ST.dockTipSeen = false;
    ST.rangeHintSeen = false;
    ST.specHot = -1;
    ST.specActiveHandle = null;
    clearPartnerOff();
    clearTimeout(dockTipT); dockTipT = null;
  }
  if(state === 'avcheck'){ ST.left = 0; ST.devSheet = false; ST.devMenu = null; micReset(); }
  if(state === 'searching'){
    ST.matching = true; ST.left = DUR.searchTo; ST.levelsSheet = false;
    ST.closeSheet = false;
    clearPartnerOff();
  }
  if(state === 'hub'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'flashcards'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'matched'){
    ST.matching = true;
    ST.matchPhase = 'offer';
    ST.offerLeft = DUR.offer;
    ST.matchEnter = true;
    ST.levelsSheet = false;
    ST.partner.name = PARTNER.name;
    ST.partner.level = PARTNER.level;
  }
  if(state === 'agreement'){ ST.agreed = false; }
  if(state === 'live'){
    CafeTopicsWheel.reset();
    CafePractice.reset();
    ST.left = DUR.session; ST.textLog = cafeChatSeed(); ST.textOpen = false; ST.textDraft = '';
    ST.chatExpanded = false; ST.chatUnread = 0; ST.chatPreview = null; ST.chatDockAnim = null;
    clearTimeout(chatDockCloseT); chatDockCloseT = null;
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
function setScope(id){
  ST.prefs.scope = id;
  var scope = scopeById(id);
  var me = myLevelIndex();
  var n = LEVEL_DATA.eligible.length;
  var lo = Math.max(0, me - (scope.lower || 0));
  var hi = Math.min(n - 1, me + (scope.upper || 0));
  applyLevelRange(lo, hi);
}
function setMyLevel(id){
  if(LEVEL_DATA.eligible.indexOf(id) === -1) return;
  LEVEL_DATA.myLevel = id;
  ST.myLevel = id;
  applyLevelRange(0, LEVEL_DATA.eligible.length - 1);
}
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
function matchAgain(){ startMatching(); }
function leaveCafeHome(){
  ST.closeSheet = false;
  ST.exploreShown = false;
  setState('entry');
}
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

function bindMatchTakeover(shouldFocus){
  var root = document.getElementById('matchTakeover');
  if(!root) return;
  var nodes = root.querySelectorAll('button:not([disabled])');
  if(!nodes.length) return;
  var primary = root.querySelector('.btn.primary');
  if(shouldFocus) (primary || nodes[0]).focus();
  if(root._trap) root.removeEventListener('keydown', root._trap);
  root._trap = function(e){
    if(e.key !== 'Tab') return;
    var list = root.querySelectorAll('button:not([disabled])');
    if(!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  root.addEventListener('keydown', root._trap);
}

function revealExplore(){
  if(ST.searchElapsed < DUR.exploreAfter) return;
  ST.exploreShown = true;
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

function backFromAgreement(){
  if(ST.state !== 'agreement') return;
  ST.agreed = false;
  if(ST.matchPhase !== 'accepted') ST.matchPhase = 'offer';
  if(ST.matchPhase === 'accepted' && ST.left <= 0) ST.left = DUR.partnerConfirm;
  if(ST.matchPhase === 'offer' && ST.offerLeft <= 0) ST.offerLeft = DUR.offer;
  ST.state = 'matched';
  try{ history.replaceState(null, '', '#matched'); }catch(e){}
  render();
}

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

function openDevices(){ ST.devSheet = true; ST.devMenu = null; render(); }
function closeDevices(){ ST.devSheet = false; ST.devMenu = null; render(); }
function toggleDevMenu(key){
  ST.devMenu = ST.devMenu === key ? null : key;
  render();
}
function pickDevice(key, value){
  DEVICES[key].value = value;
  ST.devMenu = null;
  render();
}

function openFlashcards(){ ST.closeSheet = false; setState('flashcards'); }
function closeFlashcards(){ ST.state = 'searching'; try{ history.replaceState(null,'','#searching'); }catch(e){} render(); }
function cardReveal(){ ST.cardRevealed = true; render(); }
function cardFlip(){ ST.cardRevealed = !ST.cardRevealed; ST.cardPlaying = false; render(); }
function cardMark(){ ST.cardMarked = !ST.cardMarked; render(); }
function cardPlay(){ ST.cardPlaying = !ST.cardPlaying; render(); }
function cardStep(d){ ST.card += d; ST.cardRevealed = false; ST.cardMarked = false; ST.cardPlaying = false; render(); }
function cardPrev(){ cardStep(-1); }
function cardNext(){ cardStep(1); }

function openWheel(){
  dismissDockTip();
  /* Topics and Practice share the seam: opening the wheel closes Practice. */
  CafePractice.dismiss();
  /* The helper capsule hides behind the wheel, so an open chat closes first. */
  if(ST.textOpen){ closeText(); setTimeout(function(){ CafeTopicsWheel.open(); }, 420); return; }
  CafeTopicsWheel.open();
}
/* Practice: one shared exercise on the seam (see CafePractice). Chat may stay open. */
function openChallenge(){ dismissDockTip(); CafePractice.open(); }

function toggleText(){
  dismissDockTip();
  var cap = document.querySelector('.frame .footer-capsule');
  if(ST.textOpen && cap && !cap.classList.contains('is-chat-open')){
    clearTimeout(chatDockCloseT);
    chatDockCloseT = null;
    cap.classList.add('is-chat-open');
    return;
  }
  if(ST.textOpen){
    closeText();
    return;
  }
  openText();
}
function openText(){
  dismissDockTip();
  clearTimeout(chatPreviewT);
  clearTimeout(chatDockCloseT);
  var wasOpen = !!ST.textOpen;
  ST.textOpen = true;
  ST.chatUnread = 0;
  ST.chatPreview = null;
  ST.chatExpanded = false;
  if(!(ST.textLog && ST.textLog.length)) ST.textLog = cafeChatSeed();
  ST.chatDockAnim = wasOpen ? null : 'in';
  var cap = document.querySelector('.frame .footer-capsule');
  if(wasOpen && cap){
    cap.classList.add('is-chat-open');
    return;
  }
  render();
}
function closeText(){
  ST.chatExpanded = false;
  var cap = document.querySelector('.frame .footer-capsule');
  if(ST.textOpen && cap && cap.classList.contains('is-chat-open')){
    cap.classList.remove('is-chat-open');
    clearTimeout(chatDockCloseT);
    chatDockCloseT = setTimeout(function(){
      chatDockCloseT = null;
      ST.textOpen = false;
      ST.chatDockAnim = null;
      render();
    }, 360);
    return;
  }
  ST.textOpen = false;
  ST.chatDockAnim = null;
  render();
}
function toggleChat(){ toggleText(); }
function toggleChatExpand(){
  if((ST.textLog || []).length <= 3) return;
  ST.chatExpanded = !ST.chatExpanded;
  render();
}
function sendText(){
  var el = document.getElementById('cafeChatInput');
  var text = ((el && el.value) || ST.textDraft || '').trim();
  if(!text) return;
  ST.textLog.push({s:'own', n:'You', t:text});
  ST.textDraft = '';
  if(el) el.value = '';
  render();
}
var chatPreviewT = null;
var chatDockCloseT = null;
function receivePartnerChat(text){
  if(ST.state !== 'live') return;
  var msg = {s:'partner', n:PARTNER.name, t:text || 'How do you spell that?'};
  ST.textLog.push(msg);
  if(ST.textOpen){
    ST.chatPreview = null;
    render();
    return;
  }
  ST.chatUnread = (ST.chatUnread || 0) + 1;
  ST.chatPreview = msg;
  clearTimeout(chatPreviewT);
  chatPreviewT = setTimeout(function(){
    chatPreviewT = null;
    ST.chatPreview = null;
    render();
  }, 4800);
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
      var center = ST.left <= DUR.sessionCenter;
      if(center && !pill.classList.contains('is-center')) centerTimerShown = true;
      if(!center) centerTimerShown = false;
      pill.classList.toggle('final', ST.left <= DUR.sessionFinal);
      pill.classList.toggle('is-center', center);
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
  f.classList.toggle('is-entry', s === 'entry');
  CafeTopicsWheel.sync(f, s);
  CafePractice.sync(f, s);

  unbindEntrySpectrum();
  if(document.getElementById('levelSpectrum')) bindSpectrum(f);
  if(s === 'entry') bindDesktopWelcomeEntrance();

  if(s === 'live') armCenterTimer(f);

  if(s === 'live' && ST.textOpen && ST.chatDockAnim === 'in'){
    ST.chatDockAnim = null;
    var cap = f.querySelector('.footer-capsule');
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        if(!ST.textOpen || !cap) return;
        cap.classList.add('is-chat-open');
      });
    });
  }

  if(ST.textOpen){
    var input = document.getElementById('cafeChatInput');
    if(input){
      input.focus();
      input.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') sendText(); });
      input.addEventListener('input', function(){
        ST.textDraft = input.value;
        var send = input.parentNode && input.parentNode.querySelector('.send');
        if(send) send.classList.toggle('active', input.value.trim().length > 0);
      });
    }
  }
  if(ST.closeSheet && ST.state === 'searching') bindCloseDecisionFocus();
  if(s === 'matched'){
    var entering = ST.matchEnter;
    bindMatchTakeover(entering);
    ST.matchEnter = false;
  }
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
      + ' · you are ' + GP.levelMeta(LEVEL_DATA.myLevel).label
      + ' · range ' + ladderLabel(b.lo) + '\u2013' + ladderLabel(b.renderableHi)
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

function replayWelcomeEntrance(){
  if(INTERVIEW) return;
  ST.welcomeEntranceSeen = false;
  if(ST.state === 'entry') render();
  else setState('entry');
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
      if(v === 'matched'){ ST.matching = true; ST.bg = 'searching'; ST.searchElapsed = DUR.exploreAfter; ST.exploreShown = true; }
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
