# QuantPulse AI 量化策略儀表板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一個可線上互動的 AI 量化策略儀表板（徵才測試題目 A ＋ 題目 B 金流彩蛋），部署於 GitHub Pages。

**Architecture:** 靜態頁面兩個檔案——`index.html`（版面＋樣式＋UI 邏輯全內嵌）與 `logic.js`（純函式：模擬數據產生、訊號計算、表單驗證；browser/node 雙環境可用，node 可單元測試）。圖表用 ECharts 5 CDN 自繪 K 線以支援動態訊號疊加。

**Tech Stack:** Vanilla HTML/CSS/JS、ECharts 5（CDN）、TradingView ticker-tape widget（裝飾用、可失敗）、node:test（邏輯單元測試）、Playwright MCP（UI 驗證）。

## Global Constraints

- 全程繁體中文介面；免責聲明「本頁面為前端技術展示，所有行情與績效皆為模擬數據，不構成投資建議」必須出現在 footer
- 深色為預設主題；RWD 支援 375 / 768 / 1440 px
- 所有互動不得重新整理頁面；不得使用 `alert()`
- 模擬數據使用固定 seed（42），每次載入畫面一致
- 不用真實公司名、不含個資；發票、付款皆明確標示「模擬」
- 部署後的頁面 Console 不得有錯誤（TradingView widget 的第三方警告除外）
- 本 repo 後續變更走 PR merge commit（`--no-ff`）；bootstrap push 除外

---

### Task 1: 純邏輯層 `logic.js`（TDD）

**Files:**
- Create: `logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Produces（`window.QP` 命名空間；node 端 `module.exports` 相同物件）:
  - `mulberry32(seed:number) => () => number`（0~1 決定性亂數）
  - `generateCandles(seed:number, days:number) => Array<{date:string, open:number, high:number, low:number, close:number, volume:number}>`
  - `calcMA(candles, period:number) => Array<number|null>`（前 period-1 筆為 null，取 close 平均，保留 2 位小數）
  - `generateSignals(candles, strategy:'ma-cross'|'momentum'|'ai') => Array<{index:number, type:'buy'|'sell', price:number, reason:string}>`
  - `calcPerformance(candles, signals) => {trades:number, winRate:number, totalReturn:number, maxDrawdown:number, sharpe:number}`（百分比一律 0~100 數字，2 位小數）
  - `formatCardNumber(raw:string) => string`（去非數字、截 16 碼、4-4-4-4 空格）
  - `validateCard(raw:string) => {valid:boolean, error?:string}`（16 碼＋Luhn；錯誤訊息繁中）
  - `validateGui(raw:string) => {valid:boolean, error?:string}`（空字串合法＝選填；非空需 8 碼數字）
  - `mockInvoiceNumber(rand:()=>number) => string`（格式 `XX-12345678`，X 為 A-Z）

- [ ] **Step 1: 寫失敗測試 `tests/logic.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const QP = require('../logic.js');

test('mulberry32 決定性：同 seed 同序列', () => {
  const a = QP.mulberry32(42), b = QP.mulberry32(42);
  assert.strictEqual(a(), b());
  assert.strictEqual(a(), b());
});

test('generateCandles 結構與一致性', () => {
  const c1 = QP.generateCandles(42, 120);
  const c2 = QP.generateCandles(42, 120);
  assert.strictEqual(c1.length, 120);
  assert.deepStrictEqual(c1[50], c2[50]); // 固定 seed 可重現
  for (const k of c1) {
    assert.ok(k.high >= Math.max(k.open, k.close));
    assert.ok(k.low <= Math.min(k.open, k.close));
    assert.ok(k.volume > 0);
    assert.match(k.date, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('calcMA 前置 null 與平均值', () => {
  const candles = [10, 20, 30, 40].map((close, i) => ({
    date: `2026-01-0${i + 1}`, open: close, high: close, low: close, close, volume: 1,
  }));
  const ma2 = QP.calcMA(candles, 2);
  assert.deepStrictEqual(ma2, [null, 15, 25, 35]);
});

test('generateSignals：三種策略都產出買賣交錯的合法訊號', () => {
  const candles = QP.generateCandles(42, 180);
  for (const s of ['ma-cross', 'momentum', 'ai']) {
    const sig = QP.generateSignals(candles, s);
    assert.ok(sig.length >= 2, `${s} 至少要有一買一賣`);
    let last = null;
    for (const x of sig) {
      assert.ok(['buy', 'sell'].includes(x.type));
      assert.ok(x.index >= 0 && x.index < candles.length);
      assert.strictEqual(x.price, candles[x.index].close);
      assert.ok(x.reason.length > 0);
      assert.notStrictEqual(x.type, last, `${s} 訊號需買賣交錯`);
      last = x.type;
    }
    assert.strictEqual(sig[0].type, 'buy', `${s} 首筆必須是買進`);
  }
});

test('calcPerformance 指標範圍合理', () => {
  const candles = QP.generateCandles(42, 180);
  const perf = QP.calcPerformance(candles, QP.generateSignals(candles, 'ai'));
  assert.ok(perf.trades >= 1);
  assert.ok(perf.winRate >= 0 && perf.winRate <= 100);
  assert.ok(perf.maxDrawdown >= 0);
  assert.ok(Number.isFinite(perf.sharpe));
});

test('formatCardNumber 格式化', () => {
  assert.strictEqual(QP.formatCardNumber('4242424242424242'), '4242 4242 4242 4242');
  assert.strictEqual(QP.formatCardNumber('4242-4242abc4242'), '4242 4242 4242');
  assert.strictEqual(QP.formatCardNumber('42424242424242429999'), '4242 4242 4242 4242');
});

test('validateCard：碼數不足/Luhn失敗/合法', () => {
  assert.strictEqual(QP.validateCard('4242 4242 4242 424').valid, false);  // 15 碼
  assert.match(QP.validateCard('4242 4242 4242 424').error, /16/);
  assert.strictEqual(QP.validateCard('4242 4242 4242 4243').valid, false); // Luhn 失敗
  assert.strictEqual(QP.validateCard('4242 4242 4242 4242').valid, true);  // 測試卡號
});

test('validateGui：選填、8碼數字', () => {
  assert.strictEqual(QP.validateGui('').valid, true);
  assert.strictEqual(QP.validateGui('1234567').valid, false);
  assert.strictEqual(QP.validateGui('1234567a').valid, false);
  assert.strictEqual(QP.validateGui('12345678').valid, true);
});

test('mockInvoiceNumber 格式', () => {
  assert.match(QP.mockInvoiceNumber(QP.mulberry32(42)), /^[A-Z]{2}-\d{8}$/);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test tests/`
Expected: FAIL（`Cannot find module '../logic.js'`）

- [ ] **Step 3: 實作 `logic.js`**

實作要點（完整寫出所有上述函式，檔尾用雙環境 export）：

```js
// 檔尾 export 樣式
const QP = { mulberry32, generateCandles, calcMA, generateSignals,
             calcPerformance, formatCardNumber, validateCard, validateGui, mockInvoiceNumber };
if (typeof module !== 'undefined' && module.exports) module.exports = QP;
if (typeof window !== 'undefined') window.QP = QP;
```

- `generateCandles`：起始價 980（模擬 2330），日報酬 = 漂移 0.0004 ＋ 波動聚集（vol 在 0.008~0.03 間隨機游走）× 常態近似（兩個 uniform 相加-1）；`high/low` 由 open/close ±(0~1.2×vol×price)；`volume = 20000 + |return|×8e6 + rand×15000`（整數）；日期從起始日往回推 `days` 個「工作日」（跳過週六日），起始日固定 `2026-07-03`（避免呼叫 `new Date()` 不可重現——直接由固定字串起算）。
- `generateSignals('ma-cross')`：MA5 上穿 MA20 → buy、下穿 → sell；`reason` 如 `'MA5 黃金交叉 MA20'`。
- `generateSignals('momentum')`：close 創 20 日新高 → buy、跌破 20 日低 → sell（同方向連續觸發只取第一次）。
- `generateSignals('ai')`：ma-cross 訊號 ∪ momentum 訊號後，依 index 排序去重。
- 三種策略共用後處理 `enforceAlternating`：丟棄開頭的 sell、強制買賣交錯（同向訊號取先者）。
- `calcPerformance`：依訊號配對（buy→sell）算每筆報酬；`totalReturn` 為複利乘積-1（%）；`maxDrawdown` 以權益曲線峰谷計算（%）；`sharpe = mean(每筆報酬)/std(每筆報酬)×sqrt(筆數)`，std 為 0 時取 0；全部 round 2 位。
- `validateCard` 錯誤訊息：長度不足 →`'卡號需為 16 碼數字（目前 N 碼）'`；Luhn 失敗 →`'卡號校驗失敗，請確認輸入是否正確'`。
- `validateGui` 錯誤訊息：`'統一編號需為 8 碼數字'`。

- [ ] **Step 4: 跑測試確認全過**

Run: `node --test tests/`
Expected: 全部 PASS（9 tests）

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: 模擬數據與驗證純邏輯層（TDD）"
```

---

### Task 2: 頁面骨架、視覺系統與主圖表 `index.html`

**前置：先讀 `frontend-design` 與 `dataviz` 技能再動手寫版面與圖表程式碼。**

**Files:**
- Create: `index.html`
- Modify: 無
- Test: Playwright MCP（人工驗證步驟如下）

**Interfaces:**
- Consumes: `window.QP`（Task 1 全部函式）
- Produces: DOM 錨點供 Task 3/4 使用 —— `#btn-ai-scan`（AI 分析按鈕）、`#chart-main`（ECharts 容器）、`#strategy-select`（策略切換）、`#signal-table-body`、`#btn-upgrade`（Pro 訂閱按鈕）、`#checkout-modal`、stat 卡片 `[data-stat="winRate|totalReturn|maxDrawdown|sharpe"]`、`#toast-root`

- [ ] **Step 1: 版面結構與深色視覺系統**

依設計文件版面（nav → ticker → stat cards → 主圖表＋策略面板 → 訊號表 → footer 免責聲明）完成 HTML/CSS：
- CSS custom properties 定義色彩（深色預設＋`[data-theme="light"]` 覆蓋）、主題切換按鈕寫 `localStorage`
- TradingView ticker-tape widget 以 `<script async>` 嵌入獨立容器，外層 `onerror`/超時 3s 未載入則 `display:none`
- ECharts 以 `<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js" defer>` 載入；`logic.js` 以相對路徑載入

- [ ] **Step 2: ECharts K 線主圖**

以 `QP.generateCandles(42, 120)` 繪製：蠟燭圖（台股慣例紅漲綠跌）＋ MA5/20/60 線 ＋ grid 下方成交量 bar（漲紅跌綠、透明度 0.5）＋ dataZoom（inside）＋ crosshair tooltip（繁中欄位）。`window.resize` 時 `chart.resize()`。

- [ ] **Step 3: Playwright 驗證**

啟動本機伺服器（`python -m http.server 8787` 或 `npx http-server -p 8787`），Playwright 開 `http://localhost:8787`：
- 截圖 1440px：K 線、均線、成交量、stat cards、免責聲明皆可見
- Console 無錯誤（TradingView 第三方訊息除外）

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: 儀表板版面、深色視覺系統與 K 線主圖"
```

---

### Task 3: 「AI 策略指標」互動（題目 A 核心）

**Files:**
- Modify: `index.html`（`<script>` UI 邏輯區）

**Interfaces:**
- Consumes: `QP.generateSignals`、`QP.calcPerformance`、Task 2 DOM 錨點
- Produces: `runAiScan(strategy)`（Task 5 驗證流程呼叫的入口，綁在 `#btn-ai-scan` click）

- [ ] **Step 1: 狀態機實作**

`idle → scanning → results`：
- 點 `#btn-ai-scan`：按鈕進 loading（文字「AI 掃描中…」＋spinner）、圖表上方顯示掃描光束動畫（CSS）持續 ~1.5s（`setTimeout`）
- 完成後：`chart.setOption` 疊加 `markPoint`（▲買進 pin 朝上、▼賣出 pin 朝下、label 顯示價格）；stat cards 以 requestAnimationFrame count-up 更新 `calcPerformance` 結果；`#signal-table-body` 逐列淡入訊號（日期、策略、類型、價格、理由）；`#toast-root` 彈出最新訊號 toast（4s 自動消失，可堆疊）
- `#strategy-select` 切換策略後再點按鈕 → 清除舊 markPoint 重新疊加，全程不重新整理

- [ ] **Step 2: Playwright 驗證**

- 點擊 `#btn-ai-scan` → 等 2s → 截圖：訊號標記、更新後 stat 數字、訊號表、toast 皆出現
- 切換策略再點一次 → 訊號集合改變（截圖比對）

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: AI 策略指標互動——動態訊號疊加、績效更新、toast 提示"
```

---

### Task 4: Pro 訂閱模擬結帳 Modal（題目 B 彩蛋）

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `QP.formatCardNumber`、`QP.validateCard`、`QP.validateGui`、`QP.mockInvoiceNumber`
- Produces: `#checkout-modal` 完整流程（`form → processing → success` 三個 `data-step` 區塊）

- [ ] **Step 1: Modal 實作**

- `#btn-upgrade`（策略面板內「升級 Pro 解鎖全部 AI 策略」）開啟 modal（backdrop blur、ESC/點背景可關）
- 表單：持卡人姓名（必填）、卡號（`input` 事件即時 `formatCardNumber`）、有效期 MM/YY（自動補斜線、月份 01-12）、CVC（3 碼）、統一編號（選填）、電子發票載具（選填、`/` 開頭手機條碼格式提示但不強制）
- 送出：`validateCard`/`validateGui` 失敗 → 對應欄位紅框＋shake 動畫＋欄位下方繁中錯誤訊息；全過 → `processing` 步驟（品牌 spinner＋「正在處理付款…」約 2s）→ `success` 步驟（SVG 打勾 stroke 動畫＋「付款成功！已自動開立電子發票（模擬）」＋發票號碼 `QP.mockInvoiceNumber`＋「此為前端展示，未進行任何實際交易」小字）

- [ ] **Step 2: Playwright 驗證（負向＋正向）**

- 輸入 15 碼卡號送出 → 截圖：紅框＋「卡號需為 16 碼數字」錯誤，modal 未進入 processing
- 改 `4242 4242 4242 4242`、有效期 `12/28`、CVC `123`、統編 `12345678` → 送出 → 等 3s → 截圖：成功畫面＋模擬發票號碼

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: Pro 訂閱模擬結帳——卡號防呆、統編載具、付款成功回饋"
```

---

### Task 5: RWD、細節打磨與全流程回歸

**Files:**
- Modify: `index.html`

- [ ] **Step 1: RWD**

375px：nav 收合為單列、stat cards 2 欄、策略面板移至圖表下方、modal 滿版；768px：stat cards 2×2、圖表全寬；1440px：完整雙欄。圖表容器高度以 `clamp()` 控制。

- [ ] **Step 2: Playwright 三視口回歸**

375 / 768 / 1440 各截圖首屏＋AI 分析後＋結帳成功畫面；`node --test tests/` 再跑一次全過；Console 無錯誤。

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "style: RWD 三視口與互動細節打磨"
```

---

### Task 6: 部署 GitHub Pages 與線上驗證

**Files:**
- Create: `README.md`（專案簡介、線上連結、技術說明、模擬聲明）

- [ ] **Step 1: 檢查 gh 授權**

Run: `gh auth status`
Expected: 已登入。未登入 → 停止並回報使用者（提供手動部署指令，不阻塞）。

- [ ] **Step 2: 建 repo 並推送（bootstrap，唯一一次直推 master）**

```bash
git add README.md && git commit -m "docs: README 與部署說明"
gh repo create quantpulse-demo --public --source . --push
gh api -X POST "repos/{owner}/quantpulse-demo/pages" -f "source[branch]=master" -f "source[path]=/" 
```

- [ ] **Step 3: 線上驗證**

等待 Pages build（輪詢 `gh api repos/{owner}/quantpulse-demo/pages --jq .status` 直到 `built`），Playwright 開啟正式 URL 完整走一次：首屏 → AI 分析 → 結帳負向 → 結帳正向，各截圖確認。

- [ ] **Step 4: 回報**

繳交連結、螢幕截圖、以及「回信給對方的繳交文字草稿」一併給使用者。
