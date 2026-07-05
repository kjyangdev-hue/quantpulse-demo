/**
 * QuantPulse 純邏輯層：模擬數據產生、策略訊號、績效計算、表單驗證。
 * Browser（window.QP）與 Node（module.exports）雙環境。
 * 所有行情皆為固定 seed 的模擬數據，不涉及任何真實市場資訊。
 */
'use strict';

/** 決定性偽亂數（0~1） */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n) => Math.round(n * 100) / 100;

/** 由固定起始日（2026-07-03）往回推 days 個工作日，避免不可重現的 new Date() */
function tradingDates(days) {
  const dates = [];
  const d = new Date(Date.UTC(2026, 6, 3)); // 固定字面值起算
  while (dates.length < days) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return dates.reverse();
}

/** 隨機遊走＋波動聚集的模擬 K 線 */
function generateCandles(seed, days) {
  const rand = mulberry32(seed);
  const dates = tradingDates(days);
  const candles = [];
  let price = 980;
  let vol = 0.016;
  for (let i = 0; i < days; i++) {
    vol = Math.min(0.03, Math.max(0.008, vol + (rand() - 0.5) * 0.004));
    const ret = 0.0004 + (rand() + rand() - 1) * vol;
    const open = price;
    const close = Math.max(1, price * (1 + ret));
    const hi = Math.max(open, close);
    const lo = Math.min(open, close);
    const high = hi * (1 + rand() * 1.2 * vol);
    const low = lo * (1 - rand() * 1.2 * vol);
    const volume = Math.round(20000 + Math.abs(ret) * 8e6 + rand() * 15000);
    candles.push({
      date: dates[i],
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });
    price = close;
  }
  return candles;
}

/** 簡單移動平均，前 period-1 筆為 null */
function calcMA(candles, period) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    out.push(i >= period - 1 ? round2(sum / period) : null);
  }
  return out;
}

/** 丟棄開頭的 sell、強制買賣交錯（同向連續只留第一筆） */
function enforceAlternating(signals) {
  const out = [];
  let expect = 'buy';
  for (const s of signals) {
    if (s.type === expect) {
      out.push(s);
      expect = expect === 'buy' ? 'sell' : 'buy';
    }
  }
  return out;
}

function maCrossSignals(candles) {
  const ma5 = calcMA(candles, 5);
  const ma20 = calcMA(candles, 20);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (ma5[i - 1] == null || ma20[i - 1] == null) continue;
    const prevDiff = ma5[i - 1] - ma20[i - 1];
    const diff = ma5[i] - ma20[i];
    if (prevDiff <= 0 && diff > 0) {
      signals.push({ index: i, type: 'buy', price: candles[i].close, reason: 'MA5 黃金交叉 MA20' });
    } else if (prevDiff >= 0 && diff < 0) {
      signals.push({ index: i, type: 'sell', price: candles[i].close, reason: 'MA5 死亡交叉 MA20' });
    }
  }
  return signals;
}

function momentumSignals(candles) {
  const N = 20;
  const signals = [];
  let lastDir = null;
  for (let i = N; i < candles.length; i++) {
    const window = candles.slice(i - N, i);
    const hi = Math.max(...window.map((c) => c.close));
    const lo = Math.min(...window.map((c) => c.close));
    if (candles[i].close > hi && lastDir !== 'buy') {
      signals.push({ index: i, type: 'buy', price: candles[i].close, reason: '突破 20 日高點' });
      lastDir = 'buy';
    } else if (candles[i].close < lo && lastDir !== 'sell') {
      signals.push({ index: i, type: 'sell', price: candles[i].close, reason: '跌破 20 日低點' });
      lastDir = 'sell';
    }
  }
  return signals;
}

/** 三種策略：ma-cross / momentum / ai（聯集） */
function generateSignals(candles, strategy) {
  let raw;
  if (strategy === 'ma-cross') {
    raw = maCrossSignals(candles);
  } else if (strategy === 'momentum') {
    raw = momentumSignals(candles);
  } else {
    const seen = new Set();
    raw = [...maCrossSignals(candles), ...momentumSignals(candles)]
      .sort((a, b) => a.index - b.index)
      .filter((s) => {
        const key = s.index + s.type;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((s) => ({ ...s, reason: `AI 綜合訊號：${s.reason}` }));
  }
  const signals = enforceAlternating(raw);
  // 回測慣例：期末仍持倉時於最後一根 K 棒平倉，確保每筆買進都有對應賣出
  const lastIdx = candles.length - 1;
  if (signals.length > 0 && signals[signals.length - 1].type === 'buy') {
    if (signals[signals.length - 1].index === lastIdx) {
      signals.pop();
    } else {
      signals.push({ index: lastIdx, type: 'sell', price: candles[lastIdx].close, reason: '回測期末平倉' });
    }
  }
  return signals;
}

/** 以 buy→sell 配對回測，計算績效指標（%，2 位小數） */
function calcPerformance(candles, signals) {
  const rets = [];
  for (let i = 0; i + 1 < signals.length; i += 2) {
    rets.push(signals[i + 1].price / signals[i].price - 1);
  }
  const trades = rets.length;
  if (trades === 0) {
    return { trades: 0, winRate: 0, totalReturn: 0, maxDrawdown: 0, sharpe: 0 };
  }
  const wins = rets.filter((r) => r > 0).length;
  let equity = 1;
  let peak = 1;
  let maxDD = 0;
  for (const r of rets) {
    equity *= 1 + r;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, 1 - equity / peak);
  }
  const mean = rets.reduce((a, b) => a + b, 0) / trades;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / trades;
  const std = Math.sqrt(variance);
  return {
    trades,
    winRate: round2((wins / trades) * 100),
    totalReturn: round2((equity - 1) * 100),
    maxDrawdown: round2(maxDD * 100),
    sharpe: round2(std === 0 ? 0 : (mean / std) * Math.sqrt(trades)),
  };
}

/** 卡號輸入格式化：僅數字、截 16 碼、4-4-4-4 */
function formatCardNumber(raw) {
  const digits = String(raw).replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function luhnCheck(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function validateCard(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 16) {
    return { valid: false, error: `卡號需為 16 碼數字（目前 ${digits.length} 碼）` };
  }
  if (!luhnCheck(digits)) {
    return { valid: false, error: '卡號校驗失敗，請確認輸入是否正確' };
  }
  return { valid: true };
}

/** 統一編號：選填；非空需 8 碼數字 */
function validateGui(raw) {
  const value = String(raw).trim();
  if (value === '') return { valid: true };
  if (!/^\d{8}$/.test(value)) {
    return { valid: false, error: '統一編號需為 8 碼數字' };
  }
  return { valid: true };
}

/** 模擬電子發票號碼，如 AB-12345678 */
function mockInvoiceNumber(rand) {
  const letter = () => String.fromCharCode(65 + Math.floor(rand() * 26));
  let digits = '';
  for (let i = 0; i < 8; i++) digits += Math.floor(rand() * 10);
  return `${letter()}${letter()}-${digits}`;
}

const QP = {
  mulberry32,
  generateCandles,
  calcMA,
  generateSignals,
  calcPerformance,
  formatCardNumber,
  validateCard,
  validateGui,
  mockInvoiceNumber,
};

if (typeof module !== 'undefined' && module.exports) module.exports = QP;
if (typeof window !== 'undefined') window.QP = QP;
