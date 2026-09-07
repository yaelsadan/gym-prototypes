/* ============================================================================
   CAFE MOBILE — state machine + screens
   ----------------------------------------------------------------------------
   One global ST, one render() that rebuilds #screen, setState() for
   transitions, a 1s tick for timed states, hash routing, and a switcher that
   stays in sync.

   Canonical path:
     entry -> avcheck -> searching -> (hub / flashcards, matching continues)
           -> matched -> matched/accepted -> agreement -> live -> ending -> hub

   A/V check sits before matching and runs on every Café entry, not only on
   first use or when permissions are missing. Its CTA is the actual
   "Start matching" action.

   Matching is a background process. It starts at the end of the A/V check and
   stops only on an explicit "Stop matching". One chat ending never stops it.
   ========================================================================= */

/* ------------------------------------------------------------- constants */
var ORDER = ['entry','avcheck','searching','hub','flashcards','matched','agreement','live','ending'];

var IMG_PARTNER = '../student-main-classroom-desktop/assets/teacher-gai.png';
var IMG_YOU     = '../student-main-classroom-desktop/assets/pip-you.png';

/* Playground durations. The session is the real 6 minutes so the clock reads
   truthfully; everything else is shortened so a loop is reviewable. */
var DUR = {
  searchTo:22,        // searching -> a match is offered. Long enough to see two avatar blooms.
  offer:30,           // the response window. Product value.
  partnerConfirm:4,   // the partner answers this long after you accept
  session:360,        // 6:00
  sessionFinal:30,    // the clock warms to yellow below this
  ending:7,           // ending -> back to the Hub, still matching
  partnerOffWait:9    // connection-issue sheet, then "Find me a new partner"
};

/* =========================================================================
   LEVEL DATA — CONFIGURABLE, NOT CANONICAL
   -------------------------------------------------------------------------
   No authoritative level ladder exists in this repo, so none is asserted here.
   `eligible` is the set of levels this student may choose to match with; it is
   an unordered set, and nothing in the UI implies a count, an ordering, a
   "levels above/below" relationship or a top and bottom edge.

   Replace this object wholesale when real product data lands. It is the only
   place level data is declared.
   ========================================================================= */
var LEVEL_DATA = {
  source:'placeholder',
  myLevel:'darkgreen',
  eligible:['blue','lime','green','darkgreen','turquoise','indigo']
};

/* -------------------------------------------------------------- partner */
/* One personal, onboarding-derived detail. Sample content from the brief. */
var PARTNER = {
  name:'Daniel',
  level:'turquoise',
  location:'Berlin, Germany',
  img:IMG_PARTNER,
  ice:{label:'how they drink their coffee', text:'Double espresso with almond milk'}
};

/* Content of the agreement is product-specified. This is the only copy of it.
   Four principles to scan, then one acknowledgement. No per-item ticks. */
var AGREEMENT_TERMS = [
  {icon:'welcome', lead:'Mistakes are welcome',          support:'Everyone here is learning.'},
  {icon:'hebrew',  lead:'Give Hebrew your best shot',    support:'Even a few words count.'},
  {icon:'present', lead:'Stay present for six minutes',  support:'Keep your camera and mic on.'},
  {icon:'kind',    lead:'Be kind to your partner',       support:'Help make the conversation feel safe and supportive.'}
];

/* The activity the text panel shows by default. Placeholder content. */
var ACTIVITY = {
  title:'Order a coffee, out loud',
  body:'Ask for what you would actually drink. Your partner is the barista.'
};

/* A/V devices. Mock hardware so "correct camera / mic / output" is a real
   choice on the screen without building a settings surface. */
var DEVICES = {
  camera:{label:'Camera', icon:'cam', options:['FaceTime HD Camera','Continuity Camera'], value:'FaceTime HD Camera'},
  mic:{label:'Microphone', icon:'mic', options:['AirPods Pro','MacBook Pro Microphone'], value:'AirPods Pro'},
  output:{label:'Speaker', icon:'headphone', options:['AirPods Pro','MacBook Pro Speakers'], value:'AirPods Pro'}
};
/* Headphones are connected in the default mock, so the output row applies.
   Whether the row appears at all when there is no external output is a product
   question, not a layout one. */
var HEADPHONES = true;

/* The waiting deck. Placeholder content lifted from the Gym Solo Room deck. */
var DECK = [
  {dir:'Translate to Hebrew', en:'Coffee',      he:'\u05e7\u05e4\u05d4'},
  {dir:'Translate to Hebrew', en:'Thank you',   he:'\u05ea\u05d5\u05d3\u05d4'},
  {dir:'Translate to Hebrew', en:'Good morning',he:'\u05d1\u05d5\u05e7\u05e8 \u05d8\u05d5\u05d1'},
  {dir:'Translate to Hebrew', en:'Friend',      he:'\u05d7\u05d1\u05e8'},
  {dir:'Translate to Hebrew', en:'Water',       he:'\u05de\u05d9\u05dd'}
];

var NOTES = {
  entry:'1 \u00b7 Entry. An invitation. Own level selected by default; more can be added. Nothing is matching yet.',
  avcheck:'2 \u00b7 A/V check, now before matching and mandatory on every entry. Its CTA is the real "Start matching".',
  searching:'3 \u00b7 Active search. Not a waiting room \u2014 "Keep exploring" leaves and matching continues. Flashcards are optional.',
  hub:'3b \u00b7 Placeholder Hub carrying the persistent matching indicator. The Hub itself is not designed in this pass.',
  flashcards:'3c \u00b7 Optional practice while waiting. The Gym Solo deck. A match interrupts it; declining returns here.',
  matched:'4 \u00b7 Match found. A 30s interrupt over whatever you were doing. Accept keeps the same surface and waits for the partner.',
  agreement:'5 \u00b7 Session agreement. Only after both accepted. Four principles to scan, one acknowledgement that enables the CTA. No decline.',
  live:'6 \u00b7 Live Cafe. The Gym Practice Room shell. Dock: Wheel \u00b7 Challenge \u00b7 Text, then Camera \u00b7 Mic.',
  ending:'7 \u00b7 Ending. Matching never stopped, so there is no "find someone now" \u2014 it requeues on its own.'
};

/* ------------------------------------------------------------------ state */
var ST = {
  state:'entry',
  /* what the match interrupt is layered over */
  bg:'hub',
  /* the Cafe matching session. Survives a chat ending; only stopMatching clears it. */
  matching:false,
  /* Own level is selected and fixed. Additional eligible levels may be added
     to widen the search; they cannot replace the student's own level. */
  selected:[LEVEL_DATA.myLevel],
  matchPhase:'offer',     // offer | accepted
  offerLeft:DUR.offer,
  searchElapsed:0,
  left:0,
  clockOn:true,
  camOff:false, micOff:false, blur:false,
  perm:'granted',
  mic:{phase:'idle', left:0, pos:0},   // idle | recording | ready | playing
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
  dockTipSeen:false
};

/* ---------------------------------------------------------------- helpers */
function isSelected(id){ return ST.selected.indexOf(id) !== -1; }
function cafeLockup(sub){
  var mark = '<img class="cafe-mark" src="cafe-mark.png" alt="" aria-hidden="true">';
  return GM.lockup(mark, 'Caf\u00e9', sub);
}
function cafeCardsIcon(){
  return '<svg viewBox="0 0 51 56" fill="none" aria-hidden="true">'
    + '<path d="M22.3808 7.78128L46.026 11.7121C48.6139 12.1423 50.3567 14.5878 49.9187 17.1743L44.186 51.0293C43.7478 53.6156 41.295 55.3639 38.7073 54.9337L15.0621 51.0029C12.4744 50.5728 10.7317 48.127 11.1694 45.5407L16.9021 11.6857C17.3401 9.09913 19.793 7.35108 22.3808 7.78128Z" stroke="#F7F6EF" stroke-width="1"/>'
    + '<path d="M4.94493 6.21876L28.3942 1.27471C30.9612 0.733506 33.4886 2.37401 34.0394 4.93888L41.2505 38.5161C41.8013 41.0809 40.1669 43.5989 37.6 44.1401L14.1507 49.0842C11.5838 49.6254 9.05634 47.9849 8.50551 45.42L1.29448 11.8428C0.760843 9.358 2.27805 6.9169 4.70727 6.27486L4.94493 6.21876Z" stroke="#F7F6EF" stroke-width="1"/>'
    + '</svg>';
}
/* Draw the partner's level from inside the selected set, so the choice is
   visible in the match card. */
function drawPartnerLevel(){
  if(!ST.selected.length) return LEVEL_DATA.myLevel;
  if(isSelected(PARTNER.level)) return PARTNER.level;
  return ST.selected[Math.floor(ST.selected.length / 2)];
}


/* =========================================================================
   1 · ENTRY / MATCHING PREFERENCES
   ========================================================================= */
/* Own level, then the optional extras. Reused by the searching edit sheet. */
function otherEligible(){
  return LEVEL_DATA.eligible.filter(function(id){ return id !== LEVEL_DATA.myLevel; });
}
function ownLevelChip(){
  var id = LEVEL_DATA.myLevel;
  return '<div class="pref-own">'
    + '<span class="lvl-chip is-on is-me is-fixed" aria-label="' + GM.esc(GM.levelMeta(id).label) + ', your level">'
      + GM.levelDot(id)
      + '<span>' + GM.esc(GM.levelMeta(id).label) + '</span>'
      + '<span class="me-tag">\u00b7 your level</span>'
    + '</span>'
    + '</div>';
}
function additionalLevelChips(){
  var chips = '';
  otherEligible().forEach(function(id){
    chips += '<button type="button" class="lvl-chip' + (isSelected(id)?' is-on':'') + '"'
      + ' aria-pressed="' + isSelected(id) + '"'
      + ' onclick="toggleLevel(\'' + id + '\')">'
      + GM.levelDot(id) + '<span>' + GM.esc(GM.levelMeta(id).label) + '</span>'
      + '</button>';
  });
  return '<div class="lvl-row">' + chips + '</div>';
}
function levelPicker(opts){
  opts = opts || {};
  var extras = otherEligible();
  var extraOn = extras.filter(isSelected).length;
  var allExtra = extras.length > 0 && extraOn === extras.length;
  var heading = (opts.heading === false)
    ? ''
    : '<p class="pref-intro">Who would you like to meet?</p>';
  var addAll = allExtra
    ? ''
    : '<button type="button" class="pref-add-all" onclick="selectAllLevels()">Add all</button>';
  var helper = allExtra
    ? ''
    : '<p class="pool-line">Adding more levels may help you match faster.</p>';

  return heading
    + ownLevelChip()
    + '<div class="pref-more">'
      + '<div class="pref-more-head">'
        + '<span class="pref-more-label">Open to more levels?</span>'
        + addAll
      + '</div>'
      + additionalLevelChips()
    + '</div>'
    + helper;
}

function screenEntry(){
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + '<main class="cafe-entry">'
      + '<h2 class="cafe-display">Welcome to the <b>Caf\u00e9</b>!</h2>'
      + '<p class="cafe-sub">Grab a coffee and chat with a Hebrew partner, wherever they are in the world. Mistakes are welcome, this is all about having fun.</p>'
      + levelPicker()
      + '<div class="cafe-acts">'
        + '<button class="primary-cta" type="button" onclick="goAvCheck()"'
          + (ST.selected.length?'':' disabled') + '>Find a partner</button>'
      + '</div>'
    + '</main>';
}


/* =========================================================================
   2 · A/V CHECK  —  before matching, on every Café entry
   Gym A/V block as-is: self-view, Camera / Mic / Blur, live mic echo rings.
   Device choice and an optional playback test live in a settings sheet,
   reached from one quiet affordance — not stacked cards on the happy path.
   ========================================================================= */
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

/* idle -> recording -> ready -> playing. Optional, and only inside the sheet. */
function micTest(){
  var m = ST.mic, title, sub, btn, extra = '';
  if(m.phase === 'recording'){
    title = 'Listening\u2026';
    sub = GM.wave(0, true, 'is-rec');
    btn = '<button class="gm-playbtn" type="button" onclick="micStop()" aria-label="Stop">' + GM.I.pause + '</button>';
    extra = '<span class="mt-count">' + m.left + 's</span>';
  } else if(m.phase === 'playing'){
    title = 'Playing back\u2026';
    sub = GM.wave(m.pos / MIC_LEN, true);
    btn = '<button class="gm-playbtn" type="button" onclick="micPause()" aria-label="Pause">' + GM.I.pause + '</button>';
    extra = '<button class="mic-redo" type="button" onclick="micRecord()">Redo</button>';
  } else if(m.phase === 'ready'){
    title = 'Hear yourself';
    sub = '<span class="av-row-sub">Check the volume sounds right</span>';
    btn = '<button class="gm-playbtn" type="button" onclick="micPlay()" aria-label="Play back">' + GM.I.play + '</button>';
    extra = '<button class="mic-redo" type="button" onclick="micRecord()">Redo</button>';
  } else {
    title = 'Test your mic';
    sub = '<span class="av-row-sub">Say something and hear it back</span>';
    btn = '<button class="gm-playbtn" type="button" onclick="micRecord()" aria-label="Test your mic">' + GM.I.mic + '</button>';
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
    + '<span class="chev" aria-hidden="true">' + GM.I.chevRt + '</span>'
    + '</button>';
}
function devicesSheet(){
  var body = '<h4>Audio &amp; camera settings</h4>';
  ['camera','mic','output'].forEach(function(key){
    var d = DEVICES[key], opts = '';
    d.options.forEach(function(o){
      opts += '<button type="button" class="dev-opt' + (o === d.value ? ' is-on' : '') + '"'
        + ' onclick="pickDevice(\'' + key + '\',\'' + o.replace(/'/g,"\\'") + '\')">'
        + '<span>' + GM.esc(o) + '</span><span class="tick">' + GM.I.check + '</span></button>';
    });
    body += '<div class="dev-group"><span class="dev-group-label">' + GM.esc(d.label) + '</span>' + opts + '</div>';
  });
  body += '<div class="dev-group"><span class="dev-group-label">Microphone test</span>' + micTest() + '</div>';
  return GM.sheet({
    cls:'dev-sheet',
    onScrim:'closeDevices()',
    body:body,
    acts:'<button class="btn primary" type="button" onclick="closeDevices()">Done</button>'
  });
}

function screenAvCheck(){
  var liveMic = (ST.perm === 'granted' && !ST.micOff);
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + '<main class="av-canon cafe-av">'
      + '<header class="av-head"><h2>Ready to be seen?</h2></header>'
      + '<section class="av-card" aria-label="Camera and microphone check"><div class="av-stage">'
        + GM.preview({camOff:ST.camOff, blur:ST.blur, img:IMG_YOU, label:'You'})
        + GM.avTools(ST, {cam:'toggleCam()', mic:'toggleMic()', blur:'toggleBlur()',
                          echo:liveMic})
      + '</div></section>'
      + permHelper()
      + '<footer class="av-foot">'
        + avSettingsLink()
        /* No partner exists yet at this point in the flow, so this cannot name
           one the way the Gym A/V privacy line does. */
        + '<p class="av-privacy">Your partner will see and hear you for the whole chat. Nothing is recorded.</p>'
        + '<button class="primary-cta" type="button" onclick="startMatching()"'
          + (ST.perm === 'granted' ? '' : ' disabled') + '>Start matching</button>'
      + '</footer>'
    + '</main>'
    + (ST.devSheet ? devicesSheet() : '');
}


/* =========================================================================
   3 · ACTIVE SEARCHING  (+ the persistent indicator over a placeholder Hub)
   Not a waiting room, and not a pre-call lobby either: the camera is off here.
   A/V readiness was settled before the student joined the queue.
   ========================================================================= */
function levelsSheet(){
  return GM.sheet({
    milky:true,
    cls:'levels-sheet',
    onScrim:'closeLevels()',
    body:'<h4>Who would you like to meet?</h4>' + levelPicker({heading:false}),
    acts:'<button class="btn primary" type="button" onclick="closeLevels()"'
      + (ST.selected.length?'':' disabled') + '>Keep searching</button>'
  });
}
/* Ambient dotted globe — the Citizen Café map. Presence is yellow pins;
   a couple of them briefly bloom into a face, then recede. Scan is thin
   cream arcs that fade in and out as they travel, never a hard line. */
function searchMap(){
  var faces = {
    2:'../student-main-classroom-desktop/assets/dana.png',
    5:'../student-main-classroom-desktop/assets/teacher-yael.png'
  };
  var pins = [
    [18, 48], [24, 42], [36, 70], [50, 28], [48, 42], [72, 30]
  ];
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
    + '<img class="search-map-art" src="World map.svg" alt="">'
    + '<svg class="search-echoes" viewBox="0 0 616 275" focusable="false">'
      + '<defs><linearGradient id="echoFade" x1="0" y1="0" x2="1" y2="0">'
        + '<stop offset="0" stop-color="#F7F6EF" stop-opacity="0"/>'
        + '<stop offset=".16" stop-color="#F7F6EF" stop-opacity=".5"/>'
        + '<stop offset=".5" stop-color="#F7F6EF" stop-opacity=".85"/>'
        + '<stop offset=".84" stop-color="#F7F6EF" stop-opacity=".5"/>'
        + '<stop offset="1" stop-color="#F7F6EF" stop-opacity="0"/>'
      + '</linearGradient></defs>'
      + '<path class="search-echo" d="M36 232 A 290 78 0 0 1 580 232"/>'
      + '<path class="search-echo e2" d="M22 236 A 298 102 0 0 1 594 236"/>'
      + '<path class="search-echo e3" d="M48 228 A 284 62 0 0 1 568 228"/>'
      + '<path class="search-echo e4" d="M16 240 A 302 118 0 0 1 600 240"/>'
      + '<path class="search-echo e5" d="M42 234 A 288 88 0 0 1 574 234"/>'
    + '</svg>'
    + pinHtml
  + '</div>';
}
function screenSearching(){
  var n = ST.selected.length;
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + '<main class="cafe-stage searching-stage">'
      + '<div class="search-hero">'
        + searchMap()
        + '<h2 class="cafe-display">Looking for a partner\u2026</h2>'
        + '<p class="cafe-sub">We\u2019ll tell you the moment someone\u2019s free. You don\u2019t have to wait here.</p>'
        + '<p class="search-summary"><span>Searching across ' + n + (n === 1 ? ' level' : ' levels') + '</span>'
          + '<button type="button" class="edit" onclick="openLevels()">Edit</button></p>'
      + '</div>'
      + '<div class="search-lower">'
        + '<button type="button" class="wait-practice" onclick="openFlashcards()">'
          + '<span class="wp-icon">' + cafeCardsIcon() + '</span>'
          + '<span class="wp-copy"><span class="wp-kicker">While you wait</span>'
          + '<span class="wp-title">Practice flashcards</span></span>'
          + '<span class="chev" aria-hidden="true">' + GM.I.chevRt + '</span>'
        + '</button>'
        + '<div class="cafe-acts">'
          + '<button class="primary-cta" type="button" onclick="keepExploring()">Explore Hub</button>'
          + '<button class="ghost-cta" type="button" onclick="stopMatching()">Stop matching</button>'
        + '</div>'
      + '</div>'
    + '</main>'
    + (ST.levelsSheet ? levelsSheet() : '');
}

/* Optional practice. Matching is visibly still running at the top, and a match
   interrupts this screen exactly as it interrupts the Hub. */
function screenFlashcards(){
  var card = DECK[((ST.card % DECK.length) + DECK.length) % DECK.length];
  return '<div class="transition-shell"></div>'
    + '<div class="fc-screen">'
      + '<div class="fc-top">'
        + '<button class="icon-btn" type="button" onclick="closeFlashcards()" aria-label="Back to searching">' + GM.I.x + '</button>'
        + '<span class="fc-status"><span class="mi-dot" aria-hidden="true"></span>Still looking for a partner\u2026</span>'
      + '</div>'
      + GM.flashcard(card,
          {revealed:ST.cardRevealed, marked:ST.cardMarked, playing:ST.cardPlaying},
          {flip:'cardFlip()', mark:'cardMark()', play:'cardPlay()',
           prev:'cardPrev()', next:'cardNext()', reveal:'cardReveal()'})
    + '</div>';
}

/* The indicator is the whole point of this screen. The grey field behind it is
   an explicit placeholder: the Hub is not designed in this pass. */
function matchIndicator(){
  return '<button type="button" class="match-indicator" onclick="openSearch()">'
    + '<span class="mi-dot" aria-hidden="true"></span>'
    + '<span class="mi-copy">'
      + '<span class="mi-title">Caf\u00e9</span>'
      + '<span class="mi-line">Finding your Caf\u00e9 partner...</span>'
    + '</span>'
    + '<span class="mi-chev" aria-hidden="true">' + GM.I.chevRt + '</span>'
    + '</button>';
}
function screenHub(){
  return '<div class="hub-mock">'
      + '<div class="hub-stamp">Hub \u2014 placeholder, not designed in this pass</div>'
      + '<div class="hub-blocks"><i></i><i></i><i></i><i></i></div>'
      + '<div class="hub-tabbar"><i></i><i></i><i></i><i></i></div>'
    + '</div>'
    + (ST.matching ? matchIndicator() : '');
}


/* =========================================================================
   4 · MATCH FOUND  —  a time-sensitive interrupt, on the Gym milky sheet
   ========================================================================= */
function matchSheet(){
  var accepted = (ST.matchPhase === 'accepted');
  var low = ST.offerLeft <= 10;

  var card = '<div class="match-card' + (accepted?' is-waiting':'') + '">'
    + '<span class="match-photo"><img src="' + PARTNER.img + '" alt="' + GM.esc(PARTNER.name) + '"></span>'
    + '<h4 class="match-name">' + GM.esc(PARTNER.name) + '</h4>'
    + '<div class="match-facts">'
      + '<span class="fact">' + GM.levelDot(PARTNER.level) + GM.esc(GM.levelMeta(PARTNER.level).label) + '</span>'
      + '<span class="fact">' + GM.I.pin + GM.esc(PARTNER.location) + '</span>'
    + '</div>'
    + '<div class="ice">'
      + '<span class="ice-label">' + GM.esc(PARTNER.ice.label) + '</span>'
      + '<span class="ice-text">' + GM.esc(PARTNER.ice.text) + '</span>'
    + '</div>'
    + (accepted
        ? '<div class="match-waiting">'
          + '<p class="mw-line">Waiting for ' + GM.esc(PARTNER.name) + ' to confirm\u2026</p>'
          + GM.loadLine()
          + '</div>'
        : '<p class="match-count' + (low?' is-low':'') + '"><span class="num" id="offerNum">'
          + ST.offerLeft + 's</span><span class="unit">to answer</span></p>')
    + '</div>';

  var acts = accepted
    ? '<button class="btn" type="button" onclick="declineMatch()">Keep looking instead</button>'
    : '<button class="btn primary" type="button" onclick="acceptMatch()">Meet ' + GM.esc(PARTNER.name) + '</button>'
      + '<button class="btn" type="button" onclick="declineMatch()">Keep looking</button>';

  return GM.sheet({
    milky:true,
    cls:'match-sheet',
    body:'<h4>We found you a Caf\u00e9 partner!</h4>' + card,
    acts:acts,
    resp:ST.offerLeft
  });
}
/* The match lands on top of whatever the student was doing — the Hub, the
   search screen, or a flashcard mid-deck. */
function screenMatched(){
  var behind = screenHub();
  if(ST.bg === 'searching') behind = screenSearching();
  else if(ST.bg === 'flashcards') behind = screenFlashcards();
  return behind + matchSheet();
}


/* =========================================================================
   5 · SESSION AGREEMENT  —  both sides accepted
   A/V was settled before matching, so this leads straight into the chat.
   Principles are statements, not tasks. One acknowledgement enables the CTA.
   ========================================================================= */
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
      + '<span class="agree-copy"><span class="agree-lead">' + GM.esc(t.lead) + '</span>'
      + '<span class="agree-support">' + GM.esc(t.support) + '</span></span>'
    + '</li>';
  });
  var ack = '<label class="agree-ack' + (ST.agreed?' is-on':'') + '">'
      + '<span class="agree-check">'
        + '<input id="agreeAck" type="checkbox"' + (ST.agreed?' checked':'') + ' onchange="onAgreeAck(this)">'
        + '<span class="agree-box" aria-hidden="true"></span>'
      + '</span>'
      + '<span class="agree-ack-copy">I\u2019m ready to show up for my partner.</span>'
    + '</label>';
  return '<div class="transition-shell"></div>'
    + cafeLockup('with ' + PARTNER.name)
    + GM.sheet({
        milky:true,
        cls:'agree-sheet',
        body:'<h4>Before you sit down</h4>'
          + '<p class="agree-intro">Before jumping into the Caf\u00e9, here\u2019s what we\u2019re both agreeing to:</p>'
          + '<ul class="agree-list">' + list + '</ul>'
          + ack,
        acts:'<button class="btn primary" id="agreeCta" type="button" onclick="enterCafe()"'
          + (ST.agreed?'':' disabled') + '>Caf\u00e9 time!</button>'
      });
}


/* =========================================================================
   6 · LIVE CAFE  —  the Gym Practice Room mobile shell
   Conversation-support tools lead the dock; device controls follow the divider.
   Wheel and Challenge are entry points only in this pass.
   ========================================================================= */
function textSheet(){
  var log = '';
  ST.textLog.forEach(function(m){
    log += '<div class="ts-msg' + (m.own?' own':'') + '">' + GM.esc(m.text) + '</div>';
  });
  return GM.sheet({
    cls:'text-sheet',
    bare:true,
    body:'<div class="ts-head"><span class="ts-kicker">Right now</span>'
      + '<button class="ts-close" type="button" onclick="closeText()" aria-label="Close">' + GM.I.x + '</button></div>'
      + '<div class="ts-activity"><div class="ts-title">' + GM.esc(ACTIVITY.title) + '</div>'
      + '<div class="ts-body">' + GM.esc(ACTIVITY.body) + '</div></div>'
      + (log ? '<div class="ts-log" id="tsLog">' + log + '</div>' : '')
      + '<div class="ts-input">'
        + '<input id="tsInput" type="text" placeholder="Spell it, or type a short answer\u2026" autocomplete="off">'
        + '<button class="ts-send" type="button" onclick="sendText()" aria-label="Send">' + GM.I.send + '</button>'
      + '</div>'
      + '<p class="ts-note">Nothing here is saved after this chat.</p>'
  });
}
function leaveSheet(){
  return GM.sheet({
    milky:true,
    onScrim:'closeLeave()',
    body:'<h4>End this Caf\u00e9?</h4>'
      + '<p>If something feels wrong or uncomfortable, you can leave right away \u2014 and let the team know what happened.</p>',
    acts:'<button class="btn danger-soft" type="button" onclick="endSession()">End session</button>'
      + '<button class="btn" type="button" onclick="endSession()">Report an issue</button>'
      + '<button class="btn" type="button" onclick="closeLeave()">Stay</button>'
  });
}
function keepOnSheet(){
  return GM.sheet({
    milky:true,
    cls:'keep-on-sheet',
    onScrim:'closeKeepOn()',
    body:'<h4>Caf\u00e9 needs the camera and mic on to keep going.</h4>'
      + '<p class="keep-on-q">Want to leave the session?</p>',
    acts:'<button class="btn primary" type="button" onclick="closeKeepOn()">Stay</button>'
      + '<button class="btn" type="button" onclick="endSession()">Leave</button>'
  });
}
function partnerOffSheet(){
  return GM.sheet({
    milky:true,
    cls:'partner-off-sheet' + (ST.partnerOffFind?' is-wait':''),
    body:'<h4>' + GM.esc(PARTNER.name) + '\u2019s camera or mic seems to be off.</h4>'
      + '<p>We\u2019ll find you a new partner if they don\u2019t come back soon.</p>'
      + '<div class="po-status" role="status" aria-live="polite">'
        + '<span class="po-spin" aria-hidden="true"></span>'
        + '<span class="po-status-copy">Trying to reconnect\u2026</span>'
      + '</div>'
      + '<div class="po-acts" aria-hidden="' + (ST.partnerOffFind?'false':'true') + '">'
        + '<button class="btn po-find" type="button" onclick="findNewPartner()">Find me a new partner</button>'
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
  var dock = GM.dock([
    {icon:GM.I.wheel, cap:'Wheel',     cls:' accent', onclick:'openWheel()',    aria:'Spin the Wheel'},
    {icon:GM.I.bolt,  cap:'Challenge', onclick:'openChallenge()', aria:'Challenge mode'},
    {icon:GM.I.chat,  cap:'Text',      on:ST.textOpen, onclick:'toggleText()',  aria:'Activity and text'},
    null,
    {icon:GM.I.cam,   cap:'Camera',    slash:ST.camOff, onclick:'toggleCam()',  aria:ST.camOff?'Turn camera on':'Turn camera off'},
    {icon:GM.I.mic,   cap:'Mic',       slash:ST.micOff, onclick:'toggleMic()',  aria:ST.micOff?'Unmute':'Mute'}
  ], {label:'Leave & report', onclick:'openLeave()'});
  var sheetOpen = ST.textOpen || ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet;
  if(ST.dockTip && !sheetOpen){
    dock = dock.replace('<div class="rfooter">', '<div class="rfooter">' + dockTipHtml());
  }

  return GM.roomHeader(
      GM.roomTime(ST.left, {cap:'Chat', final:ST.left <= DUR.sessionFinal}),
      'openLeave()'
    )
    + '<div class="rstage">'
      + GM.half('top', PARTNER.name, {img:PARTNER.img, camOff:ST.partnerCamOff, micOff:ST.partnerMicOff})
      + GM.half('bottom', 'You', {img:IMG_YOU, camOff:ST.camOff, micOff:ST.micOff})
    + '</div>'
    + dock
    + (ST.textOpen ? textSheet() : '')
    + (ST.leaveSheet ? leaveSheet() : '')
    + (ST.keepOnSheet ? keepOnSheet() : '')
    + (ST.partnerOffSheet ? partnerOffSheet() : '');
}


/* =========================================================================
   7 · ENDING / AUTOMATIC REQUEUE
   Matching never stopped, so there is no "find someone now".
   ========================================================================= */
function screenEnding(){
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + '<main class="cafe-stage">'
      + '<h2 class="cafe-display">That was a good one</h2>'
      + '<p class="cafe-sub">Six minutes of Hebrew, out loud.</p>'
      + '<span class="end-partner"><span class="av-sm"><img src="' + PARTNER.img + '" alt=""></span>'
        + 'You talked with ' + GM.esc(PARTNER.name) + '</span>'
      + '<div class="end-again">' + GM.loadDots() + '<span>Looking for your next partner\u2026</span></div>'
      + '<div class="cafe-acts">'
        + '<button class="ghost-cta" type="button" onclick="stopMatching()">Stop matching</button>'
      + '</div>'
    + '</main>';
}


/* ------------------------------------------------------------ transitions */
function seedFor(state){
  if(state === 'entry'){
    ST.matching = false; ST.searchElapsed = 0; ST.textOpen = false;
    ST.textLog = []; ST.leaveSheet = false; ST.left = 0; ST.levelsSheet = false;
    ST.agreed = false; ST.keepOnSheet = false;
    ST.dockTip = false; ST.dockTipSeen = false;
    clearPartnerOff();
    clearTimeout(dockTipT); dockTipT = null;
  }
  /* every Café entry runs the check, so it always starts from scratch */
  if(state === 'avcheck'){ ST.left = 0; ST.devSheet = false; micReset(); }
  if(state === 'searching'){
    ST.matching = true; ST.left = DUR.searchTo; ST.levelsSheet = false;
    clearPartnerOff();
  }
  if(state === 'hub'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'flashcards'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'matched'){
    ST.matchPhase = 'offer';
    ST.offerLeft = DUR.offer;
    PARTNER.level = drawPartnerLevel();
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

/* ------------------------------------------------------- product actions */
function toggleLevel(id){
  if(id === LEVEL_DATA.myLevel) return;
  var i = ST.selected.indexOf(id);
  if(i === -1) ST.selected.push(id); else ST.selected.splice(i, 1);
  if(ST.selected.indexOf(LEVEL_DATA.myLevel) === -1) ST.selected.unshift(LEVEL_DATA.myLevel);
  render();
}
function selectAllLevels(){ ST.selected = LEVEL_DATA.eligible.slice(); render(); }
function selectOnlyMine(){ ST.selected = [LEVEL_DATA.myLevel]; render(); }
/* Editing mid-search does not pause the search. */
function openLevels(){ ST.levelsSheet = true; render(); }
function closeLevels(){ if(!ST.selected.length) return; ST.levelsSheet = false; render(); }

function goAvCheck(){ if(!ST.selected.length) return; setState('avcheck'); }
function startMatching(){ if(!ST.selected.length || ST.perm !== 'granted') return; setState('searching'); }
/* Leaving the search screen does not stop the search. */
function keepExploring(){ ST.state = 'hub'; try{ history.replaceState(null,'','#hub'); }catch(e){} render(); }
function openSearch(){ ST.state = 'searching'; try{ history.replaceState(null,'','#searching'); }catch(e){} render(); }
/* The single exit. Matching ends here, or when the app closes. */
function stopMatching(){ setState('entry'); }

function offerMatch(){
  ST.bg = (ST.state === 'flashcards') ? 'flashcards'
        : (ST.state === 'searching') ? 'searching' : 'hub';
  setState('matched');
}
function acceptMatch(){
  ST.matchPhase = 'accepted';
  ST.left = DUR.partnerConfirm;
  render();
}
/* Declined by you, declined by the partner, or the window ran out: all three
   return to background matching. */
function declineMatch(){
  ST.matching = true;
  ST.left = DUR.searchTo;
  ST.searchElapsed = 0;
  /* back to whatever the interrupt landed on, mid-deck included */
  ST.state = ST.bg;
  try{ history.replaceState(null, '', '#' + ST.state); }catch(e){}
  render();
}
function partnerDeclines(){
  declineMatch();
  GM.toast(PARTNER.name + ' kept looking. Still matching\u2026');
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

/* the mic test — record a few seconds, then hear it back */
var MIC_LEN = 4;
function micReset(){ ST.mic = {phase:'idle', left:0, pos:0}; }
function micRecord(){
  if(ST.micOff){ GM.toast('Turn your microphone on to test it'); return; }
  ST.mic = {phase:'recording', left:MIC_LEN, pos:0};
  render();
}
function micStop(){ ST.mic.phase = 'ready'; ST.mic.pos = 0; render(); }
function micPlay(){ ST.mic.phase = 'playing'; ST.mic.pos = 0; render(); }
function micPause(){ ST.mic.phase = 'ready'; render(); }

function openDevices(){ ST.devSheet = true; render(); }
function closeDevices(){ ST.devSheet = false; render(); }
function pickDevice(key, value){ DEVICES[key].value = value; render(); }

/* optional practice while the queue runs. Not a room, and not a reason to stay. */
function openFlashcards(){ setState('flashcards'); }
function closeFlashcards(){ ST.state = 'searching'; try{ history.replaceState(null,'','#searching'); }catch(e){} render(); }
function cardReveal(){ ST.cardRevealed = true; render(); }
function cardFlip(){ ST.cardRevealed = !ST.cardRevealed; ST.cardPlaying = false; render(); }
function cardMark(){ ST.cardMarked = !ST.cardMarked; render(); }
function cardPlay(){ ST.cardPlaying = !ST.cardPlaying; render(); }
function cardStep(d){ ST.card += d; ST.cardRevealed = false; ST.cardMarked = false; ST.cardPlaying = false; render(); }
function cardPrev(){ cardStep(-1); }
function cardNext(){ cardStep(1); }

/* Entry points only in this pass — the experiences themselves are not designed. */
function openWheel(){ dismissDockTip(); GM.toast('Spin the Wheel \u2014 entry point only in this pass'); }
function openChallenge(){ dismissDockTip(); GM.toast('Challenge mode \u2014 entry point only in this pass'); }

function toggleText(){ dismissDockTip(); ST.textOpen = !ST.textOpen; render(); }
function closeText(){ ST.textOpen = false; render(); }
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
    var el = document.querySelector('.partner-off-sheet');
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
/* Ends this chat. Matching stays live and picks up again on its own. */
function endSession(){ ST.leaveSheet = false; ST.keepOnSheet = false; clearPartnerOff(); setState('ending'); }


/* --------------------------------------------------------------- the clock */
var TIMED = {avcheck:1, searching:1, hub:1, flashcards:1, matched:1, live:1, ending:1};

function tick(){
  if(!ST.clockOn || !TIMED[ST.state]) return;
  var s = ST.state;

  if(s === 'avcheck'){
    if(ST.mic.phase === 'recording'){
      ST.mic.left--;
      if(ST.mic.left <= 0){ micStop(); return; }
      syncClock();
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
    syncClock();
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
      GM.toast('The window closed. Still matching\u2026');
      return;
    }
    syncClock();
    return;
  }
  if(s === 'live'){
    ST.left--;
    if(ST.left <= 0){ setState('ending'); return; }
    syncClock();
    return;
  }
  if(s === 'ending'){
    ST.left--;
    if(ST.left <= 0){ keepExploring(); return; }
  }
}

/* Patch the clock in place so the live video shell, the text panel scroll and
   the input focus survive every tick. */
function syncClock(){
  if(ST.state === 'avcheck'){
    var mc = document.querySelector('.mic-test .mt-count');
    if(mc) mc.textContent = ST.mic.left + 's';
    return;
  }
  if(ST.state === 'searching'){
    updateNote();
    return;
  }
  if(ST.state === 'matched'){
    var n = document.getElementById('offerNum');
    if(n) n.textContent = ST.offerLeft + 's';
    var c = document.querySelector('.match-count');
    if(c) c.classList.toggle('is-low', ST.offerLeft <= 10);
    var r = document.querySelector('.match-sheet .respline');
    if(r) r.classList.toggle('is-low', ST.offerLeft <= 10);
    updateNote();
    return;
  }
  if(ST.state === 'live'){
    var pill = document.querySelector('.room-time');
    if(pill){
      var t = pill.querySelector('.tval');
      if(t) t.textContent = GM.mmss(ST.left);
      pill.classList.toggle('final', ST.left <= DUR.sessionFinal);
    }
  }
  updateNote();
}


/* ------------------------------------------------------------------ render */
function render(){
  var el = document.getElementById('screen');
  if(!el) return;
  var s = ST.state, html = '';
  if(s === 'entry')           html = screenEntry();
  else if(s === 'avcheck')    html = screenAvCheck();
  else if(s === 'searching')  html = screenSearching();
  else if(s === 'hub')        html = screenHub();
  else if(s === 'flashcards') html = screenFlashcards();
  else if(s === 'matched')    html = screenMatched();
  else if(s === 'agreement')  html = screenAgreement();
  else if(s === 'live')       html = screenLive();
  else if(s === 'ending')     html = screenEnding();

  el.innerHTML = GM.statusbar() + html;
  el.classList.toggle('on-light', s === 'hub' || (s === 'matched' && ST.bg === 'hub'));

  if(ST.textOpen){
    var log = document.getElementById('tsLog');
    if(log) log.scrollTop = log.scrollHeight;
    var input = document.getElementById('tsInput');
    if(input){
      input.focus();
      input.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') sendText(); });
    }
  }
  syncSwitcher();
}


/* ---------------------------------------------------------------- switcher */
function syncSwitcher(){
  document.querySelectorAll('.sc').forEach(function(b){
    b.classList.toggle('on', b.dataset.sc === ST.state);
  });
  var clockBtn = document.getElementById('clockBtn');
  if(clockBtn){
    clockBtn.classList.toggle('on', ST.clockOn);
    clockBtn.textContent = ST.clockOn ? 'Clock: running' : 'Clock: paused';
  }
  updateNote();
}
function updateNote(){
  var note = document.getElementById('stateNote');
  if(!note) return;
  note.textContent = (NOTES[ST.state] || '')
    + '  \u00b7  matching ' + (ST.matching ? 'live' : 'stopped')
    + ' \u00b7 you are ' + GM.levelMeta(LEVEL_DATA.myLevel).label
    + ' \u00b7 open to ' + ST.selected.length + '/' + LEVEL_DATA.eligible.length + ' levels'
    + ' \u00b7 level data: ' + LEVEL_DATA.source
    + ' \u00b7 cam ' + (ST.camOff?'off':'on')
    + ' \u00b7 mic ' + (ST.micOff?'off':'on')
    + (ST.state === 'matched' ? ' \u00b7 offer ' + ST.offerLeft + 's (' + ST.matchPhase + ')' : '')
    + (ST.state === 'live' ? ' \u00b7 ' + GM.mmss(ST.left) + ' left' : '');
}
function toggleClock(){ ST.clockOn = !ST.clockOn; syncSwitcher(); }
function jumpFinal(){ if(ST.state !== 'live') setState('live'); ST.left = 20; render(); }
function runPath(){
  ST.clockOn = true;
  setState('entry');
  setTimeout(goAvCheck, 900);
  setTimeout(startMatching, 2200);
}


/* -------------------------------------------------------------------- boot */
function applyHash(){
  var h = (location.hash || '').replace('#','');
  if(h && ORDER.indexOf(h) !== -1 && h !== ST.state) setState(h);
}
(function boot(){
  var p = new URLSearchParams(location.search);
  var s = p.get('state') || (location.hash || '').replace('#','');
  if(s && ORDER.indexOf(s) !== -1) ST.state = s;
  seedFor(ST.state);

  document.querySelectorAll('.sc').forEach(function(b){
    b.onclick = function(){
      var v = b.dataset.sc;
      /* the review switcher reaches every state directly, including the ones
         that are only ever entered from a background process */
      if(v === 'matched'){ ST.matching = true; ST.bg = 'hub'; }
      if(v === 'hub' || v === 'searching' || v === 'flashcards') ST.matching = true;
      setState(v);
    };
  });
  window.addEventListener('hashchange', applyHash);

  render();
  setInterval(tick, 1000);
})();
