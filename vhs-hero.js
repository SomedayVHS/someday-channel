/* SOMEDAY — hero VHS animée + apparitions au scroll.
   Améliore la page ; sans ce fichier, le site reste identique à avant. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var hero = document.querySelector('.hero');

  /* ---------- Hero ---------- */
  if (hero) {
    // La séquence d'insertion de cassette ne joue qu'à la 1re visite de la session
    var first = true;
    try {
      first = !sessionStorage.getItem('someday-vhs-boot');
      sessionStorage.setItem('someday-vhs-boot', '1');
    } catch (e) {}

    var fx = document.createElement('div');
    fx.className = 'vhs-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = '<i class="g"></i><i class="t"></i>' + (first ? '<i class="b"></i>' : '');
    hero.insertBefore(fx, hero.firstChild);

    if (first) {
      hero.classList.add('vhs-boot');
      var boot = fx.querySelector('.b');
      boot.addEventListener('animationend', function (ev) {
        if (ev.target === boot) boot.remove();
      });
    }

    // Compteur de bande « 00:00:00:00 » à côté de PLAY ▶
    var play = hero.querySelector('.play');
    var tc = null;
    if (play) {
      play.classList.add('has-tc');
      play.innerHTML = '<span class="pl">PLAY ▶</span><span class="tc" aria-hidden="true">00:00:00:00</span>';
      tc = play.querySelector('.tc');
    }
    var visible = true, t0 = performance.now(), timer = null;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      if (!tc) return;
      var f = Math.floor((performance.now() - t0) / 40); // 25 images/s
      tc.textContent = pad(Math.floor(f / 90000) % 100) + ':' + pad(Math.floor(f / 1500) % 60) + ':' + pad(Math.floor(f / 25) % 60) + ':' + pad(f % 25);
    }
    function start() { if (!timer && tc) timer = setInterval(tick, 40); }
    function stop() { clearInterval(timer); timer = null; }
    start();

    // Pause hors écran / onglet masqué
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        hero.classList.toggle('vhs-off', !visible);
        if (visible && !document.hidden) start(); else stop();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (visible) start();
    });
  }

  /* ---------- Apparitions au scroll ---------- */
  if ('IntersectionObserver' in window) {
    var sel = '.about-item, .section-head, .tape, .season, .panel, .upcoming, .who';
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    var groups = new Map();
    document.querySelectorAll(sel).forEach(function (el) {
      if (hero && hero.contains(el)) return;
      var p = el.parentElement;
      var i = groups.get(p) || 0; groups.set(p, i + 1);
      el.style.setProperty('--i', Math.min(i, 6)); // décalage entre voisins, plafonné
      el.classList.add('rv');
      io.observe(el);
    });
  }
})();
