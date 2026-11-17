# 流程圖學習網頁

國中資訊科技「演算法的表達」（文字、流程圖、虛擬碼）的互動學習網頁：課堂講解簡報、認識流程圖符號、線上繪製流程圖、自動檢查與產生文字步驟／虛擬碼、下載 PDF 作業，並搭配 [Blockly Games 迷宮](https://blockly.games/maze) 10 關「先畫再玩」與「試跑流程圖」。

- 使用與教學說明：[使用說明.md](使用說明.md)
- 成品是單一檔案 `index.html`（與 `流程圖學習網頁.html` 內容相同），修改 `src/` 後執行 `python3 build.py` 重新建置。
- 教師模式：網址後面加 `?teacher=1`。

## 授權與來源
- 迷宮地圖與積木數量上限取自 [Blockly Games](https://github.com/google/blockly-games)（Apache License 2.0，© Google LLC）。
- `vendor/jspdf.umd.min.js` 為 [jsPDF](https://github.com/parallax/jsPDF) 2.5.1（MIT）。
