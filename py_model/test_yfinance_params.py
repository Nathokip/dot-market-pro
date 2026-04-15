import yfinance as yf
try:
    df = yf.download("AAPL", start="2020-01-01", end="2023-01-01", multi_level_index=False)
    print(df.head())
except Exception as e:
    print(f"Error: {e}")
