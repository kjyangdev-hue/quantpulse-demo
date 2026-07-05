# QuantPulse 量化脈動 — AI 量化策略儀表板（前端展示）

> **模擬展示聲明**：本專案為前端技術展示作品。所有 K 線行情、AI 訊號與回測績效皆由固定種子（seed 69）演算法產生之**模擬數據**；「Pro 訂閱」為模擬結帳流程，不會進行任何實際交易或請款。本專案所有內容不構成投資建議。

## 結構

- **`index.html`** — B2B SaaS 官網：Hero、功能、即時計算的回測績效帶、三檔方案定價（接模擬結帳）、FAQ、滾動進場動畫
- **`app.html`** — 產品儀表板（DEMO 本體）
- **`checkout.js`** — 共用模擬結帳模組（自帶樣式與 DOM，方案可參數化，成功後回呼 `window.onCheckoutSuccess`）
- **`logic.js`** — 純邏輯層（Node 可測）

## 功能

- **K 線主圖**：ECharts 5 自繪蠟燭圖＋MA5/20/60 均線（實線／虛線雙重編碼）＋成交量副圖，crosshair 十字游標與繁中 tooltip
- **AI 策略指標**（核心互動）：三種策略（均線交叉／動能突破／AI 綜合），點擊「啟動 AI 策略分析」後不重新整理頁面——掃描動畫 → 買賣訊號箭頭動態疊加 → 績效指標滾動更新 → toast 訊號提示 → 訊號紀錄逐列進場
- **Pro 訂閱模擬結帳**：卡號 16 碼防呆＋Luhn 校驗、有效期／CVC 驗證、統一編號與手機條碼載具欄位、付款 Loading、成功畫面含模擬電子發票號碼，付款後解鎖 Pro 策略
- **RWD**：375 / 768 / 1440 三視口實測；**深色科技風**為預設，附淺色主題切換
- **TradingView 跑馬燈**：第三方元件串接展示，載入失敗自動隱藏

## 技術

- 純 Vanilla HTML/CSS/JS，零框架、零 build——`index.html`＋`logic.js` 兩個檔案
- 邏輯層（`logic.js`）與 UI 分離，Node/Browser 雙環境，`node --test` 單元測試 9 項全過
- 調色盤通過 OKLCH 亮度帶／色弱（CVD）分離度／對比度驗證；台股慣例紅漲綠跌
- 以 AI 協作工作流（Claude Code）開發：TDD 邏輯層 → 視覺系統 → Playwright 三視口互動回歸

## 本機執行

```bash
python -m http.server 8787   # 或任何靜態伺服器
node --test tests/           # 單元測試
```
