// ════════ BOOKING FLOW ════════

const Booking = {
  state: {
    service: null,
    stylist: null,
    date: null,
    time: null,
    note: '',
    currentStep: 1,
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
  },

  init() {
    // Preselect service from query string
    const params = new URLSearchParams(location.search);
    const pre = params.get('service');

    this.renderServices(pre);
    this.bindNav();
    this.bindConfirm();
  },

  renderServices(preselect) {
    const grid = document.getElementById('step1-services');
    grid.innerHTML = SERVICES.map(s => `
      <div class="stylist-card svc-pick" data-id="${s.id}">
        <div class="stylist-avatar" style="background:linear-gradient(135deg,#5a3012,#1e0c04);color:var(--gold)">${App.cap(s.id.charAt(0))}</div>
        <h3>${s['name'+App.cap(App.lang)].toUpperCase()}</h3>
        <div class="role">${App.t('common.from')} ${s.price} $ · ${s.duration}h</div>
        <div class="specialty">${s['desc'+App.cap(App.lang)]}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.svc-pick').forEach(el => {
      el.addEventListener('click', () => {
        grid.querySelectorAll('.svc-pick').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        this.state.service = SERVICES.find(s => s.id === el.dataset.id);
        const btn = document.getElementById('btn-next-1');
        btn.disabled = false;
        btn.style.opacity = ''; btn.style.pointerEvents = '';
      });
    });

    if (preselect) {
      const el = grid.querySelector(`[data-id="${preselect}"]`);
      if (el) el.click();
    }
  },

  renderStylists() {
    const grid = document.getElementById('step2-stylists');
    const svcId = this.state.service.id;
    const eligible = STYLISTS.filter(st => st.services.includes(svcId));

    grid.innerHTML = eligible.map(st => `
      <div class="stylist-card st-pick" data-id="${st.id}">
        <div class="stylist-avatar">${st.initials}</div>
        <h3>${st['name'+App.cap(App.lang)].toUpperCase()}</h3>
        <div class="role">${st['role'+App.cap(App.lang)]}</div>
        <div class="specialty">${st['specialty'+App.cap(App.lang)]}</div>
        <div class="rating">★★★★★ ${st.rating.toFixed(1)}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.st-pick').forEach(el => {
      el.addEventListener('click', () => {
        grid.querySelectorAll('.st-pick').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        this.state.stylist = STYLISTS.find(s => s.id === el.dataset.id);
        const btn = document.getElementById('btn-next-2');
        btn.disabled = false;
        btn.style.opacity = ''; btn.style.pointerEvents = '';
        // Reset date/time on stylist change
        this.state.date = null; this.state.time = null;
      });
    });
  },

  renderCalendar() {
    const cal = document.getElementById('calendar');
    const m = this.state.calMonth, y = this.state.calYear;
    const monthName = App.t('month.' + m);
    const first = new Date(y, m, 1);
    const dim = new Date(y, m+1, 0).getDate();
    const firstDow = (first.getDay() + 6) % 7; // Monday = 0
    const today = new Date(); today.setHours(0,0,0,0);
    const todayMs = today.getTime();

    const dowKeys = ['mon','tue','wed','thu','fri','sat','sun'];
    let html = `
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev">‹</button>
        <h3>${monthName.toUpperCase()} ${y}</h3>
        <button class="cal-nav" id="cal-next">›</button>
      </div>
      <div class="cal-grid">
        ${dowKeys.map(d => `<div class="cal-dow">${App.t('day.'+d)}</div>`).join('')}
        ${Array(firstDow).fill('<div class="cal-day empty"></div>').join('')}`;

    for (let d=1; d<=dim; d++) {
      const date = new Date(y, m, d);
      const dateMs = date.getTime();
      const dowKey = dowKeys[(date.getDay()+6)%7];
      const stylistWorks = this.state.stylist.schedule[dowKey] === 1;
      const isPast = dateMs < todayMs;
      const isToday = dateMs === todayMs;
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isSelected = this.state.date === dateStr;
      const disabled = isPast || !stylistWorks;

      html += `<div class="cal-day ${disabled?'disabled':''} ${isToday?'today':''} ${isSelected?'selected':''}"
                    ${disabled?'':`data-date="${dateStr}"`}>${d}</div>`;
    }
    html += '</div>';
    cal.innerHTML = html;

    document.getElementById('cal-prev').onclick = () => {
      if (this.state.calMonth === 0) { this.state.calMonth = 11; this.state.calYear--; }
      else this.state.calMonth--;
      // Don't go past current month
      const now = new Date();
      if (this.state.calYear < now.getFullYear() ||
          (this.state.calYear === now.getFullYear() && this.state.calMonth < now.getMonth())) {
        this.state.calMonth = now.getMonth();
        this.state.calYear = now.getFullYear();
      }
      this.renderCalendar();
    };
    document.getElementById('cal-next').onclick = () => {
      if (this.state.calMonth === 11) { this.state.calMonth = 0; this.state.calYear++; }
      else this.state.calMonth++;
      this.renderCalendar();
    };

    cal.querySelectorAll('.cal-day[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        this.state.date = el.dataset.date;
        this.state.time = null;
        this.renderCalendar();
        this.renderSlots();
      });
    });

    // Reset slots if no date
    if (!this.state.date) {
      document.getElementById('slots-container').innerHTML =
        `<p class="empty">${App.t('booking.selectDate')}</p>`;
      document.getElementById('slots-title').textContent = '';
    }
  },

  renderSlots() {
    if (!this.state.date) return;
    const cont = document.getElementById('slots-container');
    const title = document.getElementById('slots-title');

    const [yy, mm, dd] = this.state.date.split('-').map(Number);
    const date = new Date(yy, mm-1, dd);
    const monthName = App.t('month.' + (mm-1));
    title.textContent = `${dd} ${monthName} ${yy}`.toUpperCase();

    const available = TIME_SLOTS.map(t => ({
      time: t,
      taken: App.isSlotTaken(this.state.stylist.id, this.state.date, t)
    }));

    cont.innerHTML = `
      <div class="slots-grid">
        ${available.map(s => `
          <div class="slot ${s.taken?'disabled':''} ${this.state.time===s.time?'selected':''}"
               ${s.taken?'':`data-time="${s.time}"`}>${s.time}</div>
        `).join('')}
      </div>`;

    cont.querySelectorAll('.slot[data-time]').forEach(el => {
      el.addEventListener('click', () => {
        cont.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        this.state.time = el.dataset.time;
        const btn = document.getElementById('btn-next-3');
        btn.disabled = false;
        btn.style.opacity = ''; btn.style.pointerEvents = '';
      });
    });
  },

  renderSummary() {
    const s = this.state.service;
    const st = this.state.stylist;
    const [yy, mm, dd] = this.state.date.split('-').map(Number);
    const dateDisplay = `${dd} ${App.t('month.'+(mm-1))} ${yy}`;
    const deposit = 50;

    document.getElementById('summary').innerHTML = `
      <div class="summary-row">
        <span class="k">${App.t('booking.service')}</span>
        <span class="v">${s['name'+App.cap(App.lang)]}</span>
      </div>
      <div class="summary-row">
        <span class="k">${App.t('booking.stylist')}</span>
        <span class="v">${st['name'+App.cap(App.lang)]}</span>
      </div>
      <div class="summary-row">
        <span class="k">${App.t('booking.date')}</span>
        <span class="v">${dateDisplay}</span>
      </div>
      <div class="summary-row">
        <span class="k">${App.t('booking.time')}</span>
        <span class="v">${this.state.time}</span>
      </div>
      <div class="summary-row">
        <span class="k">${App.t('booking.duration')}</span>
        <span class="v">${s.duration}h</span>
      </div>
      <div class="summary-row">
        <span class="k">${App.t('booking.price')}</span>
        <span class="v">${App.t('common.from')} ${s.price} $</span>
      </div>
      <div class="summary-total">
        <span class="k">${App.t('booking.deposit')}</span>
        <span class="v">${deposit} $</span>
      </div>
    `;

    const authNeeded = document.getElementById('auth-needed');
    const confirmBtn = document.getElementById('btn-confirm');
    if (!App.currentUser) {
      authNeeded.classList.remove('hidden');
      confirmBtn.disabled = true; confirmBtn.style.opacity = '.4';
      confirmBtn.style.pointerEvents = 'none';
    } else {
      authNeeded.classList.add('hidden');
      confirmBtn.disabled = false; confirmBtn.style.opacity = '';
      confirmBtn.style.pointerEvents = '';
    }
  },

  goToStep(n) {
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-content="${n}"]`).classList.add('active');
    document.querySelectorAll('.step').forEach(el => {
      el.classList.remove('active','done');
      const stepNum = parseInt(el.dataset.step);
      if (stepNum < n) el.classList.add('done');
      if (stepNum === n) el.classList.add('active');
    });
    this.state.currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (n === 2) this.renderStylists();
    if (n === 3) { this.renderCalendar(); this.renderSlots(); }
    if (n === 4) this.renderSummary();
  },

  bindNav() {
    document.getElementById('btn-next-1').onclick = () => this.goToStep(2);
    document.getElementById('btn-next-2').onclick = () => this.goToStep(3);
    document.getElementById('btn-next-3').onclick = () => this.goToStep(4);
    document.querySelectorAll('[data-prev]').forEach(b => {
      b.onclick = () => this.goToStep(parseInt(b.dataset.prev) - 1);
    });
  },

  bindConfirm() {
    document.getElementById('btn-confirm').onclick = () => {
      const cu = App.currentUser;
      if (!cu) { App.toast(App.t('booking.notLogged'),'error'); return; }

      const note = document.getElementById('booking-note').value;
      const booking = App.createBooking({
        userId: cu.id,
        serviceId: this.state.service.id,
        stylistId: this.state.stylist.id,
        date: this.state.date,
        time: this.state.time,
        price: this.state.service.price,
        duration: this.state.service.duration,
        note,
      });

      document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
      document.querySelector('[data-content="5"]').classList.add('active');
      document.querySelector('.steps-nav').style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      App.toast(App.t('booking.success'),'success');
    };
  }
};

function onLangChange() {
  Booking.renderServices();
  if (Booking.state.currentStep >= 2 && Booking.state.stylist) Booking.renderStylists();
  if (Booking.state.currentStep >= 3 && Booking.state.stylist) Booking.renderCalendar();
  if (Booking.state.currentStep === 3 && Booking.state.date) Booking.renderSlots();
  if (Booking.state.currentStep === 4) Booking.renderSummary();
}

document.addEventListener('DOMContentLoaded', () => Booking.init());
