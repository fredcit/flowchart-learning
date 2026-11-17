#!/usr/bin/env node
/* 驗證 src/maze.js 裡 10 關的參考解法：
   1) 用 Blockly Games 的規則模擬，確認每個解法真的能走到終點
   2) 確認積木數量沒有超過該關上限
   3) 確認由解法產生的參考流程圖沒有檢查警告
   用法：node tools/verify_maze.js */
global.window = {};
require('../src/core.js'); require('../src/maze.js'); require('../src/runner.js');
const FC = window.FC;

function sim(level, prog, limit) {
  const map = FC.MAZE.maps[level - 1].map(r => r.split('').map(Number));
  let sx, sy, fx, fy;
  map.forEach((r, y) => r.forEach((v, x) => { if (v === 2) { sx = x; sy = y; } if (v === 3) { fx = x; fy = y; } }));
  let x = sx, y = sy, d = 1, steps = 0;                       // 起點朝東
  const V = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const isPath = rel => { const v = V[(d + rel) % 4]; const r = map[y + v[1]]; return !!r && r[x + v[0]] !== undefined && r[x + v[0]] !== 0; };
  const done = () => x === fx && y === fy;
  const run = list => {
    for (const s of list) {
      if (++steps > limit) throw new Error('逾時');
      if (s === 'F') { if (!isPath(0)) throw new Error('撞牆'); x += V[d][0]; y += V[d][1]; }
      else if (s === 'L') d = (d + 3) % 4;
      else if (s === 'R') d = (d + 1) % 4;
      else if (s[0] === 'W') { while (!done()) { run(s[1]); if (++steps > limit) throw new Error('逾時'); } }
      else if (s[0] === 'I') { if (isPath({ F: 0, R: 1, L: 3 }[s[1]])) run(s[2]); }
      else if (s[0] === 'E') { if (isPath({ F: 0, R: 1, L: 3 }[s[1]])) run(s[2]); else run(s[3]); }
    }
  };
  try { run(prog); } catch (e) { return e.message; }
  return done() ? 'ok' : '沒走到終點';
}
const count = l => l.reduce((n, s) => n + 1 + (typeof s === 'string' ? 0 : s[0] === 'W' ? count(s[1]) : s[0] === 'I' ? count(s[2]) : count(s[2]) + count(s[3])), 0);

let bad = 0;
for (const t of FC.MAZE_TOPICS) {
  const r = sim(t.mazeLevel, t.prog, 5000), n = count(t.prog), lim = t.blockLimit;
  const g = t.sample(), a = FC.analyze(g, t), warns = a.checks.filter(c => c.lv !== 'ok');
  const run = FC.runMaze(g, t.mazeLevel);                   // 用「試跑流程圖」跑參考流程圖
  const ok = r === 'ok' && (!lim || n <= lim) && !warns.length && run.ok;
  if (!ok) bad++;
  console.log(`第 ${String(t.mazeLevel).padStart(2)} 關  ${ok ? '✔' : '✘'}  積木模擬:${r}  積木 ${n}/${lim || '不限'}  流程圖檢查:${warns.length ? warns.map(w => w.msg).join('；') : '無警告'}  試跑流程圖:${run.ok ? '成功' : run.reason}`);
}

/* ---------- 試跑流程圖：其他畫法與失敗情況 ---------- */
const N = (id, type, text, x, y) => ({ id, type, text, x: x || 0, y: y || 0 });
const E = (id, from, to, label) => ({ id, from, to, label: label || '' });
const cases = [
  ['L3 用決策判斷代替迴圈', 3, { nodes: [N('s', 'start', '開始'), N('d', 'decision', '到達終點了嗎？'), N('p', 'process', '往前走'), N('e', 'end', '結束')],
    edges: [E('1', 's', 'd'), E('2', 'd', 'e', '成立'), E('3', 'd', 'p', '不成立'), E('4', 'p', 'd')] }, true],
  ['L1 一個符號寫兩個動作也可以', 1, { nodes: [N('s', 'start', '開始'), N('p', 'process', '前進、再前進'), N('e', 'end', '結束')], edges: [E('1', 's', 'p'), E('2', 'p', 'e')] }, true],
  ['L2 輸入輸出符號會被跳過', 2, { nodes: [N('s', 'start', '開始'), N('i', 'io', '顯示開始'), N('a', 'process', '向前移動'), N('b', 'process', '向左轉'), N('c', 'process', '向前移動'), N('d', 'process', '向右轉'), N('f', 'process', '向前移動'), N('e', 'end', '結束')],
    edges: [E('1', 's', 'i'), E('2', 'i', 'a'), E('3', 'a', 'b'), E('4', 'b', 'c'), E('5', 'c', 'd'), E('6', 'd', 'f'), E('7', 'f', 'e')] }, true],
  ['L1 撞牆', 1, { nodes: [N('s', 'start', '開始'), N('a', 'process', '向左轉'), N('b', 'process', '向前移動'), N('e', 'end', '結束')], edges: [E('1', 's', 'a'), E('2', 'a', 'b'), E('3', 'b', 'e')] }, false, /撞牆/],
  ['L1 少走一步', 1, { nodes: [N('s', 'start', '開始'), N('a', 'process', '向前移動'), N('e', 'end', '結束')], edges: [E('1', 's', 'a'), E('2', 'a', 'e')] }, false, /還沒走到終點/],
  ['L3 無限迴圈', 3, { nodes: [N('s', 'start', '開始'), N('l', 'loop', '重複直到到達終點'), N('a', 'process', '向左轉'), N('e', 'end', '結束')],
    edges: [E('1', 's', 'l'), E('2', 'l', 'a', '重複'), E('3', 'a', 'l'), E('4', 'l', 'e', '完成')] }, false, /無限迴圈/],
  ['看不懂的動作', 1, { nodes: [N('s', 'start', '開始'), N('a', 'process', '跳舞'), N('e', 'end', '結束')], edges: [E('1', 's', 'a'), E('2', 'a', 'e')] }, false, /看不懂/],
  ['決策沒標出口', 6, { nodes: [N('s', 'start', '開始'), N('d', 'decision', '左方有路'), N('e', 'end', '結束')], edges: [E('1', 's', 'd'), E('2', 'd', 'e'), E('3', 'd', 'e')] }, false, /成立.*不成立/],
  ['沒有連到下一步', 1, { nodes: [N('s', 'start', '開始'), N('a', 'process', '向前移動')], edges: [E('1', 's', 'a')] }, false, /沒有連到下一步/],
  ['沒有開始', 1, { nodes: [N('a', 'process', '向前移動')], edges: [] }, false, /開始/],
];
for (const [name, lv, g, expectOk, re] of cases) {
  const r = FC.runMaze(g, lv);
  const pass = expectOk ? r.ok : (!r.ok && (!re || re.test(r.reason)));
  if (!pass) bad++;
  console.log(`  ${pass ? '✔' : '✘'}  試跑「${name}」→ ${r.ok ? '成功' : r.reason}`);
}
console.log('動作文字解析：', ['向前移動', '前進', '往前走', '向左轉', '左轉', '右轉', '前進後左轉', '跳舞'].map(t => t + '→' + FC.parseActions(t).join('')).join('  '));
process.exit(bad ? 1 : 0);
