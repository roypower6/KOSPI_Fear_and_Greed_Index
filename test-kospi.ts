import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });
async function run() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);
  const data = await yahooFinance.chart('^KS11', { period1: startDate, period2: endDate, interval: '1d' });
  const k = data.quotes;
  const currK = k[k.length - 1].close;
  const high52 = Math.max(...k.slice(-250).map(d => d.high).filter(v => v != null));
  const low52 = Math.min(...k.slice(-250).map(d => d.low).filter(v => v != null));
  console.log({ currK, high52, low52 });
}
run();
