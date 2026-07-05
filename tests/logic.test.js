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
