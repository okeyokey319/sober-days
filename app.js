(function () {
  'use strict';

  const STORAGE_KEY = 'sober-days:v1';
  // Milestones come in two kinds: calendar ones (shown as months/years, landing on the exact
  // anniversary date) and memorable day counts.
  const MONTH_MILESTONES = [1, 3, 6, 9, 12, 18, 24, 30, 36, 42, 48, 54, 60]; // then every year
  const DAY_MILESTONES = [1, 3, 7, 14, 21, 50, 100, 111, 200, 222, 300, 333, 444, 500, 555, 666, 777, 888, 999,
    1000, 1111, 1500, 2000, 2222, 2500, 3000, 3333, 4000, 4444, 5000, 5555, 6666, 7777, 8888, 10000];
  // Fixed reference day for picking the daily item, so everyone's "today" maps to the same entry.
  const CONTENT_EPOCH = new Date(2026, 0, 1);
  const TYPE_LABELS = {
    quote: 'Quote for today',
    question: 'Question for today',
    practice: 'Practice for today',
    thought: 'Thought for today',
  };

  // ---------- Storage ----------

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Storage unavailable (private mode etc.) — the app still works for this visit.
    }
  }

  // ---------- Date math (local calendar days) ----------

  function parseISODate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function toISODate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function daysBetween(a, b) {
    const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((ub - ua) / 86400000);
  }

  function addDays(date, n) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  // Adds whole months, clamping to the month's last day (31 Jan + 1 month = 28/29 Feb).
  function addMonths(date, n) {
    const total = date.getMonth() + n;
    const year = date.getFullYear() + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    return new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)));
  }

  function yearsMonthsDays(start, end) {
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (addMonths(start, months) > end) months--;
    return {
      years: Math.floor(months / 12),
      months: months % 12,
      days: daysBetween(addMonths(start, months), end),
    };
  }

  // ---------- Formatting ----------

  const fmtNum = (n) => n.toLocaleString('en-US');
  const plural = (n, word) => (n === 1 ? word : word + 's');

  function formatDate(date, withWeekday) {
    const opts = { day: 'numeric', month: 'long', year: 'numeric' };
    if (withWeekday) opts.weekday = 'long';
    return date.toLocaleDateString('en-GB', opts);
  }

  const shortDate = (date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Returns the pieces of the big counter for the chosen format.
  function counterParts(start, today, format) {
    const days = daysBetween(start, today);
    switch (format) {
      case 'ymd': {
        const { years, months, days: d } = yearsMonthsDays(start, today);
        const parts = [];
        if (years) parts.push([years, plural(years, 'year')]);
        if (years || months) parts.push([months, plural(months, 'month')]);
        parts.push([d, plural(d, 'day')]);
        return { parts, compact: parts.length > 1 };
      }
      default:
        return { parts: [[days, plural(days, 'day')]], compact: false };
    }
  }

  function monthsLabel(months) {
    if (months < 12) return `${months} ${plural(months, 'month')}`;
    const years = months / 12; // 18 months -> 1.5 years
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  // All milestones for a given start date, as { days, label }, sorted by day count.
  function milestonesFor(start) {
    const list = DAY_MILESTONES.map((d) => ({ days: d, label: `${fmtNum(d)} ${plural(d, 'day')}` }));
    const months = MONTH_MILESTONES.slice();
    for (let m = 72; m <= 1200; m += 12) months.push(m);
    months.forEach((m) => list.push({ days: daysBetween(start, addMonths(start, m)), label: monthsLabel(m) }));
    return list.sort((a, b) => a.days - b.days);
  }

  function milestoneInfo(start, days) {
    const list = milestonesFor(start);
    const next = list.find((m) => m.days > days);
    const prev = list.filter((m) => m.days <= days).pop() || { days: 0 };
    const reachedToday = list.find((m) => m.days === days);
    return { prev, next, reachedToday };
  }

  function dailyItem(date) {
    const n = CONTENT.length;
    const i = ((daysBetween(CONTENT_EPOCH, date) % n) + n) % n;
    return CONTENT[i];
  }

  // ---------- UI ----------

  const $ = (id) => document.getElementById(id);
  let state = loadState();

  function showSetup() {
    $('setup').hidden = false;
    $('home').hidden = true;
    $('footer').hidden = true;
    const input = $('start-input');
    input.max = toISODate(startOfToday());
    input.value = state.startDate || '';
    $('cancel-setup').hidden = !state.startDate;
  }

  function render() {
    if (!state.startDate) {
      showSetup();
      return;
    }
    $('setup').hidden = true;
    $('home').hidden = false;
    $('footer').hidden = false;

    const start = parseISODate(state.startDate);
    const today = startOfToday();
    const days = daysBetween(start, today);
    const format = state.format === 'ymd' ? 'ymd' : 'days';

    $('today-label').textContent = formatDate(today, true);

    document.querySelectorAll('.formats button').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.format === format));
    });

    // Counter
    const { parts, compact } = counterParts(start, today, format);    const value = $('counter-value');
    value.classList.toggle('compact', compact);
    value.replaceChildren(...parts.map(([num, unit]) => {
      const part = document.createElement('span');
      part.className = 'part';
      const n = document.createElement('span');
      n.className = 'num';
      n.textContent = fmtNum(num);
      const u = document.createElement('span');
      u.className = 'unit';
      u.textContent = unit;
      part.append(n, u);
      return part;
    }));
    $('sober-since').textContent = `Sober since ${shortDate(start)}`;

    // Milestone
    const { prev, next, reachedToday } = milestoneInfo(start, days);
    $('milestone-today').hidden = !reachedToday;
    $('milestone-today').textContent = reachedToday ? `Today you reach ${reachedToday.label}.` : '';
    $('milestone-prev').textContent = prev.label || 'Start';
    $('milestone-prev-date').textContent = shortDate(addDays(start, prev.days));
    $('milestone-next').textContent = `Next: ${next.label}`;
    const left = next.days - days;
    $('milestone-next-date').textContent = `in ${fmtNum(left)} ${plural(left, 'day')} · ${shortDate(addDays(start, next.days))}`;
    $('milestone-bar').style.width = `${Math.round(((days - prev.days) / (next.days - prev.days)) * 100)}%`;

    // Daily item
    const item = dailyItem(today);
    $('daily-type').textContent = TYPE_LABELS[item.type] || 'For today';
    $('daily-text').textContent = item.text;
    $('daily-source').textContent = item.source ? `— ${item.source}` : '';
    $('daily-source').hidden = !item.source;
  }

  $('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const value = $('start-input').value;
    if (!value || parseISODate(value) > startOfToday()) return;
    state.startDate = value;
    saveState(state);
    render();
  });

  // ---------- Hard moment: guided breathing ----------

  // Longer exhale than inhale helps the body settle. 5 rounds of 12 s = 1 minute.
  const BREATH_PHASES = [
    { label: 'Breathe in', secs: 4, scale: 1 },
    { label: 'Breathe out', secs: 8, scale: 0.5 },
  ];
  const BREATH_ROUNDS = 5;
  let breathTimer = null;

  function setCircle(scale, secs) {
    const circle = $('breath-circle');
    circle.style.transitionDuration = `${secs}s`;
    circle.style.transform = `scale(${scale})`;
  }

  function stopBreathing(label) {
    clearInterval(breathTimer);
    breathTimer = null;
    setCircle(0.5, 1);
    $('breath-label').textContent = label;
    $('breath-count').textContent = '';
    $('breath-progress').textContent = '';
    $('breath-toggle').textContent = label === 'Ready' ? 'Start breathing' : 'Once more';
  }

  function startBreathing() {
    let round = 1;
    let phase = 0;
    let left = BREATH_PHASES[0].secs;

    function enterPhase() {
      const p = BREATH_PHASES[phase];
      left = p.secs;
      setCircle(p.scale, p.secs);
      $('breath-label').textContent = p.label;
      $('breath-count').textContent = left;
      $('breath-progress').textContent = `${round} of ${BREATH_ROUNDS}`;
    }

    enterPhase();
    $('breath-toggle').textContent = 'Stop';
    breathTimer = setInterval(() => {
      left--;
      if (left > 0) {
        $('breath-count').textContent = left;
        return;
      }
      phase = (phase + 1) % BREATH_PHASES.length;
      if (phase === 0) round++;
      if (round > BREATH_ROUNDS) {
        stopBreathing('Well done');
        return;
      }
      enterPhase();
    }, 1000);
  }

  function openHard() {
    const days = daysBetween(parseISODate(state.startDate), startOfToday());
    $('hard-days').textContent = `You have ${fmtNum(days)} sober ${plural(days, 'day')} behind you. Today is just one more.`;
    stopBreathing('Ready');
    $('home').hidden = true;
    $('footer').hidden = true;
    $('hard').hidden = false;
    window.scrollTo(0, 0);
  }

  function closeHard() {
    stopBreathing('Ready');
    $('hard').hidden = true;
    render();
  }

  $('open-hard').addEventListener('click', openHard);
  $('close-hard').addEventListener('click', closeHard);
  $('breath-toggle').addEventListener('click', () => {
    if (breathTimer) stopBreathing('Ready');
    else startBreathing();
  });

  // ---------- Celebrate: hold, ripples, count-up, fireflies, a fact ----------

  const HOLD_MS = 1200;
  const COUNT_MS = 4000;
  const FIREFLIES = 16;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Chrome on Android only allows vibration after a finished tap, and a press that is
  // still being held doesn't count yet. If it's refused, play it when the finger lifts.
  let pendingVibe = null;
  let pendingUntil = 0;
  function tryVibrate(pattern) {
    if (!navigator.vibrate) return true;
    try { return navigator.vibrate(pattern); } catch (e) { return false; }
  }
  function vibrate(pattern, retryOnRelease) {
    if (!tryVibrate(pattern) && retryOnRelease) {
      pendingVibe = pattern;
      pendingUntil = Date.now() + 3000; // a buzz later than that would feel random
    }
  }
  // After a long press Chrome may send pointercancel instead of pointerup, so also try
  // touchend and click, whichever arrives with permission first.
  ['pointerup', 'touchend', 'click'].forEach((type) => document.addEventListener(type, () => {
    if (!pendingVibe) return;
    if (Date.now() > pendingUntil || tryVibrate(pendingVibe)) pendingVibe = null;
  }, true));
  let holdTimer = null;
  let countFrame = null;
  let lastFact = -1;
  let celebrateRun = 0;

  function celebrateFacts(start, days) {
    if (days < 1) return ['Day one. The bravest one.'];
    const facts = [
      `${fmtNum(days)} ${plural(days, 'morning')} without a hangover.`,
      `${fmtNum(days)} ${plural(days, 'night')} of honest sleep.`,
      `Every evening since ${formatDate(start)} was yours.`,
      `About ${fmtNum(days * 16)} waking hours, fully present.`,
      `${fmtNum(days)} ${plural(days, 'day')}. Each one a choice, each one yours.`,
    ];
    const weeks = Math.floor(days / 7);
    if (weeks >= 2) facts.push(`That's ${fmtNum(weeks)} weeks of choosing yourself.`);
    return facts;
  }

  // A different fact from last time, so every celebration feels a little new.
  function pickFact(facts) {
    let i = Math.floor(Math.random() * facts.length);
    if (facts.length > 1 && i === lastFact) i = (i + 1) % facts.length;
    lastFact = i;
    return facts[i];
  }

  // Fireflies drift upwards with a little sway. A finger on the screen gently draws
  // nearby ones in, and touching releases a few new ones from that spot.
  const MAX_FIREFLIES = 48;
  const ATTRACT_RADIUS = 320;
  const rand = (min, max) => min + Math.random() * (max - min);
  let flies = [];
  let flyFrame = null;
  let flyTime = 0;
  let pointer = null;
  let lastSpawn = 0;

  function addFly(x, y, vx, vy, extra) {
    const el = document.createElement('span');
    const size = rand(3, 6);
    el.style.width = el.style.height = `${size}px`;
    $('fireflies').append(el);
    flies.push({ el, x, y, vx, vy, extra, age: 0, speed: rand(18, 38), phase: rand(0, Math.PI * 2) });
  }

  function stepFlies(now) {
    const dt = Math.min(0.05, (now - flyTime) / 1000);
    flyTime = now;
    const { width, height } = $('fireflies').getBoundingClientRect();
    flies = flies.filter((f) => {
      f.age += dt;
      f.vx += Math.sin(now / 1200 + f.phase) * 8 * dt; // sway
      let drawn = false;
      if (pointer) {
        const dx = pointer.x - f.x;
        const dy = pointer.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < ATTRACT_RADIUS) {
          drawn = true;
          const pull = 260 + (1 - d / ATTRACT_RADIUS) * 300;
          f.vx += (dx / d) * pull * dt;
          f.vy += (dy / d) * pull * dt;
        }
      }
      // Drawn fireflies get extra drag so they follow the finger without overshooting;
      // the rest ease back towards a slow upward drift.
      const drag = drawn ? 2.2 : 0.8;
      f.vx -= f.vx * drag * dt;
      f.vy += ((drawn ? 0 : -f.speed) - f.vy) * drag * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y < -20) {
        if (f.extra) { f.el.remove(); return false; }
        Object.assign(f, { x: rand(0, width), y: height + 20, vx: 0, vy: -f.speed, age: 0 });
      }
      const fadeIn = Math.min(1, Math.max(0, f.age / 1.2));
      const nearTop = Math.min(1, Math.max(0, f.y / (height * 0.15)));
      const flicker = 0.55 + 0.45 * Math.sin(now / 600 + f.phase);
      f.el.style.transform = `translate(${f.x}px, ${f.y}px)`;
      f.el.style.opacity = (0.85 * fadeIn * nearTop * flicker).toFixed(3);
      return true;
    });
    flyFrame = requestAnimationFrame(stepFlies);
  }

  function startFireflies() {
    if (reducedMotion) return;
    const { width, height } = $('fireflies').getBoundingClientRect();
    // Start them already on screen, in the lower half, fading in one after another.
    for (let i = 0; i < FIREFLIES; i++) {
      addFly(rand(0, width), rand(height * 0.45, height + 40), 0, -20, false);
      flies[flies.length - 1].age = -rand(0, 1.5);
    }
    flyTime = performance.now();
    flyFrame = requestAnimationFrame(stepFlies);
  }

  function stopFireflies() {
    cancelAnimationFrame(flyFrame);
    flyFrame = null;
    flies = [];
    pointer = null;
    $('fireflies').replaceChildren();
  }

  function releaseFlies(x, y, count) {
    for (let i = 0; i < count; i++) addFly(x, y, rand(-50, 50), rand(-70, -10), true);
    const extras = flies.filter((f) => f.extra);
    while (flies.length > MAX_FIREFLIES && extras.length) {
      const old = extras.shift();
      old.el.remove();
      flies.splice(flies.indexOf(old), 1);
    }
  }

  function onTouch(e) {
    if (!flyFrame || e.target.closest('button')) return;
    if (e.type === 'pointerdown') {
      pointer = { x: e.clientX, y: e.clientY };
      releaseFlies(pointer.x, pointer.y, 3);
      vibrate(25);
      lastSpawn = performance.now();
    } else if (pointer) {
      pointer = { x: e.clientX, y: e.clientY };
      if (performance.now() - lastSpawn > 300) {
        releaseFlies(pointer.x, pointer.y, 1);
        vibrate(8); // a faint tick for each new firefly
        lastSpawn = performance.now();
      }
    }
  }

  function countUp(target, done) {
    const num = $('celebrate-num');
    if (reducedMotion || target < 1) {
      num.textContent = fmtNum(target);
      done();
      return;
    }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 2); // gentle slow-down towards the end
      num.textContent = fmtNum(Math.round(target * eased));
      if (t < 1) countFrame = requestAnimationFrame(step);
      else done();
    };
    countFrame = requestAnimationFrame(step);
  }

  function openCelebrate() {
    const start = parseISODate(state.startDate);
    const days = daysBetween(start, startOfToday());
    vibrate([40, 70, 60], true);
    $('celebrate-unit').textContent = plural(days, 'day');
    $('celebrate-fact').classList.remove('shown');
    $('celebrate-fact').textContent = pickFact(celebrateFacts(start, days));
    $('celebrate-num').classList.remove('lit');
    // Fresh spans restart the ripple animation each time.
    $('ripples').replaceChildren(...[0, 1, 2].map(() => document.createElement('span')));
    $('celebrate').hidden = false;
    document.body.style.overflow = 'hidden';
    // One thing at a time: the count lands and lights up, then the words, then the fireflies.
    const run = ++celebrateRun;
    const later = (ms, fn) => setTimeout(() => { if (run === celebrateRun) fn(); }, ms);
    countUp(days, () => {
      $('celebrate-num').classList.add('lit');
      later(700, () => $('celebrate-fact').classList.add('shown'));
      later(900, startFireflies);
    });
  }

  function closeCelebrate() {
    celebrateRun++;
    cancelAnimationFrame(countFrame);
    stopFireflies();
    $('celebrate').hidden = true;
    document.body.style.overflow = '';
  }

  function startHold() {
    if (holdTimer) return;
    $('celebrate-btn').classList.add('holding');
    vibrate(20);
    holdTimer = setTimeout(() => {
      holdTimer = null;
      $('celebrate-btn').classList.remove('holding');
      openCelebrate();
    }, HOLD_MS);
  }

  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
    $('celebrate-btn').classList.remove('holding');
  }

  const celebrateBtn = $('celebrate-btn');
  celebrateBtn.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => celebrateBtn.addEventListener(type, cancelHold));
  celebrateBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  // Keyboard users can't hold, so Enter/Space opens it straight away.
  celebrateBtn.addEventListener('click', (e) => { if (e.detail === 0) openCelebrate(); });
  $('close-celebrate').addEventListener('click', closeCelebrate);
  ['pointerdown', 'pointermove'].forEach((type) => $('celebrate').addEventListener(type, onTouch));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => $('celebrate').addEventListener(type, () => { pointer = null; }));

  $('cancel-setup').addEventListener('click', render);
  $('change-date').addEventListener('click', showSetup);

  document.querySelectorAll('.formats button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.format = btn.dataset.format;
      saveState(state);
      render();
    });
  });

  // Keep the counter fresh across midnight and when returning to the app.
  setInterval(() => { if (!$('home').hidden) render(); }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !$('home').hidden) render();
  });

  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // Ask the browser not to clear our data when the phone is low on space.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
})();
