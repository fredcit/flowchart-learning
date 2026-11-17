/* ============================================================
   runner.js － 試跑流程圖：把學生畫的流程圖放到迷宮地圖上實際跑一遍
   規則與 Blockly Games 迷宮一致：起點朝東；前進時前方是牆就算撞牆；
   「重複直到終點」只在迴圈開頭檢查是否到達終點。
   ============================================================ */
(function (FC) {
  'use strict';
  const V = [[0, -1], [1, 0], [0, 1], [-1, 0]];          // 北、東、南、西
  const YES = /^(成立|是|yes|y|對|真|有|正確)$/i, NO = /^(不成立|否|no|n|不是|錯|假|沒有|錯誤)$/i;
  const MAX_VISITS = 400;

  function grid(level) {
    const rows = FC.MAZE.maps[level - 1].map(r => r.split('').map(Number));
    let sx = 0, sy = 0, fx = 0, fy = 0;
    rows.forEach((r, y) => r.forEach((v, x) => { if (v === 2) { sx = x; sy = y; } if (v === 3) { fx = x; fy = y; } }));
    return { rows, sx, sy, fx, fy, h: rows.length, w: rows[0].length };
  }
  FC.mazeGrid = grid;

  /* ---------- 讀懂文字 ---------- */
  const clean = t => String(t || '').replace(/[\s「」『』"'。，,！!？?（）()]/g, '');
  /* 動作：依出現順序取出所有動作（一個符號裡寫「前進後左轉」也可以） */
  FC.parseActions = function (text) {
    const t = clean(text), out = [];
    const re = /(向?左轉|往左轉|轉左|向左|往左)|(向?右轉|往右轉|轉右|向右|往右)|(向前移動|向前走|往前走|前進|直走|向前|往前|前行|走)/g;
    let m;
    while ((m = re.exec(t))) out.push(m[1] ? 'L' : m[2] ? 'R' : 'F');
    return out;
  };
  /* 條件：到達終點／前方有路／左方有路／右方有路（可含「沒有」表示相反） */
  FC.parseCond = function (text) {
    const t = clean(text);
    if (!t) return null;
    const neg = /沒有|沒路|無路|不能|不是|不會|還沒|尚未|未/.test(t);
    let k = null;
    if (/終點|到達|抵達|到了|目標|過關/.test(t)) k = 'GOAL';
    else if (/左/.test(t)) k = 'L';
    else if (/右/.test(t)) k = 'R';
    else if (/前|正面|直/.test(t)) k = 'F';
    return k ? { k, neg } : null;
  };

  /* ---------- 執行 ---------- */
  FC.runMaze = function (graph, level) {
    const g = grid(level);
    const N = {}, outs = {};
    graph.nodes.forEach(n => { N[n.id] = n; outs[n.id] = []; });
    graph.edges.forEach(e => {
      if (N[e.from] && N[e.to] && N[e.from].type !== 'note' && N[e.to].type !== 'note') outs[e.from].push(e);
    });
    const res = { trace: [], ok: false, reason: '', errNode: null, moves: 0, turns: 0, level };
    const fail = (msg, node) => { res.ok = false; res.reason = msg; res.errNode = node || null; return res; };
    const starts = graph.nodes.filter(n => n.type === 'start');
    if (starts.length === 0) return fail('還沒有「開始」符號，從「開始」才能試跑。');
    if (starts.length > 1) return fail('「開始」只能有 1 個。', starts[1].id);

    let x = g.sx, y = g.sy, d = 1;
    const atGoal = () => x === g.fx && y === g.fy;
    const isPath = rel => {
      const v = V[(d + rel) % 4], r = g.rows[y + v[1]];
      return !!r && r[x + v[0]] !== undefined && r[x + v[0]] !== 0;
    };
    const push = (node, act, note, extra) => res.trace.push(Object.assign({ node, act, note, x, y, d, goal: atGoal() }, extra));
    const txt = n => (n.text || '').trim() || SYMNAME(n);
    const SYMNAME = n => FC.SYM[n.type].name;
    const only = (n, label) => {                         // 只有一條出口的符號
      const o = outs[n.id];
      if (!o.length) return { err: `「${txt(n)}」後面沒有連到下一步。` };
      if (o.length > 1) return { err: `「${txt(n)}」有好幾條出口，只有決策判斷或迴圈才可以分支。` };
      return { to: o[0].to };
    };

    push(starts[0].id, 'start', '從起點出發');
    let cur = starts[0].id, visits = 0;
    for (;;) {
      if (++visits > MAX_VISITS) return fail(`試跑超過 ${MAX_VISITS} 個步驟還沒結束，可能有無限迴圈。檢查「重複」或「判斷」的出口有沒有連對、條件有沒有寫對。`, cur);
      const n = N[cur];
      if (n.type === 'start') {
        const r = only(n); if (r.err) return fail('「開始」還沒有連到下一步。', n.id);
        cur = r.to; continue;
      }
      if (n.type === 'end') {
        push(n.id, 'end', '到「結束」了');
        if (atGoal()) {
          res.ok = true;
          res.reason = `成功！小人走到終點了（前進 ${res.moves} 步、轉彎 ${res.turns} 次）。`;
        } else {
          res.reason = '流程走到「結束」了，但小人還沒走到終點。想想看：還少了哪些動作，或是「重複」有沒有連對？';
          res.errNode = n.id;
        }
        return res;
      }
      if (n.type === 'process') {
        const acts = FC.parseActions(n.text);
        if (!acts.length) return fail(`看不懂「${txt(n)}」是什麼動作。試跑認得「向前移動」、「向左轉」、「向右轉」。`, n.id);
        for (const a of acts) {
          if (a === 'F') {
            if (!isPath(0)) { push(n.id, 'F', '撞到牆了', { hit: true }); return fail(`撞牆了！在「${txt(n)}」這一步，小人面前沒有路。`, n.id); }
            x += V[d][0]; y += V[d][1]; res.moves++;
            push(n.id, 'F', '向前移動');
          } else {
            d = (d + (a === 'R' ? 1 : 3)) % 4; res.turns++;
            push(n.id, a, a === 'R' ? '向右轉' : '向左轉');
          }
        }
        const r = only(n); if (r.err) return fail(r.err, n.id);
        cur = r.to; continue;
      }
      if (n.type === 'io' || n.type === 'doc') {
        push(n.id, 'skip', `「${txt(n)}」不會讓小人動作，直接跳過`);
        const r = only(n); if (r.err) return fail(r.err, n.id);
        cur = r.to; continue;
      }
      if (n.type === 'decision') {
        const c = FC.parseCond(n.text);
        if (!c) return fail(`看不懂「${txt(n)}」要判斷什麼。試跑認得「前方有路」、「左方有路」、「右方有路」、「到達終點」。`, n.id);
        let val = c.k === 'GOAL' ? atGoal() : isPath({ F: 0, R: 1, L: 3 }[c.k]);
        if (c.neg) val = !val;
        const o = outs[n.id];
        const yes = o.find(e => YES.test((e.label || '').trim())), no = o.find(e => NO.test((e.label || '').trim()));
        if (!yes || !no) return fail(`「${txt(n)}」的兩條出口要分別標上「成立」和「不成立」。`, n.id);
        push(n.id, 'check', `${txt(n)}？${val ? '成立' : '不成立'}`, { val });
        cur = (val ? yes : no).to; continue;
      }
      if (n.type === 'loop') {
        const t = clean(n.text);
        if (!/終點|到達|抵達|到了|目標|過關/.test(t)) return fail(`看不懂迴圈「${txt(n)}」。試跑的迴圈要寫成「重複直到到達終點」。`, n.id);
        const o = outs[n.id];
        let body = o.find(e => /重複|迴圈|繼續|進入|不成立/.test(e.label || '')), exit = o.find(e => /完成|結束|離開|跳出|成立/.test(e.label || ''));
        if (!body || !exit) return fail(`迴圈「${txt(n)}」的兩條出口要分別標上「重複」和「完成」。`, n.id);
        const done = atGoal();
        push(n.id, 'check', done ? '到達終點了，離開迴圈' : '還沒到終點，繼續重複', { val: done });
        cur = (done ? exit : body).to; continue;
      }
      return fail(`試跑還不支援「${SYMNAME(n)}」符號。`, n.id);
    }
  };

  /* ============================================================
     地圖與小人（畫面）
     ============================================================ */
  FC.MazeBoard = class {
    constructor(el, level, px) {
      this.el = el; this.px = px || 240; this.setLevel(level);
    }
    setLevel(level) {
      this.level = level; this.g = grid(level);
      const { g } = this, c = 100;
      this.c = c;
      let s = `<svg class="board" viewBox="0 0 ${g.w * c} ${g.h * c}" width="${this.px}" height="${Math.round(this.px * g.h / g.w)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="迷宮地圖">` +
        `<rect width="${g.w * c}" height="${g.h * c}" rx="12" fill="#eeece4"/>`;
      g.rows.forEach((r, y) => r.forEach((v, x) => {
        if (!v) return;
        s += `<rect x="${x * c + 3}" y="${y * c + 3}" width="${c - 6}" height="${c - 6}" rx="${c * 0.2}" fill="#f7dc4a"/>`;
        if (v === 3) s += `<path d="M${x * c + c / 2},${y * c + c * 0.88} C${x * c + c * 0.08},${y * c + c * 0.42} ${x * c + c * 0.22},${y * c + c * 0.08} ${x * c + c / 2},${y * c + c * 0.08} C${x * c + c * 0.78},${y * c + c * 0.08} ${x * c + c * 0.92},${y * c + c * 0.42} ${x * c + c / 2},${y * c + c * 0.88}z" fill="#d6455d"/><circle cx="${x * c + c / 2}" cy="${y * c + c * 0.38}" r="${c * 0.13}" fill="#fff"/>`;
      }));
      s += `<polyline class="trail" points="" fill="none" stroke="#e08a00" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>`;
      s += `<g class="peg"><circle r="32" fill="#2a9d5c" stroke="#fff" stroke-width="6"/><path d="M0,-20 L16,12 L-16,12z" fill="#fff"/></g></svg>`;
      this.el.innerHTML = s;
      this.peg = this.el.querySelector('.peg'); this.trail = this.el.querySelector('.trail'); this.circle = this.peg.querySelector('circle');
      this.ang = 90; this.reset();
    }
    cell(x, y) { return [x * this.c + this.c / 2, y * this.c + this.c / 2]; }
    place(x, y, d, hit) {
      const [cx, cy] = this.cell(x, y);
      const target = d * 90;
      let delta = ((target - this.ang) % 360 + 540) % 360 - 180;        // 轉最短的方向
      this.ang += delta;
      this.peg.setAttribute('transform', `translate(${cx},${cy}) rotate(${this.ang})`);
      this.circle.setAttribute('fill', hit ? '#d6455d' : '#2a9d5c');
    }
    reset() {
      this.trailPts = [this.cell(this.g.sx, this.g.sy)];
      this.trail.setAttribute('points', '');
      this.ang = 90;
      this.place(this.g.sx, this.g.sy, 1, false);
    }
    /* 畫到 trace 的第 idx 個事件 */
    showAt(trace, idx) {
      const pts = [this.cell(this.g.sx, this.g.sy)];
      let last = trace[0];
      for (let i = 0; i <= idx && i < trace.length; i++) {
        const e = trace[i]; last = e;
        if (e.act === 'F' && !e.hit) pts.push(this.cell(e.x, e.y));
      }
      this.trail.setAttribute('points', pts.length > 1 ? pts.map(p => p.join(',')).join(' ') : '');
      this.place(last.x, last.y, last.d, !!last.hit);
    }
  };
})(window.FC);
