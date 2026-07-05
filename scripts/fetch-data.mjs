/**
 * 真實行情快照管線：node scripts/fetch-data.mjs
 * 從 Yahoo Finance 抓取近一年日 K，正規化後寫入 data/<key>.json。
 * 前端為靜態站，以「歷史快照＋截至日標示」方式呈現真實數據；重跑本腳本即可更新快照。
 */
import fs from 'node:fs';

const SYMBOLS = [
  { key: '2330', yahoo: '2330.TW', name: '台積電 2330' },
  { key: 'taiex', yahoo: '%5ETWII', name: '加權指數 TAIEX' },
  { key: '0050', yahoo: '0050.TW', name: '元大台灣50 0050' },
  { key: '2317', yahoo: '2317.TW', name: '鴻海 2317' },
  { key: 'nvda', yahoo: 'NVDA', name: 'NVIDIA（USD）' },
  { key: 'btc', yahoo: 'BTC-USD', name: 'Bitcoin（USD）' },
];
const round2 = (n) => Math.round(n * 100) / 100;

fs.mkdirSync('data', { recursive: true });

for (const s of SYMBOLS) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.yahoo}?range=1y&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${s.key}: HTTP ${res.status}`);
  const json = await res.json();
  const r = json.chart?.result?.[0];
  if (!r) throw new Error(`${s.key}: 回應格式異常`);
  const q = r.indicators.quote[0];

  const candles = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    if ([q.open[i], q.high[i], q.low[i], q.close[i]].some((v) => v == null)) continue;
    candles.push({
      date: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
      open: round2(q.open[i]),
      high: round2(q.high[i]),
      low: round2(q.low[i]),
      close: round2(q.close[i]),
      volume: q.volume[i] || 0,
    });
  }
  if (candles.length < 200) throw new Error(`${s.key}: 資料筆數異常（${candles.length}）`);

  const out = {
    symbol: s.key,
    name: s.name,
    source: 'Yahoo Finance 歷史快照',
    asOf: candles[candles.length - 1].date,
    candles,
  };
  fs.writeFileSync(`data/${s.key}.json`, JSON.stringify(out));
  console.log(`${s.key}: ${candles.length} 筆，截至 ${out.asOf}，收盤 ${candles[candles.length - 1].close}`);
}
