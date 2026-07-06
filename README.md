# QuantPulse 量化脈動

> AI 量化策略儀表板 — 前端技術展示作品｜單頁靜態 · 零框架 · 真實歷史數據回測

[![Live Demo](https://img.shields.io/badge/demo-live-2ea44f)](https://kjyangdev-hue.github.io/quantpulse-demo/)
![Tests](https://img.shields.io/badge/tests-24%20E2E%20%2B%2014%20unit-2ea44f)
![Lighthouse](https://img.shields.io/badge/Lighthouse-85%20%C2%B7%2096%20%C2%B7%20100%20%C2%B7%20100-orange)
![Stack](https://img.shields.io/badge/stack-Vanilla%20JS%20%C2%B7%20ECharts%205-informational)
![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red)

**線上展示**　▸　官網 <https://kjyangdev-hue.github.io/quantpulse-demo/>　▸　儀表板 <https://kjyangdev-hue.github.io/quantpulse-demo/app.html>

> [!IMPORTANT]
> **免責聲明**：本專案為求職作品集之技術展示。所有「AI 策略／買賣訊號／回測績效／技術面評分」皆由**固定歷史規則**對**歷史數據**運算產生，**非即時、非預測、非投資建議**，不構成任何買賣推介、目標價或報酬保證。金流與電子發票為純前端模擬，不涉真實交易，亦不儲存任何輸入資料。完整條款見 **[DISCLAIMER.md](DISCLAIMER.md)**。

---

## 專案概觀

雙頁前端作品，示範「行銷官網 → 產品儀表板 → 模擬訂閱金流」的完整動線：

- **官網（`index.html`）** — B2B SaaS 落地頁：Hero、功能區、即時計算的回測績效帶、三檔方案定價（接模擬結帳）、FAQ、可互動的即時嵌入 DEMO、滾動進場動畫。
- **儀表板（`app.html`）** — 產品本體：ECharts K 線、多策略回測、買賣訊號疊加、績效分析、TradingView 整合、模擬 Pro 訂閱解鎖。

## 核心功能

- **K 線主圖**：ECharts 5 自繪蠟燭圖 ＋ MA5/20/60（實線／虛線雙重編碼）＋ 成交量副圖；crosshair 十字游標、繁中 tooltip；台股慣例紅漲綠跌。
- **策略回測引擎（核心互動）**：三種歷史規則策略（均線交叉／動能突破／綜合），點擊後在**不重新整理**下完成掃描動畫 → 訊號箭頭疊加 → 績效滾動更新 → 訊號紀錄逐列進場。
- **績效分析**：交易配對明細、權益曲線、月報酬，Profit Factor／Sortino／Calmar／Expectancy 等指標，多標的對照。
- **模擬訂閱金流**：卡號 16 碼防呆＋Luhn 校驗、效期／CVC 驗證、統編與手機條碼載具、付款 Loading、綠界 ECPay 模擬電子發票；Pro 資格以 `localStorage` **跨頁保存**。
- **RWD ＋ 主題**：桌機／平板／手機三視口實測；深色終端風為預設，附淺色主題切換（含主題感知的自訂捲軸與圖表配色）。

## 技術架構

- 純 **Vanilla HTML / CSS / JS**，零框架、零 build step，直接部署於 GitHub Pages。
- **邏輯／UI 分離**：`logic.js` 為純函式層（Node/Browser 雙環境），可獨立單元測試。
- **真實數據管線**：`scripts/fetch-data.mjs` 從 Yahoo Finance 產生六標的歷史快照；離線以固定種子（mulberry32 PRNG）之模擬數據備援。
- **設計系統**：調色盤通過 OKLCH 亮度帶／色弱（CVD）分離度／對比度驗證。
- 以 **AI 協作工作流（Claude Code）** 開發：TDD 邏輯層 → 視覺系統 → Playwright 互動回歸。

## 專案結構

| 檔案 / 目錄 | 職責 |
|---|---|
| `index.html` | 行銷官網（落地頁） |
| `app.html` | 產品儀表板（DEMO 本體） |
| `logic.js` | 純邏輯層：PRNG、K 線生成、策略訊號、績效指標、金流驗證 |
| `checkout.js` | 共用模擬結帳模組（自帶樣式與 DOM，方案可參數化） |
| `scripts/` | 資料管線（`fetch-data.mjs`）與零依賴開發伺服器（`serve.mjs`） |
| `tests/` | 單元測試（`node:test`）與 E2E（Playwright） |

## 效能（Lighthouse）

對線上部署（GitHub Pages 首頁）以 Lighthouse 13 · desktop 預設量測：

![Lighthouse 分數：Performance 85／Accessibility 96／Best Practices 100／SEO 100](docs/lighthouse.png)

| Performance | Accessibility | Best Practices | SEO |
|:---:|:---:|:---:|:---:|
| 85 | 96 | 100 | 100 |

核心指標：FCP 1.6s · LCP 1.6s · TBT 0ms · CLS 0.102 · Speed Index 1.6s。首屏主要成本為 CDN 載入的 ECharts；行情預覽 iframe 以 `data-src` 延後載入避免拖累首屏。

## 測試

```bash
npm test           # 單元測試（node:test，14 項）
npm run test:e2e   # E2E（Playwright，24 項：儀表板／結帳防呆矩陣／跨頁保存／官網動效）
```

## 資料管線

```bash
node scripts/fetch-data.mjs   # 更新 data/ 六標的快照（2330 / TAIEX / 0050 / 2317 / NVDA / BTC）
```

GitHub Actions（`.github/workflows/update-data.yml`）設定每日台北時間 18:30 自動更新有變動之快照（註：新帳號的 Actions 排程可能延遲啟用，屆時以上述指令手動更新即可）。

## 本機執行

```bash
npm run serve      # 零依賴靜態伺服器（scripts/serve.mjs，port 8788）
npm test           # 單元測試
npm run test:e2e   # E2E 測試
npm run data       # 更新行情快照
```

## 授權

本專案採**專屬授權（All Rights Reserved）**，公開之目的僅為**作品集檢視與面試評估**。
未經作者書面同意，禁止複製、修改、再散布、商業使用，或作為投資顧問／選股／買賣訊號等任何金融服務。詳見 **[LICENSE](LICENSE)** 與 **[DISCLAIMER.md](DISCLAIMER.md)**。

© 2026 KaiChunYang（[@kjyangdev-hue](https://github.com/kjyangdev-hue)）. All Rights Reserved.
