/* =========================================================
   VR Developments - shared behaviour
   Plain JavaScript, no libraries, no external calls.
   Every feature is switched on by a data attribute, so this
   one file works on every page. Missing elements are skipped.

   Data attributes used:
   [data-reveal]            scroll-in animation (optional value: left | right)
   [data-count]             animated number (value = final number)
   [data-copy-target="id"]  copy button; copies the text of element with that id
   [data-checklist="name"]  tick-able checklist (saved in localStorage)
   [data-progress-for="name"] progress bar for that checklist
   [data-reset="name"]      clears that checklist
   [data-calc="weekly"|"monthly"] price calculator form
   tr[data-step="0"]        plan row (0 to 6), highlighted on the visitor day that matches
   [data-filter="cat"]      filter tab (idea list)
   [data-cat="cat"]         idea card belonging to a category
   [data-save="id"]         save-idea toggle button
   [data-saved-count]       text showing how many ideas are saved
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var canObserve = 'IntersectionObserver' in window;

  /* ---------- storage helpers (private mode safe) ---------- */
  function loadValue(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      var value = JSON.parse(raw);
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function saveValue(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage blocked: the feature still works for this visit */
    }
  }

  /* ---------- 1. Scroll reveal ---------- */
  function initReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (reduceMotion || !canObserve) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 2. Animated counters ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    if (reduceMotion) {
      el.textContent = String(target);
      return;
    }
    var start = null;
    var duration = 1100;
    el.textContent = '0';

    function step(now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;

    if (!canObserve) {
      for (var i = 0; i < els.length; i++) countUp(els[i]);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. Copy to clipboard ---------- */
  // Text of a box: each paragraph on its own line, so the copied message keeps its breaks.
  function readableText(el) {
    var paragraphs = el.querySelectorAll('p');
    if (!paragraphs.length) return el.textContent.trim();
    var parts = [];
    for (var i = 0; i < paragraphs.length; i++) {
      parts.push(paragraphs[i].textContent.trim());
    }
    return parts.join('\n\n');
  }

  function copyWithFallback(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '0';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(area);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return copyWithFallback(text);
      });
    }
    return copyWithFallback(text);
  }

  function initCopy() {
    var buttons = document.querySelectorAll('[data-copy-target]');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        var label = btn.textContent;
        var status = btn.parentNode.querySelector('.copy-status');
        var timer = null;

        function finish(ok) {
          btn.textContent = ok ? 'Copied' : 'Copy failed';
          btn.classList.toggle('copied', ok);
          if (status) {
            status.textContent = ok
              ? 'Copied to your clipboard.'
              : 'Select the text and copy it by hand.';
          }
          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            btn.textContent = label;
            btn.classList.remove('copied');
            if (status) status.textContent = '';
          }, 2200);
        }

        btn.addEventListener('click', function () {
          var source = document.getElementById(btn.getAttribute('data-copy-target'));
          if (!source) return;
          copyText(readableText(source)).then(function () {
            finish(true);
          }, function () {
            finish(false);
          });
        });
      })(buttons[i]);
    }
  }

  /* ---------- 4. Checklists with progress bars ---------- */
  function initChecklists() {
    var lists = document.querySelectorAll('[data-checklist]');
    for (var i = 0; i < lists.length; i++) {
      (function (list) {
        var name = list.getAttribute('data-checklist');
        var key = 'vrd:checklist:' + name;
        var boxes = list.querySelectorAll('input[type="checkbox"]');
        var bar = document.querySelector('[data-progress-for="' + name + '"]');
        var reset = document.querySelector('[data-reset="' + name + '"]');
        var saved = loadValue(key, []);

        function markRow(box) {
          var row = box.closest('li');
          if (row) row.classList.toggle('is-done', box.checked);
        }

        function persist() {
          var values = [];
          for (var j = 0; j < boxes.length; j++) {
            if (boxes[j].checked) values.push(boxes[j].value);
          }
          saveValue(key, values);
        }

        function showProgress() {
          if (!bar) return;
          var done = 0;
          for (var j = 0; j < boxes.length; j++) {
            if (boxes[j].checked) done++;
          }
          var total = boxes.length;
          var pct = total ? Math.round((done / total) * 100) : 0;
          var fill = bar.querySelector('.progress-bar');
          var track = bar.querySelector('.progress-track');
          var text = bar.querySelector('.progress-text');
          if (fill) fill.style.setProperty('--p', pct + '%');
          if (track) track.setAttribute('aria-valuenow', String(pct));
          if (text) {
            text.textContent = done === total && total > 0
              ? 'All ' + total + ' done. Well done!'
              : done + ' of ' + total + ' done (' + pct + '%)';
          }
        }

        for (var k = 0; k < boxes.length; k++) {
          boxes[k].checked = saved.indexOf(boxes[k].value) !== -1;
          markRow(boxes[k]);
        }
        showProgress();

        list.addEventListener('change', function (event) {
          var target = event.target;
          if (!target || target.type !== 'checkbox') return;
          markRow(target);
          persist();
          showProgress();
        });

        if (reset) {
          reset.addEventListener('click', function () {
            for (var m = 0; m < boxes.length; m++) {
              boxes[m].checked = false;
              markRow(boxes[m]);
            }
            saveValue(key, []);
            showProgress();
          });
        }
      })(lists[i]);
    }
  }

  /* ---------- 5. Price calculators ---------- */
  function formatRupees(amount) {
    var rounded = Math.round(amount);
    var text;
    try {
      text = rounded.toLocaleString('en-IN');
    } catch (e) {
      text = String(rounded);
    }
    return '₹' + text;
  }

  function initCalculators() {
    var forms = document.querySelectorAll('[data-calc]');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        var period = form.getAttribute('data-calc') === 'monthly' ? 'a month' : 'a week';
        var first = form.querySelector('[name="first"]');
        var second = form.querySelector('[name="second"]');
        var out = form.querySelector('[data-calc-out]');
        if (!first || !second || !out) return;

        function run() {
          var a = Math.max(0, parseFloat(first.value) || 0);
          var b = Math.max(0, parseFloat(second.value) || 0);
          out.textContent = formatRupees(a * b) + ' ' + period;
          out.classList.remove('is-bumped');
          void out.offsetWidth; // restart the small bump animation
          out.classList.add('is-bumped');
        }

        form.addEventListener('input', run);
        run();
      })(forms[i]);
    }
  }

  /* ---------- 6. Plan days: highlight the visitor's current day ---------- */
  function initToday() {
    var rows = document.querySelectorAll('tr[data-step]');
    if (!rows.length) return;
    var key = 'vrd-start:' + location.pathname;
    var dayMs = 86400000;
    var now = new Date();
    var todayNum = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / dayMs);
    var startNum = todayNum;
    try {
      var saved = parseInt(localStorage.getItem(key), 10);
      if (isNaN(saved)) localStorage.setItem(key, String(todayNum));
      else startNum = saved;
    } catch (e) {}
    var step = todayNum - startNum;
    if (step < 0) step = 0;

    for (var i = 0; i < rows.length; i++) {
      if (parseInt(rows[i].getAttribute('data-step'), 10) !== step) continue;
      rows[i].classList.add('is-today');
      var head = rows[i].querySelector('th') || rows[i].querySelector('td');
      if (head) {
        var badge = document.createElement('span');
        badge.className = 'today-badge';
        badge.textContent = 'You are here';
        head.appendChild(badge);
      }
    }
  }

  /* ---------- 7. Idea filter tabs ---------- */
  function initFilter() {
    var tabs = document.querySelectorAll('[data-filter]');
    if (!tabs.length) return;
    var items = document.querySelectorAll('[data-cat]');
    var count = document.querySelector('[data-filter-count]');

    function show(category) {
      var shown = 0;
      for (var i = 0; i < items.length; i++) {
        var match = category === 'all' || items[i].getAttribute('data-cat') === category;
        items[i].hidden = !match;
        if (match) shown++;
      }
      for (var j = 0; j < tabs.length; j++) {
        var selected = tabs[j].getAttribute('data-filter') === category;
        tabs[j].setAttribute('aria-selected', selected ? 'true' : 'false');
        tabs[j].setAttribute('tabindex', selected ? '0' : '-1');
      }
      if (count) {
        count.textContent = 'Showing ' + shown + ' of ' + items.length + ' ideas';
      }
    }

    for (var i = 0; i < tabs.length; i++) {
      (function (tab, index) {
        tab.addEventListener('click', function () {
          show(tab.getAttribute('data-filter'));
        });
        // Left and right arrow keys move between tabs, as in a standard tab list.
        tab.addEventListener('keydown', function (event) {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
          event.preventDefault();
          var next = event.key === 'ArrowRight'
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;
          tabs[next].focus();
          show(tabs[next].getAttribute('data-filter'));
        });
      })(tabs[i], i);
    }

    show('all');
  }

  /* ---------- 8. Save-idea toggles ---------- */
  function initSaveIdeas() {
    var buttons = document.querySelectorAll('[data-save]');
    if (!buttons.length) return;
    var key = 'vrd:saved:ep2';
    var saved = loadValue(key, []);
    var count = document.querySelector('[data-saved-count]');

    function render() {
      for (var i = 0; i < buttons.length; i++) {
        var on = saved.indexOf(buttons[i].getAttribute('data-save')) !== -1;
        buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        var label = buttons[i].querySelector('.save-label');
        if (label) label.textContent = on ? 'Saved' : 'Save idea';
      }
      if (count) count.textContent = 'Saved ideas: ' + saved.length;
    }

    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-save');
          var at = saved.indexOf(id);
          if (at === -1) saved.push(id); else saved.splice(at, 1);
          saveValue(key, saved);
          render();
          var card = btn.closest('.idea');
          if (card) {
            card.classList.remove('is-pop');
            void card.offsetWidth;
            card.classList.add('is-pop');
          }
        });
      })(buttons[i]);
    }

    render();
  }

  /* ---------- start ---------- */
  function start() {
    initReveal();
    initCounters();
    initCopy();
    initChecklists();
    initCalculators();
    initToday();
    initFilter();
    initSaveIdeas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
