// ════════ HALO BRAIDS — APP CORE ════════

const App = {
  // ── i18n ──
  lang: localStorage.getItem('hb_lang') || 'fr',
  t(key) { return (I18N[this.lang] && I18N[this.lang][key]) || key; },
  setLang(lang) {
    this.lang = lang;
    localStorage.setItem('hb_lang', lang);
    document.documentElement.lang = lang;
    this.applyTranslations();
    this.renderHeader();
    this.renderFooter();
    if (typeof onLangChange === 'function') onLangChange();
  },
  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      const v = this.t(k);
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = v;
      else el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = this.t(el.getAttribute('data-i18n-ph'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.getAttribute('data-i18n-title'));
    });
    // Update <html lang>
    document.title = this.t(document.title.includes('|') ?
      document.title.split('|')[0].trim() : document.title) || document.title;
  },

  // ── Auth ──
  get users() { return JSON.parse(localStorage.getItem('hb_users') || '[]'); },
  set users(v) { localStorage.setItem('hb_users', JSON.stringify(v)); },
  get currentUser() {
    const id = localStorage.getItem('hb_currentUser');
    if (!id) return null;
    return this.users.find(u => u.id === id) || null;
  },
  setCurrentUser(id) {
    if (id) localStorage.setItem('hb_currentUser', id);
    else localStorage.removeItem('hb_currentUser');
  },
  register({ firstname, lastname, email, phone, password }) {
    if (this.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok:false, error:'exists' };
    }
    const user = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      firstname, lastname, email, phone,
      password: this.hash(password),
      created: Date.now(),
    };
    const users = this.users; users.push(user); this.users = users;
    this.setCurrentUser(user.id);
    return { ok:true, user };
  },
  login(email, password) {
    const user = this.users.find(u =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === this.hash(password));
    if (!user) return { ok:false, error:'login' };
    this.setCurrentUser(user.id);
    return { ok:true, user };
  },
  logout() { this.setCurrentUser(null); window.location.href = 'index.html'; },
  updateProfile(updates) {
    const cu = this.currentUser; if (!cu) return false;
    const users = this.users;
    const i = users.findIndex(u => u.id === cu.id);
    users[i] = { ...users[i], ...updates };
    this.users = users;
    return true;
  },
  hash(s) { // tiny non-secure hash — for demo only
    let h = 0; for (let i=0; i<s.length; i++) {
      h = ((h<<5)-h) + s.charCodeAt(i); h |= 0;
    } return 'h_' + Math.abs(h).toString(36);
  },

  // ── Bookings ──
  get bookings() { return JSON.parse(localStorage.getItem('hb_bookings') || '[]'); },
  set bookings(v) { localStorage.setItem('hb_bookings', JSON.stringify(v)); },
  createBooking(data) {
    const b = {
      id: 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      ...data, created: Date.now(), status:'confirmed',
    };
    const bookings = this.bookings; bookings.push(b); this.bookings = bookings;
    return b;
  },
  userBookings(userId) {
    return this.bookings.filter(b => b.userId === userId)
      .sort((a,b) => new Date(b.date+'T'+b.time) - new Date(a.date+'T'+a.time));
  },
  isSlotTaken(stylistId, date, time) {
    return this.bookings.some(b => b.stylistId === stylistId &&
                                    b.date === date && b.time === time);
  },

  // ── UI HELPERS ──
  toast(msg, type='') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, 3000);
  },

  // ── NAV / FOOTER ──
  renderHeader() {
    const nav = document.getElementById('app-nav');
    if (!nav) return;
    const cu = this.currentUser;
    const page = document.body.dataset.page || '';
    const link = (href, key, page2) => `<a href="${href}" ${page===page2?'class="active"':''} data-i18n="${key}">${this.t(key)}</a>`;

    nav.innerHTML = `
      <a href="index.html" class="nav-logo">
        <small>✦ LUXURY BRAIDING ✦</small>
        HALOBRAIDS
      </a>
      <div class="nav-links" id="navLinks">
        ${link('index.html','nav.home','home')}
        ${link('services.html','nav.services','services')}
        ${link('gallery.html','nav.gallery','gallery')}
        ${link('booking.html','nav.booking','booking')}
        ${link('faq.html','nav.faq','faq')}
        ${link('contact.html','nav.contact','contact')}
      </div>
      <div class="nav-right">
        <div class="lang-toggle">
          <button id="lang-fr" class="${this.lang==='fr'?'active':''}">FR</button>
          <span>·</span>
          <button id="lang-en" class="${this.lang==='en'?'active':''}">EN</button>
        </div>
        ${cu
          ? `<a href="dashboard.html" class="user-chip">
               <span class="user-avatar">${cu.firstname.charAt(0).toUpperCase()}</span>
               ${cu.firstname}
             </a>`
          : `<a href="account.html" class="btn btn-outline btn-sm" data-i18n="nav.login">${this.t('nav.login')}</a>`
        }
        <a href="booking.html" class="btn btn-sm" data-i18n="nav.book">${this.t('nav.book')}</a>
        <button class="menu-toggle" id="menuToggle">☰</button>
      </div>`;

    document.getElementById('lang-fr').onclick = () => this.setLang('fr');
    document.getElementById('lang-en').onclick = () => this.setLang('en');
    const mt = document.getElementById('menuToggle');
    if (mt) mt.onclick = () => document.getElementById('navLinks').classList.toggle('open');
  },

  renderFooter() {
    const f = document.getElementById('app-footer');
    if (!f) return;
    f.innerHTML = `
      <div class="footer-top">
        <div class="footer-brand">
          <h4>HALOBRAIDS</h4>
          <div class="sub">Hair Braiding Salon</div>
          <p data-i18n="footer.tagline">${this.t('footer.tagline')}</p>
        </div>
        <div class="footer-col">
          <h5 data-i18n="footer.nav">${this.t('footer.nav')}</h5>
          <a href="index.html" data-i18n="nav.home">${this.t('nav.home')}</a>
          <a href="services.html" data-i18n="nav.services">${this.t('nav.services')}</a>
          <a href="gallery.html" data-i18n="nav.gallery">${this.t('nav.gallery')}</a>
          <a href="booking.html" data-i18n="nav.booking">${this.t('nav.booking')}</a>
          <a href="faq.html" data-i18n="nav.faq">${this.t('nav.faq')}</a>
          <a href="contact.html" data-i18n="nav.contact">${this.t('nav.contact')}</a>
        </div>
        <div class="footer-col">
          <h5 data-i18n="footer.services">${this.t('footer.services')}</h5>
          ${SERVICES.map(s => `<a href="services.html">${s['name'+this.cap(this.lang)]}</a>`).join('')}
        </div>
        <div class="footer-col">
          <h5 data-i18n="footer.contact">${this.t('footer.contact')}</h5>
          <p data-i18n-html data-i18n="footer.address">${this.t('footer.address')}</p>
          <p>hello@halobraids.ca</p>
          <p data-i18n="footer.hours">${this.t('footer.hours')}</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p data-i18n="footer.rights">${this.t('footer.rights')}</p>
        <div class="footer-socials">
          <a href="#">INSTAGRAM</a>
          <a href="#">TIKTOK</a>
          <a href="#">FACEBOOK</a>
        </div>
      </div>`;
  },

  cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); },

  // ── INIT ──
  init() {
    document.documentElement.lang = this.lang;
    this.renderHeader();
    this.renderFooter();
    this.applyTranslations();

    // Sticky nav scroll
    const navEl = document.getElementById('app-nav');
    if (navEl) {
      const isHome = document.body.dataset.page === 'home';
      if (!isHome) navEl.classList.add('solid');
      window.addEventListener('scroll', () => {
        navEl.classList.toggle('scrolled', window.scrollY > 60);
      }, { passive:true });
    }

    // Fade-up observer
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold:0.12, rootMargin:'0px 0px -40px 0px' });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
