import yfinance as yf
import pandas as pd
import pandas_ta as ta
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from typing import Tuple

def generate_ml_dataset(ticker: str, start_date: str, end_date: str, interval: str = "1h") -> Tuple[np.ndarray, MinMaxScaler]:
    """
    Fetches, cleans, engineers features, and scales financial time-series data for LSTM neural networks.
    
    Args:
        ticker (str): The stock ticker symbol.
        start_date (str): Start date in YYYY-MM-DD format.
        end_date (str): End date in YYYY-MM-DD format.
        interval (str): Candle interval — '1d' for daily, '1h' for hourly.
        
    Returns:
        Tuple[np.ndarray, MinMaxScaler]: A tuple containing the scaled feature data array 
         and the fitted MinMaxScaler object.
    """
    df = yf.download(ticker, start=start_date, end=end_date, interval=interval, multi_level_index=False)

    if df.empty:
        raise ValueError(f"No data fetched for {ticker} between {start_date} and {end_date}.")
    
    # Keep only the required OHLCV columns to avoid processing irrelevant data
    df = df[['Open', 'High', 'Low', 'Close', 'Volume']].copy()
    
    # 2. Data Cleaning
    # Forward-fill any missing data points inside the time series
    df = df.ffill()
    # Drop rows that are completely NaN representing non-trading days
    df = df.dropna(how='all')
    
    # 3. Feature Engineering
    # Calculate RSI and MACD, appending directly to the dataframe
    df.ta.rsi(append=True)
    df.ta.macd(append=True)
    
    # Drop initial rows containing NaNs resulting from rolling indicator calculations
    df = df.dropna()
    
    # 4. Normalization
    scaler = MinMaxScaler(feature_range=(0, 1))
    
    # Fit the scaler and transform data explicitly
    # Expected final columns: Open, High, Low, Close, Volume, RSI_14, MACD_12_26_9, MACDh_12_26_9, MACDs_12_26_9
    scaled_data = scaler.fit_transform(df)
    
    return scaled_data, scaler

if __name__ == "__main__":
    # Example usage for testing
    ticker_symbol = "AAPL"
    try:
        dataset, fitted_scaler = generate_ml_dataset(ticker_symbol, "2020-01-01", "2023-01-01")
        print(f"Successfully generated ML dataset for {ticker_symbol}.")
        print(f"Dataset Shape: {dataset.shape}")
        print(f"Number of Features Scaled: {fitted_scaler.n_features_in_}")
    except Exception as e:
        print(f"Error: {e}")
        