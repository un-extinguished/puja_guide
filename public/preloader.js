/* PujaHop Kolkata — intro preloader controller.
 *
 * A classic (non-module) script so it runs before the deferred app.js module,
 * and can therefore show and dismiss the overlay without a flash of the app.
 *
 * Responsibilities, and nothing else:
 *   - play the intro once per browser session (sessionStorage);
 *   - let the Skip Intro button dismiss it immediately;
 *   - hand over when the app says its content is ready (the `pujahop:reveal`
 *     event app.js dispatches after boot), or after the animation's own timer,
 *     whichever comes first;
 *   - lock scroll while it is up, and remove itself completely when done so it
 *     can never cover the map, swallow a click or trap focus.
 *
 * It never touches the map or the app state, so if it fails the app is
 * unaffected — a CSS safety net clears the overlay after 3.5s regardless.
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
  var KEY = 'pujahop.introSeen';

  function seen() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* private mode */ }
  }

  var reduce = false;
  try {
    reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { reduce = false; }

  /* A visitor who has already seen it this session gets straight to the app. */
  if (seen()) {
    if (root.parentNode) root.parentNode.removeChild(root);
    return;
  }

  /* ------------------------------------------------------------- particles */
  var stage = root.querySelector('.ph-particles');
  if (stage && !reduce) {
    var count = window.innerWidth < 640 ? 10 : 18;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('span');
      p.className = 'ph-particle';
      p.style.left = (Math.random() * 100).toFixed(2) + '%';
      p.style.setProperty('--ph-size', (2 + Math.random() * 3).toFixed(1) + 'px');
      p.style.setProperty('--ph-dur', (3.6 + Math.random() * 3.2).toFixed(2) + 's');
      p.style.setProperty('--ph-delay', (Math.random() * 2.6).toFixed(2) + 's');
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
    markSeen();
    docEl.classList.remove('ph-lock');
    root.classList.add('is-done');
    root.setAttribute('aria-hidden', 'true');

    var finish = function () {
      if (root.parentNode) root.parentNode.removeChild(root);
    };
    if (instant || reduce) { finish(); return; }
    timers.push(setTimeout(finish, 700));
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
     screen. Reveal after a short minimum so the cinematic beat is seen, but
     never hold the app hostage if the event never arrives. */
  var started = Date.now();
  var minVisibleMs = reduce ? 0 : 2000;
  function handOver() {
    var wait = Math.max(0, minVisibleMs - (Date.now() - started));
    timers.push(setTimeout(function () { reveal(false); }, wait));
  }
  window.addEventListener('pujahop:reveal', handOver, { once: true });
  if (window.__pujahopReady) handOver();

  /* The animation's own end, and a hard cap in case the app is slow. */
  timers.push(setTimeout(function () { reveal(false); }, reduce ? 300 : 2600));
  timers.push(setTimeout(function () { reveal(false); }, reduce ? 800 : 3200));
})();
