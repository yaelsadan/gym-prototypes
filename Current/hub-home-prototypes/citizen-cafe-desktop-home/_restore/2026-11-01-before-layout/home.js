(function () {
  "use strict";

  /* Demo schedule, Israel time (IDT, UTC+3 until Oct 25, 2026).
     The rail runs from the end of the last class to the start of the next one.
     It shows elapsed time only, not how much the student has practised.
     Class length (90 min) is a demo assumption. */
  var DEMO = {
    now: "2026-10-14T18:11:45+03:00",
    lastClassEnd: "2026-10-11T22:00:00+03:00",
    nextClassStart: "2026-10-14T20:30:00+03:00",
    timeZone: "Asia/Jerusalem"
  };

  var params = new URLSearchParams(location.search);
  var nowParam = params.get("now");
  var now = new Date(nowParam && !isNaN(Date.parse(nowParam)) ? nowParam : DEMO.now).getTime();
  var nextStart = new Date(DEMO.nextClassStart).getTime();

  var pad = function (n) { return String(n).padStart(2, "0"); };

  function split(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return { d: d, h: h, m: m, s: s };
  }

  /* A day or more: days, hours, minutes — the word "day" keeps it from
     reading as a clock. The last 24 hours: hours, minutes and seconds. */
  function partsFor(ms) {
    var t = split(ms);
    if (t.d > 0) {
      return [
        { key: "d", value: String(t.d), suffix: t.d === 1 ? "day" : "days" },
        { key: "h", value: pad(t.h) },
        { key: "m", value: pad(t.m) }
      ];
    }
    return [
      { key: "h", value: pad(t.h) },
      { key: "m", value: pad(t.m) },
      { key: "s", value: pad(t.s) }
    ];
  }

  function spokenRemaining(ms) {
    var t = split(ms), parts = [];
    if (t.d) parts.push(t.d + (t.d === 1 ? " day" : " days"));
    parts.push(t.h + (t.h === 1 ? " hour" : " hours"));
    parts.push(t.m + (t.m === 1 ? " minute" : " minutes"));
    if (!t.d) parts.push(t.s + (t.s === 1 ? " second" : " seconds"));
    return parts.join(", ") + " until class";
  }

  function formatClassDate(ms) {
    var date = new Date(ms);
    var opts = { timeZone: DEMO.timeZone };
    var wd = date.toLocaleDateString("en-US", Object.assign({ weekday: "short" }, opts));
    var md = date.toLocaleDateString("en-US", Object.assign({ month: "short", day: "numeric" }, opts));
    var hm = date.toLocaleTimeString("en-GB", Object.assign({ hour: "2-digit", minute: "2-digit" }, opts));
    return wd + ", " + md + " · " + hm;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var openedAt = Date.now();

  function remainingNow() {
    return Math.max(0, nextStart - now - (Date.now() - openedAt));
  }

  function digit(text) {
    var el = document.createElement("span");
    el.className = "ticker__num";
    el.textContent = text;
    return el;
  }

  var timer = document.querySelector("[data-countdown]");
  var row = timer && timer.querySelector("[data-countdown-row]");
  var shape = "";

  function build(parts) {
    var frag = document.createDocumentFragment();
    parts.forEach(function (part, index) {
      if (index > 0 && !parts[index - 1].suffix) {
        var sep = document.createElement("span");
        sep.className = "ticker__sep";
        sep.textContent = ":";
        frag.appendChild(sep);
      }
      var unit = document.createElement("span");
      unit.className = "ticker__unit " + (part.key === "d" ? "ticker__unit--day" : "ticker__unit--clock");
      unit.dataset.unit = part.key;
      unit.dataset.value = part.value;
      var strip = document.createElement("span");
      strip.className = "ticker__strip";
      strip.appendChild(digit(part.value));
      unit.appendChild(strip);
      frag.appendChild(unit);
      if (part.suffix) {
        var suffix = document.createElement("span");
        suffix.className = "ticker__suffix";
        suffix.dataset.suffix = "";
        suffix.textContent = part.suffix;
        frag.appendChild(suffix);
      }
    });
    row.replaceChildren(frag);
  }

  function roll(unit, value) {
    if (!unit || unit.dataset.value === value) return;
    var strip = unit.querySelector(".ticker__strip");
    if (reduceMotion || !unit.dataset.value) {
      unit.dataset.value = value;
      strip.replaceChildren(digit(value));
      return;
    }
    var previous = unit.dataset.value;
    unit.dataset.value = value;
    var token = {};
    unit._token = token;
    var outgoing = digit(previous);
    outgoing.classList.add("is-out");
    strip.replaceChildren(outgoing, digit(value));
    strip.classList.remove("is-rolling");
    strip.style.transform = "translateY(0)";
    void strip.offsetWidth;
    strip.classList.add("is-rolling");
    strip.style.transform = "translateY(-50%)";

    function settle(event) {
      if (unit._token !== token) return;
      if (event && event.propertyName && event.propertyName !== "transform") return;
      unit._token = null;
      strip.removeEventListener("transitionend", settle);
      strip.classList.remove("is-rolling");
      strip.style.transform = "translateY(0)";
      strip.replaceChildren(digit(value));
    }
    strip.addEventListener("transitionend", settle);
    window.setTimeout(function () { settle(); }, 750);
  }

  function paint(ms) {
    var parts = partsFor(ms);
    var nextShape = parts.map(function (part) { return part.key; }).join(":");
    if (nextShape !== shape) {
      shape = nextShape;
      build(parts);
    } else {
      parts.forEach(function (part) {
        roll(row.querySelector('[data-unit="' + part.key + '"]'), part.value);
        if (part.suffix) {
          var suffix = row.querySelector("[data-suffix]");
          if (suffix) suffix.textContent = part.suffix;
        }
      });
    }
    timer.setAttribute("aria-label", spokenRemaining(ms));
  }

  function tick() {
    var left = remainingNow();
    paint(left);
    if (left > 0) window.setTimeout(tick, 1000 - ((Date.now() - openedAt) % 1000));
  }

  if (timer && row) tick();

  var when = document.querySelector("[data-next-class]");
  if (when) when.textContent = formatClassDate(nextStart);

  var agenda = document.querySelector(".agenda");
  var agendaWrap = document.querySelector(".agenda-wrap");
  if (agenda && agendaWrap) {
    var syncAgenda = function () {
      var overflow = agenda.scrollHeight - agenda.clientHeight > 2;
      var atEnd = !overflow || agenda.scrollTop + agenda.clientHeight >= agenda.scrollHeight - 2;
      agendaWrap.classList.toggle("is-overflowing", overflow);
      agendaWrap.classList.toggle("is-at-end", atEnd);
    };
    agenda.addEventListener("scroll", syncAgenda, { passive: true });
    window.addEventListener("resize", syncAgenda);
    syncAgenda();
  }
})();
