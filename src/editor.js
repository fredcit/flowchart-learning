/* ============================================================
   editor.js － 線上流程圖畫布（拖曳、連線、復原）
   ============================================================ */
(function (FC) {
  'use strict';
  const SNAP = 10;
  const snap = v => Math.round(v / SNAP) * SNAP;
  const clone = o => JSON.parse(JSON.stringify(o));
  /* 靠近其他符號的中心線時自動對齊（讓連線更直） */
  function align(graph, id, x, y) {
    let ax = x, ay = y, bx = 15, by = 15;
    for (const m of graph.nodes) {
      if (m.id === id) continue;
      if (Math.abs(m.x - x) < bx) { bx = Math.abs(m.x - x); ax = m.x; }
      if (Math.abs(m.y - y) < by) { by = Math.abs(m.y - y); ay = m.y; }
    }
    return [ax, ay];
  }

  class Editor {
    constructor(o) {
      this.svg = o.svg;
      this.wrap = o.wrap;
      this.onChange = o.onChange || (() => {});
      this.onSelect = o.onSelect || (() => {});
      this.graph = { nodes: [], edges: [], nid: 1, eid: 1 };
      this.sel = null;
      this.mode = 'select';
      this.pending = null;
      this.zoom = 1;
      this.hist = []; this.hi = -1;
      this.drag = null;
      this.flash = new Set();
      this._raf = 0;
      this.bind();
      this.setGraph(this.graph, true);
    }

    /* ---------- 資料 ---------- */
    setGraph(g, resetHistory) {
      this.graph = g && g.nodes ? clone(g) : { nodes: [], edges: [], nid: 1, eid: 1 };
      this.graph.nid = this.graph.nid || (this.graph.nodes.length + 1);
      this.graph.eid = this.graph.eid || (this.graph.edges.length + 1);
      this.sel = null; this.pending = null;
      if (resetHistory) { this.hist = [JSON.stringify(this.graph)]; this.hi = 0; }
      this.render(); this.emitSelect();
    }
    getGraph() { return clone(this.graph); }
    node(id) { return this.graph.nodes.find(n => n.id === id); }
    edge(id) { return this.graph.edges.find(e => e.id === id); }

    commit() {
      const s = JSON.stringify(this.graph);
      if (s === this.hist[this.hi]) return;
      this.hist = this.hist.slice(0, this.hi + 1);
      this.hist.push(s);
      if (this.hist.length > 80) this.hist.shift();
      this.hi = this.hist.length - 1;
      this.onChange(this.graph, true);
    }
    undo() { if (this.hi > 0) { this.hi--; this.restore(); } }
    redo() { if (this.hi < this.hist.length - 1) { this.hi++; this.restore(); } }
    restore() {
      this.graph = JSON.parse(this.hist[this.hi]);
      this.sel = null; this.pending = null;
      this.render(); this.emitSelect(); this.onChange(this.graph, true);
    }
    get canUndo() { return this.hi > 0; }
    get canRedo() { return this.hi < this.hist.length - 1; }

    /* ---------- 選取 ---------- */
    select(sel) {
      const same = (!sel && !this.sel) || (sel && this.sel && sel.t === this.sel.t && sel.id === this.sel.id);
      this.sel = sel;
      this.render();
      if (!same) this.emitSelect();
    }
    emitSelect() { this.onSelect(this.sel, this); }

    /* ---------- 操作 ---------- */
    addNode(type, x, y, text) {
      const S = FC.SYM[type];
      const id = 'n' + (this.graph.nid++);
      const [ax, ay] = align(this.graph, id, snap(x), snap(y));
      const n = { id, type, x: ax, y: ay, text: text != null ? text : S.defText };
      this.graph.nodes.push(n);
      this.commit();
      this.select({ t: 'node', id: n.id });
      return n;
    }
    autoPos(type) {
      const S = FC.SYM[type];
      const [w, h] = [S.w, S.h];
      let x, y;
      const sel = this.sel && this.sel.t === 'node' && this.node(this.sel.id);
      const ns = this.graph.nodes;
      if (sel) { const [sw, sh] = FC.size(sel); x = sel.x; y = sel.y + sh / 2 + h / 2 + 56; }
      else if (ns.length) {
        const low = ns.reduce((a, b) => (b.y > a.y ? b : a));
        const [, lh] = FC.size(low);
        x = low.x; y = low.y + lh / 2 + h / 2 + 56;
      } else { x = 360; y = 60; }
      let guard = 0;
      const hit = () => ns.some(n => { const [nw, nh] = FC.size(n); return Math.abs(n.x - x) < (nw + w) / 2 + 6 && Math.abs(n.y - y) < (nh + h) / 2 + 6; });
      while (hit() && guard++ < 40) y += 20;
      return [x, y];
    }
    addNodeAuto(type) { const [x, y] = this.autoPos(type); return this.addNode(type, x, y); }

    deleteSelected() {
      if (!this.sel) return;
      if (this.sel.t === 'node') {
        const id = this.sel.id;
        this.graph.nodes = this.graph.nodes.filter(n => n.id !== id);
        this.graph.edges = this.graph.edges.filter(e => e.from !== id && e.to !== id);
      } else this.graph.edges = this.graph.edges.filter(e => e.id !== this.sel.id);
      this.sel = null; this.commit(); this.render(); this.emitSelect();
    }
    duplicateSelected() {
      if (!this.sel || this.sel.t !== 'node') return;
      const n = this.node(this.sel.id); if (!n) return;
      this.addNode(n.type, n.x + 40, n.y + 40, n.text);
    }
    clearAll() {
      this.graph = { nodes: [], edges: [], nid: 1, eid: 1 };
      this.sel = null; this.pending = null;
      this.commit(); this.render(); this.emitSelect();
    }
    setText(id, text) { const n = this.node(id); if (!n) return; n.text = text; this.render(); this.onChange(this.graph, false); }
    setEdgeLabel(id, label) { const e = this.edge(id); if (!e) return; e.label = label; this.commit(); this.render(); this.onChange(this.graph, true); }
    reverseEdge(id) { const e = this.edge(id); if (!e) return; [e.from, e.to] = [e.to, e.from]; delete e.via; delete e.sp; delete e.tp; this.commit(); this.render(); }

    connect(from, to) {
      if (!from || !to || from === to) return false;
      if (this.graph.edges.some(e => e.from === from && e.to === to)) return false;
      const sn = this.node(from);
      let label = '';
      if (sn.type === 'decision' || sn.type === 'loop') {
        const names = sn.type === 'decision' ? ['成立', '不成立'] : ['重複', '完成'];
        const used = this.graph.edges.filter(e => e.from === from).map(e => e.label);
        label = names.find(x => !used.includes(x)) || '';
      }
      const e = { id: 'e' + (this.graph.eid++), from, to, label };
      this.graph.edges.push(e);
      this.commit();
      this.select({ t: 'edge', id: e.id });
      return true;
    }

    setMode(m) { this.mode = m; this.pending = null; this.render(); this.wrap.classList.toggle('connecting', m === 'connect'); }
    setZoom(z) { this.zoom = Math.max(0.4, Math.min(1.6, z)); this.render(); }
    /* 縮放到整張流程圖都看得到 */
    fit() {
      const g = this.graph, w = this.wrap.clientWidth - 24, h = this.wrap.clientHeight - 24;
      if (!g.nodes.length || w <= 0 || h <= 0) { this.setZoom(1); return; }
      const { routes } = FC.graphMarkup(g, {});
      const b = FC.bbox(g, routes);
      this.setZoom(Math.min(1, w / (b.x + b.w + 40), h / (b.y + b.h + 40)));
      this.wrap.scrollTo(0, 0);
    }

    /* 試跑時標示目前執行到的符號（綠框）或出錯的符號（紅框） */
    setRun(id, err) {
      this.runNode = id || null; this.runErr = err || null;
      this.render();
      const t = id || err; if (t) this.reveal(t);
    }
    reveal(id) {
      const n = this.node(id); if (!n) return;
      const r = this.wrap, x = n.x * this.zoom, y = n.y * this.zoom;
      if (x < r.scrollLeft + 50 || x > r.scrollLeft + r.clientWidth - 50 || y < r.scrollTop + 50 || y > r.scrollTop + r.clientHeight - 50)
        r.scrollTo({ left: Math.max(0, x - r.clientWidth / 2), top: Math.max(0, y - r.clientHeight / 2), behavior: 'smooth' });
    }

    flashNodes(ids) {
      this.flash = new Set(ids || []);
      this.render();
      clearTimeout(this._ft);
      this._ft = setTimeout(() => { this.flash = new Set(); this.render(); }, 2200);
      if (ids && ids.length) {
        const n = this.node(ids[0]);
        if (n) { const r = this.wrap; r.scrollTo({ left: Math.max(0, n.x * this.zoom - r.clientWidth / 2), top: Math.max(0, n.y * this.zoom - r.clientHeight / 2), behavior: 'smooth' }); }
      }
    }

    /* ---------- 繪製 ---------- */
    requestRender() { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = 0; this.render(); }); }
    render() {
      const g = this.graph;
      const o = {
        interactive: true, selected: this.sel, pending: this.pending, placeholder: true, flash: this.flash, running: this.runNode, runErr: this.runErr,
        rubber: this.drag && this.drag.kind === 'connect' ? this.drag : null
      };
      const { markup, routes } = FC.graphMarkup(g, o);
      const b = FC.bbox(g, routes);
      const W = Math.max(960, Math.ceil((g.nodes.length ? b.x + b.w : 0) + 320));
      const H = Math.max(1000, Math.ceil((g.nodes.length ? b.y + b.h : 0) + 280));
      this.world = { w: W, h: H };
      this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      this.svg.setAttribute('width', Math.round(W * this.zoom));
      this.svg.setAttribute('height', Math.round(H * this.zoom));
      this.svg.innerHTML = `<defs><pattern id="gridp" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d5dde6"/></pattern></defs>` +
        `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#gridp)" class="bg"/>` + markup;
    }

    /* ---------- 座標 ---------- */
    pt(e) {
      const r = this.svg.getBoundingClientRect();
      return { x: (e.clientX - r.left) / this.zoom, y: (e.clientY - r.top) / this.zoom };
    }
    clientToWorld(cx, cy) { const r = this.svg.getBoundingClientRect(); return { x: (cx - r.left) / this.zoom, y: (cy - r.top) / this.zoom, inside: cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom }; }

    /* ---------- 事件 ---------- */
    bind() {
      const svg = this.svg;
      svg.addEventListener('pointerdown', e => this.down(e));
      svg.addEventListener('dblclick', e => {
        const el = e.target.closest('[data-node]');
        if (el) { this.select({ t: 'node', id: el.dataset.node }); this.onSelect(this.sel, this, true); }
      });
      document.addEventListener('keydown', e => {
        if (!this.active || !this.active()) return;
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        const typing = /INPUT|TEXTAREA|SELECT/.test(tag);
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
        else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
        else if (typing) { if (e.key === 'Escape') document.activeElement.blur(); }
        else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.deleteSelected(); }
        else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); this.duplicateSelected(); }
        else if (e.key === 'Escape') { this.pending = null; this.setMode('select'); this.select(null); this.onModeChange && this.onModeChange(); }
        else if (this.sel && this.sel.t === 'node' && e.key.startsWith('Arrow')) {
          e.preventDefault();
          const n = this.node(this.sel.id), d = e.shiftKey ? 50 : SNAP;
          if (e.key === 'ArrowUp') n.y -= d; if (e.key === 'ArrowDown') n.y += d; if (e.key === 'ArrowLeft') n.x -= d; if (e.key === 'ArrowRight') n.x += d;
          this.commit(); this.render();
        }
      });
    }

    down(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target;
      const portEl = t.closest('[data-port]');
      const nodeEl = t.closest('[data-node]');
      const edgeEl = t.closest('[data-edge]');
      const p = this.pt(e);

      if (portEl) {
        const id = portEl.dataset.node, port = portEl.dataset.port;
        this.drag = { kind: 'connect', from: id, port, x: p.x, y: p.y };
        this.track(e);
        e.preventDefault();
        return;
      }
      if (nodeEl) {
        const id = nodeEl.dataset.node;
        if (this.mode === 'connect') {
          if (!this.pending) { this.pending = id; this.sel = null; this.render(); this.emitSelect(); }
          else if (this.pending === id) { this.pending = null; this.render(); }
          else { const a = this.pending; this.pending = null; this.connect(a, id); }
          e.preventDefault();
          return;
        }
        this.select({ t: 'node', id });
        const n = this.node(id);
        this.drag = { kind: 'move', id, ox: p.x - n.x, oy: p.y - n.y, sx: e.clientX, sy: e.clientY, moved: false };
        this.track(e);
        e.preventDefault();
        return;
      }
      if (edgeEl) { this.pending = null; this.select({ t: 'edge', id: edgeEl.dataset.edge }); e.preventDefault(); return; }
      this.pending = null;
      this.select(null);
    }

    track(e0) {
      const move = e => {
        const d = this.drag; if (!d) return;
        const p = this.pt(e);
        if (d.kind === 'move') {
          if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
          d.moved = true;
          this.graph.edges.forEach(e => { if (e.from === d.id || e.to === d.id) { delete e.via; delete e.sp; delete e.tp; } });
          const n = this.node(d.id);
          [n.x, n.y] = align(this.graph, n.id, Math.max(40, snap(p.x - d.ox)), Math.max(30, snap(p.y - d.oy)));
          this.requestRender();
        } else if (d.kind === 'connect') { d.x = p.x; d.y = p.y; this.requestRender(); }
      };
      const touchBlock = ev => ev.preventDefault();
      const up = e => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        window.removeEventListener('touchmove', touchBlock);
        const d = this.drag; this.drag = null;
        if (!d) return;
        if (d.kind === 'move') { if (d.moved) { this.commit(); } this.render(); }
        else if (d.kind === 'connect') {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const target = el && el.closest && el.closest('[data-node]');
          const toId = target && this.svg.contains(target) ? target.dataset.node : null;
          this.render();
          if (toId) this.connect(d.from, toId);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      window.addEventListener('touchmove', touchBlock, { passive: false });
    }
  }
  FC.Editor = Editor;
})(window.FC);
