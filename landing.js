/* Sisonke – landing + investor pages, illustrations, motion helpers.
   Loaded after app.js (uses its helpers: $, logo, ico, rand, db). */
'use strict';

/* ---- Edit these. Anything left null is hidden from the investor page, never faked. ---- */
const SISONKE = {
  founder: 'Mthokozisi Masombuka',
  role: 'Founder',
  email: '99masombuka@gmail.com',
  ask: null,                       // e.g. 'R750 000 pre-seed'
  traction: { groups: null, members: null, recordedRand: null } // fill with real numbers when you have them
};

/* ---------- illustrations (photo fallbacks) ---------- */
const P = (x, y, sk, cl, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cy="-34" r="15" fill="${sk}"/><path d="M-26 20Q-26-14 0-14Q26-14 26 20Z" fill="${cl}"/></g>`;
const ART = {
  gather: `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e4c4"/><stop offset="1" stop-color="#e1f0e8"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#ag1)"/><circle cx="318" cy="66" r="38" fill="#c47f2c" opacity=".92"/><circle cx="318" cy="66" r="54" fill="#c47f2c" opacity=".15"/>
    <path d="M0 226Q100 196 200 222T400 212V300H0Z" fill="#234e3c"/><path d="M0 250Q120 226 230 248T400 240V300H0Z" fill="#183a2b"/>
    ${P(78, 214, '#8a5a3c', '#c47f2c', 1.2)}${P(150, 196, '#5e3b27', '#234e3c', 1.1)}${P(250, 196, '#a06b45', '#e8a74a', 1.1)}${P(322, 214, '#6b4430', '#c47f2c', 1.2)}${P(200, 190, '#7a4f35', '#fdfcfa', 1)}
    <rect x="128" y="208" width="144" height="12" rx="5" fill="#7a4e2a"/><rect x="146" y="218" width="8" height="28" fill="#5d3a1f"/><rect x="246" y="218" width="8" height="28" fill="#5d3a1f"/>
    <rect x="168" y="190" width="64" height="20" rx="3" fill="#fdfcfa" stroke="#234e3c" stroke-width="2"/><path d="M200 190V210M176 197H194M176 203H194M206 197H224M206 203H224" stroke="#c47f2c" stroke-width="2"/></svg>`,
  phone: `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="ag2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#234e3c"/><stop offset="1" stop-color="#183a2b"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#ag2)"/><circle cx="70" cy="60" r="46" fill="#c47f2c" opacity=".18"/><circle cx="350" cy="250" r="70" fill="#c47f2c" opacity=".14"/>
    <rect x="140" y="26" width="120" height="248" rx="20" fill="#fdfcfa"/><rect x="140" y="26" width="120" height="44" rx="20" fill="#e1f0e8"/><circle cx="160" cy="48" r="7" fill="#c47f2c"/><rect x="172" y="44" width="52" height="8" rx="4" fill="#234e3c"/>
    ${[88, 126, 164, 202].map((y, i) => `<rect x="154" y="${y}" width="92" height="28" rx="6" fill="${i === 2 ? '#fbe4e1' : '#faf7f2'}"/><circle cx="168" cy="${y + 14}" r="6" fill="${i === 2 ? '#b3382c' : '#234e3c'}"/><rect x="180" y="${y + 8}" width="38" height="5" rx="2.5" fill="#d1c4b4"/><rect x="180" y="${y + 16}" width="26" height="4" rx="2" fill="#e6e0d6"/><rect x="226" y="${y + 10}" width="14" height="6" rx="3" fill="#c47f2c"/>`).join('')}
    <circle cx="258" cy="236" r="22" fill="#c47f2c"/><path d="M248 236l7 7 12-14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  home: `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="ag3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe9d0"/><stop offset="1" stop-color="#faf7f2"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#ag3)"/><circle cx="70" cy="64" r="30" fill="#c47f2c" opacity=".85"/>
    <path d="M0 240H400V300H0Z" fill="#234e3c"/><path d="M110 240V138L200 70L290 138V240Z" fill="#fdfcfa" stroke="#234e3c" stroke-width="4"/><path d="M96 142L200 58L304 142" fill="none" stroke="#c47f2c" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="170" y="170" width="60" height="70" rx="6" fill="#234e3c"/><circle cx="218" cy="208" r="4" fill="#c47f2c"/><rect x="128" y="160" width="28" height="28" rx="3" fill="#e1f0e8" stroke="#234e3c" stroke-width="3"/><rect x="244" y="160" width="28" height="28" rx="3" fill="#e1f0e8" stroke="#234e3c" stroke-width="3"/>
    ${P(60, 240, '#8a5a3c', '#c47f2c', 1)}${P(100, 246, '#5e3b27', '#234e3c', .8)}${P(318, 240, '#a06b45', '#e8a74a', 1)}${P(356, 246, '#6b4430', '#c47f2c', .8)}</svg>`
};
/* A photo slot: shows the illustration; if images/<name>.jpg exists it fades in over it. */
const photo = (name, scene, alt, cls = '') => `<figure class="ph ${cls}"><div class="art">${ART[scene]}</div><img src="images/${name}.jpg" alt="${alt}" loading="lazy" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()"></figure>`;

/* ---------- motion helpers ---------- */
let _io, _scrollBound = false;
function motion() {
  const els = $$('.rv');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion:reduce)').matches) { els.forEach(e => e.classList.add('on')); $$('[data-count]').forEach(countUp); return; }
  _io?.disconnect();
  _io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('on'); _io.unobserve(en.target);
    $$('[data-count]', en.target).forEach(countUp); if (en.target.dataset.count) countUp(en.target);
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  els.forEach(e => _io.observe(e));
  if (!_scrollBound) {
    _scrollBound = true; let tick = false;
    addEventListener('scroll', () => {
      if (tick) return; tick = true;
      requestAnimationFrame(() => {
        const h = document.documentElement, p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
        document.documentElement.style.setProperty('--p', p.toFixed(4));
        $('.nav')?.classList.toggle('stuck', h.scrollTop > 8); tick = false;
      });
    }, { passive: true });
  }
}
function countUp(el) {
  if (el.dataset.done) return; el.dataset.done = 1;
  const to = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  const fmt = v => pre + v.toLocaleString('en-ZA', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/[  ]/g, ' ') + suf;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), D = 1400;
  const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- shared bits ---------- */
const navHTML = () => `<header class="nav"><div class="wrap navin"><a class="brand" href="#/">${logo()}Sisonke</a>
  <div class="links"><a class="link" href="#/">Product</a><a class="link" href="#/investors">Investors</a><a class="link" href="#/g/demo">Live sample</a>
  ${db.user ? '<a class="btn sm" href="#/groups">My groups</a>' : '<a class="link" href="#/signin">Sign in</a><a class="btn sm" href="#/signin">Start free</a>'}</div></div><i class="progress"></i></header>`;
const footHTML = () => `<footer class="site"><div class="wrap"><div class="cols"><div><a class="brand" href="#/">${logo()}Sisonke</a><p class="muted">Records for stokvels and burial societies, open to every member.</p><div class="note">Sisonke keeps records. It does not hold or transfer your money.</div></div>
  <div><div class="eyebrow">Explore</div><a href="#/signin">Start your group</a><a href="#/g/demo">Live sample group</a><a href="#/investors">For investors &amp; funders</a></div>
  <div><div class="eyebrow">Privacy</div><p class="muted small">We collect only names, mobile numbers and the records your group keeps. No ID numbers. Handled in line with POPIA.</p></div></div>
  <p class="muted small" style="text-align:center;margin-top:28px">© ${new Date().getFullYear()} Sisonke · Made in South Africa</p></div></footer>`;
const rv = (d = 0) => `class="rv" style="--d:${d}s"`;

/* ---------- landing ---------- */
function landing() {
  document.title = 'Sisonke – Every rand, in the open';
  const feats = [['book', 'A ledger nobody can quietly change', 'Every payment is written once and chained to the one before. Mistakes are fixed with a visible correction, never rubbed out.'],
  ['eye', 'Every member sees every rand', 'Members check their own balance and the whole group’s book from their phone.'],
  ['chat', 'Arrears and WhatsApp reminders', 'See who owes what, then send a polite reminder on WhatsApp with one tap.'],
  ['hand', 'Claims handled with care', 'Families submit a claim, two officials approve, the treasurer records the payout.'],
  ['file', 'Statements in PDF and CSV', 'Monthly member statements and the full ledger, ready for the AGM.'],
  ['scroll', 'An activity log for everyone', 'Who added, approved or paid what, and when. No more “I never saw that.”']];
  app.innerHTML = navHTML() + `
  <section class="hero-wrap"><div class="blob b1"></div><div class="blob b2"></div>
  <div class="wrap hero"><div>
    <div class="pill in-up" style="--d:.05s"><i></i> For stokvels and burial societies</div>
    <h1 class="in-up" style="--d:.15s">Every rand,<br><span class="hl">in the open.</span></h1>
    <p class="lead in-up" style="--d:.3s">Sisonke replaces the treasurer’s notebook with one shared book that every member can check from their phone.</p>
    <div class="row in-up" style="--d:.45s;margin-top:26px"><a class="btn lg" href="#/signin">Start your group free <span class="arr">→</span></a><a class="btn ghost lg" href="#/g/demo">Try the live sample</a></div>
    <ul class="trust in-up" style="--d:.6s"><li>No money held</li><li>POPIA-aware</li><li>Works offline</li><li>Free for 30 members</li></ul></div>
    <div class="stage in-up" style="--d:.35s">
      ${photo('hero', 'gather', 'Members of a community savings group meeting around a table', 'hero-ph')}
      <div class="hero-card" aria-hidden="true"><div class="hc-h"><b>Masakhane Burial Society</b><span class="live"><i></i>Live book</span></div>
        ${[['Thandi Mokoena', 'R150.00', ''], ['Bheki Nkosi', 'R150.00', ''], ['Thandi Mokoena', 'R1 500.00', 'void'], ['Thandi Mokoena', 'R150.00', 'fix']].map((r, i) => `<div class="mini-row" style="--i:${i}"><span>${r[0]}${r[2] === 'void' ? ' <span class="badge bad">reversed</span>' : r[2] === 'fix' ? ' <span class="badge">correction</span>' : ''}</span><b class="${r[2] === 'void' ? 'strk' : ''}">${r[1]}</b></div>`).join('')}
        <div class="verified"><i>✓</i> Book verified · 95 entries chained</div></div>
      <div class="chip c1" aria-hidden="true">💬 Reminder sent on WhatsApp</div><div class="chip c2" aria-hidden="true">✅ 2 of 2 officials approved</div></div>
  </div></section>
  <div class="marquee" aria-hidden="true"><div class="track">${Array(2).fill(['Burial societies', 'Savings stokvels', 'Grocery clubs', 'Funeral funds', 'Investment clubs', 'Rotating savings', 'Family trusts'].map(t => `<span>${t}</span>`).join('')).join('')}</div></div>
  <section class="sec"><div class="wrap"><div class="center-t rv"><div class="eyebrow gold">The problem</div><h2>One notebook, one person, and a lot of trust.</h2><p class="muted lead2">When a page goes missing, so does the peace. Stokvels move real money on memory, paper and WhatsApp screenshots.</p></div>
    <div class="stat3">
      <div ${rv(0)}><div class="big gold-t" data-count="45" data-prefix="R" data-suffix="bn">R45bn</div><p>estimated held in South African stokvels</p></div>
      <div ${rv(.12)}><div class="big gold-t" data-count="11" data-suffix="m">11m</div><p>South Africans in one or more stokvels</p></div>
      <div ${rv(.24)}><div class="big gold-t">1 notebook</div><p>is often the only record of it all</p></div></div>
    <p class="muted small center-t rv">Estimates from the National Stokvel Association of South Africa (NASASA) as reported in <a target="_blank" rel="noopener" href="https://www.hippo.co.za/news/stokvels-a-key-way-in-which-south-africans-save/">Hippo.co.za</a>. Figures vary by year and source.</p></div></section>
  <section class="sec white"><div class="wrap two"><div ${rv()}>${photo('steps', 'phone', 'A member checking the group ledger on a phone', 'tall')}</div>
    <div><h2 ${rv()}>How it works</h2><div class="steps">${[['Set your rules once', 'Contribution, due day, grace days, waiting period and cover amounts. Sisonke applies them for you.'], ['Add your members', 'Type in names and numbers, or share a read-only link on the group’s WhatsApp.'], ['Record each payment', 'The treasurer records it, with a photo of the proof if there is one. Everyone sees it straight away.']].map((s, i) => `<div class="step rv" style="--d:${i * .12}s"><div class="n">${i + 1}</div><div><h4 style="margin:0">${s[0]}</h4><p class="muted" style="margin:.2em 0 0">${s[1]}</p></div></div>`).join('')}</div></div></div></section>
  <section class="sec dark"><div class="wrap"><h2 class="rv">Six things your group gets</h2><div class="grid3">${feats.map((f, i) => `<div class="feat rv" style="--d:${(i % 3) * .1}s"><div class="ficon">${ico(f[0])}</div><h4>${f[1]}</h4><p>${f[2]}</p></div>`).join('')}</div></div></section>
  <section class="sec"><div class="wrap"><h2 class="rv">Built for the way groups already work</h2><div class="cards2">
    <article class="card-ph rv">${photo('burial', 'home', 'A family home where a burial society supports its members')}<div class="cp-b"><h3>Burial societies</h3><p class="muted">Waiting periods, cover for members, spouses, children and parents, and claims approved by your officials.</p></div></article>
    <article class="card-ph rv" style="--d:.12s">${photo('stokvel', 'gather', 'Friends gathered for a monthly savings stokvel')}<div class="cp-b"><h3>Savings stokvels</h3><p class="muted">Monthly contributions, who is behind, and a clear record for every member when it is their turn.</p></div></article></div></div></section>
  <section class="sec white"><div class="wrap two" style="align-items:center"><div><h2 class="rv">See every rand. Trust follows.</h2>
    <div class="steps">${[['users', 'A transparent ledger', 'Every member sees the same book, with who recorded each line and when.'], ['lock', 'No money held', 'Sisonke keeps records. It does not hold or transfer your money.'], ['shield', 'POPIA-aware', 'We ask for names and mobile numbers only, never ID numbers. You agree before you sign up.']].map((s, i) => `<div class="step rv" style="grid-template-columns:44px 1fr;--d:${i * .1}s"><div class="ficon g">${ico(s[0])}</div><div><h4 style="margin:0;font-family:var(--sans)">${s[1]}</h4><p class="muted" style="margin:.2em 0 0">${s[2]}</p></div></div>`).join('')}</div></div>
    <div class="rv" style="--d:.15s"><div class="quote"><span>“</span>When a page goes missing, so does the peace. <b>Sisonke keeps every page.</b></div></div></div></section>
  <section class="sec" id="pricing"><div class="wrap"><h2 class="rv">Pricing</h2><div class="price rv">
    <div><h4>Free</h4><div class="bigp">R0 <span class="muted small">/ month</span></div><p class="muted">For one group finding its feet.</p>
      <ul class="dots"><li>1 group</li><li>Up to 30 members</li><li>Full ledger, claims and statements</li><li>WhatsApp reminders</li></ul><a class="btn" href="#/signin">Start your group free</a></div>
    <div class="pop"><span class="tag">Soon</span><h4>Society</h4><div class="bigp">R99.00 <span class="muted small">/ month</span></div><p class="muted">For bigger societies and treasurers running more than one group.</p>
      <ul class="dots"><li>Unlimited groups</li><li>Unlimited members</li><li>Everything in Free</li><li>Priority help</li></ul><span class="btn dashed">Coming soon</span></div></div></div></section>
  <section class="sec white" id="faq"><div class="wrap two"><h2 class="rv">Questions people ask</h2><div class="rv">
    ${[['Does Sisonke hold our money?', 'No. Sisonke keeps records only. Your group keeps handling cash and transfers the way it does today.'],
    ['Can the treasurer delete or change a payment?', 'No. Entries are chained to each other, so changing an old one breaks the chain and the app shows it. A mistake is fixed by a visible correction that reverses the entry.'],
    ['Do members need smartphones?', 'No. The treasurer can still record everything and print statements. Members with phones can open a read-only link.'],
    ['What information do you collect?', 'Names, mobile numbers and the records your group keeps. No ID numbers.'],
    ['How much data does it use?', 'Very little. The app is small and keeps working offline once opened.'],
    ['Is it really free?', 'Yes, for one group of up to 30 members. Bigger societies will use the Society plan when it launches.']].map(q => `<details><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join('')}</div></div>
    <div class="wrap"><div class="cta rv"><div><h2>Ready to put the book where everyone can see it?</h2><p class="muted">Start in two minutes. No card, no ID numbers.</p></div><a class="btn lg" href="#/signin">Start your group free <span class="arr">→</span></a></div></div></section>` + footHTML();
  motion();
}

/* ---------- investors ---------- */
function investors() {
  document.title = 'Sisonke for investors and funders';
  const T = SISONKE.traction, hasT = T.groups != null || T.members != null || T.recordedRand != null;
  const mail = `mailto:${SISONKE.email}?subject=${encodeURIComponent('Sisonke – investor enquiry')}`;
  app.innerHTML = navHTML() + `
  <section class="hero-wrap inv"><div class="blob b1"></div><div class="wrap" style="padding:84px 24px 70px;max-width:900px">
    <div class="pill in-up" style="--d:.05s"><i></i> Investor &amp; funder overview</div>
    <h1 class="in-up" style="--d:.15s;font-size:clamp(2.4rem,5.5vw,3.8rem)">Digitising trust in South Africa’s <span class="hl">stokvel economy.</span></h1>
    <p class="lead in-up" style="--d:.3s">Sisonke gives burial societies and stokvels a tamper-evident shared ledger that members can check on their phones. Records, not custody: no money held, no banking licence needed.</p>
    <div class="row in-up" style="--d:.45s;margin-top:26px"><a class="btn lg" href="${mail}">Request the pitch deck <span class="arr">→</span></a><a class="btn ghost lg" href="#/g/demo">Explore the live product</a><button class="btn ghost lg noprint" onclick="window.print()">Save one-pager (PDF)</button></div></div></section>

  <section class="sec"><div class="wrap two" style="gap:56px">
    <div ${rv()}><div class="eyebrow gold">The problem</div><h2>Money moves on memory and paper.</h2><p class="muted">Millions of South Africans pool money every month. The record is usually one treasurer’s notebook or a WhatsApp thread. Disputes, missing pages and “I never saw that” erode trust and break groups up, often at the worst moment: a funeral claim.</p></div>
    <div ${rv(.1)}><div class="eyebrow gold">The solution</div><h2>A shared book nobody can quietly change.</h2><p class="muted">Every entry is chained to the one before it. Mistakes are reversed by visible corrections. Members see their balance, claims need two officials, and statements are ready for the AGM. It runs on any phone and works offline.</p></div></div></section>

  <section class="sec white"><div class="wrap"><div class="center-t rv"><div class="eyebrow gold">Market</div><h2>A large, trust-driven informal market.</h2></div>
    <div class="stat3"><div ${rv(0)}><div class="big gold-t" data-count="45" data-prefix="R" data-suffix="bn">R45bn</div><p>estimated held in stokvels</p></div><div ${rv(.12)}><div class="big gold-t" data-count="11" data-suffix="m">11m</div><p>South Africans in a stokvel</p></div><div ${rv(.24)}><div class="big gold-t">WhatsApp</div><p>already where groups coordinate</p></div></div>
    <p class="muted small center-t rv">NASASA estimates as reported by <a target="_blank" rel="noopener" href="https://www.hippo.co.za/news/stokvels-a-key-way-in-which-south-africans-save/">Hippo.co.za</a>; other sources cite higher figures. We will refresh these with current NASASA data before any formal raise.</p></div></section>

  <section class="sec"><div class="wrap"><div class="center-t rv"><div class="eyebrow gold">Business model</div><h2>Free to start, paid to scale.</h2></div>
    <div class="cards3"><div class="mcard rv"><h4>Free</h4><div class="bigp">R0</div><p class="muted">1 group, up to 30 members. Drives adoption and word of mouth through every member who opens a shared link.</p></div>
      <div class="mcard hot rv" style="--d:.1s"><h4>Society plan</h4><div class="bigp">R99 <span class="small muted">/ month</span></div><p class="muted">Unlimited groups and members for larger societies and treasurers running several groups.</p></div>
      <div class="mcard rv" style="--d:.2s"><h4>Partnerships <span class="badge wait">Planned</span></h4><div class="bigp">–</div><p class="muted">Referral and data-light products for funeral cover, savings and payments providers, only with group consent.</p></div></div>
    <div class="calc rv"><h3>Illustrative revenue model</h3><p class="muted small">Move the sliders. This is a what-if tool, not a forecast.</p>
      <div class="form2"><div><label>Groups using Sisonke: <b id="cg">1 000</b></label><input type="range" id="rg" min="100" max="20000" step="100" value="1000"></div><div><label>Share on the paid plan: <b id="cp">10%</b></label><input type="range" id="rp" min="1" max="40" value="10"></div></div>
      <div class="stats" style="border:0;margin:6px 0 0"><div class="stat"><div class="v" id="o1"></div><div class="k">Paying groups</div></div><div class="stat"><div class="v" id="o2"></div><div class="k">Monthly recurring revenue</div></div><div class="stat"><div class="v" id="o3"></div><div class="k">Annual recurring revenue</div></div><div class="stat"><div class="v" id="o4"></div><div class="k">Members covered (avg 25/group)</div></div></div></div></div></section>

  <section class="sec white"><div class="wrap two" style="gap:56px"><div ${rv()}><div class="eyebrow gold">Product status</div><h2>A working product, not a slide.</h2>
    <ul class="dots"><li>Tamper-evident, hash-chained ledger with visible corrections</li><li>Rules engine: due days, grace, waiting periods, cover amounts</li><li>Two-official claim approval and payout records</li><li>Arrears tracking with WhatsApp reminders</li><li>Monthly statements and full ledger in PDF and CSV</li><li>Read-only member links, offline-capable installable app</li></ul><a class="btn" href="#/g/demo">Open the live sample</a></div>
    <div ${rv(.1)}><div class="eyebrow gold">Roadmap</div><h2>What the funding unlocks.</h2><div class="road">
      ${[['Now', 'Pilot with first burial societies and stokvels', 'on'], ['Next', 'Secure cloud sync, member invites and sign-in', ''], ['Then', 'Bank-statement reconciliation and proof matching', ''], ['Later', 'WhatsApp bot and USSD for feature-phone members', '']].map(r => `<div class="rm ${r[2]}"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div></div></div></section>

  ${hasT ? `<section class="sec"><div class="wrap"><div class="center-t rv"><div class="eyebrow gold">Traction</div><h2>Early results.</h2></div><div class="stat3">
    ${T.groups != null ? `<div class="rv"><div class="big gold-t" data-count="${T.groups}">${T.groups}</div><p>groups</p></div>` : ''}${T.members != null ? `<div class="rv"><div class="big gold-t" data-count="${T.members}">${T.members}</div><p>members</p></div>` : ''}${T.recordedRand != null ? `<div class="rv"><div class="big gold-t" data-count="${T.recordedRand}" data-prefix="R">${rand(T.recordedRand)}</div><p>recorded in the open</p></div>` : ''}</div></div></section>` : ''}

  <section class="sec ${hasT ? 'white' : ''}"><div class="wrap"><div class="center-t rv"><div class="eyebrow gold">Why we can win</div><h2>Trust is the product.</h2></div><div class="cards3">
    ${[['Native distribution', 'Every shared link and WhatsApp reminder puts Sisonke in front of a whole group, not one user.'], ['Built for local rules', 'Waiting periods, two-official claims and cover tiers match how burial societies already run.'], ['Hard to copy trust', 'A verifiable record over years becomes the group’s memory and is painful to leave.']].map((c, i) => `<div class="mcard rv" style="--d:${i * .1}s"><h4>${c[0]}</h4><p class="muted">${c[1]}</p></div>`).join('')}</div></div></section>

  <section class="sec white"><div class="wrap two" style="gap:56px"><div ${rv()}><div class="eyebrow gold">Risks we manage</div><h2>Honest about what could go wrong.</h2>
    <ul class="dots"><li><b>Adoption:</b> free tier and shareable links lower the barrier.</li><li><b>Regulation:</b> records only, no custody. Partnerships will get proper legal review.</li><li><b>Data protection:</b> minimal data, no ID numbers, POPIA consent at sign-up.</li><li><b>Device-only storage today:</b> cloud sync is the first funded milestone.</li></ul></div>
    <div ${rv(.1)} class="founder"><div class="eyebrow gold">Team</div><div class="fcard"><div class="avatar">${logo(34)}</div><div><h3 style="margin:0">${esc(SISONKE.founder)}</h3><div class="muted">${esc(SISONKE.role)} · BCom Information Technology &amp; Business Intelligence, cum laude</div></div></div>
    <p class="muted">Based in Kwa-Thema, Gauteng. Builds data and cloud products for South African communities.</p></div></div></section>

  <section class="sec"><div class="wrap"><div class="cta dark-cta rv"><div><h2>${SISONKE.ask ? `Raising: ${esc(SISONKE.ask)}` : 'Let’s talk.'}</h2><p>Funders, accelerators and partners: we’d love to show you the product and the plan.</p></div><a class="btn gold lg" href="${mail}">Email ${esc(SISONKE.founder.split(' ')[0])} <span class="arr">→</span></a></div></div></section>` + footHTML();
  const fmt = n => n.toLocaleString('en-ZA').replace(/[  ]/g, ' ');
  const calc = () => {
    const g = +$('#rg').value, p = +$('#rp').value, paying = Math.round(g * p / 100), mrr = paying * 99;
    $('#cg').textContent = fmt(g); $('#cp').textContent = p + '%'; $('#o1').textContent = fmt(paying); $('#o2').textContent = rand(mrr).replace('.00', ''); $('#o3').textContent = rand(mrr * 12).replace('.00', ''); $('#o4').textContent = fmt(g * 25);
  };
  $('#rg').oninput = $('#rp').oninput = calc; calc(); motion();
}
