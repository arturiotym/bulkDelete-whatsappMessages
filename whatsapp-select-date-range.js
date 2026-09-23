/* WhatsApp Web, locale-aware selection. Paste this file into the console once.
 * Then run: await waSelectRange({start:'14/09/2026', end:'22/09/2026'})
 * Selects messages only, including both endpoint dates. Never clicks Delete.
 * Stop: waSelectRange.stop()
 * Keep the chat open and do not interact with it while the script runs.
 */
(() => {
  'use strict';
  const ROW = '[data-testid^="conv-msg-"][data-id]';
  const BOX = 'input[type="checkbox"][aria-checked]';
  const PANEL = '[data-testid="conversation-panel-messages"]';
  const DAY = 86400000;
  const clean = s => String(s || '').normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  function ordinal(y, m, d) {
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
      throw new Error('Invalid calendar date.');
    return date.getTime() / DAY;
  }
  function parseDate(value) {
    const s = String(value || '').trim();
    let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return ordinal(+m[3], +m[2], +m[1]);
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return ordinal(+m[1], +m[2], +m[3]);
    throw new Error('Use DD/MM/YYYY or YYYY-MM-DD.');
  }
  function makeLocale({ locale, dateOrder, today, samples = [], dayLabels = {} }) {
    if (!locale) throw new Error('UI language is missing. Supply locale, e.g. en-US or en-GB.');
    const loc = new Intl.Locale(locale.replace(/_/g, '-'));
    if (!Intl.DateTimeFormat.supportedLocalesOf([loc.baseName]).length)
      throw new Error(`Browser does not support locale ${locale}.`);
    const digitMap = new Map();
    // Include common digit scripts even when a browser's Intl defaults to Latin digits.
    for (const zero of [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6,
      0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xed0, 0xff10])
      for (let i = 0; i < 10; i++) digitMap.set(String.fromCodePoint(zero + i), String(i));
    const nf = new Intl.NumberFormat(loc.baseName, { useGrouping: false });
    for (let i = 0; i < 10; i++) digitMap.set(clean(nf.format(i)), String(i));
    const normalize = s => [...clean(s)].map(c => digitMap.get(c) ?? c).join('');
    const fmt = opts => new Intl.DateTimeFormat(loc.baseName,
      { ...opts, calendar: 'gregory', timeZone: 'UTC' });
    const probe = new Date(Date.UTC(2026, 10, 23));
    const defaultOrder = fmt({ year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(probe).filter(p => ['year', 'month', 'day'].includes(p.type))
      .map(p => ({year:'Y', month:'M', day:'D'})[p.type]).join('');
    if (dateOrder && !['DMY', 'MDY', 'YMD'].includes(dateOrder))
      throw new Error('dateOrder must be DMY, MDY, or YMD.');
    const numericRE = /(\d{1,4})\s*([/.-])\s*(\d{1,2})\s*\2\s*(\d{1,4})/g;
    const evidence = new Set();
    for (const sample of samples) {
      for (const m of normalize(sample).matchAll(numericRE)) {
        if (m[1].length === 4) evidence.add('YMD');
        else if (+m[1] > 12 && +m[1] <= 31 && +m[3] <= 12) evidence.add('DMY');
        else if (+m[3] > 12 && +m[3] <= 31 && +m[1] <= 12) evidence.add('MDY');
      }
    }
    // ISO date strings do not establish the order of slash/dot dates elsewhere.
    const nonISO = [...evidence].filter(o => o !== 'YMD');
    if (nonISO.length > 1) throw new Error('Conflicting day/month order in the visible dates.');
    if (dateOrder && nonISO.length && dateOrder !== nonISO[0])
      throw new Error('dateOrder conflicts with visible UI dates.');
    let order = dateOrder || nonISO[0] || (loc.region ? defaultOrder : null);
    const thisYear = new Date(today * DAY).getUTCFullYear();
    const yearValue = value => {
      const y = Number(value);
      const full = String(value).length <= 2 ? 2000 + y : y;
      if (full < 2009 || full > thisYear + 1)
        throw new Error('Unsupported UI year/calendar. Only Gregorian WhatsApp dates are supported.');
      return full;
    };
    function numericDate(text, partial = false) {
      const s = normalize(text);
      const asian = s.match(/^(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日?$/);
      if (asian) return ordinal(yearValue(asian[1]), +asian[2], +asian[3]);
      const matches = [...s.matchAll(numericRE)];
      if (matches.length !== 1) return null;
      const m = matches[0];
      if (!partial && m[0] !== s && m[0] !== s.replace(/\.$/, '').trim()) return null;
      const a = m[1], b = m[3], c = m[4];
      if (a.length === 4) return ordinal(yearValue(a), +b, +c);
      let observed = null;
      if (+a > 12 && +a <= 31 && +b <= 12) observed = 'DMY';
      else if (+b > 12 && +b <= 31 && +a <= 12) observed = 'MDY';
      if (observed && order && observed !== order)
        throw new Error('UI date order changed or conflicts with the configured locale.');
      if (observed && !order) order = observed;
      if (!order) throw new Error(`Ambiguous UI date ${m[0]}. Supply dateOrder: "DMY" or "MDY", or a regional locale.`);
      if (order === 'YMD') return ordinal(yearValue(a), +b, +c);
      return ordinal(yearValue(c), +(order === 'DMY' ? b : a), +(order === 'DMY' ? a : b));
    }
    const labels = new Map();
    const relative = new Intl.RelativeTimeFormat(loc.baseName, { numeric: 'auto' });
    for (const delta of [0, -1, -2]) labels.set(normalize(relative.format(delta, 'day')), today + delta);
    for (let i = 0; i < 7; i++) {
      const date = new Date((today - i) * DAY);
      for (const width of ['long', 'short']) labels.set(normalize(fmt({ weekday: width }).format(date)), today - i);
    }
    for (const [label, inputDate] of Object.entries(dayLabels)) labels.set(normalize(label), parseDate(inputDate));
    // Match localized month names using Intl's grammar, without Date.parse heuristics.
    const patterns = [];
    const escapeRE = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const month of ['short', 'long']) {
      const df = fmt({ day: 'numeric', month, year: 'numeric' });
      const names = new Map();
      for (let i = 0; i < 12; i++) {
        const name = df.formatToParts(new Date(Date.UTC(2026, i, 23))).find(p => p.type === 'month').value;
        names.set(normalize(name), i + 1);
      }
      const fields = [];
      const pattern = df.formatToParts(probe).map(p => {
        if (p.type === 'day' || p.type === 'year') { fields.push(p.type); return '(\\d{1,4})'; }
        if (p.type === 'month') { fields.push('month'); return '(' + [...names.keys()].map(escapeRE).join('|') + ')'; }
        return escapeRE(normalize(p.value)).replace(/ /g, '\\s*');
      }).join('\\s*');
      patterns.push({ re: new RegExp('^' + pattern + '$', 'u'), fields, names });
    }
    function absoluteDate(text) {
      const numeric = numericDate(text);
      if (numeric !== null) return numeric;
      const s = normalize(text);
      for (const {re, fields, names} of patterns) {
        const m = s.match(re);
        if (m) {
          const values = Object.fromEntries(fields.map((key, i) => [key, m[i + 1]]));
          return ordinal(yearValue(values.year), names.get(values.month), +values.day);
        }
      }
      return null;
    }
    const labelDate = text => labels.get(normalize(text)) ?? absoluteDate(text);
    const stampDate = text => {
      const prefix = String(text || '').match(/^\[([^\]]+)\]/)?.[1];
      if (!prefix) return null;
      return numericDate(prefix, true);
    };
    return { locale: loc.baseName, normalize, absoluteDate, labelDate, stampDate, get order() { return order; } };
  }
  function parseCount(text, profile) {
    const s = profile.normalize(text);
    const groups = s.match(/\d(?:[\d.,'’\u066c\s]*\d)?/gu);
    if (!groups || groups.length !== 1 || /[/:-]/.test(s)) return null;
    const value = Number(groups[0].replace(/\D/g, ''));
    return Number.isSafeInteger(value) ? value : null;
  }
  function readMessages(panel, profile, dateCache = new Map()) {
    let day = null;
    let precedingLabel = null;
    const rows = [];
    for (const element of panel.querySelectorAll('*')) {
      if (element.matches(ROW)) {
        const pre = element.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text');
        const explicitDay = profile.stampDate(pre);
        if (day !== null && explicitDay !== null && day !== explicitDay)
          throw new Error('Message timestamp and day separator disagree. Selection stopped.');
        if (explicitDay !== null) day = explicitDay;
        const box = element.querySelector(BOX);
        const id = element.getAttribute('data-id');
        const resolved = explicitDay ?? day ?? dateCache.get(id) ?? null;
        if (resolved !== null) {
          if (dateCache.has(id) && dateCache.get(id) !== resolved)
            throw new Error('A previously verified message date changed. Selection stopped.');
          dateCache.set(id, resolved);
        }
        rows.push({ id, day: resolved, precedingLabel,
          rendered: Boolean(element.querySelector('[data-testid="msg-container"]')),
          checked: box?.getAttribute('aria-checked') === 'true', box, element });
      } else if (!element.children.length && !element.closest(ROW)) {
        // Do not carry a date across an unrecognized separator or system notice.
        if (element.textContent.trim() && !element.closest('svg,script,style')) {
          precedingLabel = element.textContent.trim().slice(0,120);
          day = profile.labelDate(element.textContent);
        }
      }
    }
    return rows;
  }
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let active = null;
  async function run(options = {}) {
    if (active) throw new Error('A range operation is already running.');
    const { start, end, locale = document.documentElement.lang, dateOrder, dayLabels,
      loadOlderSelector = null,
      progressEvery = 1000, delayMs = 75 } = options;
    const from = parseDate(start), to = parseDate(end);
    if (from > to) throw new Error('Start must be on or before end.');
    if (!Number.isInteger(progressEvery) || progressEvery < 1 || !Number.isFinite(delayMs) || delayMs < 0)
      throw new Error('Invalid progressEvery or delayMs.');
    if (location.hostname !== 'web.whatsapp.com') throw new Error('Run this on WhatsApp Web.');
    const main = document.querySelector('#main');
    const title = main?.querySelector('[data-testid="conversation-info-header-chat-title"]');
    if (!main || !title) throw new Error('Open the intended conversation first.');
    const chatName = title.textContent.trim();
    const now = new Date();
    const today = ordinal(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const profile = makeLocale({ locale, dateOrder, dayLabels, today,
      samples: [...main.querySelectorAll('[data-pre-plain-text]')]
        .map(el => el.getAttribute('data-pre-plain-text').match(/^\[[^\]]*\]/)?.[0] || '') });
    const state = { stopped: false, selected: 0, chat: chatName, start, end, phase: 'starting' };
    active = state;
    run.last = state;
    const selected = new Set();
    const audited = new Set();
    const dateCache = new Map();
    const visible = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    function guard() {
      if (state.stopped) throw new Error('Stopped. Existing selection was left in place.');
      if (!main.isConnected || document.querySelector('#main') !== main || !title.isConnected ||
          title.textContent.trim() !== chatName) throw new Error('Conversation changed. Stopped.');
    }
    function iconButton(root, icon, selector = 'button,[role="button"]') {
      const matches = [...(root?.querySelectorAll(selector) || [])]
        .filter(el => visible(el) && [...el.querySelectorAll('svg title,[data-icon]')]
          .some(i => (i.getAttribute('data-icon') || i.textContent).trim() === icon));
      if (matches.length > 1) throw new Error(`Ambiguous icon control: ${icon}`);
      return matches[0] || null;
    }
    function toolbar() {
      const matches = [...main.querySelectorAll('[aria-live="polite"]')]
        .map(counter => ({ counter, cancel: iconButton(counter.parentElement, 'ic-close', 'button[data-tab="10"]') }))
        .filter(item => visible(item.counter) && item.cancel);
      if (matches.length > 1) throw new Error('Ambiguous selection toolbar.');
      return matches[0] || null;
    }
    function click(el) {
      guard();
      if (!el || !visible(el) || el.disabled || el.getAttribute('aria-disabled') === 'true')
        throw new Error('Required control is missing or disabled.');
      el.click();
    }
    async function waitFor(test, message, timeout = 15000) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        guard();
        const result = test();
        if (result) return result;
        await sleep(100);
      }
      throw new Error(message);
    }
    function count() {
      const value = parseCount(toolbar()?.counter.textContent || '', profile);
      if (value === null) throw new Error('Cannot read the selected-message count.');
      return value;
    }
    function getRow(id) {
      return main.querySelector(`${ROW}[data-id="${CSS.escape(id)}"]`);
    }
    function stopOnUserInput(event) { if (event.isTrusted) state.stopped = true; }
    document.addEventListener('pointerdown', stopOnUserInput, true);
    document.addEventListener('keydown', stopOnUserInput, true);
    try {
      if ([...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"],#delete-media-file-checkbox')].some(visible))
        throw new Error('A dialog is open. Close it yourself before starting a new range.');
      // Always start with a clean selection, including any off-screen selections.
      const cancel = toolbar()?.cancel;
      if (cancel) {
        click(cancel);
        await waitFor(() => !toolbar(), 'Could not reset selection.');
      }
      const panel = main.querySelector(PANEL);
      if (!panel) throw new Error('Message scroller was not found.');
      const readRows = () => readMessages(panel, profile, dateCache);
      async function recoverDates(initialRows) {
        const missing = initialRows.filter(r => r.rendered && r.day === null);
        if (!missing.length) return initialRows;
        const anchor = initialRows.find(r => r.rendered)?.id;
        console.log('[WhatsApp] Loading earlier context to identify media-message dates...');
        let attempts = 0;
        // Verify by the same message ID, never by assuming the next day's date.
        while (missing.some(r => !dateCache.has(r.id)) && attempts++ < 20) {
          guard();
          panel.scrollBy({ top: -Math.max(100, panel.clientHeight * 0.65), behavior: 'instant' });
          await sleep(600);
          readRows();
        }
        const unresolved = missing.filter(r => !dateCache.has(r.id));
        if (unresolved.length) {
          state.dateDiagnostics = { locale: profile.locale, dateOrder: profile.order,
            unresolved: unresolved.map(r => ({ id: r.id, precedingLabel: r.precedingLabel })) };
          throw new Error(`Could not resolve dates for ${unresolved.length} message(s) after loading earlier context. See waSelectRange.last.dateDiagnostics. No unknown-date messages were selected.`);
        }
        const anchorRow = getRow(anchor);
        if (!anchorRow) throw new Error('Date context recovered, but the original message left the loaded history. Selection stopped; retry from this position.');
        anchorRow.scrollIntoView({ block: 'start', behavior: 'instant' });
        await sleep(450);
        return readRows();
      }
      // Establish the newest end of the chat before walking backward.
      let stable = 0, signature = '';
      for (let i = 0; i < 30 && stable < 3; i++) {
        guard();
        panel.scrollTo({ top: panel.scrollHeight, behavior: 'instant' });
        await sleep(450);
        const last = panel.querySelectorAll(ROW);
        const next = `${last[last.length - 1]?.getAttribute('data-id')}:${panel.scrollHeight}`;
        stable = next === signature && panel.scrollHeight - panel.clientHeight - panel.scrollTop < 5 ? stable + 1 : 0;
        signature = next;
      }
      if (stable < 3) throw new Error('Could not establish the end of the conversation.');
      click(iconButton(main.querySelector('header'), 'ic-more-vert'));
      const menuItem = await waitFor(() => iconButton(document, 'ic-check-box', '[role="menu"] [role="menuitem"]'),
        'Select messages icon was not found.');
      click(menuItem);
      await waitFor(() => toolbar(), 'Selection mode did not open.');
      await waitFor(() => count() === 0, 'Existing selection was not cleared.');
      state.phase = 'selecting';
      console.log(`[WhatsApp] ${chatName}: ${start} through ${end}, inclusive.`);
      let boundary = false, stalled = 0, lastFingerprint = '';
      const olderRequests = new Set();
      while (!boundary) {
        guard();
        const rows = await recoverDates(readRows());
        const rendered = rows.filter(r => r.rendered);
        if (!rendered.length) throw new Error('No rendered messages. Selection stopped.');
        // Restoring the viewport may reveal another older row. Recover it next pass.
        if (rendered.some(r => r.day === null)) continue;
        const pending = rendered.filter(r => !audited.has(r.id)).reverse();
        for (const row of pending) {
          guard();
          if (row.day < from || row.day > to) { audited.add(row.id); continue; }
          if (!row.box) throw new Error('An in-range message has no selection checkbox.');
          // Move upward through neighboring messages; never jump over unseen rows.
          row.element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
          await sleep(delayMs);
          const box = getRow(row.id)?.querySelector(BOX);
          if (!box) throw new Error('Message unloaded during selection. Selection stopped.');
          if (box.getAttribute('aria-checked') === 'true' && !selected.has(row.id))
            throw new Error('Unexpected selection change. Selection stopped.');
          if (box.getAttribute('aria-checked') !== 'true') box.click();
          await waitFor(() => getRow(row.id)?.querySelector(BOX)?.getAttribute('aria-checked') === 'true',
            'WhatsApp did not select a message.');
          selected.add(row.id);
          audited.add(row.id);
          state.selected = selected.size;
          if (selected.size % progressEvery === 0) {
            await waitFor(() => count() === selected.size, 'Selection count mismatch.');
            console.log(`[WhatsApp] ${selected.size.toLocaleString()} selected.`);
          }
        }
        // Read again after scrolling caused by selection; newly loaded rows must be processed.
        const fresh = readRows();
        if (fresh.some(r => r.rendered && !audited.has(r.id))) continue;
        const firstOlder = fresh.findLastIndex(r => r.day !== null && r.day < from);
        if (firstOlder >= 0) {
          // Placeholders after the boundary must also have been visited; otherwise keep scrolling.
          boundary = fresh.slice(firstOlder + 1).every(r => audited.has(r.id));
          if (boundary) break;
        }
        const fingerprint = fresh.filter(r => r.rendered).map(r => r.id).join('|');
        stalled = fingerprint === lastFingerprint ? stalled + 1 : 0;
        lastFingerprint = fingerprint;
        if (stalled >= 12) {
          throw new Error('Older history stopped loading before the start boundary. Selection retained; range selection is incomplete.');
        }
        if (panel.scrollTop < 5) {
          // Optional explicit selector; never guess a translated history-loading button.
          const loads = loadOlderSelector ? [...main.querySelectorAll(loadOlderSelector)].filter(visible) : [];
          if (loads.length > 1) throw new Error('loadOlderSelector matched multiple controls.');
          const load = loads[0];
          if (load && !olderRequests.has(fingerprint)) {
            olderRequests.add(fingerprint);
            click(load);
            await sleep(1500);
          }
        }
        panel.scrollBy({ top: -Math.max(100, panel.clientHeight * 0.65), behavior: 'instant' });
        await sleep(450);
      }
      if (!selected.size) {
        state.phase = 'no-matches';
        click(toolbar()?.cancel);
        console.log('[WhatsApp] No messages in the inclusive date range.');
        return { ...state };
      }
      await waitFor(() => count() === selected.size, 'Final selection count mismatch.');
      for (const r of readRows()) {
        if (r.checked && (!selected.has(r.id) || r.day < from || r.day > to))
          throw new Error('Unexpected message selected. Selection stopped.');
      }
      state.phase = 'ready';
      console.log(`[WhatsApp] ${selected.size.toLocaleString()} messages selected (${start}–${end}, inclusive). Review the selection and use WhatsApp yourself for any further action.`);
      return { ...state };
    } catch (error) {
      state.error = error.message;
      state.phase = 'stopped';
      console.error('[WhatsApp]', error.message);
      throw error;
    } finally {
      document.removeEventListener('pointerdown', stopOnUserInput, true);
      document.removeEventListener('keydown', stopOnUserInput, true);
      active = null;
    }
  }
  run.stop = () => { if (active) active.stopped = true; };
  run.isRunning = () => Boolean(active);
  run.version = '1.0.1';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseDate, makeLocale, parseCount, readMessages, run };
  } else {
    const previous = window.waSelectRange;
    if (previous && (previous.isRunning?.() || ['starting','selecting'].includes(previous.last?.phase)))
      throw new Error('The previous selector is running. Stop it and wait before installing this update.');
    window.waSelectRange = run;
    console.log('Installed waSelectRange. Example: await waSelectRange({start:"14/09/2026", end:"22/09/2026"})');
  }
})();
