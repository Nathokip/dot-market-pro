# Machine Learning Data Pipeline (`ml_data_pipeline.py`)

## Overview
This script is responsible for fetching, cleaning, and preprocessing historical financial time-series data to be used in Machine Learning models, specifically Long Short-Term Memory (LSTM) neural networks. The pipeline outputs a scaled NumPy array of features and the fitted scaler object for later inverse transformations.

## Dependencies
- `yfinance`: For downloading historical stock data.
- `pandas`: For data manipulation and structures.
- `pandas_ta`: For calculating technical indicators efficiently.
- `numpy`: For handling the final numerical array.
- `scikit-learn`: Specifically `MinMaxScaler` for normalizing the dataset.

## Core Function

### `generate_ml_dataset(ticker: str, start_date: str, end_date: str) -> Tuple[np.ndarray, MinMaxScaler]`

This is the main function of the pipeline. It processes the data in four consecutive phases:

#### 1. Data Acquisition
- Fetches historical OHLCV (Open, High, Low, Close, Volume) data for the specified `ticker` between `start_date` and `end_date` using the `yfinance` API.
- Cleans up column headers from potential MultiIndex formats (common in `yfinance` 0.2.x+).
- Filters the dataset to only keep the core numerical columns to avoid processing irrelevant text/data.

#### 2. Data Cleaning
- **Forward-Filling (`ffill`)**: Addresses any missing data points within the time series by propagating the last valid observation forward.
- **Dropping Empty Rows**: Removes entirely empty rows which typically signify non-trading days (weekends or market holidays).

#### 3. Feature Engineering
- Calculates two key technical indicators using `pandas_ta` and appends them to the dataset:
  - **RSI (Relative Strength Index)**: A 14-period momentum indicator.
  - **MACD (Moving Average Convergence Divergence)**: A trend-following momentum indicator (generates MACD line, Signal line, and Histogram).
- Drops the initial rows that contain `NaN` values resulting from the "lookback" period required to calculate these rolling indicators.

#### 4. Normalization
- Initializes a `MinMaxScaler` from `scikit-learn` to scale the entire dataset's feature range to `(0, 1)`. Neural networks converge faster and perform better when input features are on a normalized, similar scale.
- Fits the scaler to the data and transforms it simultaneously.
  - *Final Feature Set: Open, High, Low, Close, Volume, RSI_14, MACD_12_26_9, MACDh_12_26_9, MACDs_12_26_9*

**Returns:**
- A tuple containing:
  1. `scaled_data` (`np.ndarray`): The preprocessed, indicator-enriched, and scaled data.
  2. `scaler` (`MinMaxScaler`): The fitted scaler object. This is critical as it must be used later to inverse-transform the model's future predictions back into actual price values.

## Example Usage
The script includes an execution block that tests the function using Apple (`AAPL`) stock data from `2020-01-01` to `2023-01-01`.

```python
if __name__ == "__main__":
    ticker_symbol = "AAPL"
    dataset, fitted_scaler = generate_ml_dataset(ticker_symbol, "2020-01-01", "2023-01-01")
    print(f"Dataset Shape: {dataset.shape}")
```
