// ════════ HALO BRAIDS — LUXURY INTERACTIONS v2 ════════
(function () {
  const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmall = () => window.innerWidth < 768;

  // ══════════════════════════════
  // A. CUSTOM CURSOR (class-based — native arrow preserved if JS fails)
  // ══════════════════════════════
  function initCursor() {
    if (isTouch() || isSmall()) return;

    // Only hide native cursor AFTER we successfully create the custom one
    const dot  = document.createElement('div'); dot.id  = 'lx-cursor';
    const ring = document.createElement('div'); ring.id = 'lx-ring';
    document.body.append(dot, ring);
    document.body.classList.add('has-cursor'); // triggers cursor:none in CSS

    let mx = -300, my = -300, rx = -300, ry = -300;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left  = mx + 'px';
      dot.style.top   = my + 'px';
    });

    (function animRing() {
      rx += (mx - rx) * 0.10;
      ry += (my - ry) * 0.10;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animRing);
    })();

    const hover = 'a,.btn,button,.svc-card,.stylist-card,.gallery-item,.cal-day[data-date],.slot[data-time],.gf-btn,.auth-tab,.stat-box';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hover)) { dot.classList.add('big'); ring.classList.add('hide'); }
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hover)) { dot.classList.remove('big'); ring.classList.remove('hide'); }
    });
    document.addEventListener('mousedown', () => dot.classList.add('sq'));
    document.addEventListener('mouseup',   () => dot.classList.remove('sq'));
  }

  // ══════════════════════════════
  // B. HERO SPARKLE PARTICLES (canvas)
  // ══════════════════════════════
  function initParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const cv = document.createElement('canvas');
    cv.id = 'star-canvas';
    Object.assign(cv.style, { position:'absolute', inset:'0', width:'100%', height:'100%', pointerEvents:'none', zIndex:'1' });
    hero.prepend(cv);
    const ctx = cv.getContext('2d');
    let W, H, pts = [];

    const resize = () => { W = cv.width = hero.offsetWidth; H = cv.height = hero.offsetHeight; };
    const make = () => { pts = Array.from({length:70}, () => ({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.8+.3, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3, o:Math.random()*.5+.15, p:Math.random()*Math.PI*2 })); };

    (function draw() {
      ctx.clearRect(0,0,W,H);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.p+=.018;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0;
        if(p.y<0)p.y=H; if(p.y>H)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(201,169,110,${p.o*(.55+.45*Math.sin(p.p))})`; ctx.fill();
      });
      requestAnimationFrame(draw);
    })();
    resize(); make();
    window.addEventListener('resize', () => { resize(); make(); });
  }

  // ══════════════════════════════
  // C. MOUSE SPARKLE TRAIL
  // ══════════════════════════════
  function initTrail() {
    if (isTouch() || isSmall()) return;
    let last = 0;
    document.addEventListener('mousemove', e => {
      const now = Date.now();
      if (now - last < 45) return; // throttle
      last = now;
      const sp = document.createElement('div');
      sp.className = 'lx-spark';
      sp.style.left = e.clientX + 'px';
      sp.style.top  = e.clientY + 'px';
      sp.style.setProperty('--sz', Math.random()*.18+.05 + 'rem');
      document.body.appendChild(sp);
      setTimeout(() => sp.remove(), 700);
    });
  }

  // ══════════════════════════════
  // D. SCROLL PROGRESS BAR
  // ══════════════════════════════
  function initScrollBar() {
    const bar = document.createElement('div'); bar.id = 'lx-bar';
    document.body.prepend(bar);
    const upd = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? window.scrollY/h*100 : 0) + '%';
    };
    window.addEventListener('scroll', upd, { passive:true }); upd();
  }

  // ══════════════════════════════
  // E. ANIMATED COUNTERS
  // ══════════════════════════════
  function initCounters() {
    const els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const dur = 1900, t0 = performance.now();
        (function tick(now) {
          const p = Math.min((now-t0)/dur, 1);
          const ease = 1 - Math.pow(1-p, 3);
          el.textContent = (target<10 ? (target*ease).toFixed(1) : Math.round(target*ease)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
        io.unobserve(el);
      });
    }, { threshold:.4 });
    els.forEach(el => io.observe(el));
  }

  // ══════════════════════════════
  // F. 3D TILT CARDS
  // ══════════════════════════════
  function initTilt() {
    if (isTouch() || isSmall()) return;
    const sel = '.svc-card,.stylist-card,.review-card';
    document.addEventListener('mousemove', e => {
      document.querySelectorAll(sel).forEach(card => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width/2) / r.width;
        const dy = (e.clientY - r.top  - r.height/2) / r.height;
        if (Math.sqrt(dx*dx+dy*dy) < .65) {
          card.style.transform  = `perspective(900px) rotateY(${dx*7}deg) rotateX(${-dy*7}deg) translateZ(8px)`;
          card.style.transition = 'transform .06s';
        } else {
          card.style.transform  = '';
          card.style.transition = 'transform .5s';
        }
      });
    });
  }

  // ══════════════════════════════
  // G. TYPEWRITER HERO TITLE
  // ══════════════════════════════
  function initTypewriter() {
    const el = document.querySelector('.hero-title');
    if (!el) return;
    const txt = el.textContent.trim();
    el.textContent = '';
    el.style.borderRight = '2px solid var(--gold)';
    let i = 0;
    const delay = sessionStorage.getItem('hb_splash') ? 400 : 2400;
    setTimeout(() => {
      (function type() {
        if (i < txt.length) { el.textContent += txt[i++]; setTimeout(type, 75); }
        else { el.style.borderRight = 'none'; }
      })();
    }, delay);
  }

  // ══════════════════════════════
  // H. PARALLAX HERO BACKGROUND
  // ══════════════════════════════
  function initParallax() {
    if (isTouch() || isSmall()) return;
    const bg   = document.querySelector('.hero-bg');
    const grid = document.querySelector('.hero-grid');
    if (!bg) return;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (bg)   bg.style.transform   = `translateY(${y * .45}px)`;
      if (grid) grid.style.transform = `translateY(${y * .28}px)`;
    }, { passive:true });
  }

  // ══════════════════════════════
  // I. SCROLL-DOWN INDICATOR (hero)
  // ══════════════════════════════
  function initScrollHint() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const el = document.createElement('div');
    el.className = 'lx-scroll-hint';
    el.innerHTML = '<div class="lx-scroll-line"></div>';
    hero.appendChild(el);
    window.addEventListener('scroll', () => {
      el.style.opacity = window.scrollY > 80 ? '0' : '1';
    }, { passive:true });
  }

  // ══════════════════════════════
  // J. STICKY BOOKING BAR (home only)
  // ══════════════════════════════
  function initStickyBar() {
    if (document.body.dataset.page !== 'home') return;
    const bar = document.createElement('div');
    bar.id = 'lx-sticky';
    const isEn = document.documentElement.lang === 'en';
    bar.innerHTML = `
      <span class="sticky-logo">HALO BRAIDS</span>
      <span class="sticky-tag">${isEn ? 'Luxury Braiding · Ottawa' : 'Studio de Luxe · Ottawa'}</span>
      <a href="booking.html" class="btn btn-sm">${isEn ? 'BOOK NOW' : 'RÉSERVER'}</a>`;
    document.body.appendChild(bar);
    const hero = document.querySelector('.hero');
    window.addEventListener('scroll', () => {
      if (!hero) return;
      bar.classList.toggle('show', hero.getBoundingClientRect().bottom < 0);
    }, { passive:true });
  }

  // ══════════════════════════════
  // K. BACK TO TOP BUTTON
  // ══════════════════════════════
  function initBackTop() {
    const btn = document.createElement('button');
    btn.id = 'lx-top'; btn.innerHTML = '↑';
    btn.title = 'Haut de page';
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.scrollY > 500);
    }, { passive:true });
    btn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
  }

  // ══════════════════════════════
  // L. MARQUEE SOCIAL PROOF (home only)
  // ══════════════════════════════
  function initMarquee() {
    if (document.body.dataset.page !== 'home') return;
    const names = [
      'Sophia M. — Knotless Braids ✦','Jade L. — Boho Braids ✦','Amara T. — Goddess Locs ✦',
      'Nour B. — Passion Twists ✦','Celine O. — Fulani Braids ✦','Zara K. — Cornrows ✦',
      'Priya S. — Knotless Braids ✦','Léa M. — Boho Braids ✦','Imane D. — Fulani Braids ✦',
      'Yasmine R. — Goddess Locs ✦',
    ];
    const wrap = document.createElement('div'); wrap.className = 'marquee-wrap';
    const track = document.createElement('div'); track.className = 'marquee-track';
    track.innerHTML = [...names,...names].map(n => `<span class="marquee-item">${n}</span>`).join('');
    wrap.appendChild(track);
    const ft = document.getElementById('app-footer');
    if (ft) ft.before(wrap);
  }

  // ══════════════════════════════
  // M. MAGNETIC BUTTONS
  // ══════════════════════════════
  function initMagnetic() {
    if (isTouch() || isSmall()) return;
    document.querySelectorAll('.btn,.btn-dark,.btn-lg').forEach(btn => {
      if (btn._mag) return; btn._mag = true;
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width/2) * .2;
        const dy = (e.clientY - r.top  - r.height/2) * .2;
        btn.style.transform  = `translate(${dx}px,${dy}px)`;
        btn.style.transition = 'transform .12s';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform  = '';
        btn.style.transition = 'transform .5s';
      });
    });
  }

  // ══════════════════════════════
  // N. SPLASH SCREEN
  // ══════════════════════════════
  function initSplash() {
    if (sessionStorage.getItem('hb_splash')) return;
    sessionStorage.setItem('hb_splash', '1');
    const el = document.createElement('div'); el.id = 'lx-splash';
    el.innerHTML = `<div class="sp-inner"><div class="sp-h">H</div><div class="sp-brand">HALO BRAIDS</div><div class="sp-line"></div></div>`;
    document.body.prepend(el);
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      el.style.opacity = '0';
      document.body.style.overflow = '';
      setTimeout(() => el.remove(), 700);
    }, 2200);
  }

  // ══════════════════════════════
  // O. CONFETTI
  // ══════════════════════════════
  function launchConfetti() {
    const colors = ['#c9a96e','#0c0806','#faf5ee','#e8d5b0','#9c7a42','#ffffff'];
    for (let i=0; i<90; i++) {
      const p = document.createElement('div'); p.className = 'lx-confetti';
      const sz = Math.random()*9+4;
      Object.assign(p.style, {
        left: Math.random()*100+'vw', top:'-20px',
        width:sz+'px', height:(Math.random()>.5?sz:sz*.35)+'px',
        background:colors[Math.floor(Math.random()*colors.length)],
        borderRadius:Math.random()>.45?'50%':'1px',
        animationDelay:Math.random()*.9+'s', animationDuration:Math.random()*1.8+1.4+'s',
      });
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 3800);
    }
  }
  function watchConfetti() {
    const success = document.querySelector('[data-content="5"]');
    if (!success) return;
    let done = false;
    const io = new IntersectionObserver(en => {
      en.forEach(e => { if(e.isIntersecting && !done){ done=true; launchConfetti(); } });
    }, { threshold:.2 });
    io.observe(success);
  }

  // ══════════════════════════════
  // P. LIGHTBOX GALLERY
  // ══════════════════════════════
  function initLightbox() {
    const items = [...document.querySelectorAll('.gallery-item')];
    if (!items.length) return;
    const lb = document.createElement('div'); lb.id = 'lx-lb';
    lb.innerHTML = `<div class="lb-bg"></div><div class="lb-wrap"><button class="lb-close">✕</button><button class="lb-prev">‹</button><div class="lb-media"></div><button class="lb-next">›</button></div><div class="lb-cap"></div>`;
    document.body.appendChild(lb);
    let cur = 0;
    function show(i) {
      cur = (i+items.length) % items.length;
      const ph = items[cur].querySelector('.ph');
      const bg = ph ? getComputedStyle(ph).background : '#1a1108';
      lb.querySelector('.lb-media').innerHTML = `<div class="lb-ph-in" style="background:${bg}"></div>`;
      lb.querySelector('.lb-cap').textContent = items[cur].querySelector('.tag')?.textContent||'';
      lb.classList.add('on'); document.body.style.overflow='hidden';
    }
    function close() { lb.classList.remove('on'); document.body.style.overflow=''; }
    items.forEach((it,i) => { it.style.cursor='zoom-in'; it.addEventListener('click', ()=>show(i)); });
    lb.querySelector('.lb-bg').addEventListener('click', close);
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', e=>{ e.stopPropagation(); show(cur-1); });
    lb.querySelector('.lb-next').addEventListener('click', e=>{ e.stopPropagation(); show(cur+1); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('on')) return;
      if(e.key==='Escape') close();
      if(e.key==='ArrowLeft') show(cur-1);
      if(e.key==='ArrowRight') show(cur+1);
    });
  }

  // ══════════════════════════════
  // Q. GALLERY FILTERS
  // ══════════════════════════════
  function initGalleryFilters() {
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    const fr = document.documentElement.lang !== 'en';
    const cats = [
      {k:'ALL',    l:fr?'TOUS':'ALL'},
      {k:'KNOTLESS',l:'KNOTLESS'},{k:'BOHO',l:'BOHO'},
      {k:'FULANI',l:'FULANI'},{k:'PASSION',l:'PASSION'},
      {k:'GODDESS',l:'GODDESS'},{k:'CORNROWS',l:'CORNROWS'},
    ];
    const fw = document.createElement('div'); fw.className = 'gallery-filters';
    fw.innerHTML = cats.map((c,i)=>`<button class="gf-btn${i===0?' active':''}" data-cat="${c.k}">${c.l}</button>`).join('');
    grid.before(fw);
    fw.addEventListener('click', e => {
      const btn = e.target.closest('.gf-btn'); if(!btn) return;
      fw.querySelectorAll('.gf-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.gallery-item').forEach(it => {
        const tag = it.querySelector('.tag')?.textContent||'';
        const vis = cat==='ALL' || tag.includes(cat);
        it.style.opacity = vis?'1':'0.1';
        it.style.pointerEvents = vis?'':'none';
        it.style.transition = 'opacity .35s';
      });
    });
  }

  // ══════════════════════════════
  // R. STAGGER REVEAL (enhanced fade-up)
  // ══════════════════════════════
  function initStagger() {
    const grids = document.querySelectorAll('.grid-3,.grid-4,.gallery-grid,.dash-stats,.stats-band');
    grids.forEach(g => {
      [...g.children].forEach((el, i) => {
        el.style.transitionDelay = (i * 0.1) + 's';
      });
    });
  }

  // ══════════════════════════════
  // INIT
  // ══════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    initSplash();
    initScrollBar();
    initCursor();
    initTrail();
    initParticles();
    initParallax();
    initScrollHint();
    initTypewriter();
    initCounters();
    initTilt();
    initMarquee();
    initMagnetic();
    initStickyBar();
    initBackTop();
    watchConfetti();
    initLightbox();
    initGalleryFilters();
    initStagger();

    const mo = new MutationObserver(initMagnetic);
    mo.observe(document.body, { childList:true, subtree:true });
  });
})();
