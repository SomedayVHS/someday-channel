/* SOMEDAY — effets VHS (remplace vhs-hero.js).
   Améliore le site ; sans ce fichier, tout reste identique à avant. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hero = d.querySelector('.hero.vhs-home');

  function $(s, c) { return (c || d).querySelector(s); }
  function mk(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tcode(frames) { // HH:MM:SS:FF à 25 images/s
    var f = Math.max(0, Math.floor(frames));
    return pad(Math.floor(f / 90000) % 100) + ':' + pad(Math.floor(f / 1500) % 60) + ':' + pad(Math.floor(f / 25) % 60) + ':' + pad(f % 25);
  }

  // sécurité : l'écran d'arrivée est purement CSS, on retire la classe une fois joué
  if (root.classList.contains('rw-in')) setTimeout(function () { root.classList.remove('rw-in'); }, 1500);

  /* ======================================================
     3. Barre de cassette dans l'en-tête + OSD au scroll
     ====================================================== */
  (function progress() {
    var header = $('.header');
    var bar = mk('div', 'tape-bar', '<i></i>');
    bar.setAttribute('aria-hidden', 'true');
    (header || d.body).appendChild(bar);
    if (!header) { bar.style.cssText = 'position:fixed;top:0;bottom:auto;z-index:250'; }

    var osd = null, hideT = null;
    if (!reduce) { osd = mk('div', 'tape-osd'); osd.setAttribute('aria-hidden', 'true'); d.body.appendChild(osd); }

    var ticking = false;
    function update() {
      ticking = false;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      var y = Math.min(Math.max(window.scrollY, 0), max);
      var p = y / max;
      bar.style.setProperty('--p', p.toFixed(4));
      bar.style.setProperty('--po', y > 4 ? 1 : 0);
      if (osd) {
        // compteur décoratif, comme celui d'un vrai magnétoscope : 1 s de « bande » = 6 px
        osd.textContent = '▶ PLAY  ' + tcode(y / 6 * 25).slice(0, 8);
        if (y > 40) { osd.classList.add('show'); clearTimeout(hideT); hideT = setTimeout(function () { osd.classList.remove('show'); }, 1600); }
        else osd.classList.remove('show');
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  })();

  if (reduce) return; // en dessous : uniquement des animations

  /* ======================================================
     2. Rembobinage entre les pages
     ====================================================== */
  (function rewind() {
    var ov = null, going = false, timer = null;
    function overlay() {
      if (ov) return ov;
      ov = mk('div', 'rw', '<span class="rwt">◀◀ REW</span><span class="rwc">00:12:00:00</span>');
      ov.setAttribute('aria-hidden', 'true');
      d.body.appendChild(ov);
      return ov;
    }
    function eligible(a, e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
      if (a.target && a.target !== '_self') return false;
      if (a.hasAttribute('download') || a.hasAttribute('data-no-rw')) return false;
      var u; try { u = new URL(a.href, location.href); } catch (_) { return false; }
      if (u.origin !== location.origin) return false;
      if (u.pathname === location.pathname && u.search === location.search) return false; // simple ancre
      return /(\/|\.html?)$/.test(u.pathname);
    }
    function go(href) {
      if (going) return;
      going = true;
      var o = overlay(), c = o.querySelector('.rwc'), t0 = performance.now();
      o.classList.add('on');
      try { sessionStorage.setItem('someday-rw', String(Date.now())); } catch (_) {}
      timer = setInterval(function () { // le compteur recule vite
        var k = Math.min(1, (performance.now() - t0) / 360);
        c.textContent = tcode((1 - k) * 12 * 60 * 25);
      }, 30);
      setTimeout(function () { location.href = href; }, 380);
      setTimeout(function () { clearInterval(timer); o.classList.remove('on'); going = false; }, 6000); // si la navigation n'aboutit pas
    }
    d.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (a && eligible(a, e)) { e.preventDefault(); go(a.href); }
    });
    // retour arrière (cache de navigation) : on ne laisse pas l'écran de rembobinage
    window.addEventListener('pageshow', function (e) {
      if (e.persisted && ov) { clearInterval(timer); ov.classList.remove('on'); going = false; }
    });
  })();

  /* ======================================================
     1. Hero de l'accueil
     ====================================================== */
  if (hero) (function homeHero() {
    var arrivedByRewind = root.classList.contains('rw-in');
    var first = true;
    try { first = !sessionStorage.getItem('someday-vhs-boot') && !arrivedByRewind; sessionStorage.setItem('someday-vhs-boot', '1'); } catch (e) {}

    var fx = mk('div', 'vhs-fx', '<i class="g"></i><i class="t"></i><i class="c"></i>' + (first ? '<i class="b"></i>' : ''));
    fx.setAttribute('aria-hidden', 'true');
    hero.insertBefore(fx, hero.firstChild);

    if (first) {
      hero.classList.add('vhs-boot');
      var boot = $('.b', fx);
      boot.addEventListener('animationend', function (ev) { if (ev.target === boot) boot.remove(); });
    }

    // compteur de bande à côté de « PLAY ▶ »
    var play = $('.play', hero), tc = null;
    if (play) {
      play.classList.add('has-tc');
      play.innerHTML = '<span class="pl">PLAY ▶</span><span class="tc" aria-hidden="true">00:00:00:00</span>';
      tc = $('.tc', play);
    }
    var visible = true, t0 = performance.now(), timer = null;
    function tick() { if (tc) tc.textContent = tcode((performance.now() - t0) / 40); }
    function start() { if (!timer && tc) timer = setInterval(tick, 40); }
    function stop() { clearInterval(timer); timer = null; }
    start();

    // ---- rotation des films (d'après « Nouvelles cassettes ») ----
    var slides = [].slice.call(d.querySelectorAll('#nouveau .tape')).map(function (a) {
      var img = $('.tape-img img', a), h4 = $('h4', a), num = $('.tape-num', a);
      return {
        img: img ? img.getAttribute('src') : null,
        href: a.getAttribute('href'),
        num: num ? num.textContent.trim() : '',
        title: h4 && h4.firstChild ? h4.firstChild.textContent.trim() : '',
        bad: false
      };
    }).filter(function (s) { return s.img && s.href; });

    var dotsBox = null, dots = [], btnPrev = null, btnNext = null;
    if (slides.length > 1) {
      dotsBox = mk('div', 'vhs-dots');
      dotsBox.setAttribute('aria-hidden', 'true');
      slides.forEach(function () { var i = d.createElement('i'); dotsBox.appendChild(i); dots.push(i); });
      var ctl = mk('div', 'vhs-ctl');
      btnPrev = mk('button', 'vhs-btn', '◀◀<span> REW</span>'); btnPrev.type = 'button'; btnPrev.setAttribute('aria-label', 'Film précédent');
      btnNext = mk('button', 'vhs-btn', '<span>FF </span>▶▶'); btnNext.type = 'button'; btnNext.setAttribute('aria-label', 'Film suivant');
      ctl.appendChild(btnPrev); ctl.appendChild(dotsBox); ctl.appendChild(btnNext);
      hero.appendChild(ctl);
    }
    var cur = -1; // l'image d'origine (alien-epave.jpg) compte comme slide courante si elle figure dans la liste
    slides.forEach(function (s, i) { if (s.img === 'alien-epave.jpg') cur = i; });
    function paintDots() { dots.forEach(function (el, i) { el.classList.toggle('on', i === cur); el.hidden = slides[i].bad; }); }
    paintDots();

    var now = $('.now', hero);
    function setLabel(s) {
      if (!now) return;
      now.setAttribute('href', s.href);
      var lab = $('.now-label', now), arrow = now.lastElementChild;
      if (lab) {
        // reconstruit : [NOUVEAU] texte →
        while (lab.nextSibling && lab.nextSibling !== arrow) now.removeChild(lab.nextSibling);
        now.insertBefore(d.createTextNode('\n          ' + s.num + ' — ' + s.title + ' '), arrow);
      }
      if (now.animate) now.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'ease-out' });
    }

    function load(s, cb) { // ne retient que les images en paysage
      var im = new Image();
      im.onload = function () { if (im.naturalWidth / im.naturalHeight >= 1.3) cb(true); else { s.bad = true; cb(false); } };
      im.onerror = function () { s.bad = true; cb(false); };
      im.src = s.img;
    }

    // point d'intérêt de chaque image (x,y en %) — sert au cadrage sur téléphone
    var FOCUS = { 'indy-idole.jpg': [46, 40], 'aliens-ripley.jpg': [50, 35], 'alien-epave.jpg': [48, 55],
                  'terminator-2-affiche.jpg': [84, 45], 'flic-beverly-hills-3-affiche.jpg': [18, 38] };
    // horodatage « caméscope » propre à chaque film (date de sortie en salle)
    var STAMP = { 'alien-epave.jpg': ['PM 10:24', 'OCT 27 1997'], 'indy-idole.jpg': ['PM 08:12', 'JUN 12 1981'],
                  'aliens-ripley.jpg': ['PM 09:47', 'JUL 18 1986'], 'terminator-2-affiche.jpg': ['PM 11:03', 'JUL 03 1991'],
                  'flic-beverly-hills-3-affiche.jpg': ['PM 07:35', 'MAY 25 1994'] };
    var stampEl = $('.timestamp', hero);
    function setStamp(img) {
      var st = STAMP[img]; if (!stampEl || !st) return;
      stampEl.innerHTML = st[0] + '<br>' + st[1];
    }
    var curImg = 'alien-epave.jpg', dims = {};
    function axis(f, box, img, scale) { // % de background-position qui place le point f au centre
      var over = img * scale - box; if (over <= 0) return 50;
      return Math.max(0, Math.min(100, (f / 100 * img * scale - box / 2) / over * 100));
    }
    function place() {
      var dm = dims[curImg], f = FOCUS[curImg]; if (!dm || !f) return;
      var w = hero.offsetWidth * 1.06, h = hero.offsetHeight * 1.06, sc = Math.max(w / dm[0], h / dm[1]);
      hero.style.setProperty('--hero-pos', axis(f[0], w, dm[0], sc).toFixed(1) + '% ' + axis(f[1], h, dm[1], sc).toFixed(1) + '%');
    }
    function measure(src, cb) {
      if (dims[src]) return cb();
      var im = new Image();
      im.onload = function () { dims[src] = [im.naturalWidth, im.naturalHeight]; cb(); };
      im.onerror = cb; im.src = src;
    }
    measure(curImg, place);
    window.addEventListener('resize', place, { passive: true });

    var busy = false, firstCut = true, rot = null;
    function go(dir, manual) {
      if (busy || slides.length < 2) return;
      if (!manual && (!visible || d.hidden)) return;
      var n = slides.length, tries = 0, i;
      if (!manual && firstCut) i = 0; // 1er passage auto : on va au plus récent
      else if (cur < 0) i = dir > 0 ? 0 : n - 1;
      else i = (cur + dir + n) % n;
      while (slides[i].bad && tries++ < n) i = (i + dir + n) % n;
      if (slides[i].bad || i === cur) return;
      busy = true;
      var target = i, s = slides[target];
      load(s, function (ok) {
        if (!ok) { busy = false; paintDots(); if (manual) go(dir, true); return; } // portrait : on le saute
        fx.classList.remove('cut'); void fx.offsetWidth; fx.classList.add('cut');
        setTimeout(function () {
          hero.style.setProperty('--hero-img', 'url("' + s.img + '")');
          curImg = s.img; measure(s.img, place); setStamp(s.img);
          cur = target; firstCut = false; setLabel(s); paintDots();
        }, 140);
        setTimeout(function () { busy = false; }, 600);
      });
    }
    function next() { go(1, false); }
    function restart() { clearInterval(rot); rot = setInterval(next, 8000); } // un clic repart pour 8 s
    var firstT = null;
    function manual(dir) { clearTimeout(firstT); go(dir, true); restart(); }
    if (btnPrev) {
      btnPrev.addEventListener('click', function () { manual(-1); });
      btnNext.addEventListener('click', function () { manual(1); });
      // balayage horizontal sur téléphone
      var tx = 0, ty = 0;
      hero.addEventListener('touchstart', function (e) { var t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
      hero.addEventListener('touchend', function (e) {
        var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) manual(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    restart();
    firstT = setTimeout(next, first ? 5500 : 4500); // premier changement rapide

    // pause hors écran / onglet masqué
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        hero.classList.toggle('vhs-off', !visible);
        if (visible && !d.hidden) start(); else stop();
      }, { threshold: 0 }).observe(hero);
    }
    d.addEventListener('visibilitychange', function () { if (d.hidden) stop(); else if (visible) start(); });

    /* ---- apparitions au scroll (accueil) ---- */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      var groups = new Map();
      d.querySelectorAll('.about-item, .section-head, .tape, .season, .panel, .upcoming, .who').forEach(function (el) {
        if (hero.contains(el)) return;
        var p = el.parentElement, i = groups.get(p) || 0; groups.set(p, i + 1);
        el.style.setProperty('--i', Math.min(i, 6));
        el.classList.add('rv');
        io.observe(el);
      });
    }
  })();
})();
