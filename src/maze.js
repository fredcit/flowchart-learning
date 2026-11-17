/* ============================================================
   maze.js － Blockly Games 迷宮 10 關：地圖縮圖、驗證過的解法、參考流程圖、主題資料
   地圖與積木數量上限取自 Blockly Games 開源專案（Apache License 2.0，© Google LLC）
   https://github.com/google/blockly-games
   ============================================================ */
(function (FC) {
  'use strict';

  /* 0 牆　1 路　2 起點（朝東）　3 終點 */
  const MAZE = {
    maps: [
      ["0000000", "0000000", "0000000", "0000000", "0021300", "0000000", "0000000"],
      ["00000000", "00000000", "00000000", "00013000", "00210000", "00000000", "00000000", "00000000"],
      ["00000000", "00000000", "00000000", "00000000", "02111130", "00000000", "00000000", "00000000"],
      ["00000001", "00000011", "00000310", "00001100", "00011000", "00110000", "02100000", "11000000"],
      ["00000000", "00000300", "00000100", "00000100", "00000100", "00000100", "00021100", "00000000"],
      ["00000000", "00000000", "01111100", "01000100", "01130100", "00000100", "02111100", "00000000"],
      ["00000000", "00000110", "02111100", "00000110", "01130100", "01010100", "01111110", "00000000"],
      ["00000000", "00000000", "01111000", "01001100", "01110100", "00010100", "02110300", "00000000"],
      ["00000000", "01111100", "00100000", "31111110", "01010110", "11111010", "01010210", "00000000"],
      ["00000000", "01103010", "01101110", "01010100", "01111110", "00010010", "02111010", "00000000"],
    ],
    maxBlocks: [null, null, 2, 5, 5, 5, 5, 10, 7, 10],
    url: n => `https://blockly.games/maze?lang=zh-hant&level=${n}`
  };
  FC.MAZE = MAZE;

  /* ---------- 地圖縮圖 ---------- */
  FC.mazeThumb = function (level, px) {
    px = px || 120;
    const rows = MAZE.maps[level - 1], n = rows.length, m = rows[0].length, c = 100 / Math.max(n, m);
    let s = `<svg class="mz-thumb" viewBox="0 0 ${m * c} ${n * c}" width="${px}" height="${Math.round(px * n / m)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="第 ${level} 關地圖">` +
      `<rect width="${m * c}" height="${n * c}" rx="6" fill="#eeece4"/>`;
    for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) {
      const v = rows[y][x];
      if (v === '0') continue;
      s += `<rect x="${x * c + 1}" y="${y * c + 1}" width="${c - 2}" height="${c - 2}" rx="${c * 0.22}" fill="#f7dc4a"/>`;
      if (v === '2') s += `<circle cx="${x * c + c / 2}" cy="${y * c + c / 2}" r="${c * 0.3}" fill="#2a9d5c"/><path d="M${x * c + c * 0.42},${y * c + c * 0.34} l${c * 0.26},${c * 0.16} l${-c * 0.26},${c * 0.16}z" fill="#fff"/>`;
      if (v === '3') s += `<path d="M${x * c + c / 2},${y * c + c * 0.86} C${x * c + c * 0.1},${y * c + c * 0.4} ${x * c + c * 0.25},${y * c + c * 0.08} ${x * c + c / 2},${y * c + c * 0.08} C${x * c + c * 0.75},${y * c + c * 0.08} ${x * c + c * 0.9},${y * c + c * 0.4} ${x * c + c / 2},${y * c + c * 0.86}z" fill="#d6455d"/><circle cx="${x * c + c / 2}" cy="${y * c + c * 0.38}" r="${c * 0.12}" fill="#fff"/>`;
    }
    return s + '</svg>';
  };

  /* ============================================================
     積木程式 → 流程圖（產生教師參考答案）
     程式結構：'F' 前進、'L' 左轉、'R' 右轉、['W', body] 重複直到終點、
               ['I', cond, body] 如果、['E', cond, body, else] 如果…否則
     cond：'F' 前方、'L' 左方、'R' 右方
     ============================================================ */
  const COND = { F: '前方有路', L: '左方有路', R: '右方有路' };
  const ACT = { F: '向前移動', L: '向左轉', R: '向右轉' };

  FC.progToGraph = function (prog) {
    const X0 = 430, GAP = 46, BX = 270;
    const nodes = [], edges = [];
    let nid = 0, eid = 0, low = 0;
    const byId = {};
    const add = (type, text, x, y) => { const n = { id: 'n' + (++nid), type, text, x, y }; nodes.push(n); byId[n.id] = n; return n; };
    const link = (from, to, label, extra) => { const e = Object.assign({ id: 'e' + (++eid), from, to, label: label || '' }, extra || {}); edges.push(e); return e; };
    const lowOf = n => n.y + FC.size(n)[1] / 2;
    const H = t => FC.SYM[t].h;
    /* 在 low 之下放一個符號，並把 pending 的出口連進來 */
    function place(type, text, x, pending) {
      const n = add(type, text, x, low + GAP + H(type) / 2);
      pending.forEach(p => link(p.from, n.id, p.label));
      low = Math.max(low, lowOf(n));
      return n;
    }
    /* 依序放一串敘述，回傳尚未連接的出口 */
    function seq(list, pending) {
      let cur = pending;
      for (const s of list) {
        if (typeof s === 'string') {
          const n = place('process', ACT[s], X0, cur);
          cur = [{ from: n.id, label: '', kind: 'plain' }];
          continue;
        }
        const d = place('decision', COND[s[1]], X0, cur);
        const dLow = low;
        const exits = [];
        let maxLow = dLow;
        const branch = (body, xc, port, label, kind) => {
          let prev = null, y = d.y;
          body.forEach((a, i) => {
            const n = add('process', ACT[a], xc, y);
            if (i === 0) link(d.id, n.id, label, { sp: port, tp: port === 'L' ? 'R' : 'L' });
            else link(prev.id, n.id, '');
            prev = n; y += H('process') + GAP; maxLow = Math.max(maxLow, lowOf(n));
          });
          exits.push({ from: prev.id, label: '', kind });
        };
        branch(s[2], X0 - BX, 'L', '成立', 'bl');
        if (s[0] === 'E') branch(s[3], X0 + BX, 'R', '不成立', 'br');
        else exits.push({ from: d.id, label: '不成立', kind: 'dno' });
        low = maxLow;
        cur = exits;
      }
      return cur;
    }

    const st = add('start', '開始', X0, 40);
    low = lowOf(st);
    const last = prog[prog.length - 1];
    const hasLoop = Array.isArray(last) && last[0] === 'W';
    let cur = seq(hasLoop ? prog.slice(0, -1) : prog, [{ from: st.id, label: '' }]);

    if (!hasLoop) {
      place('end', '結束', X0, cur);
    } else {
      const lp = place('loop', '重複直到到達終點', X0, cur);
      const yc = lp.y - H('loop') / 2 - GAP / 2;                  // 回到迴圈頂端的水平通道
      const exits = seq(last[1], [{ from: lp.id, label: '重複' }]);
      const en = add('end', '結束', X0 + 225, lp.y);
      link(lp.id, en.id, '完成', { sp: 'R', tp: 'L' });
      low = Math.max(low, lowOf(en));
      /* 返回線走外側：依實際內容決定距離 */
      const xl = Math.min(...nodes.map(n => n.x - FC.size(n)[0] / 2)) - 32;
      const xr = Math.max(...nodes.map(n => n.x + FC.size(n)[0] / 2)) + 32;
      exits.forEach(x => {
        const n = byId[x.from];
        if (x.kind === 'bl') link(n.id, lp.id, x.label, { sp: 'L', tp: 'T', via: [[xl, n.y], [xl, yc], [X0, yc]] });
        else link(n.id, lp.id, x.label, { sp: 'R', tp: 'T', via: [[xr, n.y], [xr, yc], [X0, yc]] });
      });
    }
    const minX = Math.min(...nodes.map(n => n.x - FC.size(n)[0] / 2)) - 32;
    if (minX < 30) nodes.forEach(n => n.x += 30 - minX), edges.forEach(e => { if (e.via) e.via = e.via.map(p => [p[0] + 30 - minX, p[1]]); });
    return { nodes, edges, nid: nid + 1, eid: eid + 1 };
  };

  /* ---------- 10 關資料 ---------- */
  const LEVELS = [
    { n: 1, tag: '順序', title: '向前走到終點', stars: 1,
      scenario: '小人從起點（綠色箭頭）出發，要走到終點（紅色圖釘）。先在流程圖畫出步驟，再到積木區驗證。',
      hint: '先看地圖：小人朝右，要往前走幾格才會到終點？每走一格就是一次「向前移動」，每一個動作都是「處理程序」。',
      prog: ['F', 'F'], expect: { minSteps: 2, stepsHint: '向前移動 2 次' } },
    { n: 2, tag: '順序', title: '前進與轉彎', stars: 1,
      scenario: '這一關的路有轉彎。請在流程圖畫出「走」與「轉」的順序，再用積木驗證。',
      hint: '小人一開始朝右。沿著黃色的路走，每遇到轉彎處，就要用「向左轉」或「向右轉」。先在紙上想：往前幾步、轉哪邊、再往前？',
      prog: ['F', 'L', 'F', 'R', 'F'], expect: { minSteps: 5, stepsHint: '前進、左轉、前進、右轉、前進' } },
    { n: 3, tag: '迴圈', title: '重複直到終點', stars: 2,
      scenario: '路很長，但積木最多只能用 2 個！不能一個一個放「向前移動」，要讓它「重複」。請畫出會重複的流程圖。',
      hint: '「重複直到終點」的意思是：只要還沒到終點，就一直做裡面的事。流程圖可以用「迴圈」符號，也可以用「到終點了嗎？」的決策判斷，並把「不成立」連回前面。',
      prog: [['W', ['F']]], expect: { loop: true } },
    { n: 4, tag: '迴圈', title: '爬樓梯', stars: 2,
      scenario: '這條路像樓梯：往前、轉彎、往前、再轉彎……一直重複。請找出「重複的那一組動作」，畫成迴圈。',
      hint: '先找規律：一次要做哪幾個動作，做完就接著再做一次？把這一組動作放進迴圈裡。注意積木最多 5 個。',
      prog: [['W', ['F', 'L', 'F', 'R']]], expect: { loop: true, minSteps: 4, stepsHint: '前進、左轉、前進、右轉' } },
    { n: 5, tag: '迴圈', title: '先走幾步，再重複', stars: 2,
      scenario: '前面一小段只走 2 步，轉彎之後是一條很長的直線。請畫出「先做的事」和「會重複的事」。',
      hint: '不是所有動作都要放進迴圈：只走一次的動作放在迴圈前面，長直線才用迴圈。注意積木最多 5 個。',
      prog: ['F', 'F', 'L', ['W', ['F']]], expect: { loop: true, minSteps: 4, stepsHint: '前進、前進、左轉、重複前進' } },
    { n: 6, tag: '判斷', title: '如果左方有路', stars: 3,
      scenario: '這是一條螺旋形的路。小人每次走到可以左轉的路口，就要左轉。請畫出「走一步，看看左邊有沒有路」的流程。',
      hint: '每向前走一步之後，問自己：「左方有路嗎？」有的話就向左轉。這個「問題」要用決策判斷，整個流程還要重複直到終點。',
      prog: [['W', ['F', ['I', 'L', ['L']]]]], expect: { loop: true, decision: true, minSteps: 3, stepsHint: '重複、前進、判斷左方有路、左轉' } },
    { n: 7, tag: '判斷', title: '如果右方有路', stars: 3,
      scenario: '路上有岔路，但小人每次都選擇「向右轉」。請畫出走一步後檢查右邊有沒有路的流程。',
      hint: '想想看：和上一關很像，只是這次要檢查的是「右方」，轉的方向也不同。在流程圖裡，決策判斷的文字要寫清楚。',
      prog: [['W', ['F', ['I', 'R', ['R']]]]], expect: { loop: true, decision: true, minSteps: 3, stepsHint: '重複、前進、判斷右方有路、右轉' } },
    { n: 8, tag: '判斷', title: '左邊右邊都要看', stars: 3,
      scenario: '這條路有些地方要左轉、有些地方要右轉。請畫出「每走一步，左邊右邊都檢查」的流程。',
      hint: '一次走一步，然後分別問：「左方有路嗎？」「右方有路嗎？」需要兩個決策判斷，而且是一個接著一個。',
      prog: [['W', ['F', ['I', 'L', ['L']], ['I', 'R', ['R']]]]], expect: { loop: true, decision: true, minDecisions: 2, minSteps: 5, stepsHint: '重複、前進、兩個判斷、左轉、右轉' } },
    { n: 9, tag: '如果…否則', title: '有路就走，沒路就轉', stars: 3,
      scenario: '這一關有一個新積木「如果…否則」。請畫出：如果前方有路就前進，否則就轉彎。',
      hint: '「如果…否則」就是一個決策判斷同時有兩條出口：成立做一件事，不成立做另一件事。兩條路最後都要回到迴圈。',
      prog: [['W', [['E', 'F', ['F'], ['L']]]]], expect: { loop: true, decision: true, minSteps: 3, stepsHint: '重複、判斷前方有路、前進、左轉' } },
    { n: 10, tag: '綜合', title: '沿著左手邊的牆走', stars: 3,
      scenario: '終極迷宮！有個走迷宮的好方法：想像左手一直摸著牆走。請畫出這個方法的流程圖，再用積木挑戰。',
      hint: '每一步都先問：左邊有路嗎？有就左轉。然後再問：前面有路嗎？有就前進，沒有就向右轉。想想看：這兩個判斷怎麼串在一起？',
      prog: [['W', [['I', 'L', ['L']], ['E', 'F', ['F'], ['R']]]]], expect: { loop: true, decision: true, minDecisions: 2, minSteps: 5, stepsHint: '重複、判斷左方有路、判斷前方有路、左轉、前進、右轉' } }
  ];

  const solText = {
    1: '向前移動 ×2', 2: '向前移動、向左轉、向前移動、向右轉、向前移動',
    3: '重複直到終點 { 向前移動 }', 4: '重複直到終點 { 向前移動、向左轉、向前移動、向右轉 }',
    5: '向前移動 ×2、向左轉、重複直到終點 { 向前移動 }',
    6: '重複直到終點 { 向前移動；如果 左方有路 { 向左轉 } }', 7: '重複直到終點 { 向前移動；如果 右方有路 { 向右轉 } }',
    8: '重複直到終點 { 向前移動；如果 左方有路 { 向左轉 }；如果 右方有路 { 向右轉 } }',
    9: '重複直到終點 { 如果 前方有路 { 向前移動 } 否則 { 向左轉 } }',
    10: '重複直到終點 { 如果 左方有路 { 向左轉 }；如果 前方有路 { 向前移動 } 否則 { 向右轉 } }'
  };

  FC.MAZE_TOPICS = LEVELS.map(L => ({
    id: 'maze' + L.n, group: 'maze', mazeLevel: L.n,
    title: `迷宮第 ${L.n} 關：${L.title}`, shortTitle: L.title, stars: L.stars, level: L.tag,
    scenario: L.scenario, hint: L.hint, expect: L.expect,
    blockSolution: solText[L.n], blockLimit: MAZE.maxBlocks[L.n - 1], prog: L.prog,
    sample: () => FC.progToGraph(L.prog)
  }));
})(window.FC);
