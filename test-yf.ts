import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const res = await yahooFinance.historical('^KS11', { period1: '2024-01-01' });
    console.log(res.length);
  } catch (e) {
    console.error(e);
  }
}
test();
