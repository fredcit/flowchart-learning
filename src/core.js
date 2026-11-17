/* ============================================================
   core.js － 符號圖形、連線路徑、自動檢查、文字步驟／虛擬碼產生
   ============================================================ */
window.FC = window.FC || {};
(function (FC) {
  'use strict';

  const FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","Heiti TC","Hiragino Sans GB",sans-serif';
  FC.FONT = FONT;

  /* ---------- 符號定義 ---------- */
  const SYM = {
    start:   { name: '開始', cat: '開始／結束', w: 130, h: 50,  fill: '#e5f6ec', stroke: '#2a9d5c', desc: '流程的開始', example: '開始', defText: '開始',
               tip: '整張流程圖只會有一個「開始」，而且只有往下一步的流向線。' },
    end:     { name: '結束', cat: '開始／結束', w: 130, h: 50,  fill: '#e5f6ec', stroke: '#2a9d5c', desc: '流程的結束', example: '結束', defText: '結束',
               tip: '流程的終點，不會再有流向線從它連出去。' },
    io:      { name: '輸入／輸出', cat: '輸入／輸出', w: 190, h: 60, fill: '#fff2d9', stroke: '#e0911a', desc: '輸入或輸出資料', example: '輸入「帳號」', defText: '',
               tip: '文字常寫成「輸入…」或「輸出…」，例如：輸入甲數、輸出總和。' },
    process: { name: '處理程序', cat: '處理程序', w: 180, h: 60, fill: '#e6f1fd', stroke: '#2b78c2', desc: '要執行或處理的程序', example: '總和 = 甲數 + 乙數', defText: '',
               tip: '一般的動作、計算或處理都用長方形，例如：結帳付款。' },
    decision:{ name: '決策判斷', cat: '決策判斷', w: 210, h: 104, fill: '#fde8ea', stroke: '#d6455d', desc: '針對條件進行判斷，以決定執行的流向', example: '下雨了嗎？', defText: '',
               tip: '一定要有兩條出口，並標上「成立」與「不成立」。' },
    loop:    { name: '迴圈', cat: '迴圈', w: 200, h: 64, fill: '#efe8fb', stroke: '#7b52c7', desc: '重複執行指定的次數', example: '重複 10 次', defText: '',
               tip: '用來表示「重複做某件事」，一條出口進入重複的內容，另一條出口表示做完了。' },
    sub:     { name: '副程式', cat: '副程式', w: 180, h: 60, fill: '#e1f6f6', stroke: '#1a9aa3', desc: '已定義流程的組合', example: '吃早餐', defText: '',
               tip: '把一小段流程包起來，另外畫成一張流程圖。' },
    doc:     { name: '文件', cat: '文件', w: 170, h: 70, fill: '#fbf3d9', stroke: '#b58a14', desc: '輸入或輸出文件', example: '列印報名表', defText: '',
               tip: '資料是以「文件」形式輸入或輸出時使用。' },
    note:    { name: '註解', cat: '註解', w: 190, h: 60, fill: 'none', stroke: '#6b7785', desc: '表示附註說明之用', example: '最多可重試 3 次', defText: '',
               tip: '補充說明用，用虛線連到想說明的符號，不算流程的一部分。' },
    arrow:   { name: '流向線', cat: '流向線', w: 120, h: 40, fill: 'none', stroke: '#2a3441', desc: '流程進行的方向', example: '', defText: '',
               tip: '箭頭指向的地方就是下一步。' }
  };
  FC.SYM = SYM;
  FC.PALETTE = ['start', 'end', 'io', 'process', 'decision', 'loop', 'sub', 'doc', 'note'];

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  FC.esc = esc;

  const size = n => { const s = SYM[n.type]; return [n.w || s.w, n.h || s.h]; };
  FC.size = size;

  /* ---------- 符號外形 ---------- */
  function shape(type, w, h, o) {
    o = o || {};
    const S = SYM[type];
    const fill = o.fill || S.fill, stroke = o.stroke || S.stroke, sw = o.sw || 2;
    const a = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`;
    const hw = w / 2, hh = h / 2;
    switch (type) {
      case 'start': case 'end':
        return `<rect x="${-hw}" y="${-hh}" width="${w}" height="${h}" rx="${hh}" ${a}/>`;
      case 'io': { const k = Math.min(22, w * 0.13);
        return `<polygon points="${-hw + k},${-hh} ${hw},${-hh} ${hw - k},${hh} ${-hw},${hh}" ${a}/>`; }
      case 'process':
        return `<rect x="${-hw}" y="${-hh}" width="${w}" height="${h}" ${a}/>`;
      case 'decision':
        return `<polygon points="0,${-hh} ${hw},0 0,${hh} ${-hw},0" ${a}/>`;
      case 'loop': { const k = Math.min(24, w * 0.14);
        return `<polygon points="${-hw + k},${-hh} ${hw - k},${-hh} ${hw},0 ${hw - k},${hh} ${-hw + k},${hh} ${-hw},0" ${a}/>`; }
      case 'sub':
        return `<rect x="${-hw}" y="${-hh}" width="${w}" height="${h}" ${a}/>` +
          `<line x1="${-hw + 14}" y1="${-hh}" x2="${-hw + 14}" y2="${hh}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<line x1="${hw - 14}" y1="${-hh}" x2="${hw - 14}" y2="${hh}" stroke="${stroke}" stroke-width="${sw}"/>`;
      case 'doc':
        return `<path d="M${-hw},${-hh} H${hw} V${hh - 9} Q${hw / 2},${hh - 25} 0,${hh - 9} T${-hw},${hh - 9} Z" ${a}/>`;
      case 'note':
        return `<rect x="${-hw}" y="${-hh}" width="${w}" height="${h}" fill="transparent" stroke="none"/>` +
          `<path d="M${-hw + 14},${-hh} H${-hw} V${hh} H${-hw + 14}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`;
      case 'arrow':
        return `<line x1="${-hw}" y1="0" x2="${hw - 12}" y2="0" stroke="${stroke}" stroke-width="2.4"/>` +
          `<polygon points="${hw},0 ${hw - 16},-8 ${hw - 16},8" fill="${stroke}"/>`;
    }
    return '';
  }
  FC.shape = shape;

  /* 小圖示（卡片、測驗、簡報用） */
  FC.icon = function (type, o) {
    o = o || {};
    const S = SYM[type];
    let w = o.w || (type === 'decision' ? 96 : type === 'arrow' ? 110 : 110);
    let h = o.h || (type === 'decision' ? 54 : type === 'arrow' ? 30 : type === 'doc' ? 46 : 42);
    const pw = w + 8, ph = h + 8;
    return `<svg class="sym-icon" viewBox="${-pw / 2} ${-ph / 2} ${pw} ${ph}" width="${pw}" height="${ph}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shape(type, w, h, o)}</svg>`;
  };

  /* ---------- 文字排版 ---------- */
  const charW = (ch, fs) => ch.charCodeAt(0) > 255 ? fs : fs * 0.58;
  function wrap(text, maxW, fs) {
    const lines = []; let cur = '', cw = 0;
    for (const ch of text) {
      if (ch === '\n') { lines.push(cur); cur = ''; cw = 0; continue; }
      const w = charW(ch, fs);
      if (cw + w > maxW && cur) { lines.push(cur); cur = ''; cw = 0; }
      cur += ch; cw += w;
    }
    lines.push(cur);
    return lines;
  }
  function fitText(text, maxW, maxH) {
    /* 先試著縮小字級讓文字排成單行；不行再換行，並讓每行長度平均 */
    for (const fs of [17, 16]) {
      const lines = wrap(text, maxW, fs);
      if (lines.length === 1 && fs * 1.28 <= maxH) return { fs, lines };
    }
    const width = (t, fs) => Array.from(t).reduce((a, ch) => a + charW(ch, fs), 0);
    for (const fs of [17, 16, 15, 14, 13, 12, 11]) {
      let lines = wrap(text, maxW, fs);
      if (lines.length > 1) {
        const total = width(text.replace(/\n/g, ''), fs);
        const bal = wrap(text, Math.min(maxW, total / lines.length + fs), fs);
        if (bal.length <= lines.length) lines = bal;
      }
      if (lines.length * fs * 1.28 <= maxH) return { fs, lines };
    }
    return { fs: 11, lines: wrap(text, maxW, 11) };
  }
  const textBox = (type, w, h) => ({
    start: [w - 26, h - 8], end: [w - 26, h - 8], io: [w - 50, h - 10], process: [w - 18, h - 10],
    decision: [w * 0.56, h * 0.56], loop: [w - 62, h - 10], sub: [w - 52, h - 10], doc: [w - 20, h - 30], note: [w - 34, h - 6]
  }[type]);

  function nodeText(n, o) {
    const [w, h] = size(n);
    let txt = n.text || '';
    const empty = !txt.trim();
    if (empty) { if (!o.placeholder) return ''; txt = '輸入文字'; }
    const [bw, bh] = textBox(n.type, w, h);
    const fit = fitText(txt, bw, bh);
    const lh = fit.fs * 1.28;
    const cy = n.type === 'doc' ? -6 : 0;
    const anchor = n.type === 'note' ? 'start' : 'middle';
    const x = n.type === 'note' ? -w / 2 + 22 : 0;
    const fill = empty ? '#9aa5b1' : '#1d2b3a';
    return fit.lines.map((l, i) =>
      `<text x="${x}" y="${(cy + (i - (fit.lines.length - 1) / 2) * lh + fit.fs * 0.36).toFixed(1)}" text-anchor="${anchor}" font-size="${fit.fs}" fill="${fill}" font-family='${FONT}'>${esc(l)}</text>`
    ).join('');
  }

  /* ---------- 連線路徑 ---------- */
  const DIR = { T: [0, -1], B: [0, 1], L: [-1, 0], R: [1, 0] };
  const portPos = (n, p) => { const [w, h] = size(n); const d = DIR[p]; return [n.x + d[0] * w / 2, n.y + d[1] * h / 2]; };
  FC.portPos = portPos;

  function simplify(pts) {
    const out = [];
    for (const p of pts) {
      const last = out[out.length - 1];
      if (last && Math.abs(last[0] - p[0]) < 0.5 && Math.abs(last[1] - p[1]) < 0.5) continue;
      out.push(p);
    }
    for (let i = out.length - 2; i > 0; i--) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      if ((Math.abs(a[0] - b[0]) < 0.5 && Math.abs(b[0] - c[0]) < 0.5) || (Math.abs(a[1] - b[1]) < 0.5 && Math.abs(b[1] - c[1]) < 0.5)) out.splice(i, 1);
    }
    return out;
  }

  function route(sn, sp, tn, tp) {
    const a = portPos(sn, sp), b = portPos(tn, tp), ds = DIR[sp], dt = DIR[tp], S = 24;
    const p1 = [a[0] + ds[0] * S, a[1] + ds[1] * S], q1 = [b[0] + dt[0] * S, b[1] + dt[1] * S];
    const sv = ds[0] === 0, tv = dt[0] === 0;
    let mid;
    if (sv && tv) {
      const Y = ds[1] === dt[1] ? (ds[1] > 0 ? Math.max(p1[1], q1[1]) : Math.min(p1[1], q1[1])) : (p1[1] + q1[1]) / 2;
      mid = [[p1[0], Y], [q1[0], Y]];
    } else if (!sv && !tv) {
      const X = ds[0] === dt[0] ? (ds[0] > 0 ? Math.max(p1[0], q1[0]) : Math.min(p1[0], q1[0])) : (p1[0] + q1[0]) / 2;
      mid = [[X, p1[1]], [X, q1[1]]];
    } else if (!sv && tv) mid = [[q1[0], p1[1]]];
    else mid = [[p1[0], q1[1]]];
    return simplify([a, p1, ...mid, q1, b]);
  }

  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]); return L; }
  function segHitsRect(p, q, r) {
    if (Math.abs(p[0] - q[0]) < 0.5) {
      const x = p[0]; if (x <= r[0] || x >= r[2]) return false;
      return Math.max(Math.min(p[1], q[1]), r[1]) < Math.min(Math.max(p[1], q[1]), r[3]);
    }
    const y = p[1]; if (y <= r[1] || y >= r[3]) return false;
    return Math.max(Math.min(p[0], q[0]), r[0]) < Math.min(Math.max(p[0], q[0]), r[2]);
  }
  function score(pts, sp, tp, sn, tn, nodes) {
    let s = polyLen(pts) + 40 * Math.max(0, pts.length - 2);
    const ds = DIR[sp], dt = DIR[tp];
    if (pts.length > 2) {
      const f = [pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]];
      if (f[0] * ds[0] + f[1] * ds[1] < 0) s += 300;
      const m = pts.length;
      const l = [pts[m - 1][0] - pts[m - 2][0], pts[m - 1][1] - pts[m - 2][1]];
      const l2 = [pts[m - 2][0] - pts[m - 3][0], pts[m - 2][1] - pts[m - 3][1]];
      if (l2[0] * dt[0] + l2[1] * dt[1] > 0) s += 300;
    }
    const sc = [tn.x - sn.x, tn.y - sn.y];
    if (sc[0] * ds[0] + sc[1] * ds[1] < 0) s += 250;
    if (-sc[0] * dt[0] + -sc[1] * dt[1] < 0) s += 250;
    /* 慣例：往下走時從上方進入；決策／迴圈的分支優先走左右兩側 */
    const dy = tn.y - sn.y, dx = tn.x - sn.x;
    if (dy > 40 && tp !== 'T') s += 140;
    if (dy > 40 && sp === 'T') s += 150;
    if ((sn.type === 'decision' || sn.type === 'loop') && sp === 'B' && Math.abs(dx) > 40) s += 160;
    if (Math.abs(dy) <= 40 && Math.abs(dx) > 40 && !((sp === 'R' && tp === 'L') || (sp === 'L' && tp === 'R'))) s += 120;
    for (const n of nodes) {
      if (n.id === sn.id || n.id === tn.id) continue;
      const [w, h] = size(n);
      const r = [n.x - w / 2 - 4, n.y - h / 2 - 4, n.x + w / 2 + 4, n.y + h / 2 + 4];
      for (let i = 1; i < pts.length; i++) if (segHitsRect(pts[i - 1], pts[i], r)) { s += 600; break; }
    }
    return s;
  }

  FC.layoutEdges = function (graph) {
    const N = {}; graph.nodes.forEach(n => N[n.id] = n);
    const used = {}, routes = {};
    const u = (id, p) => used[id + p] || (used[id + p] = { out: 0, inn: 0 });
    for (const e of graph.edges) {
      const sn = N[e.from], tn = N[e.to];
      if (!sn || !tn) continue;
      if (e.via && e.sp && e.tp) {                 // 明確指定的繞線（參考答案用）
        routes[e.id] = simplify([portPos(sn, e.sp), ...e.via, portPos(tn, e.tp)]);
        u(sn.id, e.sp).out++; u(tn.id, e.tp).inn++;
        continue;
      }
      if (e.sp && e.tp && !e.via) {                // 只指定出入口
        routes[e.id] = route(sn, e.sp, tn, e.tp);
        u(sn.id, e.sp).out++; u(tn.id, e.tp).inn++;
        continue;
      }
      let best = null;
      for (const sp of 'BRLT') for (const tp of 'TLRB') {
        const pts = route(sn, sp, tn, tp);
        let sc = score(pts, sp, tp, sn, tn, graph.nodes);
        const a = u(sn.id, sp), b = u(tn.id, tp);
        sc += a.out * 1500 + a.inn * 900;      // 出口已被占用／已有線進來
        sc += b.out * 900 + b.inn * 20;        // 入口已有線出去（重疊）；多條線匯入可以
        if (!best || sc < best.sc) best = { sc, pts, sp, tp };
      }
      u(sn.id, best.sp).out++; u(tn.id, best.tp).inn++;
      routes[e.id] = best.pts;
    }
    return routes;
  };

  function pointAlong(pts, d) {
    let rem = d;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], L = Math.abs(dx) + Math.abs(dy);
      if (rem <= L || i === pts.length - 1) { const t = L ? Math.min(1, rem / L) : 0; return [pts[i - 1][0] + dx * t, pts[i - 1][1] + dy * t]; }
      rem -= L;
    }
    return pts[0];
  }

  /* ---------- 整張圖的 SVG 內容 ---------- */
  let uidCounter = 0;
  FC.graphMarkup = function (graph, o) {
    o = o || {};
    const uid = 'm' + (++uidCounter);
    const N = {}; graph.nodes.forEach(n => N[n.id] = n);
    const routes = FC.layoutEdges(graph);
    const sel = o.selected || null;
    let s = `<defs><marker id="${uid}a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2a3441"/></marker>` +
      `<marker id="${uid}b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#1f6fb2"/></marker></defs>`;

    /* 流向線 */
    for (const e of graph.edges) {
      const pts = routes[e.id]; if (!pts) continue;
      const sn = N[e.from], tn = N[e.to];
      const dashed = sn.type === 'note' || tn.type === 'note';
      const isSel = sel && sel.t === 'edge' && sel.id === e.id;
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      const col = isSel ? '#1f6fb2' : '#2a3441';
      s += `<g class="edge" data-edge="${e.id}">`;
      if (o.interactive) s += `<path d="${d}" fill="none" stroke="transparent" stroke-width="18" class="edge-hit"/>`;
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${isSel ? 3 : 2}" ${dashed ? 'stroke-dasharray="6 5"' : `marker-end="url(#${uid}${isSel ? 'b' : 'a'})"`} stroke-linejoin="round"/>`;
      if (e.label) {
        const [lx, ly] = pointAlong(pts, 38);
        const w = Math.max(30, e.label.length * 13 + 12);
        s += `<rect x="${(lx - w / 2).toFixed(1)}" y="${(ly - 10).toFixed(1)}" width="${w}" height="20" rx="10" fill="#fff" stroke="${isSel ? '#1f6fb2' : '#c8d2dc'}"/>` +
          `<text x="${lx.toFixed(1)}" y="${(ly + 4.5).toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${/不|否|錯/.test(e.label) ? '#c0392b' : '#1e7e4a'}" font-family='${FONT}'>${esc(e.label)}</text>`;
      }
      s += `</g>`;
    }

    /* 符號 */
    for (const n of graph.nodes) {
      const [w, h] = size(n);
      const isSel = sel && sel.t === 'node' && sel.id === n.id;
      const cls = 'node' + (o.pending === n.id ? ' pending' : '') + (o.flash && o.flash.has(n.id) ? ' flash' : '');
      s += `<g class="${cls}" data-node="${n.id}" transform="translate(${n.x},${n.y})">`;
      s += shape(n.type, w, h);
      s += nodeText(n, o);
      if (o.flash && o.flash.has(n.id)) s += `<rect x="${-w / 2 - 7}" y="${-h / 2 - 7}" width="${w + 14}" height="${h + 14}" rx="10" fill="none" stroke="#e0412f" stroke-width="3" stroke-dasharray="7 5" class="flash-ring"/>`;
      if (o.runErr === n.id) s += `<rect x="${-w / 2 - 8}" y="${-h / 2 - 8}" width="${w + 16}" height="${h + 16}" rx="11" fill="none" stroke="#e0412f" stroke-width="4" pointer-events="none"/>`;
      else if (o.running === n.id) s += `<rect x="${-w / 2 - 8}" y="${-h / 2 - 8}" width="${w + 16}" height="${h + 16}" rx="11" fill="rgba(42,157,92,.12)" stroke="#2a9d5c" stroke-width="4" pointer-events="none"/>`;
      if (isSel && o.interactive) {
        s += `<rect x="${-w / 2 - 6}" y="${-h / 2 - 6}" width="${w + 12}" height="${h + 12}" rx="8" fill="none" stroke="#1f6fb2" stroke-width="1.6" stroke-dasharray="5 4" pointer-events="none"/>`;
        for (const p of 'TRBL') {
          const d = DIR[p];
          s += `<g class="port" data-port="${p}" data-node="${n.id}" transform="translate(${d[0] * (w / 2 + 6)},${d[1] * (h / 2 + 6)})"><circle r="16" fill="transparent"/><circle r="7" fill="#fff" stroke="#1f6fb2" stroke-width="2.2"/><circle r="2.6" fill="#1f6fb2"/></g>`;
        }
      }
      s += `</g>`;
    }

    /* 連線預覽 */
    if (o.rubber) {
      const sn = N[o.rubber.from];
      if (sn) {
        const a = portPos(sn, o.rubber.port);
        s += `<line x1="${a[0]}" y1="${a[1]}" x2="${o.rubber.x}" y2="${o.rubber.y}" stroke="#1f6fb2" stroke-width="2.4" stroke-dasharray="6 5" pointer-events="none"/>`;
      }
    }
    return { markup: s, routes };
  };

  FC.bbox = function (graph, routes) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of graph.nodes) {
      const [w, h] = size(n);
      x1 = Math.min(x1, n.x - w / 2); x2 = Math.max(x2, n.x + w / 2);
      y1 = Math.min(y1, n.y - h / 2); y2 = Math.max(y2, n.y + h / 2);
    }
    for (const id in routes) for (const p of routes[id]) { x1 = Math.min(x1, p[0]); x2 = Math.max(x2, p[0]); y1 = Math.min(y1, p[1]); y2 = Math.max(y2, p[1]); }
    if (!isFinite(x1)) return { x: 0, y: 0, w: 200, h: 100 };
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  };

  /* 獨立 SVG 字串（PDF、簡報用） */
  FC.svgString = function (graph, o) {
    o = o || {};
    const pad = o.pad == null ? 24 : o.pad;
    const { markup, routes } = FC.graphMarkup(graph, { interactive: false });
    const b = FC.bbox(graph, routes);
    const W = Math.ceil(b.w + pad * 2), H = Math.ceil(b.h + pad * 2);
    const vb = `${Math.floor(b.x - pad)} ${Math.floor(b.y - pad)} ${W} ${H}`;
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${W}" height="${H}">${markup}</svg>`, w: W, h: H, vb };
  };

  /* 簡報用：把圖直接放進 HTML */
  FC.chartHTML = function (graph, o) {
    o = o || {};
    const r = FC.svgString(graph, { pad: o.pad == null ? 14 : o.pad });
    const style = o.height ? `height:${o.height}px;width:auto;` : (o.width ? `width:${o.width}px;height:auto;` : '');
    return r.svg.replace('<svg ', `<svg class="chart-svg" style="${style}" `);
  };

  /* 依序排成一串的小工具 */
  FC.chain = function (items, o) {
    o = o || {};
    const horizontal = o.dir === 'h', gap = o.gap || 44;
    const nodes = [], edges = [];
    let pos = 0;
    items.forEach((it, i) => {
      const n = { id: 'n' + (i + 1), type: it.type, text: it.text, w: it.w, h: it.h };
      const [w, h] = size(n);
      if (horizontal) { n.x = pos + w / 2; n.y = 50; pos += w + gap; }
      else { n.x = 200; n.y = pos + h / 2 + 10; pos += h + gap; }
      nodes.push(n);
      if (i) edges.push({ id: 'e' + i, from: 'n' + i, to: 'n' + (i + 1), label: '' });
    });
    return { nodes, edges };
  };

  /* ---------- 範例流程圖（簡報、教師參考答案） ---------- */
  FC.sample = {
    sum: () => FC.chain([
      { type: 'start', text: '開始' }, { type: 'io', text: '輸入甲數' }, { type: 'io', text: '輸入乙數' },
      { type: 'process', text: '總和 = 甲數 + 乙數' }, { type: 'io', text: '輸出總和' }, { type: 'end', text: '結束' }]),
    shopping: (dir) => {
      const h = dir === 'h';
      const P = t => ({ type: 'process', text: t, w: h ? 118 : undefined, h: h ? 80 : undefined });
      const E = t => ({ type: t === '開始' ? 'start' : 'end', text: t, w: h ? 96 : undefined, h: h ? 54 : undefined });
      return FC.chain([E('開始'), P('商品放入購物車'), P('填寫寄送資料'), P('結帳付款'), P('貨物配送'), P('取得商品'), E('結束')], h ? { dir: 'h', gap: 36 } : {});
    },
    rain: () => ({
      nodes: [
        { id: 'n1', type: 'start', text: '開始', x: 250, y: 40 },
        { id: 'n2', type: 'decision', text: '下雨', x: 250, y: 150 },
        { id: 'n3', type: 'process', text: '去圖書館', x: 100, y: 290 },
        { id: 'n4', type: 'process', text: '打籃球', x: 400, y: 290 },
        { id: 'n5', type: 'end', text: '結束', x: 250, y: 410 }],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', label: '' }, { id: 'e2', from: 'n2', to: 'n3', label: '成立' },
        { id: 'e3', from: 'n2', to: 'n4', label: '不成立' }, { id: 'e4', from: 'n3', to: 'n5', label: '' }, { id: 'e5', from: 'n4', to: 'n5', label: '' }]
    }),
    login: () => ({
      nodes: [
        { id: 'n1', type: 'start', text: '開始', x: 260, y: 40 },
        { id: 'n2', type: 'process', text: '開啟網頁', x: 260, y: 125 },
        { id: 'n3', type: 'io', text: '輸入「帳號密碼」', x: 260, y: 215 },
        { id: 'n4', type: 'decision', text: '帳號密碼正確', x: 260, y: 335 },
        { id: 'n5', type: 'io', text: '輸出「歡迎畫面」', x: 260, y: 465 },
        { id: 'n6', type: 'end', text: '結束', x: 260, y: 550 }],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', label: '' }, { id: 'e2', from: 'n2', to: 'n3', label: '' }, { id: 'e3', from: 'n3', to: 'n4', label: '' },
        { id: 'e4', from: 'n4', to: 'n5', label: '成立' }, { id: 'e5', from: 'n4', to: 'n3', label: '不成立' }, { id: 'e6', from: 'n5', to: 'n6', label: '' }]
    }),
    morningMain: () => FC.chain([
      { type: 'start', text: '開始' }, { type: 'process', text: '起床' }, { type: 'sub', text: '整理儀容' },
      { type: 'sub', text: '吃早餐' }, { type: 'process', text: '上學' }, { type: 'end', text: '結束' }], { gap: 36 }),
    breakfastSub: () => ({
      nodes: [
        { id: 'n1', type: 'start', text: '吃早餐', x: 230, y: 40 },
        { id: 'n2', type: 'decision', text: '時間充足', x: 230, y: 150 },
        { id: 'n3', type: 'process', text: '自己做三明治', x: 90, y: 280, w: 160 },
        { id: 'n4', type: 'process', text: '慢慢享用', x: 90, y: 370, w: 160 },
        { id: 'n5', type: 'process', text: '買麵包吃', x: 380, y: 280, w: 140 },
        { id: 'n6', type: 'end', text: '返回主程式', x: 230, y: 470, w: 160 }],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', label: '' }, { id: 'e2', from: 'n2', to: 'n3', label: '成立' }, { id: 'e3', from: 'n2', to: 'n5', label: '不成立' },
        { id: 'e4', from: 'n3', to: 'n4', label: '' }, { id: 'e5', from: 'n4', to: 'n6', label: '' }, { id: 'e6', from: 'n5', to: 'n6', label: '' }]
    })
  };

  /* ============================================================
     分析：檢查提示、文字步驟、虛擬碼
     ============================================================ */
  const YES = /^(成立|是|yes|y|對|真|有|正確)$/i, NO = /^(不成立|否|no|n|不是|錯|假|沒有|錯誤)$/i;

  FC.analyze = function (graph, topic) {
    const N = {}; graph.nodes.forEach(n => N[n.id] = n);
    const flow = graph.edges.filter(e => N[e.from] && N[e.to] && N[e.from].type !== 'note' && N[e.to].type !== 'note');
    const outs = {}, ins = {};
    graph.nodes.forEach(n => { outs[n.id] = []; ins[n.id] = []; });
    flow.forEach(e => { outs[e.from].push(e); ins[e.to].push(e); });
    const real = graph.nodes.filter(n => n.type !== 'note');
    const nm = n => (n.text && n.text.trim()) ? `「${n.text.trim()}」` : `未填文字的「${SYM[n.type].name}」`;

    const warn = [], info = [], ok = [];
    const W = (msg, ids) => warn.push({ lv: 'warn', msg, ids: ids || [] });
    const I = (msg, ids) => info.push({ lv: 'info', msg, ids: ids || [] });
    const OK = msg => ok.push({ lv: 'ok', msg, ids: [] });

    if (!graph.nodes.length) {
      return { checks: [{ lv: 'info', msg: '從左邊的符號區，把符號拖曳（或點一下）放到畫布上開始畫吧！', ids: [] }], steps: [], code: [], counts: { warn: 0, info: 1, ok: 0 }, empty: true };
    }

    /* 開始／結束 */
    const starts = real.filter(n => n.type === 'start'), ends = real.filter(n => n.type === 'end');
    if (starts.length === 0) W('還沒有「開始」符號，流程要從「開始」出發。');
    else if (starts.length > 1) W('「開始」只需要 1 個，目前有 ' + starts.length + ' 個。', starts.map(n => n.id));
    else OK('有 1 個「開始」。');
    if (ends.length === 0) W('還沒有「結束」符號，流程要有終點。');
    else OK('有「結束」符號。');
    starts.forEach(n => {
      if (ins[n.id].length) W('「開始」不應該有流向線連進來。', [n.id]);
      if (!outs[n.id].length && real.length > 1) W('「開始」還沒有連到下一步。', [n.id]);
    });
    ends.forEach(n => { if (outs[n.id].length) W('「結束」後面不應該再連出流向線。', [n.id]); });

    /* 空白文字 */
    const blank = real.filter(n => !(n.text || '').trim());
    if (blank.length) W(`有 ${blank.length} 個符號還沒有填文字（點選符號後在上方輸入）。`, blank.map(n => n.id));
    else OK('每個符號都有文字。');

    /* 懸空 */
    const noIn = real.filter(n => n.type !== 'start' && !ins[n.id].length);
    noIn.forEach(n => W(`${nm(n)} 沒有流向線連進來。`, [n.id]));
    const noOut = real.filter(n => n.type !== 'end' && !outs[n.id].length && !(n.type === 'start' && real.length === 1));
    noOut.forEach(n => { if (n.type !== 'start') W(`${nm(n)} 還沒有連到下一步。`, [n.id]); });
    if (!noIn.length && !noOut.length && real.length > 1) OK('所有符號都有用流向線連起來。');

    /* 決策與迴圈 */
    let decOK = true;
    real.filter(n => n.type === 'decision').forEach(n => {
      const o = outs[n.id];
      if (o.length < 2) { W(`${nm(n)} 是決策判斷，需要 2 條出口（成立／不成立），目前只有 ${o.length} 條。`, [n.id]); decOK = false; }
      else if (o.length > 2) { W(`${nm(n)} 的出口太多了，決策判斷只需要 2 條。`, [n.id]); decOK = false; }
      else if (o.some(e => !(e.label || '').trim())) { W(`${nm(n)} 的出口要標上「成立」或「不成立」（點選流向線可設定）。`, [n.id]); decOK = false; }
      else if (o[0].label === o[1].label) { W(`${nm(n)} 的兩條出口標籤相同，要分成「成立」與「不成立」。`, [n.id]); decOK = false; }
    });
    if (decOK && real.some(n => n.type === 'decision')) OK('決策判斷都有 2 條標好的出口。');
    real.filter(n => n.type === 'loop').forEach(n => {
      if (outs[n.id].length < 2) W(`${nm(n)} 是迴圈，需要一條「重複」的出口和一條「完成」的出口。`, [n.id]);
    });
    real.filter(n => !['decision', 'loop', 'end'].includes(n.type) && outs[n.id].length > 1)
      .forEach(n => W(`${nm(n)} 有多條出口，只有「決策判斷」或「迴圈」才需要分支。`, [n.id]));

    /* 從開始可到達？ + 迴圈偵測 */
    const backSet = new Set();
    if (starts.length === 1) {
      const color = {};
      const dfs = id => { color[id] = 1; for (const e of outs[id]) { if (color[e.to] === 1) backSet.add(e.id); else if (!color[e.to]) dfs(e.to); } color[id] = 2; };
      dfs(starts[0].id);
      const lost = real.filter(n => !color[n.id] && ins[n.id].length);
      if (lost.length && !noIn.length) W('有些符號從「開始」走不到，檢查流向線有沒有連錯。', lost.map(n => n.id));
    }

    /* 用法小提醒 */
    real.filter(n => n.type === 'process' && /^(輸入|輸出|顯示|印出|列印)/.test((n.text || '').trim()))
      .forEach(n => I(`${nm(n)} 看起來是輸入／輸出，可以改用平行四邊形的「輸入／輸出」符號。`, [n.id]));
    real.filter(n => n.type === 'io' && (n.text || '').trim() && !/(輸入|輸出|顯示|印出|列印|讀取|取得|畫面|資料)/.test(n.text))
      .forEach(n => I(`${nm(n)} 用了輸入／輸出符號，文字通常會寫成「輸入…」或「輸出…」。`, [n.id]));
    real.filter(n => n.type === 'decision' && (n.text || '').trim().length > 14)
      .forEach(n => I(`${nm(n)} 文字有點長，決策判斷的文字寫成簡短條件會更清楚。`, [n.id]));

    /* 繪製原則：由上而下、線條不交叉 */
    const upward = flow.filter(e => !backSet.has(e.id) && N[e.to].y < N[e.from].y - 20 && N[e.from].type !== 'note');
    if (upward.length) I('有流向線是往上走的。繪製方向盡量「由上而下、由左至右」。', [...new Set(upward.map(e => e.to))]);
    const routes = FC.layoutEdges({ nodes: graph.nodes, edges: flow });
    let cross = 0; const ids = Object.keys(routes);
    const segs = id => { const p = routes[id], out = []; for (let i = 1; i < p.length; i++) out.push([p[i - 1], p[i]]); return out; };
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      for (const [a, b] of segs(ids[i])) for (const [c, d] of segs(ids[j])) {
        const av = Math.abs(a[0] - b[0]) < 0.5, cv = Math.abs(c[0] - d[0]) < 0.5;
        if (av === cv) continue;
        const [v1, v2, h1, h2] = av ? [a, b, c, d] : [c, d, a, b];
        const x = v1[0], y = h1[1];
        if (x > Math.min(h1[0], h2[0]) + 1 && x < Math.max(h1[0], h2[0]) - 1 && y > Math.min(v1[1], v2[1]) + 1 && y < Math.max(v1[1], v2[1]) - 1) cross++;
      }
    }
    if (cross) I(`有 ${cross} 處流向線互相交叉，試著移動符號讓線條不要交叉。`);
    else if (flow.length > 2) OK('流向線沒有交叉。');

    /* 題目需求 */
    const ex = (topic && topic.expect) || {};
    const body = real.filter(n => !['start', 'end'].includes(n.type));
    if (ex.minSteps && body.length < ex.minSteps) I(`題目大約有 ${ex.minSteps} 個步驟（${ex.stepsHint || ''}），目前畫了 ${body.length} 個，看看有沒有漏掉。`);
    if (ex.decision && !real.some(n => n.type === 'decision')) I('這個主題需要依條件做不同的事，想想看哪裡要用「決策判斷」符號？');
    const decCount = real.filter(n => n.type === 'decision').length;
    const hasLoopSym = real.some(n => n.type === 'loop');
    if (ex.loop && starts.length === 1 && !backSet.size && !hasLoopSym) I('這一關要「重複」做事：可以用「迴圈」符號，或用決策判斷再把「不成立」連回前面。');
    if (ex.loop && (backSet.size || hasLoopSym) && starts.length === 1) OK('有用到重複（迴圈）。');
    if (ex.minDecisions && decCount < ex.minDecisions) I(`這一關需要 ${ex.minDecisions} 個決策判斷（目前 ${decCount} 個），想想看還要檢查什麼條件？`);
    else if (ex.minDecisions) OK(`有 ${ex.minDecisions} 個以上的決策判斷。`);
    if (ex.loopBack && starts.length === 1 && !backSet.size) I('這個主題輸入錯誤時要「回到」前面的步驟，試試看讓「不成立」的流向線連回去。');
    if (ex.minSteps && body.length >= ex.minSteps) OK('步驟數量符合題目。');
    if (ex.decision && real.some(n => n.type === 'decision')) OK('已經用到決策判斷。');
    if (ex.loopBack && backSet.size) OK('有流向線回到前面的步驟，形成重複。');
    if (topic && topic.id === 'custom' && !real.some(n => n.type === 'decision') && real.length > 3)
      I('想想看你的情境裡有沒有「如果…就…」要判斷的地方？有的話可以加入決策判斷。');

    /* 文字步驟與虛擬碼 */
    let gen = { steps: [], code: [] };
    if (starts.length === 1) gen = generate(N, outs, starts[0].id);

    const counts = { warn: warn.length, info: info.length, ok: ok.length };
    if (!warn.length && !info.length && real.length > 2) ok.unshift({ lv: 'ok', msg: '目前沒有需要修正的地方，很棒！', ids: [] });
    return { checks: [...warn, ...info, ...ok], steps: gen.steps, code: gen.code, counts, backCount: backSet.size };
  };

  /* ---------- 由流程圖走訪，產生文字步驟與虛擬碼 ---------- */
  function generate(N, outs, startId) {
    const num = new Map(); let k = 0;
    const steps = [], code = [], activeLoops = [];
    const out = id => outs[id] || [];
    const trim = s => (s || '').trim() || '（未填文字）';

    function pickDec(id) {
      const es = out(id);
      let y = es.find(e => YES.test((e.label || '').trim())), n = es.find(e => NO.test((e.label || '').trim()));
      const rest = es.filter(e => e !== y && e !== n);
      if (!y) y = rest.shift();
      if (!n) n = rest.shift();
      return { y, n };
    }
    function pickLoop(id) {
      const es = out(id);
      let body = es.find(e => /重複|迴圈|繼續|進入/.test(e.label || '')), exit = es.find(e => /完成|結束|離開|跳出/.test(e.label || ''));
      const rest = es.filter(e => e !== body && e !== exit);
      if (!body) body = rest.shift();
      if (!exit) exit = rest.shift();
      return { body, exit };
    }
    function reach(from) {
      const seen = new Set(), order = [], q = [from];
      while (q.length) {
        const id = q.shift();
        if (!id || seen.has(id) || num.has(id)) continue;
        seen.add(id); order.push(id);
        out(id).forEach(e => q.push(e.to));
      }
      return order;
    }
    function findMerge(a, b) {
      if (!a || !b) return null;
      const ra = reach(a), sb = new Set(reach(b));
      return ra.find(id => sb.has(id)) || null;
    }
    const stripQuote = s => s.replace(/^[「『"]/, '').replace(/[」』"]$/, '');
    function stepText(nd) {
      const t = trim(nd.text).replace(/[。.]$/, '');
      if (nd.type === 'sub') return `執行副程式「${t}」。`;
      if (nd.type === 'doc') return `${t}（文件）。`;
      return t + '。';
    }
    function codeText(nd) {
      const t = trim(nd.text);
      if (nd.type === 'io') {
        let m = t.match(/^(?:請)?(?:輸入|讀取|讀入|取得)\s*(.*)$/);
        if (m && m[1]) return 'input ' + stripQuote(m[1]);
        m = t.match(/^(?:輸出|顯示|印出|列印|顯示出)\s*(.*)$/);
        if (m && m[1]) return 'print ' + stripQuote(m[1]);
        return t;
      }
      if (nd.type === 'sub') return 'call ' + t;
      if (nd.type === 'doc') return 'doc ' + t;
      return t;
    }

    /* si：文字步驟的縮排層級；ci：虛擬碼的縮排層級 */
    function walk(id, si, ci, stop) {
      let guard = 0;
      while (id && id !== stop && guard++ < 400) {
        const nd = N[id]; if (!nd) return;
        if (num.has(id)) {
          const j = num.get(id);
          if (activeLoops.includes(id)) return;          // 回到所在的迴圈，不需要另外寫
          if (j > 0) { steps.push({ ind: si, t: `回到步驟 ${j}。`, go: 1 }); code.push({ ind: ci, t: `goto ${j}` }); }
          return;
        }
        if (nd.type === 'start') { num.set(id, 0); id = (out(id)[0] || {}).to; continue; }
        if (nd.type === 'end') { steps.push({ ind: si, t: '結束。', end: 1 }); code.push({ ind: ci, t: 'end' }); return; }
        const kk = ++k; num.set(id, kk);
        const txt = trim(nd.text);

        if (nd.type === 'decision') {
          const { y, n } = pickDec(id);
          const ya = y && y.to, na = n && n.to;
          const merge = findMerge(ya, na);
          steps.push({ ind: si, k: kk, t: `判斷「${txt}」。` });
          code.push({ ind: ci, k: kk, t: `if ${txt} then` });

          steps.push({ ind: si + 1, t: `若${(y && y.label) || '成立'}，則：`, head: 1 });
          let s0 = steps.length, c0 = code.length;
          walk(ya, si + 2, ci + 1, merge);
          if (steps.length === s0) steps.push({ ind: si + 2, t: '（不用做任何事）', dim: 1 });
          if (code.length === c0) code.push({ ind: ci + 1, t: '（略）', dim: 1 });

          steps.push({ ind: si + 1, t: `若${(n && n.label) || '不成立'}，則：`, head: 1 });
          s0 = steps.length;
          const hasElse = n && na && na !== merge;
          if (hasElse) code.push({ ind: ci, t: 'else' });
          const cElse = code.length;
          walk(na, si + 2, ci + 1, merge);
          if (hasElse && code.length === cElse) code.pop();      // else 裡面沒有內容就不寫
          if (steps.length === s0) steps.push({ ind: si + 2, t: '（不用做任何事）', dim: 1 });
          code.push({ ind: ci, t: 'end if' });
          id = merge; if (!merge) return; continue;
        }

        if (nd.type === 'loop') {
          const { body, exit } = pickLoop(id);
          const until = txt.match(/^(?:重複)?\s*直到\s*(.+)$/), times = txt.match(/^重複\s*(\d+)\s*次$/);
          let st, cd, end = 'end while';
          if (until) { st = `重複下面的動作，直到${until[1]}：`; cd = `repeat until ${until[1]}`; end = 'end repeat'; }
          else if (times) { st = `重複 ${times[1]} 次下面的動作：`; cd = `repeat ${times[1]} times`; end = 'end repeat'; }
          else { st = `重複「${txt}」：`; cd = `while ${txt}`; }
          steps.push({ ind: si, k: kk, t: st });
          code.push({ ind: ci, k: kk, t: cd });
          const s0 = steps.length;
          activeLoops.push(id);
          walk(body && body.to, si + 1, ci + 1, id);
          activeLoops.pop();
          if (steps.length === s0) steps.push({ ind: si + 1, t: '（未連接重複的內容）', dim: 1 });
          code.push({ ind: ci, t: end });
          id = exit && exit.to; if (!id) return; continue;
        }

        steps.push({ ind: si, k: kk, t: stepText(nd) });
        code.push({ ind: ci, k: kk, t: codeText(nd) });
        id = (out(id)[0] || {}).to;
      }
    }
    walk(startId, 0, 0, null);
    return { steps, code };
  }
})(window.FC);
