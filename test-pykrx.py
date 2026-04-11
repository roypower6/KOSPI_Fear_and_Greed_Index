from pykrx import stock
import datetime

end_date = datetime.datetime.today().strftime("%Y%m%d")
start_date = (datetime.datetime.today() - datetime.timedelta(days=10)).strftime("%Y%m%d")

try:
    df = stock.get_index_ohlcv(start_date, end_date, "1001")
    print(df.head())
except Exception as e:
    print("Error 1001:", e)

try:
    df = stock.get_market_ohlcv(start_date, end_date, "KOSPI")
    print(df.head())
except Exception as e:
    print("Error KOSPI:", e)
