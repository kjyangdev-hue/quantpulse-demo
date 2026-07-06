# QuantPulse 量化脈動 — AI 量化策略儀表板（前端展示）

> **資料與展示聲明**：本專案為前端技術展示作品。K 線行情為 **Yahoo Finance 真實歷史數據快照**（`node scripts/fetch-data.mjs` 產生，截至日期標示於頁面；離線時以固定種子模擬數據備援）。AI 訊號與回測為演算法示範；「Pro 訂閱」為模擬結帳流程，不會進行任何實際交易或請款。本專案所有內容不構成投資建議。

## 資料管線

```bash
node scripts/fetch-data.mjs   # 更新 data/ 六標的快照（2330/TAIEX/0050/2317/NVDA/BTC）
```

GitHub Actions（`.github/workflows/update-data.yml`）設定為每日台北 18:30 自動執行並 commit 有變動的快照（註：新帳號的 Actions 排程可能延遲啟用，屆時以上述指令手動更新即可）。

## 結構

- **`index.html`** — B2B SaaS 官網：Hero、功能、即時計算的回測績效帶、三檔方案定價（接模擬結帳）、FAQ、滾動進場動畫
- **`app.html`** — 產品儀表板（DEMO 本體）
- **`checkout.js`** — 共用模擬結帳模組（自帶樣式與 DOM，方案可參數化，成功後回呼 `window.onCheckoutSuccess`）
- **`logic.js`** — 純邏輯層（Node 可測）

## 功能

- **K 線主圖**：ECharts 5 自繪蠟燭圖＋MA5/20/60 均線（實線／虛線雙重編碼）＋成交量副圖，crosshair 十字游標與繁中 tooltip
- **AI 策略指標**（核心互動）：三種策略（均線交叉／動能突破／AI 綜合），點擊「啟動 AI 策略分析」後不重新整理頁面——掃描動畫 → 買賣訊號箭頭動態疊加 → 績效指標滾動更新 → toast 訊號提示 → 訊號紀錄逐列進場
- **Pro 訂閱模擬結帳**：卡號 16 碼防呆＋Luhn 校驗、有效期／CVC 驗證、統一編號與手機條碼載具欄位、付款 Loading、成功畫面含綠界 ECPay 模擬電子發票號碼，付款後解鎖 Pro 策略（資格以 localStorage 跨頁保存）
- **RWD**：375 / 768 / 1440 三視口實測；**深色科技風**為預設，附淺色主題切換
- **TradingView 跑馬燈**：第三方元件串接展示，載入失敗自動隱藏

## 技術

- 純 Vanilla HTML/CSS/JS，零框架、零 build——`index.html`＋`logic.js` 兩個檔案
- 邏輯層（`logic.js`）與 UI 分離，Node/Browser 雙環境，`node --test` 單元測試 14 項全過
- 調色盤通過 OKLCH 亮度帶／色弱（CVD）分離度／對比度驗證；台股慣例紅漲綠跌
- 以 AI 協作工作流（Claude Code）開發：TDD 邏輯層 → 視覺系統 → Playwright 三視口互動回歸

## 效能（Lighthouse）

對線上部署（GitHub Pages 首頁）以 Lighthouse 13 · desktop 預設量測：

![Lighthouse 分數：Performance 85／Accessibility 96／Best Practices 100／SEO 100](docs/lighthouse.png)

| 類別 | 分數 |
|------|------|
| Performance | 85 |
| Accessibility | 96 |
| Best Practices | 100 |
| SEO | 100 |

核心指標：FCP 1.6s・LCP 1.6s・TBT 0ms・CLS 0.102・Speed Index 1.6s。單檔零 build、無框架執行階段負擔；首屏主要成本為 CDN 載入的 ECharts，行情預覽 iframe 以 `data-src` 延後載入避免拖累首屏。（重跑：見上方線上網址）

## 本機執行

```bash
npm run serve      # 零依賴靜態伺服器（scripts/serve.mjs，port 8788）
npm test           # 單元測試（node:test，14 項）
npm run test:e2e   # E2E 測試（Playwright，24 項：儀表板／結帳防呆矩陣／跨頁保存／官網動效）
npm run data       # 更新行情快照
```
