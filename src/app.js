/* ============================================================
   app.js － 畫面切換、符號認識、主題、繪製頁、PDF 輸出頁
   ============================================================ */
(function (FC) {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = FC.esc;
  const TEACHER = /[?&]teacher=1/.test(location.search);

  /* ---------- localStorage（失敗時安靜略過） ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('fc:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('fc:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  /* ---------- 主題 ---------- */
  const BASIC_TOPICS = [
    { id: 'shopping', title: '網購流程', stars: 1, level: '順序結構',
      scenario: '小美想在網路商店買一件外套。請畫出從「放進購物車」到「拿到商品」的完整流程。',
      hint: '這個流程大約有 5 個步驟：商品放入購物車 → 填寫寄送資料 → 結帳付款 → 貨物配送 → 取得商品。每一步都是「處理程序」，別忘了「開始」和「結束」。',
      expect: { minSteps: 5, stepsHint: '放入購物車、填寄送資料、結帳付款、貨物配送、取得商品' }, sample: () => FC.sample.shopping() },
    { id: 'rain', title: '依天氣決定行程', stars: 2, level: '一個判斷',
      scenario: '週末的行程要看天氣：如果「下雨」，就去圖書館；如果沒下雨，就去打籃球。請畫出這個流程。',
      hint: '「是否下雨」要用「決策判斷」，它有兩條出口：「成立」去圖書館、「不成立」去打籃球。最後兩條路都要連到「結束」。',
      expect: { decision: true, minSteps: 3, stepsHint: '判斷是否下雨、去圖書館、打籃球' }, sample: () => FC.sample.rain() },
    { id: 'login', title: '登入網站', stars: 3, level: '判斷＋重複',
      scenario: '使用者開啟網頁後要輸入帳號、密碼。若輸入正確，會顯示「歡迎畫面」；若輸入錯誤，則回到「輸入帳號、密碼」的步驟。',
      hint: '先想想哪個步驟是「輸入」、哪個是「判斷」。判斷「不成立」時，流向線要連回前面的「輸入帳號密碼」，這樣就形成重複囉。',
      expect: { decision: true, loopBack: true, minSteps: 4, stepsHint: '開啟網頁、輸入帳號密碼、判斷是否正確、顯示歡迎畫面' }, sample: () => FC.sample.login() },
    { id: 'custom', title: '我的自訂主題', stars: 3, level: '自由設計',
      scenario: '從生活中選一件「有步驟」的事，自己設計流程。可以是學校、家裡或興趣裡的情境。',
      hint: '先把事情的步驟用文字寫出來，再想想哪裡需要「判斷」。例如：泡泡麵時「水滾了嗎？」、請假時「有請假單嗎？」。',
      ideas: ['泡泡麵製作流程', '請假流程', '社團報名流程', '早上出門前的準備', '洗衣服流程', '整理書包'],
      expect: {} }
  ];
  FC.TOPICS = BASIC_TOPICS.concat(FC.MAZE_TOPICS);
  const topicById = id => FC.TOPICS.find(t => t.id === id);
  const isMaze = t => !!(t && t.group === 'maze');

  /* ============================================================
     路由
     ============================================================ */
  const VIEWS = ['learn', 'symbols', 'topics', 'draw', 'submit'];
  let current = 'learn';
  let topic = topicById(store.get('lastTopic', '')) || null;

  function route() {
    let h = (location.hash || '#learn').slice(1).split('?')[0];
    if (!VIEWS.includes(h)) h = 'learn';
    if ((h === 'draw' || h === 'submit') && !topic) { h = 'topics'; history.replaceState(null, '', '#topics'); }
    show(h);
  }
  function show(v) {
    current = v;
    VIEWS.forEach(x => $('view-' + x).classList.toggle('on', x === v));
    document.querySelectorAll('#stepper a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
    document.body.dataset.view = v;
    window.scrollTo(0, 0);
    if (v === 'learn') fitStage();
    if (v === 'draw') { openTopicUI(); ed.render(); renderAnalysis(); requestAnimationFrame(fitMazeFrame); }
    if (v === 'submit') { loadInfo(); schedulePreview(0); }
    if (v === 'topics') renderTopics();
  }
  window.addEventListener('hashchange', route);

  /* ============================================================
     ① 課堂講解（簡報）
     ============================================================ */
  let slideIdx = 0, slideN = 0;
  function initSlides() {
    const stage = $('stage');
    stage.innerHTML = FC.slides.map((f, i) => `<section class="slide" data-i="${i}">${f()}</section>`).join('');
    slideN = FC.slides.length;
    slideIdx = Math.min(slideN - 1, Math.max(0, +(sessionStorage.getItem('fc:slide') || 0)));
    $('btnPrev').onclick = () => go(slideIdx - 1);
    $('btnNext').onclick = () => go(slideIdx + 1);
    $('btnFull').onclick = toggleFull;
    $('slideProg').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); go(Math.round((e.clientX - r.left) / r.width * (slideN - 1))); });
    stage.addEventListener('click', e => {
      const b = e.target.closest('[data-toggle]');
      if (b) { const t = $(b.dataset.toggle); if (t) t.classList.toggle('revealed'); }
    });
    /* 觸控滑動換頁 */
    let sx = null, sy = null;
    $('stageWrap').addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { sx = e.clientX; sy = e.clientY; } });
    $('stageWrap').addEventListener('pointerup', e => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(slideIdx + (dx < 0 ? 1 : -1));
    });
    document.addEventListener('keydown', e => {
      if (current !== 'learn') return;
      if (/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return;
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(slideIdx + 1); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(slideIdx - 1); }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(slideN - 1);
      else if (e.key.toLowerCase() === 'f') toggleFull();
    });
    new ResizeObserver(fitStage).observe($('slideArea'));
    document.addEventListener('fullscreenchange', fitStage);
    document.addEventListener('webkitfullscreenchange', fitStage);
    go(slideIdx, true);
  }
  function go(i, silent) {
    i = Math.max(0, Math.min(slideN - 1, i));
    slideIdx = i;
    document.querySelectorAll('#stage .slide').forEach((s, k) => s.classList.toggle('on', k === i));
    $('slideCount').textContent = `${i + 1} / ${slideN}`;
    $('slideProgBar').style.width = ((i + 1) / slideN * 100) + '%';
    $('btnPrev').disabled = i === 0; $('btnNext').disabled = i === slideN - 1;
    try { sessionStorage.setItem('fc:slide', i); } catch (e) { /* ignore */ }
  }
  function fitStage() {
    const area = $('slideArea'), wrap = $('stageWrap');
    if (!area.clientWidth) return;
    const bar = $('slideBar').offsetHeight;
    const aw = area.clientWidth - 24, ah = area.clientHeight - bar - 20;
    const s = Math.max(0.2, Math.min(aw / 1280, ah / 720));
    wrap.style.width = (1280 * s) + 'px'; wrap.style.height = (720 * s) + 'px';
    $('stage').style.transform = `scale(${s})`;
  }
  function toggleFull() {
    const el = $('slideArea');
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
  }

  /* ============================================================
     ② 認識符號
     ============================================================ */
  function initSymbols() {
    const order = ['start', 'end', 'io', 'process', 'decision', 'arrow', 'loop', 'sub', 'doc', 'note'];
    $('symCards').innerHTML = order.map(t => {
      const S = FC.SYM[t];
      return `<article class="sym-card" style="--c:${S.stroke}">
        <div class="sc-icon">${FC.icon(t, { w: t === 'arrow' ? 130 : 130, h: t === 'decision' ? 74 : t === 'arrow' ? 34 : t === 'doc' ? 58 : 54 })}</div>
        <h3>${S.name}</h3><p class="sc-desc">${S.desc}</p>
        <p class="sc-tip">${S.tip}</p>
        ${S.example ? `<p class="sc-ex">例：<span>${esc(S.example)}</span></p>` : ''}
      </article>`;
    }).join('');
    initQuiz();
  }

  const GROUPS = [
    { k: 'term', name: '開始／結束', type: 'start' }, { k: 'io', name: '輸入／輸出', type: 'io' }, { k: 'process', name: '處理程序', type: 'process' },
    { k: 'decision', name: '決策判斷', type: 'decision' }, { k: 'arrow', name: '流向線', type: 'arrow' }, { k: 'loop', name: '迴圈', type: 'loop' },
    { k: 'sub', name: '副程式', type: 'sub' }, { k: 'doc', name: '文件', type: 'doc' }, { k: 'note', name: '註解', type: 'note' }
  ];
  const SCEN = [
    ['流程從這裡出發', 'term'], ['流程到這裡就停止', 'term'], ['輸入你的年齡', 'io'], ['顯示考試成績', 'io'], ['計算 3 + 5', 'process'],
    ['把兩個數字相加', 'process'], ['判斷密碼是否正確', 'decision'], ['看看今天有沒有下雨', 'decision'], ['用箭頭表示下一步往哪裡走', 'arrow'],
    ['重複拍球 10 次', 'loop'], ['把「吃早餐」另外畫成一張小流程圖', 'sub'], ['列印報名表', 'doc'], ['在旁邊補充：最多可以重試 3 次', 'note']
  ];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function initQuiz() {
    const box = $('quiz');
    let qs = [], i = 0, right = 0, answered = false;
    function build() {
      const A = shuffle(GROUPS).slice(0, 5).map(g => ({ kind: 'A', g }));
      const usedK = new Set(); const B = [];
      for (const [t, k] of shuffle(SCEN)) { if (B.length >= 5) break; if (usedK.has(k)) continue; usedK.add(k); B.push({ kind: 'B', t, g: GROUPS.find(x => x.k === k) }); }
      qs = shuffle([...A, ...B]); i = 0; right = 0; render();
    }
    function render() {
      if (i >= qs.length) {
        const msg = right >= 9 ? '太厲害了！你已經是符號達人！' : right >= 7 ? '很不錯，再複習一下就更穩了！' : '多看看上面的符號卡，再挑戰一次吧！';
        box.innerHTML = `<div class="q-done"><div class="q-score">${right}<small> / ${qs.length}</small></div><p>${msg}</p>
          <div class="q-btns"><button class="btn" id="qAgain">再玩一次</button><a class="btn primary" href="#topics">前往選擇主題 →</a></div></div>`;
        $('qAgain').onclick = build; return;
      }
      const q = qs[i]; answered = false;
      const opts = shuffle([q.g, ...shuffle(GROUPS.filter(x => x.k !== q.g.k)).slice(0, 3)]);
      let body;
      if (q.kind === 'A') {
        const shown = q.g.k === 'term' ? (Math.random() < 0.5 ? 'start' : 'end') : q.g.type;
        body = `<div class="q-sym">${FC.icon(shown, { w: shown === 'arrow' ? 170 : 170, h: shown === 'decision' ? 96 : shown === 'arrow' ? 40 : 66 })}</div>
          <p class="q-ask">這個符號叫什麼名字？</p><div class="q-opts text">` +
          opts.map(o => `<button class="q-opt" data-k="${o.k}">${o.name}</button>`).join('') + `</div>`;
      } else {
        body = `<p class="q-scn">「${q.t}」</p><p class="q-ask">這個步驟要用哪一個符號？</p><div class="q-opts icons">` +
          opts.map(o => `<button class="q-opt" data-k="${o.k}" aria-label="${o.name}">${FC.icon(o.type, { w: o.type === 'arrow' ? 110 : 100, h: o.type === 'decision' ? 60 : o.type === 'arrow' ? 34 : 44 })}<small>${o.name}</small></button>`).join('') + `</div>`;
      }
      box.innerHTML = `<div class="q-head"><span>第 ${i + 1} / ${qs.length} 題</span><span class="q-sc">答對 ${right} 題</span></div>
        <div class="q-prog"><i style="width:${i / qs.length * 100}%"></i></div>${body}<div class="q-fb" id="qFb" aria-live="polite"></div>
        <div class="q-next"><button class="btn primary" id="qNext" hidden>${i === qs.length - 1 ? '看結果' : '下一題 →'}</button></div>`;
      box.querySelectorAll('.q-opt').forEach(b => b.onclick = () => {
        if (answered) return; answered = true;
        const ok = b.dataset.k === q.g.k;
        if (ok) right++;
        box.querySelectorAll('.q-opt').forEach(x => { x.disabled = true; if (x.dataset.k === q.g.k) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        $('qFb').innerHTML = ok ? `<b class="ok">答對了！</b> ${FC.SYM[q.g.type].desc}` : `<b class="no">再想想：</b>正確答案是「${q.g.name}」，${FC.SYM[q.g.type].desc}`;
        $('qNext').hidden = false; $('qNext').focus();
        $('qNext').onclick = () => { i++; render(); };
      });
    }
    build();
  }

  /* ============================================================
     ③ 選擇主題
     ============================================================ */
  function renderTopics() {
    const work = t => { const w = store.get('work:' + t.id, null); return w && w.graph ? w.graph.nodes.length : 0; };
    $('topicCards').innerHTML = FC.TOPICS.filter(t => !isMaze(t)).map(t => {
      const n = work(t);
      return `<article class="topic-card ${topic && topic.id === t.id ? 'cur' : ''}" data-id="${t.id}">
        <div class="tc-stars" aria-label="難度 ${t.stars} 星">${'★'.repeat(t.stars)}<i>${'★'.repeat(3 - t.stars)}</i></div>
        <h3>${t.title}</h3><div class="tc-level">${t.level}</div>
        <p>${t.scenario}</p>
        <div class="tc-foot">${n ? `<span class="tc-saved">已畫 ${n} 個符號</span>` : '<span></span>'}<button class="btn primary">${n ? '繼續繪製' : '開始繪製'} →</button></div>
      </article>`;
    }).join('');
    $('mazeCards').innerHTML = FC.MAZE_TOPICS.map(t => {
      const n = work(t);
      return `<button type="button" class="maze-card ${topic && topic.id === t.id ? 'cur' : ''}" data-id="${t.id}" aria-label="迷宮第 ${t.mazeLevel} 關：${t.shortTitle}">
        <div class="mc-top"><span class="mc-num">第 ${t.mazeLevel} 關</span><span class="mc-tag">${t.level}</span></div>
        <div class="mc-map">${FC.mazeThumb(t.mazeLevel, 112)}</div>
        <h3>${t.shortTitle}</h3>
        <div class="mc-foot"><span>${n ? `已畫 ${n} 個符號` : ''}</span><span class="tc-stars">${'★'.repeat(t.stars)}<i>${'★'.repeat(3 - t.stars)}</i></span></div>
      </button>`;
    }).join('');
    document.querySelectorAll('.topic-card,.maze-card').forEach(c => c.onclick = () => chooseTopic(c.dataset.id));
  }
  function chooseTopic(id) {
    saveWork(true);
    topic = topicById(id); store.set('lastTopic', id);
    loadWork();
    if (location.hash === '#draw') show('draw'); else location.hash = '#draw';
  }

  /* ============================================================
     ④ 繪製
     ============================================================ */
  let ed, lastA = null, analyzeTimer = 0, saveTimer = 0;

  function initDraw() {
    ed = new FC.Editor({
      svg: $('canvas'), wrap: $('canvasWrap'),
      onChange: () => { scheduleAnalyze(); scheduleSave(); syncToolbar(); if (rn.trace) runReset(); },
      onSelect: (sel, e, focus) => { renderSelbar(sel, focus); }
    });
    ed.active = () => current === 'draw';
    ed.onModeChange = () => { syncToolbar(); renderSelbar(ed.sel); };

    /* 符號列 */
    $('palList').innerHTML = FC.PALETTE.map(t => {
      const S = FC.SYM[t];
      return `<button class="pal-item" data-type="${t}" title="${S.desc}" style="--c:${S.stroke}">${FC.icon(t, { w: t === 'decision' ? 58 : 58, h: t === 'decision' ? 34 : t === 'doc' ? 28 : 26 })}<span>${t === 'start' ? '開始' : t === 'end' ? '結束' : S.name}</span></button>`;
    }).join('');
    document.querySelectorAll('.pal-item').forEach(bindPalette);

    /* 工具列 */
    $('tUndo').onclick = () => ed.undo();
    $('tRedo').onclick = () => ed.redo();
    $('tConnect').onclick = () => { ed.setMode(ed.mode === 'connect' ? 'select' : 'connect'); syncToolbar(); renderSelbar(ed.sel); };
    $('tDel').onclick = () => ed.deleteSelected();
    $('tClear').onclick = () => { if (!ed.graph.nodes.length) return; if (confirm('確定要清空整張流程圖嗎？（可以用「復原」找回）')) ed.clearAll(); };
    $('tZoomIn').onclick = () => { ed.setZoom(ed.zoom + 0.1); syncToolbar(); };
    $('tZoomOut').onclick = () => { ed.setZoom(ed.zoom - 0.1); syncToolbar(); };
    $('tFit').onclick = () => { ed.fit(); syncToolbar(); };
    $('tNext').onclick = () => { saveWork(true); location.hash = '#submit'; };
    if (TEACHER) {
      $('tTeacher').hidden = false;
      $('tTeacher').onclick = () => {
        if (!topic || !topic.sample) { alert('這個主題是自訂主題，沒有參考答案。'); return; }
        if (ed.graph.nodes.length && !confirm('要用參考答案取代目前畫面嗎？（可以用「復原」找回）')) return;
        const g = topic.sample(); g.nid = g.nodes.length + 1; g.eid = g.edges.length + 1;
        ed.graph = g; ed.commit(); ed.select(null); ed.render(); renderAnalysis(); requestAnimationFrame(() => { ed.fit(); syncToolbar(); });
      };
    }
    $('dTitleIn').addEventListener('input', () => { store.set('title:custom', $('dTitleIn').value); });
    $('tSide').onclick = () => { const v = $('view-draw'); const o = !v.classList.contains('side-open'); v.classList.toggle('side-open', o); $('tSide').setAttribute('aria-pressed', o); };
    $('canvasWrap').addEventListener('pointerdown', () => { if ($('view-draw').classList.contains('side-open')) { $('view-draw').classList.remove('side-open'); $('tSide').setAttribute('aria-pressed', false); } });
    initMaze(); initRunner();

    /* 右側頁籤 */
    document.querySelectorAll('.side-tabs button').forEach(b => b.onclick = () => {
      document.querySelectorAll('.side-tabs button').forEach(x => x.classList.toggle('on', x === b));
      $('panelChecks').hidden = b.dataset.p !== 'checks'; $('panelSteps').hidden = b.dataset.p !== 'steps';
    });
    syncToolbar(); renderSelbar(null);
  }

  function bindPalette(item) {
    item.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const type = item.dataset.type, sx = e.clientX, sy = e.clientY;
      let ghost = null, moved = false;
      const mv = ev => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
          moved = true;
          ghost = document.createElement('div'); ghost.className = 'ghost';
          ghost.innerHTML = FC.icon(type, { w: type === 'decision' ? 120 : 110, h: type === 'decision' ? 66 : 48 });
          document.body.appendChild(ghost);
        }
        if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
      };
      const tb = ev => ev.preventDefault();
      const up = ev => {
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up); window.removeEventListener('touchmove', tb);
        if (ghost) ghost.remove();
        let n = null;
        if (moved) {
          const p = ed.clientToWorld(ev.clientX, ev.clientY);
          if (p.inside) n = ed.addNode(type, p.x, p.y);
        } else n = ed.addNodeAuto(type);
        if (n && !['start', 'end'].includes(n.type)) focusSelText();
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up); window.addEventListener('touchmove', tb, { passive: false });
      e.preventDefault();
    });
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const n = ed.addNodeAuto(item.dataset.type); if (n && !['start', 'end'].includes(n.type)) focusSelText(); } });
  }

  function focusSelText() {
    setTimeout(() => { const i = $('selText'); if (i) { i.focus({ preventScroll: true }); i.select(); } }, 30);
  }

  function syncToolbar() {
    if (!ed) return;
    $('tUndo').disabled = !ed.canUndo; $('tRedo').disabled = !ed.canRedo;
    $('tConnect').classList.toggle('on', ed.mode === 'connect');
    $('tConnect').setAttribute('aria-pressed', ed.mode === 'connect');
    $('tZoomLbl').textContent = Math.round(ed.zoom * 100) + '%';
  }

  function renderSelbar(sel, focus) {
    const bar = $('selbar');
    if (!sel) {
      bar.innerHTML = (ed && ed.mode === 'connect')
        ? '<span class="hintline conn"><b>連線模式</b>　依序點選「起點符號」→「終點符號」就會畫出流向線。再按一次「連線」或按 Esc 結束。</span>'
        : '<span class="hintline">點選符號可輸入文字、拖曳可移動。要連線：按「連線」後點兩個符號，或選取符號後拖曳四周的小圓點。</span>';
      return;
    }
    if (sel.t === 'node') {
      const n = ed.node(sel.id); if (!n) return;
      const S = FC.SYM[n.type];
      bar.innerHTML = `<span class="selchip" style="--c:${S.stroke}">${S.name}</span>
        <label class="sel-field">文字<input id="selText" type="text" maxlength="40" autocomplete="off" value="${esc(n.text || '')}" placeholder="寫下這個步驟…"></label>
        <button class="btn sm" id="selDup">複製</button><button class="btn sm danger" id="selDel">刪除</button>`;
      const inp = $('selText');
      inp.addEventListener('input', () => ed.setText(n.id, inp.value));
      inp.addEventListener('change', () => ed.commit());
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { inp.blur(); } });
      $('selDup').onclick = () => ed.duplicateSelected();
      $('selDel').onclick = () => ed.deleteSelected();
      if (focus) focusSelText();
    } else {
      const e = ed.edge(sel.id); if (!e) return;
      const sn = ed.node(e.from);
      const presets = sn && sn.type === 'decision' ? ['成立', '不成立'] : sn && sn.type === 'loop' ? ['重複', '完成'] : [];
      bar.innerHTML = `<span class="selchip" style="--c:#2a3441">流向線</span>
        ${presets.length ? '<span class="lbl">標籤</span>' + presets.map(p => `<button class="btn sm lab ${e.label === p ? 'on' : ''}" data-l="${p}">${p}</button>`).join('') : ''}
        <label class="sel-field">${presets.length ? '或自訂' : '標籤（可不填）'}<input id="selLabel" type="text" maxlength="10" autocomplete="off" value="${esc(e.label || '')}" placeholder="例：是／否"></label>
        <button class="btn sm" id="selRev">反轉方向</button><button class="btn sm danger" id="selDel">刪除</button>`;
      bar.querySelectorAll('.lab').forEach(b => b.onclick = () => { ed.setEdgeLabel(e.id, b.dataset.l); renderSelbar(ed.sel); });
      const inp = $('selLabel');
      inp.addEventListener('input', () => { const ee = ed.edge(e.id); ee.label = inp.value; ed.render(); });
      inp.addEventListener('change', () => { ed.commit(); ed.onChange(ed.graph, true); renderSelbar(ed.sel); });
      $('selRev').onclick = () => ed.reverseEdge(e.id);
      $('selDel').onclick = () => ed.deleteSelected();
    }
  }

  /* ---------- 檢查提示、文字步驟、虛擬碼 ---------- */
  function scheduleAnalyze() { clearTimeout(analyzeTimer); analyzeTimer = setTimeout(renderAnalysis, 140); }
  function renderAnalysis() {
    if (!ed || !topic) return;
    const a = FC.analyze(ed.graph, topic); lastA = a;
    const warns = a.checks.filter(c => c.lv === 'warn'), infos = a.checks.filter(c => c.lv === 'info'), oks = a.checks.filter(c => c.lv === 'ok');
    const sec = (title, cls, arr) => arr.length ? `<h4 class="ck-h ${cls}">${title}<i>${arr.length}</i></h4>` + arr.map(c =>
      `<div class="ck ${cls} ${c.ids.length ? 'link' : ''}" ${c.ids.length ? `data-ids="${c.ids.join(',')}" role="button" tabindex="0"` : ''}><span class="dot"></span><span>${esc(c.msg)}</span></div>`).join('') : '';
    $('panelChecks').innerHTML = (a.empty ? `<div class="ck info"><span class="dot"></span><span>${esc(a.checks[0].msg)}</span></div>` :
      `<p class="ck-note">這些提示只是幫你檢查，<b>不會扣分</b>。點一下提示，可以找到對應的符號。</p>` + sec('待修正', 'warn', warns) + sec('小建議', 'info', infos) + sec('做得好', 'ok', oks));
    $('panelChecks').querySelectorAll('.ck.link').forEach(el => {
      const f = () => ed.flashNodes(el.dataset.ids.split(','));
      el.onclick = f; el.onkeydown = e => { if (e.key === 'Enter') f(); };
    });
    const badge = $('tabCheckBadge'); badge.textContent = a.counts.warn || ''; badge.hidden = !a.counts.warn;
    const sb = $('tSideBadge'); sb.textContent = a.counts.warn || ''; sb.hidden = !a.counts.warn;

    const lineHTML = (arr, code) => arr.map(s => `<div class="ln ${s.head ? 'head' : ''} ${s.dim ? 'dim' : ''} ${s.go ? 'go' : ''}" style="padding-left:${s.ind * 20}px">` +
      `${s.k ? `<b class="k">${s.k}</b>` : '<b class="k"></b>'}<span class="${code ? 'mono' : ''}">${esc(s.t)}</span></div>`).join('');
    const empty = '<p class="muted">畫好從「開始」出發的流程後，這裡會自動出現對照內容。</p>';
    $('stepsList').innerHTML = a.steps.length ? lineHTML(a.steps, false) : empty;
    $('codeList').innerHTML = a.code.length ? lineHTML(a.code, true) : empty;
  }

  /* ---------- 儲存 ---------- */
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveWork(), 400); }
  function saveWork(force) {
    if (!ed || !topic) return;
    clearTimeout(saveTimer);
    store.set('work:' + topic.id, { graph: ed.getGraph(), t: Date.now() });
    if (isMaze(topic) && $('mzLevels')) renderMzLevels();
  }
  function loadWork() {
    const w = store.get('work:' + topic.id, null);
    ed.setGraph(w && w.graph ? w.graph : null, true);
    ed.setMode('select'); syncToolbar();
    ed.zoom = 1;
  }
  const CHEAT = `<table class="cheat"><tr><th>Blockly 積木</th><th>流程圖符號</th></tr>
    <tr><td>向前移動、向左轉、向右轉</td><td>處理程序（長方形）</td></tr>
    <tr><td>重複直到終點</td><td>迴圈（六角形）；或用「到終點了嗎？」決策判斷，並把「不成立」連回前面</td></tr>
    <tr><td>如果 前方／左方／右方有路</td><td>決策判斷（菱形）：成立就做事，不成立就往下</td></tr>
    <tr><td>如果…否則</td><td>決策判斷，兩條出口都有要做的事</td></tr></table>`;
  function openTopicUI(opt) {
    if (!topic) return;
    opt = opt || {};
    const custom = topic.id === 'custom', maze = isMaze(topic);
    $('dBadge').innerHTML = `<span class="stars">${'★'.repeat(topic.stars)}<i>${'★'.repeat(3 - topic.stars)}</i></span> ${topic.level}`;
    $('dTitle').textContent = custom ? '我的自訂主題' : topic.title;
    $('dTitleWrap').classList.toggle('custom', custom);
    if (custom) $('dTitleIn').value = store.get('title:custom', '');
    $('dScenario').textContent = topic.scenario;
    let hint = esc(topic.hint);
    if (custom) hint += '<div class="ideas">點一下想法可以直接採用：' + topic.ideas.map(i => `<button class="idea" type="button">${i}</button>`).join('') + '</div>';
    if (maze) {
      hint += `<p class="limit-note">${topic.blockLimit ? `這一關的積木最多 ${topic.blockLimit} 個（包含一開始就放在畫面上的那一個）。` : '這一關的積木數量不限。'}</p>` + CHEAT;
      if (TEACHER) hint += `<div class="teacher-sol"><b>教師參考積木解法：</b>${esc(topic.blockSolution)}</div>`;
    }
    $('dHintBody').innerHTML = hint;
    $('dHintBody').querySelectorAll('.idea').forEach(b => b.onclick = () => { $('dTitleIn').value = b.textContent; store.set('title:custom', b.textContent); $('dTitleIn').focus(); });
    $('dHint').open = false;
    setMazeMode(maze, opt);
    onRunnerTopic(maze);
    syncToolbar();
    if (maze && ed.graph.nodes.length) requestAnimationFrame(() => { ed.fit(); syncToolbar(); });
  }

  /* ============================================================
     迷宮挑戰：Blockly Games 內嵌、並排版面
     ============================================================ */
  let mzLevel = 0, mzExpect = 0, mzMode = '';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function setMazeMode(maze, opt) {
    const v = $('view-draw');
    v.classList.toggle('maze', maze);
    ['mzBar', 'mzPane', 'mzSplit', 'dMap'].forEach(id => { $(id).hidden = !maze; });
    $('tSide').hidden = !maze;
    if (!maze) {
      v.classList.remove('m-both', 'm-maze', 'm-flow', 'side-open');
      unloadMazeFrame();
      return;
    }
    $('dMap').innerHTML = FC.mazeThumb(topic.mazeLevel, 84);
    if (!mzMode) mzMode = store.get('mzMode', '') || (window.innerWidth >= 1180 ? 'both' : 'maze');
    setMzView(mzMode, true);
    applySplit();
    if (opt && opt.keepFrame) { mzLevel = topic.mazeLevel; $('mzLvTag').textContent = `第 ${mzLevel} 關`; $('mzOpen').href = FC.MAZE.url(mzLevel); }
    else loadMazeFrame(topic.mazeLevel, false);
    renderMzLevels();
  }
  function loadMazeFrame(level, force) {
    if (!force && mzLevel === level) return;
    mzLevel = level; mzExpect++;
    $('mzIframe').src = FC.MAZE.url(level);
    $('mzOpen').href = FC.MAZE.url(level);
    $('mzLvTag').textContent = `第 ${level} 關`;
    $('mzBanner').hidden = true;
  }
  function unloadMazeFrame() { $('mzBanner').hidden = true; }   // 迷宮頁面保留在背景，回來時進度還在
  function renderMzLevels() {
    $('mzLevels').innerHTML = FC.MAZE_TOPICS.map(t => {
      const w = store.get('work:' + t.id, null);
      const has = w && w.graph && w.graph.nodes.length;
      return `<button type="button" class="mz-lv ${topic && topic.id === t.id ? 'on' : ''} ${has ? 'has' : ''}" data-n="${t.mazeLevel}" role="tab" aria-selected="${topic && topic.id === t.id}" title="第 ${t.mazeLevel} 關：${t.shortTitle}${has ? '（已有流程圖）' : ''}">${t.mazeLevel}</button>`;
    }).join('');
    $('mzLevels').querySelectorAll('.mz-lv').forEach(b => b.onclick = () => switchMazeLevel(+b.dataset.n));
  }
  function switchMazeLevel(n, opt) {
    if (topic && topic.mazeLevel === n && !(opt && opt.keepFrame)) return;
    saveWork(true);
    topic = topicById('maze' + n); store.set('lastTopic', topic.id);
    loadWork(); openTopicUI(opt); renderAnalysis(); $('view-draw').classList.remove('side-open');
  }
  function setMzView(m, silent) {
    mzMode = m; store.set('mzMode', m);
    const v = $('view-draw'); v.classList.remove('side-open');
    v.classList.remove('m-both', 'm-maze', 'm-flow'); v.classList.add('m-' + m);
    document.querySelectorAll('.mz-modes button').forEach(b => { b.classList.toggle('on', b.dataset.m === m); b.setAttribute('aria-selected', b.dataset.m === m); });
    if (!silent) { requestAnimationFrame(() => { fitMazeFrame(); if (ed) ed.render(); }); }
  }
  function applySplit() {
    const main = $('drawMain'), tot = main.clientWidth; if (!tot) return;
    const saved = store.get('mzW', 0);
    const px = clamp(saved || Math.round(tot * 0.52), 360, Math.max(360, tot - 460));
    main.style.setProperty('--mz-w', px + 'px');
  }
  function fitMazeFrame() {
    /* Blockly Games 至少需要約 900×640 才能完整顯示（地圖、執行按鈕、積木區）；空間不夠時讓它用這個大小再等比例縮小 */
    const fr = $('mzFrame'), f = $('mzIframe');
    const W = fr.clientWidth, H = fr.clientHeight; if (!W || !H) return;
    const sc = Math.min(1, W / 900, H / 640);
    f.style.width = (W / sc) + 'px'; f.style.height = (H / sc) + 'px'; f.style.transform = `scale(${sc})`;
  }
  function showMzBanner() {
    const n = topic.mazeLevel, next = n < 10 ? n + 1 : 0, b = $('mzBanner');
    b.innerHTML = `<span>迷宮頁面換頁了（例如按了「下一關」）。${next ? `要把流程圖也換到第 ${next} 關嗎？` : '這已經是最後一關。'}</span>` +
      (next ? `<button class="btn sm primary" id="mzBnGo">換到第 ${next} 關</button>` : '') +
      `<button class="btn sm" id="mzBnBack">回到第 ${n} 關</button><button class="btn sm" id="mzBnX" aria-label="關閉">✕</button>`;
    b.hidden = false;
    if (next) $('mzBnGo').onclick = () => { b.hidden = true; mzLevel = 0; switchMazeLevel(next, { keepFrame: true }); };
    $('mzBnBack').onclick = () => { b.hidden = true; loadMazeFrame(n, true); };
    $('mzBnX').onclick = () => { b.hidden = true; };
  }
  function initMaze() {
    $('mzIframe').addEventListener('load', () => {
      if (!mzLevel) return;
      if (mzExpect > 0) { mzExpect--; return; }
      showMzBanner();
    });
    $('mzReload').onclick = () => { if (topic && isMaze(topic)) loadMazeFrame(topic.mazeLevel, true); };
    document.querySelectorAll('.mz-modes button').forEach(b => b.onclick = () => setMzView(b.dataset.m));
    new ResizeObserver(fitMazeFrame).observe($('mzFrame'));
    window.addEventListener('resize', () => { if (current === 'draw' && isMaze(topic)) applySplit(); });
    /* 左右分隔線 */
    const sp = $('mzSplit');
    sp.addEventListener('pointerdown', e => {
      e.preventDefault(); sp.classList.add('drag'); document.body.classList.add('mz-dragging');
      const main = $('drawMain'), x0 = main.getBoundingClientRect().left;
      const mv = ev => { const px = clamp(ev.clientX - x0 - 6, 360, main.clientWidth - 460); main.style.setProperty('--mz-w', px + 'px'); store.set('mzW', Math.round(px)); };
      const up = () => { sp.classList.remove('drag'); document.body.classList.remove('mz-dragging'); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); if (ed) ed.render(); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    });
  }

  /* ============================================================
     試跑流程圖
     ============================================================ */
  const rn = { board: null, level: 0, trace: null, res: null, idx: -1, timer: 0 };
  const RP_IDLE = '按「試跑」，看小人照著你的流程圖在迷宮裡走。也可以用「單步」一步一步看。';

  function initRunner() {
    $('tRun').onclick = () => runOpen($('runPanel').hidden);
    $('rpClose').onclick = () => runOpen(false);
    $('rpSide').onclick = () => $('runPanel').classList.toggle('left');
    $('rpReset').onclick = () => runReset();
    $('rpStep').onclick = () => { runStop(); runStepOnce(); };
    const tick = () => { if (rn.idx >= rn.trace.length - 1) runStop(); else runStepOnce(); };
    $('rpPlay').onclick = () => {
      if (rn.timer) { runStop(); return; }
      if (rn.trace && rn.idx >= rn.trace.length - 1) runReset();
      $('rpPlay').textContent = '⏸ 暫停';
      runStepOnce();
      if (rn.trace && rn.idx < rn.trace.length - 1) rn.timer = setInterval(tick, +$('rpSpeed').value);
    };
    $('rpSpeed').onchange = () => { if (rn.timer) { clearInterval(rn.timer); rn.timer = setInterval(tick, +$('rpSpeed').value); } };
  }
  function onRunnerTopic(maze) {
    $('tRun').hidden = !maze;
    if (!maze) { runOpen(false); return; }
    if (!$('runPanel').hidden) { ensureBoard(); runReset(); }
  }
  function ensureBoard() {
    if (!isMaze(topic)) return;
    if (!rn.board || rn.level !== topic.mazeLevel) { rn.board = new FC.MazeBoard($('rpBoard'), topic.mazeLevel, 240); rn.level = topic.mazeLevel; }
    $('rpLv').textContent = `第 ${topic.mazeLevel} 關`;
  }
  function runOpen(open) {
    $('runPanel').hidden = !open;
    $('tRun').classList.toggle('on', open); $('tRun').setAttribute('aria-pressed', open);
    if (open) { ensureBoard(); runReset(); } else { runStop(); rn.trace = null; if (ed) ed.setRun(null, null); }
  }
  function runStop() { clearInterval(rn.timer); rn.timer = 0; $('rpPlay').textContent = '▶ 試跑'; }
  function runReset() {
    runStop(); rn.trace = null; rn.res = null; rn.idx = -1;
    if (rn.board) rn.board.reset();
    if (ed) ed.setRun(null, null);
    $('rpStatus').textContent = RP_IDLE; $('rpResult').hidden = true;
  }
  function runStepOnce() {
    if (!rn.trace) { rn.res = FC.runMaze(ed.getGraph(), topic.mazeLevel); rn.trace = rn.res.trace; rn.idx = -1; }
    if (rn.idx + 1 < rn.trace.length) {
      rn.idx++;
      const e = rn.trace[rn.idx];
      rn.board.showAt(rn.trace, rn.idx);
      const isLast = rn.idx === rn.trace.length - 1;
      ed.setRun(isLast && !rn.res.ok && rn.res.errNode ? null : e.node, isLast && !rn.res.ok ? rn.res.errNode : null);
      $('rpStatus').innerHTML = `第 ${rn.idx + 1} / ${rn.trace.length} 步：<b>${esc(e.note)}</b>`;
    }
    if (rn.idx >= rn.trace.length - 1) runFinish();
  }
  function runFinish() {
    runStop();
    const r = rn.res, box = $('rpResult');
    box.hidden = false; box.className = 'rp-result ' + (r.ok ? 'ok' : 'bad');
    box.innerHTML = r.ok ? `<b>🎉 成功走到終點！</b>${esc(r.reason.replace(/^成功！/, ''))}` : `<b>還沒成功</b>${esc(r.reason)}${r.errNode ? '<br>看看畫面上<b style="display:inline;color:#c0392b"> 紅色框 </b>的符號。' : ''}`;
    if (r.ok) $('rpStatus').innerHTML = '到達終點了！';
  }

  /* ============================================================
     ⑤ 產出 PDF
     ============================================================ */
  let pdfDoc = null, pvIdx = 0, pvTimer = 0, pvSeq = 0;
  /* ---------- 迷宮作業欄位（通關狀態、積木數、截圖） ---------- */
  const shots = {};
  function readShot(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('無法讀取檔案'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error('這個檔案不是圖片，請選擇截圖（JPG 或 PNG）'));
        img.onload = () => {
          const sc = Math.min(1, 1100 / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          res({ url: c.toDataURL('image/jpeg', 0.86), w: c.width, h: c.height });
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function updateShotUI() {
    const has = topic && shots[topic.id];
    $('shotState').textContent = has ? '已選擇截圖，會放進 PDF' : '還沒有選擇圖片（選填）';
    $('shotState').className = 'shot-state' + (has ? ' ok' : '');
    $('shotClear').hidden = !has;
  }
  function mazeSubmitUI() {
    const m = isMaze(topic);
    $('mazeFields').hidden = !m;
    $('reflectLabel').textContent = m ? '我的想法：流程圖和積木有哪裡不一樣？有修改過嗎？（選填）' : '我的想法（選填）';
    $('fReflect').placeholder = m ? '例如：我原本忘了畫回到前面的線，用積木測試後才發現…' : '這次畫流程圖，你覺得哪個符號最容易用錯？學到了什麼？';
    if (m) {
      const d = store.get('maze:' + topic.id, {});
      $('fStatus').value = d.status || ''; $('fBlocks').value = d.blocks || '';
      $('fBlocks').placeholder = topic.blockLimit ? `上限 ${topic.blockLimit} 個` : '不限';
      updateShotUI();
    }
  }


  function loadInfo() {
    const i = store.get('info', {});
    $('fCls').value = i.cls || ''; $('fNo').value = i.no || ''; $('fName').value = i.name || '';
    $('fReflect').value = store.get('reflect:' + (topic ? topic.id : ''), '');
    $('pdfMsg').textContent = ''; $('pdfMsg').className = 'msg';
    mazeSubmitUI();
  }
  function collect() {
    const info = { cls: $('fCls').value.trim(), no: $('fNo').value.trim(), name: $('fName').value.trim() };
    store.set('info', info);
    store.set('reflect:' + topic.id, $('fReflect').value);
    const custom = topic.id === 'custom';
    const title = custom ? (store.get('title:custom', '') || '自訂主題') : topic.title;
    const graph = ed.getGraph();
    let maze = null;
    if (isMaze(topic)) {
      const m = { status: $('fStatus').value, blocks: $('fBlocks').value.trim() };
      store.set('maze:' + topic.id, m);
      maze = { level: topic.mazeLevel, status: m.status, blocks: m.blocks, limit: topic.blockLimit, shot: shots[topic.id] || null, run: FC.runMaze(graph, topic.mazeLevel) };
    }
    return { graph, topicTitle: title, info, reflection: $('fReflect').value, analysis: FC.analyze(graph, topic), includeChecks: $('fChecks').checked, maze };
  }
  function schedulePreview(ms) { clearTimeout(pvTimer); pvTimer = setTimeout(buildPreview, ms == null ? 450 : ms); }
  async function buildPreview() {
    if (current !== 'submit' || !topic) return;
    const seq = ++pvSeq;
    $('pvState').textContent = '產生預覽中…';
    try {
      const d = collect();
      const doc = await FC.buildPdf(d);
      if (seq !== pvSeq) return;
      pdfDoc = doc; pvIdx = Math.min(pvIdx, doc.pages.length - 1); showPage();
      $('pvState').textContent = '';
      const empty = !d.graph.nodes.length;
      $('pdfMsg').textContent = empty ? '提醒：你還沒有畫流程圖，回到上一步畫好再下載喔。' : '';
      $('pdfMsg').className = 'msg ' + (empty ? 'warn' : '');
    } catch (err) {
      $('pvState').textContent = '預覽失敗：' + err.message;
    }
  }
  function showPage() {
    if (!pdfDoc) return;
    $('pvImg').src = pdfDoc.pages[pvIdx].c.toDataURL('image/jpeg', 0.82);
    $('pvInfo').textContent = `第 ${pvIdx + 1} 頁 / 共 ${pdfDoc.pages.length} 頁`;
    $('pvPrev').disabled = pvIdx === 0; $('pvNext').disabled = pvIdx >= pdfDoc.pages.length - 1;
  }
  function initSubmit() {
    ['fCls', 'fNo', 'fName', 'fReflect', 'fChecks', 'fBlocks'].forEach(id => $(id).addEventListener('input', () => schedulePreview(500)));
    $('fStatus').addEventListener('change', () => schedulePreview(100));
    $('fShot').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try { shots[topic.id] = await readShot(f); } catch (err) { $('shotState').textContent = err.message; $('shotState').className = 'shot-state'; return; }
      e.target.value = ''; updateShotUI(); schedulePreview(100);
    });
    $('shotClear').onclick = () => { delete shots[topic.id]; updateShotUI(); schedulePreview(100); };
    $('fChecks').addEventListener('change', () => schedulePreview(100));
    $('pvPrev').onclick = () => { pvIdx = Math.max(0, pvIdx - 1); showPage(); };
    $('pvNext').onclick = () => { pvIdx = Math.min(pdfDoc.pages.length - 1, pvIdx + 1); showPage(); };
    $('btnPdf').onclick = async () => {
      const msg = $('pdfMsg');
      const d = collect();
      if (!d.info.name) { msg.textContent = '請先填寫姓名，老師才知道是誰的作業喔。'; msg.className = 'msg warn'; $('fName').focus(); return; }
      if (!d.graph.nodes.length) { msg.textContent = '還沒有流程圖內容，請先回到上一步繪製。'; msg.className = 'msg warn'; return; }
      if (!window.jspdf) { msg.textContent = 'PDF 元件載入失敗，請重新整理網頁。'; msg.className = 'msg warn'; return; }
      $('btnPdf').disabled = true; msg.textContent = '產生 PDF 中…'; msg.className = 'msg';
      try {
        const doc = await FC.buildPdf(d);
        const pdf = FC.pdfFromDoc(doc);
        const safe = s => s.replace(/[\\/:*?"<>|\s]+/g, '');
        const fn = `流程圖作業_${safe(d.info.cls)}${safe(d.info.no)}${safe(d.info.name)}_${safe(d.topicTitle)}.pdf`;
        pdf.save(fn);
        msg.textContent = `已下載：${fn}　請把這個檔案上傳到老師指定的繳交平台。`; msg.className = 'msg ok';
      } catch (err) { msg.textContent = '產生失敗：' + err.message; msg.className = 'msg warn'; }
      $('btnPdf').disabled = false;
    };
  }

  /* ============================================================
     啟動
     ============================================================ */
  function init() {
    initSlides(); initSymbols(); initDraw(); initSubmit();
    if (topic) loadWork();
    route();
    window.__fc = { ed, FC, get topic() { return topic; }, chooseTopic };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.FC);
