/* ============================================================
   slides.js － 課堂講解簡報（依 115 國中資科 1上 2-1「演算法的表達」）
   ============================================================ */
(function (FC) {
  'use strict';
  const I = FC.icon;

  function symRows(items) {
    return `<div class="sym-table">` +
      `<div class="sym-row sym-head"><div>符號</div><div>名稱</div><div>說明</div></div>` +
      items.map(([t, nm, ds]) =>
        `<div class="sym-row"><div class="sym-cell">${I(t, { w: t === 'arrow' ? 150 : 140, h: t === 'decision' ? 78 : t === 'arrow' ? 36 : 56 })}</div><div class="sym-name">${nm}</div><div class="sym-desc">${ds}</div></div>`).join('') + `</div>`;
  }

  /* 練習題：先全部畫成方框，讓學生判斷符號 */
  function loginBlank() {
    const g = FC.sample.login();
    g.nodes.forEach(n => { if (n.type !== 'decision') n.type = 'process'; else n.type = 'process'; });
    return g;
  }

  const slides = [
    /* 1 標題 */
    () => `<div class="sl sl-title">
      <div class="t-left">
        <span class="s-tag big">國中資訊科技　第 2 章</span>
        <h1>演算法的表達</h1>
        <p class="t-sub">2-1　用文字、流程圖與虛擬碼，把想法說清楚</p>
        <div class="t-meta">課本 P.33 – 38</div>
      </div>
      <div class="t-right">${FC.chartHTML(FC.sample.rain(), { height: 460 })}</div>
    </div>`,

    /* 2 表達方式 */
    () => `<div class="sl">
      <h2 class="s-title">演算法的表達方式</h2>
      <p class="s-lead">演算法沒有固定的呈現方式，只要能<b>清楚表達</b>，並符合<b>演算法五大特性</b>即可。</p>
      <div class="chips">${['輸入', '輸出', '明確性', '有限性', '有效性'].map(t => `<span class="chip5">${t}</span>`).join('')}</div>
      <h3 class="s-sub">常見的表達方式</h3>
      <div class="cols three">
        <div class="card big c1"><div class="num">①</div><h4>文字</h4><p>用一句一句的話，依序寫出步驟</p></div>
        <div class="card big c2"><div class="num">②</div><h4>流程圖</h4><p>用圖形與箭頭，畫出步驟與順序</p></div>
        <div class="card big c3"><div class="num">③</div><h4>虛擬碼</h4><p>介於人類語言與程式語言之間</p></div>
      </div>
    </div>`,

    /* 3 文字 */
    () => `<div class="sl">
      <span class="s-tag">① 文字</span>
      <div class="cols two grow">
        <div>
          <p class="s-lead">文字表達方式<b>最簡單</b>，但敘述較為冗長，且容易因為每個人的表達和認知差異而造成<b>誤解</b>。</p>
          <div class="pros"><span class="good">✓ 最簡單</span><span class="bad">✗ 敘述冗長</span><span class="bad">✗ 容易誤解</span></div>
        </div>
        <div class="card ex">
          <div class="ex-title">求甲、乙兩數相加之總和，以文字表示：</div>
          <ol class="stepsL">
            <li><b>步驟 1.</b> 輸入「數字甲」。</li>
            <li><b>步驟 2.</b> 輸入「數字乙」。</li>
            <li><b>步驟 3.</b> 將「數字甲」及「數字乙」相加，所得即為「總和」。</li>
            <li><b>步驟 4.</b> 輸出「總和」。</li>
          </ol>
        </div>
      </div>
    </div>`,

    /* 4 流程圖 */
    () => `<div class="sl">
      <span class="s-tag">② 流程圖</span>
      <p class="s-lead">利用各種<b>圖形與箭頭</b>等符號，來表示執行一件事情的<b>步驟與順序</b>。</p>
      <div class="ex-title center">常見的網購流程</div>
      <div class="chart-row">${FC.chartHTML(FC.sample.shopping('h'), { width: 1120 })}</div>
    </div>`,

    /* 5 優點 */
    () => `<div class="sl">
      <span class="s-tag">② 流程圖</span>
      <h2 class="s-title">流程圖的優點</h2>
      <div class="cols three grow">
        <div class="card big c1"><div class="emoji">👀</div><h4>可讀性高</h4><p>一眼就看出每個步驟與先後順序</p></div>
        <div class="card big c2"><div class="emoji">🔍</div><h4>方便除錯</h4><p>順著箭頭走，容易找到哪一步出問題</p></div>
        <div class="card big c3"><div class="emoji">✏️</div><h4>容易修改</h4><p>要增減步驟時，調整符號與箭頭就好</p></div>
      </div>
    </div>`,

    /* 6 範例 */
    () => `<div class="sl">
      <span class="s-tag">② 流程圖</span>
      <div class="cols two grow center-y">
        <div>
          <p class="s-lead">求甲、乙兩數之總和，以流程圖表示：</p>
          <ul class="bul">
            <li>從「<b>開始</b>」出發，到「<b>結束</b>」為止</li>
            <li>依<b>箭頭方向</b>，一步接著一步</li>
            <li>每種動作使用對應的<b>符號</b></li>
          </ul>
        </div>
        <div class="chart-col">${FC.chartHTML(FC.sample.sum(), { height: 500 })}</div>
      </div>
    </div>`,

    /* 7 繪製原則 */
    () => `<div class="sl">
      <span class="s-tag">② 流程圖</span>
      <h2 class="s-title">流程圖繪製原則</h2>
      <ol class="principles">
        <li><span>1</span><div>使用<b>標準符號</b>，以便閱讀和分析。</div></li>
        <li><span>2</span><div>文字<b>簡潔且明確可行</b>。</div></li>
        <li><span>3</span><div>繪製方向<b>由上而下，由左至右</b>。</div></li>
        <li><span>4</span><div>流程線條<b>避免交叉或過長</b>。</div></li>
      </ol>
    </div>`,

    /* 8–10 符號 */
    () => `<div class="sl"><span class="s-tag">② 流程圖　符號 1 / 3</span><h2 class="s-title">認識流程圖的符號</h2>` +
      symRows([['start', '開始／結束', '流程的開始或結束'], ['io', '輸入／輸出', '輸入或輸出資料'], ['process', '處理程序', '要執行或處理的程序']]) + `</div>`,
    () => `<div class="sl"><span class="s-tag">② 流程圖　符號 2 / 3</span><h2 class="s-title">認識流程圖的符號</h2>` +
      symRows([['decision', '決策判斷', '針對條件進行判斷，以決定執行的流向'], ['arrow', '流向線', '流程進行的方向'], ['loop', '迴圈', '重複執行指定的次數']]) + `</div>`,
    () => `<div class="sl"><span class="s-tag">② 流程圖　符號 3 / 3</span><h2 class="s-title">認識流程圖的符號</h2>` +
      symRows([['sub', '副程式', '已定義流程的組合'], ['doc', '文件', '輸入或輸出文件'], ['note', '註解', '表示附註說明之用']]) + `</div>`,

    /* 11 練習 */
    () => `<div class="sl" id="slPractice">
      <span class="s-tag">② 流程圖　練習</span>
      <div class="cols two grow center-y">
        <div>
          <h2 class="s-title sm">登入某網站時的操作流程</h2>
          <p class="s-body">使用者開啟網頁後要輸入帳號、密碼，若輸入<b>正確</b>，會顯示「歡迎畫面」；若輸入<b>錯誤</b>，則回到「輸入帳號、密碼」的步驟。</p>
          <p class="ask">👉 請為每一個步驟加上正確的流程圖符號。</p>
          <button class="btn reveal-btn" data-toggle="slPractice"><span class="off">顯示答案</span><span class="on">隱藏答案</span></button>
        </div>
        <div class="chart-col">
          <div class="before">${FC.chartHTML(loginBlank(), { height: 490 })}</div>
          <div class="after">${FC.chartHTML(FC.sample.login(), { height: 490 })}</div>
        </div>
      </div>
    </div>`,

    /* 12 模組化 */
    () => `<div class="sl">
      <span class="s-tag">② 流程圖　模組化呈現</span>
      <p class="s-lead tight">複雜的流程可採用<b>模組化</b>的方式呈現，具有更高的<b>可讀性</b>。</p>
      <div class="cols two grow center-y mod">
        <div class="mod-box"><div class="mod-label g">主程式</div>${FC.chartHTML(FC.sample.morningMain(), { height: 430 })}</div>
        <div class="mod-arrow">⇢ 「吃早餐」副程式展開</div>
        <div class="mod-box"><div class="mod-label b">副程式</div>${FC.chartHTML(FC.sample.breakfastSub(), { height: 430 })}</div>
      </div>
    </div>`,

    /* 13 虛擬碼 */
    () => `<div class="sl">
      <span class="s-tag">③ 虛擬碼</span>
      <p class="s-lead"><b>虛擬碼</b>是一種介於「人類語言」與「程式語言」間的表達方式。</p>
      <div class="spectrum">
        <div class="sp-end">人類語言<small>像平常說話</small></div>
        <div class="sp-mid">虛擬碼<small>if … then … else</small></div>
        <div class="sp-end r">程式語言<small>電腦才看得懂</small></div>
      </div>
      <p class="s-body center">兼具<b>文字描述</b>容易表達，以及<b>流程圖</b>容易理解的優點。</p>
    </div>`,

    /* 14 比較 1 */
    () => `<div class="sl">
      <h2 class="s-title sm">三種表示法的比較　例 1：求甲、乙兩數相加之總和</h2>
      <div class="cols three grow cmp">
        <div class="card"><h4 class="cmp-h">流程圖</h4><div class="cmp-chart">${FC.chartHTML(FC.sample.sum(), { height: 440 })}</div></div>
        <div class="card"><h4 class="cmp-h">文字</h4><ol class="stepsL sm">
          <li><b>步驟 1.</b> 輸入「數字甲」。</li><li><b>步驟 2.</b> 輸入「數字乙」。</li>
          <li><b>步驟 3.</b> 將「數字甲」及「數字乙」相加，所得即為「總和」。</li><li><b>步驟 4.</b> 輸出「總和」。</li></ol></div>
        <div class="card"><h4 class="cmp-h">虛擬碼</h4><pre class="code"><b>(1)</b> input 甲
<b>(2)</b> input 乙
<b>(3)</b> sum = 甲 + 乙
<b>(4)</b> print sum</pre></div>
      </div>
    </div>`,

    /* 15 比較 2 */
    () => `<div class="sl">
      <h2 class="s-title sm">三種表示法的比較　例 2：依據「是否下雨」來決定行程</h2>
      <div class="cols three grow cmp">
        <div class="card"><h4 class="cmp-h">流程圖</h4><div class="cmp-chart">${FC.chartHTML(FC.sample.rain(), { height: 400 })}</div></div>
        <div class="card"><h4 class="cmp-h">文字</h4><ol class="stepsL sm">
          <li><b>步驟 1.</b> 判斷是否下雨。</li><li><b>步驟 2.</b> 若下雨，就去圖書館。</li><li><b>步驟 3.</b> 若未下雨，就去打籃球。</li></ol></div>
        <div class="card"><h4 class="cmp-h">虛擬碼</h4><pre class="code"><b>(1)</b> if 下雨
<b>(2)</b> then 去圖書館
<b>(3)</b> else 去打籃球</pre></div>
      </div>
    </div>`,

    /* 16 結語 */
    () => `<div class="sl sl-end">
      <h1>換你來畫流程圖！</h1>
      <p class="t-sub">先認識符號，再選一個主題（還有 10 關迷宮挑戰），在線上畫出你的流程圖，最後下載成 PDF 繳交。</p>
      <div class="end-btns">
        <a class="btn primary big" href="#symbols">▶ 前往「認識符號」</a>
        <a class="btn big" href="#topics">直接選主題</a>
      </div>
    </div>`
  ];

  FC.slides = slides;
})(window.FC);
