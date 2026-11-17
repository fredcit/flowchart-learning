/* ============================================================
   pdf.js － 把流程圖與學習紀錄排成 A4 頁面，輸出 PDF
   做法：每頁畫在 canvas 上（瀏覽器字型可直接顯示中文），再放進 jsPDF
   ============================================================ */
(function (FC) {
  'use strict';
  const PW = 1240, PH = 1754;           // A4 @150dpi
  const M = 80;                          // 邊界
  const FONT = FC.FONT;
  const MONO = '"SF Mono",Menlo,Consolas,"Courier New",' + FONT;
  const C = { ink: '#1d2b3a', mute: '#5b6b7b', line: '#d5dde6', brand: '#1f6fb2', soft: '#eef5fb', warn: '#e08a00', ok: '#1e9e5a', info: '#3a86c8' };

  function svgToImage(svg) {
    return new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = () => { res({ img, url }); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('流程圖轉圖片失敗')); };
      img.src = url;
    });
  }

  function wrapLines(ctx, text, maxW) {
    const out = []; let cur = '';
    for (const ch of text) {
      if (ch === '\n') { out.push(cur); cur = ''; continue; }
      if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  class Doc {
    constructor() { this.pages = []; }
    page(i) {
      while (this.pages.length <= i) {
        const c = document.createElement('canvas'); c.width = PW; c.height = PH;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH); x.textBaseline = 'alphabetic';
        this.pages.push({ c, x });
      }
      return this.pages[i];
    }
  }

  FC.buildPdf = async function (d) {
    /* d: {graph, topicTitle, info:{cls,no,name}, reflection, analysis, includeChecks} */
    const doc = new Doc();
    let { x: ctx } = doc.page(0);

    /* ---- 標題區 ---- */
    ctx.fillStyle = C.brand; ctx.fillRect(0, 0, PW, 14);
    ctx.fillStyle = C.ink; ctx.font = `700 46px ${FONT}`;
    ctx.fillText('流程圖學習單', M, 100);
    ctx.fillStyle = C.mute; ctx.font = `400 24px ${FONT}`;
    ctx.fillText('國中資訊科技　演算法的表達', M, 140);
    const today = new Date();
    const ds = `${today.getFullYear()} / ${today.getMonth() + 1} / ${today.getDate()}`;
    ctx.textAlign = 'right'; ctx.fillText(ds, PW - M, 140); ctx.textAlign = 'left';

    /* 基本資料：第一行 班級／座號／姓名，第二行 主題 */
    const field = (lab, val, fx, w, yy) => {
      ctx.fillStyle = C.mute; ctx.font = `500 22px ${FONT}`; ctx.fillText(lab, fx, yy + 30);
      const lw = ctx.measureText(lab).width + 10;
      ctx.fillStyle = C.ink; ctx.font = `600 26px ${FONT}`;
      let v = val || '';
      while (ctx.measureText(v).width > w - lw - 6 && v.length > 1) v = v.slice(0, -1);
      ctx.fillText(v, fx + lw, yy + 30);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, yy + 42); ctx.lineTo(fx + w, yy + 42); ctx.stroke();
    };
    const total = PW - 2 * M, gap = 24;
    field('班級', d.info.cls, M, 300, 170);
    field('座號', d.info.no, M + 300 + gap, 220, 170);
    field('姓名', d.info.name, M + 520 + 2 * gap, total - 520 - 2 * gap, 170);
    field('主題', d.topicTitle, M, total, 226);

    /* ---- 流程圖 ---- */
    let y = 330;
    const sectionTitle = (page, yy, text) => {
      const { x } = doc.page(page);
      x.fillStyle = C.brand; x.fillRect(M, yy - 26, 8, 34);
      x.fillStyle = C.ink; x.font = `700 32px ${FONT}`; x.fillText(text, M + 22, yy);
    };
    sectionTitle(0, y, '我的流程圖');
    y += 24;

    if (d.graph.nodes.length) {
      const { svg, w, h } = FC.svgString(d.graph, { pad: 26 });
      const { img, url } = await svgToImage(svg);
      const maxW = PW - 2 * M, maxH = 880;
      const s = Math.min(maxW / w, maxH / h, 1.25);
      const dw = w * s, dh = h * s;
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; roundRect(ctx, M, y, maxW, dh + 20, 14); ctx.stroke();
      ctx.drawImage(img, M + (maxW - dw) / 2, y + 10, dw, dh);
      URL.revokeObjectURL(url);
      y += dh + 20 + 54;
    } else {
      ctx.fillStyle = C.mute; ctx.font = `400 24px ${FONT}`; ctx.fillText('（尚未繪製流程圖）', M, y + 40); y += 100;
    }

    /* ---- 文字步驟 ｜ 虛擬碼 ---- */
    let page = 0;
    const bottom = PH - 110;
    const ensure = (p) => doc.page(p).x;
    function newPageIfNeeded(need) {
      if (y + need > bottom) { page++; y = M + 30; ensure(page); }
    }
    /* ---- 積木驗證（迷宮） ---- */
    if (d.maze) {
      const m = d.maze;
      let shotImg = null;
      if (m.shot) shotImg = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = m.shot.url; });
      let sw = 0, sh = 0;
      if (shotImg) { const sc = Math.min(1080 / m.shot.w, 460 / m.shot.h, 1.2); sw = m.shot.w * sc; sh = m.shot.h * sc; }
      newPageIfNeeded(210);
      sectionTitle(page, y, `積木驗證（Blockly Games 迷宮第 ${m.level} 關）`);
      y += 26;
      ctx = ensure(page);
      const stColor = { '一次通關': C.ok, '修改後通關': C.info, '還沒通關': C.warn }[m.status] || '#97a4b1';
      ctx.fillStyle = C.mute; ctx.font = `500 24px ${FONT}`; ctx.fillText('通關狀態', M, y + 38);
      ctx.fillStyle = stColor; roundRect(ctx, M + 150, y + 8, 190, 40, 20); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `700 23px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(m.status || '未填寫', M + 150 + 95, y + 37); ctx.textAlign = 'left';
      ctx.fillStyle = C.mute; ctx.font = `500 24px ${FONT}`; ctx.fillText('使用積木', M + 390, y + 38);
      ctx.fillStyle = C.ink; ctx.font = `700 26px ${FONT}`;
      ctx.fillText(m.blocks ? `${m.blocks} 個` + (m.limit ? `（上限 ${m.limit} 個）` : '') : '未填寫', M + 390 + 106, y + 38);
      y += 62;
      if (m.run) {
        const ok = m.run.ok;
        ctx.fillStyle = C.mute; ctx.font = `500 24px ${FONT}`; ctx.fillText('流程圖試跑', M, y + 38);
        ctx.fillStyle = ok ? C.ok : C.warn; roundRect(ctx, M + 150, y + 8, 190, 40, 20); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `700 23px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(ok ? '成功到終點' : '未成功', M + 150 + 95, y + 37); ctx.textAlign = 'left';
        ctx.fillStyle = C.ink; ctx.font = `400 22px ${FONT}`;
        const msg = ok ? `前進 ${m.run.moves} 步、轉彎 ${m.run.turns} 次` : m.run.reason;
        const ls = wrapLines(ctx, msg, PW - 2 * M - 370).slice(0, 2);
        ls.forEach((l, i) => ctx.fillText(l, M + 360, y + 36 + i * 30));
        y += 54 + (ls.length > 1 ? 26 : 0);
      } else y += 8;
      if (shotImg) {
        const room = bottom - y - 90;                // 剩下的空間夠用六成以上就縮小放在這頁，否則換頁
        if (room < sh && room >= sh * 0.6) { const k = room / sh; sw *= k; sh = room; }
        newPageIfNeeded(sh + 80);
        ctx = ensure(page);
        ctx.fillStyle = C.mute; ctx.font = `500 22px ${FONT}`; ctx.fillText('我的積木截圖', M, y + 6);
        y += 22;
        ctx.strokeStyle = C.line; ctx.lineWidth = 2; roundRect(ctx, M, y, sw + 20, sh + 20, 12); ctx.stroke();
        ctx.drawImage(shotImg, M + 10, y + 10, sw, sh);
        y += sh + 20 + 44;
      } else y += 56;
    }

    newPageIfNeeded(220);
    const a = d.analysis;
    if (a.steps.length) {
      const yTop = y, pTop = page;
      sectionTitle(page, y, '文字步驟　與　虛擬碼對照');
      y += 24;
      const colGap = 36, colW = (PW - 2 * M - colGap) / 2;
      const x1 = M, x2 = M + colW + colGap;
      const startY = y;
      const lay = (items, x, isCode) => {
        let cp = pTop, cy = startY;
        const cx = () => doc.page(cp).x;
        const hdr = (pp, yy) => {
          const cc = doc.page(pp).x;
          cc.fillStyle = C.soft; roundRect(cc, x, yy, colW, 44, 10); cc.fill();
          cc.fillStyle = C.brand; cc.font = `700 24px ${FONT}`; cc.fillText(isCode ? '虛擬碼' : '文字步驟', x + 16, yy + 30);
        };
        hdr(cp, cy); cy += 66;
        for (const it of items) {
          const c0 = cx();
          const indent = it.ind * 34;
          const kLabel = it.k ? (isCode ? `(${it.k}) ` : `步驟 ${it.k}. `) : '';
          c0.font = isCode ? `500 23px ${MONO}` : `500 24px ${FONT}`;
          const kw = kLabel ? c0.measureText(kLabel).width : 0;
          const txt = it.t;
          const lines = wrapLines(c0, txt, colW - indent - kw - 14);
          const lh = isCode ? 34 : 36;
          if (cy + lines.length * lh > bottom) {
            cp++; cy = M + 30; hdr(cp, cy); cy += 66;
          }
          const cc = doc.page(cp).x;
          cc.font = isCode ? `500 23px ${MONO}` : `500 24px ${FONT}`;
          if (kLabel) { cc.fillStyle = C.brand; cc.font = isCode ? `700 23px ${MONO}` : `700 24px ${FONT}`; cc.fillText(kLabel, x + 8 + indent, cy + 24); }
          cc.font = isCode ? `500 23px ${MONO}` : `500 24px ${FONT}`;
          cc.fillStyle = it.dim ? C.mute : (it.head || /^(else|end if|end while)$/.test(txt) ? C.mute : C.ink);
          lines.forEach((l, i) => cc.fillText(l, x + 8 + indent + kw, cy + 24 + i * lh));
          cy += lines.length * lh + 6;
        }
        return { p: cp, y: cy };
      };
      const e1 = lay(a.steps, x1, false), e2 = lay(a.code, x2, true);
      const e = (e1.p > e2.p || (e1.p === e2.p && e1.y >= e2.y)) ? e1 : e2;
      page = e.p; y = e.y + 40;
    }

    /* ---- 檢查結果 ---- */
    if (d.includeChecks && a.checks.length && !a.empty) {
      newPageIfNeeded(160);
      sectionTitle(page, y, 'AI 小幫手的檢查結果');
      y += 22;
      ctx = ensure(page); ctx.font = `400 21px ${FONT}`; ctx.fillStyle = C.mute;
      ctx.fillText('（提示僅供參考，不計分，學生可以依提示再修正。）', M + 22, y + 14);
      y += 44;
      const colorOf = { warn: C.warn, info: C.info, ok: C.ok };
      const tag = { warn: '待修正', info: '小建議', ok: '做得好' };
      for (const c of a.checks) {
        ctx = ensure(page);
        ctx.font = `400 24px ${FONT}`;
        const lines = wrapLines(ctx, c.msg, PW - 2 * M - 150);
        newPageIfNeeded(lines.length * 34 + 16);
        ctx = ensure(page);
        ctx.fillStyle = colorOf[c.lv]; roundRect(ctx, M, y + 2, 104, 32, 16); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `700 19px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(tag[c.lv], M + 52, y + 25); ctx.textAlign = 'left';
        ctx.fillStyle = C.ink; ctx.font = `400 24px ${FONT}`;
        lines.forEach((l, i) => ctx.fillText(l, M + 124, y + 27 + i * 34));
        y += lines.length * 34 + 14;
      }
      y += 56;
    }

    /* ---- 學習心得 ---- */
    if ((d.reflection || '').trim()) {
      ctx = ensure(page); ctx.font = `400 25px ${FONT}`;
      const lines = wrapLines(ctx, d.reflection.trim(), PW - 2 * M - 40);
      newPageIfNeeded(120 + Math.min(lines.length, 6) * 36);
      sectionTitle(page, y, '我的想法');
      y += 24;
      ctx = ensure(page);
      let i = 0;
      while (i < lines.length) {
        const room = Math.floor((bottom - y - 30) / 36);
        const chunk = lines.slice(i, i + Math.max(1, room));
        const bh = chunk.length * 36 + 30;
        ctx = ensure(page);
        ctx.fillStyle = '#fafcfe'; roundRect(ctx, M, y, PW - 2 * M, bh, 14); ctx.fill();
        ctx.strokeStyle = C.line; ctx.lineWidth = 2; roundRect(ctx, M, y, PW - 2 * M, bh, 14); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.font = `400 25px ${FONT}`;
        chunk.forEach((l, j) => ctx.fillText(l, M + 20, y + 40 + j * 36));
        i += chunk.length; y += bh + 10;
        if (i < lines.length) { page++; y = M + 30; ensure(page); }
      }
    }

    /* ---- 頁尾 ---- */
    doc.pages.forEach((p, i) => {
      p.x.fillStyle = C.mute; p.x.font = `400 20px ${FONT}`;
      p.x.fillText(`流程圖學習網頁　${d.info.cls || ''} ${d.info.no ? d.info.no + '號' : ''} ${d.info.name || ''}`.trim(), M, PH - 50);
      p.x.textAlign = 'right'; p.x.fillText(`第 ${i + 1} 頁 / 共 ${doc.pages.length} 頁`, PW - M, PH - 50); p.x.textAlign = 'left';
      p.x.strokeStyle = C.line; p.x.lineWidth = 2; p.x.beginPath(); p.x.moveTo(M, PH - 80); p.x.lineTo(PW - M, PH - 80); p.x.stroke();
    });
    return doc;
  };

  FC.pdfFromDoc = function (doc) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    doc.pages.forEach((p, i) => {
      if (i) pdf.addPage();
      pdf.addImage(p.c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    });
    return pdf;
  };
})(window.FC);
