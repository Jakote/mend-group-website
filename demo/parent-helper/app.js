/* Parent Helper - demonstration prototype. All behaviour is driven by content/content.json. */
(function () {
  'use strict';
  var C = null;            // content
  var lang = 'en';
  var chat = document.getElementById('chat');
  var replies = document.getElementById('replies');
  var input = document.getElementById('msg');
  var safetyEl = document.getElementById('safety');
  var lastFocus = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Localised lookup: returns {text, draft, untranslated}
  function L(obj) {
    if (typeof obj === 'string') return { text: obj };
    if (lang === 'st') {
      if (obj && obj.st) return { text: obj.st, draft: true };
      return { text: obj.en, untranslated: true };
    }
    return { text: obj.en };
  }
  function ui(key) {
    var st = C.ui.st[key], en = C.ui.en[key];
    if (lang === 'st' && st) return { text: st, draft: true };
    return { text: en, untranslated: lang === 'st' };
  }
  function addTag(container, l) {
    if (l.draft) container.appendChild(el('span', 'tag', C.ui.st.draft_tag));
    else if (l.untranslated) container.appendChild(el('span', 'tag untr', C.ui.st.untranslated_tag));
  }

  function scrollDown() { chat.scrollTop = chat.scrollHeight; }

  function botSay(l, step) {
    var m = el('div', 'msg bot');
    m.appendChild(el('p', null, l.text));
    addTag(m, l);
    if (step && step.source_ids && step.source_ids.length) {
      var d = el('details', 'src');
      var s = el('summary', null, ui('source_label').text + ': ' + step.source_ids.map(function (id) { return srcById(id).publisher.split(' ')[0]; }).filter(uniq).join(' + '));
      d.appendChild(s);
      var ul = el('ul');
      step.source_ids.forEach(function (id) {
        var src = srcById(id), li = el('li');
        var a = el('a', null, src.title);
        a.href = src.url; a.target = '_blank'; a.rel = 'noopener';
        li.appendChild(a);
        li.appendChild(document.createTextNode(' - ' + src.publisher));
        ul.appendChild(li);
      });
      var det = el('li', null, step.source_detail);
      ul.appendChild(det);
      d.appendChild(ul);
      d.appendChild(el('span', 'status', 'Review status: ' + step.review_status));
      m.appendChild(d);
      m.setAttribute('data-step', step.id);
    }
    chat.appendChild(m);
    scrollDown();
    return m;
  }
  function userSay(text) {
    var m = el('div', 'msg user');
    m.appendChild(el('p', null, text));
    chat.appendChild(m);
    scrollDown();
  }
  function uniq(v, i, a) { return a.indexOf(v) === i; }
  function srcById(id) {
    for (var i = 0; i < C.sources.length; i++) if (C.sources[i].id === id) return C.sources[i];
    throw new Error('Unknown source id ' + id);
  }
  function flowById(id) {
    for (var i = 0; i < C.flows.length; i++) if (C.flows[i].id === id) return C.flows[i];
    return null;
  }

  function setReplies(list) {
    replies.innerHTML = '';
    list.forEach(function (r) {
      var b = el('button', r.danger ? 'danger' : null, r.label);
      b.type = 'button';
      if (r.id) b.setAttribute('data-id', r.id);
      b.addEventListener('click', function () { userSay(r.label); r.go(); });
      replies.appendChild(b);
    });
  }

  function showMenu(intro) {
    botSay(intro || ui('menu_prompt'));
    var list = C.flows.map(function (f) {
      return { id: 'flow-' + f.id, label: L(f.title).text, go: function () { startFlow(f.id); } };
    });
    list.push({ id: 'help', label: ui('help_now').text, danger: true, go: function () { openSafety(null); } });
    setReplies(list);
  }

  function startFlow(id) { var f = flowById(id); showStep(f, f.steps[0].id); }

  function showStep(flow, stepId) {
    var step = null;
    for (var i = 0; i < flow.steps.length; i++) if (flow.steps[i].id === stepId) step = flow.steps[i];
    if (!step) throw new Error('Missing step ' + stepId);
    botSay(L(step.text), step);
    var opts = [];
    if (step.options) {
      step.options.forEach(function (o) {
        opts.push({ id: 'opt-' + o.next, label: L(o.label).text, danger: o.next.indexOf('@safety') === 0, go: function () { route(flow, o.next); } });
      });
    } else if (step.next === '@end') {
      botSay(ui('end_of_flow'));
      return showMenuButtons();
    } else {
      opts.push({ id: 'next', label: (lang === 'st' ? 'E latelang' : 'Next tip') + ' \u203A', go: function () { route(flow, step.next); } });
      opts.push({ id: 'menu', label: ui('menu_button').text, go: function () { showMenu(); } });
    }
    setReplies(opts);
  }

  function showMenuButtons() {
    var list = C.flows.map(function (f) {
      return { id: 'flow-' + f.id, label: L(f.title).text, go: function () { startFlow(f.id); } };
    });
    list.push({ id: 'help', label: ui('help_now').text, danger: true, go: function () { openSafety(null); } });
    setReplies(list);
  }

  function route(flow, next) {
    if (next === '@menu') return showMenu();
    if (next === '@end') { botSay(ui('end_of_flow')); return showMenuButtons(); }
    if (next.indexOf('@safety:') === 0) return openSafety(next.slice(8));
    showStep(flow, next);
  }

  // ---------- free-text understanding ----------
  function normalise(t) {
    return ' ' + t.toLowerCase().replace(/[\u2018\u2019\u02bc`]/g, "'").replace(/[^a-z0-9' \-]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }
  var compiled = [];
  function compileSafety() {
    compiled = C.safety.categories.map(function (c) {
      return { id: c.id, res: c.patterns.map(function (p) { return new RegExp(p, 'i'); }) };
    });
  }
  // Exposed for tests: returns safety category id or null
  function detectSafety(text) {
    var n = normalise(text);
    for (var i = 0; i < compiled.length; i++) {
      for (var j = 0; j < compiled[i].res.length; j++) if (compiled[i].res[j].test(n)) return compiled[i].id;
    }
    return null;
  }
  function matchFlow(text) {
    var n = normalise(text), best = null, bestScore = 0;
    C.flows.forEach(function (f) {
      var score = 0;
      f.keywords.forEach(function (k) {
        var re = new RegExp('(^|[^a-z0-9])' + k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)');
        if (re.test(n)) score += k.indexOf(' ') > -1 ? 2 : 1;
      });
      if (score > bestScore) { bestScore = score; best = f; }
    });
    return best;
  }
  function handleText(text) {
    text = text.trim();
    if (!text) return;
    userSay(text);
    var cat = detectSafety(text);           // SAFETY FIRST - always checked before anything else
    if (cat) return openSafety(cat);
    var f = matchFlow(text);
    if (f) return startFlow(f.id);
    botSay(ui('not_understood'));
    showMenuButtons();
  }

  // ---------- safety / referral screen ----------
  function openSafety(catId) {
    var cat = null;
    C.safety.categories.forEach(function (c) { if (c.id === catId) cat = c; });
    var order = cat ? cat.contacts_order : ['emergency', 'child-helpline', 'police-cgpu', 'mosd-social-worker'];
    var S = C.safety.screen;
    var title = L(S.title), body = L(S.body);
    document.getElementById('safetyTitle').textContent = title.text;
    document.getElementById('safetyBody').textContent = body.text;
    var en = document.getElementById('safetyBodyEn'), dr = document.getElementById('safetyDraft');
    // In Sesotho mode, the English original is always shown too: a mistranslation here could cost a child.
    en.hidden = !body.draft; en.textContent = 'English: ' + S.title.en + '. ' + S.body.en;
    dr.hidden = !body.draft; dr.textContent = C.ui.st.draft_tag; dr.className = 'tag';
    var ul = document.getElementById('safetyContacts');
    ul.innerHTML = '';
    order.forEach(function (cid) {
      var c = null;
      C.contacts.forEach(function (x) { if (x.id === cid) c = x; });
      if (!c) return;
      var li = el('li'); li.setAttribute('data-contact', c.id); li.setAttribute('data-status', c.status);
      li.appendChild(el('div', 'cname', L(c.name).text));
      li.appendChild(el('div', 'cdesc', L(c.description).text));
      if (c.status === 'verified' && c.number) {
        var a = el('a', 'call', (lang === 'st' ? 'Letsetsa ' : 'Call ') + c.number);
        a.href = 'tel:' + c.number;
        li.appendChild(a);
        li.appendChild(el('div', 'verified', 'Verified ' + c.verified_on + ' from official source: ' + c.verified_from[0]));
      } else {
        li.appendChild(el('span', 'unconf', L(S.unconfirmed_label).text));
      }
      ul.appendChild(li);
    });
    document.getElementById('safetyPrivacy').textContent = L(S.privacy).text;
    document.getElementById('safetyBack').textContent = L(S.back).text;
    safetyEl.setAttribute('data-category', catId || 'manual');
    lastFocus = document.activeElement;
    safetyEl.hidden = false;
    document.getElementById('safetyTitle').setAttribute('tabindex', '-1');
    document.getElementById('safetyTitle').focus();
    setReplies([]);
  }
  function closeSafety() {
    safetyEl.hidden = true;
    showMenu();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---------- language ----------
  function applyChrome() {
    document.documentElement.lang = lang === 'st' ? 'st' : 'en';
    document.getElementById('appName').textContent = ui('app_name').text;
    document.getElementById('appStatus').textContent = ui('status').text + (lang === 'st' ? ' \u00B7 draft translation' : '');
    document.getElementById('langBtn').textContent = ui('lang_toggle').text;
    document.getElementById('helpNowBtn').textContent = ui('help_now').text;
    input.placeholder = ui('input_placeholder').text;
    document.getElementById('sendBtn').textContent = ui('send').text;
  }
  function toggleLang() {
    lang = lang === 'en' ? 'st' : 'en';
    applyChrome();
    botSay(ui('welcome'));
    showMenu();
  }

  // ---------- boot ----------
  window.loadContent().then(function (content) {
    C = content;
    compileSafety();
    applyChrome();
    document.getElementById('langBtn').addEventListener('click', toggleLang);
    document.getElementById('helpNowBtn').addEventListener('click', function () { openSafety(null); });
    document.getElementById('safetyBack').addEventListener('click', closeSafety);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !safetyEl.hidden) closeSafety(); });
    document.getElementById('composer').addEventListener('submit', function (e) {
      e.preventDefault(); var t = input.value; input.value = ''; handleText(t);
    });
    botSay(ui('welcome'));
    showMenu();
    window.__demo = { detectSafety: detectSafety, matchFlow: function (t) { var f = matchFlow(t); return f && f.id; }, send: handleText, loadedFrom: C.__loadedFrom };
    document.body.setAttribute('data-ready', '1');
  }).catch(function (err) {
    chat.textContent = 'Could not load content: ' + err.message + '. If a child is in danger in Lesotho, call the Child Helpline on 116 or the National Emergency Line on 112.';
  });
})();
