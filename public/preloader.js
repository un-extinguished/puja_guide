/* PujaHop Kolkata — intro preloader controller.
 *
 * A classic (non-module) script so it runs before the deferred app.js module,
 * and can therefore show and dismiss the overlay without a flash of the app.
 *
 * Responsibilities, and nothing else:
 *   - play the intro on every page load (no once-per-session gate, so a
 *     refresh always shows it);
 *   - let the Skip Intro button dismiss it immediately;
 *   - hand over when the app says its content is ready (the `pujahop:reveal`
 *     event app.js dispatches after boot) or after its ~5s cinematic beat,
 *     whichever comes first;
 *   - lock scroll while it is up, and remove itself completely when done so it
 *     can never cover the map, swallow a click or trap focus.
 *
 * It never touches the map or the app state, so if it fails the app is
 * unaffected — a CSS safety net clears the overlay after ~6.8s regardless.
 */
(function () {
  'use strict';

  /* Apply a saved theme before app.js runs. The inline head script normally
     does this first; repeating it here keeps a returning visitor on the right
     background even if that inline script is ever blocked. */
  try {
    if (localStorage.getItem('pujahop.theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) { /* private mode */ }

  var root = document.getElementById('ph-preloader');
  if (!root) return;

  var docEl = document.documentElement;

  var reduce = false;
  try {
    reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { reduce = false; }

  /* ------------------------------------------------------------- particles */
  var stage = root.querySelector('.ph-particles');
  if (stage && !reduce) {
    var count = window.innerWidth < 640 ? 10 : 18;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('span');
      p.className = 'ph-particle';
      p.style.left = (Math.random() * 100).toFixed(2) + '%';
      p.style.setProperty('--ph-size', (2 + Math.random() * 3).toFixed(1) + 'px');
      p.style.setProperty('--ph-dur', (4.6 + Math.random() * 3.4).toFixed(2) + 's');
      p.style.setProperty('--ph-delay', (Math.random() * 4.4).toFixed(2) + 's');
      p.style.setProperty('--ph-drift', (Math.random() * 44 - 22).toFixed(0) + 'px');
      stage.appendChild(p);
    }
  }

  /* ---------------------------------------------------------------- reveal */
  var done = false;
  var timers = [];
  function clearTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
  }
  function reveal(instant) {
    if (done) return;
    done = true;
    clearTimers();
    docEl.classList.remove('ph-lock');
    root.classList.add('is-done');
    root.setAttribute('aria-hidden', 'true');

    var finish = function () {
      if (root.parentNode) root.parentNode.removeChild(root);
    };
    if (instant || reduce) { finish(); return; }
    timers.push(setTimeout(finish, 950));
  }

  docEl.classList.add('ph-lock');

  var skip = document.getElementById('ph-skip');
  if (skip) {
    skip.addEventListener('click', function () { reveal(false); });
    try { skip.focus({ preventScroll: true }); } catch (e) { try { skip.focus(); } catch (e2) {} }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') { reveal(false); }
  });

  /* app.js dispatches this once its data is loaded and the first render is on
     screen. Reveal after the ~5s cinematic beat so every reload shows it, but
     never hold the app hostage if the event never arrives. */
  var started = Date.now();
  var minVisibleMs = reduce ? 0 : 5000;
  function handOver() {
    var wait = Math.max(0, minVisibleMs - (Date.now() - started));
    timers.push(setTimeout(function () { reveal(false); }, wait));
  }
  window.addEventListener('pujahop:reveal', handOver, { once: true });
  if (window.__pujahopReady) handOver();

  /* The animation's own end, and a hard cap in case the app is slow. */
  timers.push(setTimeout(function () { reveal(false); }, reduce ? 300 : 5400));
  timers.push(setTimeout(function () { reveal(false); }, reduce ? 800 : 5600));
})();
