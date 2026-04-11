import express from "express";
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });
const app = express();

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const normalize = (val: number, min: number, max: number, invert = false) => {
  let score = ((val - min) / (max - min)) * 100;
  score = clamp(score, 0, 100);
  return invert ? 100 - score : score;
};
const average = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
const stdDev = (arr: number[]) => {
  if (arr.length === 0) return 0;
  const avg = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
};

function getLabel(score: number) {
  if (score <= 25) return "극도의 공포 (Extreme Fear)";
  if (score <= 45) return "공포 (Fear)";
  if (score <= 55) return "중립 (Neutral)";
  if (score <= 75) return "탐욕 (Greed)";
  return "극도의 탐욕 (Extreme Greed)";
}

function calculateMetrics(kospi: any[], usdkrw: any[], sp500: any[], offset: number) {
  const k = kospi.slice(0, kospi.length - offset);
  const u = usdkrw.slice(0, usdkrw.length - offset);
  const s = sp500.slice(0, sp500.length - offset);

  if (k.length < 125 || u.length < 125 || s.length < 125) return null;

  const currK = k[k.length - 1].close;
  const currU = u[u.length - 1].close;
  const currS = s[s.length - 1].close;

  // 1. Momentum (KOSPI vs 125-day MA)
  const ma125 = average(k.slice(-125).map(d => d.close));
  const momVal = currK / ma125;
  const momentum = normalize(momVal, 0.70, 1.30);

  // 2. Strength (KOSPI vs 52-week High/Low)
  const high52 = Math.max(...k.slice(-250).map(d => d.high).filter(v => v != null));
  const low52 = Math.min(...k.slice(-250).map(d => d.low).filter(v => v != null));
  const strength = normalize(currK, low52, high52);

  // 3. Breadth (Volume trend)
  const vol20 = average(k.slice(-20).map(d => d.volume || 0));
  const vol120 = average(k.slice(-120).map(d => d.volume || 0));
  const breadth = vol120 > 0 ? normalize(vol20 / vol120, 0.5, 2.5) : 50;

  // 4. Volatility (20-day vs 120-day historical volatility)
  const std20 = stdDev(k.slice(-20).map(d => d.close));
  const std120 = stdDev(k.slice(-120).map(d => d.close));
  const volatility = std120 > 0 ? normalize(std20 / std120, 0.3, 3.0, true) : 50;

  // 5. Options Proxy (Short term 5-day momentum)
  const ret5d = currK / k[k.length - 6].close;
  const options = normalize(ret5d, 0.85, 1.15);

  // 6. Safe Haven Proxy (Global Risk via S&P 500)
  const sp500_ma125 = average(s.slice(-125).map(d => d.close));
  const safeHaven = normalize(currS / sp500_ma125, 0.85, 1.15);

  // 7. Exchange Rate (Korea Specific: USD/KRW vs 120-day MA)
  const u_ma120 = average(u.slice(-120).map(d => d.close));
  const exchange = normalize(currU / u_ma120, 0.85, 1.15, true);

  // 8. Foreign Flow Proxy (KOSPI relative to S&P 500 over 20 days)
  const k_ret20 = currK / k[k.length - 21].close;
  const s_ret20 = currS / s[s.length - 21].close;
  const foreign = normalize(k_ret20 - s_ret20, -0.10, 0.10);

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

    const kospi = kospiData.quotes;
    const usdkrw = usdkrwData.quotes;
    const sp500 = sp500Data.quotes;
    const kosdaq = kosdaqData.quotes;

    console.log(`Data lengths - KOSPI: ${kospi.length}, USDKRW: ${usdkrw.length}, SP500: ${sp500.length}, KOSDAQ: ${kosdaq.length}`);

    const current = calculateMetrics(kospi, usdkrw, sp500, 0);
    const oneDayAgo = calculateMetrics(kospi, usdkrw, sp500, 1);
    const oneWeekAgo = calculateMetrics(kospi, usdkrw, sp500, 5);
    const threeMonthsAgo = calculateMetrics(kospi, usdkrw, sp500, 60);
    const oneYearAgo = calculateMetrics(kospi, usdkrw, sp500, 250);

    if (!current || !oneDayAgo || !oneWeekAgo || !threeMonthsAgo || !oneYearAgo) {
      console.error("Insufficient data:", { current: !!current, oneDayAgo: !!oneDayAgo, oneWeekAgo: !!oneWeekAgo, threeMonthsAgo: !!threeMonthsAgo, oneYearAgo: !!oneYearAgo });
      return res.status(500).json({ error: 'Insufficient historical data' });
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
      kospi: getSummary(kospi),
      kosdaq: getSummary(kosdaq),
      usdkrw: getSummary(usdkrw)
    };

    res.json({
      ...current,
      marketSummary,
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
