import express from "express";
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });
const app = express();

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const normalize = (val: number, min: number, max: number, invert = false) => {
  if (val == null || isNaN(val)) return 50; // Fallback to neutral if data is missing
  let score = ((val - min) / (max - min)) * 100;
  score = clamp(score, 0, 100);
  return invert ? 100 - score : score;
};
const average = (arr: number[]) => {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};
const stdDev = (arr: number[]) => {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (valid.length === 0) return 0;
  const avg = average(valid);
  const squareDiffs = valid.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
};

function getLabel(score: number) {
  if (score <= 25) return "극도의 공포 (Extreme Fear)";
  if (score <= 45) return "공포 (Fear)";
  if (score <= 55) return "중립 (Neutral)";
  if (score <= 75) return "탐욕 (Greed)";
  return "극도의 탐욕 (Extreme Greed)";
}

function calculateMetrics(k: any[], u: any[], s: any[]) {
  if (k.length < 125 || u.length < 125 || s.length < 125) return null;

  const currK = k[k.length - 1].close;
  const currU = u[u.length - 1].close;
  const currS = s[s.length - 1].close;

  if (currK == null || currU == null || currS == null) return null;

  // 1. Momentum (KOSPI vs 125-day MA)
  const ma125 = average(k.slice(-125).map(d => d.close));
  const momVal = currK / ma125;
  const momentum = normalize(momVal, 0.95, 1.05); // Hyper-sensitive: 5% deviation is extreme

  // 2. Strength (KOSPI vs 52-week High/Low)
  const validHighs = k.slice(-250).map(d => d.high).filter(v => v != null && !isNaN(v));
  const high52 = validHighs.length > 0 ? Math.max(...validHighs) : currK;
  const validLows = k.slice(-250).map(d => d.low).filter(v => v != null && !isNaN(v));
  const low52 = validLows.length > 0 ? Math.min(...validLows) : currK;
  const range = high52 - low52;
  const strength = range > 0 ? normalize(currK, low52 + range * 0.35, high52 - range * 0.35) : 50;

  // 3. Breadth (Volume trend)
  const validVols = k.map(d => d.volume).filter(v => v != null && !isNaN(v) && v > 0);
  const vol20 = validVols.length >= 20 ? average(validVols.slice(-20)) : 0;
  const vol120 = validVols.length >= 120 ? average(validVols.slice(-120)) : 0;
  const breadth = vol120 > 0 ? normalize(vol20 / vol120, 0.9, 1.15) : 50;

  // 4. Volatility (20-day vs 120-day historical volatility)
  const std20 = stdDev(k.slice(-20).map(d => d.close));
  const std120 = stdDev(k.slice(-120).map(d => d.close));
  const volatility = std120 > 0 ? normalize(std20 / std120, 0.8, 1.2, true) : 50;

  // 5. Options Proxy (Short term 5-day momentum)
  const ret5d = currK / k[k.length - 6].close;
  const options = normalize(ret5d, 0.985, 1.015); // 1.5% move in 5 days is extreme

  // 6. Safe Haven Proxy (Global Risk via S&P 500)
  const sp500_ma125 = average(s.slice(-125).map(d => d.close));
  const safeHaven = normalize(currS / sp500_ma125, 0.975, 1.025); // 2.5% deviation for S&P 500

  // 7. Exchange Rate (Korea Specific: USD/KRW vs 120-day MA)
  const u_ma120 = average(u.slice(-120).map(d => d.close));
  const exchange = normalize(currU / u_ma120, 0.985, 1.015, true); // 1.5% deviation for currency

  // 8. Foreign Flow Proxy (KOSPI relative to S&P 500 over 20 days)
  const k_ret20 = currK / k[k.length - 21].close;
  const s_ret20 = currS / s[s.length - 21].close;
  const foreign = normalize(k_ret20 - s_ret20, -0.015, 0.015); // 1.5% out/underperformance

  const scores = {
    momentum: Math.round(momentum),
    strength: Math.round(strength),
    breadth: Math.round(breadth),
    volatility: Math.round(volatility),
    options: Math.round(options),
    safeHaven: Math.round(safeHaven),
    exchange: Math.round(exchange),
    foreign: Math.round(foreign)
  };

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const indexValue = Math.round(total / 8);

  return {
    indexValue,
    sentiment: getLabel(indexValue),
    indicators: {
      momentum: { value: `${momVal >= 1 ? '+' : ''}${((momVal || 0) * 100 - 100).toFixed(1)}%`, label: `125일 이평선 대비`, status: getLabel(scores.momentum) },
      strength: { value: `${currK >= low52 ? '+' : ''}${(((currK || 0) / (low52 || 1) - 1) * 100).toFixed(1)}%`, label: `52주 최저가 대비 상승폭`, status: getLabel(scores.strength) },
      breadth: { value: vol120 > 0 ? `${((vol20 || 0) / (vol120 || 1)).toFixed(2)}배` : 'N/A', label: `20일 거래량 (120일 평균 대비)`, status: getLabel(scores.breadth) },
      volatility: { value: std120 > 0 ? `${((std20 || 0) / (std120 || 1)).toFixed(2)}배` : 'N/A', label: `단기 변동성 (120일 평균 대비)`, status: getLabel(scores.volatility) },
      options: { value: `${ret5d >= 1 ? '+' : ''}${(((ret5d || 0) - 1) * 100).toFixed(1)}%`, label: `최근 5일 단기 모멘텀`, status: getLabel(scores.options) },
      safeHaven: { value: `${currS >= sp500_ma125 ? '+' : ''}${(((currS || 0) / (sp500_ma125 || 1) - 1) * 100).toFixed(1)}%`, label: `S&P500 125일 이평선 대비`, status: getLabel(scores.safeHaven) },
      exchange: { value: `${(currU || 0).toFixed(1)}원`, label: `원/달러 환율`, status: getLabel(scores.exchange) },
      foreign: { value: `${((k_ret20 || 0) - (s_ret20 || 0)) >= 0 ? '+' : ''}${(((k_ret20 || 0) - (s_ret20 || 0)) * 100).toFixed(1)}%p`, label: `KOSPI 상대 강도 (vs S&P500)`, status: getLabel(scores.foreign) }
    }
  };
}

function alignData(kospi: any[], usdkrw: any[], sp500: any[]) {
  const validKospi = kospi.filter(q => q.close != null);
  const alignedU = [];
  const alignedS = [];
  
  let uIdx = 0;
  let sIdx = 0;
  
  let lastU = usdkrw.find(q => q.close != null) || usdkrw[0];
  let lastS = sp500.find(q => q.close != null) || sp500[0];

  for (const k of validKospi) {
    const kDate = new Date(k.date).getTime();
    
    while (uIdx < usdkrw.length && new Date(usdkrw[uIdx].date).getTime() <= kDate) {
      if (usdkrw[uIdx].close != null) lastU = usdkrw[uIdx];
      uIdx++;
    }
    alignedU.push(lastU);
    
    while (sIdx < sp500.length && new Date(sp500[sIdx].date).getTime() <= kDate) {
      if (sp500[sIdx].close != null) lastS = sp500[sIdx];
      sIdx++;
    }
    alignedS.push(lastS);
  }
  
  return { alignedK: validKospi, alignedU, alignedS };
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "2" });
});

app.get("/api/fear-greed", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2); // 2 years to ensure enough data for 1y ago + 125ma

    const queryOptions = { period1: startDate, period2: endDate, interval: '1d' as const };
    
    const [kospiData, usdkrwData, sp500Data, kosdaqData] = await Promise.all([
      yahooFinance.chart('^KS11', queryOptions),
      yahooFinance.chart('KRW=X', queryOptions),
      yahooFinance.chart('^GSPC', queryOptions),
      yahooFinance.chart('^KQ11', queryOptions)
    ]);

    const { alignedK, alignedU, alignedS } = alignData(kospiData.quotes, usdkrwData.quotes, sp500Data.quotes);

    console.log(`Data lengths - KOSPI: ${alignedK.length}, USDKRW: ${alignedU.length}, SP500: ${alignedS.length}`);

    const getMetricsForOffset = (offset: number) => {
      if (alignedK.length - offset < 125) return null;
      return calculateMetrics(
        alignedK.slice(0, alignedK.length - offset),
        alignedU.slice(0, alignedU.length - offset),
        alignedS.slice(0, alignedS.length - offset)
      );
    };

    const current = getMetricsForOffset(0);
    const oneDayAgo = getMetricsForOffset(1);
    const oneWeekAgo = getMetricsForOffset(5);
    const threeMonthsAgo = getMetricsForOffset(60);
    const oneYearAgo = getMetricsForOffset(250);

    if (!current || !oneDayAgo || !oneWeekAgo || !threeMonthsAgo || !oneYearAgo) {
      console.error("Insufficient data:", { current: !!current, oneDayAgo: !!oneDayAgo, oneWeekAgo: !!oneWeekAgo, threeMonthsAgo: !!threeMonthsAgo, oneYearAgo: !!oneYearAgo });
      return res.status(500).json({ error: 'Insufficient historical data' });
    }

    const chartData = [];
    for (let i = 250; i >= 0; i--) {
      const metrics = getMetricsForOffset(i);
      if (metrics && alignedK[alignedK.length - 1 - i]) {
        const kospiQuote = alignedK[alignedK.length - 1 - i];
        const dateObj = kospiQuote.date;
        const d = new Date(dateObj);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        chartData.push({ 
          date: dateStr, 
          value: metrics.indexValue,
          kospiClose: kospiQuote.close
        });
      }
    }

    const getSummary = (quotes: any[]) => {
      const validQuotes = quotes.filter(q => q.close != null);
      if (validQuotes.length < 2) return { value: 0, change: 0, changePercent: 0 };
      const curr = validQuotes[validQuotes.length - 1].close;
      const prev = validQuotes[validQuotes.length - 2].close;
      return {
        value: curr,
        change: curr - prev,
        changePercent: ((curr - prev) / prev) * 100
      };
    };

    const marketSummary = {
      kospi: getSummary(kospiData.quotes),
      kosdaq: getSummary(kosdaqData.quotes),
      usdkrw: getSummary(usdkrwData.quotes)
    };

    res.json({
      ...current,
      marketSummary,
      chartData,
      historical: {
        oneDayAgo: oneDayAgo.indexValue,
        oneWeekAgo: oneWeekAgo.indexValue,
        threeMonthsAgo: threeMonthsAgo.indexValue,
        oneYearAgo: oneYearAgo.indexValue
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Caught error:", error);
    res.status(500).json({ error: 'Failed to calculate market data', details: String(error) });
  }
});

export default app;
