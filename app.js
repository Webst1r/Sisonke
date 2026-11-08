/* Sisonke v2 – open records for stokvels and burial societies.
   Static, offline-capable app. Data lives on this device (localStorage) until a server is connected. */
'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = n => 'R' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ');
const uid = () => Math.random().toString(36).slice(2, 10);
const code = () => Math.random().toString(16).slice(2, 10);
const fmtDate = d => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDT = d => new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
function phoneNorm(p) { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '27' + d.slice(1); return d; }
async function sha(str) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function download(name, text, type = 'text/csv') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

/* ---------- store ---------- */
const KEY = 'sisonke.v2';
let db = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
db.groups = db.groups || [];
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast('Storage is full – export your ledger.'); } };
const getGroup = id => db.groups.find(g => g.id === id);

/* ---------- ledger core ---------- */
const hashInput = e => JSON.stringify([e.id, e.ts, e.type, e.memberId, e.amount, e.paid, e.note, e.ref, e.by, e.prev]);
async function addEntry(g, o) {
  const prev = g.ledger.length ? g.ledger[g.ledger.length - 1].hash : 'GENESIS';
  const e = {
    id: uid(), ts: o.ts || new Date().toISOString(), type: o.type, memberId: o.memberId, amount: +o.amount,
    paid: o.paid || null, note: o.note || '', ref: o.ref || null, by: o.by || db.user?.name || 'Treasurer', proof: o.proof || null, prev
  };
  e.hash = await sha(hashInput(e));
  g.ledger.push(e);
  return e;
}
async function verifyChain(g) {
  let prev = 'GENESIS';
  for (let i = 0; i < g.ledger.length; i++) {
    const e = g.ledger[i];
    if (e.prev !== prev || (await sha(hashInput(e))) !== e.hash) return { ok: false, at: i + 1 };
    prev = e.hash;
  }
  return { ok: true, n: g.ledger.length };
}
function log(g, text, who) { g.activity.push({ id: uid(), ts: new Date().toISOString(), text, by: who || db.user?.name || 'System' }); }
const voided = g => new Set(g.ledger.filter(e => e.type === 'correction').map(e => e.ref));
/* signed effect of an entry: contributions +, payouts -, corrections reverse their target */
function effects(g) {
  const byId = Object.fromEntries(g.ledger.map(e => [e.id, e]));
  return g.ledger.map(e => {
    const t = e.type === 'correction' ? byId[e.ref] : e;
    const sign = e.type === 'correction' ? -1 : 1;
    return { e, contrib: t?.type === 'contribution' ? sign * t.amount : 0, payout: t?.type === 'payout' ? sign * t.amount : 0, memberId: t?.memberId ?? e.memberId };
  });
}
function totals(g) {
  const f = effects(g); const c = f.reduce((a, x) => a + x.contrib, 0), p = f.reduce((a, x) => a + x.payout, 0);
  return { contributed: c, paidOut: p, balance: c - p };
}
const paidBy = (g, mid) => effects(g).filter(x => x.memberId === mid).reduce((a, x) => a + x.contrib, 0);
function dueDates(g, m, today = new Date()) {
  const out = [], j = startOfDay(m.joined), day = Math.min(+g.rules.dueDay || 1, 28);
  let d = new Date(j.getFullYear(), j.getMonth(), day);
  if (d < j) d = addMonths(d, 1);
  const lim = addMonths(startOfDay(today), 14);
  while (d < lim) { out.push(new Date(d)); d = addMonths(d, 1); }
  return out;
}
function memberState(g, m, today = new Date()) {
  const t = startOfDay(today), grace = +g.rules.graceDays || 0;
  const dues = dueDates(g, m, t);
  const counted = dues.filter(d => new Date(d.getTime() + grace * 864e5) <= t).length;
  const expected = counted * +g.rules.contribution, paid = paidBy(g, m.id);
  const owed = Math.max(0, expected - paid);
  const monthsBehind = g.rules.contribution ? Math.ceil(owed / g.rules.contribution) : 0;
  const coverStart = addMonths(startOfDay(m.joined), +g.rules.waitMonths || 0);
  return { expected, paid, owed, monthsBehind, coverStart, waiting: t < coverStart, next: dues.find(d => d >= t) };
}

/* ---------- snapshot sharing (read-only links) ---------- */
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function encodeSnap(g) {
  const slim = { name: g.name, type: g.type, rules: g.rules, members: g.members.map(m => ({ ...m, phone: '' })), claims: g.claims, activity: g.activity.slice(-40), ledger: g.ledger.map(e => ({ ...e, proof: null })), at: new Date().toISOString() };
  const raw = new TextEncoder().encode(JSON.stringify(slim));
  if (!('CompressionStream' in window)) return 'p' + b64u(raw);
  const s = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return 'z' + b64u(new Uint8Array(await new Response(s).arrayBuffer()));
}
async function decodeSnap(s) {
  const bytes = unb64u(s.slice(1));
  let raw = bytes;
  if (s[0] === 'z') raw = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  const g = JSON.parse(new TextDecoder().decode(raw)); g.id = 'snap'; g.readonly = true; g.snapshot = true; return g;
}

/* ---------- demo group ---------- */
async function buildDemo() {
  const names = ['Nomsa Dlamini', 'Sipho Khumalo', 'Thandi Mokoena', 'Lerato Molefe', 'Bheki Nkosi', 'Zanele Mahlangu', 'Pule Sithole', 'Ayanda Zulu', 'Refilwe Mabasa', 'Themba Ndlovu', 'Busi Radebe', 'Kagiso Mthembu', 'Mpho Tau', 'Nandi Shabalala'];
  const today = new Date(), start = new Date(today.getFullYear(), today.getMonth() - 7, 1);
  const g = {
    id: 'demo', demo: true, readonly: true, name: 'Masakhane Burial Society', type: 'burial', code: 'demo', owner: 'demo', treasurerName: 'Nomsa Dlamini',
    rules: { contribution: 150, dueDay: 1, graceDays: 5, waitMonths: 6, cover: { member: 20000, spouse: 15000, child: 8000, parent: 10000 } },
    members: names.map((n, i) => ({ id: 'm' + i, name: n, phone: '', role: i === 0 ? 'treasurer' : i < 4 && i > 0 ? 'official' : 'member', joined: start.toISOString() })),
    ledger: [], claims: [], activity: [], meId: 'm3'
  };
  g.activity.push({ id: uid(), ts: start.toISOString(), text: 'Nomsa Dlamini created the group', by: 'Nomsa Dlamini' });
  let first = null;
  for (let mo = 0; mo < 7; mo++) {
    for (let i = 0; i < names.length; i++) {
      if (mo >= 5 && (i + mo) % 6 === 0) continue; // a few members fall behind
      const d = new Date(start.getFullYear(), start.getMonth() + mo, 2 + (i % 4), 10, 15);
      const e = await addEntry(g, { type: 'contribution', memberId: 'm' + i, amount: 150, paid: iso(d), ts: d.toISOString(), by: 'Nomsa Dlamini', note: 'Cash' });
      if (mo === 2 && i === 5) first = e;
    }
  }
  const wrong = await addEntry(g, { type: 'contribution', memberId: 'm9', amount: 1500, paid: iso(today), ts: new Date(today.getTime() - 864e5 * 9).toISOString(), by: 'Nomsa Dlamini', note: 'Typed R1500 by mistake' });
  await addEntry(g, { type: 'correction', memberId: 'm9', amount: 1500, ref: wrong.id, ts: new Date(today.getTime() - 864e5 * 9 + 6e5).toISOString(), by: 'Nomsa Dlamini', note: 'Wrong amount – reversed' });
  await addEntry(g, { type: 'contribution', memberId: 'm9', amount: 150, paid: iso(today), ts: new Date(today.getTime() - 864e5 * 9 + 9e5).toISOString(), by: 'Nomsa Dlamini', note: 'Correct amount' });
  g.claims.push({ id: uid(), memberId: 'm2', who: 'parent', deceased: 'Mrs Mokoena (mother)', amount: 10000, status: 'pending', approvals: ['Sipho Khumalo'], filed: new Date(today.getTime() - 864e5 * 2).toISOString(), note: '' });
  log(g, 'Sipho Khumalo approved the claim for Thandi Mokoena', 'Sipho Khumalo');
  return g;
}

/* ---------- icons ---------- */
const IC = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>', book: '<path d="M2 4h7a3 3 0 013 3v13a2 2 0 00-2-2H2zM22 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 5a3.5 3.5 0 010 7M22 20c0-2.5-1.7-4.5-4-5.4"/>',
  hand: '<path d="M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z"/>', warn: '<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>',
  file: '<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h7M9 17h7"/>', pulse: '<path d="M2 12h5l3-8 4 16 3-8h5"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', chat: '<path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.6A8 8 0 1121 12z"/>',
  scroll: '<path d="M8 3h11v15a3 3 0 01-3 3H6a3 3 0 003-3V3zM8 3a3 3 0 00-3 3v2h3M12 8h4M12 12h4"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5L16 9.5"/>'
};
const ico = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const logo = (w = 28) => `<img src="logo.svg" width="${w}" height="${w}" alt="">`;

/* ---------- router ---------- */
const app = $('#app');
let snap = null;
async function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const [a, b, c] = parts;
  window.scrollTo(0, 0);
  app.classList.remove('in'); void app.offsetWidth; app.classList.add('in');
  try {
    if (!a || a === 'pricing' || a === 'faq') { landing(); if (a) setTimeout(() => document.getElementById(a)?.scrollIntoView(), 0); return; }
    if (a === 'investors') return investors();
    if (a === 'signin') return signin();
    if (a === 's' && b) { snap = snap && snap._k === b ? snap : Object.assign(await decodeSnap(b), { _k: b }); return groupView(snap, c || 'home'); }
    if (!db.user && !(a === 'g' && b === 'demo')) return (location.hash = '#/signin');
    if (a === 'groups') return groups();
    if (a === 'g') {
      let g = getGroup(b);
      if (!g && b === 'demo') { g = window._demo || (window._demo = await buildDemo()); }
      if (!g) return (location.hash = '#/groups');
      return groupView(g, c || 'home');
    }
    landing();
  } catch (e) { console.error(e); app.innerHTML = `<div class="center-card"><div class="card"><h2>That link did not open</h2><p class="muted">It may be incomplete. Ask your treasurer to share it again.</p><a class="btn" href="#/">Go home</a></div></div>`; }
}
window.addEventListener('hashchange', route);

/* ---------- sign in / groups ---------- */
function signin() {
  if (db.user) return (location.hash = '#/groups');
  app.innerHTML = `<div class="center-card"><a class="brand" href="#/">${logo()}Sisonke</a>
    <div class="card" style="margin-top:20px"><h2>Welcome</h2><p class="muted">Tell us who you are. We only keep your name and mobile number.</p>
    <form id="f"><label>Full name</label><input name="name" required autocomplete="name">
    <label>Mobile number</label><input name="phone" required inputmode="tel" placeholder="e.g. 082 123 4567" autocomplete="tel">
    <label style="display:flex;gap:10px;font-weight:400;align-items:flex-start"><input type="checkbox" required style="width:auto;margin-top:4px"> <span>I agree that Sisonke may store my name and mobile number to run my group’s records (POPIA).</span></label>
    <p style="margin-top:18px"><button class="btn" style="width:100%">Continue</button></p></form>
    <p class="note muted">Records are kept on this device. Use “Share read-only link” inside a group so members can check the book on theirs.</p></div></div>`;
  $('#f').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); db.user = { id: uid(), name: f.get('name').trim(), phone: phoneNorm(f.get('phone')) }; save(); location.hash = '#/groups'; };
}
function groups() {
  document.title = 'My groups – Sisonke';
  app.innerHTML = `<div class="topbar"><a class="brand" href="#/groups">${logo()}<span>My groups</span></a><div class="row"><button class="btn ghost sm" data-act="signout">Sign out</button></div></div>
  <div class="wrap" style="max-width:760px;padding-top:30px"><h1>Sawubona, ${esc(db.user.name.split(' ')[0])}</h1><p class="muted">Choose a group to open its records.</p>
  ${db.groups.length ? `<div class="list">${db.groups.map(g => `<a href="#/g/${g.id}"><span><b>${esc(g.name)}</b><br><span class="muted small">${g.type === 'burial' ? 'Burial society' : 'Savings stokvel'} · You are ${g.owner === db.user.id ? 'treasurer' : 'member'}</span></span><span>›</span></a>`).join('')}</div>` : `<div class="empty"><b>No groups yet</b><p class="muted">Create your first group or look around the sample one.</p></div>`}
  <div class="form2" style="margin-top:22px;align-items:start">
    <div class="card"><h3>Start a group</h3><form id="f"><label>Group name</label><input name="name" required placeholder="e.g. Masakhane burial group">
      <label>Type</label><select name="type"><option value="burial">Burial society</option><option value="savings">Savings stokvel</option></select>
      <p><button class="btn">Create group</button></p></form></div>
    <div><div class="card tint"><div class="eyebrow" style="margin-bottom:4px">Look around</div><h3>Masakhane Burial Society</h3><p class="muted">A sample burial society with 14 members. Read-only, so you can explore freely.</p><a class="btn ghost sm" href="#/g/demo">Open sample</a></div>
    <div class="card"><h3>Have a link or code?</h3><form id="j"><input name="c" placeholder="Paste a read-only link"><p><button class="btn ghost sm">Open</button></p></form></div></div></div></div>`;
  $('#f').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    const g = { id: uid(), name: f.get('name').trim(), type: f.get('type'), code: code(), owner: db.user.id, treasurerName: db.user.name,
      rules: { contribution: 150, dueDay: 1, graceDays: 5, waitMonths: f.get('type') === 'burial' ? 6 : 0, cover: { member: 20000, spouse: 15000, child: 8000, parent: 10000 } },
      members: [{ id: uid(), name: db.user.name, phone: db.user.phone, role: 'treasurer', joined: new Date().toISOString() }], ledger: [], claims: [], activity: [] };
    log(g, `${db.user.name} created the group`); db.groups.push(g); save(); location.hash = '#/g/' + g.id + '/rules'; toast('Group created. Set your rules first.');
  };
  $('#j').onsubmit = e => { e.preventDefault(); const v = new FormData(e.target).get('c').trim(); const m = v.match(/#\/s\/.+$/); if (m) location.hash = m[0]; else toast('Paste the full link your treasurer shared.'); };
}

/* ---------- group shell ---------- */
const TABS = [['home', 'Home', 'home'], ['ledger', 'Ledger', 'book'], ['members', 'Members', 'users'], ['claims', 'Claims', 'hand'], ['arrears', 'Arrears', 'warn'], ['statements', 'Statements', 'file'], ['activity', 'Activity', 'pulse'], ['rules', 'Rules', 'gear']];
let cur = { g: null, tab: 'home' };
async function groupView(g, tab) {
  cur = { g, tab };
  const base = g.snapshot ? `#/s/${g._k}` : `#/g/${g.id}`;
  const canEdit = !g.readonly && g.owner === db.user?.id;
  g._edit = canEdit; g._base = base;
  document.title = `${g.name} – Sisonke`;
  const nav = TABS.map(t => `<a href="${base}/${t[0]}" class="${t[0] === tab ? 'on' : ''}">${ico(t[2])}<span>${t[1]}</span></a>`).join('');
  const bn = TABS.map(t => `<a href="${base}/${t[0]}" class="${t[0] === tab ? 'on' : ''}">${ico(t[2])}${t[1]}</a>`).join('');
  app.innerHTML = `<div class="shell"><aside class="side"><a class="brand" href="${g.snapshot ? '#/' : '#/groups'}">${logo()}Sisonke</a><div class="gname">${esc(g.name)}</div><div class="muted small" style="margin:0 6px">${g.type === 'burial' ? 'Burial society' : 'Savings stokvel'}</div><nav>${nav}</nav>
    <div class="note muted" style="margin:24px 6px 0">${g.snapshot ? 'Read-only snapshot' : canEdit ? 'You are the treasurer' : 'Read-only'}</div></aside>
    <div><div class="mobhead"><a class="brand" href="${g.snapshot ? '#/' : '#/groups'}">${logo(24)}<span style="font-size:1.05rem">${esc(g.name)}</span></a></div>
    <main class="main" id="main"></main></div></div><nav class="bn">${bn}</nav>`;
  const view = { home: vHome, ledger: vLedger, members: vMembers, claims: vClaims, arrears: vArrears, statements: vStatements, activity: vActivity, rules: vRules }[tab] || vHome;
  await view(g, $('#main'));
}
const head = (g, title, sub) => `<div class="crumb">${g.snapshot ? 'Snapshot' : g.readonly ? 'Sample' : g._edit ? 'Treasurer' : 'Member'} · ${esc(g.name)}</div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}
  ${g.demo ? '<div class="banner">This is a sample group. It is read-only, so explore as much as you like.</div>' : ''}${g.snapshot ? `<div class="banner">Read-only snapshot shared on ${fmtDate(g.at)}. Ask your treasurer for a fresh link to see newer entries.</div>` : ''}`;
const mname = (g, id) => g.members.find(m => m.id === id)?.name || 'Unknown';
const badgeFor = (g, m) => { const s = memberState(g, m); return s.waiting ? '<span class="badge wait">Waiting period</span>' : s.owed > 0 ? `<span class="badge bad">Owes ${rand(s.owed)}</span>` : '<span class="badge">Covered</span>'; };

/* ---------- views ---------- */
async function vHome(g, el) {
  const T = totals(g), me = g.members.find(m => m.id === g.meId) || g.members.find(m => db.user && m.phone && m.phone === db.user.phone);
  const ms = me && memberState(g, me), behind = g.members.map(m => ({ m, s: memberState(g, m) })).filter(x => x.s.owed > 0 && !x.s.waiting || x.s.owed > 0);
  const open = g.claims.filter(c => c.status === 'pending' || c.status === 'approved');
  el.innerHTML = head(g, esc(g.name)) + (me ? `<div class="card"><div class="row sb"><h3 style="margin:0">My record</h3>${badgeFor(g, me)}</div>
    <div class="rec"><div class="stat"><div class="k">I’ve paid</div><div class="v">${rand(ms.paid)}</div></div><div class="stat"><div class="k">I owe</div><div class="v">${rand(ms.owed)}</div></div><div class="stat"><div class="k">Next due</div><div class="v">${ms.next ? fmtDate(ms.next) : '–'}</div></div></div>
    <p class="muted small">${ms.waiting ? `Your cover starts on ${fmtDate(ms.coverStart)}.` : 'Your cover is active.'}</p><a href="${g._base}/statements">See my statement →</a></div>` : '') + `
    <h3 style="margin-top:26px">The group</h3><div class="stats"><div class="stat"><div class="v">${rand(T.contributed)}</div><div class="k">Total contributed</div></div><div class="stat"><div class="v">${rand(T.paidOut)}</div><div class="k">Paid out</div></div><div class="stat"><div class="v">${rand(T.balance)}</div><div class="k">Balance on record</div></div><div class="stat"><div class="v">${g.members.length}</div><div class="k">Members</div></div></div>
    <div class="form2"><div class="card"><b>${behind.length ? `${behind.length} member${behind.length > 1 ? 's are' : ' is'} behind` : 'Everyone is up to date'}</b><p class="muted small" style="margin:.3em 0 0">${behind.length ? `<a href="${g._base}/arrears">Open arrears →</a>` : 'No reminders needed right now.'}</p></div>
    <div class="card"><b>${open.length ? `${open.length} open claim${open.length > 1 ? 's' : ''}` : 'No open claims'}</b><p class="muted small" style="margin:.3em 0 0">${open.length ? `<a href="${g._base}/claims">Review claims →</a>` : 'Claims will appear here.'}</p></div></div>
    <div class="row sb" style="margin-top:28px"><h3 style="margin:0">Recent activity</h3><a href="${g._base}/activity">See all</a></div><div class="timeline" style="margin-top:14px">${[...g.activity].reverse().slice(0, 4).map(a => `<div class="ev">${esc(a.text)}<div class="muted small">${fmtDT(a.ts)}</div></div>`).join('') || '<p class="muted">Nothing yet.</p>'}</div>
    <div id="verify" class="muted small" style="margin-top:8px">Checking the book…</div>`;
  verifyChain(g).then(r => { const v = $('#verify'); if (v) v.innerHTML = r.ok ? `<span class="badge">✓ Book verified</span> ${r.n} entries, each chained to the one before.` : `<span class="badge bad">⚠ Chain broken at entry ${r.at}</span> The book was changed after it was written.`; });
}

async function vLedger(g, el) {
  const V = voided(g), byId = Object.fromEntries(g.ledger.map(e => [e.id, e]));
  el.innerHTML = head(g, 'Ledger', 'Entries can’t be changed or deleted. Mistakes are fixed with a visible correction.') +
    `<div class="row sb" style="margin-bottom:14px"><input id="q" placeholder="Search by member name" style="max-width:300px">${g._edit ? '<button class="btn" data-act="addpay">Record payment</button>' : ''}</div><div id="rows"></div>`;
  const draw = () => {
    const q = $('#q').value.toLowerCase();
    const rows = [...g.ledger].reverse().filter(e => mname(g, e.memberId).toLowerCase().includes(q));
    $('#rows').innerHTML = rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Recorded</th><th>Member</th><th>Type</th><th class="right">Amount</th><th>By</th><th></th></tr></thead><tbody>${rows.map(e => `
      <tr class="${V.has(e.id) ? 'void' : ''}"><td>${fmtDT(e.ts)}${e.paid ? `<div class="muted small">Paid ${fmtDate(e.paid)}</div>` : ''}</td><td>${esc(mname(g, e.memberId))}${e.note ? `<div class="muted small">${esc(e.note)}</div>` : ''}</td>
      <td><span class="badge ${e.type === 'correction' ? 'bad' : e.type === 'payout' ? 'wait' : ''}">${e.type}</span>${V.has(e.id) ? ' <span class="badge gray">reversed</span>' : ''}${e.type === 'correction' && byId[e.ref] ? `<div class="muted small">of ${rand(byId[e.ref].amount)}</div>` : ''}</td>
      <td class="right"><b>${rand(e.amount)}</b></td><td>${esc(e.by)}</td><td>${e.proof ? `<img class="proof" src="${e.proof}" data-act="proof" alt="Proof">` : ''}${g._edit && e.type !== 'correction' && !V.has(e.id) ? `<button class="btn ghost sm" data-act="correct" data-id="${e.id}">Correct</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><b>${g.ledger.length ? 'No matches' : 'No entries yet'}</b><p class="muted">When the treasurer records a payment, it appears here for every member to see.</p></div>`;
  };
  $('#q').oninput = draw; draw();
}

async function vMembers(g, el) {
  const roleLbl = { treasurer: 'Treasurer', official: 'Official', member: 'Member' };
  el.innerHTML = head(g, 'Members', `${g.members.length}${g.snapshot || g.demo ? '' : ' of 30 on the free plan'}`) +
    `<div class="row" style="margin-bottom:14px">${g._edit ? '<button class="btn" data-act="addmember">Add member</button>' : ''}${!g.snapshot && !g.demo ? '<button class="btn ghost" data-act="share">Share read-only link</button>' : ''}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Joined</th><th>Status</th><th class="right">Paid</th></tr></thead><tbody>${g.members.map(m => `<tr><td><b>${esc(m.name)}</b>${m.phone ? `<div class="muted small">+${esc(m.phone)}</div>` : ''}</td>
    <td>${g._edit && m.role !== 'treasurer' ? `<select data-act="role" data-id="${m.id}" style="width:auto;padding:5px 8px"><option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option><option value="official" ${m.role === 'official' ? 'selected' : ''}>Official</option></select>` : roleLbl[m.role]}</td>
    <td>${fmtDate(m.joined)}</td><td>${badgeFor(g, m)}</td><td class="right">${rand(paidBy(g, m.id))}</td></tr>`).join('')}</tbody></table></div>`;
}

async function vClaims(g, el) {
  const officials = g.members.filter(m => m.role === 'official');
  const label = { member: 'Member', spouse: 'Spouse', child: 'Child', parent: 'Parent' };
  el.innerHTML = head(g, 'Claims', 'A family files a claim, two officials approve it, then the treasurer records the payout.') +
    `${!g.snapshot && !g.readonly ? '<p><button class="btn" data-act="addclaim">File a claim</button></p>' : ''}
    ${g.claims.length ? g.claims.slice().reverse().map(c => {
      const m = g.members.find(x => x.id === c.memberId), s = m && memberState(g, m);
      const flags = [s?.waiting ? `<span class="badge wait">Still in waiting period until ${fmtDate(s.coverStart)}</span>` : '', s?.owed > 0 ? `<span class="badge bad">Owes ${rand(s.owed)}</span>` : ''].join(' ');
      const needs = Math.min(2, Math.max(officials.length, 1));
      return `<div class="card"><div class="row sb"><b>${esc(c.deceased)}</b><span class="badge ${c.status === 'paid' ? '' : c.status === 'rejected' ? 'bad' : 'wait'}">${c.status}</span></div>
        <p class="muted small" style="margin:.3em 0">${label[c.who]} of ${esc(mname(g, c.memberId))} · ${rand(c.amount)} · filed ${fmtDate(c.filed)}</p><div>${flags}</div>
        <p class="small" style="margin:.7em 0 0">Approvals: <b>${c.approvals.length} of ${needs}</b>${c.approvals.length ? ` (${c.approvals.map(esc).join(', ')})` : ''}</p>
        ${g._edit && c.status === 'pending' ? `<div class="row" style="margin-top:10px"><select id="ap-${c.id}" style="width:auto">${officials.filter(o => !c.approvals.includes(o.name)).map(o => `<option>${esc(o.name)}</option>`).join('') || '<option value="">No officials left</option>'}</select><button class="btn sm" data-act="approve" data-id="${c.id}">Approve as official</button><button class="btn ghost sm" data-act="reject" data-id="${c.id}">Reject</button></div>` : ''}
        ${g._edit && c.status === 'approved' ? `<div class="row" style="margin-top:10px"><button class="btn gold sm" data-act="payout" data-id="${c.id}">Record payout of ${rand(c.amount)}</button></div>` : ''}</div>`;
    }).join('') : '<div class="empty"><b>No open claims</b><p class="muted">Claims will appear here.</p></div>'}
    ${g._edit && officials.length < 2 ? '<p class="note muted">Tip: make at least two members “Official” in Members so claims can be approved.</p>' : ''}`;
}

async function vArrears(g, el) {
  const list = g.members.map(m => ({ m, s: memberState(g, m) })).filter(x => x.s.owed > 0).sort((a, b) => b.s.owed - a.s.owed);
  el.innerHTML = head(g, 'Arrears', 'Who owes what, after grace days.') + (list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Behind</th><th class="right">Owes</th><th></th></tr></thead><tbody>${list.map(({ m, s }) => {
    const msg = `Hi ${m.name.split(' ')[0]}, a friendly reminder from ${g.name}: your contributions are ${s.monthsBehind} month${s.monthsBehind > 1 ? 's' : ''} behind (${rand(s.owed)}). Please pay and send your proof to the treasurer. Thank you 🙏`;
    return `<tr><td><b>${esc(m.name)}</b></td><td>${s.monthsBehind} month${s.monthsBehind > 1 ? 's' : ''}</td><td class="right"><b>${rand(s.owed)}</b></td><td>${g._edit && m.phone ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/${m.phone}?text=${encodeURIComponent(msg)}">WhatsApp</a>` : ''}</td></tr>`;
  }).join('')}</tbody></table></div>` : '<div class="empty"><b>Everyone is up to date</b><p class="muted">No reminders needed right now.</p></div>');
}

async function vStatements(g, el) {
  const first = g.ledger[0] ? new Date(g.ledger[0].ts) : new Date(), months = [];
  for (let d = new Date(new Date().getFullYear(), new Date().getMonth(), 1); d >= new Date(first.getFullYear(), first.getMonth(), 1) && months.length < 36; d = addMonths(d, -1)) months.push(new Date(d));
  const defM = g.members.find(m => m.id === g.meId) || g.members.find(m => db.user && m.phone === db.user.phone) || g.members[0];
  el.innerHTML = head(g, 'Statements', 'Download for the AGM, or to share with a member.') +
    `<div class="card"><h3>Monthly member statement</h3><div class="form2"><div><label>Member</label><select id="sm">${g.members.map(m => `<option value="${m.id}" ${m.id === defM.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>
    <div><label>Month</label><select id="mo">${months.map(d => `<option value="${d.getFullYear()}-${d.getMonth()}">${d.toLocaleString('en-ZA', { month: 'long', year: 'numeric' })}</option>`).join('')}</select></div></div>
    <div class="row" style="margin-top:14px"><button class="btn" data-act="stmt" data-k="pdf">PDF</button><button class="btn ghost" data-act="stmt" data-k="csv">CSV</button></div></div>
    <div class="card"><h3>Full group ledger</h3><p class="muted small">${g.ledger.length} entries, including corrections.</p><div class="row"><button class="btn" data-act="full" data-k="pdf">PDF</button><button class="btn ghost" data-act="full" data-k="csv">CSV</button></div></div>`;
}

async function vActivity(g, el) {
  el.innerHTML = head(g, 'Activity', 'Who added, approved or paid what, and when.') + `<div class="timeline">${[...g.activity].reverse().map(a => `<div class="ev">${esc(a.text)}<div class="muted small">${fmtDT(a.ts)}</div></div>`).join('')}</div>
  <h3 style="margin-top:28px">How the book protects itself</h3><p class="muted small">Each ledger entry stores a fingerprint of the one before it. The latest fingerprint is:</p><p class="chain">${g.ledger.length ? g.ledger[g.ledger.length - 1].hash : 'No entries yet'}</p><p class="muted small">Read it out at meetings. If anyone alters an old entry, the fingerprints stop matching.</p>`;
}

async function vRules(g, el) {
  const r = g.rules, ed = g._edit;
  el.innerHTML = head(g, 'Rules', 'Set once. Sisonke applies them for you. Every change is logged.') +
    `<form id="rf" class="card"><div class="form2"><div><label>Monthly contribution (R)</label><input name="contribution" type="number" min="0" step="1" value="${r.contribution}" ${ed ? '' : 'disabled'}></div>
    <div><label>Due day of month (1–28)</label><input name="dueDay" type="number" min="1" max="28" value="${r.dueDay}" ${ed ? '' : 'disabled'}></div>
    <div><label>Grace days</label><input name="graceDays" type="number" min="0" value="${r.graceDays}" ${ed ? '' : 'disabled'}></div>
    <div><label>Waiting period (months)</label><input name="waitMonths" type="number" min="0" value="${r.waitMonths}" ${ed ? '' : 'disabled'}></div></div>
    ${g.type === 'burial' ? `<h4 style="margin-top:20px">Cover amounts (R)</h4><div class="form2">${[['member', 'Member'], ['spouse', 'Spouse'], ['child', 'Child'], ['parent', 'Parent']].map(c => `<div><label>${c[1]}</label><input name="c_${c[0]}" type="number" min="0" value="${r.cover[c[0]]}" ${ed ? '' : 'disabled'}></div>`).join('')}</div>` : ''}
    ${ed ? '<p style="margin-top:18px"><button class="btn">Save rules</button></p>' : ''}</form>
    ${ed ? `<div class="card"><h4>Danger zone</h4><p class="muted small">Export a backup of everything on this group, or remove it from this device.</p><div class="row"><button class="btn ghost sm" data-act="backup">Download backup</button><button class="btn danger sm" data-act="delgroup">Remove group</button></div></div>` : ''}`;
  if (ed) $('#rf').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target), n = { contribution: +f.get('contribution'), dueDay: +f.get('dueDay'), graceDays: +f.get('graceDays'), waitMonths: +f.get('waitMonths'), cover: { ...r.cover } };
    for (const k of ['member', 'spouse', 'child', 'parent']) if (f.has('c_' + k)) n.cover[k] = +f.get('c_' + k);
    const ch = []; for (const k of ['contribution', 'dueDay', 'graceDays', 'waitMonths']) if (n[k] !== r[k]) ch.push(`${k} ${r[k]} → ${n[k]}`);
    for (const k in n.cover) if (n.cover[k] !== r.cover[k]) ch.push(`cover ${k} ${r.cover[k]} → ${n.cover[k]}`);
    g.rules = n; if (ch.length) log(g, 'Rules changed: ' + ch.join(', ')); save(); toast('Rules saved'); vRules(g, el);
  };
}

/* ---------- dialogs ---------- */
function dialog(html) {
  const d = document.createElement('dialog'); d.innerHTML = `<div class="in">${html}</div>`; document.body.appendChild(d);
  d.addEventListener('close', () => d.remove()); d.addEventListener('click', e => { if (e.target === d) d.close(); }); d.showModal(); return d;
}
const refresh = () => groupView(cur.g, cur.tab);
async function fileToProof(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const s = Math.min(1, 720 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .6);
}

/* ---------- statements ---------- */
function stmtData(g, mid, y, mo) {
  const from = new Date(y, mo, 1), to = new Date(y, mo + 1, 1), eff = effects(g).filter(x => x.memberId === mid);
  const when = x => new Date(x.e.paid ? x.e.paid + 'T12:00' : x.e.ts);
  const opening = eff.filter(x => when(x) < from).reduce((a, x) => a + x.contrib, 0);
  const lines = eff.filter(x => when(x) >= from && when(x) < to && (x.contrib || x.payout));
  const closing = opening + lines.reduce((a, x) => a + x.contrib, 0);
  return { opening, lines, closing, m: g.members.find(m => m.id === mid), s: memberState(g, g.members.find(m => m.id === mid)) };
}
function printHTML(title, body) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0'; document.body.appendChild(f);
  f.srcdoc = `<html><head><title>${esc(title)}</title><style>body{font:14px system-ui;color:#1f2a24;padding:28px}h1{font:600 24px Georgia;color:#234e3c;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #ddd}.r{text-align:right}small{color:#666}.s{display:flex;gap:30px;margin:18px 0}</style></head><body>${body}<p><small>Generated by Sisonke on ${fmtDT(new Date())}. Sisonke keeps records; it does not hold or transfer money.</small></p></body></html>`;
  f.onload = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 4000); };
}

/* ---------- actions ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act, g = cur.g;
  if (act === 'signout') { if (confirm('Sign out? Your groups stay on this device.')) { delete db.user; save(); location.hash = '#/'; } }
  else if (act === 'proof') { dialog(`<img src="${t.src}" style="width:100%;border-radius:8px"><p><button class="btn ghost" onclick="this.closest('dialog').close()">Close</button></p>`); }
  else if (act === 'addpay') {
    const d = dialog(`<h3>Record payment</h3><form><label>Member</label><select name="m">${g.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select>
      <div class="form2"><div><label>Amount (R)</label><input name="a" type="number" min="1" step="0.01" value="${g.rules.contribution}" required></div><div><label>Paid on</label><input name="p" type="date" value="${iso(new Date())}" max="${iso(new Date())}" required></div></div>
      <label>Note (optional)</label><input name="n" placeholder="Cash, EFT reference…"><label>Photo of proof (optional)</label><input name="f" type="file" accept="image/*">
      <p class="row"><button class="btn">Save entry</button><button type="button" class="btn ghost" onclick="this.closest('dialog').close()">Cancel</button></p><p class="muted small">Once saved, an entry can only be corrected, never deleted.</p></form>`);
    $('form', d).onsubmit = async ev => {
      ev.preventDefault(); const f = new FormData(ev.target); let proof = null; const file = f.get('f'); if (file && file.size) proof = await fileToProof(file);
      const en = await addEntry(g, { type: 'contribution', memberId: f.get('m'), amount: f.get('a'), paid: f.get('p'), note: f.get('n'), proof });
      log(g, `${db.user.name} recorded ${rand(en.amount)} from ${mname(g, en.memberId)}`); save(); d.close(); toast('Payment recorded'); refresh();
    };
  }
  else if (act === 'correct') {
    const en = g.ledger.find(x => x.id === t.dataset.id);
    const d = dialog(`<h3>Correct this entry</h3><p>${rand(en.amount)} ${en.type} for <b>${esc(mname(g, en.memberId))}</b> will be reversed by a visible correction. The original stays in the book.</p><form><label>Why?</label><input name="n" required placeholder="e.g. Typed wrong amount">
      <label style="display:flex;gap:8px;font-weight:400"><input type="checkbox" name="re" checked style="width:auto"> Then record the correct amount</label><label>Correct amount (R)</label><input name="a" type="number" min="0" step="0.01" value="${en.amount}">
      <p class="row"><button class="btn danger">Reverse entry</button><button type="button" class="btn ghost" onclick="this.closest('dialog').close()">Cancel</button></p></form>`);
    $('form', d).onsubmit = async ev => {
      ev.preventDefault(); const f = new FormData(ev.target);
      await addEntry(g, { type: 'correction', memberId: en.memberId, amount: en.amount, ref: en.id, note: f.get('n') });
      if (f.get('re') && +f.get('a') > 0) await addEntry(g, { type: en.type, memberId: en.memberId, amount: f.get('a'), paid: en.paid, note: 'Corrected entry. ' + f.get('n') });
      log(g, `${db.user.name} corrected a ${rand(en.amount)} entry for ${mname(g, en.memberId)}: ${f.get('n')}`); save(); d.close(); toast('Correction recorded'); refresh();
    };
  }
  else if (act === 'addmember') {
    if (g.members.length >= 30) return toast('The free plan holds up to 30 members.');
    const d = dialog(`<h3>Add member</h3><form><label>Full name</label><input name="n" required><label>Mobile number</label><input name="p" inputmode="tel" placeholder="082 123 4567"><label>Joined on</label><input name="j" type="date" value="${iso(new Date())}" max="${iso(new Date())}">
      <p class="row"><button class="btn">Add</button><button type="button" class="btn ghost" onclick="this.closest('dialog').close()">Cancel</button></p></form>`);
    $('form', d).onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target); g.members.push({ id: uid(), name: f.get('n').trim(), phone: phoneNorm(f.get('p')), role: 'member', joined: new Date(f.get('j') + 'T08:00').toISOString() }); log(g, `${db.user.name} added ${f.get('n').trim()}`); save(); d.close(); refresh(); };
  }
  else if (act === 'share') {
    const s = await encodeSnap(g), url = location.origin + location.pathname + '#/s/' + s;
    const d = dialog(`<h3>Share read-only link</h3><p class="muted small">Anyone with this link can see names, payments and balances as they are today. Phone numbers and photos are left out. Share it only in your group’s chat. Make a fresh one after new payments.</p><textarea rows="4" readonly>${esc(url)}</textarea>
      <p class="row"><button class="btn" id="cp">Copy link</button><a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(g.name + ' – the book as of ' + fmtDate(new Date()) + ': ' + url)}">Send on WhatsApp</a></p>`);
    $('#cp', d).onclick = () => { navigator.clipboard?.writeText(url).then(() => toast('Link copied')); };
  }
  else if (act === 'addclaim') {
    const d = dialog(`<h3>File a claim</h3><form><label>Member the claim is under</label><select name="m">${g.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select>
      <label>Who passed away</label><select name="w"><option value="member">The member</option><option value="spouse">Spouse</option><option value="child">Child</option><option value="parent">Parent</option></select>
      <label>Name of the person</label><input name="d" required><p class="muted small">Cover amount comes from your Rules.</p><p class="row"><button class="btn">File claim</button><button type="button" class="btn ghost" onclick="this.closest('dialog').close()">Cancel</button></p></form>`);
    $('form', d).onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target); g.claims.push({ id: uid(), memberId: f.get('m'), who: f.get('w'), deceased: f.get('d').trim(), amount: g.rules.cover[f.get('w')] || 0, status: 'pending', approvals: [], filed: new Date().toISOString() }); log(g, `A claim was filed for ${mname(g, f.get('m'))} (${f.get('d').trim()})`); save(); d.close(); refresh(); };
  }
  else if (act === 'approve') {
    const c = g.claims.find(x => x.id === t.dataset.id), who = $('#ap-' + c.id)?.value; if (!who) return toast('Add officials in Members first.');
    c.approvals.push(who); log(g, `${who} approved the claim for ${mname(g, c.memberId)}`, who);
    const need = Math.min(2, g.members.filter(m => m.role === 'official').length || 1); if (c.approvals.length >= need) { c.status = 'approved'; log(g, `Claim for ${mname(g, c.memberId)} fully approved`); }
    save(); refresh();
  }
  else if (act === 'reject') { const c = g.claims.find(x => x.id === t.dataset.id); c.status = 'rejected'; log(g, `Claim for ${mname(g, c.memberId)} was rejected`); save(); refresh(); }
  else if (act === 'payout') {
    const c = g.claims.find(x => x.id === t.dataset.id);
    if (!confirm(`Record a payout of ${rand(c.amount)}? Sisonke does not move money; do the payment first.`)) return;
    await addEntry(g, { type: 'payout', memberId: c.memberId, amount: c.amount, note: `Claim: ${c.deceased}` }); c.status = 'paid'; log(g, `${db.user.name} recorded the payout of ${rand(c.amount)} for ${c.deceased}`); save(); refresh();
  }
  else if (act === 'stmt') {
    const mid = $('#sm').value, [y, mo] = $('#mo').value.split('-').map(Number), D = stmtData(g, mid, y, mo), label = new Date(y, mo, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
    if (t.dataset.k === 'csv') download(`statement-${D.m.name.replace(/\s+/g, '-')}-${y}-${mo + 1}.csv`, ['Date,Description,Amount,Running'].concat((() => { let r = D.opening; return D.lines.map(x => { r += x.contrib; return [x.e.paid || iso(x.e.ts), x.e.type + (x.e.note ? ': ' + x.e.note : ''), x.contrib || -x.payout, r].map(csvCell).join(','); }); })()).join('\n'));
    else printHTML(`Statement ${D.m.name} ${label}`, `<h1>${esc(g.name)}</h1><p>Member statement · <b>${esc(D.m.name)}</b> · ${label}</p><div class="s"><div>Opening<br><b>${rand(D.opening)}</b></div><div>Closing<br><b>${rand(D.closing)}</b></div><div>Owing now<br><b>${rand(D.s.owed)}</b></div><div>Cover starts<br><b>${fmtDate(D.s.coverStart)}</b></div></div><table><tr><th>Date</th><th>Description</th><th class="r">Amount</th></tr>${D.lines.map(x => `<tr><td>${fmtDate(x.e.paid || x.e.ts)}</td><td>${x.e.type}${x.e.note ? ' – ' + esc(x.e.note) : ''}</td><td class="r">${rand(x.contrib || -x.payout)}</td></tr>`).join('') || '<tr><td colspan="3">No entries this month.</td></tr>'}</table>`);
  }
  else if (act === 'full') {
    if (t.dataset.k === 'csv') download(`${g.name.replace(/\s+/g, '-')}-ledger.csv`, ['Recorded,Paid on,Member,Type,Amount,Recorded by,Note,Reference,Fingerprint'].concat(g.ledger.map(e => [e.ts, e.paid || '', mname(g, e.memberId), e.type, e.amount, e.by, e.note, e.ref || '', e.hash].map(csvCell).join(','))).join('\n'));
    else printHTML(`${g.name} ledger`, `<h1>${esc(g.name)}</h1><p>Full ledger · ${g.ledger.length} entries · latest fingerprint <small>${g.ledger.length ? g.ledger[g.ledger.length - 1].hash.slice(0, 16) : '–'}</small></p><table><tr><th>Recorded</th><th>Member</th><th>Type</th><th class="r">Amount</th><th>By</th></tr>${g.ledger.map(e => `<tr><td>${fmtDT(e.ts)}</td><td>${esc(mname(g, e.memberId))}${e.note ? `<br><small>${esc(e.note)}</small>` : ''}</td><td>${e.type}</td><td class="r">${rand(e.amount)}</td><td>${esc(e.by)}</td></tr>`).join('')}</table>`);
  }
  else if (act === 'backup') download(`${g.name.replace(/\s+/g, '-')}-backup.json`, JSON.stringify(g, null, 1), 'application/json');
  else if (act === 'delgroup') { if (confirm(`Remove “${g.name}” from this device? Download a backup first. This cannot be undone.`)) { db.groups = db.groups.filter(x => x.id !== g.id); save(); location.hash = '#/groups'; } }
});
document.addEventListener('change', e => {
  const t = e.target; if (t.dataset?.act !== 'role') return;
  const m = cur.g.members.find(x => x.id === t.dataset.id); m.role = t.value; log(cur.g, `${db.user.name} made ${m.name} ${t.value === 'official' ? 'an official' : 'a member'}`); save(); toast('Role updated');
});

/* ---------- boot ---------- */
window.addEventListener('load', async () => {
  const t0 = performance.now();
  await route();
  setTimeout(() => $('#splash').classList.add('hide'), Math.max(0, 1100 - (performance.now() - t0)));
  setTimeout(() => $('#splash')?.remove(), 2000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
});
