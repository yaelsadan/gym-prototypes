/* Profile modal. Approach A (DProfileModal) from hub-profile-prototype,
   opened over the real Home on Personal information.
   The exported mock Home, its avatar, and its licensed font files are not used.
   Typography comes from the Home page (FedraSerifPro and Assistant). */
(function () {
  var shell = document.getElementById("profile-modal");
  var root = document.getElementById("profile-root");
  var trigger = document.querySelector("button.profile");
  if (!shell || !root || !trigger) return;

  var comp = null;
  var loading = null;
  var open = false;
  var lastFocus = null;
  var pageScroll = 0;
  var contentScroll = 0;
  var PREFIX = "../hub-profile-prototype/";

  function contentEl() {
    return document.querySelector(".content");
  }
  function rememberScroll() {
    pageScroll = window.scrollY || 0;
    var content = contentEl();
    contentScroll = content ? content.scrollTop : 0;
  }
  function restoreScroll() {
    var content = contentEl();
    if (content) content.scrollTop = contentScroll;
    if (pageScroll) window.scrollTo(0, pageScroll);
  }
  function hide() {
    if (!open) return;
    open = false;
    document.documentElement.classList.remove("profile-open");
    shell.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    restoreScroll();
  }
  function openPastCourses() {
    var pastBtn = document.querySelector(".past__btn");
    var menu = document.getElementById("past-menu");
    if (!pastBtn || !menu || !menu.hidden) return;
    pastBtn.click();
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("Could not load " + src)); };
      document.body.appendChild(script);
    });
  }
  function prepare(def) {
    def.template = def.template
      .replace(/<img src="assets\/img\/hub-home\.png"[^>]*>\s*/, "")
      .replace(/<button aria-label="Open your profile"[\s\S]*?<\/button>\s*/, "")
      .replace('value="{{isHome}}"', 'value="{{false}}"')
      .replace(/assets\/img\//g, PREFIX + "assets/img/")
      .replace(/Fedra Serif PRO HL/g, "FedraSerifPro");
    def.css = def.css
      .replace(/@font-face\{[^}]*\}/g, "")
      .replace(/Fedra Serif PRO HL/g, "FedraSerifPro");
  }
  function ensure() {
    if (comp) return Promise.resolve(comp);
    if (loading) return loading;
    loading = loadScript(PREFIX + "js/runtime.js?v=20261123a")
      .then(function () { return loadScript(PREFIX + "js/components.js?v=20261123a"); })
      .then(function () {
        var def = window.HUB_COMPONENTS && window.HUB_COMPONENTS.DProfileModal;
        if (!def || !window.mountComponent) throw new Error("Profile prototype did not load");
        if (!def.__hubPrepared) {
          prepare(def);
          def.__hubPrepared = true;
        }
        comp = window.mountComponent(def, { start: "personal" }, root);
        var orig = comp.setState.bind(comp);
        comp.setState = function (patch) {
          var next = typeof patch === "function" ? patch(comp.state) : patch;
          var closing = !!(next && Object.prototype.hasOwnProperty.call(next, "mode") && next.mode === "closed");
          var showPast = !!(next && next.pastHint);
          if (closing) hide();
          orig(patch);
          if (showPast) openPastCourses();
        };
        return comp;
      })
      .catch(function (error) {
        loading = null;
        throw error;
      });
    return loading;
  }
  function show(el) {
    lastFocus = el || document.activeElement;
    rememberScroll();
    open = true;
    document.documentElement.classList.add("profile-open");
    shell.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    ensure().then(function () {
      if (!open) return;
      comp.setState({
        mode: "profile",
        tab: "personal",
        confirm: null,
        field: null,
        draft: null,
        q: "",
        err: null,
        busy: false,
        placement: null,
        saved: null,
        loggedOut: false,
        pastHint: false
      });
      Promise.resolve().then(function () {
        if (!open) return;
        ["P", "S", "E"].forEach(function (key) {
          if (comp.els && comp.els[key]) comp.els[key].scrollTop = 0;
        });
        var closeBtn = shell.querySelector('[aria-label="Close profile"]');
        if (closeBtn) closeBtn.focus();
      });
    }).catch(function () {
      hide();
    });
  }

  trigger.addEventListener("click", function () {
    show(trigger);
  });

  document.addEventListener("keydown", function (event) {
    if (!open || event.key !== "Escape") return;
    var state = comp && comp.state;
    if (state && (state.confirm || state.field)) return;
    event.preventDefault();
    event.stopPropagation();
    if (comp) comp.setState({ mode: "closed", tab: "personal", confirm: null, field: null, pastHint: false });
    else hide();
  }, true);
})();
