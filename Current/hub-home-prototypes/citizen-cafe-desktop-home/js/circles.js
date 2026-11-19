/* Circles modal, brought into the Hub from the circles-hifi prototype.
   TEMPORARY CONTENT: That's Deep date and host; the whole "Hebrew at work" event;
   the year of Yalla (2027); every event summary; hosts shown as "Host TBC";
   the three thematic photos; recording titles 6–43 and the full titles of 2–5;
   hosts and descriptions except recording 1; thumbnails except 1–5.
   Typography uses the Hub families (FedraSerifPro and Assistant). The licensed
   Fedra files that shipped inside circles-hifi are not loaded here. */
class Component extends DCLogic {
  measure() {
    var st = this.state || {};
    var patch = {};
    var b = this._body, g = this._grid, d = this._detail, vp = this._vp;
    if (b && g && vp && document.body.contains(g)) {
      var y = Math.round(g.getBoundingClientRect().top - vp.getBoundingClientRect().top);
      if (y !== st.measuredY) patch.measuredY = y;
    } else if (st.measuredY != null) patch.measuredY = null;
    var over = 0;
    if (d && document.body.contains(d)) {
      var bottom = d.getBoundingClientRect().bottom, maxB = bottom;
      d.querySelectorAll('*').forEach(function (n) { var r = n.getBoundingClientRect(); if (r.height && r.bottom > maxB) maxB = r.bottom; });
      over = Math.round(maxB - bottom);
    }
    if (over !== (st.overflowPx || 0)) patch.overflowPx = over;
    if (Object.keys(patch).length) this.setState(patch);
  }
  checkFonts() {
    var self = this;
    if (!document.fonts || !document.fonts.load) return;
    var faces = [['700 20px "Fedra Serif PRO HL"', 'Fedra Bold'], ['400 20px "Fedra Serif PRO HL"', 'Fedra Book'], ['400 16px Assistant', 'Assistant 400'], ['600 16px Assistant', 'Assistant 600'], ['700 16px Assistant', 'Assistant 700']];
    Promise.all(faces.map(function (f) { return document.fonts.load(f[0], 'Aa').then(function (r) { return !!(r && r.length > 0); }, function () { return false; }); }))
      .then(function (res) {
        var missing = faces.filter(function (f, i) { return !res[i]; }).map(function (f) { return f[1]; });
        var line = missing.length ? 'Fonts NOT loaded: ' + missing.join(', ') : 'Fonts loaded: Fedra Serif PRO HL (Book, Bold) · Assistant (400, 600, 700)';
        if (line !== (self.state || {}).fontStatus) self.setState({ fontStatus: line });
      });
  }
  componentDidMount() {
    var self = this;
    [80, 400].forEach(function (t) { setTimeout(function () {
      if (t === 400 && self.props && self.props.initScroll === 'library' && self._body && self._grid) self._body.scrollTop = Math.max(0, self._grid.offsetTop - 16);
    }, t); });
  }
  componentDidUpdate() {
    var self = this;
    var t = this._scrollTarget;
    this._scrollTarget = null;
    var b = this._body;
    if (t && b) {
      if (t === 'top') b.scrollTop = 0;
      else if (t === 'library' && this._grid) b.scrollTop = Math.max(0, this._grid.offsetTop - 16);
    }
    clearTimeout(this._mt);
    this._mt = setTimeout(function () { self.measure(); }, 40);
  }
  renderVals() {
    var self = this;
    var s = this.state || {};
    var p = this.props || {};
    var set = function (patch, scroll) { if (scroll) self._scrollTarget = scroll; self.setState(patch); };

    var screen = s.screen || p.initScreen || 'closed';
    var view = s.view || p.initView || 'overview';
    var count = s.count != null ? s.count : (p.initCount != null ? Number(p.initCount) : 3);
    var tz = s.tz || p.initTz || 'il';
    var qa = s.qa != null ? s.qa : !!p.qa;
    var gallery = s.gallery || p.gallery || 'A';
    var recIdx = s.recIdx != null ? s.recIdx : 0;
    var prevView = s.prevView || 'overview';
    var showToolbar = !p.hideToolbar;
    var TZ = { il: 'Israel Time', ny: 'New York Time' };

    /* TEMPORARY CONTENT (see canvas note): dates of That's Deep and the work Circle, the year of Yalla,
       the work Circle itself, all event summaries, hosts shown as "Host TBC", the three thematic photos,
       recording titles 6-43, recording descriptions other than #1. */
    var IMG = {
      nitzan: 'assets/circles/host_nitzan.png',
      teaserNitzan: 'assets/circles/teaser_nitzan.png',
      hills: 'assets/circles/theme_hills.jpg',
      orchard: 'assets/circles/theme_orchard.jpg',
      harvest: 'assets/circles/theme_harvest.jpg'
    };
    var ALL = [
      { id: 'deep', title: 'That’s Deep', host: 'Host TBC', hostImg: '', image: IMG.orchard, focal: '58% 42%',
        month: 'DEC', day: '1',
        il: { mid: 'Tue, Dec 1, 2026', date: 'Tuesday, December 1, 2026', short: 'Tue, Dec 1 · 19:00', time: '19:00', teaser: 'Tue 1 Dec · 7:00 PM IL' },
        ny: { mid: 'Tue, Dec 1, 2026', date: 'Tuesday, December 1, 2026', short: 'Tue, Dec 1 · 12:00 PM', time: '12:00 PM', teaser: 'Tue 1 Dec · 12:00 PM ET' },
        teaser: 'A conversation about the moments when Hebrew suddenly gets personal.',
        summary: 'Some conversations stay on the surface; this one is about the moments when Hebrew suddenly gets personal. We’ll talk about the first time you understood a joke, an argument or a compliment without translating it in your head. Students and teachers will share the words that made them feel at home, and the ones that still trip them up. Come ready to listen, bring one story of your own, and practise talking about feelings in a new language.' },
      { id: 'work', title: 'Hebrew at work: small talk and meetings', host: 'Host TBC', hostImg: '', image: IMG.harvest, focal: '74% 40%',
        month: 'DEC', day: '9',
        il: { mid: 'Wed, Dec 9, 2026', date: 'Wednesday, December 9, 2026', short: 'Wed, Dec 9 · 18:00', time: '18:00', teaser: 'Wed 9 Dec · 6:00 PM IL' },
        ny: { mid: 'Wed, Dec 9, 2026', date: 'Wednesday, December 9, 2026', short: 'Wed, Dec 9 · 11:00 AM', time: '11:00 AM', teaser: 'Wed 9 Dec · 11:00 AM ET' },
        teaser: 'The everyday Hebrew of offices, chats and meetings.',
        summary: 'Many students can order coffee in Hebrew but freeze in a team meeting. This Circle looks at the small phrases that carry office life: corridor greetings, polite pushback and work-chat shorthand. We’ll practise a few real situations together. You’ll leave with phrases you can use the next morning.' },
      { id: 'yalla', title: 'A short history of the word Yalla', host: 'Nitzan Wittler', hostImg: IMG.nitzan, teaserImg: IMG.teaserNitzan, image: IMG.hills, focal: '62% 52%',
        month: 'JAN', day: '15',
        il: { mid: 'Fri, Jan 15, 2027', date: 'Friday, January 15, 2027', short: 'Fri, Jan 15 · 20:30', time: '20:30', teaser: 'Jan 15 · 20:30 IL' },
        ny: { mid: 'Fri, Jan 15, 2027', date: 'Friday, January 15, 2027', short: 'Fri, Jan 15 · 1:30 PM', time: '1:30 PM', teaser: 'Jan 15 · 1:30 PM ET' },
        teaser: 'Place-holder text, explains about the circle, gives a little background…',
        summary: 'Yalla is one of the first words many students hear in Israel, and one of the most used. Nitzan looks at where the word comes from and how its meaning shifts with tone, timing and who is speaking. Bring examples you’ve heard on the street, at work or at home, and we’ll compare them together. By the end, you’ll know when yalla sounds friendly, impatient or final — and how to use it yourself.' }
    ];
    if (p.initLong) {
      ALL[1] = Object.assign({}, ALL[1], {
        title: 'Hebrew at work: small talk, emails, meetings and the unwritten rules of the office kitchen',
        summary: ALL[1].summary + ' We’ll also look at how titles and first names work, what counts as too direct, and how to disagree politely. A teacher who has worked in three Israeli companies will share the mistakes she made in her first year.'
      });
    }
    var events = count > 0 ? ALL : [];
    var hasEvents = events.length > 0;
    var eventId = s.eventId || p.initEvent || 'yalla';
    var evIndex = Math.max(0, events.findIndex(function (e) { return e.id === eventId; }));
    var modalOpen = screen === 'modal';
    var eventOpen = modalOpen && view === 'event' && hasEvents;
    var recOpen = modalOpen && view === 'recording';
    var overview = modalOpen && !eventOpen && !recOpen;

    this.flashToast = function (title) {
      clearTimeout(self._tt);
      self.setState({ toast: title });
      self._tt = setTimeout(function () { self.setState({ toast: null }); }, 2400);
    };
    var cover = function (focal) { return 'display: block; width: 100%; height: 100%; object-fit: cover; object-position: ' + focal + ';'; };
    var decorate = function (e) {
      var t = e[tz];
      var known = !!e.hostImg;
      return Object.assign({}, e, {
        whenShort: t.short, teaserWhen: t.teaser,
        hostKnown: known, hostUnknown: !known,
        imgStyle: cover(e.focal),
        teaserImg: e.teaserImg || e.image,
        teaserImgStyle: cover(e.teaserImg ? '50% 30%' : e.focal),
        ariaOpen: 'Open details: ' + e.title,
        openFromHome: function () { set({ screen: 'modal', view: 'event', eventId: e.id, toast: null }, 'top'); },
        open: function () { set({ view: 'event', eventId: e.id }); },
        rsvp: function () { self.flashToast(e.title); }
      });
    };
    var evList = events.map(decorate);
    var ev = evList[evIndex] || decorate(ALL[2]);

    var teaserIdx = s.teaserIdx != null ? s.teaserIdx : 2;
    if (teaserIdx >= evList.length) teaserIdx = 0;
    var teaser = evList[teaserIdx] || ev;

    var THUMBS = ['assets/circles/thumb1.png', 'assets/circles/thumb2.png', 'assets/circles/thumb3.png', 'assets/circles/thumb4.png', 'assets/circles/thumb5.png'];
    var titles = [
      'When Hebrew met P…',
      'The Banais: Keeping It in the Family',
      'Marking 7/10: 3 years later – who do…',
      'Mizrahi Music: From the shadows to t…',
      'The Imposter Syndrom of the Judean…',
      'From the shuk to the office: everyday Hebrew',
      'Moving with kids: school, paperwork and new friends',
      'Why Hebrew drops its vowels',
      'Slang you hear on the bus',
      'Holidays as a new Israeli: what nobody explains',
      'Talking to government offices without panic',
      'Teachers’ room: how our teachers learned languages'
    ];
    var DESC0 = 'Join Adi and Yonatan to discover how foreign languages have shaped Hebrew, from borrowed words and funny pronunciations to surprising changes in the language’s rules. Find out what Philip, popcorn, and אחלה have in common!';
    var TEMP_DESC = 'Description to come. This recording’s summary hasn’t been written yet; it will say what the conversation was about, who took part and what to listen for.';
    var recs = [];
    for (var i = 0; i < 43; i++) {
      var tt = i < titles.length ? titles[i] : titles[5 + ((i - 5) % (titles.length - 5))];
      (function (idx, title) {
        recs.push({
          title: title,
          thumb: idx < 5 ? THUMBS[idx] : '',
          hasThumb: idx < 5,
          hasStill: idx === 0, blurThumb: idx > 0 && idx < 5,
          hosts: idx === 0 ? 'With Adi and Yonatan' : 'Hosts TBC',
          desc: idx === 0 ? DESC0 : TEMP_DESC,
          pick: function () { set({ view: 'recording', recIdx: idx, prevView: view === 'recording' ? prevView : view }, 'top'); }
        });
      })(i, tt);
    }
    var rec = recs[recIdx] || recs[0];
    var moreRecs = [1, 2, 3].map(function (k) { return recs[(recIdx + k) % recs.length]; });

    var seg = function (on) {
      return 'border: 0; padding: 0 12px; height: 32px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;' +
        (on ? ' background: #ffe300; color: #373230;' : ' background: transparent; color: #f7f6ef;');
    };
    var overflowPx = s.overflowPx || 0;
    var fontStatusLine = s.fontStatus || 'Checking fonts…';
    return {
      rootStyle: (p.fluid ? 'width: 100%; height: 100%; min-width: 1100px;' : 'width: 1440px; height: ' + ((showToolbar ? 56 : 0) + (Number(p.vh) || 900)) + 'px;') + ' overflow: hidden; display: flex; flex-direction: column; background: #f7f6ef;',
      viewportStyle: 'position: relative; width: 100%; flex: 1; min-height: 0; overflow: hidden; background: #f7f6ef; font-family: Assistant, system-ui, sans-serif; color: #373230;',
      vpRef: function (el) { self._vp = el; },
      evDateShortLong: ev[tz].mid, tzShort: TZ[tz],
      showToolbar: showToolbar,
      countOpts: [3, 0].map(function (n) { return { label: n ? '3 events' : 'None', style: seg(count === n), pick: function () { set({ count: n, view: (view === 'event' && !n) ? 'overview' : view }, 'top'); } }; }),
      toggleQa: function () { set({ qa: !qa }); },
      qaLabel: qa ? 'QA aids: on' : 'QA aids: off',
      qaBtnStyle: 'height: 34px; padding: 0 14px; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; color: #fff; border: 1px solid ' + (qa ? '#d4006f' : '#f7f6ef') + '; background: ' + (qa ? '#d4006f' : 'transparent') + ';',
      fontStatusLine: fontStatusLine,
      showFontBadge: qa && !showToolbar,
      goHome: function () {
        if (typeof p.onClose === 'function') p.onClose();
        else set({ screen: 'closed', view: 'overview', toast: null });
      },
      openFromSidebar: function () { set({ screen: 'modal', view: 'overview', toast: null }, 'top'); },
      sideCirclesStyle: 'width: 44px; height: 44px; border-radius: 12px; border: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; background: ' + (modalOpen ? 'rgba(255,227,0,0.22)' : 'transparent') + ';',
      hasEvents: hasEvents,
      teaser: teaser,
      teaserPrev: function () { set({ teaserIdx: (teaserIdx - 1 + evList.length) % evList.length }); },
      teaserNext: function () { set({ teaserIdx: (teaserIdx + 1) % evList.length }); },
      teaserDots: evList.map(function (e, i) { return { style: 'width: 10px; height: 10px; border-radius: 50%; background: ' + (i === teaserIdx ? '#373230' : '#c9c6b8') + ';' }; }),
      modalOpen: modalOpen,
      cycleTz: function () { set({ tz: tz === 'il' ? 'ny' : 'il' }); },
      tzName: TZ[tz],
      bodyRef: function (el) { self._body = el; },
      gridRef: function (el) { self._grid = el; },
      detailRef: function (el) { self._detail = el; },
      onBodyScroll: function () { self.measure(); },
      hasUpcomingArea: (overview && hasEvents) || eventOpen,
      overviewMulti: overview && hasEvents,
      overviewEmpty: overview && !hasEvents,
      eventOpen: eventOpen,
      eventCountLabel: events.length + ' upcoming',
      eventCounter: (evIndex + 1) + ' of ' + events.length,
      prevEvent: function () { set({ eventId: events[(evIndex - 1 + events.length) % events.length].id }); },
      nextEvent: function () { set({ eventId: events[(evIndex + 1) % events.length].id }); },
      backToAll: function () { set({ view: 'overview' }); },
      events: evList,
      ev: ev, evDate: ev[tz].date, evTime: ev[tz].time,
      rsvpCurrent: function () { self.flashToast(ev.title); },
      showToast: !!s.toast && modalOpen, toastTitle: s.toast || '',
      showOverflow: eventOpen && qa && overflowPx > 0,
      overflowPx: overflowPx,
      showLibrary: modalOpen && !recOpen,
      librarySectionStyle: 'display: block;' + (hasEvents ? (gallery === 'B' ? ' margin-top: 40px; padding-top: 24px; border-top: 1px solid #dcdacd;' : ' margin-top: 28px; padding-top: 24px; border-top: 1px solid #dcdacd;') : ' margin-top: 28px;'),
      galleryA: gallery !== 'B', galleryB: gallery === 'B',
      galleryOpts: ['A', 'B'].map(function (g) { return { label: 'Gallery ' + g, style: seg(gallery === g), pick: function () { set({ gallery: g }); } }; }),
      recs: recs,
      recOpen: recOpen,
      rec: rec, moreRecs: moreRecs,
      recCounter: 'Recording ' + (recIdx + 1) + ' of 43',
      backToLibrary: function () { set({ view: prevView === 'event' && hasEvents ? 'event' : 'overview' }, 'library'); },
      showGuideLine: qa && modalOpen && !recOpen && s.measuredY != null,
      guideY: s.measuredY,
      guideStyle: 'position: absolute; left: 0; right: 0; top: ' + (s.measuredY || 0) + 'px; height: 0; border-top: 2px dashed #d4006f; z-index: 10; pointer-events: none;'
    };
  }
}
window.CirclesComponent = Component;

/* Hub entry points. The prototype Home page is not embedded.
   Sidebar opens Overview. A Home Circle card opens that event. */
(function () {
  var modal = document.getElementById("circles-modal");
  var side = document.querySelector("[data-circles-open]");
  var lastFocus = null;
  var open = false;
  if (!modal || !window.CirclesApp) return;

  function contentEl() {
    return document.querySelector(".content");
  }

  function closeModal() {
    if (!open) return;
    open = false;
    var pageScroll = window.scrollY || 0;
    var content = contentEl();
    var contentScroll = content ? content.scrollTop : 0;
    document.documentElement.classList.remove("circles-open");
    if (side) {
      side.classList.remove("is-open");
      side.setAttribute("aria-expanded", "false");
    }
    modal.hidden = true;
    CirclesApp.setState({ screen: "closed", view: "overview", toast: null });
    if (content) content.scrollTop = contentScroll;
    if (pageScroll) window.scrollTo(0, pageScroll);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  CirclesApp.mount(window.CirclesComponent, {
    initScreen: "closed",
    gallery: "B",
    hideToolbar: true,
    onClose: closeModal
  });

  function show(opts, trigger) {
    opts = opts || {};
    lastFocus = trigger || document.activeElement;
    open = true;
    document.documentElement.classList.add("circles-open");
    if (side) {
      side.classList.add("is-open");
      side.setAttribute("aria-expanded", "true");
    }
    modal.hidden = false;
    var patch = { screen: "modal", toast: null, view: opts.view || "overview" };
    if (opts.eventId) patch.eventId = opts.eventId;
    CirclesApp.setState(patch, function (inst) {
      if (inst._body) inst._body.scrollTop = 0;
      var closeBtn = modal.querySelector("[data-circles-close]");
      if (closeBtn) closeBtn.focus();
    });
  }

  window.CitizenCircles = { open: show, close: closeModal, isOpen: function () { return open; } };

  if (side) {
    side.addEventListener("click", function (event) {
      event.preventDefault();
      show({ view: "overview" }, side);
    });
  }

  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", function (event) {
    if (!open || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeModal();
  }, true);
})();
