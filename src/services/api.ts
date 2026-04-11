export interface MarketData {
  indexValue: number;
  sentiment: string;
  chartData: { date: string; value: number }[];
  marketSummary: {
    kospi: { value: number; change: number; changePercent: number };
    kosdaq: { value: number; change: number; changePercent: number };
    usdkrw: { value: number; change: number; changePercent: number };
  };
  historical: {
    oneDayAgo: number;
    oneWeekAgo: number;
    threeMonthsAgo: number;
    oneYearAgo: number;
  };
  indicators: {
    momentum: { value: string; label: string; status: string };
    strength: { value: string; label: string; status: string };
    breadth: { value: string; label: string; status: string };
    volatility: { value: string; label: string; status: string };
    options: { value: string; label: string; status: string };
    safeHaven: { value: string; label: string; status: string };
    exchange: { value: string; label: string; status: string };
    foreign: { value: string; label: string; status: string };
  };
  lastUpdated: string;
}

export async function getKospiMarketData(): Promise<MarketData> {
  const res = await fetch('/api/fear-greed', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch market data from the server.');
  }
  return res.json();
}
